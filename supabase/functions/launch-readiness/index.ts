import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type CheckState = "ready" | "warning" | "blocker";

type ReadinessCheck = {
  id: string;
  label: string;
  state: CheckState;
  detail: string;
};

const REQUIRED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];
const REPAIR_BUCKET = "repair-intake";
const REPAIR_BUCKET_LIMIT = 50 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    await requireAdmin(req, admin);
    const body = await req.json().catch(() => ({}));
    if (body?.action === "ensure_repair_bucket") await ensureRepairBucket(admin);
    else if (body?.action && body.action !== "check") return json({ error: "Unsupported action" }, 400);

    const report = await buildReport(admin);
    return json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Readiness check failed";
    console.error("launch-readiness:", message);
    const status = /authenticated|administrator/i.test(message) ? 403 : 400;
    return json({ error: message }, status);
  }
});

async function requireAdmin(req: Request, admin: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Not authenticated");
  const { data: { user }, error } = await admin.auth.getUser(authHeader.slice(7));
  if (error || !user) throw new Error("Not authenticated");
  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  if (roleError || !isAdmin) throw new Error("Administrator access required");
}

async function ensureRepairBucket(admin: ReturnType<typeof createClient>) {
  const options = {
    public: false,
    fileSizeLimit: REPAIR_BUCKET_LIMIT,
    allowedMimeTypes: REQUIRED_MIME_TYPES,
  };
  const { data: bucket, error: getError } = await admin.storage.getBucket(REPAIR_BUCKET);
  if (getError && !/not found/i.test(getError.message)) throw getError;
  const { error } = bucket
    ? await admin.storage.updateBucket(REPAIR_BUCKET, options)
    : await admin.storage.createBucket(REPAIR_BUCKET, options);
  if (error) throw error;
}

async function buildReport(admin: ReturnType<typeof createClient>) {
  const [
    bucketResult,
    paidMembers,
    directoryProfiles,
    repairProfiles,
    deletionRequests,
    outboxProblems,
    dokuveraProblems,
  ] = await Promise.all([
    admin.storage.getBucket(REPAIR_BUCKET),
    count(admin, "trader_public_profiles"),
    count(admin, "trader_directory_profiles", (query) => query.eq("is_active", true)),
    admin.from("trade_repair_profiles").select("available,capability_verified,insurance_verified,insurance_expires_at,credential_type,credential_verified,credential_expires_at"),
    count(admin, "account_deletion_requests", (query) => query.in("status", ["requested", "processing"])),
    count(admin, "repair_integration_outbox", (query) => query.in("status", ["retry", "failed"])),
    count(admin, "dokuvera_case_links", (query) => query.in("status", ["pending", "failed"])),
  ]);

  const storageReady = Boolean(bucketResult.data && bucketResult.data.public === false);
  const verifiedRepairProfiles = (repairProfiles.data ?? []).filter((profile) =>
    profile.available &&
    profile.capability_verified &&
    profile.insurance_verified &&
    (!profile.insurance_expires_at || new Date(profile.insurance_expires_at).getTime() >= Date.now()) &&
    (!profile.credential_type || (
      profile.credential_verified &&
      (!profile.credential_expires_at || new Date(profile.credential_expires_at).getTime() >= Date.now())
    ))
  ).length;

  const checks: ReadinessCheck[] = [
    {
      id: "repair-storage",
      label: "Private repair media storage",
      state: storageReady ? "ready" : "blocker",
      detail: storageReady
        ? "repair-intake exists and is private."
        : "Create the private repair-intake bucket with the button below before accepting media.",
    },
    envCheck("stripe", "Stripe subscriptions", [
      "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_BASIC_PRICE_ID", "STRIPE_PREMIUM_PRICE_ID",
    ], "blocker"),
    envCheck("repair-ai", "Repair AI gateway", [
      "REPAIR_VISION_GATEWAY_URL", "REPAIR_VISION_GATEWAY_SECRET",
    ], "blocker"),
    envCheck("dokuvera", "Dokuvera evidence sync", [
      "DOKUVERA_API_URL", "DOKUVERA_API_TOKEN", "DOKUVERA_SIGNING_SECRET", "DOKUVERA_WEBHOOK_SECRET",
    ], "blocker"),
    envCheck("product-events", "Gabley and Immoviq delivery", [
      "GABLEY_WEBHOOK_URL", "GABLEY_WEBHOOK_SECRET", "IMMOVIQ_WEBHOOK_URL", "IMMOVIQ_WEBHOOK_SECRET", "INTEGRATION_OUTBOX_CRON_SECRET",
    ], "warning"),
    {
      id: "paid-members",
      label: "Paid marketplace supply",
      state: paidMembers.count >= 10 ? "ready" : paidMembers.count > 0 ? "warning" : "blocker",
      detail: paidMembers.error
        ? `Could not inspect paid marketplace profiles: ${paidMembers.error}`
        : `${paidMembers.count} verified paid/trial trader profile${paidMembers.count === 1 ? "" : "s"} currently public and lead-eligible. The controlled pilot target is at least 10.`,
    },
    {
      id: "repair-providers",
      label: "Verified repair providers",
      state: verifiedRepairProfiles >= 4 ? "ready" : verifiedRepairProfiles > 0 ? "warning" : "blocker",
      detail: repairProfiles.error
        ? `Could not inspect repair providers: ${repairProfiles.error.message}`
        : `${verifiedRepairProfiles} verified provider profile${verifiedRepairProfiles === 1 ? " is" : "s are"} accepting work. The four-provider pilot target is 4; paid eligibility is still enforced during matching.`,
    },
    {
      id: "integration-queue",
      label: "Integration delivery queue",
      state: outboxProblems.count === 0 ? "ready" : "warning",
      detail: outboxProblems.error
        ? `Could not inspect delivery queue: ${outboxProblems.error}`
        : `${outboxProblems.count} integration event${outboxProblems.count === 1 ? " needs" : "s need"} retry or investigation.`,
    },
    {
      id: "dokuvera-queue",
      label: "Dokuvera evidence queue",
      state: dokuveraProblems.count === 0 ? "ready" : "warning",
      detail: dokuveraProblems.error
        ? `Could not inspect Dokuvera cases: ${dokuveraProblems.error}`
        : `${dokuveraProblems.count} evidence case${dokuveraProblems.count === 1 ? " is" : "s are"} pending or failed.`,
    },
  ];

  return {
    generated_at: new Date().toISOString(),
    summary: {
      blockers: checks.filter((check) => check.state === "blocker").length,
      warnings: checks.filter((check) => check.state === "warning").length,
      ready: checks.filter((check) => check.state === "ready").length,
    },
    checks,
    metrics: {
      paid_marketplace_profiles: paidMembers.count,
      active_claimable_directory_profiles: directoryProfiles.count,
      verified_available_repair_profiles: verifiedRepairProfiles,
      pending_deletion_requests: deletionRequests.count,
      integration_queue_problems: outboxProblems.count,
      dokuvera_queue_problems: dokuveraProblems.count,
    },
  };
}

function envCheck(id: string, label: string, keys: string[], missingState: CheckState): ReadinessCheck {
  const missing = keys.filter((key) => !Deno.env.get(key));
  return {
    id,
    label,
    state: missing.length ? missingState : "ready",
    detail: missing.length ? `Missing configuration: ${missing.join(", ")}.` : "All required configuration keys are present.",
  };
}

async function count(
  admin: ReturnType<typeof createClient>,
  table: string,
  // PostgREST query-builder generics vary with a runtime-selected table name.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: (query: any) => any,
): Promise<{ count: number; error: string | null }> {
  let query = admin.from(table).select("*", { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count: total, error } = await query;
  return { count: total ?? 0, error: error?.message ?? null };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
