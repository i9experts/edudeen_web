import client from '../client';
import { ENDPOINTS } from '../endpoints';
import type { PublicStoresListData } from './store';
import type { ProductsByCategoryResponse, MarketplaceProduct } from './marketplace';

interface ApiResponse<T> { success: boolean; message?: string; data: T }

/** GET /api/search/stores — same response shape as apiListPublicStores (backend delegates straight into it). */
export function apiSearchStores(q: string, page = 1, limit = 20) {
  const query = new URLSearchParams({ q, page: String(page), limit: String(limit) });
  return client.get<never, ApiResponse<PublicStoresListData>>(
    `${ENDPOINTS.SEARCH.STORES}?${query.toString()}`,
  );
}

/** GET /api/search/products — real full-catalog text search (name/description),
 *  unlike the category browse endpoint's client-side-only substring match on
 *  whatever page happened to already be loaded. Same response shape as
 *  apiGetAllProducts (backend delegates into the same ProductsService method
 *  that powers it). Does not support the category/price/rating/type facets —
 *  those only apply to the browse (non-search) path. */
export function apiSearchProducts(q: string, page = 1, limit = 20, opts: { suggest?: boolean } = {}) {
  const query = new URLSearchParams({ q, page: String(page), limit: String(limit) });
  // Search-as-you-type previews aren't saved to the buyer's search history.
  if (opts.suggest) query.set('suggest', '1');
  return client.get<never, ProductsByCategoryResponse>(
    `${ENDPOINTS.SEARCH.PRODUCTS}?${query.toString()}`,
  );
}

export interface RecentSearchEntry { searchId: string; query: string }

/** GET /api/search/recent — requires auth; per-account history synced across devices. */
export function apiGetRecentSearches(limit = 5) {
  return client.get<never, ApiResponse<RecentSearchEntry[]>>(
    `${ENDPOINTS.SEARCH.RECENT}?limit=${limit}`,
  );
}

// ── Recently viewed products (account-synced) ────────────────────────────────
// All three require auth — guests keep using the localStorage list only.

/** GET /api/search/recently-viewed — newest first, shaped like catalogue products. */
export function apiGetRecentlyViewed(limit = 8) {
  return client.get<never, ApiResponse<{ products: MarketplaceProduct[] }>>(
    `/api/search/recently-viewed?limit=${limit}`,
  );
}

/** POST /api/search/recently-viewed — records (or bumps) a product view. */
export function apiRecordRecentlyViewed(productId: string) {
  return client.post<never, { success: boolean; message?: string }>(
    '/api/search/recently-viewed', { productId },
  );
}

/** DELETE /api/search/recently-viewed — clears the account's history. */
export function apiClearRecentlyViewed() {
  return client.delete<never, { success: boolean; message?: string }>('/api/search/recently-viewed');
}

/** Popular search terms across all buyers (public). */
export function apiGetTrendingSearches(limit = 8) {
  return client.get<never, ApiResponse<{ query: string; searches: number }[]>>(`/api/search/trending?limit=${limit}`);
}
