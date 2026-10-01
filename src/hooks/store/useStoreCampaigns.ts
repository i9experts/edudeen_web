import { useCallback, useEffect, useState } from 'react';
import { apiGetJoinableCampaigns, apiJoinCampaign, apiLeaveCampaign, type JoinableCampaign } from '@/api/services/marketing';

// Admin-created sale campaigns as seen by one store. Shared by the store
// dashboard's sale card, the sidebar's Marketing badge and the Marketing page,
// so joining in one place updates the others without a reload.
const TTL_MS = 60_000;
const CHANGED = 'edudeen:store-campaigns-changed';
const cache = new Map<string, { at: number; data: JoinableCampaign[] }>();
const inflight = new Map<string, Promise<JoinableCampaign[]>>();

function load(storeId: string, force = false): Promise<JoinableCampaign[]> {
  const hit = cache.get(storeId);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.data);
  const running = inflight.get(storeId);
  if (running) return running;
  const p = apiGetJoinableCampaigns(storeId)
    .then(res => {
      const data = res.data ?? [];
      cache.set(storeId, { at: Date.now(), data });
      return data;
    })
    .finally(() => inflight.delete(storeId));
  inflight.set(storeId, p);
  return p;
}

/** Live/upcoming campaigns for this store, plus join/leave that keep every
 *  user of this hook in sync. `needsAction` = seller-sponsored ones not joined yet. */
export function useStoreCampaigns(storeId: string | undefined) {
  const [campaigns, setCampaigns] = useState<JoinableCampaign[]>(() => (storeId && cache.get(storeId)?.data) || []);
  const [loading, setLoading] = useState(!storeId || !cache.has(storeId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    const run = (force: boolean) => {
      load(storeId, force)
        .then(data => { if (!cancelled) { setCampaigns(data); setError(''); } })
        .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load campaigns.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    run(false);
    const onChanged = (e: Event) => {
      if ((e as CustomEvent<string>).detail === storeId) setCampaigns(cache.get(storeId)?.data ?? []);
    };
    window.addEventListener(CHANGED, onChanged);
    return () => { cancelled = true; window.removeEventListener(CHANGED, onChanged); };
  }, [storeId]);

  const toggle = useCallback(async (campaign: JoinableCampaign) => {
    if (!storeId) return;
    if (campaign.isJoined) await apiLeaveCampaign(storeId, campaign._id);
    else await apiJoinCampaign(storeId, campaign._id);
    const next = (cache.get(storeId)?.data ?? campaigns).map(c => c._id === campaign._id ? { ...c, isJoined: !c.isJoined } : c);
    cache.set(storeId, { at: Date.now(), data: next });
    setCampaigns(next);
    window.dispatchEvent(new CustomEvent(CHANGED, { detail: storeId }));
  }, [storeId, campaigns]);

  const needsAction = campaigns.filter(c => c.sponsorType === 'seller' && !c.isJoined).length;
  return { campaigns, loading, error, toggle, needsAction };
}
