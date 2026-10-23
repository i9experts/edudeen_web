import client from '../client';
import { ENDPOINTS } from '../endpoints';

export interface CurrentRate {
  ratePerUSD: number;
  effectiveFrom: string;
  source: 'provider' | 'admin';
}

export type CurrentRatesMap = Record<string, CurrentRate | null>;

export interface ExchangeRateHistoryRow {
  _id: string;
  currency: string;
  ratePerUSD: number;
  effectiveFrom: string;
  source: 'provider' | 'admin';
  createdBy: string | null;
  isRejected: boolean;
  rejectionReason: 'sanity_band' | 'abnormal_jump' | null;
  createdAt: string;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

// Public — used to convert prices for display before checkout.
export function apiGetCurrentRates() {
  return client.get<never, ApiResponse<CurrentRatesMap>>(ENDPOINTS.EXCHANGE_RATE.CURRENT);
}

export function apiGetFxHistory(params?: { currency?: string; page?: number; limit?: number }) {
  return client.get<never, ApiResponse<{ items: ExchangeRateHistoryRow[]; total: number; page: number; limit: number }>>(
    ENDPOINTS.EXCHANGE_RATE.ADMIN_HISTORY,
    { params },
  );
}

export function apiGetFxStaleness() {
  return client.get<never, ApiResponse<Record<string, { hoursOld: number; isStale: boolean } | null>>>(
    ENDPOINTS.EXCHANGE_RATE.ADMIN_STALENESS,
  );
}

export interface HeldFxRate { _id: string; currency: string; ratePerUSD: number; effectiveFrom: string }

export function apiGetHeldFxRates() {
  return client.get<never, ApiResponse<HeldFxRate[]>>(ENDPOINTS.EXCHANGE_RATE.ADMIN_HELD);
}
export function apiConfirmHeldFxRate(id: string) {
  return client.post<never, ApiResponse<{ applied: boolean }>>(ENDPOINTS.EXCHANGE_RATE.ADMIN_HELD_CONFIRM(id));
}
export function apiDismissHeldFxRate(id: string, reason?: string) {
  return client.post<never, ApiResponse<{ dismissed: boolean }>>(ENDPOINTS.EXCHANGE_RATE.ADMIN_HELD_DISMISS(id), { reason });
}

export function apiOverrideFxRate(currency: string, ratePerUSD: number) {
  return client.post<never, ApiResponse<{ applied: boolean; held: boolean }>>(
    ENDPOINTS.EXCHANGE_RATE.ADMIN_OVERRIDE,
    { currency, ratePerUSD },
  );
}
