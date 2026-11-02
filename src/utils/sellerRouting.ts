import { apiGetMyStores, type MyStoreItem } from '@/api/services/store';
import { apiGetStorePlatformPlan } from '@/api/services/platformPlans';

/** Where an authenticated seller actually belongs, based on their REAL
 *  backend store state — never a hardcoded "/onboard". Used by OTP-verify,
 *  login, and the "Sell on Edudeen" entry handler so a seller is never sent
 *  through onboarding they've already completed, and never dumped on a
 *  dashboard when they haven't finished setup.
 *
 *  There is no separate cross-store "seller dashboard" any more — onboarding
 *  now activates the store immediately once the Payment step is done (see
 *  StoreService.createStore's `selfServeActivation`), so a seller lands
 *  directly on THAT store's own dashboard, never an intermediate page.
 *
 *  Rules (deliberately simple/deterministic — this only decides where the
 *  seller LANDS, it doesn't replace the route guards that protect each
 *  destination):
 *  - No stores yet                    → /onboard (create the first one)
 *  - Any store is `active`            → that store's own dashboard
 *  - Anything else                    → the first store's own dashboard
 */
export function resolveSellerDestination(stores: MyStoreItem[]): string {
  if (stores.length === 0) return '/onboard';

  const active = stores.find(s => s.status === 'active');
  if (active) return `/store/${active._id}/dashboard`;

  return `/store/${stores[0]._id}/dashboard`;
}

/** Fetches the seller's own stores and resolves the destination in one call
 *  — the network failure fallback is `/onboard`, since a seller with no
 *  reachable store list has nowhere else safe to land. */
export async function resolveSellerDestinationRemote(): Promise<string> {
  let dest: string;
  try {
    const res = await apiGetMyStores();
    dest = resolveSellerDestination(res.data ?? []);
  } catch {
    return '/onboard';
  }
  // Plan ended (expired trial): land on the "plan ended" screen instead of the dashboard.
  // Any failure here keeps the normal destination - never trap a seller on a lookup error.
  const m = dest.match(/^\/store\/([^/]+)\/dashboard$/);
  if (m) {
    try {
      const sub = await apiGetStorePlatformPlan(m[1]);
      if (sub.data?.status === 'expired' || sub.data?.status === 'past_due') return `/store/${m[1]}/plan-expired`;
    } catch { /* keep dashboard */ }
  }
  return dest;
}
