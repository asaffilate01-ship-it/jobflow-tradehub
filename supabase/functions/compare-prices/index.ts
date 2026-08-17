import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ShoppingItem = {
  item_name: string;
  quantity: number;
  unit: string;
};

type ComparisonResult = {
  item_name: string;
  quantity: number;
  unit: string;
  best_merchant_id: string;
  best_merchant_name: string;
  best_price: number;
  trade_account_price: number | null;
  retail_price: number;
  has_trade_account: boolean;
  line_total: number;
  alternatives: {
    merchant_id: string;
    merchant_name: string;
    price: number;
    has_trade_account: boolean;
    trade_price: number | null;
  }[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const { items, trade_company_id, delivery_postcode, delivery_address, job_id } =
      await req.json();

    if (!items?.length || !trade_company_id || !delivery_postcode) {
      throw new Error("items, trade_company_id, and delivery_postcode are required");
    }

    const shoppingList: ShoppingItem[] = items;

    // Fetch all merchants, catalog items, trade accounts, and rate card in parallel
    const [
      { data: merchants },
      { data: catalog },
      { data: tradeAccounts },
      { data: rateRows },
    ] = await Promise.all([
      supabase.from("merchants").select("id, name, slug, supports_delivery"),
      supabase.from("merchant_catalog_items").select("id, merchant_id, item_name, price, unit, stock_status"),
      supabase.from("trade_accounts").select("id, merchant_id, discount_percentage").eq("trade_company_id", trade_company_id),
      supabase.from("delivery_rate_card_rows").select("base_fee, per_mile_fee, manpower_fee, percentage_markup").limit(1),
    ]);

    const merchantMap = new Map((merchants ?? []).map((m) => [m.id, m]));
    const tradeAccountMap = new Map((tradeAccounts ?? []).map((a) => [a.merchant_id, a]));

    // For each shopping item, find best price across all merchants
    const results: ComparisonResult[] = [];

    for (const item of shoppingList) {
      // Find matching catalog items (fuzzy match on name)
      const searchTerm = item.item_name.toLowerCase().trim();
      const matches = (catalog ?? []).filter((c) =>
        c.item_name.toLowerCase().includes(searchTerm) ||
        searchTerm.includes(c.item_name.toLowerCase())
      );

      if (matches.length === 0) {
        // No catalog match — add as unmatched
        results.push({
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          best_merchant_id: "",
          best_merchant_name: "No supplier found",
          best_price: 0,
          trade_account_price: null,
          retail_price: 0,
          has_trade_account: false,
          line_total: 0,
          alternatives: [],
        });
        continue;
      }

      // Build alternatives with trade account pricing
      const alternatives = matches
        .filter((m) => m.price !== null && m.price > 0)
        .map((m) => {
          const merchant = merchantMap.get(m.merchant_id);
          const tradeAccount = tradeAccountMap.get(m.merchant_id);
          const retailPrice = m.price!;
          const discount = tradeAccount?.discount_percentage ?? 0;
          const tradePrice = discount > 0 ? retailPrice * (1 - discount / 100) : null;
          const effectivePrice = tradePrice ?? retailPrice;

          return {
            merchant_id: m.merchant_id,
            merchant_name: merchant?.name ?? "Unknown",
            price: effectivePrice,
            retail_price: retailPrice,
            has_trade_account: !!tradeAccount,
            trade_price: tradePrice,
          };
        })
        .sort((a, b) => a.price - b.price);

      const best = alternatives[0];
      if (!best) {
        results.push({
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          best_merchant_id: "",
          best_merchant_name: "No pricing available",
          best_price: 0,
          trade_account_price: null,
          retail_price: 0,
          has_trade_account: false,
          line_total: 0,
          alternatives: [],
        });
        continue;
      }

      results.push({
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        best_merchant_id: best.merchant_id,
        best_merchant_name: best.merchant_name,
        best_price: best.price,
        trade_account_price: best.trade_price,
        retail_price: best.retail_price,
        has_trade_account: best.has_trade_account,
        line_total: Math.round(best.price * item.quantity * 100) / 100,
        alternatives: alternatives.map((a) => ({
          merchant_id: a.merchant_id,
          merchant_name: a.merchant_name,
          price: a.price,
          has_trade_account: a.has_trade_account,
          trade_price: a.trade_price,
        })),
      });
    }

    // Calculate totals
    const materialsCost = results.reduce((sum, r) => sum + r.line_total, 0);

    // Estimate delivery cost using rate card
    const rate = rateRows?.[0] ?? {
      base_fee: 15,
      per_mile_fee: 1.5,
      manpower_fee: 10,
      percentage_markup: 20,
    };
    const estimatedDeliveryCost =
      rate.base_fee + 8 * rate.per_mile_fee + rate.base_fee * (rate.percentage_markup / 100);

    // Group items by merchant for delivery optimisation
    const merchantGroups = new Map<string, ComparisonResult[]>();
    for (const r of results) {
      if (!r.best_merchant_id) continue;
      const existing = merchantGroups.get(r.best_merchant_id) ?? [];
      existing.push(r);
      merchantGroups.set(r.best_merchant_id, existing);
    }

    const deliverySummary = Array.from(merchantGroups.entries()).map(
      ([merchantId, items]) => ({
        merchant_id: merchantId,
        merchant_name: items[0].best_merchant_name,
        item_count: items.length,
        subtotal: items.reduce((s, i) => s + i.line_total, 0),
        delivery_options: [
          { method: "platform_driver", label: "Craftvaro Delivery", cost: estimatedDeliveryCost },
          { method: "merchant_delivery", label: "Merchant Delivery", cost: 0 },
          { method: "trade_collect", label: "Self Collect", cost: 0 },
        ],
      })
    );

    // Save to database using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: quote, error: quoteErr } = await adminClient
      .from("price_quotes")
      .insert({
        trade_company_id,
        requested_by: user.id,
        delivery_postcode,
        delivery_address: delivery_address ?? "",
        job_id: job_id ?? null,
        status: "compared",
        total_cost: materialsCost,
        total_delivery_cost: estimatedDeliveryCost * merchantGroups.size,
        comparison_data: { delivery_summary: deliverySummary },
      })
      .select("id")
      .single();

    if (quoteErr) throw quoteErr;

    // Save items
    const itemsToInsert = results.map((r) => ({
      price_quote_id: quote!.id,
      item_name: r.item_name,
      quantity: r.quantity,
      unit: r.unit,
      best_merchant_id: r.best_merchant_id || null,
      best_merchant_name: r.best_merchant_name,
      best_price: r.best_price,
      trade_account_price: r.trade_account_price,
      retail_price: r.retail_price,
      has_trade_account: r.has_trade_account,
      line_total: r.line_total,
      alternatives: r.alternatives,
    }));

    await adminClient.from("price_quote_items").insert(itemsToInsert);

    return new Response(
      JSON.stringify({
        success: true,
        quote_id: quote!.id,
        materials_cost: materialsCost,
        delivery_cost: estimatedDeliveryCost * merchantGroups.size,
        total: materialsCost + estimatedDeliveryCost * merchantGroups.size,
        items: results,
        delivery_summary: deliverySummary,
        merchant_count: merchantGroups.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Compare prices error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
