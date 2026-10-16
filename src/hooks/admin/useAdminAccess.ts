import { useEffect, useSyncExternalStore } from 'react';
import { apiStaffMe, type StaffMember } from '@/api/services/staff';
import { TokenStorage } from '@/api/services/auth';

// One shared copy of "who am I and what may I do" for the admin panel.
let me: StaffMember | null = null;
let loading = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach(s => s());

export function loadAdminAccess(force = false) {
  if ((me && !force) || loading || !TokenStorage.isLoggedIn()) return;
  loading = true;
  apiStaffMe().then(r => { me = r.data; }).catch(() => {}).finally(() => { loading = false; emit(); });
}
export const resetAdminAccess = () => { me = null; emit(); };

/** Which sidebar page needs which permission (the server enforces the same rules; this only hides what would be refused). */
const NAV_PERMISSION: Record<string, string | null> = {
  overview: null, settings: null, collaboration: 'staff.view', analytics: 'analytics.view', 'activity-log': 'activity.view',
  users: 'users.view', leads: 'marketplace.view', moderation: 'moderation.view', messages: 'support.view',
  orders: 'orders.view', refunds: 'orders.view', 'shipping-zones': 'config.view', marketplace: 'marketplace.view', categories: 'categories.manage',
  subscriptions: 'plans.view', 'platform-plans': 'plans.view', premium: 'plans.view', marketing: 'marketing.view', picks: 'marketing.view',
  finance: 'finance.view', 'monthly-payouts': 'finance.view', 'manual-payments': 'payments.view', 'fx-settings': 'finance.view',
  seo: 'seo.view', 'ai-studio': 'ai.manage', banners: 'content.view', faqs: 'content.view', testimonials: 'content.view', announcements: 'content.view',
  'app-slides': 'content.view', config: 'config.view',
};

/** Synchronous check used by the sidebar lists (AdminLayout re-renders them when access loads). */
export function navAllowed(id: string): boolean {
  const perm = NAV_PERMISSION[id] ?? null;
  return !perm || !me || me.isOwner || me.permissions.includes(perm);
}

export function useAdminAccess() {
  useEffect(() => { loadAdminAccess(); }, []);
  const current = useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => me);
  const can = (perm: string | null | undefined) => !perm || !current || current.isOwner || current.permissions.includes(perm);
  return { me: current, isOwner: !current || current.isOwner, can, canNav: (id: string) => can(NAV_PERMISSION[id] ?? null) };
}
