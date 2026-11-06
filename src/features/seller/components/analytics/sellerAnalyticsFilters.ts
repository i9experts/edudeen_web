import {
  DEFAULT_ANALYTICS_UI_FILTERS,
  RANGE_PRESET_OPTIONS,
  toBaseAnalyticsApiParams,
  type BaseAnalyticsUIFilters,
} from '@/components/comman/analytics/analyticsFilters';
import type { SellerAnalyticsParams } from '@/api/services/analytics/analytics';

export { RANGE_PRESET_OPTIONS };

export const CSV_SECTION_OPTIONS = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'orders', label: 'Orders' },
  { value: 'products', label: 'Products' },
  { value: 'customers', label: 'Customers' },
];

/** Maps the active tab to a sensible default CSV section — still fully overridable via the filter bar's dropdown. */
export const TAB_TO_CSV_SECTION: Record<string, string> = {
  overview: 'revenue',
  revenue: 'revenue',
  products: 'products',
  customers: 'customers',
  traffic: 'orders',
};

/** Seller analytics has no admin-style storeId/sellerId drill-down — the store is already fixed by context, so the UI filter shape is just the shared date-range fields. */
export type SellerAnalyticsFilters = BaseAnalyticsUIFilters;

export const DEFAULT_SELLER_ANALYTICS_FILTERS: SellerAnalyticsFilters = { ...DEFAULT_ANALYTICS_UI_FILTERS };

const PKT_MS = 5 * 3600 * 1000;
const DAY_MS = 86_400_000;

/** Today's calendar date in Pakistan time as yyyy-mm-dd (all seller analytics ranges are PKT days). */
export function pktToday(now: number = Date.now()): string {
  return new Date(now + PKT_MS).toISOString().slice(0, 10);
}

/** yyyy-mm-dd shifted by whole days (calendar arithmetic, no timezone involved). */
export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

const MAX_SPAN_DAYS = 366; // "12 months", same cap as the API

/** Custom-range check run BEFORE any request: returns an inline message, or '' when both dates are usable. */
export function customRangeError(from: string, to: string, today: string = pktToday()): string {
  const ok = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
  if (!ok(from) || !ok(to)) return 'Choose both a start and an end date.';
  if (from > to) return 'The start date must be on or before the end date.';
  if (to > today) return 'The end date cannot be in the future.';
  if ((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS + 1 > MAX_SPAN_DAYS) return 'Choose a range of 12 months or less.';
  return '';
}

/** Filters <-> URL (?range=custom&from=&to=&compare=1) so a refresh or shared link keeps the range. */
const RANGES = new Set(['7d', '30d', '90d', '6m', '12m', 'custom']);
export function filtersFromSearch(sp: URLSearchParams): SellerAnalyticsFilters {
  const range = sp.get('range') ?? '';
  const r = (RANGES.has(range) ? range : DEFAULT_SELLER_ANALYTICS_FILTERS.range) as SellerAnalyticsFilters['range'];
  return {
    ...DEFAULT_SELLER_ANALYTICS_FILTERS,
    range: r,
    from: r === 'custom' ? sp.get('from') ?? '' : '',
    to: r === 'custom' ? sp.get('to') ?? '' : '',
    compareToPreviousPeriod: sp.get('compare') === '1',
  };
}
export function applyFiltersToSearch(sp: URLSearchParams, f: SellerAnalyticsFilters): URLSearchParams {
  const next = new URLSearchParams(sp);
  for (const k of ['range', 'from', 'to', 'compare']) next.delete(k);
  if (f.range !== DEFAULT_SELLER_ANALYTICS_FILTERS.range) next.set('range', f.range);
  if (f.range === 'custom') { if (f.from) next.set('from', f.from); if (f.to) next.set('to', f.to); }
  if (f.compareToPreviousPeriod) next.set('compare', '1');
  return next;
}

/** `storeId: null` means "every store the seller owns" — the cross-store view (no `storeId` sent at all). */
export function toSellerAnalyticsParams(filters: SellerAnalyticsFilters, storeId: string | null): SellerAnalyticsParams {
  const params: SellerAnalyticsParams = { ...toBaseAnalyticsApiParams(filters) };
  if (storeId) params.storeId = storeId;
  return params;
}
