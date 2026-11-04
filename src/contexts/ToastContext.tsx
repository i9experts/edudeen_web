import { createContext, useContext, useCallback, useState, useRef, type ReactNode } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastOptions {
  /** Button shown inside the toast (e.g. Undo). Clicking it runs onClick and closes the toast. */
  action?:     { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastEntry {
  id:      number;
  variant: ToastVariant;
  message: string;
  leaving: boolean;
  paused:  boolean;
  action?: ToastOptions['action'];
  durationMs: number;
}

interface ToastContextValue {
  toasts:  ToastEntry[];
  show:    (variant: ToastVariant, message: string, options?: ToastOptions) => void;
  dismiss: (id: number) => void;
  pause:   (id: number) => void;
  resume:  (id: number) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

export const TOAST_DURATION_MS = 3200;
const EXIT_MS = 220;
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);
  // Per-toast auto-dismiss bookkeeping, kept out of state since it's just
  // timer plumbing — `remaining` lets hovering a toast genuinely pause its
  // countdown instead of merely freezing the progress bar's paint.
  const timers = useRef(new Map<number, { timer: ReturnType<typeof setTimeout>; expiresAt: number; remaining: number }>());

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    timers.current.delete(id);
  }, []);

  const dismiss = useCallback((id: number) => {
    const entry = timers.current.get(id);
    if (entry) clearTimeout(entry.timer);
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => remove(id), EXIT_MS);
  }, [remove]);

  const schedule = useCallback((id: number, ms: number) => {
    const timer = setTimeout(() => dismiss(id), ms);
    timers.current.set(id, { timer, expiresAt: Date.now() + ms, remaining: ms });
  }, [dismiss]);

  const pause = useCallback((id: number) => {
    const entry = timers.current.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    entry.remaining = Math.max(entry.expiresAt - Date.now(), 0);
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, paused: true } : t)));
  }, []);

  const resume = useCallback((id: number) => {
    const entry = timers.current.get(id);
    if (!entry) return;
    schedule(id, entry.remaining);
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, paused: false } : t)));
  }, [schedule]);

  const show = useCallback((variant: ToastVariant, message: string, options?: ToastOptions) => {
    const id = nextId.current++;
    const durationMs = options?.durationMs ?? TOAST_DURATION_MS;
    setToasts(prev => [...prev, { id, variant, message, leaving: false, paused: false, action: options?.action, durationMs }].slice(-MAX_VISIBLE));
    schedule(id, durationMs);
  }, [schedule]);

  return (
    <ToastCtx.Provider value={{ toasts, show, dismiss, pause, resume }}>
      {children}
    </ToastCtx.Provider>
  );
}

/** `toast.success('Added to cart')` / `toast.error(...)` / `toast.info(...)` —
 *  a quick, consistent confirmation for actions that otherwise give no
 *  feedback (remove from cart, clear cart, wishlist, etc.), instead of each
 *  place inventing its own inline banner or none at all. */
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return {
    success: (message: string, options?: ToastOptions) => ctx.show('success', message, options),
    error:   (message: string) => ctx.show('error', message),
    info:    (message: string) => ctx.show('info', message),
  };
}

export function useToastList() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToastList must be used inside ToastProvider');
  return ctx;
}
