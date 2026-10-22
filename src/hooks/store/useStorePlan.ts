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
