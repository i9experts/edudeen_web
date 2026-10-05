import { useState, useEffect, useCallback } from 'react';
import {
  apiGetBanners, apiGetBannerCount, SELECTABLE_PROMOTION_PLACEMENTS, type Banner, type BannerCountData,
} from '@/api/services/banner';

export function useAdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const refetch = useCallback(() => {
    setLoading(true);
    return apiGetBanners()
      .then(res => setBanners(res.data ?? []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load banners.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { banners, loading, error, refetch };
}

/** Active-banner count vs. the visible (rotating) limit for every selectable
 *  placement — the endpoint answers one placement per call. A failed lookup
 *  is just left out (this only drives an advisory warning). */
export function useBannerCount(refreshKey: number) {
  const [counts, setCounts] = useState<BannerCountData[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(SELECTABLE_PROMOTION_PLACEMENTS.map(p => apiGetBannerCount(p)))
      .then(results => {
        if (cancelled) return;
        setCounts(results.flatMap(r => (r.status === 'fulfilled' && r.value?.data ? [r.value.data] : [])));
      });
    return () => { cancelled = true; };
  }, [refreshKey]);

  return counts;
}
