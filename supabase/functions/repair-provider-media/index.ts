/* eslint-disable @typescript-eslint/no-explicit-any -- Edge Function data is validated at its trust boundaries */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Missing authorization header");
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) throw new Error("Not authenticated");
    const { invite_id } = await req.json();
    const { data: invite } = await admin.from("repair_dispatch_invites").select("id,job_id,trade_company_id,status").eq("id", invite_id).single();
    if (!invite) throw new Error("Invitation not found");
    const { data: company } = await admin.from("trade_companies").select("owner_profile_id").eq("id", invite.trade_company_id).single();
    if (company?.owner_profile_id !== user.id) throw new Error("Invitation does not belong to caller");
    const { data: media } = await admin.from("repair_intake_media").select("id,media_type,redacted_storage_path,redaction_status").eq("job_id", invite.job_id).eq("redaction_status", "safe");
    const items = await Promise.all((media ?? []).filter((item: any) => item.redacted_storage_path).map(async (item: any) => {
      const { data } = await admin.storage.from("repair-intake").createSignedUrl(item.redacted_storage_path, 300);
      return { id: item.id, media_type: item.media_type, url: data?.signedUrl, expires_in: 300 };
    }));
    if (invite.status === "invited") await admin.from("repair_dispatch_invites").update({ status: "viewed" }).eq("id", invite.id);
    return new Response(JSON.stringify({ media: items.map((item) => ({ ...item, signed_url: item.url })), redaction_pending: (media ?? []).length === 0 }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unable to load media" }), { status: 400, headers });
  }
});
