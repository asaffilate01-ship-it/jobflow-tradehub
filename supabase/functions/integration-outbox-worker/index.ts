import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const responseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
  "Content-Type": "application/json",
};

type Destination = "gabley" | "immoviq";
type Principal = "admin" | "cron";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: responseHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const principal = await authorise(req, admin);
    const body = await req.json().catch(() => ({}));
    let requeued: string | null = null;
    if (body?.retry_event_id) {
      if (principal !== "admin") throw new Error("Administrator access required to retry a failed event");
      if (typeof body.retry_event_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.retry_event_id)) {
        throw new Error("Invalid retry_event_id");
      }
      const { data: reset, error: resetError } = await admin
        .from("repair_integration_outbox")
        .update({ status: "retry", next_attempt_at: new Date().toISOString(), last_error: null })
        .eq("id", body.retry_event_id)
        .in("status", ["retry", "failed"])
        .select("id")
        .maybeSingle();
      if (resetError) throw resetError;
      if (!reset) throw new Error("Retryable integration event not found");
      requeued = reset.id;
    }

    const { data: pending, error } = await admin
      .from("repair_integration_outbox")
      .select("id,event_type,aggregate_type,aggregate_id,destination,payload,idempotency_key,status,attempts")
      .in("destination", ["gabley", "immoviq"])
      .in("status", ["pending", "retry"])
      .lte("next_attempt_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) throw error;

    const results: Array<{ id: string; destination: string; status: string; error?: string }> = [];
    for (const event of pending ?? []) {
      const { data: claimed } = await admin
        .from("repair_integration_outbox")
        .update({ status: "processing", attempts: event.attempts + 1, last_error: null })
        .eq("id", event.id)
        .in("status", ["pending", "retry"])
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      try {
        const destination = event.destination as Destination;
        const target = destinationConfig(destination);
        const body = JSON.stringify({
          event_id: event.id,
          event_type: event.event_type,
          aggregate_type: event.aggregate_type,
          aggregate_id: event.aggregate_id,
          idempotency_key: event.idempotency_key,
          occurred_at: new Date().toISOString(),
          payload: event.payload,
        });
        const signature = await hmacHex(target.secret, body);
        const response = await fetch(target.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": event.idempotency_key,
            "X-Craftvaro-Signature": `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error(`${destination} webhook returned ${response.status}`);

        await admin.from("repair_integration_outbox").update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
          last_error: null,
        }).eq("id", event.id);
        results.push({ id: event.id, destination, status: "delivered" });
      } catch (deliveryError) {
        const message = deliveryError instanceof Error ? deliveryError.message : String(deliveryError);
        const attempts = event.attempts + 1;
        const failed = attempts >= 8;
        const delayMinutes = Math.min(2 ** attempts, 360);
        await admin.from("repair_integration_outbox").update({
          status: failed ? "failed" : "retry",
          last_error: message.slice(0, 1000),
          next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        }).eq("id", event.id);
        results.push({ id: event.id, destination: event.destination, status: failed ? "failed" : "retry", error: message });
      }
    }

    return json({ success: true, requeued, processed: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Outbox delivery failed";
    console.error("integration-outbox-worker:", message);
    return json({ error: message }, 401);
  }
});

function destinationConfig(destination: Destination): { url: string; secret: string } {
  const prefix = destination.toUpperCase();
  const url = Deno.env.get(`${prefix}_WEBHOOK_URL`);
  const secret = Deno.env.get(`${prefix}_WEBHOOK_SECRET`);
  if (!url || !secret) throw new Error(`${prefix}_WEBHOOK_URL and ${prefix}_WEBHOOK_SECRET must be configured`);
  return { url, secret };
}

async function authorise(req: Request, admin: ReturnType<typeof createClient>): Promise<Principal> {
  const configuredSecret = Deno.env.get("INTEGRATION_OUTBOX_CRON_SECRET");
  const suppliedSecret = req.headers.get("x-cron-secret");
  if (configuredSecret && suppliedSecret && constantTimeEqual(configuredSecret, suppliedSecret)) return "cron";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing worker authentication");
  const { data: { user } } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) throw new Error("Not authenticated");
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) throw new Error("Administrator access required");
  return "admin";
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) {
    mismatch |= (a[index % a.length] ?? 0) ^ (b[index % b.length] ?? 0);
  }
  return mismatch === 0;
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(signature)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}
