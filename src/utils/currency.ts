// ── Currency symbol lookup ────────────────────────────────────────────────────
// Orders/Checkouts carry a real `currency` code from the backend (e.g. "USD",
// "PKR"). This maps known codes to their display symbol so pages don't need to
// hardcode a single currency across the whole app. Falls back to the code
// itself (e.g. an unrecognized ISO code) so nothing silently disappears.

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

/** Formats an amount with the correct symbol for a given currency code — the one money format
 *  the app uses: symbol, a space, thousands separators, and no ".00" on whole amounts. */
export function formatMoney(amount: number | null | undefined, code?: string | null): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const sign = amount < 0 ? '-' : '';
  return `${sign}${currencySymbol(code)} ${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** Same format, abbreviated (K/M) for tight spaces — "Rs 8K", "Rs 1.2M". The symbol always
 *  follows the currency code, so a PKR total never renders with a $ prefix. */
export function formatMoneyCompact(amount: number | null | undefined, code?: string | null): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const short = (n: number) => String(Number(n.toFixed(1)));
  if (abs >= 1_000_000) return `${sign}${currencySymbol(code)} ${short(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${currencySymbol(code)} ${short(abs / 1_000)}K`;
  return formatMoney(amount, code);
}