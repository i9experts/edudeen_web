import { useCallback, useRef, useState } from 'react';
import { bulkSummary, runBulk, type BulkResult } from '@/utils/bulkRun';
import { refreshAdminBadges } from '@/hooks/admin/useAdminBadges';

/** State around `runBulk` for an admin list: busy flag, progress, and the result line (kept until the next run). */
export function useBulkRunner<T>(label: (item: T) => string) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState('');
  const labelRef = useRef(label);
  labelRef.current = label;
  const running = useRef(false);

  const run = useCallback(async (items: T[], action: (item: T) => Promise<unknown>, verb: string): Promise<BulkResult<T> | null> => {
    if (running.current || items.length === 0) return null; // a double click must not start a second run
    running.current = true;
    setBusy(true); setMessage(''); setProgress({ done: 0, total: items.length });
    try {
      const res = await runBulk(items, action, { onProgress: (done, total) => setProgress({ done, total }) });
      setMessage(bulkSummary(res, labelRef.current, verb));
      void refreshAdminBadges(); // sidebar queue counts change after a bulk decision
      return res;
    } finally {
      running.current = false;
      setBusy(false); setProgress(null);
    }
  }, []);

  return { busy, progress, message, setMessage, run };
}
