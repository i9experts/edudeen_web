import { useCallback, useEffect, useState } from 'react';

interface ResourceState<T> {
  data:    T | null;
  loading: boolean;
  error:   string;
}

// A tiny shared-cache/request-dedup primitive: every component calling the hook
// this factory returns shares one in-flight request and one cached result,
// instead of each mount independently re-fetching the same global resource
// (e.g. "my profile", "my stores") on its own.
export function createSharedResource<T>(fetcher: () => Promise<T>) {
  let cache: T | null      = null;
  let hasFetched           = false;
  let inflight: Promise<T> | null = null;
  const listeners = new Set<(state: ResourceState<T>) => void>();

  function currentState(loading: boolean, error = ''): ResourceState<T> {
    return { data: cache, loading, error };
  }

  function notify(state: ResourceState<T>) {
    listeners.forEach(l => l(state));
  }

  function load(force = false): Promise<T> {
    if (!force && hasFetched && cache !== null) return Promise.resolve(cache);
    if (!force && inflight) return inflight;

    notify(currentState(true));
    inflight = fetcher()
      .then(result => {
        cache = result;
        hasFetched = true;
        inflight = null;
        notify(currentState(false));
        return result;
      })
      .catch((err: unknown) => {
        inflight = null;
        notify(currentState(false, err instanceof Error ? err.message : 'Failed to load.'));
        throw err;
      });
    return inflight;
  }

  function invalidate() {
    cache = null;
    hasFetched = false;
    inflight = null;
  }

  function useSharedResource() {
    const [state, setState] = useState<ResourceState<T>>(() => currentState(!hasFetched && !inflight));

    useEffect(() => {
      listeners.add(setState);
      load().catch(() => {});
      return () => { listeners.delete(setState); };
    }, []);

    const refetch = useCallback(() => { load(true).catch(() => {}); }, []);

    return { ...state, refetch };
  }

  /** Force a reload and push the result to every mounted subscriber. */
  function refresh() { load(true).catch(() => {}); }

  return { useSharedResource, invalidate, refresh };
}
