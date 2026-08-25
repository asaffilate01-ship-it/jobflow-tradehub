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

type AdminClient = ReturnType<typeof createClient>;

async function paidSubscriberIds(supabase: AdminClient, userIds: string[]): Promise<string[]> {
  if (!userIds.length) return [];
  const { data } = await supabase
    .from("subscribers")
    .select("user_id,subscription_end")
    .in("user_id", userIds)
    .eq("subscribed", true)
    .neq("tier", "free");
  const now = Date.now();
  return (data ?? [])
    .filter((subscriber: { user_id: string | null; subscription_end: string | null }) =>
      subscriber.user_id && (!subscriber.subscription_end || new Date(subscriber.subscription_end).getTime() > now))
    .map((subscriber: { user_id: string }) => subscriber.user_id);
}

async function matchedPaidTraderIds(supabase: AdminClient, senderId: string, jobId: string): Promise<string[]> {
  const { data: job } = await supabase
    .from("jobs")
    .select("customer_profile_id,requested_trade,postcode")
    .eq("id", jobId)
    .eq("customer_profile_id", senderId)
    .maybeSingle();
  if (!job) throw new Error("Job not found or not owned by caller");

  const { data: repairProfiles } = await supabase
    .from("trade_repair_profiles")
    .select("trade_company_id,service_postcode_prefixes,insurance_expires_at,credential_type,credential_verified,credential_expires_at")
    .eq("trade", job.requested_trade)
    .eq("available", true)
    .eq("capability_verified", true)
    .eq("insurance_verified", true)
    .limit(250);
  const today = new Date().toISOString().slice(0, 10);
  const postcode = normaliseArea(job.postcode ?? "");
  const companyIds = (repairProfiles ?? [])
    .filter((profile: {
      service_postcode_prefixes: string[] | null;
      insurance_expires_at: string | null;
      credential_type: string | null;
      credential_verified: boolean;
      credential_expires_at: string | null;
    }) => {
      if (profile.insurance_expires_at && profile.insurance_expires_at < today) return false;
      if (!(profile.service_postcode_prefixes ?? []).some((prefix) => postcode.startsWith(normaliseArea(prefix)))) return false;
      if (job.requested_trade === "gas_engineer") {
        return profile.credential_verified
          && (!profile.credential_expires_at || profile.credential_expires_at >= today)
          && /gas\s*safe/i.test(profile.credential_type ?? "");
      }
      if (job.requested_trade === "electrician") {
        return profile.credential_verified && (!profile.credential_expires_at || profile.credential_expires_at >= today);
      }
      return true;
    })
    .map((profile: { trade_company_id: string }) => profile.trade_company_id);
  if (!companyIds.length) return [];

  const { data: companies } = await supabase
    .from("trade_companies")
    .select("owner_profile_id")
    .in("id", companyIds);
  const ownerIds = (companies ?? []).map((company: { owner_profile_id: string }) => company.owner_profile_id);
  const { data: verifiedProfiles } = ownerIds.length
    ? await supabase.from("profiles").select("id").in("id", ownerIds).eq("is_active", true).eq("verified", true)
    : { data: [] };
  return paidSubscriberIds(supabase, (verifiedProfiles ?? []).map((profile: { id: string }) => profile.id));
}

async function canNotifyRecipient(supabase: AdminClient, senderId: string, recipientId: string): Promise<boolean> {
  if (senderId === recipientId) return true;

  const { data: conversation } = await supabase
    .from("messages")
    .select("id")
    .or(`and(sender_id.eq.${senderId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${senderId})`)
    .limit(1)
    .maybeSingle();
  if (conversation) return true;

  const [{ data: senderCompanies }, { data: recipientCompanies }] = await Promise.all([
    supabase.from("trade_companies").select("id").eq("owner_profile_id", senderId),
    supabase.from("trade_companies").select("id").eq("owner_profile_id", recipientId),
  ]);

  const senderCompanyIds = (senderCompanies ?? []).map((company: { id: string }) => company.id);
  if (senderCompanyIds.length) {
    const { data: quote } = await supabase
      .from("quotes")
      .select("id,jobs!inner(customer_profile_id)")
      .in("trade_company_id", senderCompanyIds)
      .eq("jobs.customer_profile_id", recipientId)
      .limit(1)
      .maybeSingle();
    if (quote) return true;
  }

  const recipientCompanyIds = (recipientCompanies ?? []).map((company: { id: string }) => company.id);
  if (recipientCompanyIds.length) {
    const { data: quote } = await supabase
      .from("quotes")
      .select("id,jobs!inner(customer_profile_id)")
      .in("trade_company_id", recipientCompanyIds)
      .eq("jobs.customer_profile_id", senderId)
      .limit(1)
      .maybeSingle();
    if (quote) return true;
  }

  const { data: delivery } = await supabase
    .from("deliveries")
    .select("id,material_orders!inner(created_by)")
    .eq("driver_profile_id", senderId)
    .eq("material_orders.created_by", recipientId)
    .limit(1)
    .maybeSingle();
  return Boolean(delivery);
}

function normaliseArea(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "");
}

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

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!apiKey || !from) return { success: false, error: "RESEND_API_KEY and EMAIL_FROM not configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [profile.email],
        subject,
        html: `<p>Hi ${escapeHtml(profile.full_name || "there")},</p><p>${escapeHtml(body).replace(/\n/g, "<br>")}</p><p>— Craftvaro</p>`,
      }),
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Email send failed" };
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
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
