import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ReviewComment {
  text:      string;
  createdAt: string;
}

export interface SellerReply {
  text:      string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id:                string;
  userId:              string;
  productId:           string;
  storeId:             string | null;
  productVariantId:    string | null;
  orderId:             string | null;
  rating:              number | null;
  comments:            ReviewComment[];
  media:               string[];
  isAnonymous:         boolean;
  isVerifiedPurchase:  boolean;
  sellerReply:         SellerReply | null;
  isFlagged:           boolean;
  createdAt:           string;
  updatedAt:           string;
}

export interface AddReviewPayload {
  productId:         string;
  productVariantId?: string;
  orderId?:          string;
  rating?:           number;
  comment?:          string;
  isAnonymous?:      boolean;
  media?:            string[];
}

export interface EditReviewPayload {
  rating?:  number;
  comment?: string;
  media?:   string[];
}

export interface Pagination {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

export interface MyReviewEntry {
  reviewId:           string;
  product:            { productId: string; name: string; image: string | null; slug?: string | null } | null;
  rating:             number | null;
  comments:           ReviewComment[];
  media:              string[];
  isVerifiedPurchase: boolean;
  sellerReply:        SellerReply | null;
  createdAt:          string;
}

export interface ProductReviewEntry {
  reviewId:           string;
  customerName:       string;
  isOwn:              boolean;
  rating:             number | null;
  comments:           ReviewComment[];
  media:              string[];
  isVerifiedPurchase: boolean;
  sellerReply:        SellerReply | null;
  helpfulCount:       number;
  helpfulByMe:        boolean;
  createdAt:          string;
}

export interface ProductReviewStats {
  averageRating:   number;
  totalReviews:    number;
  ratingBreakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface StoreReviewEntry {
  reviewId:           string;
  customer:           { name: string; email: string | null };
  productId:          string;
  productVariantId:   string | null;
  rating:             number | null;
  comments:           ReviewComment[];
  media:              string[];
  isVerifiedPurchase: boolean;
  sellerReply:        SellerReply | null;
  isFlagged:          boolean;
  createdAt:          string;
}

export interface StoreReviewStats {
  averageRating:    number;
  totalReviews:     number;
  ratingBreakdown:  Record<'1' | '2' | '3' | '4' | '5', string>;
  reviewsThisMonth: number;
  flaggedReviews:   number;
  fiveStarRate:     string;
  responseRate:     string;
  avgResponseTime:  string;
}

export interface StoreReviewsQuery {
  page?:      number;
  rating?:    number | 'all';
  productId?: string;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }
interface MessageResponse { success: boolean; message: string }

// ── Buyer: write ──────────────────────────────────────────────────────────────

/** POST /api/rating/add-review */
export function apiAddReview(payload: AddReviewPayload) {
  return client.post<never, ApiResponse<Review>>(ENDPOINTS.RATING.ADD_REVIEW, payload);
}

/** PATCH /api/rating/:reviewId */
export function apiEditReview(reviewId: string, payload: EditReviewPayload) {
  return client.patch<never, ApiResponse<Review>>(ENDPOINTS.RATING.EDIT_REVIEW(reviewId), payload);
}

/** DELETE /api/rating/:reviewId */
export function apiDeleteReview(reviewId: string) {
  return client.delete<never, MessageResponse>(ENDPOINTS.RATING.DELETE_REVIEW(reviewId));
}

/** GET /api/rating/my-reviews?page= */
export function apiGetMyReviews(page = 1) {
  return client.get<never, ApiResponse<{ pagination: Pagination; reviews: MyReviewEntry[] }>>(
    `${ENDPOINTS.RATING.MY_REVIEWS}?page=${page}`,
  );
}

// ── Public / buyer-facing: read ────────────────────────────────────────────────

/** GET /api/rating/product/:productId?page=&limit=&rating=&sort=&hasMedia=&verifiedOnly= */
export function apiGetProductReviews(productId: string, query: {
  page?: number; limit?: number; rating?: number;
  sort?: 'newest' | 'oldest' | 'highest_rating' | 'lowest_rating' | 'most_helpful';
  hasMedia?: boolean; verifiedOnly?: boolean;
} = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.rating) params.set('rating', String(query.rating));
  if (query.sort) params.set('sort', query.sort);
  if (query.hasMedia) params.set('hasMedia', 'true');
  if (query.verifiedOnly) params.set('verifiedOnly', 'true');
  const qs = params.toString();
  return client.get<never, ApiResponse<{ stats: ProductReviewStats; pagination: Pagination; reviews: ProductReviewEntry[] }>>(
    `${ENDPOINTS.RATING.PRODUCT_REVIEWS(productId)}${qs ? `?${qs}` : ''}`,
  );
}

/** POST /api/rating/:reviewId/helpful — toggle */
export function apiToggleReviewHelpful(reviewId: string) {
  return client.post<never, ApiResponse<{ helpfulCount: number; helpfulByMe: boolean }>>(
    ENDPOINTS.RATING.TOGGLE_HELPFUL(reviewId),
  );
}

// ── Seller / admin: manage ─────────────────────────────────────────────────────

/** GET /api/rating/store-reviews/:storeId?page=&rating=&productId= */
export function apiGetStoreReviews(storeId: string, query: StoreReviewsQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.rating && query.rating !== 'all') params.set('rating', String(query.rating));
  if (query.productId) params.set('productId', query.productId);
  const qs = params.toString();
  return client.get<never, ApiResponse<{ stats: StoreReviewStats; pagination: Pagination; reviews: StoreReviewEntry[] }>>(
    `${ENDPOINTS.RATING.STORE_REVIEWS(storeId)}${qs ? `?${qs}` : ''}`,
  );
}

/** POST /api/rating/reply/:reviewId */
export function apiReplyToReview(reviewId: string, text: string) {
  return client.post<never, MessageResponse>(ENDPOINTS.RATING.REPLY(reviewId), { text });
}

/** PUT /api/rating/edit-reply/:reviewId */
export function apiEditReply(reviewId: string, text: string) {
  return client.put<never, MessageResponse>(ENDPOINTS.RATING.EDIT_REPLY(reviewId), { text });
}

/** POST /api/rating/flag/:reviewId */
export function apiFlagReview(reviewId: string) {
  return client.post<never, MessageResponse>(ENDPOINTS.RATING.FLAG(reviewId));
}

/** PATCH /api/rating/unflag/:reviewId */
export function apiUnflagReview(reviewId: string) {
  return client.patch<never, MessageResponse>(ENDPOINTS.RATING.UNFLAG(reviewId));
}

/** DELETE /api/rating/admin/:reviewId */
export function apiModerateDeleteReview(reviewId: string) {
  return client.delete<never, MessageResponse>(ENDPOINTS.RATING.MODERATE_DELETE(reviewId));
}
