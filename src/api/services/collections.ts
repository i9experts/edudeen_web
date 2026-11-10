import client from '../client';
import { ENDPOINTS } from '../endpoints';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface CollectionSeo {
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  twitterCard: 'summary' | 'summary_large_image';
  canonicalUrlOverride: string | null;
  noindex: boolean;
  keywords: string[];
}

export interface CollectionRules {
  categoryId: string | null;
  tags: string[];
  matchType: 'all' | 'any';
  // Smart rules (all optional; absent on old collections).
  priceMin?: number | null;
  priceMax?: number | null;
  createdWithinDays?: number | null;
  minRating?: number | null;
  hasDiscount?: boolean;
  bestSellersTopN?: number | null;
  language?: string | null;
  classFrom?: string | null;
  classTo?: string | null;
}

export type CollectionSort = 'manual' | 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'rating';
export type CollectionWindowState = 'live' | 'scheduled' | 'ended';

export interface CollectionData {
  _id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  type: 'manual' | 'automatic';
  productIds: string[];
  rules: CollectionRules;
  status: 'active' | 'draft';
  sortOrder: number;
  seo: CollectionSeo;
  sortBy?: CollectionSort | null;
  startAt?: string | null;
  endAt?: string | null;
  nameUr?: string | null;
  descriptionUr?: string | null;
  /** Seller list only: products that currently match (same evaluator as the store tab). */
  productCount?: number;
  windowState?: CollectionWindowState;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCollectionSummary {
  nameUr?: string | null;
  descriptionUr?: string | null;
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  type: 'manual' | 'automatic';
  sortOrder: number;
}

export interface CreateCollectionPayload {
  name: string;
  description?: string;
  image?: string;
  type: 'manual' | 'automatic';
  productIds?: string[];
  rules?: Partial<CollectionRules>;
  sortBy?: CollectionSort;
  startAt?: string | null;
  endAt?: string | null;
  nameUr?: string | null;
  descriptionUr?: string | null;
}

export interface CollectionPreview { count: number; products: { _id: string; name: string; image: string | null }[] }

export type UpdateCollectionPayload = Partial<CreateCollectionPayload> & { status?: 'active' | 'draft' };

// ── Seller ───────────────────────────────────────────────────────────────────

export function apiListCollections(storeId: string) {
  return client.get<never, ApiResponse<CollectionData[]>>(ENDPOINTS.COLLECTIONS.LIST(storeId));
}

export function apiGetCollection(storeId: string, collectionId: string) {
  return client.get<never, ApiResponse<CollectionData>>(ENDPOINTS.COLLECTIONS.GET(storeId, collectionId));
}

export function apiCreateCollection(storeId: string, payload: CreateCollectionPayload) {
  return client.post<never, ApiResponse<CollectionData>>(ENDPOINTS.COLLECTIONS.CREATE(storeId), payload);
}

export function apiUpdateCollection(storeId: string, collectionId: string, payload: UpdateCollectionPayload) {
  return client.patch<never, ApiResponse<CollectionData>>(ENDPOINTS.COLLECTIONS.UPDATE(storeId, collectionId), payload);
}

export function apiUpdateCollectionProducts(storeId: string, collectionId: string, productIds: string[]) {
  return client.patch<never, ApiResponse<CollectionData>>(ENDPOINTS.COLLECTIONS.UPDATE_PRODUCTS(storeId, collectionId), { productIds });
}

/** Live preview for the modal — nothing is saved; same evaluator as the store tab. */
export function apiPreviewCollection(
  storeId: string,
  body: { type: 'manual' | 'automatic'; productIds?: string[]; rules?: Partial<CollectionRules>; sortBy?: CollectionSort },
  signal?: AbortSignal,
) {
  return client.post<never, ApiResponse<CollectionPreview>>(`/api/collections/${storeId}/preview`, body, { signal });
}

export function apiReorderCollections(storeId: string, ids: string[]) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.COLLECTIONS.REORDER(storeId), { ids });
}

export function apiDeleteCollection(storeId: string, collectionId: string) {
  return client.delete<never, ApiResponse<null>>(ENDPOINTS.COLLECTIONS.DELETE(storeId, collectionId));
}

// ── Public ───────────────────────────────────────────────────────────────────

export function apiGetPublicCollections(storeId: string) {
  return client.get<never, ApiResponse<PublicCollectionSummary[]>>(ENDPOINTS.COLLECTIONS.PUBLIC_LIST(storeId));
}

export function apiGetPublicCollectionBySlug(storeId: string, slugOrId: string) {
  return client.get<never, ApiResponse<PublicCollectionSummary & { seo: CollectionSeo }>>(ENDPOINTS.COLLECTIONS.PUBLIC_GET(storeId, slugOrId));
}
