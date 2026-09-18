import client from '../client';
import { ENDPOINTS } from '../endpoints';
import type { VariantOption } from './product';

export type { VariantOption };

export interface ProductVariant {
  _id:            string;
  productId:      string;
  sku:            string;
  price:          number;
  /** The currency `price`/`compareAtPrice` are denominated in — the owning
   *  store's own Store.baseCurrency. */
  currency?:      'PKR' | 'USD' | null;
  compareAtPrice: number | null;
  options:        VariantOption[];
  stock:          number;
  unlimitedStock?: boolean;
  shippingWeight: string | null;
  images:         string[];
  isDefault?:     boolean;
  status:         string;
  isDelete:       boolean;
  createdAt:      string;
  updatedAt:      string;
  // Present only when the requester has an active, discount-granting
  // subscription to this product's store — resolved server-side only.
  // The product itself is never hidden or gated; this is purely a price
  // annotation shown alongside the regular price.
  subscriberPrice?:    number;
  youSaveUSD?:         number;
  discountPercent?:    number;
  subscriberPlanName?: string;
  minOrderValueUSD?:   number | null;
}

export interface DigitalProduct {
  files:                 { url: string; name: string; size: number; mimeType: string }[];
  downloadLimit:         string;
  linkExpiryDays:        number;
  pdfStampingEnabled:    boolean;
  licenseType:           string;
  buyerDeliveryMessage:  string;
  previewAvailable?:     boolean;
}

export type ProductPreviewData =
  | { type: 'pdf';   pages: string[]; expiresAt: number }
  | { type: 'image'; url: string;     expiresAt: number }
  | { type: 'video'; url: string;     expiresAt: number }
  | { type: 'audio'; url: string;     expiresAt: number };

// A product's store can be opted into more than one platform sale campaign,
// but the backend already resolves that down to the single best-for-buyer
// one (see MarketingService.pickPrimaryCampaignForBadge) — the frontend just
// renders whatever it's given, never picks among candidates itself.
export interface ActiveCampaignBadge {
  campaignId:    string;
  name:          string;
  discountType:  'percentage' | 'fixed' | null;
  discountValue: number | null;
  /** Only meaningful when discountType === 'fixed' — always 'USD' (the platform pivot). */
  currency:      string | null;
  endDate:       string;
}

export interface MarketplaceProduct {
  _id:               string;
  name:              string;
  sellerId:          string;
  storeId?:          string;
  storeSlug?:        string | null;
  slug:              string;
  description:       string;
  productType?:      'physical' | 'digital' | 'educational';
  type?:             'physical' | 'digital';
  categoryId:        string;
  subCategoryId?:    string | null;
  educationLevel?:   string | null;
  customLevel?:      string | null;
  normalizedCustomLevel?: string | null;
  images:            string[];
  tags?:             string[];
  digital?:          DigitalProduct | null;
  viewCount:         number;
  wishlistCount:     number;
  purchaseCount:     number;
  averageRating:     number;
  ratingSum?:        number;
  totalRatings?:     number;
  lastWishlistedAt:  string | null;
  status:            string;
  isListedOnEdudeen?: boolean;
  isDelete:          boolean;
  createdAt:         string;
  updatedAt:         string;
  variants:          ProductVariant[];
  sellerName?:       string;
  sellerVerified?:   boolean;
  activeCampaign?:   ActiveCampaignBadge | null;
}

export interface ProductsByCategoryResponse {
  message: string;
  success: boolean;
  data: {
    total:    number;
    page:     number | string;
    limit:    number | string;
    products: MarketplaceProduct[];
  };
}

interface ProductByIdResponse {
  message: string;
  success: boolean;
  data: {
    product:        MarketplaceProduct & { sellerName: string };
    variants:       ProductVariant[];
    defaultVariant: ProductVariant;
  };
}

export type MarketplaceSortBy = 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popularity';

export function apiGetAllProducts(
  page = 1, limit = 10, categoryId?: string,
  productType?: 'physical' | 'digital' | 'educational',
  educationLevel?: string, normalizedCustomLevel?: string,
  campaignId?: string,
  minPrice?: number, maxPrice?: number, minRating?: number, sortBy?: MarketplaceSortBy,
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (categoryId) params.set('id', categoryId);
  if (productType) params.set('productType', productType);
  if (educationLevel) params.set('educationLevel', educationLevel);
  if (normalizedCustomLevel) params.set('normalizedCustomLevel', normalizedCustomLevel);
  if (campaignId) params.set('campaignId', campaignId);
  if (minPrice != null) params.set('minPrice', String(minPrice));
  if (maxPrice != null) params.set('maxPrice', String(maxPrice));
  if (minRating != null) params.set('minRating', String(minRating));
  if (sortBy) params.set('sortBy', sortBy);
  return client.get<never, ProductsByCategoryResponse>(
    `${ENDPOINTS.MARKETPLACE.PRODUCTS_BY_CATEGORY}?${params.toString()}`,
  );
}

export interface EducationFacetLevel { level: string; count: number }
export interface EducationFacetOtherLevel { slug: string; displayName: string; count: number }
interface EducationFacetsResponse {
  success: boolean;
  data: { levels: EducationFacetLevel[]; otherLevels: EducationFacetOtherLevel[] };
}

/** GET /api/products/education/facets — public; backs the Education marketplace's dynamic filter chips. */
export function apiGetEducationFacets() {
  return client.get<never, EducationFacetsResponse>(ENDPOINTS.PRODUCT.EDUCATION_FACETS);
}

interface WorksheetTrialPayload {
  subject: string;
  gradeLevel: string;
  topics: string[];
  questionCount: number;
  includeAnswerKey: boolean;
}

interface WorksheetTrialResponse {
  success: boolean;
  data: {
    title: string;
    sections: { instructions: string; questions: { prompt: string; type: string; choices?: string[]; answer?: string }[] }[];
    provider: string;
  };
}

/** POST /api/public/worksheet-builder/try-free — public, unauthenticated, rate-limited (3/hr/IP). */
export function apiGenerateWorksheetTrial(payload: WorksheetTrialPayload) {
  return client.post<never, WorksheetTrialResponse>(
    ENDPOINTS.AI_STUDIO_PUBLIC.WORKSHEET_TRY_FREE, payload,
  );
}

export function apiGetProductById(id: string) {
  return client.get<never, ProductByIdResponse>(
    ENDPOINTS.MARKETPLACE.PRODUCT_BY_ID(id),
  );
}

/** GET /api/products/preview/:id — watermarked/trimmed preview of a digital product, never the original file. */
export function apiGetProductPreview(id: string) {
  return client.get<never, { success: boolean; data: ProductPreviewData }>(
    ENDPOINTS.MARKETPLACE.PRODUCT_PREVIEW(id),
  );
}
