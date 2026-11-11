export type MarketingGroupId = 'promotions' | 'storefront' | 'ads' | 'advanced';
export type MarketingTabId = 'coupons' | 'discounts' | 'platform' | 'banners' | 'featured' | 'announcement' | 'promotions' | 'loyalty' | 'giftcards';

export interface MarketingGroup { id: MarketingGroupId; label: string; tabs: { id: MarketingTabId; label: string }[] }

export const MARKETING_GROUPS: MarketingGroup[] = [
  { id: 'promotions', label: 'Promotions', tabs: [
    { id: 'coupons', label: 'Coupons' },
    { id: 'discounts', label: 'Automatic Discounts' },
    { id: 'platform', label: 'Platform Sales' },
  ] },
  { id: 'storefront', label: 'Storefront', tabs: [
    { id: 'banners', label: 'Banners' },
    { id: 'featured', label: 'Featured' },
    { id: 'announcement', label: 'Announcement Bar' },
  ] },
  { id: 'ads', label: 'Ads', tabs: [
    { id: 'promotions', label: 'Promotion Requests' },
  ] },
  { id: 'advanced', label: 'Advanced', tabs: [
    { id: 'loyalty', label: 'Loyalty' },
    { id: 'giftcards', label: 'Gift Cards' },
  ] },
];

export interface MarketingView { group: MarketingGroupId; tab: MarketingTabId }

/** `?tab=` alone (old links) still works: the group is derived from the tab. `?group=` alone opens its first tab. */
export function resolveMarketingView(params: URLSearchParams, fallback?: MarketingView): MarketingView {
  const tab = params.get('tab');
  const group = params.get('group');
  for (const g of MARKETING_GROUPS) {
    const hit = g.tabs.find(t => t.id === tab);
    if (hit) return { group: g.id, tab: hit.id };
  }
  const g = MARKETING_GROUPS.find(x => x.id === group);
  if (g) return { group: g.id, tab: g.tabs[0].id };
  return fallback ?? { group: 'promotions', tab: 'coupons' };
}
