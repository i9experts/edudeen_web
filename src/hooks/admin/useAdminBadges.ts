import { useEffect, useSyncExternalStore } from 'react';
import { apiStaffUnreadTasks, apiApprovalCount } from '@/api/services/staff';
import { apiGetListingReviewCount } from '@/api/services/marketplace/adminMarketplace';
import { apiAdminPremiumStats } from '@/api/services/adminPremium';
import { apiAdminChatStats } from '@/api/services/adminChat';
import { apiGetPendingCounts } from '@/api/services/adminExports';
import { navAllowed } from '@/hooks/admin/useAdminAccess';

// ONE shared poller for the sidebar badges: a request per badge at most every 60 s,
// not on every navigation, and paused while the tab is hidden.
export interface AdminBadges { listings: number; premium: number; chats: number; team: number; payouts: number; proofs: number; refunds: number; promotions: number }
const EMPTY: AdminBadges = { listings: 0, premium: 0, chats: 0, team: 0, payouts: 0, proofs: 0, refunds: 0, promotions: 0 };
const REFRESH_MS = 60_000;

let state: AdminBadges = EMPTY;
let lastFetch = 0;
let inFlight = false;
let chatApiMissing = false; // API answered 404 for chat: stop asking until reload
let timer: ReturnType<typeof setInterval> | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach(s => s());

async function refresh(force = false) {
  if (inFlight || (typeof document !== 'undefined' && document.hidden)) return;
  if (!force && Date.now() - lastFetch < REFRESH_MS - 1000) return;
  inFlight = true;
  lastFetch = Date.now();
  try {
    // One cached call (API: 45 s) for every approval queue; staff only get the queues their rights cover.
    // An API without the endpoint just keeps the old per-listing count.
    const [pending, premium, chats, tasks, approvals] = await Promise.all([
      apiGetPendingCounts().then(r => r.data ?? null).catch(() => null),
      apiAdminPremiumStats().then(r => r.data?.pendingPayments ?? 0).catch(() => state.premium),
      chatApiMissing ? Promise.resolve(0)
        : apiAdminChatStats().then(r => r.data?.unread ?? 0).catch((e: { status?: number }) => { if (e?.status === 404) chatApiMissing = true; return state.chats; }),
      navAllowed('collaboration') ? apiStaffUnreadTasks().then(r => r.data.count ?? 0).catch(() => null) : Promise.resolve(0),
      navAllowed('collaboration') ? apiApprovalCount().then(r => r.data.pending ?? 0).catch(() => null) : Promise.resolve(0),
    ]);
    const listings = pending ? pending.listings ?? 0 : navAllowed('marketplace') ? await apiGetListingReviewCount().then(r => r.data?.pending ?? 0).catch(() => state.listings) : 0;
    state = {
      listings, premium, chats,
      team: tasks === null && approvals === null ? state.team : (tasks ?? 0) + (approvals ?? 0),
      payouts: pending ? pending.payouts ?? 0 : state.payouts,
      proofs: pending ? pending.paymentProofs ?? 0 : state.proofs,
      refunds: pending ? pending.refunds ?? 0 : state.refunds,
      promotions: pending ? pending.promotions ?? 0 : state.promotions,
    };
    emit();
  } finally {
    inFlight = false;
  }
}

function start() {
  if (timer) return;
  void refresh(true);
  timer = setInterval(() => { void refresh(); }, REFRESH_MS);
  document.addEventListener('visibilitychange', onVisible);
}
function stop() {
  if (timer) { clearInterval(timer); timer = null; }
  document.removeEventListener('visibilitychange', onVisible);
}
function onVisible() { if (!document.hidden) void refresh(); }

/** Forces a fresh read (e.g. after approving something that changes a count). */
export const refreshAdminBadges = () => refresh(true);

export function useAdminBadges(): AdminBadges {
  useEffect(() => { start(); }, []); // stop() runs when the last subscriber leaves
  return useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); if (subs.size === 0) stop(); }; }, () => state);
}
