import { Suspense } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/comman/ErrorBoundary';
import { AuthGateModal } from '@/components/comman/ui/AuthGateModal';
import { ToastContainer } from '@/components/comman/ui/ToastContainer';
import { MaintenanceNotice } from '@/components/comman/ui/MaintenanceNotice';
import { GoogleOneTapPrompt } from '@/components/comman/ui/GoogleOneTapPrompt';
import { LanguageRouteSync } from '@/contexts/LanguageContext';
import { AiAssistantWidget } from '@/components/ai/AiAssistantWidget';
import { ChatWidgetGate } from '@/components/chat/ChatWidgetGate';
import { useGlobalEdgeHoverScroll } from '@/hooks/useGlobalEdgeHoverScroll';
import { useReferralCapture } from '@/hooks/useReferralCapture';
import { AdminEditProvider } from '@/contexts/AdminEditContext';
import { ReauthProvider } from '@/contexts/ReauthProvider';
import { AdminEditToolbar } from '@/components/admin-edit/AdminEditToolbar';

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

export function RootLayout() {
  useGlobalEdgeHoverScroll();
  useReferralCapture();
  const { pathname } = useLocation();

  return (
    <AdminEditProvider>
    <ReauthProvider>
      <TopProgressBar />
      <MaintenanceNotice />
      <AuthGateModal />
      <ToastContainer />
      <GoogleOneTapPrompt />
      <LanguageRouteSync />
      <AiAssistantWidget />
      <ChatWidgetGate />
      <ScrollRestoration />
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
