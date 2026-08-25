import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const jsonHeaders = { "Content-Type": "application/json" };

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  try {
    const raw = await req.text();
    const supplied = (req.headers.get("X-Dokuvera-Signature") ?? req.headers.get("X-Craftvaro-Signature") ?? "").replace("sha256=", "");
    const timestamp = req.headers.get("X-Craftvaro-Timestamp") ?? req.headers.get("X-Dokuvera-Timestamp");
    const secret = Deno.env.get("DOKUVERA_WEBHOOK_SECRET");
    if (!secret || !supplied) throw new Error("Invalid webhook signature");
    const signedOk = (await verifyHmac(secret, raw, supplied))
      || (!!timestamp && (await verifyHmac(secret, `${timestamp}.${raw}`, supplied)));
    if (!signedOk) throw new Error("Invalid webhook signature");

    const event = JSON.parse(raw);
    if (!event.event_id || !event.job_id || !event.event_type) throw new Error("event_id, job_id and event_type are required");
    const idempotencyKey = `dokuvera.webhook:${event.event_id}`;
    const { data: existing } = await admin.from("repair_integration_outbox").select("id").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) return new Response(JSON.stringify({ success: true, duplicate: true }), { headers: jsonHeaders });

    await admin.from("dokuvera_case_links").upsert({
      job_id: event.job_id,
      dokuvera_case_id: event.case_id ?? null,
      status: event.status ?? "synced",
      evidence_pack_url: event.evidence_pack_url ?? null,
      last_synced_at: new Date().toISOString(),
      last_error: event.error ?? null,
      metadata: event.metadata ?? {},
    }, { onConflict: "job_id" });
    for (const update of event.evidence_updates ?? []) {
      await admin.from("repair_intake_media").update({
        dokuvera_evidence_id: update.evidence_id,
        redaction_status: update.redaction_status ?? "safe",
        redacted_storage_path: update.redacted_storage_path ?? null,
        checksum: update.checksum ?? null,
      }).eq("id", update.source_id).eq("job_id", event.job_id);
    }
    await admin.from("repair_integration_outbox").insert({
      event_type: event.event_type,
      aggregate_type: "dokuvera_case",
      aggregate_id: event.job_id,
      destination: "craftvaro",
      payload: event,
      idempotency_key: idempotencyKey,
      status: "delivered",
      delivered_at: new Date().toISOString(),
    });
    return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Webhook failed" }), { status: 401, headers: jsonHeaders });
  }
});

async function verifyHmac(secret: string, body: string, suppliedHex: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const bytes = new Uint8Array((suppliedHex.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16)));
  return crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(body));
}
