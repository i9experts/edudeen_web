import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { useFocusTrap } from './useFocusTrap';

export interface DialogShellProps {
  onClose: () => void;
  children: ReactNode;
  /** 'center' (default) for a typical modal; 'top' for an overlay that should
   *  sit near the top of the viewport (e.g. a command palette); 'bottom' for
   *  a native-app-style action sheet anchored to the bottom edge, full-width,
   *  rounded only on top, on every screen size; 'bottom-mobile' for the same
   *  sheet treatment only below `sm` — centered like 'center' at `sm` and up. */
  align?: 'center' | 'top' | 'bottom' | 'bottom-mobile' | 'end-mobile';
  /** Applied to the dialog panel itself (width/max-height/etc.) — the shell only owns backdrop + positioning + focus trap. */
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  /** Extra keydown handling on the dialog panel itself (e.g. arrow-key navigation) — on top of the Escape-to-close the focus trap already provides. */
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * The backdrop + centered/near-top panel + focus-trap wiring shared by every
 * modal-style overlay (Modal, CommandPalette, DateTimePickerModal) — each of
 * those previously reimplemented this exact shell independently. Callers
 * still own their own header/body/footer markup via `children`.
 */
export function DialogShell({ onClose, children, align = 'center', className, style, ariaLabel, ariaLabelledBy, onKeyDown }: DialogShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);

  return (
    <div
      className={clsx(
        'fixed inset-0 z-[9999] flex justify-center',
        align === 'bottom'        ? 'items-end p-0'
        : align === 'bottom-mobile' ? 'items-end sm:items-center p-0 sm:p-4'
        : align === 'end-mobile'    ? 'items-end sm:items-stretch sm:justify-end p-0'
        : align === 'top'          ? 'items-start p-4 pt-[12vh]'
        :                             'items-center p-4',
      )}
    >
      <div className="dialog-overlay-enter absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        style={style}
        className={clsx(
          'relative flex flex-col w-full bg-white border-bone overflow-hidden outline-none',
          align === 'bottom'
            ? 'sheet-panel-enter rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)]'
            : align === 'bottom-mobile'
              ? 'sheet-panel-enter rounded-t-2xl sm:rounded-2xl border-t sm:border pb-[env(safe-area-inset-bottom)] sm:pb-0'
              : align === 'end-mobile'
              ? 'sheet-panel-enter rounded-t-2xl sm:rounded-none sm:rounded-s-2xl border-t sm:border-t-0 sm:border-s pb-[env(safe-area-inset-bottom)] sm:pb-0 sm:h-full'
              : 'dialog-panel-enter rounded-2xl border',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
