import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGetStoreInventory, type InventoryProduct } from '@/api/services/product';

/** Returns `value` once it has stopped changing for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface Options {
  /** Page size (backend caps it at 100). */
  limit?:   number;
  status?:  'active' | 'draft' | 'archived';
  /** Skip loading entirely (e.g. while a modal is closed). */
  enabled?: boolean;
}

/**
 * Search-as-you-type product source for seller pickers: loads the first page
 * of the store's inventory, then re-queries the server (`?q=` name/SKU) as the
 * seller types, so products beyond the first page can still be picked.
 */
export function useInventorySearch(storeId: string | undefined, { limit = 50, status, enabled = true }: Options = {}) {
  const [query, setQuery]       = useState('');
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const debounced = useDebouncedValue(query.trim(), 300);
  const requestId = useRef(0);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt(n => n + 1), []);

  useEffect(() => {
    if (!storeId || !enabled) return;
    const thisRequest = ++requestId.current;
    // Aborts the previous request when the query changes (cleanup) and gives up after 15 s.
    const ctrl = new AbortController();
    setLoading(true);
    setError('');
    apiGetStoreInventory(storeId, 1, limit, { status, q: debounced }, ctrl.signal)
      .then(res => {
        if (requestId.current !== thisRequest) return;
        setProducts(res.data?.products ?? []);
        setTotal(res.data?.pagination?.totalProducts ?? 0);
      })
      .catch(() => {
        if (ctrl.signal.aborted || requestId.current !== thisRequest) return; // superseded, not a failure
        setProducts([]);
        setError("Couldn't load your products");
      })
      .finally(() => { if (requestId.current === thisRequest) setLoading(false); });
    return () => ctrl.abort();
  }, [storeId, limit, status, enabled, debounced, attempt]);

  return { query, setQuery, products, total, loading, error, retry, searching: debounced.length > 0 };
}
