import type { MarketplaceProduct } from '@/api/services/marketplace';

// One place that turns real product / campaign data into sale percentages, so "Up to X% off"
// anywhere on the site is the REAL maximum discount of the items currently on sale - never a number
// typed into a campaign form or hard-coded in a component.

type SaleVariant = { price?: number; compareAtPrice?: number | null; campaignPrice?: number | null; isDefault?: boolean };

/** Whole-number discount of the product's default variant: a running platform sale (campaignPrice) off
 *  the normal price, else the seller's own compare-at price. 0 when nothing is discounted. */
export function variantSalePct(v: SaleVariant | null | undefined): number {
  if (!v) return 0;
  const price = typeof v.price === 'number' ? v.price : 0;
  const campaign = typeof v.campaignPrice === 'number' && v.campaignPrice >= 0 && v.campaignPrice < price ? v.campaignPrice : null;
  const effective = campaign ?? price;
  const was = campaign != null ? price : (typeof v.compareAtPrice === 'number' ? v.compareAtPrice : null);
  if (was == null || !(was > effective) || was <= 0) return 0;
  return Math.round((1 - effective / was) * 100);
}

export function productSalePct(p: Pick<MarketplaceProduct, 'variants'>): number {
  const variants = (p.variants ?? []) as SaleVariant[];
  return variantSalePct(variants.find(v => v.isDefault) ?? variants[0]);
}

/** Discount from a running PLATFORM sale only (campaignPrice off the normal price); the seller's own compare-at is ignored. */
export function platformSalePct(p: Pick<MarketplaceProduct, 'variants'>): number {
  const variants = (p.variants ?? []) as SaleVariant[];
  const v = variants.find(x => x.isDefault) ?? variants[0];
  if (!v || typeof v.price !== 'number' || v.price <= 0) return 0;
  if (typeof v.campaignPrice !== 'number' || !(v.campaignPrice >= 0 && v.campaignPrice < v.price)) return 0;
  return Math.round((1 - v.campaignPrice / v.price) * 100);
}

/** Largest discount among the given sale items (0 when none is on sale). */
export function maxSalePct(items: Array<{ pct: number }> | Array<Pick<MarketplaceProduct, 'variants'>>): number {
  let max = 0;
  for (const it of items as any[]) {
    const pct = typeof it.pct === 'number' ? it.pct : productSalePct(it);
    if (pct > max) max = pct;
  }
  return max;
}

/** "Up to 40% off" - or null when there is no real discount to advertise. */
export function upToLabel(maxPct: number | null | undefined): string | null {
  return maxPct && maxPct > 0 ? `Up to ${Math.round(maxPct)}% off` : null;
}

/**
 * THE sale-timer rule (one rule for the whole site): the page-level countdowns - the DealsBanner timer, the
 * Flash Sale header and the mega-menu timer - all count down to the SOONEST-ENDING public sale's `endDate`
 * (that is the next moment the offer changes). A timer that belongs to one specific sale card (the top-bar
 * ticker item, a campaign's own chip) shows THAT sale's own end. Early-access (members-only) campaigns are
 * not public sales, so they never set the page-level timer.
 */
export function soonestSaleEnd(campaigns: Array<{ endDate: string; earlyAccess?: boolean }> | null | undefined): string | null {
  const ends = (campaigns ?? []).filter(c => !c.earlyAccess && c.endDate && !Number.isNaN(new Date(c.endDate).getTime())).map(c => c.endDate);
  if (!ends.length) return null;
  return ends.reduce((a, b) => (new Date(b).getTime() < new Date(a).getTime() ? b : a));
}
