/* eslint-disable @typescript-eslint/no-explicit-any -- Edge Function data is validated at its trust boundaries */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  let requestedJobId: string | null = null;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Missing authorization header");
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) throw new Error("Not authenticated");
    const { job_id } = await req.json();
    requestedJobId = job_id;
    const { data: job } = await admin.from("jobs").select("*").eq("id", job_id).single();
    if (!job) throw new Error("Job not found");
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((item: any) => item.role === "admin");
    let authorised = job.customer_profile_id === user.id || isAdmin;
    if (!authorised && job.trade_company_id) {
      const { data: company } = await admin.from("trade_companies").select("owner_profile_id").eq("id", job.trade_company_id).single();
      authorised = company?.owner_profile_id === user.id;
    }
    if (!authorised) throw new Error("Not authorised for this repair evidence case");

    const [diagnosisResult, mediaResult, quotesResult, certsResult, linkResult, locationResult] = await Promise.all([
      admin.from("repair_diagnoses").select("*").eq("job_id", job_id).maybeSingle(),
      admin.from("repair_intake_media").select("*").eq("job_id", job_id),
      admin.from("quotes").select("*").eq("job_id", job_id),
      admin.from("compliance_certificates").select("*").eq("job_id", job_id),
      admin.from("dokuvera_case_links").select("*").eq("job_id", job_id).maybeSingle(),
      admin.from("repair_private_locations").select("address_line1,city,postcode").eq("job_id", job_id).maybeSingle(),
    ]);
    const safeMediaRows = (mediaResult.data ?? []).filter(
      (item: any) => item.redaction_status === "safe" && item.redacted_storage_path,
    );
    const media = await Promise.all(safeMediaRows.map(async (item: any) => {
      const { data } = await admin.storage.from("repair-intake").createSignedUrl(item.redacted_storage_path, 600);
      return { source_id: item.id, media_type: item.media_type, captured_at: item.captured_at, checksum: item.checksum, redaction_status: item.redaction_status, signed_url: data?.signedUrl, expires_in: 600 };
    }));
    const payload = {
      external_system: "craftvaro",
      external_case_id: job.id,
      existing_dokuvera_case_id: linkResult.data?.dokuvera_case_id ?? null,
      property: {
        address_line1: locationResult.data?.address_line1 ?? job.address_line1,
        city: locationResult.data?.city ?? job.city,
        postcode: locationResult.data?.postcode ?? job.postcode,
        country: "GB",
      },
      repair: { title: job.title, description: job.description, status: job.status, priority: job.repair_priority, requested_trade: job.requested_trade, created_at: job.created_at },
      source: { product: job.source_product, reference: job.source_reference, property_reference: job.property_reference, tenancy_reference: job.tenancy_reference },
      diagnosis: diagnosisResult.data,
      media,
      media_privacy: {
        originals_shared: false,
        safe_media_count: media.length,
        pending_media_count: (mediaResult.data ?? []).length - media.length,
      },
      offers: quotesResult.data ?? [],
      certificates: certsResult.data ?? [],
    };
    const apiUrl = Deno.env.get("DOKUVERA_API_URL");
    const apiToken = Deno.env.get("DOKUVERA_API_TOKEN");
    const signingSecret = Deno.env.get("DOKUVERA_SIGNING_SECRET");
    if (!apiUrl || !apiToken || !signingSecret) {
      await admin.from("dokuvera_case_links").upsert({ job_id, status: "pending", last_error: "Dokuvera endpoint credentials are not configured" }, { onConflict: "job_id" });
      return new Response(JSON.stringify({ success: true, configured: false, status: "pending", message: "Evidence is queued; configure DOKUVERA_API_URL, DOKUVERA_API_TOKEN and DOKUVERA_SIGNING_SECRET." }), { headers });
    }
    await admin.from("dokuvera_case_links").upsert({ job_id, status: "syncing", last_error: null }, { onConflict: "job_id" });
    const raw = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = await hmacHex(signingSecret, `${timestamp}.${raw}`);
    const base = apiUrl.replace(/\/$/, "");
    const endpoint = /craftvaro-evidence-intake$/.test(base) ? base : `${base}/v1/cases/upsert`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
        "X-Craftvaro-Timestamp": timestamp,
        "X-Craftvaro-Signature": `sha256=${signature}`,
        "X-Dokuvera-Signature": `sha256=${signature}`,
        "Idempotency-Key": `craftvaro:${job_id}`,
      },
      body: raw,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || `Dokuvera returned ${response.status}`);
    await admin.from("dokuvera_case_links").upsert({
      job_id, dokuvera_case_id: result.case_id, status: result.status ?? "synced", evidence_pack_url: result.evidence_pack_url ?? null,
      last_synced_at: new Date().toISOString(), last_error: null, metadata: { response_version: result.version ?? null },
    }, { onConflict: "job_id" });
    await admin.from("repair_integration_outbox").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("destination", "dokuvera").eq("status", "pending").contains("payload", { job_id });
    return new Response(JSON.stringify({ success: true, configured: true, case_id: result.case_id, status: result.status ?? "synced" }), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dokuvera sync failed";
    if (requestedJobId) await admin.from("dokuvera_case_links").upsert({ job_id: requestedJobId, status: "failed", last_error: message }, { onConflict: "job_id" });
    console.error("dokuvera-sync:", message);
    return new Response(JSON.stringify({ error: message }), { status: 400, headers });
  }
});

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(signature)].map((value) => value.toString(16).padStart(2, "0")).join("");
}
