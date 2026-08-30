import { existsSync, readFileSync } from "node:fs";

const failures = [];
const warnings = [];
const requiredFiles = [
  ".env.example",
  "public/robots.txt",
  "public/sitemap.xml",
  "docs/GO_LIVE_PHASES.md",
  "supabase/migrations/20260830130000_go_live_account_deletion.sql",
];

for (const file of requiredFiles) if (!existsSync(file)) failures.push(`Missing ${file}`);

for (const key of ["SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD", "SUPABASE_PROJECT_ID"]) {
  if (!process.env[key]) warnings.push(`${key} is required by the production deployment workflow`);
}

const config = existsSync("supabase/config.toml") ? readFileSync("supabase/config.toml", "utf8") : "";
for (const name of ["stripe-webhook", "dokuvera-webhook", "integration-outbox-worker"]) {
  if (!config.includes(`[functions.${name}]`)) failures.push(`Missing Supabase config for ${name}`);
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const failure of failures) console.error(`FAIL: ${failure}`);
if (failures.length) process.exit(1);
console.log(`Launch preflight passed with ${warnings.length} configuration warning${warnings.length === 1 ? "" : "s"}.`);
