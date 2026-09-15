import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
// Cookie-backed (not localStorage) so the token is visible from any seller
// storefront subdomain, not just the exact origin it was issued on — see
// `utils/authCookie.ts`. Imported directly (not via `services/auth.ts`'s
// `TokenStorage`) to avoid a circular import, since `auth.ts` itself imports
// this `client` module.
import { getAuthCookie, deleteAuthCookie } from '@/utils/authCookie';

// Endpoints where a 401 means "this specific attempt was rejected" (wrong
// password, invalid/expired OTP, invalid reset token, invalid social token)
// — not "your existing session expired". These must surface their error to
// the calling form instead of force-navigating to /login, which would wipe
// the form's error state via a full reload before the user ever sees it.
const AUTH_ATTEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/social-login',
  '/api/auth/verifyOtp',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/resend-otp',
];

// ── Axios instance ────────────────────────────────────────────────────────────
// import.meta.env.VITE_API_URL is inlined at BUILD time. If the build runs
// without it set, Vite bakes in `undefined` — axios then silently treats
// every request as relative to whatever origin serves the built bundle
// (e.g. the static frontend host) instead of the real backend. That host
// has no /api route, so its SPA fallback returns index.html with a 200 for
// every API call: requests "succeed" but return HTML, and every `res.data`
// destructure downstream throws on the resulting string. This exact failure
// mode shipped once already (baseURL came out as `void 0` in a production
// bundle) — fail loudly here instead of letting it recur silently.
const API_BASE_URL = import.meta.env.VITE_API_URL as string | undefined;
if (!API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.error(
    '[Edudeen] VITE_API_URL is not set for this build. All API requests will ' +
    'target the wrong host and silently fail. Set VITE_API_URL and rebuild.',
  );
}

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ── Request interceptor — attach Bearer token automatically ───────────────────
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!API_BASE_URL) {
      return Promise.reject(Object.assign(
        new Error('The app is misconfigured (missing API URL). Please contact support.'),
        { isNetworkError: false, status: undefined },
      ));
    }
    const token = getAuthCookie('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let browser set multipart/form-data boundary automatically for FormData
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  err => Promise.reject(err),
);

// ── Response interceptor — normalize errors, handle 401 ──────────────────────
client.interceptors.response.use(
  (res: AxiosResponse) => {
    // Every backend controller returns a JSON object body (no endpoint sends
    // 204/empty responses) — if a 2xx response ever arrives without one (e.g.
    // a stale deploy, a proxy/CDN returning an empty 200, a version-skewed
    // frontend/backend pair), surface a readable error here instead of
    // letting every call site's `const { x } = res.data` throw a raw
    // "Cannot destructure property 'x' of 'res.data' as it is undefined".
    if (res.data === null || res.data === undefined || typeof res.data !== 'object') {
      throw Object.assign(new Error('Unexpected response from server. Please try again.'), {
        isNetworkError: false,
        status: res.status,
      });
    }
    return res.data;   // unwrap → caller gets { success, message, data } (or module-specific equivalent)
  },
  err => {
    const msg: string =
      err.response?.data?.message ||
      err.message ||
      'Something went wrong. Please try again.';

    // Session expired → force logout. Not for the auth-attempt endpoints
    // above — there, a 401 is the expected "wrong credentials/OTP/token"
    // response for that one request, and must show inline on the form.
    const isAuthAttempt = AUTH_ATTEMPT_PATHS.some(p => err.config?.url?.includes(p));
    if (err.response?.status === 401 && !isAuthAttempt) {
      deleteAuthCookie('accessToken');
      deleteAuthCookie('refreshToken');
      deleteAuthCookie('user');
      sessionStorage.removeItem('authCtx');
      // Carries the page the user was on back through login so a session
      // expiring mid-task doesn't strand them on the role's default
      // dashboard afterward — LoginPage/AdminLoginPage read this back.
      const here = window.location.pathname + window.location.search;
      const isLoginPage = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/admin/login');
      window.location.href = isLoginPage ? '/login' : `/login?redirect=${encodeURIComponent(here)}`;
    }

    // Platform-wide maintenance mode (see main.ts) — admin/auth routes are
    // exempted server-side, so this only ever fires for buyer/seller calls.
    if (err.response?.status === 503 && err.response?.data?.maintenanceMode === true) {
      if (window.location.pathname !== '/maintenance') window.location.href = '/maintenance';
    }

    // `isNetworkError` distinguishes "the request never reached the server" (no
    // network, timeout, DNS failure — safe to retry/queue) from a real server
    // rejection (4xx/5xx — retrying with the same input will just fail again).
    // Existing call sites are unaffected: they only ever read `.message`.
    return Promise.reject(Object.assign(new Error(msg), {
      isNetworkError: !err.response,
      status: err.response?.status,
    }));
  },
);

export function isNetworkError(err: unknown): boolean {
  return err instanceof Error && (err as Error & { isNetworkError?: boolean }).isNetworkError === true;
}

export default client;


