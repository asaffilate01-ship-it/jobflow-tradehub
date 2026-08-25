import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Dispatch notifications across multiple channels: in-app, email, SMS.
 *
 * POST /dispatch-notification
 * Body: {
 *   recipient_id: string,          // user UUID
 *   title: string,
 *   body?: string,
 *   link?: string,
 *   type?: string,                 // notification type
 *   channels?: ("in_app" | "email" | "sms")[]  // defaults to ["in_app"]
 * }
 *
 * OR for broadcast:
 * Body: {
 *   broadcast: true,
 *   audience_role: string,         // e.g. "trader", "driver"
 *   title: string,
 *   body?: string,
 *   channels?: ("in_app" | "email" | "sms")[]
 * }
 */

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
    const allowedChannels = new Set(["in_app", "email", "sms"]);
    const channels: string[] = [...new Set(body.channels ?? ["in_app"])]
      .filter((channel): channel is string => allowedChannels.has(channel));
    const title = String(body.title ?? "").trim().slice(0, 120);
    const notificationBody = body.body == null ? null : String(body.body).trim().slice(0, 2000);
    if (!title) throw new Error("title is required");
    if (!channels.length) throw new Error("At least one valid notification channel is required");

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    const results: { channel: string; success: boolean; error?: string }[] = [];

    if (body.broadcast) {
      const audienceRole = String(body.audience_role ?? "");
      let recipientIds: string[];
      if (isAdmin) {
        const { data: roleUsers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", audienceRole);
        recipientIds = (roleUsers ?? []).map((roleUser: { user_id: string }) => roleUser.user_id);
        if (audienceRole === "trade") {
          recipientIds = await paidSubscriberIds(supabase, recipientIds);
        }
      } else {
        if (audienceRole !== "trade" || body.type !== "job_posted" || !body.job_id) {
          throw new Error("Administrator access required for broadcasts");
        }
        recipientIds = await matchedPaidTraderIds(supabase, user.id, String(body.job_id));
      }

      // Prevent accidental or malicious fan-out from becoming an unbounded bill.
      recipientIds = [...new Set(recipientIds)].slice(0, isAdmin ? 1000 : 100);

      for (const channel of channels) {
        if (channel === "in_app") {
          // Insert notification for each recipient
          const notifications = recipientIds.map((rid: string) => ({
            recipient_id: rid,
            title,
            body: notificationBody,
            link: body.link ?? null,
            type: body.type ?? "broadcast",
          }));

          if (notifications.length > 0) {
            const { error: insertErr } = await supabase
              .from("notifications")
              .insert(notifications);
            results.push({
              channel: "in_app",
              success: !insertErr,
              error: insertErr?.message,
            });
          } else {
            results.push({ channel: "in_app", success: true, error: "No recipients" });
          }
        } else if (channel === "email") {
          // Queue emails for each recipient
          const sent = await sendBulkEmail(supabase, recipientIds, title, notificationBody ?? "");
          results.push({ channel: "email", ...sent });
        } else if (channel === "sms") {
          const sent = await sendBulkSms(supabase, recipientIds, title, notificationBody ?? "");
          results.push({ channel: "sms", ...sent });
        }
      }
    } else {
      // Single recipient notification
      const recipientId = body.recipient_id;
      if (!recipientId) throw new Error("recipient_id is required");
      if (!isAdmin && !(await canNotifyRecipient(supabase, user.id, recipientId))) {
        throw new Error("Not authorised to notify this user");
      }

      for (const channel of channels) {
        if (channel === "in_app") {
          const { error: insertErr } = await supabase
            .from("notifications")
            .insert({
              recipient_id: recipientId,
              title,
              body: notificationBody,
              link: body.link ?? null,
              type: body.type ?? "general",
            });
          results.push({
            channel: "in_app",
            success: !insertErr,
            error: insertErr?.message,
          });
        } else if (channel === "email") {
          const sent = await sendEmail(supabase, recipientId, title, notificationBody ?? "");
          results.push({ channel: "email", ...sent });
        } else if (channel === "sms") {
          const sent = await sendSms(supabase, recipientId, title, notificationBody ?? "");
          results.push({ channel: "sms", ...sent });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Dispatch notification error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

/* ────────── Email helpers ────────── */

async function sendEmail(
  supabase: any,
  recipientId: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  // Get recipient email from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", recipientId)
    .single();

  if (!profile?.email) {
    return { success: false, error: "No email on profile" };
  }

  // Try to queue via email infrastructure if available
  try {
    const { error } = await supabase.rpc("send_email_message", {
      p_to: profile.email,
      p_subject: subject,
      p_html: `<p>Hi ${profile.full_name || "there"},</p><p>${body}</p><p>— Craftvaro</p>`,
      p_from_name: "Craftvaro",
    });
    if (error) throw error;
    return { success: true };
  } catch {
    // Email infra not set up yet — log and return gracefully
    console.log(`[Email] Would send to ${profile.email}: ${subject}`);
    return { success: false, error: "Email infrastructure not configured yet" };
  }
}

async function sendBulkEmail(
  supabase: any,
  recipientIds: string[],
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  let sent = 0;
  let failed = 0;
  for (const rid of recipientIds) {
    const result = await sendEmail(supabase, rid, subject, body);
    if (result.success) sent++;
    else failed++;
  }
  return { success: failed === 0, error: failed ? `Sent: ${sent}, Failed: ${failed}` : undefined };
}

/* ────────── SMS helpers ────────── */

async function sendSms(
  supabase: any,
  recipientId: string,
  _subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!twilioSid || !twilioAuth || !twilioFrom) {
    console.log("[SMS] Twilio not configured — skipping");
    return { success: false, error: "Twilio not configured" };
  }

  // Get recipient phone
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", recipientId)
    .single();

  if (!profile?.phone) {
    return { success: false, error: "No phone on profile" };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${twilioSid}:${twilioAuth}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: profile.phone,
          From: twilioFrom,
          Body: body || _subject,
        }),
      },
    );

    if (!res.ok) {
      const errData = await res.json();
      return { success: false, error: errData.message || "Twilio error" };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "SMS send failed" };
  }
}

async function sendBulkSms(
  supabase: any,
  recipientIds: string[],
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  let sent = 0;
  let failed = 0;
  for (const rid of recipientIds) {
    const result = await sendSms(supabase, rid, subject, body);
    if (result.success) sent++;
    else failed++;
  }
  return { success: failed === 0, error: failed ? `Sent: ${sent}, Failed: ${failed}` : undefined };
}
