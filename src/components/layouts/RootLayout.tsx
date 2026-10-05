import { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useNavigation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/comman/ErrorBoundary';
import { scrollRootRef } from '@/utils/scrollRoot';
import { AuthGateModal } from '@/components/comman/ui/AuthGateModal';
import { ToastContainer } from '@/components/comman/ui/ToastContainer';
import { GoogleOneTapPrompt } from '@/components/comman/ui/GoogleOneTapPrompt';
import { LanguageRouteSync } from '@/contexts/LanguageContext';

function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[55vh]">
      <div className="w-5 h-5 rounded-full border-2 border-brand-orange border-t-transparent animate-spin" />
    </div>
  );
}

// Thin top bar shown while React Router is loading a route (e.g. fetching a
// lazy page's chunk) — keeps the previous page on screen instead of swapping
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

export function RootLayout() {
  const { pathname } = useLocation();

  // `window` never scrolls in this app (see the div below) and nothing
  // resets *its* scroll position on navigation either — so the scroll
  // container kept whatever offset the previous page was left at, and the
  // next page rendered already scrolled down by that same amount. From a
  // product-search result that could genuinely land you on the new page's
  // footer instead of its top, looking like navigation went to the wrong
  // place entirely.
  useEffect(() => {
    scrollRootRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <>
      <TopProgressBar />
      <AuthGateModal />
      <ToastContainer />
      <GoogleOneTapPrompt />
      <LanguageRouteSync />
      {/* `fixed inset-0` (not paddingTop + height:100vh) so this wrapper IS the
          scroll container — the previous approach had no overflow container of
          its own, so tall pages fell back to scrolling the whole document.
          Anything that used to read window.scrollY / call window.scrollTo now
          goes through scrollRootRef (see utils/scrollRoot.ts) instead, since
          window itself no longer scrolls. */}
      <div
        ref={el => { scrollRootRef.current = el; }}
        className="fixed inset-0 overflow-y-auto"
      >
        {/* resetKey (not key) — a new path clears a caught error, but the layouts
            (dashboard sidebars etc.) stay mounted instead of rebuilding on every click */}
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageSpinner />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}
