import { useCallback } from 'react';
import { useSearchParams, type NavigateOptions } from 'react-router-dom';

// Filter state that lives in the URL (shareable, survives reload / back), without new UI.
// Several setters called in the same tick (e.g. `setStatus(v); setPage(1)`) are merged into ONE
// replace-navigation, and every other query param (like ?tab=) is kept.
type SetParams = (p: URLSearchParams, o?: NavigateOptions) => void;
let pending: URLSearchParams | null = null;

function queue(base: URLSearchParams, setParams: SetParams, mutate: (p: URLSearchParams) => void) {
  if (!pending) {
    pending = new URLSearchParams(base);
    queueMicrotask(() => {
      const next = pending;
      pending = null;
      if (next) setParams(next, { replace: true });
    });
  }
  mutate(pending);
}

/** A string filter stored as `?key=value`; `def` is the value when the param is absent (and is never written). */
export function useUrlParam(key: string, def = ''): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? def;
  const set = useCallback((v: string) => {
    queue(params, setParams as SetParams, p => { if (v === def) p.delete(key); else p.set(key, v); }); // '' is written as ?key= when the default is not ''
  }, [params, setParams, key, def]);
  return [value, set];
}

/** The `?page=` number (1 = no param). */
export function useUrlPage(key = 'page'): [number, (n: number) => void] {
  const [params, setParams] = useSearchParams();
  const n = Number(params.get(key));
  const page = Number.isInteger(n) && n >= 1 && n <= 100000 ? n : 1;
  const set = useCallback((next: number) => {
    queue(params, setParams as SetParams, p => { if (next <= 1) p.delete(key); else p.set(key, String(next)); });
  }, [params, setParams, key]);
  return [page, set];
}
