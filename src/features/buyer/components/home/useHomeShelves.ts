import { useEffect, useState } from 'react';
import { apiGetBestsellers, apiGetFreeResources, type MarketplaceProduct } from '@/api/services/marketplace';
import { apiGetPublicBundles, type PublicBundle } from '@/api/services/classroom';

export interface Shelf<T> { items: T[]; loading: boolean }
export type FreeProduct = MarketplaceProduct & { freeKind?: 'free' | 'sample' };

function useShelf<T>(load: () => Promise<T[]>): Shelf<T> {
  const [state, setState] = useState<Shelf<T>>({ items: [], loading: true });
  useEffect(() => {
    let cancelled = false;
    load()
      .then(items => { if (!cancelled) setState({ items, loading: false }); })
      // A failed shelf is simply not shown (same as "no data"); nothing else on the page depends on it.
      .catch(() => { if (!cancelled) setState({ items: [], loading: false }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

/** The three home shelves that have their own endpoints. Each loads once per visit; the API caches the ids for 10 minutes. */
export function useHomeShelves() {
  // 24 candidates each: the page de-duplicates across sections and then shows the first few of what is left.
  const bestsellers = useShelf<MarketplaceProduct>(() => apiGetBestsellers(24).then(r => r.data?.products ?? []));
  const free = useShelf<FreeProduct>(() => apiGetFreeResources(24).then(r => r.data?.products ?? []));
  const bundles = useShelf<PublicBundle>(() => apiGetPublicBundles(6).then(r => r.data ?? []));
  return { bestsellers, free, bundles };
}
