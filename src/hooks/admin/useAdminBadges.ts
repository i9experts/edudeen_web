import { useEffect, useSyncExternalStore } from 'react';
import { apiStaffUnreadTasks, apiApprovalCount } from '@/api/services/staff';
import { apiGetListingReviewCount } from '@/api/services/marketplace/adminMarketplace';
import { apiAdminPremiumStats } from '@/api/services/adminPremium';
import { apiAdminChatStats } from '@/api/services/adminChat';
import { navAllowed } from '@/hooks/admin/useAdminAccess';

// ONE shared poller for the sidebar badges: a request per badge at most every 60 s,
// not on every navigation, and paused while the tab is hidden.
export interface AdminBadges { listings: number; premium: number; chats: number; team: number }
const EMPTY: AdminBadges = { listings: 0, premium: 0, chats: 0, team: 0 };
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
    const [listings, premium, chats, tasks, approvals] = await Promise.all([
      apiGetListingReviewCount().then(r => r.data?.pending ?? 0).catch(() => state.listings),
      apiAdminPremiumStats().then(r => r.data?.pendingPayments ?? 0).catch(() => state.premium),
      chatApiMissing ? Promise.resolve(0)
        : apiAdminChatStats().then(r => r.data?.unread ?? 0).catch((e: { status?: number }) => { if (e?.status === 404) chatApiMissing = true; return state.chats; }),
      navAllowed('collaboration') ? apiStaffUnreadTasks().then(r => r.data.count ?? 0).catch(() => null) : Promise.resolve(0),
      navAllowed('collaboration') ? apiApprovalCount().then(r => r.data.pending ?? 0).catch(() => null) : Promise.resolve(0),
    ]);
    state = { listings, premium, chats, team: tasks === null && approvals === null ? state.team : (tasks ?? 0) + (approvals ?? 0) };
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
