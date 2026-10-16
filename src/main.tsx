import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'motion/react';
import { router } from '@/router';
import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { CurrencyPreferenceProvider } from '@/contexts/CurrencyPreferenceContext';
import { AuthGateProvider } from '@/contexts/AuthGateContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { InstallAppPrompt } from '@/components/InstallAppPrompt';
import './index.css';

// Optional Sentry: only when VITE_SENTRY_DSN is set and @sentry/react is installed. Never blocks the app.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  const pkg = '@sentry/react';
  import(/* @vite-ignore */ pkg)
    .then((Sentry) => {
      Sentry.init({ dsn: sentryDsn, environment: import.meta.env.MODE });
      (window as unknown as { __sentry?: unknown }).__sentry = Sentry;
    })
    .catch(() => { /* package not installed */ });
}

// Minimal offline shell (public/sw.js): caches only /offline.html, never API or page data.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* optional */ }); });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* domAnimation = animations + hover/tap/in-view only (no drag/layout engine): ~100 KB less JS than the full motion component. */}
    <LazyMotion features={domAnimation}>
    <ToastProvider>
      <AuthGateProvider>
        <LanguageProvider>
        <CurrencyPreferenceProvider>
          <CartProvider>
            <WishlistProvider>
              <NotificationProvider>
                <RouterProvider router={router} />
                <InstallAppPrompt />
              </NotificationProvider>
            </WishlistProvider>
          </CartProvider>
        </CurrencyPreferenceProvider>
        </LanguageProvider>
      </AuthGateProvider>
    </ToastProvider>
    </LazyMotion>
  </StrictMode>,
);

// Branded splash (index.html #splash): shown until the app has mounted and the window finished loading; at least ~600 ms so it never flashes.
{
  const splash = document.getElementById('splash');
  if (splash) {
    const shownAt = performance.now();
    const hide = () => {
      const wait = Math.max(0, 600 - (performance.now() - shownAt));
      window.setTimeout(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          splash.classList.add('hide');
          window.setTimeout(() => splash.remove(), 350);
        }));
      }, wait);
    };
    if (document.readyState === 'complete') hide(); else window.addEventListener('load', hide, { once: true });
    window.setTimeout(hide, 8000); // safety net: never block the app
  }
}