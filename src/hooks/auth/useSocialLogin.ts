import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiSocialLogin, TokenStorage, getRoleRedirect, LastRolePreference, RememberedAccount, type SocialLoginPayload, type AppRole } from '@/api/services/auth';
import { resolveSellerDestinationRemote } from '@/utils/sellerRouting';
import type { SocialProvider } from '@/components/comman/ui/SocialIcons';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (parent: HTMLElement, options: object) => void;
          prompt: (callback?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          cancel: () => void;
        };
      };
    };
    FB?: {
      init: (config: object) => void;
      login: (cb: (res: { authResponse?: { accessToken: string; userID: string } | null; status?: string }) => void, opts?: object) => void;
      api: (path: string, params: object, cb: (res: { id?: string; name?: string; email?: string; picture?: { data?: { url?: string } }; error?: unknown }) => void) => void;
    };
    AppleID?: {
      auth: {
        init: (config: object) => void;
        signIn: () => Promise<{
          authorization: { id_token: string; code: string; state?: string };
          user?: { email?: string; name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

const GOOGLE_CLIENT_ID   = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const FACEBOOK_APP_ID    = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;
// Apple "Services ID" (not the app's bundle id) — the backend's APPLE_CLIENT_ID must match it.
const APPLE_CLIENT_ID    = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
// Must be registered with Apple for that Services ID (https, no localhost).
const APPLE_REDIRECT_URI = import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined;

const ENV_KEY: Record<SocialProvider, string> = {
  google: 'VITE_GOOGLE_CLIENT_ID',
  facebook: 'VITE_FACEBOOK_APP_ID',
  apple: 'VITE_APPLE_CLIENT_ID',
};
const LABEL: Record<SocialProvider, string> = { google: 'Google', facebook: 'Facebook', apple: 'Apple' };

export function isSocialProviderConfigured(provider: SocialProvider): boolean {
  if (provider === 'google') return !!GOOGLE_CLIENT_ID;
  if (provider === 'facebook') return !!FACEBOOK_APP_ID;
  return !!APPLE_CLIENT_ID;
}

// Hidden for now. The Facebook/Apple sign-in code stays in place; take a
// provider off this list to bring its button back.
const HIDDEN_PROVIDERS: SocialProvider[] = ['facebook', 'apple'];

/** Providers to show: configured ones — plus, in local dev, all of them, so a
 *  missing key shows up as a clear message instead of a missing button. */
export function visibleSocialProviders(): SocialProvider[] {
  const all = (['google', 'facebook', 'apple'] as SocialProvider[]).filter(p => !HIDDEN_PROVIDERS.includes(p));
  return import.meta.env.DEV ? all : all.filter(isSocialProviderConfigured);
}

// Each provider's SDK is fetched once per page, however many buttons mount.
const scriptPromises = new Map<string, Promise<void>>();
function loadScript(src: string, ready: () => boolean): Promise<void> {
  if (ready()) return Promise.resolve();
  let p = scriptPromises.get(src);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromises.delete(src);
        reject(new Error(`Failed to load ${src}`));
      };
      document.head.appendChild(script);
    });
    scriptPromises.set(src, p);
  }
  return p;
}
const loadGoogleScript = () => loadScript('https://accounts.google.com/gsi/client', () => !!window.google);

let facebookReady: Promise<void> | null = null;
function loadFacebook(): Promise<void> {
  if (!facebookReady) {
    facebookReady = loadScript('https://connect.facebook.net/en_US/sdk.js', () => !!window.FB)
      .then(() => { window.FB!.init({ appId: FACEBOOK_APP_ID, cookie: false, xfbml: false, version: 'v19.0' }); })
      .catch(err => { facebookReady = null; throw err; });
  }
  return facebookReady;
}

let appleReady: Promise<void> | null = null;
function loadApple(): Promise<void> {
  if (!appleReady) {
    appleReady = loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js', () => !!window.AppleID)
      .then(() => {
        window.AppleID!.auth.init({
          clientId: APPLE_CLIENT_ID,
          scope: 'name email',
          redirectURI: APPLE_REDIRECT_URI || window.location.origin,
          usePopup: true,
        });
      })
      .catch(err => { appleReady = null; throw err; });
  }
  return appleReady;
}

/** Loads the Facebook/Apple SDKs as soon as their buttons are on screen, so a
 *  click can open the popup immediately (a slow script load between the click
 *  and the popup makes browsers block it). */
export function preloadSocialSdks(providers: SocialProvider[]) {
  if (providers.includes('facebook') && FACEBOOK_APP_ID) loadFacebook().catch(() => {});
  if (providers.includes('apple') && APPLE_CLIENT_ID) loadApple().catch(() => {});
}

function decodeJwt(token: string): Record<string, unknown> {
  const part = token.split('.')[1] ?? '';
  const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decodeURIComponent(Array.from(json, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
}

// `role` defaults to 'seller' — the web login form only offers seller sign-in
// today (see LoginPage's hidden buyer toggle), so a social sign-in should
// resolve to a Seller account, not a buyer one. Callers pass their own `role`
// state so a future re-enabled buyer toggle just flows through unchanged —
// buyer-only call sites (AuthGateModal, SignInPreview) pass 'user' explicitly.
export function useSocialLogin(role: AppRole = 'seller') {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const initializedRef = useRef(false);

  async function execute(payload: SocialLoginPayload) {
    setError('');
    setLoading(true);
    try {
      const res = await apiSocialLogin({ ...payload, role });
      const { token, user } = res.data;
      const serverRole = (user.role ?? role) as AppRole;
      TokenStorage.save(token.accessToken, token.refreshToken);
      TokenStorage.saveUser(user);
      LastRolePreference.set(serverRole);
      RememberedAccount.set({ name: user.name, email: user.email, role: serverRole, image: user.image ?? null, authMethod: payload.authProvider });
      const destination = serverRole === 'seller' ? await resolveSellerDestinationRemote() : getRoleRedirect(serverRole);
      navigate(destination, { replace: true });
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Social login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleCredential = useCallback((response: { credential: string }) => {
    (async () => {
      try {
        const payload = decodeJwt(response.credential) as { sub: string; email?: string; name?: string; picture?: string };
        await execute({
          authProvider: 'google',
          token: response.credential,
          socialId: payload.sub,
          email: payload.email,
          name: payload.name,
          image: payload.picture,
        });
      } catch {
        setError('Google sign-in failed. Please try again.');
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Loads the script + calls `initialize()` exactly once per hook instance
  // (guarded by initializedRef) — shared by `mount` (the real button) and
  // `promptOneTap` (the passive site-wide nudge) below, so both ever only
  // set up GIS a single time even if a page uses both.
  const ensureInitialized = useCallback(() => {
    return loadGoogleScript().then(() => {
      if (!initializedRef.current) {
        window.google!.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
          use_fedcm_for_prompt: true,
        });
        initializedRef.current = true;
      }
    });
  }, [handleCredential]);

  // Mounts Google's own real sign-in widget into `container` (called by
  // SocialLoginRow once its DOM node exists) — Identity Services' actual
  // `renderButton`. Clicking it opens Google's own account-chooser/popup.
  //
  // This replaces the old approach of a custom-styled button whose onClick
  // called Google's One Tap `prompt()` — that silently fails on Safari/
  // mobile/Incognito, where One Tap is suppressed under ITP-style
  // third-party-storage restrictions (confirmed via a live repro: the FedCM
  // status check Google's script fires came back with `is_itp=true`, and the
  // prompt never displayed). A real, directly user-clicked provider button
  // reliably falls back to a proper popup sign-in flow everywhere instead.
  const mount = useCallback((provider: SocialProvider, container: HTMLElement, availableWidth: number) => {
    if (provider !== 'google') return;
    if (!GOOGLE_CLIENT_ID) return; // SocialLoginRow shows its own "not set up" button instead
    ensureInitialized()
      .then(() => {
        // Fills as much of the real form width as GIS's own [200,400]px
        // button-width cap allows, instead of a fixed guess.
        const width = Math.min(400, Math.max(200, availableWidth));
        window.google!.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width,
        });
      })
      .catch(() => setError('Failed to load Google login. Please try again.'));
  }, [ensureInitialized]);

  // Facebook and Apple: our own button opens the provider's popup; the token
  // it returns is verified by the backend before any account is touched.
  const signIn = useCallback(async (provider: SocialProvider) => {
    if (!isSocialProviderConfigured(provider)) {
      setError(`${LABEL[provider]} sign-in isn't set up yet${import.meta.env.DEV ? ` — add ${ENV_KEY[provider]} to .env` : ''}.`);
      return;
    }
    setError('');

    if (provider === 'facebook') {
      try { await loadFacebook(); }
      catch { setError('Failed to load Facebook login. Please try again.'); return; }
      // FB.login must run straight from the click (no await before it) or the popup is blocked.
      window.FB!.login(res => {
        const auth = res.authResponse;
        if (!auth?.accessToken) { setError('Facebook sign-in was cancelled.'); return; }
        window.FB!.api('/me', { fields: 'id,name,email,picture.type(large)' }, me => {
          void execute({
            authProvider: 'facebook',
            token: auth.accessToken,
            socialId: auth.userID,
            name: me?.name,
            email: me?.email,
            image: me?.picture?.data?.url,
          });
        });
      }, { scope: 'public_profile,email' });
      return;
    }

    if (provider === 'apple') {
      try {
        await loadApple();
        const res = await window.AppleID!.auth.signIn();
        const idToken = res.authorization.id_token;
        const claims = decodeJwt(idToken) as { sub: string; email?: string };
        // Apple only sends the name the very first time a user signs in.
        const fullName = [res.user?.name?.firstName, res.user?.name?.lastName].filter(Boolean).join(' ');
        await execute({
          authProvider: 'apple',
          token: idToken,
          socialId: claims.sub,
          email: res.user?.email ?? claims.email,
          name: fullName || undefined,
        });
      } catch (err) {
        const code = (err as { error?: string })?.error;
        setError(code === 'popup_closed_by_user' || code === 'user_cancelled_authorize'
          ? 'Apple sign-in was cancelled.'
          : 'Apple sign-in failed. Please try again.');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // The passive, site-wide "corner" nudge (Google's real One Tap bubble) —
  // deliberately separate from `mount`'s real button and never surfaces an
  // error: unlike a deliberate button click, nobody asked for this one, so
  // Google silently declining to show it (Safari/mobile/Incognito ITP
  // restrictions, a recent dismissal cooldown, no active Google session,
  // etc.) is just... nothing happens, not a failure to report.
  const promptOneTap = useCallback(() => {
    if (!GOOGLE_CLIENT_ID) return;
    ensureInitialized()
      .then(() => window.google!.accounts.id.prompt())
      .catch(() => {});
  }, [ensureInitialized]);

  return { execute, mount, signIn, promptOneTap, loading, error };
}
