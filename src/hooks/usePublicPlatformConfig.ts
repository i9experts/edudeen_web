import { useEffect } from 'react';
import { apiGetPublicPlatformConfig, type PublicPlatformConfig } from '@/api/services/publicPlatformConfig';
import { createSharedResource } from '@/hooks/createSharedResource';
import { subscribeLive } from '@/api/realtime';

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

// ONE live subscription for all consumers. Each consumer used to subscribe on its own, so a single 'config' event
// (or a socket reconnect) made every mounted consumer (footer, ticker, promo parts...) force its own request.
let liveUsers = 0;
let liveOff: (() => void) | null = null;
function useSharedLiveConfig() {
  useEffect(() => {
    if (liveUsers++ === 0) liveOff = subscribeLive(['config'], () => resource.refresh());
    return () => { if (--liveUsers === 0 && liveOff) { liveOff(); liveOff = null; } };
  }, []);
}

export function usePublicPlatformConfig() {
  const { data, loading, refetch } = resource.useSharedResource();
  // Admin changed hero text, social links, payment info, fees... -> every open page picks it up (one shared request).
  useSharedLiveConfig();
  // Until the fresh copy arrives (or if the request fails) fall back to the cached one; only a first-ever visit waits.
  const config = data ?? cachedAtStart;
  /** Re-fetches the shared config so every consumer updates without a reload (used after an inline admin edit). */
  return { config, loading: loading && !config, refresh: refetch };
}
