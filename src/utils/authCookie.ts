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

export function setAuthCookie(name: string, value: string): void {
  const domain = cookieDomain();
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `path=/`,
    `max-age=${MAX_AGE_SECONDS}`,
    `SameSite=Lax`,
  ];
  if (domain) parts.push(`domain=${domain}`);
  if (window.location.protocol === 'https:') parts.push('Secure');
  document.cookie = parts.join('; ');
}

export function getAuthCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function deleteAuthCookie(name: string): void {
  const domain = cookieDomain();
  const parts = [`${name}=`, `path=/`, `max-age=0`];
  if (domain) parts.push(`domain=${domain}`);
  document.cookie = parts.join('; ');
}
