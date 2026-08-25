export const traderImportColumns = [
  "source_name",
  "source_record_id",
  "source_url",
  "source_checked_at",
  "business_name",
  "trade",
  "country_code",
  "city",
  "region",
  "postcode_district",
  "service_radius_miles",
  "services",
  "languages",
  "factual_summary",
  "registration_authority",
  "registration_reference",
  "business_email",
  "business_phone",
  "website_url",
] as const;

export type TraderImportRow = Record<(typeof traderImportColumns)[number], string>;

export function parseTraderImportCsv(input: string): TraderImportRow[] {
  const rows = parseCsv(input.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("The CSV must include a header and at least one trader");
  const headers = rows[0].map((value) => value.trim().toLowerCase());
  const required = ["source_name", "source_record_id", "source_url", "business_name", "trade", "city", "postcode_district"];
  const missing = required.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);

  return rows.slice(1)
    .filter((row) => row.some((value) => value.trim()))
    .map((row, index) => {
      const record = Object.fromEntries(traderImportColumns.map((column) => {
        const position = headers.indexOf(column);
        return [column, position >= 0 ? (row[position] ?? "").trim() : ""];
      })) as TraderImportRow;
      if (!record.business_name) throw new Error(`Row ${index + 2}: business_name is required`);
      return record;
    });
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unclosed quoted value");
  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

export function buildTraderImportTemplate() {
  return [
    traderImportColumns.join(","),
    [
      "official_register",
      "example-001",
      "https://example.org/trader/example-001",
      new Date().toISOString(),
      "Example Plumbing Ltd",
      "plumber",
      "GB",
      "London",
      "Greater London",
      "NW6",
      "15",
      '"plumbing|leak repair|bathrooms"',
      '"English|Urdu"',
      '"Public factual description only"',
      "Companies House",
      "12345678",
      "",
      "",
      "",
    ].join(","),
  ].join("\n");
}
