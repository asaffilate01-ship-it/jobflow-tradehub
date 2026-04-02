import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Merchant catalog sync edge function.
 *
 * Accepts a CSV or JSON payload of catalog items and upserts them
 * into merchant_catalog_items. Designed for:
 *   1. Admin bulk upload via CSV
 *   2. Merchant webhook callbacks (future)
 *   3. Scheduled API pulls (calls scrape-merchant-prices, then this for transforms)
 *
 * POST /sync-merchant-catalog
 * Body: {
 *   merchant_id: string,
 *   items: Array<{
 *     item_name: string,
 *     price: number,
 *     unit?: string,
 *     external_sku?: string,
 *     category?: string,
 *     stock_status?: string
 *   }>
 * }
 */

type CatalogItem = {
  item_name: string;
  price: number;
  unit?: string;
  external_sku?: string;
  category?: string;
  stock_status?: string;
};

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
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin access required");

    const { merchant_id, items } = await req.json();

    if (!merchant_id || !Array.isArray(items) || items.length === 0) {
      throw new Error("merchant_id and non-empty items array required");
    }

    // Validate merchant exists
    const { data: merchant, error: mErr } = await supabase
      .from("merchants")
      .select("id, name")
      .eq("id", merchant_id)
      .single();
    if (mErr || !merchant) throw new Error("Merchant not found");

    // Validate and transform items
    const now = new Date().toISOString();
    const validItems: CatalogItem[] = items.filter(
      (i: CatalogItem) => i.item_name && typeof i.price === "number" && i.price >= 0,
    );

    if (validItems.length === 0) {
      throw new Error("No valid items found (each needs item_name and numeric price)");
    }

    const records = validItems.map((item) => ({
      merchant_id,
      item_name: item.item_name.trim(),
      price: Math.round(item.price * 100) / 100,
      unit: item.unit ?? "each",
      external_sku: item.external_sku ?? null,
      category: item.category ?? null,
      stock_status: item.stock_status ?? "in_stock",
      source_type: "csv_upload",
      synced_at: now,
      raw_payload: { uploaded_by: user.id, original: item },
    }));

    // Upsert – if external_sku is set, update existing; otherwise insert new
    const withSku = records.filter((r) => r.external_sku);
    const withoutSku = records.filter((r) => !r.external_sku);

    let upserted = 0;
    let inserted = 0;

    if (withSku.length > 0) {
      const { error: uErr, count } = await supabase
        .from("merchant_catalog_items")
        .upsert(withSku, {
          onConflict: "merchant_id,external_sku",
          ignoreDuplicates: false,
          count: "exact",
        });
      if (uErr) throw uErr;
      upserted = count ?? withSku.length;
    }

    if (withoutSku.length > 0) {
      const { error: iErr, count } = await supabase
        .from("merchant_catalog_items")
        .insert(withoutSku, { count: "exact" });
      if (iErr) throw iErr;
      inserted = count ?? withoutSku.length;
    }

    console.log(
      `[${merchant.name}] Synced catalog: ${upserted} upserted, ${inserted} inserted`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        merchant: merchant.name,
        total_submitted: items.length,
        valid_items: validItems.length,
        upserted,
        inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Sync merchant catalog error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
