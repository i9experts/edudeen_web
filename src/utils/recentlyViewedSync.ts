import { TokenStorage } from '@/api/services/auth';
import {
  apiGetRecentlyViewed,
  apiRecordRecentlyViewed,
  apiClearRecentlyViewed,
} from '@/api/services/search';
import type { MarketplaceProduct } from '@/api/services/marketplace';

/**
 * Account-synced "recently viewed" — the server-side counterpart to the
 * localStorage list in BuyerNavbar (`pushRecentlyViewed` / `getRecentlyViewed`
 * / `clearRecentlyViewed`). Every function is a no-op for guests and never
 * throws: history sync is best-effort and must never break a product page or
 * the search dropdown.
 *
 * Intended wiring (owner of BuyerNavbar / ProductDetail):
 *   - product page view   → pushRecentlyViewed(item); syncRecentlyViewed(product._id)
 *   - search dropdown open → merge `await fetchRecentlyViewed()` ahead of the local list
 *   - "Clear" action       → clearRecentlyViewed(); clearRecentlyViewedRemote()
 */

/** Same shape as BuyerNavbar's `RecentlyViewedItem`, so results can be merged directly. */
export interface SyncedRecentlyViewedItem {
  id:        string;
  name:      string;
  image:     string | null;
  price:     number | null;
  currency?: 'PKR' | 'USD' | null;
  /** Extra — lets the caller link straight to the product page. */
  slug?:     string;
}

function toItem(p: MarketplaceProduct): SyncedRecentlyViewedItem {
  const variant = p.variants?.find(v => v.isDefault) ?? p.variants?.[0];
  return {
    id:       p._id,
    name:     p.name,
    image:    p.images?.[0] ?? variant?.images?.[0] ?? null,
    price:    typeof variant?.price === 'number' ? variant.price : null,
    currency: variant?.currency ?? null,
    slug:     p.slug,
  };
}

/** Records a product view on the account (logged-in only). */
export async function syncRecentlyViewed(productId: string): Promise<void> {
  if (!productId || !TokenStorage.isLoggedIn()) return;
  try {
    await apiRecordRecentlyViewed(productId);
  } catch {
    /* best-effort */
  }
}

/** Account's recently viewed products, newest first. `[]` for guests or on error. */
export async function fetchRecentlyViewed(limit = 8): Promise<SyncedRecentlyViewedItem[]> {
  if (!TokenStorage.isLoggedIn()) return [];
  try {
    const res = await apiGetRecentlyViewed(limit);
    return (res.data?.products ?? []).map(toItem);
  } catch {
    return [];
  }
}

/** Clears the account's server-side history (logged-in only). */
export async function clearRecentlyViewedRemote(): Promise<void> {
  if (!TokenStorage.isLoggedIn()) return;
  try {
    await apiClearRecentlyViewed();
  } catch {
    /* best-effort */
  }
}
