// Commission copy driven by the store's real rate instead of a hardcoded
// "No commission" — the finance dashboard (feeBreakdown.transactionFee, e.g.
// "5.00% per sale") and monthly statements (commissionRate, a 0–1 fraction)
// both carry it.

/** Percent (e.g. 5) from feeBreakdown.transactionFee, or null if it can't be read. */
export function commissionPctFromFee(transactionFee: string | null | undefined): number | null {
  if (!transactionFee) return null;
  const n = parseFloat(transactionFee);
  return Number.isFinite(n) ? n : null;
}

/** Percent (e.g. 5) from a 0–1 commission fraction. */
export function commissionPctFromRate(rate: number | null | undefined): number | null {
  return typeof rate === 'number' && Number.isFinite(rate) ? rate * 100 : null;
}

export function formatPct(pct: number): string {
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
}

/** One-line payout explanation. `pct` null = rate not loaded/unknown. */
export function payoutNote(pct: number | null): string {
  if (pct === null) return 'Edudeen pays your earnings monthly, minus any commission and card processing fees.';
  if (pct === 0) return 'No commission — Edudeen pays your full earnings monthly, minus card processing fees.';
  return `Edudeen pays your earnings monthly, minus a ${formatPct(pct)} commission and card processing fees.`;
}
