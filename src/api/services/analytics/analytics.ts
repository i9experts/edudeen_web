import client from '../../client';
import { ENDPOINTS } from '../../endpoints';
import type { AnalyticsRangePreset } from '@/components/comman/analytics/analyticsFilters';

// ── Query params ────────────────────────────────────────────────────────────────
// Mirrors `src/api/services/adminAnalytics.ts` — same shape. `storeId` is
// optional: pass it to scope to one store, omit it for the cross-store view
// (aggregates across every store the seller owns) — the backend now supports
// both from the exact same endpoint.

export interface SellerAnalyticsParams {
  storeId?: string;
  range?: AnalyticsRangePreset;
  from?: string;
  to?: string;
  compareToPreviousPeriod?: boolean;
  // Index signature so these param objects can be passed straight into `qs()`'s
  // `Record<string, unknown>` param — plain `interface`s (unlike inline object-literal
  // types) don't get one implicitly.
  [key: string]: unknown;
}

export interface SellerTopProductsParams extends SellerAnalyticsParams {
  limit?: number;
  sort?: 'revenue' | 'units_sold';
}

export interface SellerProductPerformanceParams extends SellerAnalyticsParams {
  page?: number;
  limit?: number;
}

export type SellerExportSection = 'revenue' | 'orders' | 'products' | 'customers';

export interface SellerExportParams extends SellerAnalyticsParams {
  format: 'pdf' | 'csv';
  section?: SellerExportSection;
}

// ── Shared response shapes ──────────────────────────────────────────────────────

export interface AnalyticsPeriod { from: string; to: string }
export interface Pagination { page: number; limit: number; total: number; totalPages: number }

interface ApiResponse<T> { success: boolean; message?: string; data: T }

// ── A. Overview ──────────────────────────────────────────────────────────────────

export type RepeatBuyerTrend = 'improving' | 'declining' | 'flat';

export interface SellerOverviewPreviousPeriod {
  period: AnalyticsPeriod;
  grossRevenue: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  repeatBuyerPercent: number;
  totalRefunds: number;
  cancelledOrders: number;
}

export interface SellerOverviewData {
  period: AnalyticsPeriod;
  grossRevenue: number;
  totalRevenue: number;
  totalRevenueChangePercent: number | null;
  totalOrders: number;
  totalOrdersChange: number;
  avgOrderValue: number;
  avgOrderValueChangePercent: number | null;
  repeatBuyerPercent: number;
  repeatBuyerTrend: RepeatBuyerTrend;
  totalRefunds: number;
  refundRatePercent: number;
  cancelledOrders: number;
  newCustomersCount: number;
  returningCustomersCount: number;
  previousPeriod?: SellerOverviewPreviousPeriod;
  /** Only present on the cross-store "my" overview — how many stores the totals were aggregated across. */
  storeCount?: number;
  /** The scope's single currency (every figure above is denominated in it), or
   *  `null` when a cross-store scope spans stores with different
   *  `baseCurrency` values — in that case these totals are a blended sum
   *  across incompatible currencies and must not be labeled with any one
   *  currency's symbol. */
  currency: string | null;
}

// ── B. Revenue over time ─────────────────────────────────────────────────────────

export type AnalyticsGranularity = 'day' | 'week' | 'month';

export interface RevenuePoint { date: string; grossRevenue: number; netRevenue: number }
export interface SellerRevenueOverTimeData { granularity: AnalyticsGranularity; currency: string | null; series: RevenuePoint[] }

// ── C. Orders over time ──────────────────────────────────────────────────────────

export interface OrdersOverTimePoint { date: string; orderCount: number; cancelledOrdersCount: number; refundedOrdersCount: number }
export interface SellerOrdersOverTimeData { granularity: AnalyticsGranularity; series: OrdersOverTimePoint[] }

// ── D. Traffic sources ───────────────────────────────────────────────────────────

export type AttributionSource = 'marketplace_search' | 'direct_link' | 'social_media' | 'email' | 'other';
export interface TrafficSourceRow { source: AttributionSource; count: number; revenue: number; percent: number }
export interface SellerTrafficSourcesData { total: number; breakdown: TrafficSourceRow[] }

// ── E. Top products ───────────────────────────────────────────────────────────────

export interface TopProductRow { productId: string; name: string; orderCount: number; unitsSold: number; revenue: number }

// ── F. Customer analytics ────────────────────────────────────────────────────────

export interface NewVsReturningPoint { date: string; newCustomers: number; returningCustomers: number }
export interface TopCustomerRow { userId: string; name: string; email: string; totalOrders: number; lifetimeValue: number }
export interface GeoBreakdownRow { state: string; orders: number; revenue: number }

export interface SellerCustomerAnalyticsData {
  granularity: AnalyticsGranularity;
  newVsReturning: NewVsReturningPoint[];
  averageLifetimeValue: number;
  topCustomersByLtv: TopCustomerRow[];
  geographicBreakdown: GeoBreakdownRow[];
}

// ── F2. Product performance ──────────────────────────────────────────────────────

export interface ProductPerformanceRow {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  refundRatePercent: number;
  currentStock: number;
  isLowPerformer: boolean;
}

export interface SellerProductPerformanceData {
  pagination: Pagination;
  products: ProductPerformanceRow[];
}

// ── F3. Inventory insights ────────────────────────────────────────────────────────

export interface InventoryOutOfStockRow { productId: string; name: string; unitsSoldLast30Days: number }
export interface InventoryMovingRow {
  productId: string;
  name: string;
  currentStock: number;
  unitsSoldLast30Days: number;
  sellThroughRatePercent: number;
}
export interface InventoryReorderRow { productId: string; name: string; currentStock: number; estimatedWeeksRemaining: number }

export interface SellerInventoryInsightsData {
  note: string;
  outOfStock: InventoryOutOfStockRow[];
  fastMoving: InventoryMovingRow[];
  slowMoving: InventoryMovingRow[];
  reorderSuggestions: InventoryReorderRow[];
}

// ── F4. Payment methods ───────────────────────────────────────────────────────────

export interface PaymentMethodRow { paymentType: string; label: string; orderCount: number; revenue: number }

// ── F5. Revenue breakdown ────────────────────────────────────────────────────────

export interface SellerRevenueBreakdownData {
  oneTimeOrderRevenue: number;
  recurringSubscriptionRevenue: number;
  totalRevenue: number;
  note: string;
}

// ── Query-string helper (mirrors the convention in services/adminAnalytics.ts) ──

function qs(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
}

// ── Today summary (dashboard header stat row) ─────────────────────────────────────
// Backend only reads storeId (it derives "today" vs "yesterday" itself), so this
// takes a bare storeId rather than the full SellerAnalyticsParams (range is ignored).

export interface SellerTodaySummaryData {
  revenue:              number;
  revenueChangePercent: number;
  ordersCount:          number;
  avgOrderValue:        number;
  /** Free-product claims today (not counted in orders/revenue). Absent on older APIs. */
  freeClaims?:          number;
}

export function apiSellerAnalyticsToday(storeId: string) {
  return client.get<never, ApiResponse<SellerTodaySummaryData>>(`${ENDPOINTS.ANALYTICS.SELLER.TODAY}${qs({ storeId })}`);
}

// ── A. Overview ──────────────────────────────────────────────────────────────────

export function apiSellerAnalyticsOverview(params: SellerAnalyticsParams) {
  return client.get<never, ApiResponse<SellerOverviewData>>(`${ENDPOINTS.ANALYTICS.SELLER.OVERVIEW}${qs(params)}`);
}

// ── B. Revenue over time ─────────────────────────────────────────────────────────

export function apiSellerAnalyticsRevenueOverTime(params: SellerAnalyticsParams) {
  return client.get<never, ApiResponse<SellerRevenueOverTimeData>>(`${ENDPOINTS.ANALYTICS.SELLER.REVENUE_OVER_TIME}${qs(params)}`);
}

// ── C. Orders over time ──────────────────────────────────────────────────────────

export function apiSellerAnalyticsOrdersOverTime(params: SellerAnalyticsParams) {
  return client.get<never, ApiResponse<SellerOrdersOverTimeData>>(`${ENDPOINTS.ANALYTICS.SELLER.ORDERS_OVER_TIME}${qs(params)}`);
}

// ── D. Traffic sources ───────────────────────────────────────────────────────────

export function apiSellerAnalyticsTrafficSources(params: SellerAnalyticsParams) {
  return client.get<never, ApiResponse<SellerTrafficSourcesData>>(`${ENDPOINTS.ANALYTICS.SELLER.TRAFFIC_SOURCES}${qs(params)}`);
}

// ── E. Top products ───────────────────────────────────────────────────────────────

export function apiSellerAnalyticsTopProducts(params: SellerTopProductsParams) {
  return client.get<never, ApiResponse<TopProductRow[]>>(`${ENDPOINTS.ANALYTICS.SELLER.TOP_PRODUCTS}${qs(params)}`);
}

// ── F. Customer analytics ────────────────────────────────────────────────────────

export function apiSellerAnalyticsCustomers(params: SellerAnalyticsParams) {
  return client.get<never, ApiResponse<SellerCustomerAnalyticsData>>(`${ENDPOINTS.ANALYTICS.SELLER.CUSTOMERS}${qs(params)}`);
}

// ── F2. Product performance ──────────────────────────────────────────────────────

export function apiSellerAnalyticsProductPerformance(params: SellerProductPerformanceParams) {
  return client.get<never, ApiResponse<SellerProductPerformanceData>>(`${ENDPOINTS.ANALYTICS.SELLER.PRODUCTS_PERFORMANCE}${qs(params)}`);
}

// ── F3. Inventory insights ────────────────────────────────────────────────────────

export function apiSellerAnalyticsInventoryInsights(params: SellerAnalyticsParams) {
  return client.get<never, ApiResponse<SellerInventoryInsightsData>>(`${ENDPOINTS.ANALYTICS.SELLER.INVENTORY_INSIGHTS}${qs(params)}`);
}

// ── F4. Payment methods ───────────────────────────────────────────────────────────

export function apiSellerAnalyticsPaymentMethods(params: SellerAnalyticsParams) {
  return client.get<never, ApiResponse<PaymentMethodRow[]>>(`${ENDPOINTS.ANALYTICS.SELLER.PAYMENT_METHODS}${qs(params)}`);
}

// ── F5. Revenue breakdown ────────────────────────────────────────────────────────

export function apiSellerAnalyticsRevenueBreakdown(params: SellerAnalyticsParams) {
  return client.get<never, ApiResponse<SellerRevenueBreakdownData>>(`${ENDPOINTS.ANALYTICS.SELLER.REVENUE_BREAKDOWN}${qs(params)}`);
}

// ── G. Export ────────────────────────────────────────────────────────────────────

/** GET /api/seller/analytics/export — downloads a PDF or CSV report and triggers the browser save dialog. */
export async function apiSellerAnalyticsExport(params: SellerExportParams) {
  const blob = await client.get<never, Blob>(`${ENDPOINTS.ANALYTICS.SELLER.EXPORT}${qs(params)}`, { responseType: 'blob' } as never);
  const filename = params.format === 'pdf'
    ? 'seller-analytics-report.pdf'
    : `seller-analytics-${params.section ?? 'revenue'}.csv`;

  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objUrl);
}
