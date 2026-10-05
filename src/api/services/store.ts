import client from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ActiveCampaignBadge } from './marketplace';

export type SellerType  = 'creator' | 'educator' | 'retailer' | 'brand_business' | 'freelancer' | 'mix';
export type ProductType = 'physical_products' | 'digital_downloads' | 'educational_resources' | 'services_bookings' | 'subscriptions' | 'in_person_pos';

export type SupportedCurrency = 'PKR' | 'USD';

export interface CreateStorePayload {
  name:         string;
  logo?:        string;
  categoryId:   string;
  description?: string;
  sellerType:   SellerType;
  productTypes: ProductType[];
  /** The currency this seller prices their products in — chosen once here,
   *  required, and locked forever the moment the store has its first
   *  product (see backend StoreService.createStore's comment). */
  baseCurrency: SupportedCurrency;
}

/** The teacher behind a store — shown to buyers next to the Verified Educator badge. */
export interface EducatorProfile {
  headline:        string | null;
  qualifications:  string[];
  experienceYears: number | null;
  subjects:        string[];
  institutions:    string[];
  teachingLevels:  string[];
}
export interface UpdateStorePayload {
  storeId:      string;
  name?:        string;
  logo?:        string;
  coverImage?:  string | null;
  categoryId?:  string;
  description?: string;
  tagline?:      string;
  educatorProfile?: EducatorProfile | null;
  contactEmail?: string;
  contactPhone?: string;
  productTypes?: ProductType[];
  codEnabled?:  boolean;
}

export interface StoreData {
  _id:          string;
  sellerId:     string;
  name:         string;
  slug:         string;
  logo:         string | null;
  coverImage:   string | null;
  categoryId:   string;
  description:  string;
  /** Short marketing line — distinct from `description`, shown alongside the store name. */
  tagline:      string | null;
  educatorProfile?: EducatorProfile | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sellerType:   SellerType;
  productTypes: ProductType[];
  baseCurrency: SupportedCurrency;
  /** Per-seller Cash-on-Delivery opt-out — defaults to true. Not yet enforced
   *  by checkout (a multi-vendor cart's COD eligibility isn't scoped per
   *  seller there yet); this only persists the seller's preference so far. */
  codEnabled:   boolean;
  enabledTools: string[];
  plan:         string;
  aiCredits:    number;
  customDomain: string | null;
  customDomainStatus: 'unverified' | 'verified';
  whiteLabelEnabled: boolean;
  /** Marketplace listing lifecycle — independent of `verificationStatus`
   *  below (see store.schema.ts). Only `'active'` unlocks product creation
   *  and public storefront/marketplace visibility. */
  status:       'pending' | 'active' | 'rejected' | 'suspended';
  /** KYC/business-verification review state — see store.schema.ts's
   *  VERIFICATION_TRANSITIONS. Drives seller-workspace nav gating. */
  verificationStatus: 'not_started' | 'pending' | 'under_review' | 'verified' | 'rejected';
  /** Server-computed only (determineVerificationLevel) — never trust a
   *  client-side guess of this value. */
  verificationLevel: 'basic' | 'business' | 'enhanced' | null;
  country:      string;
  businessType: 'individual' | 'company' | 'partnership' | null;
  /** Set by an admin when rejecting a pending lead — see AdminMarketplaceService.rejectLead. */
  rejectionReason: string | null;
  isDelete:     boolean;
  registers:    unknown[];
  shifts:       unknown[];
  pinnedProductIds: string[];
  announcementBar: StoreAnnouncementBar;
  createdAt:    string;
  updatedAt:    string;
}

export interface MyStoreItem extends StoreData {
  sellerName:    string;
  sellerEmail:   string;
  /** Active, non-deleted product count for this store. */
  productCount:  number;
  /** All-time net revenue (gross minus refunds) across non-cancelled orders. */
  totalSalesUSD: number;
}

export interface MyStoresSummary {
  storeCount:      number;
  totalProducts:   number;
  totalRevenueUSD: number;
}

interface ApiResponse<T>      { success: boolean; message?: string; data: T }
interface MyStoresResponse    { success: boolean; count: number; summary: MyStoresSummary; data: MyStoreItem[] }

/** POST /api/store/create-store */
export function apiCreateStore(payload: CreateStorePayload) {
  return client.post<never, ApiResponse<StoreData>>(ENDPOINTS.STORE.CREATE, payload);
}

/** POST /api/store/update-store */
export function apiUpdateStore(payload: UpdateStorePayload) {
  return client.post<never, ApiResponse<StoreData>>(ENDPOINTS.STORE.UPDATE, payload);
}

/** GET /api/store/getStoreById/:id */
export function apiGetStoreById(id: string) {
  return client.get<never, ApiResponse<StoreData>>(ENDPOINTS.STORE.GET_BY_ID(id));
}

export type CustomDomainStatus = 'unverified' | 'verified';

/** PATCH /api/store/:storeId/custom-domain */
export function apiSetCustomDomain(storeId: string, domain: string | null) {
  return client.patch<never, ApiResponse<{ customDomain: string | null; customDomainStatus: CustomDomainStatus; cnameTarget: string }>>(
    ENDPOINTS.STORE.CUSTOM_DOMAIN(storeId), { domain },
  );
}

/** POST /api/store/:storeId/custom-domain/verify — checks the domain's real
 *  DNS against our CNAME target; only a 'verified' result can ever serve as
 *  a live storefront (see `getPublicStoreByDomain` on the backend). */
export function apiVerifyCustomDomain(storeId: string) {
  return client.post<never, ApiResponse<{ customDomainStatus: CustomDomainStatus; verified: boolean; reason: string | null; cnameTarget: string }>>(
    ENDPOINTS.STORE.CUSTOM_DOMAIN_VERIFY(storeId), {},
  );
}

/** GET /api/store/public/resolve-domain?host=... — resolves a VERIFIED
 *  custom domain straight to the same shape `apiGetPublicStore` returns, so
 *  a request arriving on an arbitrary hostname can still load the right
 *  storefront (see `StorefrontLayout.tsx`). 404s for an unverified/unknown
 *  domain. */
export function apiResolveStoreByDomain(host: string) {
  return client.get<never, ApiResponse<PublicStoreData>>(ENDPOINTS.STORE.RESOLVE_DOMAIN, { params: { host } });
}

/** PATCH /api/store/:storeId/white-label */
export function apiSetWhiteLabel(storeId: string, enabled: boolean) {
  return client.patch<never, ApiResponse<{ whiteLabelEnabled: boolean }>>(ENDPOINTS.STORE.WHITE_LABEL(storeId), { enabled });
}

export type StoreAnnouncementType = 'info' | 'sale' | 'coupon' | 'warning' | 'shipping' | 'holiday';

export interface StoreAnnouncementBar {
  message:  string | null;
  type:     StoreAnnouncementType;
  ctaLabel: string | null;
  ctaLink:  string | null;
  isActive: boolean;
  startAt:  string | null;
  endAt:    string | null;
}

/** PATCH /api/store/:storeId/pinned-products */
export function apiUpdatePinnedProducts(storeId: string, productIds: string[]) {
  return client.patch<never, ApiResponse<{ pinnedProductIds: string[] }>>(ENDPOINTS.STORE.PINNED_PRODUCTS(storeId), { productIds });
}

/** PATCH /api/store/:storeId/announcement */
export function apiUpdateAnnouncementBar(storeId: string, payload: Partial<StoreAnnouncementBar>) {
  return client.patch<never, ApiResponse<StoreAnnouncementBar>>(ENDPOINTS.STORE.ANNOUNCEMENT(storeId), payload);
}

/** GET /api/store/my-stores */
export function apiGetMyStores() {
  return client.get<never, MyStoresResponse>(ENDPOINTS.STORE.MY_STORES);
}

// ── Builder ───────────────────────────────────────────────────────────────────

export interface SaveBuilderConfigPayload {
  storeId:       string;
  builderConfig: Record<string, unknown>;
  coverImage?:   string;
}

export interface BuilderConfigData {
  builderConfig: Record<string, unknown> | null;
  coverImage:    string | null;
  storeName:     string;
  description:   string;
}

/** POST /api/store/save-builder-config */
export function apiSaveBuilderConfig(payload: SaveBuilderConfigPayload) {
  return client.post<never, ApiResponse<StoreData>>(ENDPOINTS.STORE.SAVE_BUILDER_CONFIG, payload);
}

/** GET /api/store/builder-config/:storeId */
export function apiGetBuilderConfig(storeId: string) {
  return client.get<never, ApiResponse<BuilderConfigData>>(ENDPOINTS.STORE.GET_BUILDER_CONFIG(storeId));
}

// ── Public Storefront ─────────────────────────────────────────────────────────

export interface PublicStoreData {
  storeId:        string;
  sellerId:       string;
  name:           string;
  slug:           string;
  logo:           string | null;
  coverImage:     string | null;
  description:    string | null;
  tagline:        string | null;
  educatorProfile?: EducatorProfile | null;
  contactEmail:   string | null;
  contactPhone:   string | null;
  /** The store's single fixed root category — needed to resolve its own
   *  subcategory tree for `/category/:slugOrId` (`apiGetCategoryTree`). */
  categoryId:     string | null;
  followersCount: number;
  averageRating:  number;
  reviewCount:    number;
  builderConfig:  Record<string, unknown> | null;
  /** Every product in this storefront is priced in this currency (locked
   *  per store) — use this to convert listed prices to the buyer's chosen
   *  display currency. */
  baseCurrency:   SupportedCurrency;
  sellerType:     string | null;
  badges:         string[];
  createdAt:      string;
  activeCampaign: ActiveCampaignBadge | null;
  announcementBar: { message: string | null; type: StoreAnnouncementType; ctaLabel: string | null; ctaLink: string | null } | null;
}

export interface PublicStoreProductsParams {
  page?:         number;
  limit?:        number;
  sort?:         'newest' | 'price_asc' | 'price_desc' | 'best_rated';
  type?:         'all' | 'physical' | 'digital';
  categoryId?:   string;
  collectionId?: string;
  tag?:          string;
  search?:       string;
  onSale?:       boolean;
}

export interface PublicStoreProduct {
  _id:         string;
  slug:        string;
  name:        string;
  images?:     string[];
  type?:       'physical' | 'digital';
  productType?: 'physical' | 'digital' | 'educational';
  tags?:       string[];
  averageRating?: number;
  defaultVariantPrice: number | null;
  // Cheapest active variant's own id/stock/compare-at — needed to drive a
  // real Add-to-Cart/wishlist action via the shared ProductCard component.
  variantId?:          string | null;
  stock?:              number | null;
  compareAtPrice?:     number | null;
  // Present only when the requester has an active, discount-granting
  // subscription to this store — resolved server-side only.
  subscriberPrice?:    number;
  youSaveUSD?:         number;
  discountPercent?:    number;
  subscriberPlanName?: string;
  activeCampaign?:     ActiveCampaignBadge | null;
}

export interface PublicStoreProductsData {
  pagination: { page: number; limit: number; total: number; totalPages: number };
  products:   PublicStoreProduct[];
}

/** GET /api/store/public/:slug */
export function apiGetPublicStore(slug: string) {
  return client.get<never, ApiResponse<PublicStoreData>>(ENDPOINTS.STORE.PUBLIC_BY_SLUG(slug));
}

/** GET /api/store/public/:storeId/products */
export function apiGetPublicStoreProducts(storeId: string, params?: PublicStoreProductsParams) {
  const query = new URLSearchParams();
  if (params?.page)       query.set('page',       String(params.page));
  if (params?.limit)      query.set('limit',      String(params.limit));
  if (params?.sort)       query.set('sort',        params.sort);
  if (params?.type)       query.set('type',        params.type);
  if (params?.categoryId)   query.set('categoryId',   params.categoryId);
  if (params?.collectionId) query.set('collectionId', params.collectionId);
  if (params?.tag)          query.set('tag',          params.tag);
  if (params?.search)       query.set('search',       params.search);
  if (params?.onSale)       query.set('onSale',       'true');
  const qs = query.toString();
  return client.get<never, ApiResponse<PublicStoreProductsData>>(
    `${ENDPOINTS.STORE.PUBLIC_PRODUCTS(storeId)}${qs ? `?${qs}` : ''}`,
  );
}

/** GET /api/store/public/:storeId/filters */
export function apiGetPublicStoreFilters(storeId: string) {
  return client.get<never, ApiResponse<{ tags: string[]; categories: { id: string; name: string; slug: string; count: number }[] }>>(
    ENDPOINTS.STORE.PUBLIC_FILTERS(storeId),
  );
}

// ── Public store browse / discovery ────────────────────────────────────────────

export interface PublicStoreListItem {
  storeId:        string;
  name:           string;
  slug:           string;
  logo:           string | null;
  coverImage:     string | null;
  description:    string | null;
  categoryId:     string | null;
  followersCount: number;
  averageRating:  number;
  reviewCount:    number;
  sellerType:     SellerType | null;
  badges:         string[];
  productCount?:  number;
}

export interface ListPublicStoresParams {
  page?:       number;
  limit?:      number;
  categoryId?: string;
  q?:          string;
  sort?:       'rating' | 'followers' | 'newest';
}

export interface PublicStoresListData {
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stores:     PublicStoreListItem[];
}

/** GET /api/store/public — browse/search public stores. */
export function apiListPublicStores(params?: ListPublicStoresParams) {
  const query = new URLSearchParams();
  if (params?.page)       query.set('page',       String(params.page));
  if (params?.limit)      query.set('limit',      String(params.limit));
  if (params?.categoryId) query.set('categoryId', params.categoryId);
  if (params?.q)          query.set('q',          params.q);
  if (params?.sort)       query.set('sort',       params.sort);
  const qs = query.toString();
  return client.get<never, ApiResponse<PublicStoresListData>>(
    `${ENDPOINTS.STORE.PUBLIC_LIST}${qs ? `?${qs}` : ''}`,
  );
}

/** GET /api/store/public/top — cached top-stores row (home screen). */
export function apiGetTopStores(limit = 10) {
  return client.get<never, ApiResponse<{ stores: PublicStoreListItem[] }>>(
    `${ENDPOINTS.STORE.PUBLIC_TOP}?limit=${limit}`,
  );
}

export interface PlatformStats {
  storesCount:  number;
  sellersCount: number;
  buyersCount:  number;
  gmv:          number;
  avgRating:    number;
  ratingCount:  number;
}

/** GET /api/store/public/platform-stats — real, cached homepage stat strip. */
export function apiGetPlatformStats() {
  return client.get<never, ApiResponse<PlatformStats>>(ENDPOINTS.STORE.PUBLIC_PLATFORM_STATS);
}

// ── Follow ────────────────────────────────────────────────────────────────────

export interface FollowStatusData {
  following: boolean;
}

export interface FollowerUser {
  _id:          string;
  name:         string;
  email?:       string;
  profileImage?: string;
}

export interface FollowersData {
  total:      number;
  pagination: { page: number; limit: number; totalPages: number };
  followers:  Array<{ followedAt: string; user: FollowerUser }>;
}

/** POST /api/store/:storeId/follow  (toggle follow/unfollow) */
export function apiFollowStore(storeId: string) {
  return client.post<never, ApiResponse<{ following: boolean }>>(ENDPOINTS.STORE.FOLLOW(storeId));
}

/** GET /api/store/:storeId/follow-status */
export function apiGetFollowStatus(storeId: string) {
  return client.get<never, ApiResponse<FollowStatusData>>(ENDPOINTS.STORE.FOLLOW_STATUS(storeId));
}

/** GET /api/store/:storeId/followers  (seller only) */
export function apiGetStoreFollowers(storeId: string, page = 1, limit = 20) {
  return client.get<never, ApiResponse<FollowersData>>(
    `${ENDPOINTS.STORE.FOLLOWERS(storeId)}?page=${page}&limit=${limit}`,
  );
}

// ── Customers (staff-facing) ──────────────────────────────────────────────────

export interface StoreCustomer {
  _id:         string;
  name:        string;
  email:       string;
  phone:       string;
  createdAt:   string | null;
  orderCount:  number;
  totalSpent:  number;
  lastOrderAt: string | null;
}

export interface UpdateStoreCustomerPayload {
  name?:  string;
  phone?: string;
  email?: string;
}

interface PaginatedCustomers {
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary:    { totalOrders: number; totalRevenue: number };
  customers:  StoreCustomer[];
}

/** GET /api/store/:storeId/customers  (seller only). `q` = case-insensitive name/email search. */
export function apiGetStoreCustomers(storeId: string, page = 1, limit = 20, q = '') {
  const search = q.trim() ? `&q=${encodeURIComponent(q.trim())}` : '';
  return client.get<never, ApiResponse<PaginatedCustomers>>(
    `${ENDPOINTS.STORE.CUSTOMERS.LIST(storeId)}?page=${page}&limit=${limit}${search}`,
  );
}

/** PATCH /api/store/:storeId/customers/:customerId  (seller only) */
export function apiUpdateStoreCustomer(storeId: string, customerId: string, payload: UpdateStoreCustomerPayload) {
  return client.patch<never, ApiResponse<StoreCustomer>>(
    ENDPOINTS.STORE.CUSTOMERS.UPDATE(storeId, customerId), payload,
  );
}
