import { useEffect, useRef } from 'react';
import { subscribeLive } from '@/api/realtime';

/**
 * Re-run `refetch` whenever data under one of `topics` changes anywhere on the platform.
 * Topics: orders, finance, products, catalog, campaigns, banners, config, categories, reviews,
 * plans, premium, subscriptions, notifications, messaging ... (the first API path segment, see
 * the API's realtime.service.ts). `refetch` should update state quietly (no full-page skeleton).
 */
export function useLiveRefresh(topics: readonly string[], refetch: () => void, enabled = true) {
  const ref = useRef(refetch);
  ref.current = refetch;
  const key = topics.join('|');
  useEffect(() => {
    if (!enabled) return;
    return subscribeLive(key.split('|'), () => ref.current());
  }, [key, enabled]);
}
