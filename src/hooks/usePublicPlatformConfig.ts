import { apiGetPublicPlatformConfig, type PublicPlatformConfig } from '@/api/services/publicPlatformConfig';
import { createSharedResource } from '@/hooks/createSharedResource';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

// Stale-while-revalidate: the last config the visitor saw is kept in localStorage and used straight away on the
// next visit (so the hero / footer never wait on the network or flash default text), while ONE fresh request
// runs per page load and replaces it. Storage may be blocked or full — every access is guarded.
const CACHE_KEY = 'edudeen:publicConfig:v1';

function readCached(): PublicPlatformConfig | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && parsed.socialLinks && parsed.payout ? (parsed as PublicPlatformConfig) : null;
  } catch { return null; }
}
function writeCached(config: PublicPlatformConfig) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(config)); } catch { /* storage blocked or full */ }
}

const cachedAtStart = readCached();

// One request per page load, shared by every consumer (footer, seller pages).
// Failure resolves to `null` — callers just hide whatever depended on it.
const resource = createSharedResource<PublicPlatformConfig | null>(() =>
  apiGetPublicPlatformConfig()
    .then(res => { const c = res.data ?? null; if (c) writeCached(c); return c; })
    .catch(() => null),
);

export function usePublicPlatformConfig() {
  const { data, loading, refetch } = resource.useSharedResource();
  // Admin changed hero text, social links, payment info, fees... -> every open page picks it up (shared: one request).
  useLiveRefresh(['config'], refetch);
  // Until the fresh copy arrives (or if the request fails) fall back to the cached one; only a first-ever visit waits.
  const config = data ?? cachedAtStart;
  /** Re-fetches the shared config so every consumer updates without a reload (used after an inline admin edit). */
  return { config, loading: loading && !config, refresh: refetch };
}
