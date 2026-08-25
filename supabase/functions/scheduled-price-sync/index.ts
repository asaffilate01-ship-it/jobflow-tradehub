import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Scheduled daily price sync — triggers scrape-merchant-prices for all merchants.
 * Can be called by a cron job or manually by admin.
 *
 * POST /scheduled-price-sync
 * No body required. Uses service role key for internal calls.
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Scheduled calls must provide the private cron secret. Interactive calls
    // must carry an authenticated administrator token.
    const authHeader = req.headers.get("Authorization");
    const suppliedCronSecret = req.headers.get("x-cron-secret");
    const configuredCronSecret = Deno.env.get("SCHEDULED_SYNC_SECRET");
    const validCronCall = Boolean(
      configuredCronSecret && suppliedCronSecret &&
      constantTimeEqual(configuredCronSecret, suppliedCronSecret),
    );

    if (!validCronCall) {
      if (!authHeader) throw new Error("Missing scheduled-task authentication");
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) throw new Error("Not authenticated");

      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Admin access required");
    }

    // Get all merchants with api or scrape integration mode
    const { data: merchants, error: mErr } = await supabase
      .from("merchants")
      .select("id, name, integration_mode")
      .in("integration_mode", ["api", "scrape"]);

    if (mErr) throw mErr;

    const results: { merchant: string; status: string }[] = [];

    // Call scrape-merchant-prices for each merchant
    for (const merchant of merchants ?? []) {
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/scrape-merchant-prices`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ merchant_id: merchant.id }),
          },
        );

        const data = await res.json();
        results.push({
          merchant: merchant.name,
          status: data.success ? `synced (${data.results?.[0]?.items_synced ?? 0} items)` : "failed",
        });
      } catch (err) {
        results.push({
          merchant: merchant.name,
          status: `error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    // Log the sync run
    console.log(`[Scheduled Sync] Completed. Results:`, JSON.stringify(results));

    return new Response(
      JSON.stringify({
        success: true,
        sync_time: new Date().toISOString(),
        merchants_processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Scheduled price sync error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

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
