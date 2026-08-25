/* eslint-disable @typescript-eslint/no-explicit-any -- Edge Function data is validated at its trust boundaries */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SafetyResult = {
  emergencyStop: boolean;
  riskLevel: "normal" | "high" | "emergency";
  hazards: string[];
  safetyActions: string[];
  prohibitedActions: string[];
  emergencyContacts: Array<{ label: string; number: string; when: string }>;
};

const TRADE_CAUSES: Record<string, string[]> = {
  plumber: ["A leaking joint, seal, valve or supply/waste connection", "A blockage or failed plumbing component"],
  gas_engineer: ["Loss of system pressure or a failed heating component", "A controls, circulation or ignition fault"],
  electrician: ["A failed accessory, loose connection or circuit fault", "A protective device may have operated because of a downstream fault"],
  roofer: ["Defective flashing, roof covering or rainwater detail"],
  carpenter: ["Wear, misalignment or failure of a timber component"],
  other: ["Wear, accidental damage or failure of a building component"],
};

const TRADE_REMEDIES: Record<string, string[]> = {
  plumber: ["Safely isolate the affected supply if needed, repair or replace the failed fitting/component, then pressure- and leak-test the system", "Clear and test waste pipework if a blockage is confirmed"],
  gas_engineer: ["A Gas Safe registered engineer should test the appliance/system, replace or repair the confirmed failed component, then complete required safety and combustion checks"],
  electrician: ["A competent electrician should safely isolate, test the circuit, repair the confirmed fault and complete the required electrical safety tests before re-energising"],
  roofer: ["A roofer may replace the failed covering or flashing, repair the weatherproof detail and check the surrounding roof and rainwater path"],
  carpenter: ["Realign, secure or replace the failed timber, door or hardware component and check safe operation"],
  builder: ["A competent contractor or structural professional should inspect the cause before specifying and completing a suitable repair"],
  other: ["A suitable trade should inspect the component on site, make it safe, repair or replace the confirmed failed part and test the result"],
};

const COST_BANDS: Record<string, [number, number, number]> = {
  plumber: [90, 150, 320], gas_engineer: [110, 190, 450], electrician: [100, 175, 400],
  roofer: [150, 350, 900], carpenter: [90, 180, 450], builder: [120, 280, 750], other: [75, 140, 350],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const { data: { user } } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) throw new Error("Not authenticated");
    const { job_id, mode = "compare" } = await req.json();
    if (!job_id || !["compare", "rapid"].includes(mode)) throw new Error("Valid job_id and mode are required");

    const { data: job, error: jobError } = await admin.from("jobs").select("*").eq("id", job_id).eq("customer_profile_id", user.id).eq("job_kind", "repair").single();
    if (jobError || !job) throw new Error("Repair job not found or not owned by caller");
    const { data: media } = await admin.from("repair_intake_media").select("id,storage_path,media_type,redaction_status").eq("job_id", job_id);

    const vision = await analyseMedia(admin, media ?? [], { category: job.title, description: job.description ?? "" });
    const safetyText = `${job.title} ${job.description ?? ""} ${vision.summary} ${(vision.hazard_terms ?? []).join(" ")}`.toLowerCase();
    const safety = evaluateSafety(safetyText);
    const suggestedTrade = guessTrade(safetyText);
    const cost = estimateCost(suggestedTrade, safety.riskLevel, job.postcode, (media ?? []).length);
    const diagnosis = {
      job_id,
      status: safety.emergencyStop ? "safety_stop" : "completed",
      emergency_stop: safety.emergencyStop,
      risk_level: safety.riskLevel,
      hazards: safety.hazards,
      probable_causes: TRADE_CAUSES[suggestedTrade] ?? TRADE_CAUSES.other,
      likely_remedies: TRADE_REMEDIES[suggestedTrade] ?? TRADE_REMEDIES.other,
      confidence: vision.status === "completed" ? 0.72 : (media?.length ?? 0) >= 2 ? 0.62 : 0.42,
      suggested_trade: suggestedTrade,
      safety_actions: safety.safetyActions,
      prohibited_actions: safety.prohibitedActions,
      emergency_contacts: safety.emergencyContacts,
      follow_up_questions: followUpQuestions(suggestedTrade, media?.length ?? 0),
      estimated_cost: cost,
      model_metadata: { engine: "craftvaro_hybrid_v1", vision_status: vision.status, human_verification_required: true, diagnosis_is_not_definitive: true },
    };
    const { error: diagnosisError } = await admin.from("repair_diagnoses").upsert(diagnosis, { onConflict: "job_id" });
    if (diagnosisError) throw diagnosisError;

    const sector = postcodeSector(job.postcode);
    await admin.from("jobs").update({
      requested_trade: suggestedTrade,
      repair_priority: safety.riskLevel,
      postcode_sector: sector,
      budget_min: cost.minimum,
      budget_max: cost.maximum,
      status: safety.emergencyStop ? "paused" : "posted",
    }).eq("id", job_id);
    await admin.from("dokuvera_case_links").upsert({ job_id, status: "pending" }, { onConflict: "job_id" });
    await queueEvent(admin, "repair.reported", job_id, { job_id, media_count: media?.length ?? 0 });
    await queueEvent(admin, "repair.diagnosed", job_id, { job_id, risk_level: safety.riskLevel, suggested_trade: suggestedTrade, emergency_stop: safety.emergencyStop, estimated_cost: cost });
    if (["gabley", "immoviq"].includes(job.source_product)) {
      await queueEvent(admin, "repair.status.changed", job_id, {
        job_id, source_reference: job.source_reference, property_reference: job.property_reference,
        tenancy_reference: job.tenancy_reference, status: safety.emergencyStop ? "paused" : "posted",
        risk_level: safety.riskLevel, suggested_trade: suggestedTrade,
      }, job.source_product);
    }
    for (const item of media ?? []) await queueEvent(admin, "evidence.created", item.id, { job_id, source_type: "repair_intake_media", source_id: item.id, storage_path: item.storage_path, media_type: item.media_type });

    let invites: Array<{ invite_id: string; trade_company_id: string }> = [];
    if (!safety.emergencyStop) {
      const { data: round, error: roundError } = await admin.from("repair_dispatch_rounds").insert({
        job_id, mode, max_providers: 4, expires_at: new Date(Date.now() + (mode === "rapid" ? 15 : 60) * 60_000).toISOString(),
      }).select("id").single();
      if (roundError) throw roundError;
      const { data: providers, error: matchError } = await admin.rpc("match_repair_providers", {
        p_trade: suggestedTrade, p_postcode_sector: sector, p_rapid: mode === "rapid", p_limit: 4,
      });
      if (matchError) throw matchError;
      const rows = (providers ?? []).slice(0, 4).map((provider: any) => ({
        dispatch_round_id: round.id,
        job_id,
        trade_company_id: provider.trade_company_id,
        ranking_score: provider.ranking_score,
        scoped_payload: {
          title: job.title, description: job.description, trade: suggestedTrade,
          postcode_sector: sector, city: job.city, risk_level: safety.riskLevel,
          estimated_cost: cost, media_count: media?.length ?? 0, exact_address_released: false,
        },
      }));
      if (rows.length) {
        const { data: inserted, error: inviteError } = await admin.from("repair_dispatch_invites").insert(rows).select("id,trade_company_id");
        if (inviteError) throw inviteError;
        invites = (inserted ?? []).map((item: any) => ({ invite_id: item.id, trade_company_id: item.trade_company_id }));
        const { data: companies } = await admin.from("trade_companies").select("id,owner_profile_id").in("id", rows.map((row: any) => row.trade_company_id));
        if (companies?.length) await admin.from("notifications").insert(companies.map((company: any) => ({
          recipient_id: company.owner_profile_id, title: mode === "rapid" ? "Urgent repair opportunity" : "New repair opportunity",
          body: `${job.title} — ${sector}`, link: "/repair-opportunities", type: "repair_invite",
        })));
      } else {
        await admin.from("repair_dispatch_rounds").update({ status: "unmatched" }).eq("id", round.id);
      }
      await queueEvent(admin, "dispatch.created", round.id, { job_id, invite_count: invites.length, postcode_sector: sector, trade: suggestedTrade });
    }

    return json({ success: true, job_id, diagnosis, dispatch: { mode, invite_count: invites.length }, vision_status: vision.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repair diagnosis failed";
    console.error("repair-diagnose:", message);
    return json({ error: message }, 400);
  }
});

async function analyseMedia(admin: any, media: any[], context: any) {
  const gateway = Deno.env.get("REPAIR_VISION_GATEWAY_URL");
  const secret = Deno.env.get("REPAIR_VISION_GATEWAY_SECRET");
  if (!media.length) return { status: "not_supplied", summary: "", hazard_terms: [] };
  if (!gateway || !secret) return { status: "not_configured", summary: "", hazard_terms: [] };
  try {
    const signed = await Promise.all(media.map(async (item) => {
      const { data } = await admin.storage.from("repair-intake").createSignedUrl(item.storage_path, 120);
      return { media_type: item.media_type, url: data?.signedUrl };
    }));
    const response = await fetch(gateway, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` }, body: JSON.stringify({ media: signed, context }) });
    if (!response.ok) throw new Error(`Vision gateway returned ${response.status}`);
    const data = await response.json();
    return { status: "completed", summary: String(data.summary ?? "").slice(0, 2000), hazard_terms: (data.hazard_terms ?? []).slice(0, 20) };
  } catch (error) {
    console.error("vision fallback:", error);
    return { status: "failed", summary: "", hazard_terms: [] };
  }
}

function evaluateSafety(text: string): SafetyResult {
  const hazards: string[] = [], safetyActions: string[] = [], prohibitedActions: string[] = [];
  const add = (name: string, terms: string[], actions: string[], prohibited: string[]) => {
    if (terms.some((term) => text.includes(term))) { hazards.push(name); safetyActions.push(...actions); prohibitedActions.push(...prohibited); }
  };
  add("gas", ["smell gas", "smell of gas", "gas leak", "hissing gas", "carbon monoxide", "co alarm"],
    ["Move everyone to fresh air and ventilate only if safe.", "Call the National Gas Emergency Service on 0800 111 999 in Great Britain."],
    ["Do not operate electrical switches, flames or anything that could create a spark.", "Do not attempt gas work or restart the appliance."]);
  add("electrical_fire", ["sparking", "burning socket", "electrical fire", "electric shock", "live wire", "smoke from socket"],
    ["Keep people away and call 999 if there is fire, smoke, injury or immediate danger."], ["Do not touch exposed wiring or use water on an electrical fire."]);
  add("water_electrics", ["water near electrics", "water through light", "flooded socket", "wet consumer unit"],
    ["Keep clear and isolate electricity only from a safe, dry location."], ["Do not enter standing water where electrical equipment may be live."]);
  add("structural", ["ceiling collapsing", "wall collapsing", "structural collapse", "building moving", "large sudden crack"],
    ["Leave the affected area and call 999 if collapse or injury is imminent."], ["Do not enter, prop or disturb the affected structure."]);
  add("asbestos", ["asbestos", "artex dust", "pipe lagging damaged", "insulation board broken"],
    ["Stop work, isolate the area and arrange an appropriate asbestos assessment."], ["Do not drill, sand, sweep, vacuum or disturb the suspected material."]);
  const emergencyStop = hazards.length > 0;
  const emergencyContacts: SafetyResult["emergencyContacts"] = [];
  if (hazards.some((hazard) => ["electrical_fire", "water_electrics", "structural"].includes(hazard))) {
    emergencyContacts.push({ label: "Emergency services", number: "999", when: "Immediate danger, fire, serious injury or collapse" });
  }
  if (hazards.includes("gas")) {
    emergencyContacts.push({ label: "National Gas Emergency Service", number: "0800 111 999", when: "Suspected natural-gas leak in Great Britain" });
  }
  return { emergencyStop, riskLevel: emergencyStop ? (hazards.includes("asbestos") && hazards.length === 1 ? "high" : "emergency") : "normal", hazards,
    safetyActions: [...new Set(safetyActions)], prohibitedActions: [...new Set(prohibitedActions)], emergencyContacts };
}

function guessTrade(text: string) {
  if (/boiler|heating|radiator|gas/.test(text)) return "gas_engineer";
  if (/electric|socket|consumer unit|wiring|light/.test(text)) return "electrician";
  if (/leak|toilet|tap|water|pipe|drain/.test(text)) return "plumber";
  if (/roof|gutter|flashing/.test(text)) return "roofer";
  if (/door|cabinet|timber|wood/.test(text)) return "carpenter";
  if (/wall|ceiling|structural|crack/.test(text)) return "builder";
  return "other";
}

function estimateCost(trade: string, priority: string, postcode: string, mediaCount: number) {
  const base = COST_BANDS[trade] ?? COST_BANDS.other;
  let multiplier = priority === "emergency" ? 1.35 : priority === "high" ? 1.15 : 1;
  if (/^(EC|WC|NW|SE|SW|E|N|W)\d/.test((postcode ?? "").toUpperCase().split(" ")[0])) multiplier *= 1.15;
  const values = base.map((value) => Math.round(value * multiplier / 5) * 5);
  return { currency: "GBP", minimum: values[0], typical: values[1], maximum: values[2], confidence: mediaCount >= 2 ? "medium" : "low", binding: false,
    notice: "Indicative range only. The provider offer is the contractual price unless an approved variation is recorded." };
}

function followUpQuestions(trade: string, mediaCount: number) {
  const questions = mediaCount < 2 ? ["Can you add one wide photo and one close-up photo taken from a safe position?"] : [];
  if (trade === "plumber") questions.push("Is the water still flowing, and can it be isolated safely?", "Is it clean water, wastewater or heating-system water?");
  else if (trade === "gas_engineer") questions.push("Is there a displayed fault code?", "Do you have heating, hot water, both or neither?");
  else if (trade === "electrician") questions.push("Has a breaker or RCD tripped?", "Is there heat, smoke, a burning smell, water or visible damage?");
  else questions.push("When did the problem start, and is it getting worse?");
  return questions;
}

function postcodeSector(postcode: string) {
  const compact = (postcode ?? "").trim().toUpperCase().replace(/\s+/g, " ");
  const [outward, inward = ""] = compact.split(" ");
  return inward ? `${outward} ${inward.slice(0, 1)}` : outward.slice(0, 4);
}

async function queueEvent(admin: any, eventType: string, aggregateId: string, payload: any, destination = "dokuvera") {
  await admin.from("repair_integration_outbox").upsert({ event_type: eventType, aggregate_type: eventType.startsWith("evidence") ? "evidence" : "repair", aggregate_id: aggregateId,
    destination, payload, idempotency_key: `${eventType}:${aggregateId}:${destination}` }, { onConflict: "idempotency_key", ignoreDuplicates: true });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
