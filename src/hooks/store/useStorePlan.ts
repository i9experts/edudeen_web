import { useEffect, useState } from 'react';
import { apiGetStorePlatformPlan, type StorePlatformSubscription } from '@/api/services/platformPlans';

// ONE source for "which plan is this store on": GET /api/platform-plans/:storeId (request-cached).
// The sidebar, the dashboard store card and Plan & Billing all label the plan through this file.
export const NO_PLAN_LABEL = 'No active plan';

export function planTrialDaysLeft(sub: StorePlatformSubscription | null | undefined): number | null {
  if (sub?.status !== 'trialing' || !sub.trialEndsAt) return null;
  return Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86400000));
}

/** Plan name only ("Pro"), or "No active plan". */
export function planName(sub: StorePlatformSubscription | null | undefined): string {
  return sub?.plan?.name || NO_PLAN_LABEL;
}

/** Plan name with trial countdown ("Free Trial (trial: 5d left)"), or "No active plan". */
export function planLabel(sub: StorePlatformSubscription | null | undefined): string {
  const left = planTrialDaysLeft(sub);
  return sub?.plan?.name ? `${sub.plan.name}${left != null ? ` (trial: ${left}d left)` : ''}` : NO_PLAN_LABEL;
}

const ENDED_STATUSES = ['expired', 'past_due', 'canceled'];

/**
 * Sidebar plan line. Cases:
 *  - plan ended (expired / past_due / canceled -> listings hidden): "Plan ended" -> plan-expired screen
 *  - free plan (not a trial): "Free plan" + Upgrade -> Plan & Billing
 *  - paid / trial plan: its name (+ trial countdown), no CTA
 *  - no subscription row at all: entitlements' plan name if it has one, else "No plan" -> Plan & Billing
 */
export function sidebarPlanInfo(
  sub: StorePlatformSubscription | null | undefined,
  storeId: string,
  entitlementsPlanName?: string | null,
): { text: string; cta: string | null; to: string | null } {
  const billing = `/store/${storeId}/plan-billing`;
  if (sub && ENDED_STATUSES.includes(sub.status)) {
    return { text: 'Plan ended', cta: 'Choose a plan', to: `/store/${storeId}/plan-expired` };
  }
  if (sub?.plan?.name) {
    if (sub.plan.isFree && sub.status !== 'trialing') return { text: 'Free plan', cta: 'Upgrade', to: billing };
    return { text: planLabel(sub), cta: null, to: null };
  }
  if (entitlementsPlanName && !/^(none|no plan)/i.test(entitlementsPlanName)) {
    return { text: entitlementsPlanName, cta: null, to: null };
  }
  return { text: 'No plan', cta: 'Choose a plan', to: billing };
}

export function useStorePlan(storeId: string | undefined) {
  const [sub, setSub] = useState<StorePlatformSubscription | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    apiGetStorePlatformPlan(storeId)
      .then(res => { if (!cancelled) { setSub(res.data ?? null); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [storeId]);
  return { sub, loaded, label: planLabel(sub), name: planName(sub), hasPlan: !!sub?.plan?.name };
}
