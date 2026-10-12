import { useEffect } from 'react';
import { useSocialLogin } from '@/hooks/auth/useSocialLogin';
import { TokenStorage } from '@/api/services/auth';
import { getStoreSlugFromHost, isCustomDomainCandidate } from '@/utils/storefrontUrl';

// Google's real One Tap corner bubble — a passive courtesy nudge shown
// site-wide (not just on the Login/Register form) to a signed-out visitor
// who already has an active Google session on this browser. Purely a
// bonus on top of the real "Continue with Google" button (SocialLoginRow /
// useSocialLogin's `mount`) — never the only way to sign in with Google,
// which is exactly the mistake the old prompt()-only approach made (see
// mount's own comment). Renders nothing itself: Google injects its own
// floating widget into the page when (and only when) it decides to show it.
export function GoogleOneTapPrompt() {
  const { promptOneTap } = useSocialLogin('seller');

  useEffect(() => {
    // Only the apex Edudeen domain — never a seller's own storefront
    // subdomain/custom domain, which has its own separate, unrelated login
    // and almost certainly isn't a registered origin for this OAuth client.
    if (getStoreSlugFromHost() || isCustomDomainCandidate()) return;
    if (TokenStorage.isLoggedIn()) return;
    // Login / sign-up screens already render Google's real button; a second request would clash with it.
    if (/^\/(login|register|verify-otp|forgot-password|new-password|onboard|admin|store|seller)(\/|$)/.test(window.location.pathname)) return;
    promptOneTap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
