import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { subscribeLive } from '@/api/realtime';
import { apiStoreDashboardSummary, apiStoreActionItems, type ActionItems, type StoreDashboardSummary } from '@/api/services/storeDashboard';

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
    .then(res => {
      setState(storeId, { data: res.data, loading: false, error: '' });
      // Feed the light Action-required copy (undefined = older API without actionItems: leave it to the light call).
      if (res.data?.actionItems !== undefined) setLight(storeId, { items: res.data.actionItems, loading: false, error: res.data.actionItems === null ? COUNTS_ERROR : '' });
    })
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

/**
 * Set the unread-chats count in the shared summary right away (absolute value, never a decrement, so a socket echo
 * or a repeat call cannot double-count), then re-read quietly so the server stays the final word.
 */
export function setSharedUnreadMessages(storeId: string, count: number | ((current: number) => number), refetchQuietly = true) {
  const cur = states.get(storeId);
  const raw = typeof count === 'function' ? count(cur?.data?.actionItems?.unreadMessages ?? 0) : count;
  const n = Math.max(0, Math.floor(raw));
  if (cur?.data?.actionItems && cur.data.actionItems.unreadMessages !== n) {
    setState(storeId, { ...cur, data: { ...cur.data, actionItems: { ...cur.data.actionItems, unreadMessages: n } } });
  }
  const light = lights.get(storeId);
  if (light?.items && light.items.unreadMessages !== n) setLight(storeId, { ...light, items: { ...light.items, unreadMessages: n } });
  if (refetchQuietly) { if (states.has(storeId)) load(storeId, true); else if (lights.has(storeId)) loadLight(storeId); }
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

// ── Light copy of ONLY the Action-required counts (GET /action-items) ─────────────────────────────────────────────
// Every store page needs these for the sidebar badges, but only the Dashboard needs the heavy summary. When the summary
// is loaded (Dashboard open) it feeds this copy, so the Dashboard still makes just one summary request.
interface LightState { items: ActionItems | null; loading: boolean; error: string }
const LIGHT_EMPTY: LightState = { items: null, loading: true, error: '' };
const COUNTS_ERROR = 'Could not load your to-do list.';
const lights = new Map<string, LightState>();
const lightListeners = new Map<string, Set<() => void>>();
const lightUnsubs = new Map<string, () => void>();
const lightInflight = new Set<string>();

function setLight(storeId: string, next: LightState) {
  lights.set(storeId, next);
  lightListeners.get(storeId)?.forEach(l => l());
}

function loadLight(storeId: string) {
  if (lightInflight.has(storeId)) return;
  lightInflight.add(storeId);
  apiStoreActionItems(storeId)
    .then(res => {
      const items = res.data?.actionItems ?? null;
      setLight(storeId, { items, loading: false, error: items === null ? COUNTS_ERROR : '' });
    })
    .catch(err => {
      const prev = lights.get(storeId) ?? LIGHT_EMPTY;
      // A failed quiet re-read keeps the numbers already on screen.
      setLight(storeId, prev.items ? { ...prev, loading: false } : { ...prev, loading: false, error: err instanceof Error ? err.message : COUNTS_ERROR });
    })
    .finally(() => { lightInflight.delete(storeId); });
}

function subscribeLight(storeId: string, onChange: () => void) {
  let set = lightListeners.get(storeId);
  if (!set) lightListeners.set(storeId, (set = new Set()));
  set.add(onChange);
  if (set.size === 1) {
    // While the full summary is subscribed it re-reads (and feeds this copy); otherwise this light call does.
    lightUnsubs.set(storeId, subscribeLive(LIVE_TOPICS, () => { if (!listeners.get(storeId)?.size) loadLight(storeId); }));
  }
  return () => {
    set!.delete(onChange);
    if (set!.size === 0) { lightUnsubs.get(storeId)?.(); lightUnsubs.delete(storeId); lightListeners.delete(storeId); }
  };
}

/** The "Action required" counts. Own light request; reuses the summary's copy when the Dashboard has loaded it. */
export function useStoreActionItems(storeId: string): {
  items: ActionItems | null; loading: boolean; error: string; refetch: () => void;
} {
  const snap = useSyncExternalStore(
    useCallback(cb => (storeId ? subscribeLight(storeId, cb) : () => {}), [storeId]),
    () => (storeId ? lights.get(storeId) ?? LIGHT_EMPTY : LIGHT_EMPTY),
    () => LIGHT_EMPTY,
  );
  useEffect(() => {
    if (storeId && !lights.has(storeId)) loadLight(storeId);
  }, [storeId]);
  const refetch = useCallback(() => { if (storeId) { setLight(storeId, { ...(lights.get(storeId) ?? LIGHT_EMPTY), loading: true, error: '' }); loadLight(storeId); } }, [storeId]);
  return { items: snap.items, loading: snap.loading && !snap.items, error: snap.error, refetch };
}
