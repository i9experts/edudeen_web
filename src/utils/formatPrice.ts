// The ONE money formatter. USD -> "$1,234.50" (always 2 decimals), PKR -> "Rs 1,440" (whole rupees,
// symbol + a space), other codes -> "<symbol> 12.50". Digits are always Latin (also in Urdu mode) so a
// price never switches script; only the grouping style follows `locale`.

const SYMBOLS: Record<string, string> = { USD: '$', PKR: 'Rs', EUR: '€', GBP: '£', INR: '₹', AED: 'AED', CAD: 'CA$', AUD: 'AU$' };

export function currencySymbolOf(code?: string | null): string {
  if (!code) return '$';
  return SYMBOLS[code.toUpperCase()] ?? code;
}

/** Decimals a currency is shown with: PKR whole rupees, everything else 2. */
export function currencyDecimals(code?: string | null): number {
  return (code ?? 'USD').toUpperCase() === 'PKR' ? 0 : 2;
}

const nfCache = new Map<string, Intl.NumberFormat>();
function numberFormat(locale: string, decimals: number): Intl.NumberFormat {
  const key = `${locale}|${decimals}`;
  let nf = nfCache.get(key);
  if (!nf) {
    // `-u-nu-latn` keeps Latin digits for ur-PK; an unknown locale falls back to en-US.
    let tag = locale.includes('-u-') ? locale : `${locale}-u-nu-latn`;
    try { nf = new Intl.NumberFormat(tag, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); }
    catch { nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); }
    nfCache.set(key, nf);
  }
  return nf;
}

/** Just the number part of a price in `currency` (grouped, with that currency's decimals). */
export function formatAmount(amount: number, currency?: string | null, locale = 'en-US'): string {
  return numberFormat(locale, currencyDecimals(currency)).format(Math.abs(amount));
}

/** The shared price string. null / NaN -> an em dash. */
export function formatPrice(amount: number | null | undefined, currency?: string | null, locale = 'en-US'): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const sign = amount < 0 ? '-' : '';
  const sym = currencySymbolOf(currency);
  const gap = sym.length > 1 ? ' ' : '';
  return `${sign}${sym}${gap}${formatAmount(amount, currency, locale)}`;
}

/** Same, abbreviated for tight spaces: "Rs 8K", "$1.2M". */
export function formatPriceCompact(amount: number | null | undefined, currency?: string | null, locale = 'en-US'): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const sym = currencySymbolOf(currency);
  const gap = sym.length > 1 ? ' ' : '';
  const short = (n: number) => String(Number(n.toFixed(1)));
  if (abs >= 1_000_000) return `${sign}${sym}${gap}${short(abs / 1_000_000)}M`;
  if (abs >= 1_000) return `${sign}${sym}${gap}${short(abs / 1_000)}K`;
  return formatPrice(amount, currency, locale);
}
