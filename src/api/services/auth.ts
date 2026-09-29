import client from '../client';
import { ENDPOINTS } from '../endpoints';
import { setAuthCookie, getAuthCookie, deleteAuthCookie } from '@/utils/authCookie';

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN STORAGE — cookie-backed (domain-wide: `.edudeen.com`/`localhost`),
// NOT localStorage. A seller storefront lives on its own subdomain
// (`hello.edudeen.com`), and localStorage is locked to one exact origin —
// a token saved on the main domain would be invisible there, logging every
// buyer out the moment they land on a store. A cookie scoped to the shared
// root domain fixes that; the public API here is unchanged so every existing
// call site (`TokenStorage.isLoggedIn()` etc., all over the app) keeps
// working synchronously with zero changes. See `utils/authCookie.ts`.
// ─────────────────────────────────────────────────────────────────────────────
export const TokenStorage = {
  save(accessToken: string, refreshToken: string, remember = true) {
    setAuthCookie('accessToken',  accessToken,  remember);
    setAuthCookie('refreshToken', refreshToken, remember);
    // Every real login path (LoginPage, AuthGateModal, social login, OTP
    // verify) funnels through this one function — firing here, rather than
    // duplicating a "just logged in" signal at each call site, is what lets
    // CartContext merge a guest's local cart into the account the instant
    // any of them succeeds.
    window.dispatchEvent(new Event('edudeen:auth-login'));
  },
  saveUser(user: object) {
    setAuthCookie('user', JSON.stringify(user));
  },
  clear() {
    deleteAuthCookie('accessToken');
    deleteAuthCookie('refreshToken');
    deleteAuthCookie('user');
    sessionStorage.removeItem('authCtx');
    // Mirror of the login event in save() — lets account-scoped state
    // (wishlist, cart) drop the previous user's data without a page reload.
    window.dispatchEvent(new Event('edudeen:auth-logout'));
  },
  getToken()     { return getAuthCookie('accessToken'); },
  getRefresh()   { return getAuthCookie('refreshToken'); },
  getUser<T = Record<string, unknown>>(): T | null {
    const u = getAuthCookie('user');
    return u ? (JSON.parse(u) as T) : null;
  },
  isLoggedIn()   { return !!getAuthCookie('accessToken'); },
};

// ─────────────────────────────────────────────────────────────────────────────
// ROLE-BASED REDIRECT
// ─────────────────────────────────────────────────────────────────────────────
export type AppRole = 'user' | 'seller' | 'admin';

export function getRoleRedirect(role: AppRole): string {
  switch (role) {
    case 'admin':  return '/admin';
    // Every real seller call site branches to resolveSellerDestinationRemote()
    // instead of this (there's no single fixed seller landing page any more —
    // it depends on which store, if any, the seller owns) — this is just the
    // last-resort fallback if one ever doesn't.
    case 'seller': return '/seller/stores';
    default:       return '/marketplace';       // "user" / buyer
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAST-ROLE PREFERENCE — persisted role toggle default (localStorage, so it
// survives across sessions on the same device). Not an identity check —
// backend account lookup is still scoped per-role regardless — this only
// saves a returning seller/buyer from having to re-select their role on
// LoginPage every time (it used to always default to "Buyer", so a seller
// forgetting to flip it got a misleading "Invalid email or password").
// ─────────────────────────────────────────────────────────────────────────────
const LAST_ROLE_KEY = 'edudeen_last_role';
export const LastRolePreference = {
  get(): AppRole {
    const stored = localStorage.getItem(LAST_ROLE_KEY);
    return stored === 'seller' || stored === 'admin' ? stored : 'user';
  },
  set(role: AppRole) {
    try { localStorage.setItem(LAST_ROLE_KEY, role); } catch { /* storage unavailable */ }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// REMEMBERED ACCOUNT — Shopify/Google-style "Continue as X" chooser data.
// Deliberately localStorage, NOT the cookie-backed TokenStorage above: this
// must survive `TokenStorage.clear()` on logout (useLogout never touches
// localStorage), since the whole point is recognizing "you've used this
// account on this device before" even after signing out — it is never read
// as proof of identity, only as a UX shortcut that pre-fills LoginPage /
// offers a one-click "that's me" card on RegisterPage before falling back to
// a normal fresh sign-up.
// ─────────────────────────────────────────────────────────────────────────────
const REMEMBERED_ACCOUNT_KEY = 'edudeen_remembered_account';
export interface RememberedAccountData {
  name:  string;
  email: string;
  role:  AppRole;
  image: string | null;
  /** How this device last actually signed in — a Google-only account has no
   *  password set at all, so LoginPage's account-picker must offer "Continue
   *  with Google" instead of a password field for it. Optional so an
   *  already-stored value from before this field existed still renders (just
   *  falls back to the password-field path, the previous universal behavior). */
  authMethod?: 'password' | 'google';
}
export const RememberedAccount = {
  get(): RememberedAccountData | null {
    try {
      const raw = localStorage.getItem(REMEMBERED_ACCOUNT_KEY);
      return raw ? (JSON.parse(raw) as RememberedAccountData) : null;
    } catch {
      return null;
    }
  },
  set(account: RememberedAccountData) {
    try { localStorage.setItem(REMEMBERED_ACCOUNT_KEY, JSON.stringify(account)); } catch { /* storage unavailable */ }
  },
  clear() {
    try { localStorage.removeItem(REMEMBERED_ACCOUNT_KEY); } catch { /* storage unavailable */ }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH CONTEXT  (sessionStorage — survives between pages, clears on tab close)
// ─────────────────────────────────────────────────────────────────────────────
export interface AuthCtx {
  email:   string;
  role:    AppRole;
  userId?: string;
  flow?:   'register' | 'forgot';
  /** Set once the forgot-password OTP step passes its own client-side format
   *  check, so NewPasswordPage can submit it together with the new password
   *  without asking the user to re-type it — the backend's reset-password
   *  endpoint only accepts otp+newPassword in one call, there is no separate
   *  "just verify the code" endpoint for this flow (unlike registration). */
  otp?:    string;
}

export const AuthContext = {
  set(data: AuthCtx) {
    sessionStorage.setItem('authCtx', JSON.stringify(data));
  },
  get(): AuthCtx | null {
    const s = sessionStorage.getItem('authCtx');
    return s ? (JSON.parse(s) as AuthCtx) : null;
  },
  clear() { sessionStorage.removeItem('authCtx'); },
};

// ─────────────────────────────────────────────────────────────────────────────
// API TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data:    T;
}

export interface RegisterPayload {
  name:     string;
  email:    string;
  password: string;
  phone:    string;
  address:  string;
  role:     AppRole;
}
interface RegisterData { userId: string; otp?: string }

export interface LoginPayload {
  email:    string;
  password: string;
  role:     AppRole;
}
interface LoginUser   { id: string; name: string; email: string; role: AppRole; image: string | null }
interface AuthTokens  { accessToken: string; refreshToken: string }
interface LoginData   { user: LoginUser; token: AuthTokens }

export interface VerifyOtpPayload { email: string; role: AppRole; otp: string }
interface VerifyOtpUser { id: string; name: string; email: string; phone: string; address: string }
interface VerifyOtpData { user: VerifyOtpUser; token: AuthTokens }

export interface ForgotPayload  { email: string; role: AppRole }
interface ForgotData            { userId: string; otp?: string }

export interface ResetPayload   { email: string; role: AppRole; otp: string; newPassword: string }

// ─────────────────────────────────────────────────────────────────────────────
// AUTH API FUNCTIONS  (all use Axios client → base URL from .env)
// ─────────────────────────────────────────────────────────────────────────────

/** POST /auth/register — sends OTP to email */
export function apiRegister(payload: RegisterPayload) {
  return client.post<never, ApiResponse<RegisterData>>(ENDPOINTS.AUTH.REGISTER, payload);
}

/** POST /auth/login — returns user + tokens */
export function apiLogin(payload: LoginPayload) {
  return client.post<never, ApiResponse<LoginData>>(ENDPOINTS.AUTH.LOGIN, payload);
}

/** POST /auth/verifyOtp — verifies OTP after register, returns tokens */
export function apiVerifyOtp(payload: VerifyOtpPayload) {
  return client.post<never, ApiResponse<VerifyOtpData>>(ENDPOINTS.AUTH.VERIFY_OTP, payload);
}

/** POST /auth/forgot-password — sends OTP for password reset */
export function apiForgotPassword(payload: ForgotPayload) {
  return client.post<never, ApiResponse<ForgotData>>(ENDPOINTS.AUTH.FORGOT_PASSWORD, payload);
}

/** POST /auth/reset-password — verifies OTP + changes password in ONE call */
export function apiResetPassword(payload: ResetPayload) {
  return client.post<never, ApiResponse<Record<string, never>>>(ENDPOINTS.AUTH.RESET_PASSWORD, payload);
}

/** POST /auth/logout — invalidates the current access token's Redis session server-side */
export function apiLogout() {
  return client.post<never, ApiResponse<Record<string, never>>>(ENDPOINTS.AUTH.LOGOUT);
}

/** GET /auth/getprofile — returns logged-in user's profile */
export interface ProfileData {
  _id:          string;
  name:         string;
  email:        string;
  phone:        string;
  address:      string;
  isVerified:   boolean;
  profileImage: string | null;
  status:       string;
  role:         AppRole;
  /** Explicit buyer currency choice — null until the buyer picks one, in
   *  which case it's the cross-device source of truth for checkout/display
   *  currency (see CurrencyPreferenceContext). */
  currencyPreference: 'PKR' | 'USD' | null;
  createdAt:    string;
  updatedAt:    string;
}

export function apiGetProfile() {
  return client.get<never, ApiResponse<ProfileData>>(ENDPOINTS.AUTH.GET_PROFILE);
}

/** POST /auth/edit-profile — updates the logged-in user's profile */
export interface EditProfilePayload {
  name?:    string;
  phone?:  string;
  address?: string;
  profileImage?: string;
  currencyPreference?: 'PKR' | 'USD';
}

export function apiEditProfile(payload: EditProfilePayload) {
  return client.patch<never, ApiResponse<ProfileData>>(ENDPOINTS.AUTH.EDIT_PROFILE, payload);
}

/** POST /auth/resend-otp — resends OTP to email during signup/forgot-password flow */
export interface ResendOtpPayload { email: string; role: AppRole }
interface ResendOtpData { userId: string; otp?: string }

export function apiResendOtp(payload: ResendOtpPayload) {
  return client.post<never, ApiResponse<ResendOtpData>>(ENDPOINTS.AUTH.RESEND_OTP, payload);
}

/** POST /auth/social-login — signs in user using social credentials */
export interface SocialLoginPayload {
  authProvider: 'google' | 'facebook' | 'apple';
  socialId:     string;
  userName?:    string;
  name?:        string;
  email:        string;
  image?:       string;
  fcmToken?:    string;
  token?:       string;
  /** Which collection this should resolve against — defaults to 'user' on the backend if omitted. */
  role?:        AppRole;
}

export function apiSocialLogin(payload: SocialLoginPayload) {
  return client.post<never, ApiResponse<LoginData>>(ENDPOINTS.AUTH.SOCIAL_LOGIN, payload);
}

