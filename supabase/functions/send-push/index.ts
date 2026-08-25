import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import webpush from "npm:web-push@3.6.7";

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
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:push@craftvaro.app";

  if (!vapidPrivateKey || !vapidPublicKey) {
    return { success: false, error: "VAPID keys not configured" };
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    const response = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth_key },
      },
      JSON.stringify(payload),
      { TTL: 86400 },
    );
    return { success: true, statusCode: response.statusCode };
  } catch (err) {
    const statusCode = typeof err === "object" && err !== null && "statusCode" in err
      ? Number((err as { statusCode?: number }).statusCode)
      : undefined;
    if (statusCode === 404 || statusCode === 410) {
      return { success: false, error: "subscription_expired", statusCode };
    }
    return { success: false, error: err instanceof Error ? err.message : String(err), statusCode };
  }
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

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (user_id !== user.id && !isAdmin) {
      throw new Error("Not authorised to send push notifications to this user");
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

    const payload = { title, body: notifBody || "", link: link || "/", tag: tag || "craftvaro" };
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
