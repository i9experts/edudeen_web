import client from '../client';
import { cachedRequest, invalidateCache } from './requestCache';
import { ENDPOINTS } from '../endpoints';
import type { ActiveCampaignBadge } from './marketplace';
import type { StoreReturnPolicy, StoreResponseStats, StoreTrust } from '@/utils/sellerTrust';

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
export interface StorePremiumDiscount { enabled: boolean; percent: number }
export interface StoreDeliverySettings { enabled: boolean; fee: number; freeOverAmount: number | null }
export interface StoreGiftWrap { enabled: boolean; fee: number }
export interface StoreShipFrom { city: string; province?: string | null }
/** How the store delivers: own flat fee, one Edudeen courier, or the cheapest available courier. null = platform default. */
export type StoreDeliveryMethod = 'self' | 'tcs' | 'leopards' | 'postex' | 'auto';

export interface UpdateStorePayload {
  storeId:      string;
  name?:        string;
  logo?:        string;
  coverImage?:  string | null;
  categoryId?:  string;
  description?: string;
  tagline?:      string;
  educatorProfile?: EducatorProfile | null;
  returnPolicy?: StoreReturnPolicy | null;
  /** About-tab text (max 1500); null/'' clears it. */
  aboutBio?: string | null;
  /** Seller-funded Edudeen Premium member discount; null clears it. */
  premiumDiscount?: StorePremiumDiscount | null;
  /** Seller's own delivery charge (store currency); null/disabled = platform zone fee. */
  deliverySettings?: StoreDeliverySettings | null;
  /** Gift wrap charge (store currency); null = free. */
  giftWrap?: StoreGiftWrap | null;
  /** Dispatch city (+ province) used to classify delivery routes; null clears. */
  shipFrom?: StoreShipFrom | null;
  /** Working days (1-7, Sundays not counted) to mark a physical package shipped. Missing = 2. */
  dispatchDays?: number;
  deliveryMethod?: StoreDeliveryMethod | null;
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
  returnPolicy?: StoreReturnPolicy | null;
  aboutBio?: string | null;
  premiumDiscount?: StorePremiumDiscount | null;
  deliverySettings?: StoreDeliverySettings | null;
  giftWrap?: StoreGiftWrap | null;
  shipFrom?: StoreShipFrom | null;
  /** Working days (1-7, Sundays not counted) to mark a physical package shipped. Missing = 2. */
  dispatchDays?: number;
  deliveryMethod?: StoreDeliveryMethod | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sellerType:   SellerType;
  productTypes: ProductType[];
  baseCurrency: SupportedCurrency;
  /** Per-seller Cash-on-Delivery opt-out — defaults to true. Not yet enforced
   *  by checkout (a multi-vendor cart's COD eligibility isn't scoped per
   *  seller there yet); this only persists the seller's preference so far. */
  codEnabled:   boolean;
  /** Who ships physical orders — 'platform' is granted by Edudeen admin only. */
  fulfillmentMode?: 'seller' | 'platform';
  enabledTools: string[];
  plan:         string;
  aiCredits:    number;
  customDomain: string | null;
  customDomainStatus: 'unverified' | 'verified';
  whiteLabelEnabled: boolean;
  /** Marketplace listing lifecycle — (see store.schema.ts). Only `'active'` unlocks product creation
   *  and public storefront/marketplace visibility. */
  status:       'pending' | 'active' | 'rejected' | 'suspended';
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
  invalidateCache('store:');
  return client.post<never, ApiResponse<StoreData>>(ENDPOINTS.STORE.UPDATE, payload).finally(() => invalidateCache('store:'));
}

/** GET /api/store/getStoreById/:id */
export function apiGetStoreById(id: string) {
  return cachedRequest(`store:${id}`,10_000, () => client.get<never, ApiResponse<StoreData>>(ENDPOINTS.STORE.GET_BY_ID(id)));
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
  returnPolicy?:  StoreReturnPolicy | null;
  responseStats?: StoreResponseStats | null;
  /** Cached response rate / dispatch on time / city; numbers are null below the minimum sample. */
  trust?:         StoreTrust | null;
  /** Seller's About text (max 1500). */
  aboutBio?:      string | null;
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
  /** Buyer-facing kind: physical | digital downloads | online course. */
  kind?:         'physical' | 'digital' | 'course';
  categoryId?:   string;
  collectionId?: string;
  tag?:          string;
  search?:       string;
  onSale?:       boolean;
  /** In-store catalog filters (all optional). `min`/`max` are in the STORE's currency. */
  q?:            string;
  class?:        string;
  subject?:      string;
  min?:          number;
  max?:          number;
}

export interface StoreCatalogFacets {
  total: number;
  classes:  { value: string; label: string; count: number }[];
  subjects: { id: string; name: string; slug: string; count: number }[];
  kinds:    { physical: number; digital: number; course: number };
  price:    { min: number; max: number; currency: string | null } | null;
  collections: { id: string; name: string; nameUr?: string | null; slug: string; count: number }[];
}

export interface PublicStoreProduct {
  _id:         string;
  slug:        string;
  name:        string;
  images?:     string[];
  type?:       'physical' | 'digital';
  productType?: 'physical' | 'digital';
  tags?:       string[];
  averageRating?: number;
  /** Review count (denormalized on the product); the star line shows only when >= 1. */
  totalRatings?: number;
  classFrom?:    string | null;
  classTo?:      string | null;
  /** Shaped variants (price, campaignPrice, compareAtPrice, currency) - the same source the cart prices from. */
  variants?:     Array<{ _id: string; price: number; compareAtPrice?: number | null; campaignPrice?: number | null; currency?: string | null; isDefault?: boolean }>;
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
  campaignPrice?:      number;
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
  if (params?.kind)         query.set('kind',         params.kind);
  if (params?.categoryId)   query.set('categoryId',   params.categoryId);
  if (params?.collectionId) query.set('collectionId', params.collectionId);
  if (params?.tag)         query.set('tag',          params.tag);
  if (params?.search)       query.set('search',       params.search);
  if (params?.onSale)       query.set('onSale',       'true');
  if (params?.q)            query.set('q',            params.q);
  if (params?.class)        query.set('class',        params.class);
  if (params?.subject)      query.set('subject',      params.subject);
  if (params?.min != null)  query.set('min',          String(params.min));
  if (params?.max != null)  query.set('max',          String(params.max));
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

export function apiGetStoreCatalogFacets(storeId: string) {
  return client.get<never, ApiResponse<StoreCatalogFacets>>(ENDPOINTS.STORE.PUBLIC_CATALOG_FACETS(storeId));
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
  /** Home Featured sellers rail only: best-selling products (up to 3) with a photo. */
  topProducts?:   Array<{ id: string; name: string; image: string; coverStyle: 'book' | 'flat' | null }>;
  soldCount?:     number;
  categoryName?:  string | null;
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
  /** Published, non-test listings (older API builds do not send it). */
  productsCount?: number;
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
  _id:            string;
  name:           string;
  /** Masked by the server (s***5@gmail.com). */
  email:          string;
  /** Masked by the server (+92 3** ***0161). */
  phone:          string;
  createdAt:      string | null;
  orderCount:     number;
  totalSpent:     number;
  freeOrderCount: number;
  lastOrderAt:    string | null;
}

export type CustomerSortKey = 'orderCount' | 'totalSpent' | 'lastOrderAt' | 'createdAt';

interface PaginatedCustomers {
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary:    { totalOrders: number; totalRevenue: number };
  customers:  StoreCustomer[];
}

/** GET /api/store/:storeId/customers  (seller only). `q` = name / e-mail / phone search; sorted on the server before paging. */
export function apiGetStoreCustomers(
  storeId: string, page = 1, limit = 20, q = '',
  sort: CustomerSortKey = 'lastOrderAt', order: 'asc' | 'desc' = 'desc',
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), sort, order });
  if (q.trim()) params.set('q', q.trim());
  return client.get<never, ApiResponse<PaginatedCustomers>>(`${ENDPOINTS.STORE.CUSTOMERS.LIST(storeId)}?${params.toString()}`);
}

export interface CustomerRecentOrder {
  orderId:     string;
  orderNumber: string;
  itemCount:   number;
  amount:      number;
  isFree:      boolean;
  isFreeClaim: boolean;
  status:      string;
  createdAt:   string;
}

export interface StoreCustomerDetail {
  _id:            string;
  name:           string;
  email:          string;
  phone:          string;
  createdAt:      string | null;
  orderCount:     number;
  totalSpent:     number;
  freeOrderCount: number;
  firstOrderAt:   string | null;
  lastOrderAt:    string | null;
  isRepeat:       boolean;
  /** Existing chat thread between this buyer and the store, or null when the buyer never wrote. */
  conversationId: string | null;
  recentOrders:   CustomerRecentOrder[];
  note:           { note: string; tags: string[] };
}

/** GET /api/store/:storeId/customers/:customerId  (seller only, read-only, masked contact). */
export function apiGetStoreCustomerDetail(storeId: string, customerId: string) {
  return client.get<never, ApiResponse<StoreCustomerDetail>>(ENDPOINTS.STORE.CUSTOMERS.DETAIL(storeId, customerId));
}

/** PUT /api/store/:storeId/customers/:customerId/note  (seller-private note + tags). */
export function apiSaveStoreCustomerNote(storeId: string, customerId: string, payload: { note: string; tags: string[] }) {
  return client.put<never, ApiResponse<{ note: string; tags: string[] }>>(ENDPOINTS.STORE.CUSTOMERS.NOTE(storeId, customerId), payload);
}
