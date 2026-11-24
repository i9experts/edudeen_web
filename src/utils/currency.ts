// ── Currency symbol lookup ────────────────────────────────────────────────────
// Orders/Checkouts carry a real `currency` code from the backend (e.g. "USD",
// "PKR"). This maps known codes to their display symbol so pages don't need to
// hardcode a single currency across the whole app. Falls back to the code
// itself (e.g. an unrecognized ISO code) so nothing silently disappears.

import { formatPrice, formatPriceCompact, currencyDecimals } from './formatPrice';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  PKR: 'Rs',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AED: 'AED',
  CAD: 'CA$',
  AUD: 'AU$',
};

export function currencySymbol(code?: string | null): string {
  if (!code) return '$';
  return CURRENCY_SYMBOLS[code.toUpperCase()] ?? code;
}

/** Formats an amount with the correct symbol for a given currency code - delegates to the one shared
 *  formatter (`formatPrice`): USD "$12.50", PKR "Rs 1,440". */
export function formatMoney(amount: number | null | undefined, code?: string | null, locale?: string): string {
  return formatPrice(amount, code, locale);
}

/** Same format, abbreviated (K/M) for tight spaces - "Rs 8K", "$1.2M". */
export function formatMoneyCompact(amount: number | null | undefined, code?: string | null, locale?: string): string {
  return formatPriceCompact(amount, code, locale);
}

/** Mirror of the API's convertWithSnapshots: converts via USD with the checkout's frozen rates (checkout line prices
 *  are in each item's own seller currency). Missing rate -> amount unchanged, like the display converter. */
export function convertWithSnapshots(
  amount: number, from: string | null | undefined, to: string,
  snapshots?: { currency: string; ratePerUSD: number }[] | null,
): number {
  if (!from || from === to) return amount;
  const rate = (c: string) => (c === 'USD' ? 1 : snapshots?.find(s => s.currency === c)?.ratePerUSD);
  const fromRate = rate(from), toRate = rate(to);
  if (!fromRate || !toRate) return amount;
  const d = currencyDecimals(to);
  const f = 10 ** d;
  return Math.round((amount / fromRate) * toRate * f) / f;
}

export { formatPrice, formatPriceCompact, formatAmount, currencyDecimals } from './formatPrice';
