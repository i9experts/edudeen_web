/**
 * Cookie-backed storage for the auth session — replaces `localStorage` as
 * `TokenStorage`'s backend so a login on `edudeen.com` is visible on every
 * seller storefront subdomain (`hello.edudeen.com`, ...). `localStorage`
 * is locked to one exact origin (scheme+host+port) — a token saved there on
 * the main domain is invisible on a subdomain, which would otherwise log
 * every buyer out the moment they land on a store. A cookie scoped to
 * `domain=.edudeen.com` (or `localhost` in dev) is visible from any
 * subdomain, so this is a same-security-level swap (both are JS-readable,
 * equally exposed to XSS) purely to fix the storage *scope*, not a security
 * downgrade.
 *
 * IP-address hosts (e.g. testing via `127.0.0.1`) can't take a `domain`
 * attribute at all (browsers reject it for IPs) — those fall back to a
 * plain host-only cookie, which is fine since an IP has no subdomains to
 * share with anyway.
 */

const MAX_AGE_SECONDS = 400 * 24 * 60 * 60; // ~400 days — the browser-enforced cap, matches "persists until logout" like localStorage did

function isIpAddress(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === '[::1]';
}

function cookieDomain(): string | null {
  const { hostname } = window.location;
  if (isIpAddress(hostname)) return null;
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return 'localhost';
  const parts = hostname.split('.');
  if (parts.length < 2) return null;
  return `.${parts.slice(-2).join('.')}`;
}

// `persistent = false` ("remember me" unchecked) omits `max-age` entirely,
// which makes it a session cookie — cleared when the browser itself closes,
// instead of surviving ~400 days. Every existing call site keeps the long-
// lived default, so omitting the param changes nothing for them.
// ── Admin "Manage as seller" session ─────────────────────────────────────────
// The token lives in THIS TAB's sessionStorage only. While it is present, the auth cookie names below are served from it
// and never written/deleted, so the admin's own cookies (shared by every tab) are never overwritten. No refresh token.
const ACT_AS_KEY = 'edudeen_actas';
const ACT_AS_HANDOFF_KEY = 'edudeen_actas_handoff';
const ACT_AS_HANDOFF_MAX_AGE_MS = 20_000;
const ACT_AS_NAMES = new Set(['accessToken', 'refreshToken', 'user', 'authRemember']);

/** kind: 'admin' (Edudeen admin managing a store) or 'collaborator' (a store team member; roleName + permissions for the UI only, the server enforces them). */
export interface ActAsSession { token: string; storeId: string; storeName: string; expiresAt: number; kind?: 'admin' | 'collaborator'; roleName?: string; permissions?: string[] }

export function getActAsSession(): ActAsSession | null {
  try {
    const raw = sessionStorage.getItem(ACT_AS_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ActAsSession;
    if (!s?.token || !s.storeId || !(s.expiresAt > Date.now())) { sessionStorage.removeItem(ACT_AS_KEY); return null; }
    return s;
  } catch { return null; }
}

export function endActAsSession(): void {
  try { sessionStorage.removeItem(ACT_AS_KEY); } catch { /* storage blocked */ }
}

/** Admin tab: leave the session for the new tab to pick up (localStorage is shared between tabs; sessionStorage is not). */
export function handOffActAsSession(s: ActAsSession): boolean {
  try { localStorage.setItem(ACT_AS_HANDOFF_KEY, JSON.stringify({ ...s, handedAt: Date.now() })); return true; } catch { return false; }
}

/** New tab, once at startup (URL has ?actas=1): move the handed-off session into this tab's sessionStorage and erase the hand-off. */
export function consumeActAsHandoff(): void {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('actas') !== '1') return;
    const raw = localStorage.getItem(ACT_AS_HANDOFF_KEY);
    localStorage.removeItem(ACT_AS_HANDOFF_KEY);
    url.searchParams.delete('actas');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    if (!raw) return;
    const h = JSON.parse(raw) as ActAsSession & { handedAt?: number };
    if (!h?.token || !h.storeId || !(h.handedAt && Date.now() - h.handedAt < ACT_AS_HANDOFF_MAX_AGE_MS) || !(h.expiresAt > Date.now())) return;
    sessionStorage.setItem(ACT_AS_KEY, JSON.stringify({ token: h.token, storeId: h.storeId, storeName: h.storeName, expiresAt: h.expiresAt, kind: h.kind === 'collaborator' ? 'collaborator' : 'admin', roleName: h.roleName, permissions: Array.isArray(h.permissions) ? h.permissions : undefined }));
  } catch { /* storage blocked: stays a normal session */ }
}

export function setAuthCookie(name: string, value: string, persistent = true): void {
  if (ACT_AS_NAMES.has(name) && getActAsSession()) return;
  const domain = cookieDomain();
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `path=/`,
    `SameSite=Lax`,
  ];
  if (persistent) parts.push(`max-age=${MAX_AGE_SECONDS}`);
  if (domain) parts.push(`domain=${domain}`);
  if (window.location.protocol === 'https:') parts.push('Secure');
  document.cookie = parts.join('; ');
}

export function getAuthCookie(name: string): string | null {
  if (ACT_AS_NAMES.has(name)) {
    const a = getActAsSession();
    if (a) {
      if (name === 'accessToken') return a.token;
      if (name === 'user') return JSON.stringify({ role: 'seller', name: 'Edudeen admin', actAs: true });
      if (name === 'authRemember') return '0';
      return null; // refreshToken: a manage session is never refreshed
    }
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
}

export function deleteAuthCookie(name: string): void {
  if (ACT_AS_NAMES.has(name) && getActAsSession()) return;
  const domain = cookieDomain();
  const parts = [`${name}=`, `path=/`, `max-age=0`];
  if (domain) parts.push(`domain=${domain}`);
  document.cookie = parts.join('; ');
}
