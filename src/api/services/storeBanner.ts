import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export const STORE_BANNER_TYPES = ['hero', 'promotion', 'season', 'collection', 'video'] as const;
export type StoreBannerType = (typeof STORE_BANNER_TYPES)[number];

export type StoreBannerStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'expired';

export const STORE_BANNER_LINK_TYPES = ['product', 'category', 'external', 'collection'] as const;
export type StoreBannerLinkType = (typeof STORE_BANNER_LINK_TYPES)[number];

export interface StoreBanner {
  _id:             string;
  storeId:         string;
  type:            StoreBannerType;
  imageUrl:        string;
  publicId:        string;
  mobileImageUrl:  string | null;
  mobilePublicId:  string;
  videoUrl:        string | null;
  ctaLabel:        string | null;
  linkType:        StoreBannerLinkType;
  linkTarget:      string | null;
  /** Public read only: the resolved in-site path (product / collection) or a legacy https link; null = no usable link. */
  linkPath?:       string | null;
  order:           number;
  priority:        number;
  status:          StoreBannerStatus;
  startAt:         string | null;
  endAt:           string | null;
  createdBy:       string | null;
  createdAt:       string;
  updatedAt:       string;
}

export interface CreateStoreBannerFields {
  type?:       StoreBannerType;
  ctaLabel?:   string;
  linkType?:   StoreBannerLinkType;
  linkTarget?: string;
  order?:      number;
  priority?:   number;
  startAt?:    string;
  endAt?:      string;
}

export type UpdateStoreBannerFields = Partial<CreateStoreBannerFields>;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC (storefront)
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetPublicStoreBanners(storeId: string) {
  return client.get<never, { success: boolean; count: number; data: StoreBanner[] }>(
    ENDPOINTS.STORE_BANNER.PUBLIC(storeId),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELLER
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetStoreBanners(storeId: string) {
  return client.get<never, { success: boolean; data: StoreBanner[] }>(ENDPOINTS.STORE_BANNER.LIST(storeId));
}

export function apiCreateStoreBanner(storeId: string, fields: CreateStoreBannerFields, file: File, mobileFile?: File) {
  const fd = new FormData();
  fd.append('file', file);
  if (mobileFile) fd.append('mobileFile', mobileFile);
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) fd.append(key, String(value));
  });
  return client.post<never, { success: boolean; message: string; data: StoreBanner }>(
    ENDPOINTS.STORE_BANNER.CREATE(storeId), fd,
  );
}

export function apiUpdateStoreBanner(storeId: string, bannerId: string, fields: UpdateStoreBannerFields) {
  return client.patch<never, { success: boolean; message: string; data: StoreBanner }>(
    ENDPOINTS.STORE_BANNER.UPDATE(storeId, bannerId), fields,
  );
}

/** A store shows at most this many slides at once (active or scheduled). The server enforces it too. */
export const MAX_STORE_SLIDES = 4;
/** New slides may only link to the seller's own live product or collection. */
export const SLIDE_LINK_TYPES = ['product', 'collection'] as const;

export function apiReorderStoreBanners(storeId: string, ids: string[]) {
  return client.patch<never, { success: boolean; message: string }>(ENDPOINTS.STORE_BANNER.REORDER(storeId), { ids });
}

export function apiPauseStoreBanner(storeId: string, bannerId: string) {
  return client.patch<never, { success: boolean; message: string; data: StoreBanner }>(
    ENDPOINTS.STORE_BANNER.PAUSE(storeId, bannerId),
  );
}

export function apiResumeStoreBanner(storeId: string, bannerId: string) {
  return client.patch<never, { success: boolean; message: string; data: StoreBanner }>(
    ENDPOINTS.STORE_BANNER.RESUME(storeId, bannerId),
  );
}

export function apiGetStoreBannerTimeline(storeId: string, bannerId: string) {
  return client.get<never, { success: boolean; data: unknown[] }>(
    ENDPOINTS.STORE_BANNER.TIMELINE(storeId, bannerId),
  );
}

export function apiDeleteStoreBanner(storeId: string, bannerId: string) {
  return client.delete<never, { success: boolean; message: string }>(
    ENDPOINTS.STORE_BANNER.DELETE(storeId, bannerId),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA LIBRARY (reusable creatives — "choose existing" picker)
// ─────────────────────────────────────────────────────────────────────────────
export interface MediaAsset {
  _id:          string;
  url:          string;
  publicId:     string;
  resourceType: string;
  width:        number | null;
  height:       number | null;
  createdAt:    string;
}

export function apiGetMediaLibrary() {
  return client.get<never, { success: boolean; data: MediaAsset[] }>(ENDPOINTS.MEDIA_LIBRARY.LIST);
}
