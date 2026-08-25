import { supabase } from "@/integrations/supabase/client";

interface NotifyArgs {
  recipientId: string;
  title: string;
  body?: string;
  link?: string;
  type?: string;
  channels?: ("in_app" | "email" | "sms")[];
}

/**
 * Send a notification to a single user via the dispatch-notification edge function.
 * Never throws — notification failures must not break user flows.
 */
export const notify = async ({
  recipientId,
  title,
  body,
  link,
  type = "general",
  channels = ["in_app"],
}: NotifyArgs) => {
  if (!recipientId) return;
  try {
    const { error } = await supabase.functions.invoke("dispatch-notification", {
      body: { recipient_id: recipientId, title, body, link, type, channels },
    });
    if (error) console.warn("notify failed:", error.message);
  } catch (e) {
    console.warn("notify failed:", e);
  }
};

interface BroadcastArgs {
  audienceRole: string;
  jobId?: string;
  title: string;
  body?: string;
  link?: string;
  type?: string;
  channels?: ("in_app" | "email" | "sms")[];
}

export const notifyRole = async ({
  audienceRole,
  jobId,
  title,
  body,
  link,
  type = "broadcast",
  channels = ["in_app"],
}: BroadcastArgs) => {
  try {
    const { error } = await supabase.functions.invoke("dispatch-notification", {
      body: { broadcast: true, audience_role: audienceRole, job_id: jobId, title, body, link, type, channels },
    });
    if (error) console.warn("notifyRole failed:", error.message);
  } catch (e) {
    console.warn("notifyRole failed:", e);
  }
};

/** Resolve the owner profile id of a trade company. */
export const getCompanyOwner = async (tradeCompanyId: string): Promise<string | null> => {
  const { data } = await supabase
    .from("trade_companies")
    .select("owner_profile_id")
    .eq("id", tradeCompanyId)
    .maybeSingle();
  return data?.owner_profile_id ?? null;
};

/** Resolve the customer profile id + title for a job. */
export const getJobCustomer = async (
  jobId: string
): Promise<{ customerId: string | null; title: string | null }> => {
  const { data } = await supabase
    .from("jobs")
    .select("customer_profile_id, title")
    .eq("id", jobId)
    .maybeSingle();
  return { customerId: data?.customer_profile_id ?? null, title: data?.title ?? null };
};
