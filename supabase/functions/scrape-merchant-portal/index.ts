import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Headless browser merchant portal scraper.
 *
 * Uses Browserless.io to log into merchant portals with trader's
 * stored credentials and scrape their actual trade prices.
 *
 * POST /scrape-merchant-portal
 * Body: {
 *   trade_account_id: string,
 *   search_items: string[]     // product names to search for
 * }
 *
 * Returns: {
 *   success: boolean,
 *   merchant: string,
 *   results: Array<{ item_name, price, unit, sku, in_stock }>
 * }
 */

// ── Crypto helpers (same as merchant-credentials) ──

async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret.slice(0, 32).padEnd(32, "0")),
    "AES-GCM",
    false,
    ["decrypt"],
  );
}

async function decrypt(base64: string): Promise<string> {
  const key = await getKey();
  const combined = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

// ── Merchant-specific scraping scripts ──
// Each returns a Puppeteer script string that Browserless will execute.
// The script receives: portalUrl, username, password, searchItems

type MerchantScript = {
  loginScript: (
    portalUrl: string,
    username: string,
    password: string,
    searchItems: string[],
  ) => string;
};

const merchantScripts: Record<string, MerchantScript> = {
  "travis-perkins": {
    loginScript: (portalUrl, username, password, searchItems) => `
      module.exports = async ({ page }) => {
        const results = [];
        
        // Navigate to login page
        await page.goto('${portalUrl || "https://www.travisperkins.co.uk/login"}', { 
          waitUntil: 'networkidle2', timeout: 30000 
        });
        
        // Accept cookies if banner appears
        try {
          const cookieBtn = await page.$('[data-testid="cookie-accept"], #onetrust-accept-btn-handler, button[class*="cookie"]');
          if (cookieBtn) await cookieBtn.click();
          await page.waitForTimeout(1000);
        } catch (_) {}
        
        // Fill login form
        await page.waitForSelector('input[type="email"], input[name="email"], input[id*="email"], input[id*="username"]', { timeout: 10000 });
        const emailInput = await page.$('input[type="email"], input[name="email"], input[id*="email"], input[id*="username"]');
        if (emailInput) {
          await emailInput.click({ clickCount: 3 });
          await emailInput.type('${username}', { delay: 50 });
        }
        
        const passInput = await page.$('input[type="password"]');
        if (passInput) {
          await passInput.click({ clickCount: 3 });
          await passInput.type('${password}', { delay: 50 });
        }
        
        // Submit login
        const submitBtn = await page.$('button[type="submit"], input[type="submit"], button[class*="login"], button[class*="sign"]');
        if (submitBtn) await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);
        
        // Check if login succeeded (look for account indicators)
        const loggedIn = await page.$('[class*="account"], [class*="logout"], [class*="my-account"], [data-testid*="account"]');
        if (!loggedIn) {
          return { success: false, error: 'Login failed – check credentials', results: [] };
        }
        
        // Search for each item
        const searchItems = ${JSON.stringify(searchItems)};
        
        for (const item of searchItems) {
          try {
            // Find and use search bar
            const searchInput = await page.$('input[type="search"], input[name="q"], input[id*="search"], input[placeholder*="search" i], input[placeholder*="Search" i]');
            if (searchInput) {
              await searchInput.click({ clickCount: 3 });
              await searchInput.type(item, { delay: 30 });
              await page.keyboard.press('Enter');
              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
              await page.waitForTimeout(2000);
            }
            
            // Extract product data from search results
            const products = await page.evaluate(() => {
              const items = [];
              // Common product card selectors across merchant sites
              const cards = document.querySelectorAll(
                '[class*="product-card"], [class*="product-tile"], [class*="product-item"], ' +
                '[data-testid*="product"], article[class*="product"], .product-list-item, ' +
                'li[class*="product"], div[class*="search-result"]'
              );
              
              cards.forEach((card, idx) => {
                if (idx >= 5) return; // Top 5 results per search
                
                const nameEl = card.querySelector(
                  '[class*="product-name"], [class*="product-title"], h2, h3, h4, ' +
                  'a[class*="product"], [data-testid*="name"], [class*="title"]'
                );
                const priceEl = card.querySelector(
                  '[class*="price"], [data-testid*="price"], span[class*="amount"], ' +
                  '[class*="cost"], [class*="trade-price"]'
                );
                const skuEl = card.querySelector(
                  '[class*="sku"], [class*="code"], [class*="product-code"], ' +
                  '[data-testid*="sku"]'
                );
                const stockEl = card.querySelector(
                  '[class*="stock"], [class*="availability"], [data-testid*="stock"]'
                );
                
                const name = nameEl?.textContent?.trim();
                const priceText = priceEl?.textContent?.trim();
                const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;
                
                if (name && price) {
                  items.push({
                    item_name: name,
                    price: price,
                    sku: skuEl?.textContent?.trim() || null,
                    in_stock: stockEl ? !stockEl.textContent?.toLowerCase().includes('out of stock') : true,
                    unit: 'each'
                  });
                }
              });
              
              return items;
            });
            
            results.push(...products.map(p => ({ ...p, search_term: item })));
          } catch (searchErr) {
            results.push({ search_term: item, error: searchErr.message });
          }
        }
        
        return { success: true, results };
      };
    `,
  },

  jewson: {
    loginScript: (portalUrl, username, password, searchItems) => `
      module.exports = async ({ page }) => {
        const results = [];
        
        await page.goto('${portalUrl || "https://www.jewson.co.uk/login"}', { 
          waitUntil: 'networkidle2', timeout: 30000 
        });
        
        try {
          const cookieBtn = await page.$('#onetrust-accept-btn-handler, button[class*="cookie"]');
          if (cookieBtn) await cookieBtn.click();
          await page.waitForTimeout(1000);
        } catch (_) {}
        
        await page.waitForSelector('input[type="email"], input[name="email"], input[id*="email"]', { timeout: 10000 });
        const emailInput = await page.$('input[type="email"], input[name="email"], input[id*="email"]');
        if (emailInput) {
          await emailInput.click({ clickCount: 3 });
          await emailInput.type('${username}', { delay: 50 });
        }
        
        const passInput = await page.$('input[type="password"]');
        if (passInput) {
          await passInput.click({ clickCount: 3 });
          await passInput.type('${password}', { delay: 50 });
        }
        
        const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
        if (submitBtn) await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);
        
        const loggedIn = await page.$('[class*="account"], [class*="logout"]');
        if (!loggedIn) {
          return { success: false, error: 'Login failed', results: [] };
        }
        
        const searchItems = ${JSON.stringify(searchItems)};
        
        for (const item of searchItems) {
          try {
            const searchInput = await page.$('input[type="search"], input[name="q"], input[id*="search"]');
            if (searchInput) {
              await searchInput.click({ clickCount: 3 });
              await searchInput.type(item, { delay: 30 });
              await page.keyboard.press('Enter');
              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
              await page.waitForTimeout(2000);
            }
            
            const products = await page.evaluate(() => {
              const items = [];
              const cards = document.querySelectorAll('[class*="product"], article, li[class*="item"]');
              cards.forEach((card, idx) => {
                if (idx >= 5) return;
                const nameEl = card.querySelector('h2, h3, h4, a[class*="product"], [class*="title"]');
                const priceEl = card.querySelector('[class*="price"], span[class*="amount"]');
                const skuEl = card.querySelector('[class*="sku"], [class*="code"]');
                const name = nameEl?.textContent?.trim();
                const priceText = priceEl?.textContent?.trim();
                const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;
                if (name && price) {
                  items.push({ item_name: name, price, sku: skuEl?.textContent?.trim() || null, in_stock: true, unit: 'each' });
                }
              });
              return items;
            });
            
            results.push(...products.map(p => ({ ...p, search_term: item })));
          } catch (searchErr) {
            results.push({ search_term: item, error: searchErr.message });
          }
        }
        
        return { success: true, results };
      };
    `,
  },

  toolstation: {
    loginScript: (portalUrl, username, password, searchItems) => `
      module.exports = async ({ page }) => {
        const results = [];
        
        await page.goto('${portalUrl || "https://www.toolstation.com/login"}', { 
          waitUntil: 'networkidle2', timeout: 30000 
        });
        
        try {
          const cookieBtn = await page.$('#onetrust-accept-btn-handler, button[class*="cookie"]');
          if (cookieBtn) await cookieBtn.click();
          await page.waitForTimeout(1000);
        } catch (_) {}
        
        await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
        const emailInput = await page.$('input[type="email"], input[name="email"]');
        if (emailInput) {
          await emailInput.click({ clickCount: 3 });
          await emailInput.type('${username}', { delay: 50 });
        }
        
        const passInput = await page.$('input[type="password"]');
        if (passInput) {
          await passInput.click({ clickCount: 3 });
          await passInput.type('${password}', { delay: 50 });
        }
        
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);
        
        const loggedIn = await page.$('[class*="account"], [class*="logout"]');
        if (!loggedIn) {
          return { success: false, error: 'Login failed', results: [] };
        }
        
        const searchItems = ${JSON.stringify(searchItems)};
        
        for (const item of searchItems) {
          try {
            const searchInput = await page.$('input[type="search"], input[name="q"], input[id*="search"]');
            if (searchInput) {
              await searchInput.click({ clickCount: 3 });
              await searchInput.type(item, { delay: 30 });
              await page.keyboard.press('Enter');
              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
              await page.waitForTimeout(2000);
            }
            
            const products = await page.evaluate(() => {
              const items = [];
              const cards = document.querySelectorAll('[class*="product"], article, li[class*="item"]');
              cards.forEach((card, idx) => {
                if (idx >= 5) return;
                const nameEl = card.querySelector('h2, h3, h4, a[class*="product"], [class*="title"]');
                const priceEl = card.querySelector('[class*="price"], span[class*="amount"]');
                const skuEl = card.querySelector('[class*="sku"], [class*="code"]');
                const name = nameEl?.textContent?.trim();
                const priceText = priceEl?.textContent?.trim();
                const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;
                if (name && price) {
                  items.push({ item_name: name, price, sku: skuEl?.textContent?.trim() || null, in_stock: true, unit: 'each' });
                }
              });
              return items;
            });
            
            results.push(...products.map(p => ({ ...p, search_term: item })));
          } catch (searchErr) {
            results.push({ search_term: item, error: searchErr.message });
          }
        }
        
        return { success: true, results };
      };
    `,
  },

  screwfix: {
    loginScript: (portalUrl, username, password, searchItems) => `
      module.exports = async ({ page }) => {
        const results = [];
        
        await page.goto('${portalUrl || "https://www.screwfix.com/login"}', { 
          waitUntil: 'networkidle2', timeout: 30000 
        });
        
        try {
          const cookieBtn = await page.$('#onetrust-accept-btn-handler, button[class*="cookie"]');
          if (cookieBtn) await cookieBtn.click();
          await page.waitForTimeout(1000);
        } catch (_) {}
        
        await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
        const emailInput = await page.$('input[type="email"], input[name="email"]');
        if (emailInput) {
          await emailInput.click({ clickCount: 3 });
          await emailInput.type('${username}', { delay: 50 });
        }
        
        const passInput = await page.$('input[type="password"]');
        if (passInput) {
          await passInput.click({ clickCount: 3 });
          await passInput.type('${password}', { delay: 50 });
        }
        
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(2000);
        
        const loggedIn = await page.$('[class*="account"], [class*="logout"]');
        if (!loggedIn) {
          return { success: false, error: 'Login failed', results: [] };
        }
        
        const searchItems = ${JSON.stringify(searchItems)};
        
        for (const item of searchItems) {
          try {
            const searchInput = await page.$('input[type="search"], input[name="q"], input[id*="search"]');
            if (searchInput) {
              await searchInput.click({ clickCount: 3 });
              await searchInput.type(item, { delay: 30 });
              await page.keyboard.press('Enter');
              await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
              await page.waitForTimeout(2000);
            }
            
            const products = await page.evaluate(() => {
              const items = [];
              const cards = document.querySelectorAll('[class*="product"], article, li[class*="item"]');
              cards.forEach((card, idx) => {
                if (idx >= 5) return;
                const nameEl = card.querySelector('h2, h3, h4, a[class*="product"], [class*="title"]');
                const priceEl = card.querySelector('[class*="price"], span[class*="amount"]');
                const skuEl = card.querySelector('[class*="sku"], [class*="code"]');
                const name = nameEl?.textContent?.trim();
                const priceText = priceEl?.textContent?.trim();
                const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;
                if (name && price) {
                  items.push({ item_name: name, price, sku: skuEl?.textContent?.trim() || null, in_stock: true, unit: 'each' });
                }
              });
              return items;
            });
            
            results.push(...products.map(p => ({ ...p, search_term: item })));
          } catch (searchErr) {
            results.push({ search_term: item, error: searchErr.message });
          }
        }
        
        return { success: true, results };
      };
    `,
  },
};

// ── Main handler ──

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
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Not authenticated");

    const { trade_account_id, search_items } = await req.json();

    if (!trade_account_id || !Array.isArray(search_items) || search_items.length === 0) {
      throw new Error("trade_account_id and non-empty search_items array required");
    }

    if (search_items.length > 20) {
      throw new Error("Maximum 20 search items per request");
    }

    // Validate search items (sanitise)
    const sanitisedItems = search_items
      .map((item: unknown) => String(item).trim().slice(0, 200))
      .filter((item: string) => item.length > 0);

    // Fetch trade account with merchant info
    const { data: account, error: accErr } = await supabase
      .from("trade_accounts")
      .select(`
        id, account_number, portal_url, portal_username, encrypted_credentials,
        merchant_id, discount_percentage,
        trade_company_id
      `)
      .eq("id", trade_account_id)
      .single();

    if (accErr || !account) throw new Error("Trade account not found");

    // Verify ownership
    const { data: company } = await supabase
      .from("trade_companies")
      .select("owner_profile_id")
      .eq("id", account.trade_company_id)
      .single();

    if (company?.owner_profile_id !== user.id) {
      throw new Error("Not authorised to use this trade account");
    }

    if (!account.encrypted_credentials || !account.portal_username) {
      throw new Error("No portal credentials stored for this trade account. Please save your login details first.");
    }

    // Get merchant slug
    const { data: merchant } = await supabase
      .from("merchants")
      .select("slug, name")
      .eq("id", account.merchant_id)
      .single();

    if (!merchant) throw new Error("Merchant not found");

    // Decrypt password
    const password = await decrypt(account.encrypted_credentials);

    // Get the merchant-specific script
    const scriptGen = merchantScripts[merchant.slug];
    if (!scriptGen) {
      throw new Error(`No scraping script available for ${merchant.name}. Supported: ${Object.keys(merchantScripts).join(", ")}`);
    }

    const script = scriptGen.loginScript(
      account.portal_url ?? "",
      account.portal_username,
      password,
      sanitisedItems,
    );

    // Call Browserless /function endpoint
    const browserlessKey = Deno.env.get("BROWSERLESS_API_KEY");
    if (!browserlessKey) {
      throw new Error("Browserless API key not configured");
    }

    console.log(`[${merchant.name}] Starting headless scrape for ${sanitisedItems.length} items`);

    const browserlessRes = await fetch(
      `https://chrome.browserless.io/function?token=${browserlessKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: script,
          context: {},
        }),
      },
    );

    if (!browserlessRes.ok) {
      const errBody = await browserlessRes.text();
      console.error(`[${merchant.name}] Browserless error:`, errBody);
      throw new Error(`Browser scraping failed (${browserlessRes.status}): ${errBody.slice(0, 200)}`);
    }

    const scrapeResult = await browserlessRes.json();

    console.log(`[${merchant.name}] Scrape complete: ${scrapeResult?.results?.length ?? 0} products found`);

    // Optionally cache results into merchant_catalog_items
    if (scrapeResult?.results?.length > 0) {
      const now = new Date().toISOString();
      const catalogItems = scrapeResult.results
        .filter((r: { item_name?: string; price?: number; error?: string }) => r.item_name && r.price && !r.error)
        .map((r: { item_name: string; price: number; sku?: string; in_stock?: boolean; unit?: string; search_term?: string }) => ({
          merchant_id: account.merchant_id,
          item_name: r.item_name,
          price: r.price,
          external_sku: r.sku ?? null,
          stock_status: r.in_stock === false ? "out_of_stock" : "in_stock",
          unit: r.unit ?? "each",
          category: null,
          source_type: "portal_scrape",
          synced_at: now,
          raw_payload: {
            trade_account_id: account.id,
            search_term: r.search_term,
            scraped_at: now,
          },
        }));

      if (catalogItems.length > 0) {
        const { error: upsertErr } = await supabase
          .from("merchant_catalog_items")
          .upsert(catalogItems, {
            onConflict: "merchant_id,external_sku",
            ignoreDuplicates: false,
          });
        if (upsertErr) {
          console.error(`[${merchant.name}] Catalog cache error:`, upsertErr.message);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: scrapeResult?.success ?? true,
        merchant: merchant.name,
        results: scrapeResult?.results ?? [],
        error: scrapeResult?.error ?? null,
        cached: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Scrape merchant portal error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
