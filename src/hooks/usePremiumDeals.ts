import { useEffect, useState } from 'react';
import { apiGetPremiumDeals } from '@/api/services/premium';
import type { MarketplaceProduct } from '@/api/services/marketplace';
import { usePremium } from '@/hooks/usePremium';

export interface PremiumDeal { product: MarketplaceProduct; pct: number }

const TTL_MS = 60_000;
let cache: { at: number; deals: PremiumDeal[] } | null = null;
let inflight: Promise<PremiumDeal[]> | null = null;

function load(): Promise<PremiumDeal[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.deals);
  if (inflight) return inflight;
  inflight = apiGetPremiumDeals(12)
    .then(res => {
      const deals = (res.data?.products ?? [])
        .map(product => {
          const v = (product.variants ?? []).find(x => x.isDefault && x.premiumPrice != null) ?? (product.variants ?? []).find(x => x.premiumPrice != null);
          return { product, pct: Math.floor((v?.premiumDiscountPercent ?? 0) + 1e-9) };
        })
        .filter(d => d.pct > 0)
        .sort((a, b) => b.pct - a.pct);
      cache = { at: Date.now(), deals };
      return deals;
    })
    .catch(() => [] as PremiumDeal[])
    .finally(() => { inflight = null; });
  return inflight;
}

if (typeof window !== 'undefined') {
  const reset = () => { cache = null; };
  window.addEventListener('edudeen:auth-login', reset);
  window.addEventListener('edudeen:auth-logout', reset);
}

/**
 * Premium Deals for MEMBERS (highest effective Premium percent first). `deals` is null for everyone else and while
 * loading / when there is nothing to show, so callers fall back to the normal Flash Sale in those cases.
 */
export function usePremiumDeals(): { isPremium: boolean; deals: PremiumDeal[] | null } {
  const { isPremium } = usePremium();
  const [deals, setDeals] = useState<PremiumDeal[] | null>(cache && Date.now() - cache.at < TTL_MS ? cache.deals : null);
  useEffect(() => {
    if (!isPremium) { setDeals(null); return; }
    let cancelled = false;
    load().then(d => { if (!cancelled) setDeals(d); });
    return () => { cancelled = true; };
  }, [isPremium]);
  return { isPremium, deals: isPremium && deals && deals.length > 0 ? deals : null };
}