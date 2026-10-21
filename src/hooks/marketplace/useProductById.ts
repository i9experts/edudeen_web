import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGetProductById, type MarketplaceProduct, type ProductVariant } from '@/api/services/marketplace';

interface ProductDetail {
  product:        MarketplaceProduct & { sellerName: string };
  variants:       ProductVariant[];
  defaultVariant: ProductVariant;
}

export function useProductById(id: string) {
  const [detail,  setDetail]  = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadedIdRef = useRef(id);

  const refetch = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    // Different product: drop the previous one so the page never shows (or canonicalises to) stale data.
    if (loadedIdRef.current !== id) { setDetail(null); loadedIdRef.current = id; }
    setLoading(true);
    setError('');
    setNotFound(false);
    apiGetProductById(id)
      .then(res => {
        if (cancelled) return;
        // The API answers an unknown/hidden product with 200 { success:false, data:null }.
        if (!res?.data?.product) { setDetail(null); setNotFound(true); return; }
        setDetail(res.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if ((err as { response?: { status?: number } })?.response?.status === 404) { setDetail(null); setNotFound(true); return; }
        setError(err instanceof Error ? err.message : 'Failed to load product.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, reloadKey]);

  return { detail, loading, error, notFound, refetch };
}
