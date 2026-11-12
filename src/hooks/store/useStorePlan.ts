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

export type PlanStatusKind = 'trial' | 'trial_ended' | 'ended' | 'paid' | 'free' | 'none';

/**
 * ONE status for a store's plan - the sidebar line AND the Plan & Billing page both read it.
 * `ended` mirrors the backend rule (plan-listing-sync: expired / past_due / canceled hide live listings and
 * block adding products; a returning usable plan restores them). Nothing else is derived here.
 */
export function planStatus(sub: StorePlatformSubscription | null | undefined): {
  kind: PlanStatusKind; ended: boolean; trialDaysLeft: number | null; endsAt: string | null;
} {
  if (!sub) return { kind: 'none', ended: false, trialDaysLeft: null, endsAt: null };
  const ended = !!sub && ENDED_STATUSES.includes(sub.status);
  if (ended) {
    const wasTrial = !!sub?.plan?.isFree && (sub.plan.trialDays ?? 0) > 0;
    return { kind: wasTrial ? 'trial_ended' : 'ended', ended, trialDaysLeft: null, endsAt: sub?.trialEndsAt ?? sub?.currentPeriodEnd ?? null };
  }
  const left = planTrialDaysLeft(sub);
  if (sub?.status === 'trialing') return { kind: 'trial', ended, trialDaysLeft: left, endsAt: sub.trialEndsAt };
  if (sub?.plan?.isFree) return { kind: 'free', ended, trialDaysLeft: null, endsAt: null };
  return { kind: 'paid', ended, trialDaysLeft: null, endsAt: sub?.currentPeriodEnd ?? null };
}

/** One honest line about store visibility, from the real backend rule. */
export function planVisibilityLine(kind: PlanStatusKind): string {
  if (kind === 'trial_ended' || kind === 'ended') {
    return 'Your live products are hidden from buyers and you cannot add or publish new ones. Choose a plan and they come back automatically.';
  }
  if (kind === 'none') return 'No plan is set on this store yet. Choose a plan to unlock its features.';
  return 'Your store and products are visible to buyers.';
}

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
  if (planStatus(sub).ended) {
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
