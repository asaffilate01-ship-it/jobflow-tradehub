import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { pilotProgress } from "./pilot-runs";

describe("launch pilot", () => {
  it("allows sign-off only when every required check passes", () => {
    expect(pilotProgress([{ required: true, status: "pass" }]).canSignOff).toBe(true);
    expect(pilotProgress([{ required: true, status: "pass" }, { required: true, status: "blocked" }]).canSignOff).toBe(false);
    expect(pilotProgress([{ required: true, status: "pass" }, { required: false, status: "not_run" }]).canSignOff).toBe(true);
  });

  it("keeps the database gate admin-only, immutable and forward-only", () => {
    const sql = readFileSync("supabase/migrations/20260830223000_launch_pilot_signoff.sql", "utf8");
    expect(sql).toContain("public.has_role(auth.uid(), 'admin')");
    expect(sql).toContain("Every required pilot check must pass before sign-off");
    expect(sql).toContain("Signed-off pilot runs are immutable");
    expect(sql).toContain("five_completed_jobs");
    expect(sql).not.toContain("storage.buckets");
    expect(sql).not.toContain("DOKUVERA_RETRY_CRON_SECRET");
    expect(sql).not.toContain("DOKUVERA_INTERNAL_SECRET");
  });
});
