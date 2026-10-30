import { useEffect, useSyncExternalStore } from 'react';
import { apiGetPremiumMe, type PremiumMe } from '@/api/services/premium';
import { isBuyerSession } from '@/hooks/auth/useIsBuyer';
import { TokenStorage } from '@/api/services/auth';
import { subscribeLive, wroteRecently } from '@/api/realtime';

// One shared store for the buyer's Edudeen Premium status (GET /api/premium/me), so cards, cart,
// checkout, account and the header all agree without a provider. Skipped for guests / sellers / admins.

interface State { me: PremiumMe | null; loading: boolean; loaded: boolean; error: string }
const EMPTY: State = { me: null, loading: false, loaded: false, error: '' };
let state: State = EMPTY;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const setState = (patch: Partial<State>) => { state = { ...state, ...patch }; emit(); };

let owner = '';
const currentOwner = () => { const u = TokenStorage.getUser<{ id?: string; _id?: string; email?: string }>(); return u?.id ?? u?._id ?? u?.email ?? ''; };
let inflight: Promise<void> | null = null;

/** Re-fetch (after subscribe / proof / cancel / resume). */
export function refreshPremium(): Promise<void> {
  if (!isBuyerSession()) { state = EMPTY; emit(); return Promise.resolve(); }
  if (inflight) return inflight;
  owner = currentOwner();
  setState({ loading: true, error: '' });
  inflight = apiGetPremiumMe()
    .then(res => setState({ me: res.data ?? null, loaded: true, loading: false }))
    .catch(err => setState({ error: err instanceof Error ? err.message : 'Could not load your Premium status.', loaded: true, loading: false }))
    .finally(() => { inflight = null; });
  return inflight;
}

// Admin approved / revoked / expired a membership, plans or prices changed: ONE quiet re-read for every consumer.
// Only once the status has been loaded; our own write's echo is skipped; a failure keeps what is on screen.
if (typeof window !== 'undefined') {
  subscribeLive(['premium', 'plans', 'config'], () => {
    if (!state.loaded || inflight || !isBuyerSession() || wroteRecently('premium')) return;
    inflight = apiGetPremiumMe()
      .then(res => setState({ me: res.data ?? null }))
      .catch(() => { /* keep the current status */ })
      .finally(() => { inflight = null; });
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('edudeen:auth-logout', () => { state = EMPTY; owner = ''; emit(); });
  window.addEventListener('edudeen:auth-login', () => { state = EMPTY; owner = ''; emit(); });
}

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getState = () => state;

/** Premium status of the signed-in buyer. `isPremium` is false for everyone else. */
export function usePremium() {
  const s = useSyncExternalStore(subscribe, getState);
  const buyer = isBuyerSession();

  useEffect(() => {
    if (!buyer) return;
    if (s.loaded && owner !== currentOwner()) { state = EMPTY; emit(); return; }
    if (!s.loaded && !s.loading) void refreshPremium();
  }, [buyer, s.loaded, s.loading]);

  const me = buyer ? s.me : null;
  return {
    me,
    isPremium: !!me?.isPremium,
    entitlements: me?.entitlements ?? null,
    membership: me?.membership ?? null,
    coupon: me?.coupon ?? null,
    pendingPayment: me?.pendingPayment ?? null,
    loading: buyer && (s.loading || !s.loaded),
    error: buyer ? s.error : '',
    isBuyer: buyer,
    reload: refreshPremium,
  };
}
