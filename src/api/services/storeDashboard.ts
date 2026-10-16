import client from '../client';
import type { SellerOverviewData, RevenuePoint, SellerTodaySummaryData } from './analytics/analytics';
import type { InventoryProduct } from './product';

export interface OnboardingChecklistStep {
  key: 'logo' | 'banner' | 'payout' | 'first_product' | 'shipping';
  label: string;
  done: boolean;
  notNeeded?: boolean;
  /** Path relative to /store/:storeId/ */
  path: string;
}

export interface OnboardingChecklist {
  steps: OnboardingChecklistStep[];
  completed: number;
  total: number;
  percent: number;
  allDone: boolean;
}

export interface ProfileCheckItem { key: 'logo' | 'banner' | 'bio' | 'products'; label: string; done: boolean; detail: string }
/** Same four rules the home page 'Featured sellers' rail uses. */
export interface ProfileCompleteness { percent: number; complete: boolean; items: ProfileCheckItem[] }

export interface StoreDashboardSummary {
  overview: SellerOverviewData;
  revenueSeries: RevenuePoint[];
  today: SellerTodaySummaryData;
  totalProducts: number;
  activeProducts: number;
  shelf: Array<Pick<InventoryProduct, 'productId' | 'name' | 'type' | 'productType' | 'status' | 'image' | 'price'>>;
  checklist: OnboardingChecklist;
  profile?: ProfileCompleteness;
  /** Edudeen Premium member orders in the last `windowDays` days. */
  premium?: {
    premiumOrders: number;
    byCurrency: { currency: string; orders: number; premiumDiscountGiven: number; platformFundedDiscount?: number; revenue: number }[];
    windowDays: number;
  };
}

/** One call for the whole seller dashboard (replaces five). */
export function apiStoreDashboardSummary(storeId: string) {
  return client.get<never, { success: boolean; data: StoreDashboardSummary }>(
    `/api/store/${encodeURIComponent(storeId)}/dashboard-summary`,
  );
}
