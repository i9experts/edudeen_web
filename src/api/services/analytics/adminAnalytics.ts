import client from '../../client';
import { ENDPOINTS } from '../../endpoints';

// ── Shared query params ────────────────────────────────────────────────────────

export type AnalyticsRangePreset = '7d' | '30d' | '90d' | '6m' | '12m' | 'custom';
export type AnalyticsGranularity = 'day' | 'week' | 'month';

export interface BaseAnalyticsParams {
  range?: AnalyticsRangePreset;
  from?: string;
  to?: string;
  compareToPreviousPeriod?: boolean;
  storeId?: string;
  sellerId?: string;
  granularity?: AnalyticsGranularity;
  // Index signature so these param objects can be passed straight into `qs()`'s
  // `Record<string, unknown>` param — plain `interface`s (unlike inline object-literal
  // types) don't get one implicitly.
  [key: string]: unknown;
}

export interface TopSellersParams extends BaseAnalyticsParams {
  limit?: number;
  sort?: 'revenue' | 'orders';
  order?: 'asc' | 'desc';
}

export interface SellerPerformanceParams extends BaseAnalyticsParams {
  page?: number;
  limit?: number;
  sort?: 'revenue' | 'orders';
  order?: 'asc' | 'desc';
}

export interface TopProductsParams extends BaseAnalyticsParams {
  limit?: number;
  sort?: 'revenue' | 'units_sold';
  categoryId?: string;
}

export interface TopCategoriesParams extends BaseAnalyticsParams {
  limit?: number;
  sort?: 'revenue' | 'units_sold';
}

export interface ProductPerformanceParams extends BaseAnalyticsParams {
  page?: number;
  limit?: number;
  categoryId?: string;
}

export type ExportSection = 'revenue' | 'orders' | 'sellers' | 'products' | 'customers' | 'payments' | 'platform';

export interface ExportParams extends BaseAnalyticsParams {
  format: 'pdf' | 'csv';
  section?: ExportSection;
}

// ── Shared response shapes ─────────────────────────────────────────────────────

export interface AnalyticsPeriod { from: string; to: string }

export interface Pagination { page: number; limit: number; total: number; totalPages: number }

interface ApiResponse<T> { success: boolean; message?: string; data: T }

// ── A. Dashboard overview ──────────────────────────────────────────────────────

export interface AdminOverviewPreviousPeriod {
  period: AnalyticsPeriod;
  totalGMV: number;
  totalRevenue: number;
  totalOrders: number;
  sellersActiveThisMonth: number;
  totalRefunds: number;
  cancelledOrders: number;
}

export interface AdminOverviewData {
  period: AnalyticsPeriod;
  totalGMV: number;
  totalRevenue: number;
  totalRevenueChangePercent: number | null;
  platformEarnings: number;
  platformCommission: number;
  subscriptionRevenue: number;
  totalOrders: number;
  totalOrdersChange: number;
  totalSellers: number;
  sellersActiveThisMonth: number;
  sellersActiveThisMonthChange: number;
  totalStores: number;
  activeStores: number;
  totalCustomers: number;
  newUsers: number;
  totalRefunds: number;
  refundRatePercent: number;
  cancelledOrders: number;
  note: string;
  previousPeriod?: AdminOverviewPreviousPeriod;
}

// ── B. Revenue analytics ────────────────────────────────────────────────────────

export interface RevenuePoint { date: string; grossRevenue: number; netRevenue: number }
export interface AdminRevenueOverTimeData {
  granularity: AnalyticsGranularity;
  series: RevenuePoint[];
  /** Only set when every summed order is in one currency; absent = mixed, unconverted amounts. */
  currency?: string;
}

export interface AdminRevenueBreakdownPreviousPeriod {
  period: AnalyticsPeriod;
  oneTimeOrderRevenue: number;
  recurringSubscriptionRevenue: number;
  platformCommissionRevenue: number;
  paymentProcessingFees: number;
  totalPlatformRevenue: number;
  totalMarketplaceRevenue: number;
}

export interface AdminRevenueBreakdownData {
  period: AnalyticsPeriod;
  oneTimeOrderRevenue: number;
  recurringSubscriptionRevenue: number;
  platformCommissionRevenue: number;
  paymentProcessingFees: number;
  totalPlatformRevenue: number;
  totalMarketplaceRevenue: number;
  note: string;
  previousPeriod?: AdminRevenueBreakdownPreviousPeriod;
}

// ── C. Seller analytics ────────────────────────────────────────────────────────

export interface TopSellerRow {
  sellerId: string;
  name: string;
  email: string;
  orderCount: number;
  unitsSold: number;
  revenue: number;
}

export interface SellerPerformanceRow {
  sellerId: string;
  name: string;
  email: string;
  orderCount: number;
  unitsSold: number;
  revenue: number;
  refundRatePercent: number;
  storeCount: number;
  activeStoreCount: number;
}

export interface AdminSellerPerformanceData {
  pagination: Pagination;
  sellers: SellerPerformanceRow[];
}

export interface SellerRegistrationPoint { date: string; newSellers: number; cumulativeSellers: number }
export interface AdminSellerRegistrationTrendsData { granularity: AnalyticsGranularity; series: SellerRegistrationPoint[] }

// ── D. Customer analytics ───────────────────────────────────────────────────────

export interface NewVsReturningPoint { date: string; newCustomers: number; returningCustomers: number }
export interface TopCustomerRow { userId: string; name: string; email: string; totalOrders: number; lifetimeValue: number }
export interface GeoBreakdownRow { state: string; orders: number; revenue: number }

export interface AdminCustomerAnalyticsData {
  granularity: AnalyticsGranularity;
  activeCustomers: number;
  repeatCustomerPercent: number;
  newVsReturning: NewVsReturningPoint[];
  averageLifetimeValue: number;
  topCustomersByLtv: TopCustomerRow[];
  geographicBreakdown: GeoBreakdownRow[];
  note: string;
}

// ── E. Product analytics ────────────────────────────────────────────────────────

export interface TopProductRow { productId: string; name: string; orderCount: number; unitsSold: number; revenue: number }
export interface TopCategoryRow { categoryId: string; name: string; orderCount: number; unitsSold: number; revenue: number }

export interface ProductPerformanceRow {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  refundRatePercent: number;
  currentStock: number;
  isLowPerformer: boolean;
}

export interface AdminProductPerformanceData {
  pagination: Pagination;
  products: ProductPerformanceRow[];
}

export interface InventoryOutOfStockRow { productId: string; name: string; unitsSoldLast30Days: number }
export interface InventoryMovingRow {
  productId: string;
  name: string;
  currentStock: number;
  unitsSoldLast30Days: number;
  sellThroughRatePercent: number;
}
export interface InventoryReorderRow { productId: string; name: string; currentStock: number; estimatedWeeksRemaining: number }

export interface AdminInventoryInsightsData {
  note: string;
  outOfStockCount: number;
  outOfStock: InventoryOutOfStockRow[];
  fastMoving: InventoryMovingRow[];
  slowMoving: InventoryMovingRow[];
  reorderSuggestions: InventoryReorderRow[];
}

// ── F. Order analytics ──────────────────────────────────────────────────────────

export interface OrdersOverTimePoint { date: string; orderCount: number; cancelledOrdersCount: number; refundedOrdersCount: number }
export interface AdminOrdersOverTimeData { granularity: AnalyticsGranularity; series: OrdersOverTimePoint[] }

export interface AdminOrderStatusBreakdownData {
  statusCounts: Record<string, number>;
  totalOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  avgOrderValue: number;
  cancellationRatePercent: number;
  refundRatePercent: number;
}

// ── G. Payment analytics ────────────────────────────────────────────────────────

export interface PaymentMethodRow { paymentType: string; label: string; orderCount: number; revenue: number }
export interface PaymentStatusSummary { count: number; amount: number }

export interface AdminPaymentBreakdownData {
  methodBreakdown: PaymentMethodRow[];
  successfulPayments: PaymentStatusSummary;
  failedPayments: PaymentStatusSummary;
  pendingPayments: PaymentStatusSummary;
  note: string;
}

// ── H. Platform analytics ───────────────────────────────────────────────────────

export interface MarketplaceGrowthPoint { date: string; newSellers: number; newStores: number; newProducts: number }

export interface AdminPlatformMetricsData {
  granularity: AnalyticsGranularity;
  marketplaceGrowth: MarketplaceGrowthPoint[];
  conversionMetrics: {
    newUsersInPeriod: number;
    newUsersWhoOrdered: number;
    signupToOrderConversionPercent: number;
    note: string;
  };
}

// ── Query-string helper (mirrors the convention in services/subscriptions.ts) ──

function qs(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
}

// ── A. Dashboard overview ──────────────────────────────────────────────────────

export function apiAdminAnalyticsOverview(params: BaseAnalyticsParams = {}) {
  return client.get<never, ApiResponse<AdminOverviewData>>(`${ENDPOINTS.ANALYTICS.ADMIN.OVERVIEW}${qs(params)}`);
}

// ── B. Revenue analytics ────────────────────────────────────────────────────────

export function apiAdminAnalyticsRevenueOverTime(params: BaseAnalyticsParams = {}) {
  return client.get<never, ApiResponse<AdminRevenueOverTimeData>>(`${ENDPOINTS.ANALYTICS.ADMIN.REVENUE_OVER_TIME}${qs(params)}`);
}

export function apiAdminAnalyticsRevenueBreakdown(params: BaseAnalyticsParams = {}) {
  return client.get<never, ApiResponse<AdminRevenueBreakdownData>>(`${ENDPOINTS.ANALYTICS.ADMIN.REVENUE_BREAKDOWN}${qs(params)}`);
}

// ── C. Seller analytics ────────────────────────────────────────────────────────

export function apiAdminAnalyticsTopSellers(params: TopSellersParams = {}) {
  return client.get<never, ApiResponse<TopSellerRow[]>>(`${ENDPOINTS.ANALYTICS.ADMIN.SELLERS_TOP}${qs(params)}`);
}

export function apiAdminAnalyticsSellerPerformance(params: SellerPerformanceParams = {}) {
  return client.get<never, ApiResponse<AdminSellerPerformanceData>>(`${ENDPOINTS.ANALYTICS.ADMIN.SELLERS_PERFORMANCE}${qs(params)}`);
}

export function apiAdminAnalyticsSellerRegistrationTrends(params: BaseAnalyticsParams = {}) {
  return client.get<never, ApiResponse<AdminSellerRegistrationTrendsData>>(`${ENDPOINTS.ANALYTICS.ADMIN.SELLERS_REGISTRATION_TRENDS}${qs(params)}`);
}

// ── D. Customer analytics ───────────────────────────────────────────────────────

export function apiAdminAnalyticsCustomers(params: BaseAnalyticsParams = {}) {
  return client.get<never, ApiResponse<AdminCustomerAnalyticsData>>(`${ENDPOINTS.ANALYTICS.ADMIN.CUSTOMERS}${qs(params)}`);
}

// ── E. Product analytics ────────────────────────────────────────────────────────

export function apiAdminAnalyticsTopProducts(params: TopProductsParams = {}) {
  return client.get<never, ApiResponse<TopProductRow[]>>(`${ENDPOINTS.ANALYTICS.ADMIN.PRODUCTS_TOP}${qs(params)}`);
}

export function apiAdminAnalyticsTopCategories(params: TopCategoriesParams = {}) {
  return client.get<never, ApiResponse<TopCategoryRow[]>>(`${ENDPOINTS.ANALYTICS.ADMIN.CATEGORIES_TOP}${qs(params)}`);
}

export function apiAdminAnalyticsProductPerformance(params: ProductPerformanceParams = {}) {
  return client.get<never, ApiResponse<AdminProductPerformanceData>>(`${ENDPOINTS.ANALYTICS.ADMIN.PRODUCTS_PERFORMANCE}${qs(params)}`);
}

export function apiAdminAnalyticsInventoryInsights(params: BaseAnalyticsParams = {}) {
  return client.get<never, ApiResponse<AdminInventoryInsightsData>>(`${ENDPOINTS.ANALYTICS.ADMIN.INVENTORY_INSIGHTS}${qs(params)}`);
}

// ── F. Order analytics ──────────────────────────────────────────────────────────

export function apiAdminAnalyticsOrdersOverTime(params: BaseAnalyticsParams = {}) {
  return client.get<never, ApiResponse<AdminOrdersOverTimeData>>(`${ENDPOINTS.ANALYTICS.ADMIN.ORDERS_OVER_TIME}${qs(params)}`);
}

export function apiAdminAnalyticsOrderStatusBreakdown(params: BaseAnalyticsParams = {}) {
  return client.get<never, ApiResponse<AdminOrderStatusBreakdownData>>(`${ENDPOINTS.ANALYTICS.ADMIN.ORDERS_STATUS_BREAKDOWN}${qs(params)}`);
}

// ── G. Payment analytics ────────────────────────────────────────────────────────

export function apiAdminAnalyticsPaymentBreakdown(params: BaseAnalyticsParams = {}) {
  return client.get<never, ApiResponse<AdminPaymentBreakdownData>>(`${ENDPOINTS.ANALYTICS.ADMIN.PAYMENTS_BREAKDOWN}${qs(params)}`);
}

// ── H. Platform analytics ───────────────────────────────────────────────────────

export function apiAdminAnalyticsPlatformMetrics(params: BaseAnalyticsParams = {}) {
  return client.get<never, ApiResponse<AdminPlatformMetricsData>>(`${ENDPOINTS.ANALYTICS.ADMIN.PLATFORM_METRICS}${qs(params)}`);
}

// ── I. Export ────────────────────────────────────────────────────────────────────

/** GET /api/admin/analytics/export — downloads a PDF or CSV report and triggers the browser save dialog. */
export async function apiAdminAnalyticsExport(params: ExportParams) {
  const blob = await client.get<never, Blob>(`${ENDPOINTS.ANALYTICS.ADMIN.EXPORT}${qs(params)}`, { responseType: 'blob' } as never);
  const filename = params.format === 'pdf'
    ? 'admin-analytics-report.pdf'
    : `admin-analytics-${params.section ?? 'revenue'}.csv`;

  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objUrl);
}
