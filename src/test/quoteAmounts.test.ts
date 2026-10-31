import { describe, expect, it } from "vitest";
import { parseQuoteMoney, validateQuoteBreakdown } from "@/lib/quoteAmounts";

describe("quote amount integrity", () => {
  it("accepts sensible pounds and pence, including empty optional amounts", () => {
    expect(parseQuoteMoney("")).toBe(0);
    expect(parseQuoteMoney("19.99")).toBe(19.99);
    expect(parseQuoteMoney(" 0.01 ")).toBe(0.01);
  });

  it("rejects negative, malformed, nonfinite and overprecise amounts", () => {
    for (const value of ["-1", "1.999", "Infinity", "NaN", "1e3", "1,000", "100000001"]) {
      expect(parseQuoteMoney(value)).toBeNull();
    }
  });

  it("accepts reconciled itemised and summary totals", () => {
    const actual = validateQuoteBreakdown(
      ["15.99", "4.00", "0"],
      [{ description: "Work", quantity: 1, unit_price: 15.99 }, { description: "Materials", quantity: 2, unit_price: 2 }],
    );
    expect(actual).toEqual({ valid: true, total: 19.99, detailTotal: 19.99 });
  });

  it("allows detail-only quotes without forcing duplicated summary amounts", () => {
    expect(validateQuoteBreakdown(["", "", ""], [{ description: "Labour", quantity: 2, unit_price: 18 }]))
      .toEqual({ valid: true, total: 36, detailTotal: 36 });
  });

  it("refuses an empty or zero-valued quote", () => {
    expect(validateQuoteBreakdown(["", "", ""], [{ description: "", quantity: 1, unit_price: 0 }]))
      .toMatchObject({ valid: false, reason: "Enter a positive quote total before submitting." });
  });

  it("limits quote line count and description length", () => {
    const line = { description: "Work", quantity: 1, unit_price: 1 };
    expect(validateQuoteBreakdown(["51", "", ""], Array.from({ length: 51 }, () => line)))
      .toMatchObject({ valid: false });
    expect(validateQuoteBreakdown(["1", "", ""], [{ ...line, description: "A".repeat(501) }]))
      .toMatchObject({ valid: false });
  });

  it("rejects mismatched breakdowns and invalid line pricing", () => {
    const line = [{ description: "Work", quantity: 1, unit_price: 19.99 }];
    expect(validateQuoteBreakdown(["20", "", ""], line)).toMatchObject({ valid: false });
    expect(validateQuoteBreakdown(["", "", ""], [{ description: "", quantity: 1, unit_price: 5 }])).toMatchObject({ valid: false });
    expect(validateQuoteBreakdown(["", "", ""], [{ description: "Work", quantity: 0, unit_price: 5 }])).toMatchObject({ valid: false });
    expect(validateQuoteBreakdown(["", "", ""], [{ description: "Work", quantity: 1, unit_price: -1 }])).toMatchObject({ valid: false });
  });
});
