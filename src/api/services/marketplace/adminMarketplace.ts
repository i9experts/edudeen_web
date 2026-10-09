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
  categoryId: string;
  price: number | null;
  purchaseCount: number;
  status: string;
  isFeatured: boolean;
  /** The reviewer's note (set when a listing was sent back). */
  reviewNote?: string | null;
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
  status: string;
  scheduledAt: string | null;
  reviewNote: string | null;
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
  /** Omit for the default pending/under_review review queue; `'all'` removes
   *  the status filter entirely so every lead (verified/rejected/not_started
   *  included) shows up. */
  verificationStatus?: LeadVerificationStatus | 'all';
  page?: number;
  limit?: number;
}

export type LeadVerificationStatus = 'not_started' | 'pending' | 'under_review' | 'verified' | 'rejected';
export type LeadVerificationLevel = 'basic' | 'business' | 'enhanced';

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
  /** Marketplace listing lifecycle — independent of verificationStatus below. */
  storeStatus: string;
  country: string;
  businessType: string | null;
  verificationLevel: LeadVerificationLevel | null;
  verificationStatus: LeadVerificationStatus;
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

export interface LeadDocumentView {
  type: string;
  required: boolean;
  state: 'missing' | 'uploaded' | 'not_required';
  fileName: string | null;
  uploadedAt: string | null;
  viewUrl: string | null;
}

export interface LeadHistoryEntry {
  action: string;
  note: string | null;
  actorId: string | null;
  actorRole: 'seller' | 'admin';
  at: string;
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
  businessType: string | null;
  verificationLevel: LeadVerificationLevel;
  verificationStatus: LeadVerificationStatus;
  legalBusinessName: string | null;
  registrationNumber: string | null;
  taxId: string | null;
  businessAddress: string | null;
  idDocumentType: string | null;
  authorizedContact: { name: string | null; designation: string | null; email: string | null; phone: string | null } | null;
  documents: LeadDocumentView[];
  missingFields: string[];
  missingDocuments: string[];
  /** True only when every required field/document is satisfied — mirrors
   *  the backend's own gate, so the UI can disable Approve for exactly the
   *  same reason the server would reject it. */
  canApprove: boolean;
  history: LeadHistoryEntry[];
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

export function apiRemoveListing(id: string) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.MARKETPLACE.ADMIN.REMOVE(id));
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

export function apiGetLeads(query: LeadsQuery = {}) {
  return client.get<never, ApiResponse<LeadsData>>(ENDPOINTS.MARKETPLACE.ADMIN.LEADS, { params: query });
}

export function apiGetLeadDetail(id: string) {
  return client.get<never, ApiResponse<LeadDetail>>(ENDPOINTS.MARKETPLACE.ADMIN.LEAD_DETAIL(id));
}

export function apiMarkLeadUnderReview(id: string) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.MARKETPLACE.ADMIN.LEAD_UNDER_REVIEW(id));
}

export function apiApproveLead(id: string) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.MARKETPLACE.ADMIN.APPROVE_LEAD(id));
}

/** `reason` is mandatory — the backend rejects the request without one. */
export function apiRejectLead(id: string, reason: string) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.MARKETPLACE.ADMIN.REJECT_LEAD(id), { reason });
}
