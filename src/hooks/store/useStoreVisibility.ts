import { useMemo } from 'react';
import type { StoreData } from '@/api/services/store';
import { holidayBlocksType } from '@/utils/storeHoliday';
import { planStatus } from '@/hooks/store/useStorePlan';
import type { StorePlatformSubscription } from '@/api/services/platformPlans';

export type StoreVisibilityState = 'live' | 'not_visible_no_products' | 'paused' | 'plan_expired';

export interface StoreVisibility {
  state: StoreVisibilityState;
  /** Short badge text, e.g. "Live" / "Not visible yet". */
  label: string;
  /** One honest sentence for banners and billing text. */
  message: string;
  /** Only `live` means buyers can find the store. */
  isLive: boolean;
}

type VisibilityStore = Pick<StoreData, 'status' | 'holiday' | 'activeProductCount'>;

/** Pure rule (also used by tests): status + holiday + plan expiry + live product count. */
export function computeStoreVisibility(
  store: VisibilityStore | null | undefined,
  sub?: StorePlatformSubscription | null,
): StoreVisibility {
  if (store && (store.status === 'suspended' || holidayBlocksType(store.holiday, 'physical'))) {
    return { state: 'paused', label: store.status === 'suspended' ? 'Suspended' : 'On holiday', isLive: false,
      message: store.status === 'suspended' ? 'Your store is suspended and hidden from buyers.' : 'Your store is on holiday, so buyers cannot order physical products.' };
  }
  if (planStatus(sub).ended) {
    return { state: 'plan_expired', label: 'Plan ended', isLive: false,
      message: 'Your live products are hidden from buyers and you cannot add or publish new ones. Choose a plan and they come back automatically.' };
  }
  if (store?.status === 'active' && store.activeProductCount === 0) {
    return { state: 'not_visible_no_products', label: 'Not visible yet', isLive: false,
      message: 'Not visible yet: publish your first product and buyers can find your store.' };
  }
  return { state: 'live', label: 'Live', isLive: true, message: 'Your store and products are visible to buyers.' };
}

/**
 * ONE source for "can buyers see this store": StoreLayout banner, Dashboard badge, Customize Store bar and
 * Plan & Billing all read it. `sub` is optional (pass useStorePlan().sub where the plan is already loaded).
 */
export function useStoreVisibility(store: VisibilityStore | null | undefined, sub?: StorePlatformSubscription | null): StoreVisibility {
  return useMemo(() => computeStoreVisibility(store, sub), [store, sub]);
}
