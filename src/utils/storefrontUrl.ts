/**
 * Builds an absolute URL to a store's subdomain-based storefront —
 * `hello.localhost:3000/about-us` in dev, `hello.solvexo.store/about-us` in
 * production. A subdomain is a different origin from wherever the link
 * lives (Marketplace, ProductDetail, checkout, etc.), so this always returns
 * a full URL for a hard navigation (`window.location.href` or a plain
 * `<a href>`) — React Router's client-side `navigate()`/`<Link>` cannot
 * cross an origin boundary, only works for links *within* an already-loaded
 * storefront (see `StorefrontContext.resolveLink`, which stays relative).
 */
// Infra subdomains that are never a store slug — kept separate from the
// backend's `RESERVED_STORE_SLUGS` (which reserves top-level *path* segments
// on the apex domain, a different namespace entirely).
const RESERVED_HOST_PREFIXES = ['www', 'staging', 'api'];

/**
 * Reads the current store slug from the browser's hostname, or `null` when
 * on the main app (apex domain). Called once at router-selection time
 * (`router/index.tsx` picks the storefront-only route tree vs. the full app
 * tree based on this) and again inside `StorefrontLayout` to know which
 * store to load — the hostname is stable for the lifetime of a page load,
 * so this is safe to call repeatedly without memoizing.
 */
export function getStoreSlugFromHost(): string | null {
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;

  if (hostname.endsWith('.localhost')) {
    const prefix = hostname.slice(0, -'.localhost'.length);
    return RESERVED_HOST_PREFIXES.includes(prefix) ? null : prefix;
  }

  const parts = hostname.split('.');
  if (parts.length <= 2) return null; // apex domain, e.g. 'edudeen.com'
  const prefix = parts.slice(0, -2).join('.');
  return RESERVED_HOST_PREFIXES.includes(prefix) ? null : prefix;
}

// The platform's own apex domain(s) — a hostname that is neither one of
// these, nor a `*.solvexo.store` subdomain (handled by `getStoreSlugFromHost`
// above), nor localhost, is treated as a possible seller-connected CUSTOM
// domain (see `isCustomDomainCandidate`). Kept as a small array (not a single
// string) in case a staging apex is ever added.
const PLATFORM_APEX_DOMAINS = ['edudeen.com'];

/**
 * True for any hostname that isn't the platform's own apex/subdomain and
 * isn't localhost — i.e. a domain a seller may have connected via Custom
 * Domain (`DomainWhiteLabelCard`). Deliberately synchronous (no network
 * call) so `router/index.tsx` can decide the route tree at module-load time,
 * same as `getStoreSlugFromHost()` — the actual "which store, if any, is
 * this domain verified for" lookup happens later, inside `StorefrontLayout`,
 * via `apiResolveStoreByDomain`.
 */
export function isCustomDomainCandidate(): boolean {
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) return false;
  return !PLATFORM_APEX_DOMAINS.some(apex => hostname === apex || hostname.endsWith(`.${apex}`));
}

function baseDomain(): string {
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname.endsWith('.localhost')
    ? 'localhost'
    : hostname.split('.').slice(-2).join('.');
}

export function getStorefrontUrl(slug: string, path = ''): string {
  const { protocol, port } = window.location;
  const portSuffix = port ? `:${port}` : '';
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${protocol}//${slug}.${baseDomain()}${portSuffix}${cleanPath}`;
}

/** The reverse direction — from a store's subdomain back to the main app (apex domain), e.g. a storefront's "Back to Marketplace" link. */
export function getMainAppUrl(path = ''): string {
  const { protocol, port } = window.location;
  const portSuffix = port ? `:${port}` : '';
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${protocol}//${baseDomain()}${portSuffix}${cleanPath}`;
}
