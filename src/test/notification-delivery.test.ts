import { describe, expect, it } from "vitest";
import { summarizeDispatch } from "../../supabase/functions/_shared/notification-delivery";

describe("notification dispatch responses", () => {
  it("accepts fully successful channel submissions without claiming delivery", () => {
    expect(summarizeDispatch([
      { channel: "in_app", success: true },
      { channel: "email", success: true },
    ])).toEqual({ success: true, failedChannels: [], acceptedChannels: ["in_app", "email"] });
  });

  it("detects partial failures instead of acknowledging every channel", () => {
    expect(summarizeDispatch([
      { channel: "in_app", success: true },
      { channel: "email", success: false, error: "Transport unavailable" },
    ])).toEqual({ success: false, failedChannels: ["email"], acceptedChannels: ["in_app"] });
  });

  it("handles an empty eligible audience as no channel failures", () => {
    expect(summarizeDispatch([])).toEqual({
      success: true, failedChannels: [], acceptedChannels: [],
    });
  });
});
