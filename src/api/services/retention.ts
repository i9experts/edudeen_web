import client from '../client';
import type { MarketplaceProduct } from './marketplace';

type Ok<T> = { success: boolean; message?: string; data: T };

// ── Shareable Saved list ─────────────────────────────────────────────────────
export interface WishlistShareInfo { active: boolean; token: string | null; url: string | null }
export const apiGetMyWishlistShare = () => client.get<never, Ok<WishlistShareInfo>>('/api/wishlist-share/mine');
export const apiCreateWishlistShare = () => client.post<never, Ok<WishlistShareInfo>>('/api/wishlist-share');
export const apiRevokeWishlistShare = () => client.delete<never, Ok<WishlistShareInfo>>('/api/wishlist-share');
export const apiGetSharedWishlist = (token: string) =>
  client.get<never, Ok<{ count: number; items: MarketplaceProduct[] }>>(`/api/wishlist-share/public/${encodeURIComponent(token)}`);

// ── Referral programme ───────────────────────────────────────────────────────
export interface ReferralInfo {
  enabled: boolean;
  code: string | null;
  shareUrl: string | null;
  reward: { type: 'percentage' | 'fixed'; value: number; label: string; friendLabel: string | null; expiryDays: number };
  stats: { pending: number; rewarded: number; cap: number };
  referredByAnyone: boolean;
}
export const apiGetMyReferral = () => client.get<never, Ok<ReferralInfo>>('/api/referrals/me');
export const apiApplyReferralCode = (code: string) => client.post<never, Ok<{ applied: boolean }>>('/api/referrals/apply', { code });

export interface ReferralSettings {
  enabled: boolean;
  rewardType: 'percentage' | 'fixed';
  rewardValue: number;
  refereeRewardValue: number;
  minOrderUSD: number | null;
  expiryDays: number;
  maxRewardsPerReferrer: number;
}
export const apiAdminGetReferralSettings = () => client.get<never, Ok<ReferralSettings>>('/api/admin/retention/referral');
export const apiAdminSaveReferralSettings = (body: Partial<ReferralSettings>) => client.put<never, Ok<ReferralSettings>>('/api/admin/retention/referral', body);

// ── Phone / WhatsApp verification ────────────────────────────────────────────
export interface PhoneStatus { available: boolean; phone: string | null; verified: boolean }
export const apiGetPhoneStatus = () => client.get<never, Ok<PhoneStatus>>('/api/auth/phone/status');
export const apiSendPhoneCode = (phone: string, lang?: 'en' | 'ur') =>
  client.post<never, Ok<{ expiresInSec: number; resendAfterSec: number }>>('/api/auth/phone/send', { phone, lang });
export const apiVerifyPhoneCode = (phone: string, otp: string) =>
  client.post<never, Ok<{ phone: string; verified: boolean }>>('/api/auth/phone/verify', { phone, otp });

// ── Learning paths ───────────────────────────────────────────────────────────
export interface LearningPathSummary {
  _id: string; title: string; slug: string; educationLevel: string | null; ageLabel: string;
  subtitle: string; description: string; image: string | null; stepCount: number;
}
export interface LearningPathDetail extends LearningPathSummary {
  steps: { _id: string; title: string; note: string; products: MarketplaceProduct[] }[];
}
export interface LearningPathAdmin {
  _id: string; title: string; slug: string; educationLevel: string | null; ageLabel: string; subtitle: string; description: string;
  image: string | null; status: 'active' | 'draft'; order: number;
  steps: { _id?: string; title: string; note: string; productIds: string[] }[];
}
export const apiListLearningPaths = (level?: string) =>
  client.get<never, Ok<LearningPathSummary[]>>(`/api/learning-paths${level ? `?level=${encodeURIComponent(level)}` : ''}`);
export const apiGetLearningPath = (slug: string) => client.get<never, Ok<LearningPathDetail>>(`/api/learning-paths/${encodeURIComponent(slug)}`);
export const apiSaveLearningPathToList = (slug: string) =>
  client.post<never, Ok<{ listId: string; slug: string; added: number }>>(`/api/learning-paths/${encodeURIComponent(slug)}/save-to-list`);
export const apiAdminListLearningPaths = () => client.get<never, Ok<LearningPathAdmin[]>>('/api/admin/learning-paths');
export const apiAdminGetLearningPath = (id: string) => client.get<never, Ok<LearningPathAdmin & { productNames?: Record<string, string> }>>(`/api/admin/learning-paths/${id}`);
export const apiAdminCreateLearningPath = (body: Partial<LearningPathAdmin>) => client.post<never, Ok<LearningPathAdmin>>('/api/admin/learning-paths', body);
export const apiAdminUpdateLearningPath = (id: string, body: Partial<LearningPathAdmin>) => client.patch<never, Ok<LearningPathAdmin>>(`/api/admin/learning-paths/${id}`, body);
export const apiAdminDeleteLearningPath = (id: string) => client.delete<never, Ok<unknown>>(`/api/admin/learning-paths/${id}`);
