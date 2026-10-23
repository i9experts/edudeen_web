/**
 * Runs one admin action per item, ONE AT A TIME, through the same API call the single action uses - so every item
 * passes the same gates (staff rights, two-person approval, password re-confirmation, atomic status checks) and one
 * failure never blocks the rest. Nothing here talks to the server in bulk.
 *
 *  - `waiting`: the server did not run the action but turned it into an approval request (staff, two-person rule).
 *  - `stopped`: the run was cut short (password prompt cancelled, rights/approval gate said no for everything, session
 *    expired). Remaining items are returned untouched in `skipped` so the admin can see exactly what did not run.
 */
export interface BulkResult<T> {
  ok: T[];
  waiting: T[];
  failed: { item: T; message: string }[];
  skipped: T[];
  stopped: string | null;
}

/** Errors after which trying the next item is pointless (same answer for all). */
export function isStopError(err: unknown): string | null {
  const e = err as { response?: { status?: number; data?: { code?: string; message?: string } }; message?: string };
  const code = e?.response?.data?.code;
  const status = e?.response?.status;
  if (code === 'REAUTH_REQUIRED') return 'Password confirmation was cancelled or refused.';
  if (code === 'STAFF_FORBIDDEN' || code === 'STAFF_BLOCKED' || code === 'STAFF_OUTSIDE_ACCESS_WINDOW') return e?.response?.data?.message ?? 'You do not have access to this action.';
  if (status === 401) return 'Your session ended. Sign in again.';
  if (status === 429) return 'Too many requests - wait a moment and try again.';
  return null;
}

export function errorMessage(err: unknown): string {
  const e = err as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = e?.response?.data?.message;
  return (Array.isArray(m) ? m.join(', ') : m) ?? e?.message ?? 'Failed';
}

export async function runBulk<T>(
  items: T[],
  action: (item: T) => Promise<unknown>,
  opts: { onProgress?: (done: number, total: number) => void } = {},
): Promise<BulkResult<T>> {
  const res: BulkResult<T> = { ok: [], waiting: [], failed: [], skipped: [], stopped: null };
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const out = await action(item) as { approvalRequired?: boolean; data?: { approvalRequired?: boolean } } | undefined;
      if (out?.approvalRequired || out?.data?.approvalRequired) res.waiting.push(item);
      else res.ok.push(item);
    } catch (err) {
      const stop = isStopError(err);
      if (stop) { res.stopped = stop; res.skipped.push(...items.slice(i)); opts.onProgress?.(items.length, items.length); return res; }
      res.failed.push({ item, message: errorMessage(err) });
    }
    opts.onProgress?.(i + 1, items.length);
  }
  return res;
}

/** One-line summary for the result banner, e.g. "3 done, 1 waiting for approval, 2 failed (A, B) - run stopped: ...". */
export function bulkSummary<T>(r: BulkResult<T>, label: (t: T) => string, verb = 'done'): string {
  const parts = [`${r.ok.length} ${verb}`];
  if (r.waiting.length) parts.push(`${r.waiting.length} sent for approval`);
  if (r.failed.length) parts.push(`${r.failed.length} failed (${r.failed.slice(0, 3).map((f) => `${label(f.item)}: ${f.message}`).join('; ')}${r.failed.length > 3 ? '…' : ''})`);
  if (r.skipped.length) parts.push(`${r.skipped.length} not attempted`);
  return parts.join(', ') + (r.stopped ? ` - stopped: ${r.stopped}` : '.');
}
