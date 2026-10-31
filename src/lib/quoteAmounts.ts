/**
 * Client-side quote validation. The backend remains the authority for limits,
 * permissions, totals, and quote creation.
 */
export function parseQuoteMoney(value: string): number | null {
  const input = value.trim();
  if (!input) return 0;
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(input)) return null;
  const amount = Number(input);
  if (!Number.isFinite(amount) || amount > 100_000_000) return null;
  return amount;
}

export function validateQuoteBreakdown(
  summary: readonly string[],
  lines: readonly { description: string; quantity: number; unit_price: number }[],
): { valid: true; total: number; detailTotal: number } | { valid: false; reason: string } {
  const amounts = summary.map(parseQuoteMoney);
  if (amounts.some((amount) => amount === null)) {
    return { valid: false, reason: "Enter non-negative amounts with no more than two decimal places." };
  }
  const summaryTotal = amounts.reduce<number>((total, amount) => total + (amount ?? 0), 0);
  if (
    lines.some((line) =>
      !Number.isSafeInteger(line.quantity) || line.quantity < 1 ||
      !Number.isFinite(line.unit_price) || line.unit_price < 0 ||
      Math.abs(Math.round(line.unit_price * 100) - line.unit_price * 100) > 0.000001
    )
  ) {
    return { valid: false, reason: "Each quote line needs a positive whole quantity and a valid non-negative unit price." };
  }
  if (lines.some((line) => !line.description.trim() && line.unit_price > 0)) {
    return { valid: false, reason: "Add a description to each priced quote line." };
  }
  const detailTotal = lines
    .filter((line) => line.description.trim())
    .reduce((total, line) => total + line.quantity * line.unit_price, 0);
  if (detailTotal > 100_000_000) {
    return { valid: false, reason: "The itemised total is too large. Please review the quantities and prices." };
  }
  if (summaryTotal > 0 && detailTotal > 0 && Math.abs(summaryTotal - detailTotal) > 0.009) {
    return { valid: false, reason: "The summary and itemised breakdown totals must match before submitting." };
  }
  return {
    valid: true,
    total: Math.round((summaryTotal > 0 ? summaryTotal : detailTotal) * 100) / 100,
    detailTotal: Math.round(detailTotal * 100) / 100,
  };
}
