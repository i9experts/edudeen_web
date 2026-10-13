import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(el => el.offsetParent !== null);
}

/**
 * Traps Tab/Shift+Tab focus inside `containerRef`, closes on Escape, focuses the
 * container on mount, and restores focus to whatever was focused before the
 * dialog opened when it unmounts. Shared by every modal-style overlay in the app
 * so the trap logic isn't reimplemented (and forgotten) per component.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled: boolean = true,
) {
  // Callers usually pass an inline `() => setOpen(false)`: a NEW function on every render. Depending on it re-ran
  // this effect whenever the parent re-rendered (a countdown, a carousel tick...), whose cleanup gives focus back
  // to the button that opened the dialog - so typing in a form field lost the cursor after a second. Keep the
  // latest callback in a ref and only (re)run the trap when `enabled` changes.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Don't steal focus from an element that already auto-focused itself
    // (e.g. an input with `autoFocus`) inside the same dialog.
    if (!containerRef.current?.contains(document.activeElement)) {
      containerRef.current?.focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key !== 'Tab' || !containerRef.current) return;

      const focusable = getFocusable(containerRef.current);
      if (focusable.length === 0) { e.preventDefault(); return; }

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
