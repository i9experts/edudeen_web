import { useState } from 'react';
import { Button, Modal, Textarea } from '@/components/comman/ui';

/**
 * Confirmation step for a bulk admin action (approve / reject N items). The action itself is run by `runBulk`
 * (one request per item through the same gate as the single action), so this only collects the confirmation and,
 * for a rejection, the written reason that every selected item gets.
 */
export function BulkDecisionModal({
  title, message, items, requireReason, reasonLabel = 'Reason (required)', confirmLabel, danger, busy, progress, error, onConfirm, onClose,
}: {
  title: string;
  message: string;
  items: string[];
  requireReason?: boolean;
  reasonLabel?: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  progress?: { done: number; total: number } | null;
  error?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const needsReason = !!requireReason && reason.trim().length < 3;
  return (
    <Modal mobileSheet title={title} onClose={() => { if (!busy) onClose(); }}
      footer={<>
        <Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy} disabled={needsReason} onClick={() => onConfirm(reason.trim())}>{confirmLabel}</Button>
      </>}>
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-charcoal leading-[1.6] m-0">{message}</p>
        <div className="bg-cream border border-bone rounded-lg px-3 py-2 text-[12.5px] text-carbon">
          <b>{items.length} item{items.length === 1 ? '' : 's'}</b>
          <ul className="m-0 mt-1 ps-4 list-disc text-slate">
            {items.slice(0, 5).map((t, i) => <li key={i} className="truncate">{t}</li>)}
            {items.length > 5 && <li>+{items.length - 5} more</li>}
          </ul>
        </div>
        <p className="text-[12px] text-slate m-0">Each item is processed on its own, exactly like the single action: one that fails (or needs a second person's approval) does not stop the others.</p>
        {requireReason && <Textarea label={reasonLabel} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
        {busy && progress && <p role="status" className="text-[12.5px] text-carbon m-0">Working… {progress.done} of {progress.total}</p>}
        {error && <p role="alert" className="text-[12px] text-error m-0">{error}</p>}
      </div>
    </Modal>
  );
}
