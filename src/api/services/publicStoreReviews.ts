import client from '../client';

// Public, privacy-safe store reviews (reviewer first name only, no email) —
// backs the storefront Testimonials fallback when a seller hasn't written
// their own quotes. Backend: GET /api/rating/store/:storeId/public (no auth).

export interface PublicStoreReview {
  reviewId:           string;
  customerName:       string;
  avatarUrl:          string | null;
  rating:             number | null;
  comment:            string;
  isVerifiedPurchase: boolean;
  createdAt:          string;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

export function apiGetPublicStoreReviews(storeId: string, opts: { limit?: number; minRating?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.minRating) params.set('minRating', String(opts.minRating));
  const qs = params.toString();
  return client.get<never, ApiResponse<{ reviews: PublicStoreReview[] }>>(
    `/api/rating/store/${encodeURIComponent(storeId)}/public${qs ? `?${qs}` : ''}`,
  );
}
