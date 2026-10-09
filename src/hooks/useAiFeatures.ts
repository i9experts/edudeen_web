import { useEffect, useState } from 'react';
import { apiGetAiFeatures, type AiFeaturesState } from '@/api/services/aiFeatures';

// One shared, short-lived cache per store so several widgets on a page cost a single request.
const cache = new Map<string, { at: number; state: AiFeaturesState }>();
const inflight = new Map<string, Promise<AiFeaturesState>>();
const TTL = 60_000;
const OFF: AiFeaturesState = { available: false, studio: false, features: {} };
// The six original AI Studio tools also run on the dev mock provider, so they follow "studio" instead of "available".
const LEGACY = new Set(['listing_writer', 'price_optimizer', 'worksheet_builder', 'seo_booster', 'email_campaigns', 'image_enhancer']);

function load(storeId?: string): Promise<AiFeaturesState> {
  const key = storeId ?? '';
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return Promise.resolve(hit.state);
  let p = inflight.get(key);
  if (!p) {
    p = apiGetAiFeatures(storeId)
      .then((r) => r.data)
      .catch(() => OFF) // API down / old API: AI UI stays hidden
      .then((state) => { cache.set(key, { at: Date.now(), state }); inflight.delete(key); return state; });
    inflight.set(key, p);
  }
  return p;
}

/** `enabled(key)` is true only when the server has AI configured AND the admin has not switched the feature off. */
export function useAiFeatures(storeId?: string) {
  const [state, setState] = useState<AiFeaturesState | null>(() => cache.get(storeId ?? '')?.state ?? null);
  useEffect(() => {
    let alive = true;
    void load(storeId).then((s) => { if (alive) setState(s); });
    return () => { alive = false; };
  }, [storeId]);
  return {
    loading: state === null,
    available: !!state?.available,
    enabled: (key: string) => !!state && (LEGACY.has(key) ? !!(state.studio ?? state.available) : state.available) && state.features[key] !== false,
  };
}
