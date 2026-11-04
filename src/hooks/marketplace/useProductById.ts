import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { apiGetProductById, type MarketplaceProduct, type ProductVariant } from '@/api/services/marketplace';

interface ProductDetail {
  product:        MarketplaceProduct & { sellerName: string };
  variants:       ProductVariant[];
  defaultVariant: ProductVariant;
}

// Last answer per product, so a repeat visit paints at once while a quiet re-read brings price/stock up to date.
const SEEN_TTL_MS = 10 * 60 * 1000;
const SEEN_MAX = 30;
const seen = new Map<string, { at: number; detail: ProductDetail }>();
function readSeen(id: string): ProductDetail | null {
  const hit = seen.get(id);
  return hit && Date.now() - hit.at < SEEN_TTL_MS ? hit.detail : null;
}
function writeSeen(id: string, detail: ProductDetail) {
  seen.delete(id);
  seen.set(id, { at: Date.now(), detail });
  if (seen.size > SEEN_MAX) seen.delete(seen.keys().next().value as string);
}

/** Start the fetch early (router loader / link hover); the hook below shares the same in-flight request. */
export function prefetchProduct(id: string | undefined) {
  if (id && !readSeen(id)) apiGetProductById(id).catch(() => { /* the page shows its own error */ });
}

export function useProductById(id: string) {
  const [detail,  setDetail]  = useState<ProductDetail | null>(() => (id ? readSeen(id) : null));
  const [loading, setLoading] = useState(() => !(id && readSeen(id)));
  const [error,   setError]   = useState('');
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadedIdRef = useRef(id);

  const refetch = useCallback(() => setReloadKey(k => k + 1), []);
  // Price / stock / sale / reviews changed (or the listing was removed): re-read quietly, the page stays as it is meanwhile.
  const quietRef = useRef(false);
  useLiveRefresh(['catalog', 'campaigns', 'reviews'], () => { quietRef.current = true; setReloadKey(k => k + 1); }, !!id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const cached = readSeen(id);
    const quiet = (quietRef.current && loadedIdRef.current === id) || !!cached;
    quietRef.current = false;
    // Different product: drop the previous one (or show this one's last answer) so the page never shows stale data of another listing.
    if (loadedIdRef.current !== id) { setDetail(cached); loadedIdRef.current = id; }
    if (!quiet) {
      setLoading(true);
      setError('');
      setNotFound(false);
    } else if (cached) {
      setLoading(false);
      setNotFound(false);
    }
    apiGetProductById(id)
      .then(res => {
        if (cancelled) return;
        // The API answers an unknown/hidden product with 200 { success:false, data:null }.
        if (!res?.data?.product) { seen.delete(id); setDetail(null); setNotFound(true); return; }
        writeSeen(id, res.data);
        setDetail(res.data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if ((err as { response?: { status?: number } })?.response?.status === 404) { seen.delete(id); setDetail(null); setNotFound(true); return; }
        if (!quiet) setError(err instanceof Error ? err.message : 'Failed to load product.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, reloadKey]);

  return { detail, loading, error, notFound, refetch };
}
