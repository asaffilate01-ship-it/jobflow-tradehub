import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("go-live contracts", () => {
  it("preserves claimable listings while keeping them out of lead eligibility", () => {
    const marketplace = read("src/pages/MarketplacePage.tsx");
    const matcher = read("supabase/migrations/20260825090000_repair_marketplace_hardening.sql");
    expect(marketplace).toContain('listing_kind: "member" | "directory"');
    expect(marketplace).toContain("Claimable profiles");
    expect(marketplace).toContain("cannot receive leads until claimed and subscribed");
    expect(matcher).toContain("An active trader subscription is required");
  });

  it("never falls back to original media for Dokuvera", () => {
    const sync = read("supabase/functions/dokuvera-sync/index.ts");
    expect(sync).toContain('item.redaction_status === "safe" && item.redacted_storage_path');
    expect(sync).not.toContain("item.redacted_storage_path || item.storage_path");
    expect(sync).toContain("originals_shared: false");
  });

  it("keeps production webhooks behind independent verification", () => {
    const config = read("supabase/config.toml");
    expect(config).toContain("[functions.stripe-webhook]");
    expect(config).toContain("[functions.dokuvera-webhook]");
    expect(config).toContain("[functions.integration-outbox-worker]");
  });
});
