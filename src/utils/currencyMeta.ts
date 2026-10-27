// Menu helpers for display currencies: a flag emoji and the currency's English name.

/** Flag emoji for a currency (first two letters are the country for AED, GBP, INR, SAR...; EUR -> EU flag). */
export function currencyFlagEmoji(code: string): string {
  const c = code.toUpperCase();
  const country = c === 'EUR' ? 'EU' : c.slice(0, 2);
  return String.fromCodePoint(...[...country].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

/** "UAE Dirham"-style name via Intl; falls back to the code. */
export function currencyName(code: string): string {
  const fixed: Record<string, string> = { PKR: 'Pakistani Rupee', USD: 'US Dollar' };
  if (fixed[code]) return fixed[code];
  try { return new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) ?? code; } catch { return code; }
}
