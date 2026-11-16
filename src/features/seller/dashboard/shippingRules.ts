import type { StoreDeliveryMethod } from '@/api/services/store';

/** The ONLY store keys the Shipping page may save. Store Settings must never send these (and vice versa). */
export const SHIPPING_KEYS = ['deliverySettings', 'giftWrap', 'shipFrom', 'deliveryMethod', 'dispatchDays', 'deliveryDays'] as const;

export const DISPATCH_DAYS_DEFAULT = 2;

/** Optional transit days per route (DAYS ONLY - no fees). Whole days 0-30, min <= max; a row left empty = not set. */
export const ROUTE_ROWS = [
  { key: 'sameCity', label: 'Own city' },
  { key: 'sameProvince', label: 'Same province' },
  { key: 'national', label: 'Rest of Pakistan' },
] as const;
export type RouteRowKey = typeof ROUTE_ROWS[number]['key'];
export type DaysForm = Record<RouteRowKey, { min: string; max: string }>;
export const EMPTY_DAYS: DaysForm = { sameCity: { min: '', max: '' }, sameProvince: { min: '', max: '' }, national: { min: '', max: '' } };
export const MAX_TRANSIT_DAYS = 30;

/** Form state from the stored value. */
export function daysFromStore(d: Partial<Record<RouteRowKey, { min: number; max: number }>> | null | undefined): DaysForm {
  const out: DaysForm = { sameCity: { min: '', max: '' }, sameProvince: { min: '', max: '' }, national: { min: '', max: '' } };
  for (const r of ROUTE_ROWS) { const v = d?.[r.key]; if (v) out[r.key] = { min: String(v.min), max: String(v.max) }; }
  return out;
}

/** Per-route error text (only routes that have something typed). */
export function deliveryDaysErrors(days: DaysForm | undefined): Partial<Record<RouteRowKey, string>> {
  const errs: Partial<Record<RouteRowKey, string>> = {};
  if (!days) return errs;
  for (const r of ROUTE_ROWS) {
    const lo = days[r.key].min.trim(), hi = days[r.key].max.trim();
    if (!lo && !hi) continue;
    if (!lo || !hi) { errs[r.key] = 'Enter both a minimum and a maximum, or clear both.'; continue; }
    if (!/^\d+$/.test(lo) || !/^\d+$/.test(hi) || Number(lo) > MAX_TRANSIT_DAYS || Number(hi) > MAX_TRANSIT_DAYS) { errs[r.key] = `Use whole days from 0 to ${MAX_TRANSIT_DAYS}.`; continue; }
    if (Number(lo) > Number(hi)) errs[r.key] = 'The minimum cannot be more than the maximum.';
  }
  return errs;
}

function daysPayload(days: DaysForm | undefined) {
  if (!days) return null;
  const out: Partial<Record<RouteRowKey, { min: number; max: number }>> = {};
  for (const r of ROUTE_ROWS) {
    const lo = days[r.key].min.trim(), hi = days[r.key].max.trim();
    if (lo && hi) out[r.key] = { min: Number(lo), max: Number(hi) };
  }
  return Object.keys(out).length ? out : null;
}

export interface ShippingForm {
  fromCity: string; fromProvince: string;
  delOn: boolean; fee: string; freeOver: string;
  wrapOn: boolean; wrapFee: string;
  method: StoreDeliveryMethod | null;
  /** Working days as typed (1-7). */
  dispatchDays: string;
  /** Optional transit days per route as typed. */
  days?: DaysForm;
}

/** Error text for the dispatch-days box, or null when it is a whole number 1-7. */
export function dispatchDaysError(s: string): string | null {
  const t = s.trim();
  if (!/^\d+$/.test(t)) return 'Enter a whole number of days from 1 to 7.';
  const n = Number(t);
  return n < 1 || n > 7 ? 'Enter a whole number of days from 1 to 7.' : null;
}

const toNum = (s: string) => (s.trim() === '' ? NaN : Number(s));
export const badMoney = (s: string) => { const n = toNum(s); return !Number.isFinite(n) || n < 0 || n > 10_000_000; };

/** Payload for the Shipping save: shipping keys only. */
export function buildShippingPayload(storeId: string, f: ShippingForm) {
  return {
    storeId,
    deliverySettings: { enabled: f.delOn, fee: f.delOn ? toNum(f.fee) : 0, freeOverAmount: f.delOn && f.freeOver.trim() !== '' ? toNum(f.freeOver) : null },
    giftWrap: { enabled: f.wrapOn, fee: f.wrapOn ? toNum(f.wrapFee) : 0 },
    shipFrom: f.fromCity.trim() ? { city: f.fromCity.trim(), province: f.fromProvince.trim() || null } : null,
    deliveryMethod: f.method,
    dispatchDays: Number(f.dispatchDays.trim()),
    deliveryDays: daysPayload(f.days),
  };
}

export interface ShippingSummary {
  empty: boolean;
  method: string;
  from: string;
  /** null = Edudeen standard rates */
  charge: number | null;
  /** null = off */
  freeOver: number | null;
}

const METHOD_LABEL: Record<string, string> = {
  self: 'I deliver myself', tcs: 'Edudeen books TCS', leopards: 'Edudeen books Leopards', postex: 'Edudeen books PostEx', auto: 'Cheapest courier',
};

export function summarizeShipping(s: {
  deliveryMethod?: StoreDeliveryMethod | null;
  deliverySettings?: { enabled?: boolean; fee?: number; freeOverAmount?: number | null } | null;
  shipFrom?: { city?: string | null } | null;
}): ShippingSummary {
  const own = s.deliverySettings?.enabled === true;
  const city = s.shipFrom?.city?.trim() || '';
  const method = s.deliveryMethod ? (METHOD_LABEL[s.deliveryMethod] ?? 'Edudeen standard delivery') : 'Edudeen standard delivery';
  return {
    empty: !s.deliveryMethod && !own && !city,
    method,
    from: city,
    charge: own ? Number(s.deliverySettings?.fee ?? 0) : null,
    freeOver: own && s.deliverySettings?.freeOverAmount != null ? Number(s.deliverySettings.freeOverAmount) : null,
  };
}
