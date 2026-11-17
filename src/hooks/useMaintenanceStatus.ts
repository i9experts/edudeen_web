import { useEffect, useSyncExternalStore } from 'react';
import { apiGetMaintenanceStatus, type MaintenanceStatus } from '@/api/services/maintenance';

// One shared poller for the whole app: the notice banner, the maintenance page and
// every feature gate read the same status instead of each fetching their own.
let current: MaintenanceStatus | null = null;
const listeners = new Set<() => void>();
let timer: number | null = null;
let intervalMs = 60_000;

const emit = () => listeners.forEach(l => l());
let lastLoad = 0;
let inflight = false;
// Never two requests at once, never a repeat within 10 s (a remount / restart of the timer reuses the fresh answer),
// and no background polling while the tab is hidden.
const load = (force = false) => {
  if (inflight || (!force && (Date.now() - lastLoad < 10_000 || document.visibilityState === 'hidden'))) return;
  inflight = true;
  apiGetMaintenanceStatus()
    .then(r => { current = r.data; emit(); })
    .catch(() => {})
    .finally(() => { inflight = false; lastLoad = Date.now(); });
};

function start(ms: number) {
  if (timer !== null && ms >= intervalMs) return;
  if (timer !== null) window.clearInterval(timer);
  intervalMs = Math.min(ms, intervalMs);
  load(current === null);
  timer = window.setInterval(() => load(), intervalMs);
}

/** Public maintenance status (cheap cached read), refreshed in the background so pages react without a reload. */
export function useMaintenanceStatus(pollMs = 60_000): MaintenanceStatus | null {
  useEffect(() => {
    start(pollMs);
    return () => {
      // Stop polling once nobody is watching.
      if (listeners.size === 0 && timer !== null) { window.clearInterval(timer); timer = null; intervalMs = 60_000; }
    };
  }, [pollMs]);
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => current,
  );
}
