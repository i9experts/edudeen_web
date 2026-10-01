import { useEffect, useState } from 'react';
import { apiGetPublicActiveCampaigns, type PublicCampaign } from '@/api/services/marketing/publicCampaigns';
import { apiGetAllProducts, type MarketplaceProduct } from '@/api/services/marketplace';

export interface TopBarFlashDeal {
  product: MarketplaceProduct;
  pct: number;
}

export interface TopBarDeals {
  /** Admin-created sale campaigns that are live right now (October sale, 11.11, Azadi sale…). */
  campaigns: PublicCampaign[];
  /** The marketplace's deepest product discounts right now. */
  flashDeals: TopBarFlashDeal[];
}

const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; data: TopBarDeals } | null = null;
let inflight: Promise<TopBarDeals> | null = null;

function load(): Promise<TopBarDeals> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.data);
  if (inflight) return inflight;
  inflight = Promise.all([
    apiGetPublicActiveCampaigns().then(r => r.data ?? []).catch(() => [] as PublicCampaign[]),
    apiGetAllProducts(1, 40).then(r => r.data?.products ?? []).catch(() => [] as MarketplaceProduct[]),
  ]).then(([campaigns, products]) => {
    const now = Date.now();
    const flashDeals = products
      .map(p => {
        const dv = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
        const price = dv?.price ?? 0;
        const compareAt = dv?.compareAtPrice ?? null;
        const pct = compareAt != null && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;
        return { product: p, pct };
      })
      .filter(d => d.pct > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
    const data: TopBarDeals = {
      campaigns: campaigns.filter(c => new Date(c.endDate).getTime() > now),
      flashDeals,
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
    load().then(d => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, []);
  return data;
}

/** "2d 4h" / "5h 12m" / "8m" until `iso`. */
export function timeLeft(iso: string, now = Date.now()): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return 'ending now';
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}
