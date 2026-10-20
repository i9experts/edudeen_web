import { lazy, type ComponentType } from 'react';

const FLAG = 'edudeen:chunk-reload';
const isChunkError = (e: unknown) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i
    .test(String((e as { message?: string })?.message ?? e));

/** One hard reload per tab session after a stale-chunk failure (guarded so it can never loop). */
export function reloadOnceForStaleChunk(): boolean {
  try {
    if (sessionStorage.getItem(FLAG)) return false;
    sessionStorage.setItem(FLAG, String(Date.now()));
  } catch { return false; }
  window.location.reload();
  return true;
}

/** Clear the guard once the app has loaded fine for a while, so a later deploy can reload again. */
export function armChunkReloadGuardReset() {
  window.setTimeout(() => { try { sessionStorage.removeItem(FLAG); } catch { /* ignore */ } }, 10000);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- same constraint as React.lazy
export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() => factory().catch((e) => {
    if (isChunkError(e) && reloadOnceForStaleChunk()) return new Promise<never>(() => { /* page is reloading */ });
    throw e;
  }));
}
