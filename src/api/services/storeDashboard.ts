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

export interface StoreDashboardSummary {
  overview: SellerOverviewData;
  revenueSeries: RevenuePoint[];
  today: SellerTodaySummaryData;
  totalProducts: number;
  activeProducts: number;
  shelf: Array<Pick<InventoryProduct, 'productId' | 'name' | 'type' | 'productType' | 'status' | 'image' | 'price'>>;
  checklist: OnboardingChecklist;
}

/** One call for the whole seller dashboard (replaces five). */
export function apiStoreDashboardSummary(storeId: string) {
  return client.get<never, { success: boolean; data: StoreDashboardSummary }>(
    `/api/store/${encodeURIComponent(storeId)}/dashboard-summary`,
  );
}
