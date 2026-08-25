import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const trades = new Set([
  "builder", "plumber", "electrician", "gas_engineer", "tiler", "carpenter",
  "bricklayer", "mason", "roofer", "plasterer", "painter", "landscaper",
  "removals", "rubbish_collection", "cleaner", "other",
]);

type ImportRow = {
  source_name?: string;
  source_record_id?: string;
  source_url?: string;
  source_checked_at?: string;
  business_name?: string;
  trade?: string;
  country_code?: string;
  city?: string;
  region?: string;
  postcode_district?: string;
  service_radius_miles?: number | string;
  services?: string[] | string;
  languages?: string[] | string;
  factual_summary?: string;
  registration_authority?: string;
  registration_reference?: string;
  business_email?: string;
  business_phone?: string;
  website_url?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("Administrator sign-in required");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) throw new Error("Administrator sign-in required");
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Administrator access required");

    const body = await req.json();
    const rows = Array.isArray(body?.rows) ? body.rows as ImportRow[] : [];
    if (!rows.length || rows.length > 500) throw new Error("Supply between 1 and 500 directory rows");

    const validated = rows.map((row, index) => validate(row, index));
    const publicRows = validated.map(({ contact: _contact, ...profile }) => profile);
    const { data: imported, error } = await admin
      .from("trader_directory_profiles")
      .upsert(publicRows, { onConflict: "source_name,source_record_id" })
      .select("id,source_name,source_record_id");
    if (error) throw error;

    const idBySource = new Map((imported ?? []).map((row) => [
      `${row.source_name}:${row.source_record_id}`,
      row.id,
    ]));
    const contacts = validated.flatMap((row) => {
      const directoryId = idBySource.get(`${row.source_name}:${row.source_record_id}`);
      if (!directoryId || !Object.values(row.contact).some(Boolean)) return [];
      return [{ directory_profile_id: directoryId, ...row.contact, updated_at: new Date().toISOString() }];
    });
    if (contacts.length) {
      const { error: contactError } = await admin
        .from("trader_directory_contacts")
        .upsert(contacts, { onConflict: "directory_profile_id" });
      if (contactError) throw contactError;
    }

    await admin.from("audit_logs").insert({
      user_id: user.id,
      action: "trader_directory.import",
      entity_type: "trader_directory_profiles",
      entity_id: null,
      metadata: { row_count: imported?.length ?? 0, sources: [...new Set(validated.map((row) => row.source_name))] },
    });

    return json({ success: true, imported: imported?.length ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Directory import failed";
    console.error("trader-directory-import:", message);
    return json({ error: message }, 400);
  }
});

function validate(row: ImportRow, index: number) {
  const label = `Row ${index + 1}`;
  const sourceName = clean(row.source_name, 80);
  const sourceRecordId = clean(row.source_record_id, 180);
  const businessName = clean(row.business_name, 180);
  const city = clean(row.city, 100);
  const postcodeDistrict = clean(row.postcode_district, 16).toUpperCase();
  const trade = clean(row.trade, 40).toLowerCase();
  const countryCode = clean(row.country_code || "GB", 2).toUpperCase();
  if (!sourceName || !sourceRecordId || !businessName || !city || !postcodeDistrict) {
    throw new Error(`${label}: source, record ID, business name, city and postcode district are required`);
  }
  if (!trades.has(trade)) throw new Error(`${label}: unsupported trade '${trade}'`);
  if (!new Set(["GB", "DE"]).has(countryCode)) throw new Error(`${label}: country must be GB or DE`);
  if (countryCode === "GB" && !/^[A-Z]{1,2}\d[A-Z\d]?$/.test(postcodeDistrict)) {
    throw new Error(`${label}: use a UK outward postcode such as NW6`);
  }
  if (countryCode === "DE" && !/^\d{5}$/.test(postcodeDistrict)) {
    throw new Error(`${label}: use a five-digit German postcode`);
  }
  const sourceUrl = validUrl(row.source_url, `${label}: source_url`);
  const serviceRadius = Number(row.service_radius_miles || 25);
  if (!Number.isFinite(serviceRadius) || serviceRadius < 1 || serviceRadius > 250) {
    throw new Error(`${label}: service radius must be between 1 and 250 miles`);
  }

  return {
    source_name: sourceName,
    source_record_id: sourceRecordId,
    source_url: sourceUrl,
    source_checked_at: validDate(row.source_checked_at, label),
    business_name: businessName,
    trade,
    country_code: countryCode,
    city,
    region: clean(row.region, 100) || null,
    postcode_district: postcodeDistrict,
    service_radius_miles: Math.round(serviceRadius),
    services: list(row.services, 20, 100),
    languages: list(row.languages, 12, 50),
    factual_summary: clean(row.factual_summary, 1000) || null,
    registration_authority: clean(row.registration_authority, 120) || null,
    registration_reference: clean(row.registration_reference, 120) || null,
    updated_at: new Date().toISOString(),
    contact: {
      business_email: validEmail(row.business_email, label),
      business_phone: clean(row.business_phone, 40) || null,
      website_url: row.website_url ? validUrl(row.website_url, `${label}: website_url`) : null,
    },
  };
}

function clean(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function list(value: string[] | string | undefined, maxItems: number, maxLength: number) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/[|;,]/);
  return [...new Set(values.map((item) => clean(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function validUrl(value: unknown, label: string) {
  try {
    const url = new URL(clean(value, 1000));
    if (!new Set(["https:", "http:"]).has(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new Error(`${label} must be a valid HTTP(S) URL`);
  }
}

function validEmail(value: unknown, label: string) {
  const email = clean(value, 254).toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`${label}: business_email is invalid`);
  return email;
}

function validDate(value: unknown, label: string) {
  const parsed = value ? new Date(String(value)) : new Date();
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label}: source_checked_at is invalid`);
  if (parsed.getTime() > Date.now() + 86_400_000) throw new Error(`${label}: source_checked_at cannot be in the future`);
  return parsed.toISOString();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}
