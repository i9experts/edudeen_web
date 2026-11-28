import { useEffect, useSyncExternalStore } from 'react';
import { apiStaffMe, type StaffMember } from '@/api/services/staff';
import { TokenStorage } from '@/api/services/auth';

// One shared copy of "who am I and what may I do" for the admin panel.
// FAIL CLOSED: until the profile has loaded (or if it cannot be loaded) nothing that needs a permission is shown;
// the server enforces the same rules either way, this only decides what the sidebar/buttons offer.
type Status = 'idle' | 'loading' | 'ready' | 'error';
let me: StaffMember | null = null;
let status: Status = 'idle';
let attempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_ATTEMPTS = 4;
const subs = new Set<() => void>();
const emit = () => subs.forEach(s => s());

export function loadAdminAccess(force = false) {
  if (!TokenStorage.isLoggedIn()) return;
  if (status === 'loading' || (status === 'ready' && !force)) return;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  if (force) attempt = 0;
  status = 'loading'; emit();
  apiStaffMe()
    .then(r => { me = r.data; status = 'ready'; attempt = 0; })
    .catch(() => {
      attempt += 1;
      if (attempt < MAX_ATTEMPTS && TokenStorage.isLoggedIn()) {
        status = 'idle';
        retryTimer = setTimeout(() => { retryTimer = null; loadAdminAccess(); }, 1500 * 2 ** (attempt - 1));
      } else {
        status = 'error';
      }
    })
    .finally(emit);
}
/** Forgets the loaded profile (sign-out, account switch). */
export const resetAdminAccess = () => {
  me = null; status = 'idle'; attempt = 0;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  emit();
};
// A different admin signing in on the same tab must never inherit the previous person's rights.
if (typeof window !== 'undefined') {
  window.addEventListener('edudeen:auth-logout', resetAdminAccess);
  window.addEventListener('edudeen:auth-login', resetAdminAccess);
}

/** Which sidebar page needs which permission (the server enforces the same rules; this only hides what would be refused). */
// An array = any one of them is enough.
const NAV_PERMISSION: Record<string, string | string[] | null> = {
  overview: null, settings: null, collaboration: 'staff.view', analytics: 'analytics.view', 'activity-log': 'activity.view',
  users: 'users.view', leads: 'marketplace.view', stores: 'managed.manage', 'my-stores': 'stores.operate',
  // Everyone with operations.view sees all stores; a store operator sees the stores assigned to them.
  operations: ['operations.view', 'stores.operate'], 'team-performance': 'operations.view', moderation: 'moderation.view', messages: 'support.view',
  orders: 'orders.view', refunds: 'orders.view', 'shipping-zones': 'config.view', marketplace: 'marketplace.view', categories: 'categories.manage',
  'platform-plans': 'plans.view', premium: 'plans.view', marketing: 'marketing.view', picks: 'marketing.view',
  finance: 'finance.view', 'monthly-payouts': 'finance.view', 'manual-payments': 'payments.view', 'fx-settings': 'finance.view',
  seo: 'seo.view', 'ai-studio': 'ai.manage', banners: 'content.view', 'home-cards': 'content.view', faqs: 'content.view', testimonials: 'content.view', announcements: 'content.view', academy: 'content.view',
  'app-slides': 'content.view', config: 'config.view',
  // /api/admin/learning-paths is not mapped for staff on the server (default-deny) -> owner only
  'learning-paths': 'staff.manage',
  // KYC shows ID and tax numbers; /api/admin/seller-kyc has no staff rule on the server (default-deny) -> owner only
  'seller-kyc': 'staff.manage',
};

const allows = (m: StaffMember | null, perm: string | string[] | null | undefined) =>
  !perm || (Array.isArray(perm) && !perm.length) || (!!m && (m.isOwner || (Array.isArray(perm) ? perm.some(p => m.permissions.includes(p)) : m.permissions.includes(perm))));

/** Synchronous check used by the sidebar lists (AdminLayout re-renders them when access loads). */
export function navAllowed(id: string): boolean {
  return allows(me, NAV_PERMISSION[id] ?? null);
}

export function useAdminAccess() {
  useEffect(() => { loadAdminAccess(); }, []);
  const current = useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => me);
  const state = useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => status);
  const can = (perm: string | string[] | null | undefined) => allows(current, perm);
  return {
    me: current,
    /** true only once the server confirmed this account is an owner */
    isOwner: !!current?.isOwner,
    ready: state === 'ready',
    failed: state === 'error',
    retry: () => loadAdminAccess(true),
    can,
    canNav: (id: string) => can(NAV_PERMISSION[id] ?? null),
  };
}
