import type { AxiosRequestConfig } from 'axios';
import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export const PROMOTION_PLACEMENTS = ['homepageHero', 'marketplaceHero', 'educationHero', 'categoryHero', 'productPage'] as const;
export type PromotionPlacement = (typeof PROMOTION_PLACEMENTS)[number];

// Every placement now has a buyer surface: homepageHero (Homepage), marketplaceHero
// (home `?search=`), educationHero (/learn), categoryHero (home `?category=`) — see PlacementBanner.
// productPage (the banner on every product page) is the platform's own slot: admins can put banners there, sellers cannot buy it.
export const SELECTABLE_PROMOTION_PLACEMENTS = PROMOTION_PLACEMENTS.filter(p => p !== 'productPage');
export const ADMIN_BANNER_PLACEMENTS = PROMOTION_PLACEMENTS;

export type BannerStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'expired';

export interface Banner {
  _id:         string;
  bannerImage: string;
  publicId:    string;
  /** Admin-given name (admin list + picture alt text). */
  title?:      string;
  urlOnTap:    string | null;
  isActive:    boolean;
  status:      BannerStatus;
  /** Deprecated — always `placements[0]`, kept for older readers. */
  placement:   PromotionPlacement;
  /** A banner can run on more than one placement at once — rows created
   *  before this field existed come back as `[]`, in which case fall back to
   *  `placement`. */
  placements:  PromotionPlacement[];
  startAt:     string | null;
  endAt:       string | null;
  /** Admin list only: true when visitors can see this banner right now. */
  live?:       boolean;
  order:       number;
  createdAt:   string;
  updatedAt:   string;
}

/** `banner.placements` if populated, else the legacy scalar `placement` — use this everywhere instead of reading either field directly. */
export function bannerPlacements(banner: Pick<Banner, 'placement' | 'placements'>): PromotionPlacement[] {
  return banner.placements?.length ? banner.placements : [banner.placement];
}

export interface BannerCountData {
  placement:        PromotionPlacement;
  current:          number;
  visibleLimit:     number;
  isOversubscribed: boolean;
}

export interface CreateBannerPayload {
  title?:       string;
  bannerImage?: string;
  urlOnTap?:    string;
  placements?:  PromotionPlacement[];
  startAt?:     string;
  endAt?:       string;
  order?:       number;
  /** Save without publishing — never shown until published. */
  saveAsDraft?: boolean;
}

export interface UpdateBannerPayload {
  title?:       string;
  bannerImage?: string;
  urlOnTap?:    string;
  placements?:  PromotionPlacement[];
  /** `null` clears the schedule. */
  startAt?:     string | null;
  endAt?:       string | null;
  order?:       number;
  isActive?:    boolean;
  saveAsDraft?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — omit `placement` to preserve the historical unscoped (all-active) behavior
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetBanners(placement?: PromotionPlacement) {
  return client.get<never, { success: boolean; count: number; data: Banner[] }>(
    ENDPOINTS.BANNER.LIST, { params: placement ? { placement } : undefined },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
/** GET /api/banners/admin/all — every banner in every state (draft / scheduled / live / paused / expired). */
export function apiGetAdminBanners() {
  return client.get<never, { success: boolean; count: number; data: Banner[] }>(ENDPOINTS.BANNER.ADMIN_LIST);
}

export function apiGetBannerCount(placement?: PromotionPlacement) {
  return client.get<never, { success: boolean; data: BannerCountData }>(
    ENDPOINTS.BANNER.COUNT, { params: placement ? { placement } : undefined },
  );
}

export function apiCreateBannerFromUrl(payload: CreateBannerPayload, config?: AxiosRequestConfig) {
  return client.post<never, { success: boolean; message: string; data: Banner }>(
    ENDPOINTS.BANNER.CREATE, payload, config,
  );
}

export function apiUploadBanner(file: File, urlOnTap?: string, placement?: PromotionPlacement) {
  const fd = new FormData();
  fd.append('file', file);
  return client.post<never, { success: boolean; message: string; data: Banner }>(
    ENDPOINTS.BANNER.UPLOAD, fd, { params: { ...(urlOnTap ? { urlOnTap } : {}), ...(placement ? { placement } : {}) } },
  );
}

export function apiUpdateBanner(id: string, payload: UpdateBannerPayload, config?: AxiosRequestConfig) {
  return client.patch<never, { success: boolean; message: string; data: Banner }>(
    ENDPOINTS.BANNER.UPDATE(id), payload, config,
  );
}

export function apiPauseBanner(id: string, config?: AxiosRequestConfig) {
  return client.patch<never, { success: boolean; message: string; data: Banner }>(ENDPOINTS.BANNER.PAUSE(id), undefined, config);
}

export function apiResumeBanner(id: string, config?: AxiosRequestConfig) {
  return client.patch<never, { success: boolean; message: string; data: Banner }>(ENDPOINTS.BANNER.RESUME(id), undefined, config);
}

export function apiDeleteBanner(id: string, config?: AxiosRequestConfig) {
  return client.delete<never, { success: boolean; message: string }>(
    ENDPOINTS.BANNER.DELETE(id), config,
  );
}
