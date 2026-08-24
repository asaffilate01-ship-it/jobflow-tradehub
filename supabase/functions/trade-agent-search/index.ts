/* eslint-disable @typescript-eslint/no-explicit-any -- Edge Function data is validated and returned through a narrow public contract */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const TRADES = ["builder", "plumber", "electrician", "gas_engineer", "tiler", "carpenter", "bricklayer", "mason", "roofer", "plasterer", "painter", "landscaper", "removals", "rubbish_collection", "cleaner", "other"] as const;
type Trade = typeof TRADES[number];
type Filters = { trade: Trade; postcode: string | null; postcode_sector: string | null; gas_safe: boolean; available_only: boolean; emergency: boolean; minimum_rating: number | null };

const SYNONYMS: Array<[Trade, RegExp]> = [
  ["gas_engineer", /\b(gas engineer|boiler engineer|heating engineer|boiler repair)\b/i],
  ["plumber", /\b(plumber|plumbing|leak|blocked (?:drain|toilet|sink)|tap repair)\b/i],
  ["electrician", /\b(electrician|electrical|socket|consumer unit|rewir(?:e|ing))\b/i],
  ["roofer", /\b(roofer|roofing|roof leak|gutter)\b/i],
  ["builder", /\b(builder|building contractor|extension|structural repair)\b/i],
  ["carpenter", /\b(carpenter|joiner|joinery|door fitter)\b/i],
  ["bricklayer", /\b(bricklayer|brickwork|pointing)\b/i],
  ["plasterer", /\b(plasterer|plastering|rendering)\b/i],
  ["painter", /\b(painter|decorator|painting|decorating)\b/i],
  ["tiler", /\b(tiler|tiling)\b/i],
  ["landscaper", /\b(landscaper|landscaping|gardener|garden work)\b/i],
  ["removals", /\b(removal|moving house|house move)\b/i],
  ["rubbish_collection", /\b(rubbish|waste collection|clearance)\b/i],
  ["cleaner", /\b(cleaner|cleaning|deep clean)\b/i],
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Please sign in to use AI trade search");
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) throw new Error("Please sign in to use AI trade search");

    const body = await req.json();
    const query = String(body?.query ?? "").trim();
    if (query.length < 5 || query.length > 500) throw new Error("Describe the trade, location and any requirements in 5 to 500 characters");

    const { data: quotaRows, error: quotaError } = await admin.rpc("consume_ai_agent_quota", { p_user_id: user.id, p_agent: "trade_search" });
    if (quotaError) throw quotaError;
    const quota = quotaRows?.[0];
    if (!quota?.allowed) return json({ error: "Daily AI search allowance reached", code: "fair_usage_limit", quota }, 429);

    const deterministic = parseQuery(query);
    const aiFilters = await parseWithPrivateAI(query).catch(() => null);
    const filters = normaliseFilters({ ...deterministic, ...(aiFilters ?? {}) }, deterministic);
    const matches = await findMatches(admin, filters);
    const fingerprint = await sha256(query.toLowerCase());
    await admin.from("ai_trade_search_events").insert({
      user_id: user.id,
      query_fingerprint: fingerprint,
      parsed_filters: filters,
      result_count: matches.length,
    });

    return json({
      success: true,
      interpretation: describeFilters(filters),
      filters,
      matches,
      quota: { used: quota.used, daily_limit: quota.daily_limit, remaining: quota.remaining },
      ai_mode: aiFilters ? "hybrid" : "rules_fallback",
      notices: [
        "Available means the provider has marked themselves as accepting work; confirm the actual appointment time.",
        "For gas work, check the engineer's Gas Safe ID and permitted work categories before work starts.",
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trade search failed";
    console.error("trade-agent-search:", message);
    return json({ error: message }, 400);
  }
});

function parseQuery(query: string): Filters {
  const trade = SYNONYMS.find(([, expression]) => expression.test(query))?.[0] ?? "other";
  const postcodeMatch = query.toUpperCase().match(/\b(?:GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/);
  const postcode = postcodeMatch ? normalisePostcode(postcodeMatch[0]) : null;
  const rating = query.match(/(?:at least|min(?:imum)?|over)?\s*(\d(?:\.\d)?)\s*(?:star|rated)/i);
  return {
    trade,
    postcode,
    postcode_sector: postcode ? postcodeSector(postcode) : null,
    gas_safe: /\bgas\s*safe\b|\bgas-safe\b/i.test(query) || trade === "gas_engineer",
    available_only: !/\b(include unavailable|any availability)\b/i.test(query),
    emergency: /\b(urgent|emergency|asap|right now|today)\b/i.test(query),
    minimum_rating: rating ? Math.min(Math.max(Number(rating[1]), 0), 5) : null,
  };
}

async function parseWithPrivateAI(query: string): Promise<Partial<Filters> | null> {
  const url = Deno.env.get("TRADE_SEARCH_AI_URL");
  const secret = Deno.env.get("TRADE_SEARCH_AI_SECRET");
  if (!url || !secret) return null;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({
      task: "parse_trade_search",
      query,
      allowed_trades: TRADES,
      output_schema: { trade: "allowed trade", postcode: "UK postcode or null", gas_safe: "boolean", available_only: "boolean", emergency: "boolean", minimum_rating: "0-5 or null" },
      instruction: "Return JSON only. Do not invent a postcode or credential requirement.",
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.filters ?? data;
}

function normaliseFilters(value: Partial<Filters>, fallback: Filters): Filters {
  const trade = TRADES.includes(value.trade as Trade) ? value.trade as Trade : fallback.trade;
  const postcode = typeof value.postcode === "string" && /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(value.postcode.trim())
    ? normalisePostcode(value.postcode) : fallback.postcode;
  return {
    trade,
    postcode,
    postcode_sector: postcode ? postcodeSector(postcode) : null,
    gas_safe: value.gas_safe === true || trade === "gas_engineer" || fallback.gas_safe,
    available_only: value.available_only !== false,
    emergency: value.emergency === true || fallback.emergency,
    minimum_rating: typeof value.minimum_rating === "number" ? Math.min(Math.max(value.minimum_rating, 0), 5) : fallback.minimum_rating,
  };
}

async function findMatches(admin: any, filters: Filters) {
  let request = admin.from("trade_repair_profiles").select("id,trade_company_id,trade,service_postcode_prefixes,capability_verified,insurance_verified,insurance_expires_at,credential_type,credential_verified,credential_expires_at,available,emergency_work")
    .eq("trade", filters.trade).eq("capability_verified", true).eq("insurance_verified", true);
  if (filters.available_only) request = request.eq("available", true);
  if (filters.emergency) request = request.eq("emergency_work", true);
  const { data: repairProfiles, error } = await request.limit(250);
  if (error) throw error;
  const today = new Date().toISOString().slice(0, 10);
  const eligible = (repairProfiles ?? []).filter((profile: any) => {
    if (profile.insurance_expires_at && profile.insurance_expires_at < today) return false;
    if (!coversPostcode(profile.service_postcode_prefixes ?? [], filters.postcode)) return false;
    if (filters.gas_safe || filters.trade === "gas_engineer") {
      if (!profile.credential_verified || (profile.credential_expires_at && profile.credential_expires_at < today)) return false;
      if (!/gas\s*safe/i.test(profile.credential_type ?? "")) return false;
    }
    if (filters.trade === "electrician" && (!profile.credential_verified || (profile.credential_expires_at && profile.credential_expires_at < today))) return false;
    return true;
  });
  if (!eligible.length) return [];

  const companyIds = eligible.map((profile: any) => profile.trade_company_id);
  const { data: companies } = await admin.from("trade_companies").select("id,owner_profile_id,legal_name,trading_name,city,postcode").in("id", companyIds);
  const ownerIds = (companies ?? []).map((company: any) => company.owner_profile_id);
  const { data: profiles } = await admin.from("profiles").select("id,full_name,company_name,trade_specialism,rating,is_active,services_description,service_radius_miles,years_experience,trade_bodies,verified,cover_image_url").in("id", ownerIds).eq("is_active", true);
  const companyMap = new Map((companies ?? []).map((company: any) => [company.id, company]));
  const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));

  return eligible.map((repair: any) => {
    const company: any = companyMap.get(repair.trade_company_id);
    const profile: any = company ? profileMap.get(company.owner_profile_id) : null;
    if (!company || !profile) return null;
    if (filters.minimum_rating !== null && Number(profile.rating ?? 0) < filters.minimum_rating) return null;
    const prefixes = repair.service_postcode_prefixes ?? [];
    const specificity = filters.postcode ? Math.max(0, ...prefixes.map((prefix: string) => normaliseArea(prefix).length)) : 0;
    const score = Number(profile.rating ?? 0) * 10 + specificity * 2 + (repair.emergency_work ? 2 : 0);
    return {
      profile_id: profile.id,
      company_name: company.trading_name || company.legal_name || profile.company_name,
      full_name: profile.full_name,
      trade: repair.trade,
      rating: Number(profile.rating ?? 0),
      services_description: profile.services_description,
      years_experience: profile.years_experience,
      trade_bodies: profile.trade_bodies ?? [],
      cover_image_url: profile.cover_image_url,
      accepting_work: repair.available,
      emergency_work: repair.emergency_work,
      capability_verified: repair.capability_verified,
      insurance_verified: repair.insurance_verified,
      credential: repair.credential_verified ? repair.credential_type : null,
      coverage: filters.postcode_sector ?? "Service area matched",
      score,
    };
  }).filter(Boolean).sort((a: any, b: any) => b.score - a.score).slice(0, 12).map(({ score: _score, ...match }: any) => match);
}

function coversPostcode(prefixes: string[], postcode: string | null) {
  if (!postcode) return true;
  if (!prefixes.length) return false;
  const target = normaliseArea(postcode);
  return prefixes.some((prefix) => target.startsWith(normaliseArea(prefix)));
}

function describeFilters(filters: Filters) {
  const requirements = [filters.available_only ? "accepting work" : null, filters.gas_safe ? "verified Gas Safe credential" : null, filters.emergency ? "emergency call-outs" : null, filters.minimum_rating ? `${filters.minimum_rating}+ rating` : null].filter(Boolean);
  return `${filters.trade.replace("_", " ")}${filters.postcode ? ` near ${filters.postcode}` : ""}${requirements.length ? `, requiring ${requirements.join(", ")}` : ""}`;
}

function normalisePostcode(value: string) {
  const compact = value.toUpperCase().replace(/\s+/g, "");
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}
function postcodeSector(postcode: string) { const [outward, inward] = postcode.split(" "); return `${outward} ${inward.slice(0, 1)}`; }
function normaliseArea(value: string) { return value.toUpperCase().replace(/\s+/g, ""); }
async function sha256(value: string) { const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers }); }
