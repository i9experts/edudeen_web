import { apiGetMyStores, type MyStoreItem } from '@/api/services/store';

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
 *  - Exactly one store, still
 *    `pending`/`rejected` (legacy —   → straight to that store's verification
 *    pre-dates self-serve activation)   page (resubmit / awaiting review)
 *  - Anything else                    → the first store's own dashboard
 */
export function resolveSellerDestination(stores: MyStoreItem[]): string {
  if (stores.length === 0) return '/onboard';

  const active = stores.find(s => s.status === 'active');
  if (active) return `/store/${active._id}/dashboard`;

  if (stores.length === 1) {
    const only = stores[0];
    if (only.status === 'pending' || only.status === 'rejected') {
      return `/store/${only._id}/verification`;
    }
  }

  return `/store/${stores[0]._id}/dashboard`;
}

/** Fetches the seller's own stores and resolves the destination in one call
 *  — the network failure fallback is `/onboard`, since a seller with no
 *  reachable store list has nowhere else safe to land. */
export async function resolveSellerDestinationRemote(): Promise<string> {
  try {
    const res = await apiGetMyStores();
    return resolveSellerDestination(res.data ?? []);
  } catch {
    return '/onboard';
  }
}
