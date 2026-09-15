import client from '../client';
import { ENDPOINTS } from '../endpoints';

export type DiscountType = 'percentage' | 'fixed';

export interface Coupon {
  _id:            string;
  storeId:        string;
  code:           string;
  discountType:   DiscountType;
  discountValue:  number;
  minOrderAmount: number | null;
  usageLimit:     number | null;
  usageCount:     number;
  expiresAt:      string | null;
  isActive:       boolean;
  createdAt:      string;
}

export interface CreateCouponPayload {
  code:            string;
  discountType:    DiscountType;
  discountValue:   number;
  minOrderAmount?: number;
  usageLimit?:     number;
  expiresAt?:      string;
}

export type UpdateCouponPayload = Partial<CreateCouponPayload> & { isActive?: boolean };

interface ApiResponse<T> { success: boolean; message?: string; data: T }
interface PaginatedCoupons {
  pagination: { page: number; limit: number; total: number; totalPages: number };
  coupons:    Coupon[];
}

/** POST /api/marketing/:storeId/coupons */
export function apiCreateCoupon(storeId: string, payload: CreateCouponPayload) {
  return client.post<never, ApiResponse<Coupon>>(ENDPOINTS.MARKETING.COUPONS.CREATE(storeId), payload);
}

/** GET /api/marketing/:storeId/coupons */
export function apiGetCoupons(storeId: string) {
  return client.get<never, ApiResponse<PaginatedCoupons>>(ENDPOINTS.MARKETING.COUPONS.LIST(storeId));
}

/** PATCH /api/marketing/:storeId/coupons/:couponId */
export function apiUpdateCoupon(storeId: string, couponId: string, payload: UpdateCouponPayload) {
  return client.patch<never, ApiResponse<Coupon>>(ENDPOINTS.MARKETING.COUPONS.UPDATE(storeId, couponId), payload);
}

/** DELETE /api/marketing/:storeId/coupons/:couponId */
export function apiDeleteCoupon(storeId: string, couponId: string) {
  return client.delete<never, ApiResponse<null>>(ENDPOINTS.MARKETING.COUPONS.DELETE(storeId, couponId));
}

// ── Platform-wide sale campaigns (admin-created, seller opts a store in) ────

export interface JoinableCampaign {
  _id:           string;
  name:          string;
  description:   string | null;
  bannerImage:   string | null;
  startDate:     string;
  endDate:       string;
  status:        'draft' | 'active' | 'ended';
  discountType:  DiscountType | null;
  discountValue: number | null;
  /** Only meaningful when discountType === 'fixed' — always 'USD' (the platform pivot). */
  currency:      string | null;
  // 'seller': this store pays the discount out of its own payout if it joins.
  // 'platform': Edudeen reimburses it — joining costs this store nothing.
  sponsorType:   'seller' | 'platform';
  isJoined:      boolean;
}

/** GET /api/marketing/:storeId/campaigns */
export function apiGetJoinableCampaigns(storeId: string) {
  return client.get<never, ApiResponse<JoinableCampaign[]>>(ENDPOINTS.MARKETING.CAMPAIGNS.LIST(storeId));
}

/** POST /api/marketing/:storeId/campaigns/:campaignId/join */
export function apiJoinCampaign(storeId: string, campaignId: string) {
  return client.post<never, ApiResponse<null>>(ENDPOINTS.MARKETING.CAMPAIGNS.JOIN(storeId, campaignId));
}

/** DELETE /api/marketing/:storeId/campaigns/:campaignId/leave */
export function apiLeaveCampaign(storeId: string, campaignId: string) {
  return client.delete<never, ApiResponse<null>>(ENDPOINTS.MARKETING.CAMPAIGNS.LEAVE(storeId, campaignId));
}
