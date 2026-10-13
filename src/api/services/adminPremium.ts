import client from '../client';

// Admin side of Edudeen Premium (buyer program). Envelope: { success, data }.
const BASE = '/api/admin/premium';

export interface PremiumBenefits {
  childrenLimit: number;
  earlyAccessHours: number;
  monthlyCouponValue: number;
  monthlyCouponType: 'percentage' | 'fixed';
  prioritySupport: boolean;
}

export interface AdminPremiumPlan {
  _id: string;
  name: string;
  description: string;
  monthlyPriceUSD: number;
  yearlyPriceUSD: number;
  monthlyPricePKR: number | null;
  yearlyPricePKR: number | null;
  fxRate: number | null;
  yearlySavingsPercent: number;
  isActive: boolean;
  sortOrder: number;
  benefits: PremiumBenefits;
  activeMembers?: number;
}

export interface PremiumPlanPayload {
  name: string;
  description: string;
  monthlyPriceUSD: number;
  /** null = 12 x monthly. */
  yearlyPriceUSD: number | null;
  isActive: boolean;
  sortOrder?: number;
  benefits: PremiumBenefits;
}

export type PremiumMemberStatus = 'active' | 'expiring' | 'expired' | 'cancelled' | 'pending';
export type PremiumSource = 'bank_transfer' | 'admin_grant' | 'stripe';

export interface AdminPremiumMember {
  _id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  planName: string | null;
  status: string;
  interval: 'monthly' | 'yearly';
  source: PremiumSource;
  startedAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isLive: boolean;
}

export type PremiumPaymentStatus = 'awaiting_proof' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface AdminPremiumPayment {
  _id: string;
  userId: string;
  planName: string;
  interval: 'monthly' | 'yearly';
  amountUSD: number;
  amountPKR: number | null;
  status: PremiumPaymentStatus;
  hasProof: boolean;
  proofImageUrl: string | null;
  transactionReference: string | null;
  senderName: string | null;
  rejectionReason: string | null;
  reuploadCount: number;
  createdAt: string;
  reviewedAt: string | null;
  buyerName: string;
  buyerEmail: string;
}

export interface Paged { total: number; page: number; limit: number; pages: number }

export interface PremiumStats {
  activeMembers: number;
  expiringIn3Days: number;
  lapsedMembers: number;
  pendingPayments: number;
  revenueUSD: number;
  approvedPayments: number;
  revenueLast30DaysUSD: number;
  activeByInterval: { monthly: number; yearly: number };
  premiumOrders: { currency: string; orders: number; premiumDiscount: number; platformFundedPremiumDiscount?: number; orderTotal?: number }[];
}

export const apiAdminPremiumStats = () =>
  client.get<never, { success: boolean; data: PremiumStats }>(`${BASE}/stats`);

export const apiAdminPremiumPlans = () =>
  client.get<never, { success: boolean; data: AdminPremiumPlan[] }>(`${BASE}/plans`);
export const apiAdminCreatePremiumPlan = (body: PremiumPlanPayload) =>
  client.post<never, { success: boolean; data: AdminPremiumPlan }>(`${BASE}/plans`, body);
export const apiAdminUpdatePremiumPlan = (id: string, body: Partial<PremiumPlanPayload>) =>
  client.patch<never, { success: boolean; data: AdminPremiumPlan }>(`${BASE}/plans/${id}`, body);
export const apiAdminArchivePremiumPlan = (id: string) =>
  client.delete<never, { success: boolean; message: string }>(`${BASE}/plans/${id}`);

export const apiAdminPremiumMembers = (params: { status?: string; source?: string; q?: string; page?: number; limit?: number }) =>
  client.get<never, { success: boolean; data: { members: AdminPremiumMember[] } & Paged }>(`${BASE}/members`, { params });
export const apiAdminGrantPremium = (body: { userId?: string; email?: string; planId: string; days: number }) =>
  client.post<never, { success: boolean }>(`${BASE}/members/grant`, body);
export const apiAdminRevokePremium = (userId: string, reason: string) =>
  client.post<never, { success: boolean }>(`${BASE}/members/${userId}/revoke`, { reason });

export const apiAdminPremiumPayments = (params: { status?: string; page?: number; limit?: number }) =>
  client.get<never, { success: boolean; data: { payments: AdminPremiumPayment[] } & Paged }>(`${BASE}/payments`, { params });
export const apiAdminPremiumProofUrl = (id: string) =>
  client.get<never, { success: boolean; data: { url: string | null; expiresInSeconds: number } }>(`${BASE}/payments/${id}/proof-url`);
export const apiAdminApprovePremiumPayment = (id: string) =>
  client.patch<never, { success: boolean }>(`${BASE}/payments/${id}/approve`);
export const apiAdminRejectPremiumPayment = (id: string, reason: string) =>
  client.patch<never, { success: boolean }>(`${BASE}/payments/${id}/reject`, { reason });

export interface PremiumSettings {
  platformDiscount: { enabled: boolean; percent: number };
  premiumSellerFeePercent: number;
  minGapPercent: number;
}
export const apiAdminGetPremiumSettings = () =>
  client.get<never, { success: boolean; data: PremiumSettings & { effective: { platformPercent: number } } }>(`${BASE}/settings`);
export const apiAdminUpdatePremiumSettings = (body: Partial<{ platformDiscount: { enabled?: boolean; percent?: number }; premiumSellerFeePercent: number; minGapPercent: number }>) =>
  client.put<never, { success: boolean; message?: string; data: PremiumSettings }>(`${BASE}/settings`, body);
