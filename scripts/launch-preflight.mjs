import { existsSync, readFileSync } from "node:fs";

const failures = [];
const warnings = [];
const requiredFiles = [
  ".env.example",
  "public/robots.txt",
  "public/sitemap.xml",
  "docs/GO_LIVE_PHASES.md",
  "supabase/migrations/20260830130000_go_live_account_deletion.sql",
  "supabase/migrations/20260830223000_launch_pilot_signoff.sql",
  "supabase/functions/launch-readiness/index.ts",
];

for (const file of requiredFiles) if (!existsSync(file)) failures.push(`Missing ${file}`);

for (const key of ["SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD", "SUPABASE_PROJECT_ID"]) {
  if (!process.env[key]) warnings.push(`${key} is required by the production deployment workflow`);
}

const config = existsSync("supabase/config.toml") ? readFileSync("supabase/config.toml", "utf8") : "";
for (const name of ["stripe-webhook", "dokuvera-webhook", "integration-outbox-worker"]) {
  if (!config.includes(`[functions.${name}]`)) failures.push(`Missing Supabase config for ${name}`);
}

const launchReadiness = existsSync("supabase/functions/launch-readiness/index.ts")
  ? readFileSync("supabase/functions/launch-readiness/index.ts", "utf8")
  : "";
if (launchReadiness.includes("storage.buckets")) failures.push("Launch readiness must configure repair storage through the Storage API, not storage.buckets SQL");
if (!launchReadiness.includes("admin.storage.createBucket") || !launchReadiness.includes("admin.storage.updateBucket")) {
  failures.push("Launch readiness is missing repair bucket Storage API provisioning");
}
if (!launchReadiness.includes('count(admin, "launch_pilot_runs"') || !launchReadiness.includes('id: "pilot-signoff"')) {
  failures.push("Launch readiness is missing the controlled-pilot sign-off gate");
}

const outboxWorker = existsSync("supabase/functions/integration-outbox-worker/index.ts")
  ? readFileSync("supabase/functions/integration-outbox-worker/index.ts", "utf8")
  : "";
if (!outboxWorker.includes('principal !== "admin"') || !outboxWorker.includes("retry_event_id")) {
  failures.push("Integration recovery must restrict failed-event resets to administrators");
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const failure of failures) console.error(`FAIL: ${failure}`);
if (failures.length) process.exit(1);
console.log(`Launch preflight passed with ${warnings.length} configuration warning${warnings.length === 1 ? "" : "s"}.`);
