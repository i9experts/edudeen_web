import { useEffect, useState } from 'react';
import { apiGetPublicActiveCampaigns, type PublicCampaign } from '@/api/services/marketing/publicCampaigns';
import { apiGetAllProducts, type MarketplaceProduct } from '@/api/services/marketplace';
import { productSalePct, platformSalePct, maxSalePct } from '@/utils/saleMath';
import { timeLeftText } from '@/utils/countdown';

export interface TopBarFlashDeal {
  product: MarketplaceProduct;
  pct: number;
}

export interface TopBarDeals {
  /** Admin-created sale campaigns that are live right now (October sale, 11.11, Azadi sale…). */
  campaigns: PublicCampaign[];
  /** The marketplace's deepest product discounts right now (top 5). */
  flashDeals: TopBarFlashDeal[];
  /** Every on-sale product found, deepest discount first (the homepage flash-sale rail takes its slice). */
  allDeals: TopBarFlashDeal[];
  /** The REAL largest discount among the items on sale right now (0 = nothing discounted). The one number
   *  every "Up to X% off" label uses. */
  maxPct: number;
  /** Largest discount among products in a PLATFORM (admin) sale only - seller compare-at discounts are excluded.
   *  Used by the Mega Sale banner / sale label. 0 = no product has a running platform sale price. */
  campaignMaxPct: number;
}

const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; data: TopBarDeals } | null = null;
let inflight: Promise<TopBarDeals> | null = null;

function load(): Promise<TopBarDeals> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.data);
  if (inflight) return inflight;
  inflight = Promise.all([
    apiGetPublicActiveCampaigns().then(r => r.data ?? []).catch(() => [] as PublicCampaign[]),
    // Three pages of 50: the ranking looks at a big slice of the catalogue, not just the first page.
    Promise.all([1, 2, 3].map(pg => apiGetAllProducts(pg, 50).then(r => r.data?.products ?? []).catch(() => [] as MarketplaceProduct[]))).then(p => p.flat()),
  ]).then(([campaigns, products]) => {
    const now = Date.now();
    const allDeals = products
      .map(p => ({ product: p, pct: productSalePct(p) }))
      .filter(d => d.pct > 0)
      .sort((a, b) => b.pct - a.pct);
    const data: TopBarDeals = {
      campaigns: campaigns.filter(c => new Date(c.endDate).getTime() > now),
      flashDeals: allDeals.slice(0, 5),
      allDeals,
      maxPct: maxSalePct(allDeals),
      campaignMaxPct: maxSalePct(products.map(p => ({ pct: platformSalePct(p) }))),
    };
    cache = { at: Date.now(), data };
    return data;
  }).finally(() => { inflight = null; });
  return inflight;
}

/**
 * Live sales for the top bar — shared by every page (one fetch, cached for a
 * few minutes) so moving between pages doesn't refetch or flicker.
 */
export function useTopBarDeals(): TopBarDeals | null {
  const [data, setData] = useState<TopBarDeals | null>(cache?.data ?? null);
  useEffect(() => {
    let cancelled = false;
    // Premium members also get early-access sales, so a login/logout changes what the API returns.
    const onAuth = () => { cache = null; load().then(d => { if (!cancelled) setData(d); }); };
    window.addEventListener('edudeen:auth-login', onAuth);
    window.addEventListener('edudeen:auth-logout', onAuth);
    load().then(d => { if (!cancelled) setData(d); });
    // An admin edited a campaign inline: drop the cache and refetch so the top strip updates at once.
    const onChanged = () => { cache = null; load().then(d => { if (!cancelled) setData(d); }); };
    window.addEventListener('edudeen:campaigns-changed', onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('edudeen:campaigns-changed', onChanged);
      window.removeEventListener('edudeen:auth-login', onAuth);
      window.removeEventListener('edudeen:auth-logout', onAuth);
    };
  }, []);
  return data;
}

/** Time left until `iso` in the one shared countdown format ("15d 12h 03m" / "HH:MM:SS" / "ending now"). */
export function timeLeft(iso: string, now = Date.now()): string {
  return timeLeftText(iso, now);
}
