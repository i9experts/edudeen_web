import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigation, useNavigationType } from 'react-router-dom';
import { ErrorBoundary } from '@/components/comman/ErrorBoundary';
import { AuthGateModal } from '@/components/comman/ui/AuthGateModal';
import { ToastContainer } from '@/components/comman/ui/ToastContainer';
import { LanguageRouteSync } from '@/contexts/LanguageContext';
import { ChatWidgetGate } from '@/components/chat/ChatWidgetGate';
import { useGlobalEdgeHoverScroll } from '@/hooks/useGlobalEdgeHoverScroll';
import { useReferralCapture } from '@/hooks/useReferralCapture';
import { AdminEditProvider } from '@/contexts/AdminEditContext';
import { ReauthProvider } from '@/contexts/ReauthProvider';
import { AdminEditToolbar } from '@/components/admin-edit/AdminEditToolbar';
import { RouteMeta } from '@/components/seo/RouteMeta';
import { SkipLink } from '@/components/seo/SkipLink';

// Non-critical overlays: own chunks, mounted once the browser is idle so they never delay first paint.
const MaintenanceNotice = lazy(() => import('@/components/comman/ui/MaintenanceNotice').then(m => ({ default: m.MaintenanceNotice })));
const GoogleOneTapPrompt = lazy(() => import('@/components/comman/ui/GoogleOneTapPrompt').then(m => ({ default: m.GoogleOneTapPrompt })));
const AiAssistantWidget = lazy(() => import('@/components/ai/AiAssistantWidget').then(m => ({ default: m.AiAssistantWidget })));

function WhenIdle({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 800);
    return () => window.clearTimeout(id);
  }, []);
  return ready ? <Suspense fallback={null}>{children}</Suspense> : null;
}

function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[55vh]">
      <div className="w-5 h-5 rounded-full border-2 border-brand-orange border-t-transparent animate-spin" />
    </div>
  );
}

// Thin top bar shown while React Router is loading a route (e.g. fetching a
// lazy page's chunk) â€” keeps the previous page on screen instead of swapping
// it for a centered spinner, so navigation feels continuous rather than blocked.
function TopProgressBar() {
  const navigation = useNavigation();
  if (navigation.state === 'idle') return null;
  return (
    <div className="fixed top-0 start-0 end-0 z-[9999] h-[3px] bg-transparent overflow-hidden">
      <div className="h-full w-1/3 bg-brand-orange animate-[top-progress_1s_ease-in-out_infinite]" />
    </div>
  );
}

// A new page (path change by link/redirect/push) always opens at the top, even when its lazy chunk renders a moment
// later; Back/Forward (POP) keep the saved position via <ScrollRestoration/>. Filter changes on the same path are left alone.
function ScrollToTopOnNavigate() {
  const { pathname, hash } = useLocation();
  const type = useNavigationType();
  const last = useRef(pathname);
  useLayoutEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    if (type === 'POP' || hash) return;
    const top = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    top();
    const r1 = requestAnimationFrame(() => { top(); requestAnimationFrame(top); });
    return () => cancelAnimationFrame(r1);
  }, [pathname, hash, type]);
  return null;
}

export function RootLayout() {
  useGlobalEdgeHoverScroll();
  useReferralCapture();
  const { pathname } = useLocation();

  return (
    <AdminEditProvider>
    <ReauthProvider>
      <SkipLink />
      <RouteMeta />
      <TopProgressBar />
      <WhenIdle><MaintenanceNotice /></WhenIdle>
      <AuthGateModal />
      <ToastContainer />
      <WhenIdle><GoogleOneTapPrompt /></WhenIdle>
      <LanguageRouteSync />
      <WhenIdle><AiAssistantWidget /></WhenIdle>
      <ChatWidgetGate />
      <ScrollRestoration />
      <ScrollToTopOnNavigate />
      {/* resetKey (not key) â€” a new path clears a caught error, but the layouts
         (dashboard sidebars etc.) stay mounted instead of rebuilding on every click */}
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      <AdminEditToolbar />
    </ReauthProvider>
    </AdminEditProvider>
  );
}
