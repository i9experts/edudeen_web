import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

/**
 * Generic data-fetching hook shared by every analytics endpoint (admin + seller) — one
 * `{data, loading, error, refetch}` loader instead of duplicating the same
 * useEffect/useState wiring per endpoint (mirrors the pattern already used in
 * `useAdminFaqs`/`useGetStore`, generalized over the fetcher + params).
 *
 * `live`: topics that make the data re-read by itself when something changes anywhere (see useLiveRefresh).
 * A live re-read is quiet: what is on screen stays put until the fresh data lands, and a failed live
 * re-read never replaces good data with an error. Leave it out for expensive / rarely-changing endpoints.
 */
export function useAnalyticsQuery<TData, TParams extends object>(
  fetcher: (params: TParams) => Promise<{ data: TData }>,
  params: TParams,
  live?: readonly string[],
) {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Params are plain filter objects rebuilt every render — key on their JSON
  // shape so the effect only re-runs when the actual filter values change.
  const paramsKey = JSON.stringify(params);

  const run = useCallback((quiet: boolean) => {
    if (!quiet) { setLoading(true); setError(''); }
    return fetcher(params)
      .then(res => { setData(res.data); if (quiet) setError(''); })
      .catch((err: unknown) => { if (!quiet) setError(err instanceof Error ? err.message : 'Failed to load analytics.'); })
      .finally(() => { if (!quiet) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  const load = useCallback(() => run(false), [run]);

  useEffect(() => { load(); }, [load]);

  const runRef = useRef(run);
  runRef.current = run;
  useLiveRefresh(live ?? [], () => { void runRef.current(true); }, !!live?.length);

  return { data, loading, error, refetch: load };
}
