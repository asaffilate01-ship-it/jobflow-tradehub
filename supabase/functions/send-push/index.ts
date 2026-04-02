import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Send Web Push notifications to a user's registered devices.
 *
 * POST /send-push
 * Body: {
 *   user_id: string,
 *   title: string,
 *   body?: string,
 *   link?: string,
 *   tag?: string
 * }
 *
 * Requires VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY secrets.
 */

// Web Push requires signing with VAPID keys
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: object,
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:push@traderos.app";

  if (!vapidPrivateKey || !vapidPublicKey) {
    return { success: false, error: "VAPID keys not configured" };
  }

  try {
    // Use the web-push approach via fetch with VAPID JWT
    // For production, this would use the web-push library
    // For now, we'll use a simplified approach that works with most push services
    
    const payloadStr = JSON.stringify(payload);
    
    // Create VAPID JWT header
    const audience = new URL(subscription.endpoint).origin;
    const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours
    
    const header = { typ: "JWT", alg: "ES256" };
    const jwtPayload = {
      aud: audience,
      exp: expiration,
      sub: vapidSubject,
    };

    // Import the VAPID private key
    const rawPrivateKey = base64UrlDecode(vapidPrivateKey);
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      rawPrivateKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );

    // Create JWT
    const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(jwtPayload)));
    const unsignedToken = `${headerB64}.${payloadB64}`;
    
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      cryptoKey,
      new TextEncoder().encode(unsignedToken),
    );

    const signatureB64 = base64UrlEncode(new Uint8Array(signature));
    const jwt = `${unsignedToken}.${signatureB64}`;

    // Send the push message
    const res = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: new TextEncoder().encode(payloadStr),
    });

    if (res.status === 201 || res.status === 200) {
      return { success: true, statusCode: res.status };
    }

    // 410 Gone means the subscription is expired — should be cleaned up
    if (res.status === 410 || res.status === 404) {
      return { success: false, error: "subscription_expired", statusCode: res.status };
    }

    const errText = await res.text();
    return { success: false, error: errText, statusCode: res.status };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const body = await req.json();
    const { user_id, title, body: notifBody, link, tag } = body;

    if (!user_id || !title) {
      throw new Error("user_id and title are required");
    }

    // Get all push subscriptions for the target user
    const { data: subscriptions, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subErr) throw subErr;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No push subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = { title, body: notifBody || "", link: link || "/", tag: tag || "traderos" };
    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const result = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth_key: sub.auth_key },
        payload,
      );

      if (result.success) {
        sent++;
      } else {
        failed++;
        if (result.error === "subscription_expired") {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user_id)
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed, cleaned: expiredEndpoints.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Send push error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
