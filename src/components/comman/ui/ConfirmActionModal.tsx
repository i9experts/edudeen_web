import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmActionModalProps {
  title: string;
  /** Short sentence under the title area. */
  message?: ReactNode;
  /** Label / value rows (amount, destination ...). */
  details?: { label: string; value: ReactNode }[];
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Plain "are you sure" dialog; the confirm button is disabled while `busy`. */
export function ConfirmActionModal({ title, message, details, confirmLabel, danger, busy, error, onConfirm, onClose }: ConfirmActionModalProps) {
  return (
    <Modal
      mobileSheet
      title={title}
      onClose={() => { if (!busy) onClose(); }}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy} disabled={busy}>{confirmLabel}</Button>
        </>
      }
    >
      {message && <p className="text-[13px] text-slate mt-0 mb-3">{message}</p>}
      {details && details.length > 0 && (
        <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-[13px] m-0">
          {details.map((d) => (
            <div key={d.label} className="contents">
              <dt className="text-slate">{d.label}</dt>
              <dd className="m-0 font-medium break-words">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {error && <p role="alert" className="text-[12px] text-error mt-3 mb-0">{error}</p>}
    </Modal>
  );
}
