import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { apiGetAllProducts, type MarketplaceProduct, type MarketplaceSortBy } from '@/api/services/marketplace';

// Short-lived answer cache: switching a filter on and off (or going back to a previous combination) paints at
// once instead of waiting for another 100-product round trip. Live refreshes always bypass it and rewrite it.
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 40;
const answerCache = new Map<string, { at: number; products: MarketplaceProduct[]; total: number }>();

export function useProductsByCategory(
  page = 1, limit = 10, categoryId?: string,
  productType?: 'physical' | 'digital',
  educationLevel?: string,
  campaignId?: string,
  minPrice?: number, maxPrice?: number, minRating?: number, sortBy?: MarketplaceSortBy,
  // False while a caller is still resolving something the fetch depends on
  // (e.g. a category slug → id lookup) — skips the request entirely and
  // stays in a loading state, instead of firing once unfiltered and again
  // a moment later once the real filter value is known.
  enabled = true,
  format?: 'course',
) {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey(k => k + 1), []);
  // Live updates re-read quietly: the grid stays on screen (no skeleton flash) and swaps when the new data lands.
  const quietRef = useRef(false);
  useLiveRefresh(['catalog', 'campaigns', 'reviews'], () => { quietRef.current = true; setReloadKey(k => k + 1); }, enabled);

  useEffect(() => {
    if (!enabled) { setLoading(true); return; }
    let cancelled = false;
    const quiet = quietRef.current;
    quietRef.current = false;
    const key = JSON.stringify([page, limit, categoryId, productType, educationLevel, campaignId, minPrice, maxPrice, minRating, sortBy, format]);
    const hit = answerCache.get(key);
    if (!quiet && hit && Date.now() - hit.at < CACHE_TTL_MS) {
      setProducts(hit.products);
      setTotal(hit.total);
      setError('');
      setLoading(false);
      return;
    }
    if (!quiet) setLoading(true);
    setError('');
    apiGetAllProducts(page, limit, categoryId, productType, educationLevel, campaignId, minPrice, maxPrice, minRating, sortBy, format)
      .then(res => {
        const list = res.data?.products ?? [];
        const count = res.data?.total ?? 0;
        if (answerCache.size >= CACHE_MAX) answerCache.delete(answerCache.keys().next().value as string);
        answerCache.set(key, { at: Date.now(), products: list, total: count });
        if (!cancelled) {
          setProducts(list);
          setTotal(count);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && !quiet) setError(err instanceof Error ? err.message : 'Failed to load products.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, categoryId, productType, educationLevel, campaignId, minPrice, maxPrice, minRating, sortBy, enabled, format, reloadKey]);

  return { products, total, loading, error, refetch };
}
