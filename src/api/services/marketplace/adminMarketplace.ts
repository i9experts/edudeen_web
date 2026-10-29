import client from '../../client';
import { ENDPOINTS } from '../../endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface MarketplaceStats {
  totalListings: number;
  active: number;
  flagged: number;
  gmvThisMonth: number;
  gmvByCurrency?: { currency: string; gmv: number }[];
}

export type ListingStatus = 'active' | 'inactive' | 'draft' | 'scheduled' | 'pending_review' | 'rejected' | 'flagged';

export interface MarketplaceListingQuery {
  search?: string;
  categoryId?: string;
  status?: ListingStatus;
  page?: number;
  limit?: number;
}

export interface MarketplaceListingRow {
  id: string;
  title: string;
  sellerId: string;
  sellerName: string;
  storeId: string;
  storeBadges: string[];
  /** Who ships this store's physical orders: the seller (default) or Edudeen (admin-granted). */
  storeFulfillmentMode?: 'seller' | 'platform';
  categoryId: string;
  price: number | null;
  /** Currency of `price` (the store's own currency). */
  currency?: string;
  purchaseCount: number;
  status: string;
  isFeatured: boolean;
  /** QA test listing - hidden from every public page while true. */
  isTest?: boolean;
  /** The reviewer's note (set when a listing was sent back). */
  reviewNote?: string | null;
  /** A seller edit to this live listing is waiting for approval. */
  hasPendingEdit?: boolean;
  /** Server review flags, e.g. 'contact_info'. */
  flags?: string[];
  /** The matched phone / email / WhatsApp text behind a contact_info flag. */
  contactMatches?: string[];
  createdAt?: string;
}

/** Admin-assigned trust badges on a listing. */
export interface TrustBadges {
  scholarReviewed: boolean;
  ageAppropriateMin: number | null;
  ageAppropriateMax: number | null;
}

/** PATCH /api/admin/marketplace/listings/:id/trust: omitted fields are kept, null clears an age. */
export function apiSetListingTrustBadges(id: string, input: Partial<TrustBadges>) {
  return client.patch<never, { success: boolean; message: string; data: TrustBadges }>(`/api/admin/marketplace/listings/${id}/trust`, input);
}

/** Everything the listing-review screen shows. */
export interface ListingReview {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  tags: string[];
  type: 'physical' | 'digital';
  productType: 'physical' | 'digital' | 'educational';
  educationLevel: string | null;
  customLevel: string | null;
  classFrom?: string | null;
  classTo?: string | null;
  /** download | course | live_class (missing = download). */
  deliveryFormat?: 'download' | 'course' | 'live_class';
  liveSession?: { startsAt?: string; durationMinutes?: number; platform?: string; capacity?: number | null; notes?: string; meetingUrl?: string; registrationDeadline?: string | null; status?: string } | null;
  course?: {
    lessonCount: number; totalMinutes: number; outcomes?: string[]; instructor?: { name: string; bio: string } | null;
    sections: { title: string; lessons: { title: string; type: string; minutes: number | null; isPreview: boolean }[] }[];
  } | null;
  /** Seller edit waiting for approval: the fields above are still the LIVE version. */
  pendingEdit?: {
    submittedAt: string;
    diff: { key: string; label: string; kind: 'text' | 'images' | 'files'; before: unknown; after: unknown }[];
  } | null;
  status: string;
  scheduledAt: string | null;
  reviewNote: string | null;
  flags?: string[];
  contactMatches?: string[];
  flagReason?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  trust?: TrustBadges | null;
  createdAt: string;
  updatedAt: string;
  category: string | null;
  subCategory: string | null;
  seller: { id: string; name: string; email: string } | null;
  store: { id: string; name: string; slug: string; status: string; badges: string[] } | null;
  variants: { id: string; price: number; compareAtPrice: number | null; currency: string; options: { name: string; value: string }[]; stock: number; isDefault: boolean }[];
  digital: {
    licenseType: string; downloadLimit: string; pdfStampingEnabled: boolean;
    files: { name: string; size: number; mimeType: string; viewUrl: string }[];
  } | null;
}

export type GrantableStoreBadge = 'verified' | 'top_seller' | 'verified_educator';

export interface MarketplaceListingsData {
  items: MarketplaceListingRow[];
  total: number;
  page: number;
  limit: number;
}

// ── Leads (new-store approval queue) ────────────────────────────────────────
export interface LeadsQuery {
  search?: string;
  /** Store status (default: pending). 'all' removes the filter. */
  status?: 'pending' | 'active' | 'rejected' | 'suspended' | 'all';
  page?: number;
  limit?: number;
}

export interface LeadRow {
  id: string;
  storeName: string;
  logo: string | null;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  sellerType: string | null;
  productTypes: string[];
  baseCurrency: string | null;
  submittedAt: string;
  storeStatus: string;
  country: string;
  seller: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
}

export interface LeadsData {
  items: LeadRow[];
  total: number;
  page: number;
  limit: number;
}

export interface LeadDetail {
  id: string;
  storeName: string;
  logo: string | null;
  description: string | null;
  categoryName: string | null;
  sellerType: string | null;
  productTypes: string[];
  storeStatus: string;
  rejectionReason: string | null;
  submittedAt: string;
  seller: { id: string; name: string; email: string | null; phone: string | null; address: string | null };
  country: string;
  canApprove: boolean;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetMarketplaceStats() {
  return client.get<never, ApiResponse<MarketplaceStats>>(ENDPOINTS.MARKETPLACE.ADMIN.STATS);
}

export function apiGetMarketplaceListings(query: MarketplaceListingQuery = {}) {
  return client.get<never, ApiResponse<MarketplaceListingsData>>(ENDPOINTS.MARKETPLACE.ADMIN.LISTINGS, { params: query });
}

export function apiSetListingFeatured(id: string, isFeatured: boolean) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.MARKETPLACE.ADMIN.FEATURE(id), { isFeatured });
}

/** Mark / unmark a listing as a QA test listing (hidden from the public while marked). */
export function apiSetListingTest(id: string, isTest: boolean) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.MARKETPLACE.ADMIN.TEST(id), { isTest });
}

export function apiRemoveListing(id: string, reason: string) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.MARKETPLACE.ADMIN.REMOVE(id), { reason });
}

// ── Listing review (new listings wait for approval before going live) ───────
const REVIEW_BASE = '/api/admin/marketplace/listings';

export function apiGetListingReviewCount() {
  return client.get<never, ApiResponse<{ pending: number }>>(`${REVIEW_BASE}/review/count`);
}

export function apiGetListingForReview(id: string) {
  return client.get<never, ApiResponse<ListingReview>>(`${REVIEW_BASE}/${id}/review`);
}

export function apiApproveListing(id: string, note?: string) {
  return client.patch<never, ApiResponse<{ status: string }>>(`${REVIEW_BASE}/${id}/approve`, note ? { note } : {});
}

/** `reason` (10+ characters) is shown to the seller. */
export function apiRejectListing(id: string, reason: string) {
  return client.patch<never, ApiResponse<{ status: string }>>(`${REVIEW_BASE}/${id}/reject`, { reason });
}

/** PATCH /api/admin/marketplace/stores/:id/badge — grants/revokes a store trust badge (e.g. 'verified_educator'). */
export function apiSetStoreBadge(storeId: string, badge: GrantableStoreBadge, grant: boolean) {
  return client.patch<never, ApiResponse<{ badges: string[] }>>(
    ENDPOINTS.MARKETPLACE.ADMIN.SET_STORE_BADGE(storeId), { badge, grant },
  );
}

export interface FeaturedStoreRow {
  storeId: string; name: string; slug: string; logo: string | null;
  score: number; featuredRank: number | null; qualityOk: boolean;
  publishedProducts: number; soldCount: number; averageRating: number; reviewCount: number; followersCount: number;
}

/** GET /api/admin/marketplace/stores/featured — active stores ordered like the home Featured sellers rail. */
export function apiGetFeaturedStores() {
  return client.get<never, ApiResponse<{ stores: FeaturedStoreRow[] }>>(ENDPOINTS.MARKETPLACE.ADMIN.FEATURED_STORES);
}

/** PATCH /api/admin/marketplace/stores/:id/featured — rank 1 = first on the rail, null = unpin. */
export function apiSetStoreFeaturedRank(storeId: string, rank: number | null) {
  return client.patch<never, ApiResponse<{ featuredRank: number | null }>>(
    ENDPOINTS.MARKETPLACE.ADMIN.SET_STORE_FEATURED(storeId), { rank },
  );
}

/** PATCH /api/admin/marketplace/stores/:id/fulfillment-mode — new orders only. */
export function apiSetStoreFulfillmentMode(storeId: string, fulfillmentMode: 'seller' | 'platform') {
  return client.patch<never, ApiResponse<{ fulfillmentMode: string }>>(
    ENDPOINTS.MARKETPLACE.ADMIN.SET_STORE_FULFILLMENT(storeId), { fulfillmentMode },
  );
}

export function apiGetLeads(query: LeadsQuery = {}) {
  return client.get<never, ApiResponse<LeadsData>>(ENDPOINTS.MARKETPLACE.ADMIN.LEADS, { params: query });
}

export function apiGetLeadDetail(id: string) {
  return client.get<never, ApiResponse<LeadDetail>>(ENDPOINTS.MARKETPLACE.ADMIN.LEAD_DETAIL(id));
}

export function apiApproveLead(id: string) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.MARKETPLACE.ADMIN.APPROVE_LEAD(id));
}

/** `reason` is mandatory — the backend rejects the request without one. */
export function apiRejectLead(id: string, reason: string) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.MARKETPLACE.ADMIN.REJECT_LEAD(id), { reason });
}
