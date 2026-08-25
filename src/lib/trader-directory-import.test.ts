import { describe, expect, it } from "vitest";
import { buildTraderImportTemplate, parseTraderImportCsv } from "./trader-directory-import";

describe("trader directory CSV import", () => {
  it("parses the supplied template", () => {
    const rows = parseTraderImportCsv(buildTraderImportTemplate());
    expect(rows).toHaveLength(1);
    expect(rows[0].business_name).toBe("Example Plumbing Ltd");
    expect(rows[0].services).toBe("plumbing|leak repair|bathrooms");
  });

  it("supports commas and escaped quotes in quoted values", () => {
    const csv = [
      "source_name,source_record_id,source_url,business_name,trade,city,postcode_district,factual_summary",
      'source,1,https://example.org/1,"Smith, Jones & Co",builder,Luton,LU1,"Says ""hello"""',
    ].join("\n");
    const rows = parseTraderImportCsv(csv);
    expect(rows[0].business_name).toBe("Smith, Jones & Co");
    expect(rows[0].factual_summary).toBe('Says "hello"');
  });

  it("rejects missing required columns", () => {
    expect(() => parseTraderImportCsv("business_name,trade\nA,plumber"))
      .toThrow(/Missing required columns/);
  });
});
