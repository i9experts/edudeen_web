import client from '../client';

type Ok<T> = { success: boolean; message?: string; data: T };

export type PremiumInterval = 'monthly' | 'yearly';

export interface PremiumBenefits {
  childrenLimit: number;
  earlyAccessHours: number;
  monthlyCouponValue: number;
  monthlyCouponType: 'percentage' | 'fixed';
  prioritySupport: boolean;
}

export interface PremiumPlan {
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
  benefits: PremiumBenefits;
}

export type PremiumPaymentStatus = 'awaiting_proof' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface PremiumPayment {
  _id: string;
  status: PremiumPaymentStatus;
  planName?: string;
  interval?: PremiumInterval;
  amountUSD: number;
  amountPKR: number;
  fxRateUsed?: number;
  rejectionReason?: string | null;
  transactionReference?: string | null;
  hasProof?: boolean;
  createdAt?: string;
}

export interface PremiumMembership {
  status: 'active' | 'expired' | 'cancelled' | 'pending' | string;
  planName: string | null;
  benefits: PremiumBenefits | null;
  interval: PremiumInterval;
  startedAt: string | null;
  currentPeriodEnd: string | null;
  daysLeft: number;
  cancelAtPeriodEnd: boolean;
  source: string;
}

export interface PremiumCoupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  currency?: string | null;
  expiresAt: string | null;
  used: boolean;
  expired: boolean;
}

export interface PremiumMe {
  isPremium: boolean;
  entitlements: { isPremium: boolean; childrenLimit: number; earlyAccessHours: number; prioritySupport: boolean };
  membership: PremiumMembership | null;
  coupon: PremiumCoupon | null;
  pendingPayment: PremiumPayment | null;
}

export interface PremiumBankDetails {
  payeeName?: string | null;
  bankName: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  iban: string | null;
  jazzcashNumber: string | null;
  easypaisaNumber: string | null;
  instructions: string | null;
  usdToPkrRate: number;
}

export const apiGetPremiumPlans = () => client.get<never, Ok<PremiumPlan[]>>('/api/premium/plans');
export const apiGetPremiumMe = () => client.get<never, Ok<PremiumMe>>('/api/premium/me');
export const apiGetPremiumBankDetails = () => client.get<never, Ok<PremiumBankDetails>>('/api/premium/bank-details');
export const apiGetPremiumPayments = () => client.get<never, Ok<PremiumPayment[]>>('/api/premium/payments');
export const apiSubscribePremium = (planId: string, interval: PremiumInterval) =>
  client.post<never, Ok<{ payment: PremiumPayment; bankDetails: PremiumBankDetails }>>('/api/premium/subscribe', { planId, interval });
export function apiSubmitPremiumProof(paymentId: string, file: File, fields: { transactionReference?: string; senderName?: string }) {
  const fd = new FormData();
  fd.append('file', file);
  if (fields.transactionReference) fd.append('transactionReference', fields.transactionReference);
  if (fields.senderName) fd.append('senderName', fields.senderName);
  return client.post<never, Ok<PremiumPayment>>(`/api/premium/payments/${paymentId}/proof`, fd);
}
export const apiCancelPremium = () => client.post<never, Ok<{ currentPeriodEnd: string; cancelAtPeriodEnd: boolean }>>('/api/premium/cancel');
export const apiResumePremium = () => client.post<never, Ok<{ currentPeriodEnd: string; cancelAtPeriodEnd: boolean }>>('/api/premium/resume');

/** Public terms: what Edudeen adds for members, the fee on premium sales, the min gap rule and the normal platform fee of a product type. */
export interface PremiumTerms {
  platformDiscount: { enabled: boolean; percent: number };
  /** Effective platform percent (0 when the offer is off). */
  platformPercent: number;
  premiumSellerFeePercent: number;
  minGapPercent: number;
  normalFee: { type: 'digital' | 'physical'; mode: 'percentage' | 'fixed'; value: number; fixedAmountInCurrency: number | null; currency: string | null; source?: 'platform_fees' | 'commission_rules' } | null;
}
export const apiGetPremiumTerms = (params?: { type?: string; currency?: string; storeId?: string }) =>
  client.get<never, Ok<PremiumTerms>>('/api/premium/terms', { params });

export interface PremiumConflict { productId: string; name: string; premiumPercent: number; salePercent: number; message: string }
export const apiGetPremiumConflicts = (storeId: string) =>
  client.get<never, Ok<{ minGapPercent: number; conflicts: PremiumConflict[]; bothOffers?: { productId: string; name: string; premiumPercent: number }[] }>>('/api/premium/seller/conflicts', { params: { storeId } });
