import client from '../client';
import { ENDPOINTS } from '../endpoints';

export type AdminExportKind = 'users' | 'orders' | 'listings' | 'proofs';

const URLS: Record<AdminExportKind, string> = {
  users: ENDPOINTS.ADMIN_EXPORTS.USERS,
  orders: ENDPOINTS.ADMIN_EXPORTS.ORDERS,
  listings: ENDPOINTS.ADMIN_EXPORTS.LISTINGS,
  proofs: ENDPOINTS.ADMIN_EXPORTS.PROOFS,
};

/** Drops empty filter values so the URL only carries real filters. */
function clean(params: Record<string, string | number | boolean | undefined | null>) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

/**
 * Downloads a CSV export (max 5000 newest rows; the file's first line says when it was cut). The API asks for the
 * admin password (handled by the client) and writes an audit entry; staff need the matching `<module>.export` right.
 */
export async function apiDownloadAdminExport(kind: AdminExportKind, params: Record<string, string | number | boolean | undefined | null> = {}) {
  const csv = await client.get<never, string>(URLS[kind], { params: clean(params), responseType: 'text' });
  saveCsv(csv, `edudeen-${kind}-${new Date().toISOString().slice(0, 10)}.csv`);
}

export function saveCsv(csv: string, filename: string) {
  // BOM so Excel reads names/Urdu text as UTF-8.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface PendingCounts {
  payouts?: number;
  paymentProofs?: number;
  listings?: number;
  refunds?: number;
  promotions?: number;
  total: number;
}

export function apiGetPendingCounts() {
  return client.get<never, { success: boolean; data: PendingCounts }>(ENDPOINTS.ADMIN_PENDING_COUNTS);
}
