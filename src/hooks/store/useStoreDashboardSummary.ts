import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { subscribeLive } from '@/api/realtime';
import { apiStoreDashboardSummary, type ActionItems, type StoreDashboardSummary } from '@/api/services/storeDashboard';

/**
 * ONE shared copy of GET /api/store/:id/dashboard-summary per store: the dashboard page, the "Action required"
 * card and the sidebar badges all read it, so there is a single request and a single live subscription.
 * Live changes re-read quietly (no skeleton, old data stays on screen until the new data arrives).
 */
export interface DashboardSummaryState {
  data: StoreDashboardSummary | null;
  loading: boolean;
  error: string;
}

const LIVE_TOPICS = ['orders', 'catalog', 'finance', 'reviews', 'returns', 'messaging', 'messages', 'product-questions'];
const EMPTY: DashboardSummaryState = { data: null, loading: true, error: '' };

const states = new Map<string, DashboardSummaryState>();
const listeners = new Map<string, Set<() => void>>();
const unsubs = new Map<string, () => void>();
const inflight = new Set<string>();
const again = new Set<string>();

function setState(storeId: string, next: DashboardSummaryState) {
  states.set(storeId, next);
  listeners.get(storeId)?.forEach(l => l());
}

function load(storeId: string, quiet: boolean) {
  if (inflight.has(storeId)) { again.add(storeId); return; }   // coalesce bursts of live events
  inflight.add(storeId);
  const cur = states.get(storeId) ?? EMPTY;
  if (!quiet) setState(storeId, { ...cur, loading: true, error: '' });
  apiStoreDashboardSummary(storeId)
    .then(res => setState(storeId, { data: res.data, loading: false, error: '' }))
    .catch(err => {
      const prev = states.get(storeId) ?? EMPTY;
      // A quiet re-read that fails keeps what is on screen; only a user-visible load shows the error.
      setState(storeId, quiet && prev.data
        ? { ...prev, loading: false }
        : { ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load store metrics.' });
    })
    .finally(() => {
      inflight.delete(storeId);
      if (again.delete(storeId)) load(storeId, true);
    });
}

function subscribe(storeId: string, onChange: () => void) {
  let set = listeners.get(storeId);
  if (!set) listeners.set(storeId, (set = new Set()));
  set.add(onChange);
  if (set.size === 1) {
    unsubs.set(storeId, subscribeLive(LIVE_TOPICS, () => load(storeId, true)));
  }
  return () => {
    set!.delete(onChange);
    if (set!.size === 0) {
      unsubs.get(storeId)?.();
      unsubs.delete(storeId);
      listeners.delete(storeId);
    }
  };
}

export function useStoreDashboardSummary(storeId: string) {
  const snapshot = useSyncExternalStore(
    useCallback(cb => (storeId ? subscribe(storeId, cb) : () => {}), [storeId]),
    () => (storeId ? states.get(storeId) ?? EMPTY : EMPTY),
    () => EMPTY,
  );
  // First consumer for a store triggers the single load (later mounts reuse the data).
  useEffect(() => {
    if (storeId && !states.has(storeId)) load(storeId, false);
  }, [storeId]);
  const refetch = useCallback(() => { if (storeId) load(storeId, false); }, [storeId]);
  return { ...snapshot, loading: snapshot.loading && !snapshot.data, refetch };
}

/** The "Action required" counts from the same shared summary (no extra request). */
export function useStoreActionItems(storeId: string): {
  items: ActionItems | null; loading: boolean; error: string; refetch: () => void;
} {
  const { data, loading, error, refetch } = useStoreDashboardSummary(storeId);
  const items = data?.actionItems ?? null;
  // null = the API could not compute the counts this time -> error with Retry (undefined = older API: card just hides).
  return { items, loading, error: error || (data?.actionItems === null ? 'Could not load your to-do list.' : ''), refetch };
}
