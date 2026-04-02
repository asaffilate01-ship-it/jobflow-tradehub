import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Merchant price scraper / API integration edge function.
 *
 * Supports multiple integration modes per merchant:
 * - "api"     → calls the merchant's API with stored credentials
 * - "scrape"  → uses Firecrawl to scrape the merchant's website
 * - "csv"     → admin-uploaded CSV already in merchant_catalog_items (no-op here)
 *
 * Called by:
 *   POST /scrape-merchant-prices
 *   Body: { merchant_id?: string }   (omit to sync ALL merchants)
 */

type MerchantConfig = {
  id: string;
  name: string;
  slug: string;
  integration_mode: string;
  website_url: string | null;
};

type CatalogUpsert = {
  merchant_id: string;
  item_name: string;
  price: number | null;
  unit: string | null;
  external_sku: string | null;
  category: string | null;
  stock_status: string | null;
  source_type: string;
  synced_at: string;
  raw_payload: Record<string, unknown>;
};

/* ────────── API adapters per merchant slug ────────── */

async function fetchTravisPerkins(
  _merchant: MerchantConfig,
  credentials: Record<string, string> | null,
): Promise<CatalogUpsert[]> {
  // Placeholder: Travis Perkins API integration
  // When live, call their REST API using credentials.api_key / credentials.api_secret
  console.log(
    `[Travis Perkins] API integration stub – credentials present: ${!!credentials}`,
  );
  return [];
}

async function fetchJewson(
  _merchant: MerchantConfig,
  credentials: Record<string, string> | null,
): Promise<CatalogUpsert[]> {
  // Placeholder: Jewson API integration
  console.log(
    `[Jewson] API integration stub – credentials present: ${!!credentials}`,
  );
  return [];
}

async function fetchToolstation(
  _merchant: MerchantConfig,
  credentials: Record<string, string> | null,
): Promise<CatalogUpsert[]> {
  // Placeholder: Toolstation API integration
  console.log(
    `[Toolstation] API integration stub – credentials present: ${!!credentials}`,
  );
  return [];
}

async function fetchScrewfix(
  _merchant: MerchantConfig,
  credentials: Record<string, string> | null,
): Promise<CatalogUpsert[]> {
  // Placeholder: Screwfix API integration
  console.log(
    `[Screwfix] API integration stub – credentials present: ${!!credentials}`,
  );
  return [];
}

const apiAdapters: Record<
  string,
  (m: MerchantConfig, creds: Record<string, string> | null) => Promise<CatalogUpsert[]>
> = {
  "travis-perkins": fetchTravisPerkins,
  jewson: fetchJewson,
  toolstation: fetchToolstation,
  screwfix: fetchScrewfix,
};

/* ────────── Firecrawl scraper fallback ────────── */

async function scrapeWithFirecrawl(
  merchant: MerchantConfig,
): Promise<CatalogUpsert[]> {
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!firecrawlKey || !merchant.website_url) {
    console.log(
      `[${merchant.name}] Skipping scrape – no Firecrawl key or website URL`,
    );
    return [];
  }

  try {
    // Step 1: map the merchant site to find product pages
    const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: merchant.website_url,
        search: "product price building materials",
        limit: 50,
        includeSubdomains: false,
      }),
    });

    const mapData = await mapRes.json();
    if (!mapRes.ok) {
      console.error(`[${merchant.name}] Map failed:`, mapData);
      return [];
    }

    const productUrls: string[] = (mapData.links ?? []).slice(0, 20);
    console.log(
      `[${merchant.name}] Found ${productUrls.length} product URLs to scrape`,
    );

    // Step 2: scrape each product page for structured data
    const items: CatalogUpsert[] = [];
    const now = new Date().toISOString();

    for (const url of productUrls) {
      try {
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: [
              {
                type: "json",
                schema: {
                  type: "object",
                  properties: {
                    product_name: { type: "string" },
                    price: { type: "number" },
                    unit: { type: "string" },
                    sku: { type: "string" },
                    category: { type: "string" },
                    in_stock: { type: "boolean" },
                  },
                },
                prompt:
                  "Extract the product name, price (numeric, ex-VAT if shown), unit of sale, SKU/product code, category, and whether it is in stock.",
              },
            ],
            onlyMainContent: true,
          }),
        });

        const scrapeData = await scrapeRes.json();
        const product = scrapeData?.data?.json ?? scrapeData?.json;

        if (product?.product_name && product?.price) {
          items.push({
            merchant_id: merchant.id,
            item_name: product.product_name,
            price: product.price,
            unit: product.unit ?? "each",
            external_sku: product.sku ?? null,
            category: product.category ?? null,
            stock_status: product.in_stock === false ? "out_of_stock" : "in_stock",
            source_type: "scraped",
            synced_at: now,
            raw_payload: { source_url: url, ...product },
          });
        }
      } catch (scrapeErr) {
        console.error(`[${merchant.name}] Scrape error for ${url}:`, scrapeErr);
      }
    }

    console.log(`[${merchant.name}] Scraped ${items.length} products`);
    return items;
  } catch (err) {
    console.error(`[${merchant.name}] Scrape pipeline error:`, err);
    return [];
  }
}

/* ────────── Main handler ────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // Auth check – admin only
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

    const body = await req.json().catch(() => ({}));
    const targetMerchantId: string | undefined = body.merchant_id;

    // Fetch merchants to sync
    let query = supabase
      .from("merchants")
      .select("id, name, slug, integration_mode, website_url");
    if (targetMerchantId) {
      query = query.eq("id", targetMerchantId);
    }
    const { data: merchants, error: mErr } = await query;
    if (mErr) throw mErr;

    const results: { merchant: string; mode: string; items_synced: number; errors: string[] }[] = [];

    for (const merchant of merchants ?? []) {
      const errors: string[] = [];
      let items: CatalogUpsert[] = [];

      try {
        if (merchant.integration_mode === "api") {
          // Get stored credentials for this merchant
          const { data: creds } = await supabase
            .from("integration_credentials")
            .select("config")
            .eq("merchant_id", merchant.id)
            .single();

          const adapter = apiAdapters[merchant.slug];
          if (adapter) {
            items = await adapter(
              merchant as MerchantConfig,
              (creds?.config as Record<string, string>) ?? null,
            );
          } else {
            errors.push(`No API adapter for slug: ${merchant.slug}`);
          }
        } else if (merchant.integration_mode === "scrape") {
          items = await scrapeWithFirecrawl(merchant as MerchantConfig);
        } else {
          // csv or manual – skip
          results.push({
            merchant: merchant.name,
            mode: merchant.integration_mode,
            items_synced: 0,
            errors: ["Mode does not require sync"],
          });
          continue;
        }

        // Upsert items into catalog
        if (items.length > 0) {
          const { error: upsertErr } = await supabase
            .from("merchant_catalog_items")
            .upsert(items, {
              onConflict: "merchant_id,external_sku",
              ignoreDuplicates: false,
            });
          if (upsertErr) errors.push(upsertErr.message);
        }
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }

      results.push({
        merchant: merchant.name,
        mode: merchant.integration_mode,
        items_synced: items.length,
        errors,
      });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Scrape merchant prices error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
