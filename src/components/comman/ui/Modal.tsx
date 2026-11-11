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
  /** With mobileSheet: fill the whole screen height on phones (detail drawers). */
  fullHeightMobile?: boolean;
  /** Detail drawer: full-screen sheet below sm, a right-edge panel (full height, slides in) from sm up. */
  drawer?: boolean;
}

export function Modal({ title, onClose, children, footer, width = 440, mobileSheet = false, fullHeightMobile = false, drawer = false }: ModalProps) {
  const titleId = useId();

  const style: CSSProperties = mobileSheet || drawer
    ? { '--modal-w': `${width}px` } as CSSProperties
    : { maxWidth: width };

  return (
    <DialogShell
      onClose={onClose}
      align={drawer ? 'end-mobile' : mobileSheet ? 'bottom-mobile' : 'center'}
      ariaLabelledBy={titleId}
      className={clsx(drawer ? 'max-sm:h-[100dvh] max-sm:max-h-[100dvh] sm:max-h-[100dvh] sm:max-w-[var(--modal-w)]' : 'max-h-[90vh]', mobileSheet && !drawer && 'max-w-full sm:max-w-[var(--modal-w)]', mobileSheet && fullHeightMobile && 'max-sm:h-[100dvh] max-sm:max-h-[100dvh]')}
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

      <div className="px-5 py-4 overflow-y-auto min-h-0 flex-1">{children}</div>

      {footer && (
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-bone shrink-0">
          {footer}
        </div>
      )}
    </DialogShell>
  );
}
