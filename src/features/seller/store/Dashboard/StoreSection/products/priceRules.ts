/**
 * ONE place for the seller price / description rules, used by bulk upload and the single Add / Edit product forms.
 * Pure (no imports) so `npm run test:rules` can run it with plain node. The API mirrors these rules in
 * edudeen_api/src/products/price-rules.util.ts - keep the two in step.
 */

export const MAX_PRICE = 1_000_000;
export const MIN_DESCRIPTION = 20;

const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === '';
const decimalsOf = (n: number) => {
  const s = String(n);
  if (s.includes('e')) return 99;
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
};

/** PKR is whole rupees, every other currency keeps 2 decimals. */
export function decimalError(n: number, currency?: string | null, label = 'Prices'): string | null {
  if (currency === 'PKR') return Number.isInteger(n) ? null : `${label} in PKR must be whole rupees (no decimals).`;
  return decimalsOf(n) > 2 ? `${label} can have at most 2 decimals.` : null;
}

export interface PriceCheck { price?: string; compareAt?: string }

/**
 * Price + compare-at rules. `free` = the seller explicitly chose "free": only then is a price of 0 accepted
 * (an empty box or a stray 0 is treated as a missing price).
 */
export function validatePrices(i: { price: unknown; compareAt?: unknown; currency?: string | null; free?: boolean }): PriceCheck {
  const out: PriceCheck = {};
  let price: number | null = null;
  if (isBlank(i.price)) out.price = 'Enter a price';
  else {
    const n = Number(i.price);
    if (!Number.isFinite(n)) out.price = 'Price must be a number';
    else if (n < 0) out.price = "Price can't be negative";
    else if (n > MAX_PRICE) out.price = `Price can't be more than ${MAX_PRICE.toLocaleString('en-US')}`;
    else if (n === 0 && !i.free) out.price = 'Enter a price';
    else {
      const d = decimalError(n, i.currency);
      if (d) out.price = d;
      else price = n;
    }
  }
  if (!isBlank(i.compareAt)) {
    const c = Number(i.compareAt);
    if (!Number.isFinite(c)) out.compareAt = 'Compare-at price must be a number';
    else if (c < 0) out.compareAt = "Compare-at price can't be negative";
    else if (c > MAX_PRICE) out.compareAt = `Compare-at price can't be more than ${MAX_PRICE.toLocaleString('en-US')}`;
    else {
      const d = decimalError(c, i.currency, 'Compare-at prices');
      if (d) out.compareAt = d;
      else if (price !== null && !(c > price)) out.compareAt = 'Compare-at must be higher than price';
    }
  }
  return out;
}

/** Description: required, at least MIN_DESCRIPTION characters once trimmed. null = fine. */
export function descriptionError(text: unknown): string | null {
  const t = String(text ?? '').trim();
  if (!t) return 'Add a description';
  if (t.length < MIN_DESCRIPTION) return `Description must be at least ${MIN_DESCRIPTION} characters (now ${t.length})`;
  return null;
}

// â”€â”€ Premium member discount vs the seller's own sale (same rule as the API's premiumGapViolation) â”€â”€
const fmtPct = (n: number) => String(Math.round(n * 10) / 10);

/** The seller's Premium percent for a product: opted out = 0; else the product's own value, else the store setting. */
export function effectiveSellerPercent(productValue: string, storePercent: number, optOut = false): number {
  if (optOut) return 0;
  const own = Number(productValue);
  if (productValue.trim() && Number.isFinite(own) && own >= 1 && own <= 50) return own;
  return storePercent > 0 ? storePercent : 0;
}

/** The seller's own sale in % of the list (compare-at) price; 0 when there is no sale. */
export function ownSalePercent(price: number, compareAt: number): number {
  if (!(compareAt > price) || !(price >= 0)) return 0;
  return (1 - price / compareAt) * 100;
}

/** Lowest Premium % allowed next to the seller's own sale: sale + gap (rounded up to 0.1). null = no sale. */
export function premiumMinPercent(price: number, compareAt: number, gap: number): number | null {
  const sale = ownSalePercent(price, compareAt);
  if (!(sale > 0)) return null;
  return Math.ceil((sale + gap) * 10 - 1e-9) / 10;
}

/** Same rule as the API: the normal sale must be at least `gap` points below Premium. null = fine. */
export function premiumGapMessage(price: number, compareAt: number, sellerPct: number, gap: number): string | null {
  if (!(sellerPct > 0)) return null;
  const sale = ownSalePercent(price, compareAt);
  if (!(sale > 0)) return null;
  if (sale <= Math.max(0, sellerPct - gap) + 1e-9) return null;
  const min = premiumMinPercent(price, compareAt, gap) ?? 0;
  return `Premium discount must be at least ${fmtPct(min)}% (your sale ${fmtPct(sale)}% + ${fmtPct(gap)}% gap). Raise Premium to ${fmtPct(min)}% or more, or lower your sale.`;
}

/**
 * Highest compare-at price the Premium rule allows for this price: sale <= Premium % - gap.
 * null = no sale is allowed at all (Premium % is not above the gap), so compare-at has to stay empty.
 */
export function maxCompareAtForPremium(price: number, sellerPct: number, gap: number, currency?: string | null): number | null {
  if (!(price > 0) || !(sellerPct > 0)) return null;
  const maxSale = Math.max(0, sellerPct - gap);
  if (!(maxSale > 0)) return null;
  const raw = price / (1 - maxSale / 100);
  const max = currency === 'PKR' ? Math.floor(raw + 1e-9) : Math.floor(raw * 100 + 1e-6) / 100;
  return max > price ? max : null;
}

export interface PremiumConflict {
  /** One line for the row status. */
  short: string;
  /** The explanation the Add / Edit product pages show. */
  detail: string;
  /** Highest compare-at that works, or null when no sale can be shown. */
  max: number | null;
}

/** null = no conflict (no Premium discount, no sale, or the sale is small enough). */
export function premiumConflict(i: { price: number; compareAt: number; sellerPct: number; gap: number; currency?: string | null; symbol: string }): PremiumConflict | null {
  const detail = premiumGapMessage(i.price, i.compareAt, i.sellerPct, i.gap);
  if (!detail) return null;
  const max = maxCompareAtForPremium(i.price, i.sellerPct, i.gap, i.currency);
  const money = (n: number) => `${i.symbol} ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  const short = max == null
    ? `Discount too big with Premium member discount - remove the compare-at price for ${money(i.price)} (Premium ${fmtPct(i.sellerPct)}% leaves no room for a sale)`
    : `Discount too big with Premium member discount - max compare-at for ${money(i.price)} is ${money(max)}`;
  return { short, detail, max };
}

// ── Physical products: shipping weight and stock (mirrored in the API's price-rules.util.ts) ──
export const MAX_WEIGHT_KG = 50;
export const MAX_STOCK = 100_000;
export type WeightUnit = 'kg' | 'g';

/** "0.6 kg", "600 g", "0.6" (kg) -> kilograms; null when it is not a weight. */
export function parseWeightKg(text: unknown): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(kg|g)?\s*$/i.exec(String(text ?? ''));
  if (!m) return null;
  const n = Number(m[1]);
  const kg = (m[2] ?? 'kg').toLowerCase() === 'g' ? n / 1000 : n;
  return Math.round(kg * 1000) / 1000;
}

/** null = fine. `value`/`unit` = what the seller typed (number box + unit). */
export function weightError(value: unknown, unit: WeightUnit = 'kg'): string | null {
  if (String(value ?? '').trim() === '') return 'Add shipping weight';
  const kg = parseWeightKg(`${String(value).trim()} ${unit}`);
  if (kg === null) return 'Shipping weight must be a number';
  if (!(kg > 0)) return 'Shipping weight must be more than 0';
  if (kg > MAX_WEIGHT_KG) return `Shipping weight can't be more than ${MAX_WEIGHT_KG} kg`;
  return null;
}

/** The text stored on the variant: always kilograms ("0.25 kg"). */
export function weightToStored(value: unknown, unit: WeightUnit = 'kg'): string {
  const kg = parseWeightKg(`${String(value).trim()} ${unit}`);
  return kg === null ? '' : `${kg} kg`;
}

/** Split a stored weight back into the number box + unit (grams under 1 kg read better). */
export function weightFromStored(stored: unknown): { value: string; unit: WeightUnit } {
  const kg = parseWeightKg(stored);
  if (kg === null) return { value: '', unit: 'kg' };
  return kg < 1 ? { value: String(Math.round(kg * 1000)), unit: 'g' } : { value: String(kg), unit: 'kg' };
}

/** Stock rules for a physical product. Returns an error, or null. A 0 is valid here (the zero-stock warning is separate). */
export function stockError(stock: unknown, unlimited: boolean): string | null {
  if (unlimited) return null;
  if (String(stock ?? '').trim() === '') return 'Add the stock quantity';
  const n = Number(stock);
  if (!Number.isFinite(n)) return 'Stock must be a whole number';
  if (n < 0) return "Stock can't be negative";
  if (!Number.isInteger(n)) return 'Stock must be a whole number';
  if (n > MAX_STOCK) return `Stock can't be more than ${MAX_STOCK.toLocaleString('en-US')}`;
  return null;
}

/** Single Add / Edit form: the weight is one text box ("0.5 kg", "500 g", "0.5" = kg). null = fine. */
export function weightTextError(text: unknown): string | null {
  const s = String(text ?? '').trim();
  if (s === '') return 'Add shipping weight';
  const m = /^(\d+(?:\.\d+)?)\s*(kg|g)?$/i.exec(s);
  if (!m) return 'Shipping weight must be a number, e.g. 0.5 kg or 500 g';
  return weightError(m[1], (m[2] ?? 'kg').toLowerCase() as WeightUnit);
}
