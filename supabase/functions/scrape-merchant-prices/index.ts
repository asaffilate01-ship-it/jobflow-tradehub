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
  merchant: MerchantConfig,
  credentials: Record<string, string> | null,
): Promise<CatalogUpsert[]> {
  if (!credentials?.api_key || !credentials?.api_secret) {
    console.log(`[Travis Perkins] No API credentials configured`);
    return [];
  }

  try {
    // Travis Perkins REST API — Product search endpoint
    // Docs: https://developer.travisperkins.co.uk (requires partner account)
    const authToken = btoa(`${credentials.api_key}:${credentials.api_secret}`);
    const categories = ["timber", "plumbing", "electrical", "building-materials", "insulation"];
    const items: CatalogUpsert[] = [];
    const now = new Date().toISOString();

    for (const category of categories) {
      const res = await fetch(
        `https://api.travisperkins.co.uk/v2/products?category=${category}&pageSize=100&branch=${credentials.branch_id || "default"}`,
        {
          headers: {
            Authorization: `Basic ${authToken}`,
            Accept: "application/json",
            "X-API-Version": "2",
          },
        },
      );

      if (!res.ok) {
        console.error(`[Travis Perkins] API error for ${category}: ${res.status}`);
        continue;
      }

      const data = await res.json();
      for (const product of data.products ?? []) {
        items.push({
          merchant_id: merchant.id,
          item_name: product.name || product.description,
          price: product.tradePrice ?? product.price ?? null,
          unit: product.unitOfMeasure || "each",
          external_sku: product.sku || product.productCode,
          category: product.category || category,
          stock_status: product.stockLevel > 0 ? "in_stock" : "out_of_stock",
          source_type: "api",
          synced_at: now,
          raw_payload: product,
        });
      }
    }

    console.log(`[Travis Perkins] Fetched ${items.length} products via API`);
    return items;
  } catch (err) {
    console.error(`[Travis Perkins] API error:`, err);
    return [];
  }
}

async function fetchJewson(
  merchant: MerchantConfig,
  credentials: Record<string, string> | null,
): Promise<CatalogUpsert[]> {
  if (!credentials?.client_id || !credentials?.client_secret) {
    console.log(`[Jewson] No API credentials configured`);
    return [];
  }

  try {
    // Jewson uses OAuth2 client credentials flow
    const tokenRes = await fetch("https://api.jewson.co.uk/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
      }),
    });

    if (!tokenRes.ok) {
      console.error(`[Jewson] OAuth token error: ${tokenRes.status}`);
      return [];
    }

    const { access_token } = await tokenRes.json();
    const items: CatalogUpsert[] = [];
    const now = new Date().toISOString();

    // Fetch product catalog
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      const res = await fetch(
        `https://api.jewson.co.uk/v1/products?page=${page}&limit=200`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: "application/json",
          },
        },
      );

      if (!res.ok) break;

      const data = await res.json();
      for (const product of data.items ?? []) {
        items.push({
          merchant_id: merchant.id,
          item_name: product.title || product.name,
          price: product.tradePrice ?? product.retailPrice ?? null,
          unit: product.uom || "each",
          external_sku: product.articleNumber || product.sku,
          category: product.categoryName || null,
          stock_status: product.available ? "in_stock" : "out_of_stock",
          source_type: "api",
          synced_at: now,
          raw_payload: product,
        });
      }

      hasMore = (data.items?.length ?? 0) === 200;
      page++;
    }

    console.log(`[Jewson] Fetched ${items.length} products via API`);
    return items;
  } catch (err) {
    console.error(`[Jewson] API error:`, err);
    return [];
  }
}

async function fetchToolstation(
  merchant: MerchantConfig,
  credentials: Record<string, string> | null,
): Promise<CatalogUpsert[]> {
  if (!credentials?.api_key) {
    console.log(`[Toolstation] No API key configured`);
    return [];
  }

  try {
    // Toolstation product feed — JSON/CSV endpoint
    const items: CatalogUpsert[] = [];
    const now = new Date().toISOString();

    const res = await fetch(
      `https://api.toolstation.com/v1/products/feed?format=json`,
      {
        headers: {
          "X-Api-Key": credentials.api_key,
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      console.error(`[Toolstation] API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    for (const product of data.products ?? []) {
      items.push({
        merchant_id: merchant.id,
        item_name: product.name,
        price: product.price ?? null,
        unit: product.unit || "each",
        external_sku: product.code || product.sku,
        category: product.category || null,
        stock_status: product.inStock ? "in_stock" : "out_of_stock",
        source_type: "api",
        synced_at: now,
        raw_payload: product,
      });
    }

    console.log(`[Toolstation] Fetched ${items.length} products via API`);
    return items;
  } catch (err) {
    console.error(`[Toolstation] API error:`, err);
    return [];
  }
}

async function fetchScrewfix(
  merchant: MerchantConfig,
  credentials: Record<string, string> | null,
): Promise<CatalogUpsert[]> {
  if (!credentials?.api_key) {
    console.log(`[Screwfix] No API key configured`);
    return [];
  }

  try {
    // Screwfix catalog API
    const items: CatalogUpsert[] = [];
    const now = new Date().toISOString();

    const categories = ["electrical", "plumbing", "fixings", "tools", "building"];

    for (const cat of categories) {
      const res = await fetch(
        `https://api.screwfix.com/v2/catalog/products?category=${cat}&pageSize=200`,
        {
          headers: {
            "X-Api-Key": credentials.api_key,
            Accept: "application/json",
          },
        },
      );

      if (!res.ok) {
        console.error(`[Screwfix] API error for ${cat}: ${res.status}`);
        continue;
      }

      const data = await res.json();
      for (const product of data.products ?? []) {
        items.push({
          merchant_id: merchant.id,
          item_name: product.productName || product.name,
          price: product.tradePrice ?? product.price ?? null,
          unit: product.unitOfSale || "each",
          external_sku: product.catNo || product.sku,
          category: product.categoryDescription || cat,
          stock_status: product.stockStatus === "IN_STOCK" ? "in_stock" : "out_of_stock",
          source_type: "api",
          synced_at: now,
          raw_payload: product,
        });
      }
    }

    console.log(`[Screwfix] Fetched ${items.length} products via API`);
    return items;
  } catch (err) {
    console.error(`[Screwfix] API error:`, err);
    return [];
  }
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
