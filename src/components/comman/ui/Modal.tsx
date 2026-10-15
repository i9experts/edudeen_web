import { X } from 'lucide-react';
import { useId, type CSSProperties, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { DialogShell } from './DialogShell';

export interface ModalProps {
  title:    string;
  onClose:  () => void;
  children: ReactNode;
  footer?:  ReactNode;
  width?:   number;
  /** Renders as a native-app bottom sheet below `sm` (full-width, rounded top
   *  only, slides up) instead of the default centered dialog — stays a
   *  normal centered modal at `sm` and up either way. Off by default so
   *  every existing Modal caller keeps its current look unchanged. */
  mobileSheet?: boolean;
}

export function Modal({ title, onClose, children, footer, width = 440, mobileSheet = false }: ModalProps) {
  const titleId = useId();

  const style: CSSProperties = mobileSheet
    ? { '--modal-w': `${width}px` } as CSSProperties
    : { maxWidth: width };

  return (
    <DialogShell
      onClose={onClose}
      align={mobileSheet ? 'bottom-mobile' : 'center'}
      ariaLabelledBy={titleId}
      className={clsx('max-h-[90vh]', mobileSheet && 'max-w-full sm:max-w-[var(--modal-w)]')}
      style={style}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-bone shrink-0">
        <p id={titleId} className="text-subheading font-semibold text-carbon">{title}</p>
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="w-7 h-7 max-sm:w-10 max-sm:h-10 -me-1 flex items-center justify-center rounded-lg bg-transparent border-0 cursor-pointer text-slate hover:bg-fog"
        >
          <X size={16} />
        </button>
      </div>

      <div className="px-5 py-4 overflow-y-auto">{children}</div>

      {footer && (
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-bone shrink-0">
          {footer}
        </div>
      )}
    </DialogShell>
  );
}
