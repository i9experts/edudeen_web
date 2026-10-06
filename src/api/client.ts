import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
// Cookie-backed (not localStorage) so the token is visible from any seller
// storefront subdomain, not just the exact origin it was issued on — see
// `utils/authCookie.ts`. Imported directly (not via `services/auth.ts`'s
// `TokenStorage`) to avoid a circular import, since `auth.ts` itself imports
// this `client` module.
import { getAuthCookie, setAuthCookie, deleteAuthCookie } from '@/utils/authCookie';
import { API_BASE_URL, API_URL_MISSING } from './apiBase';

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
if (API_URL_MISSING) {
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
    // (An empty base is fine in local dev — requests go through the Vite proxy.)
    if (API_URL_MISSING) {
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

// ── Access-token refresh (single-flight) ─────────────────────────────────────
// A 401 on a normal request first tries to swap the refresh token for a new
// pair (POST /api/auth/refresh → { data: { token: { accessToken, refreshToken } } }).
// Only ONE refresh call is ever in flight: concurrent 401s all await the same
// promise, then each retries its own request exactly once. If the refresh
// itself fails, every waiter falls through to the logout redirect below.
const REFRESH_PATH = '/api/auth/refresh';
// Never try to refresh for these — a 401 there isn't an expired session.
const NO_REFRESH_PATHS = [...AUTH_ATTEMPT_PATHS, REFRESH_PATH, '/api/auth/logout'];

let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getAuthCookie('refreshToken');
  if (!refreshToken) return Promise.resolve(null);
  refreshInFlight = axios
    // Bare axios (not `client`) so this call never re-enters the interceptors.
    .post(`${API_BASE_URL}${REFRESH_PATH}`, { refreshToken }, { headers: { 'Content-Type': 'application/json' }, timeout: 15_000 })
    .then(res => {
      const tokens = res.data?.data?.token;
      if (!tokens?.accessToken || !tokens?.refreshToken) return null;
      // Keep the same cookie lifetime the user chose at login ("remember me").
      const persistent = getAuthCookie('authRemember') !== '0';
      setAuthCookie('accessToken', tokens.accessToken, persistent);
      setAuthCookie('refreshToken', tokens.refreshToken, persistent);
      return tokens.accessToken as string;
    })
    .catch(() => null)
    .finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

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
  async err => {
    // Expired access token → refresh once, then replay the original request.
    const original = err.config as (InternalAxiosRequestConfig & { _retriedAfterRefresh?: boolean }) | undefined;
    const skipRefresh = NO_REFRESH_PATHS.some(p => original?.url?.includes(p));
    if (err.response?.status === 401 && original && !original._retriedAfterRefresh && !skipRefresh && getAuthCookie('refreshToken')) {
      original._retriedAfterRefresh = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        if (original.headers) original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      }
      // Refresh failed — fall through to the logout handling below.
    }

    let msg: string =
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
      deleteAuthCookie('authRemember');
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
      const d = err.response.data as { scope?: string; title?: string; message?: string };
      // The whole site (or the browsing side of it) is down: show the full page.
      // A single area (checkout, seller tools, uploads) only fails that action,
      // with the admin's own explanation, and the rest of the site stays usable.
      if (d.scope === 'all' || d.scope === 'buyer') {
        if (window.location.pathname !== '/maintenance') window.location.href = '/maintenance';
      } else {
        msg = [d.title, d.message].filter(Boolean).join(' — ') || msg;
      }
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


