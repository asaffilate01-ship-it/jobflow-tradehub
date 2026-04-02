import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const TRADERS = [
  { name: "Mike Thompson", email: "mike@lutonbuilders.co.uk", company: "Thompson Building Services", trade: "builder", postcode: "LU1 1AA", address: "10 George Street" },
  { name: "Dave Wilson", email: "dave@wilsonplumbing.co.uk", company: "Wilson Plumbing & Heating", trade: "plumber", postcode: "LU1 2AB", address: "24 Park Street" },
  { name: "Sarah Connelly", email: "sarah@sparkelectrical.co.uk", company: "Spark Electrical Ltd", trade: "electrician", postcode: "LU1 3CD", address: "8 Chapel Street" },
  { name: "James Patel", email: "james@lutongas.co.uk", company: "Luton Gas Safe Services", trade: "gas_engineer", postcode: "LU1 1EF", address: "15 Church Street" },
  { name: "Tom Richards", email: "tom@precisiontiling.co.uk", company: "Precision Tiling LU", trade: "tiler", postcode: "LU1 2GH", address: "31 Wellington Street" },
  { name: "Chris Baker", email: "chris@bakerjoinery.co.uk", company: "Baker Joinery & Carpentry", trade: "carpenter", postcode: "LU1 3JK", address: "6 Cheapside" },
  { name: "Andy Morris", email: "andy@morrisbricks.co.uk", company: "Morris Brickwork", trade: "bricklayer", postcode: "LU1 4LM", address: "42 Manchester Street" },
  { name: "Daniel Stone", email: "daniel@stonemasonry.co.uk", company: "Stone & Sons Masonry", trade: "mason", postcode: "LU1 1NP", address: "19 Stuart Street" },
  { name: "Kevin Clarke", email: "kevin@lutonroofing.co.uk", company: "Clarke Roofing Solutions", trade: "roofer", postcode: "LU1 2QR", address: "28 Cardigan Street" },
  { name: "Paul Evans", email: "paul@smoothplastering.co.uk", company: "Smooth Finish Plastering", trade: "plasterer", postcode: "LU1 3ST", address: "11 Crawley Road" },
  { name: "Lisa Green", email: "lisa@greenpaint.co.uk", company: "Green Decorating Services", trade: "painter", postcode: "LU1 4UV", address: "37 Castle Street" },
  { name: "Mark Taylor", email: "mark@lutonlandscapes.co.uk", company: "Taylor Landscapes", trade: "landscaper", postcode: "LU1 1WX", address: "5 New Bedford Road" },
  { name: "Steve Hart", email: "steve@hartbuilders.co.uk", company: "Hart Construction Group", trade: "builder", postcode: "LU1 2YZ", address: "22 Albert Road" },
  { name: "Rachel Adams", email: "rachel@adamselectric.co.uk", company: "Adams Electrical Contractors", trade: "electrician", postcode: "LU1 3AB", address: "14 Midland Road" },
  { name: "Ben Cooper", email: "ben@cooperplumbing.co.uk", company: "Cooper Plumbing Services", trade: "plumber", postcode: "LU1 4CD", address: "33 Dunstable Road" },
  { name: "Nick Ward", email: "nick@lutonremovals.co.uk", company: "Ward Removals & Storage", trade: "removals", postcode: "LU1 1EE", address: "48 Guildford Street" },
  { name: "Emma Hughes", email: "emma@cleanteam.co.uk", company: "Clean Team Luton", trade: "cleaner", postcode: "LU1 2FF", address: "7 Alma Street" },
  { name: "Rob Fisher", email: "rob@fisherroofing.co.uk", company: "Fisher Roofing Co", trade: "roofer", postcode: "LU1 3GG", address: "21 High Town Road" },
  { name: "Simon Brooks", email: "simon@brooksrubbish.co.uk", company: "Brooks Waste Solutions", trade: "rubbish_collection", postcode: "LU1 4HH", address: "16 Hitchin Road" },
  { name: "Karen White", email: "karen@whitepainting.co.uk", company: "White & Co Decorators", trade: "painter", postcode: "LU1 1JJ", address: "39 Old Bedford Road" },
];

const RADIUS = [10, 15, 20, 25, 30];
const YEARS = [3, 5, 8, 10, 12, 15, 20];
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const phone = () => "0158" + String(Math.floor(Math.random() * 9000000 + 1000000));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results = [];

  for (const t of TRADERS) {
    // Create auth user
    const { data, error } = await admin.auth.admin.createUser({
      email: t.email,
      password: "Trader2026!",
      email_confirm: true,
      user_metadata: { full_name: t.name },
    });

    if (error) {
      results.push({ email: t.email, status: "error", error: error.message });
      continue;
    }

    const uid = data.user.id;

    // Update profile with trade details
    await admin.from("profiles").update({
      company_name: t.company,
      trade_specialism: t.trade,
      kyc_status: "approved",
      is_active: true,
      verified: true,
      service_radius_miles: pick(RADIUS),
      years_experience: pick(YEARS),
      phone: phone(),
    }).eq("id", uid);

    // Assign trade role
    await admin.from("user_roles").upsert({ user_id: uid, role: "trade" }, { onConflict: "user_id,role" });

    // Create trade company
    await admin.from("trade_companies").insert({
      owner_profile_id: uid,
      legal_name: t.company,
      trading_name: t.company,
      address_line1: t.address,
      city: "Luton",
      postcode: t.postcode,
    });

    results.push({ email: t.email, status: "created", trade: t.trade });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
