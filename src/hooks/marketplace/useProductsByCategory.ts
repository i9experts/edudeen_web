import { useState, useEffect, useCallback } from 'react';
import { apiGetAllProducts, type MarketplaceProduct, type MarketplaceSortBy } from '@/api/services/marketplace';

export function useProductsByCategory(
  page = 1, limit = 10, categoryId?: string,
  productType?: 'physical' | 'digital' | 'educational',
  educationLevel?: string, normalizedCustomLevel?: string,
  campaignId?: string,
  minPrice?: number, maxPrice?: number, minRating?: number, sortBy?: MarketplaceSortBy,
  // False while a caller is still resolving something the fetch depends on
  // (e.g. a category slug → id lookup) — skips the request entirely and
  // stays in a loading state, instead of firing once unfiltered and again
  // a moment later once the real filter value is known.
  enabled = true,
  format?: 'course' | 'live_class',
) {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    if (!enabled) { setLoading(true); return; }
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGetAllProducts(page, limit, categoryId, productType, educationLevel, normalizedCustomLevel, campaignId, minPrice, maxPrice, minRating, sortBy, format)
      .then(res => {
        if (!cancelled) {
          setProducts(res.data?.products ?? []);
          setTotal(res.data?.total ?? 0);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load products.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, categoryId, productType, educationLevel, normalizedCustomLevel, campaignId, minPrice, maxPrice, minRating, sortBy, enabled, format, reloadKey]);

  return { products, total, loading, error, refetch };
}
