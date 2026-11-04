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
}

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
  createdAt: string;
  updatedAt: string;
}

export interface PublicCollectionSummary {
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
}

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
