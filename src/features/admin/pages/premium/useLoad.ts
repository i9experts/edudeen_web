import { useCallback, useEffect, useState } from 'react';

/** Minimal loader: runs `fn` on mount / when deps change, exposes loading + error + refetch. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const refetch = useCallback(() => {
    setLoading(true);
    setError('');
    return run()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [run]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}

export function money(n: number, currency = 'USD') {
  return `${currency === 'USD' ? '$' : `${currency} `}${n.toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function fmtDate(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—';
}

export function fmtDateTime(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}
