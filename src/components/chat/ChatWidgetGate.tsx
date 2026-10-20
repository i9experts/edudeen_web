import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Own chunk, fetched when the browser is idle - the widget never delays first paint.
const ChatWidget = lazy(() => import('./ChatWidget'));

// /account/messages: the bubble would sit on the composer's send/mic buttons.
const HIDDEN = /^\/(admin|maintenance|account\/messages)(\/|$)/;

/** Mounted once in RootLayout: buyer + public pages and the seller dashboard. Hidden on /admin. */
export function ChatWidgetGate() {
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(id);
  }, []);
  if (!ready || HIDDEN.test(pathname)) return null;
  return <Suspense fallback={null}><ChatWidget /></Suspense>;
}
