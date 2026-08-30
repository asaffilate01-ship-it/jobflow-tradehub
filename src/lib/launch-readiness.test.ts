import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { launchDecision, type LaunchReadinessReport } from "./launch-readiness";

const report = (blockers: number, warnings: number): LaunchReadinessReport => ({
  generated_at: new Date(0).toISOString(),
  summary: { blockers, warnings, ready: 0 },
  checks: [],
  metrics: {
    paid_marketplace_profiles: 0,
    active_claimable_directory_profiles: 0,
    verified_available_repair_profiles: 0,
    pending_deletion_requests: 0,
    integration_queue_problems: 0,
    dokuvera_queue_problems: 0,
  },
});

describe("launch readiness", () => {
  it("never reports ready while blockers or warnings remain", () => {
    expect(launchDecision(report(1, 0)).label).toBe("Blocked");
    expect(launchDecision(report(0, 1)).label).toBe("Pilot only");
    expect(launchDecision(report(0, 0)).label).toBe("Ready for controlled launch");
  });

  it("configures repair storage through the Storage API", () => {
    const source = readFileSync("supabase/functions/launch-readiness/index.ts", "utf8");
    expect(source).toContain("admin.storage.createBucket");
    expect(source).toContain("admin.storage.updateBucket");
    expect(source).not.toContain("storage.buckets");
  });

  it("keeps claimable directory routes and filters", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    const marketplace = readFileSync("src/pages/MarketplacePage.tsx", "utf8");
    expect(app).toContain('/claim-trader/:id');
    expect(marketplace).toContain("Claimable profiles");
    expect(marketplace).toContain("Claimable profiles only");
  });

  it("keeps failed-event retries admin-only and preserves idempotency", () => {
    const worker = readFileSync("supabase/functions/integration-outbox-worker/index.ts", "utf8");
    expect(worker).toContain('principal !== "admin"');
    expect(worker).toContain('body.retry_event_id');
    expect(worker).toContain('Idempotency-Key');
    expect(worker).not.toContain("DOKUVERA_RETRY_CRON_SECRET");
    expect(worker).not.toContain("DOKUVERA_INTERNAL_SECRET");
  });

  it("uses meaningful controlled-pilot supply thresholds", () => {
    const readiness = readFileSync("supabase/functions/launch-readiness/index.ts", "utf8");
    expect(readiness).toContain("paidMembers.count >= 10");
    expect(readiness).toContain("verifiedRepairProfiles >= 4");
  });
});
