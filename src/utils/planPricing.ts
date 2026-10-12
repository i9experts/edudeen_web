// Platform-plan price helpers. Yearly = PlatformPlan.yearlyPriceUSD, or 12x monthly when unset
// (mirrors the API's change-plan pricing).
export type PlanInterval = 'monthly' | 'yearly';

interface PlanPrices { monthlyPriceUSD?: number | null; yearlyPriceUSD?: number | null }

export function planYearlyPrice(p: PlanPrices): number {
  const m = p.monthlyPriceUSD ?? 0;
  return p.yearlyPriceUSD != null && p.yearlyPriceUSD > 0 ? p.yearlyPriceUSD : m * 12;
}

export function planPriceFor(p: PlanPrices, interval: PlanInterval): number {
  return interval === 'yearly' ? planYearlyPrice(p) : (p.monthlyPriceUSD ?? 0);
}

/** Whole-number percent saved by paying yearly, or 0 when it is not cheaper. */
export function planYearlySavePct(p: PlanPrices): number {
  const m = (p.monthlyPriceUSD ?? 0) * 12;
  if (m <= 0) return 0;
  const pct = Math.round((1 - planYearlyPrice(p) / m) * 100);
  return pct > 0 ? pct : 0;
}
