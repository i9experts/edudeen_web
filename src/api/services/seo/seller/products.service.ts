import client from '../../../client';
import { ENDPOINTS } from '../../../endpoints';

// ── Shared response shapes ──────────────────────────────────────────────────────
// Mirrors the embedded `.seo` sub-document written by `UpdateSeoMetaDto` (see
// `seo/dto/update-seo-meta.dto.ts`), plus the two fields the service stamps on
// every write (`aiGenerated`, `updatedAt`) — confirmed from
// `SeoContentService.updateProductSeo`/`getProductSeo`.

export interface ProductSeoMeta {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  canonicalUrlOverride?: string;
  noindex?: boolean;
  keywords?: string[];
  aiGenerated?: boolean;
  updatedAt?: string;
}

// ── Request DTOs (verbatim from backend) ─────────────────────────────────────────

export interface UpdateSeoMetaDto {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  canonicalUrlOverride?: string;
  noindex?: boolean;
  keywords?: string[];
}

export interface BulkApplyProductTemplateDto {
  titleTemplate?: string;
  descriptionTemplate?: string;
  categoryId?: string;
  onlyMissing?: boolean;
}

// ── Query params ──────────────────────────────────────────────────────────────
// The controller accepts `@Query() query: any` and forwards it verbatim to
// `SeoContentService.listProductSeo(storeId, query)`, which only actually reads
// `page`/`limit` (see seo-content.service.ts) — no search/category filter is
// wired up server-side yet. Kept as an open index signature so callers can pass
// forward-looking filters without a type error once the backend adds them.
export interface SeoProductsListParams {
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

// ── Response shapes ──────────────────────────────────────────────────────────────

export interface SeoProductListItem {
  _id: string;
  name: string;
  slug: string;
  seo: ProductSeoMeta;
  /** 0-100 heuristic from `computeSeoCompleteness` (title/description/keywords/ogImage). */
  completeness: number;
}

export interface SeoProductsPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface SeoProductsListData {
  items: SeoProductListItem[];
  pagination: SeoProductsPagination;
}

export interface BulkApplySeoTemplateResultData {
  updated: number;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

// ── Query-string helper (mirrors the convention in services/finance/adminFinance.ts) ─

function qs(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
}

// ── List / detail ──────────────────────────────────────────────────────────────

export function apiSeoProductsList(storeId: string, params: SeoProductsListParams = {}) {
  return client.get<never, ApiResponse<SeoProductsListData>>(`${ENDPOINTS.SEO.SELLER.PRODUCTS.LIST(storeId)}${qs(params)}`);
}

export interface SearchMissingItem { key: string; label: string; fix: { step: number; fieldId: string } }
export interface SearchVisibilityRow { _id: string; name: string; slug: string; image: string | null; score: number; missing: SearchMissingItem[] }
export interface SearchVisibilityData {
  items: SearchVisibilityRow[];
  pagination: SeoProductsPagination;
  summary: { totalProducts: number; needFix: number; avgScore: number | null };
}

/** Products that still need something to be easier to find (lowest score first). */
export function apiSearchVisibility(storeId: string, params: { page?: number; limit?: number } = {}) {
  return client.get<never, ApiResponse<SearchVisibilityData>>(`${ENDPOINTS.SEO.SELLER.PRODUCTS.VISIBILITY(storeId)}${qs(params)}`);
}

/** 1 AI credit; returns a draft only (nothing saved). */
export function apiDraftSearchText(storeId: string, productId: string, language: 'en' | 'ur') {
  return client.post<never, ApiResponse<{ metaTitle: string; metaDescription: string; creditsCost: number }>>(
    ENDPOINTS.SEO.SELLER.AI.PRODUCT_DRAFT(storeId), { productId, language },
    { headers: { 'Idempotency-Key': `seo-draft:${productId}:${language}:${Date.now()}` } },
  );
}

export function apiSeoProductGetById(storeId: string, productId: string) {
  return client.get<never, ApiResponse<ProductSeoMeta>>(ENDPOINTS.SEO.SELLER.PRODUCTS.GET_BY_ID(storeId, productId));
}

// ── Update ────────────────────────────────────────────────────────────────────

export function apiUpdateSeoProduct(storeId: string, productId: string, payload: UpdateSeoMetaDto) {
  return client.patch<never, ApiResponse<ProductSeoMeta>>(ENDPOINTS.SEO.SELLER.PRODUCTS.UPDATE(storeId, productId), payload);
}

// ── Bulk apply template ────────────────────────────────────────────────────────

export function apiBulkApplySeoProductTemplate(storeId: string, payload: BulkApplyProductTemplateDto) {
  return client.post<never, ApiResponse<BulkApplySeoTemplateResultData>>(ENDPOINTS.SEO.SELLER.PRODUCTS.BULK_APPLY_TEMPLATE(storeId), payload);
}

// ── Export ────────────────────────────────────────────────────────────────────

/** GET /api/store/:storeId/seo/products/export — bypasses `SeoResponseInterceptor`, streams a raw CSV file; downloads it and triggers the browser save dialog. */
export async function apiExportSeoProducts(storeId: string, params: SeoProductsListParams = {}) {
  const blob = await client.get<never, Blob>(`${ENDPOINTS.SEO.SELLER.PRODUCTS.EXPORT(storeId)}${qs(params)}`, { responseType: 'blob' } as never);
  const filename = `seo-products-${storeId}.csv`;

  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objUrl);
}
