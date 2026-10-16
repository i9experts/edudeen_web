import { useEffect, useState } from 'react';
import { apiGetPlatformStats, type PlatformStats } from '@/api/services/store';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';

export const DEFAULT_STATS_THRESHOLDS = { sellers: 50, buyers: 500, products: 100 };
/** A rating average is only quoted once this many reviews stand behind it. */
export const MIN_REVIEWS_FOR_RATING = 10;

export type StatKey = 'sellers' | 'buyers' | 'products' | 'rating';
export interface StatItem { key: StatKey; value: number; label: string }

/** What the homepage may say about itself: real numbers only past the admin's thresholds, otherwise plain trust points. */
export interface PlatformTrust {
  loading: boolean;
  /** true = every threshold is met -> show the numbers; false = show non-number trust points instead. */
  showNumbers: boolean;
  items: StatItem[];
  /** COD only when a store really offers it (derived by the API, never assumed). */
  codAvailable: boolean;
}

let cache: { at: number; stats: PlatformStats | null } | null = null;
let inflight: Promise<PlatformStats | null> | null = null;
function loadStats(): Promise<PlatformStats | null> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return Promise.resolve(cache.stats);
  if (inflight) return inflight;
  inflight = apiGetPlatformStats().then(r => r.data ?? null).catch(() => null)
    .then(stats => { cache = { at: Date.now(), stats }; return stats; })
    .finally(() => { inflight = null; });
  return inflight;
}

/** Pure decision (also unit-tested): numbers show only when every threshold is reached. */
export function decideStats(stats: PlatformStats | null, th: { sellers: number; buyers: number; products: number }): { showNumbers: boolean; items: StatItem[] } {
  if (!stats) return { showNumbers: false, items: [] };
  const sellers = Math.floor(stats.sellersCount ?? 0);
  const buyers = Math.floor(stats.buyersCount ?? 0);
  const products = typeof stats.productsCount === 'number' ? Math.floor(stats.productsCount) : -1;
  const showNumbers = sellers >= th.sellers && buyers >= th.buyers && products >= th.products;
  if (!showNumbers) return { showNumbers: false, items: [] };
  const items: StatItem[] = [
    { key: 'sellers', value: sellers, label: 'Active Sellers' },
    { key: 'buyers', value: buyers, label: 'Registered Buyers' },
    { key: 'products', value: products, label: 'Resources' },
  ];
  if ((stats.ratingCount ?? 0) >= MIN_REVIEWS_FOR_RATING && stats.avgRating > 0) items.push({ key: 'rating', value: stats.avgRating, label: 'Average Rating' });
  return { showNumbers: true, items };
}

export function usePlatformTrust(): PlatformTrust {
  const { config } = usePublicPlatformConfig();
  const [stats, setStats] = useState<PlatformStats | null>(cache?.stats ?? null);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    let cancelled = false;
    loadStats().then(s => { if (!cancelled) { setStats(s); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);
  const th = { ...DEFAULT_STATS_THRESHOLDS, ...(config?.homeContent?.statsThresholds ?? {}) };
  const { showNumbers, items } = decideStats(stats, th);
  return { loading, showNumbers, items, codAvailable: config?.commerce?.codAvailable === true };
}