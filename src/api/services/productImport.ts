import client from '../client';
import { cachedRequest } from './requestCache';

// Seller CSV product import (drafts only): template -> preview (writes nothing) -> commit.
interface ApiResponse<T> { success: boolean; message?: string; data: T }

export type ImportType = 'physical' | 'digital';
export const IMPORT_MAX_ROWS = 200;
export const IMPORT_MAX_BYTES = 1_000_000;

export interface ImportPreviewRow {
  row: number; title: string; ok: boolean;
  errors: { field: string; message: string }[]; warnings: string[];
}
export interface ImportPreview { type: ImportType; total: number; valid: number; invalid: number; ignoredColumns: string[]; rows: ImportPreviewRow[] }
export interface ImportResult {
  created: { row: number; title: string; productId: string; warnings: string[] }[];
  failed: { row: number; title: string; message: string }[];
  errorsCsv: string | null;
}

const form = (storeId: string, type: ImportType, file: File) => {
  const f = new FormData();
  f.append('storeId', storeId); f.append('type', type); f.append('file', file);
  return f;
};

/** CSV text of the template (headers + one example row). */
export function apiImportTemplate(type: ImportType) {
  return cachedRequest(`product-import-template:${type}`, 60_000, () =>
    client.get<never, string>('/api/products/import/template', { params: { type }, responseType: 'text' }));
}

export function apiImportPreview(storeId: string, type: ImportType, file: File) {
  return client.post<never, ApiResponse<ImportPreview>>('/api/products/import/preview', form(storeId, type, file));
}

export function apiImportCommit(storeId: string, type: ImportType, file: File) {
  return client.post<never, ApiResponse<ImportResult> & { message: string }>('/api/products/import/commit', form(storeId, type, file));
}
