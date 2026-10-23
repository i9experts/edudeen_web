import { useCallback, useRef, useState } from 'react';

/**
 * Wraps an async action so it cannot run twice at once (ref guard: a double click in the same
 * tick is ignored) and exposes `busy` + `error` for the button / dialog.
 * `run` resolves to the action's result, or undefined when it was skipped or failed.
 */
export function useBusyAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lock.current) return undefined;
    lock.current = true; setBusy(true); setError('');
    try { return await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); return undefined; }
    finally { lock.current = false; setBusy(false); }
  }, []);
  return { run, busy, error, setError };
}
