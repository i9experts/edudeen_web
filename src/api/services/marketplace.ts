import client from '../client';
import { ENDPOINTS } from '../endpoints';
import type { VariantOption } from './product';
import { cachedRequest } from './requestCache';

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
  /** Edudeen Premium members only: the member price (in this variant's currency) and the seller's percent. */
  premiumPrice?:           number;
  /** Combined Premium percent (seller + Edudeen); the parts are below. */
  premiumDiscountPercent?: number;
  premiumSellerPercent?:   number;
  premiumPlatformPercent?: number;
  /** The original (list) price to strike through for a member: compare-at when the seller runs a normal sale, else the price. */
  listPrice?:              number;
  /** A running platform sale on THIS variant (server-computed from the list price, only when cheaper than the price): what the buyer pays. */
  campaignPrice?:          number;
  campaignListPrice?:      number;
  campaignId?:             string;
}

export interface DigitalProduct {
  files:                 { url: string; name: string; size: number; mimeType: string }[];
  downloadLimit:         string;
  linkExpiryDays:        number;
  pdfStampingEnabled:    boolean;
  licenseType:           string;
  buyerDeliveryMessage:  string;
  previewAvailable?:     boolean;
  /** Public views strip `files` and send only how many there are. */
  fileCount?:            number;
  /** Upper-case file extensions of the deliverable (PDF, DOCX, MP4...) — public views only. */
  fileFormats?:          string[];
  /** Total PDF pages across the files, when known. */
  pageCount?:            number | null;
  /** A free sample exists — fetch it with apiGetProductSample. */
  sampleAvailable?:      boolean;
  sampleName?:           string | null;
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
  /** Edudeen Premium members only: the sale has not started for the public yet. */
  earlyAccess?:  boolean;
  startDate?:    string | null;
}

export interface MarketplaceProduct {
  _id:               string;
  name:              string;
  /** Admin-picked "Featured by Edudeen" listing. */
  isFeatured?:       boolean;
  sellerId:          string;
  storeId?:          string;
  storeSlug?:        string | null;
  slug:              string;
  description:       string;
  /** Urdu copy (AI-translated and seller-reviewed); shown when the visitor browses in Urdu. */
  nameUr?:           string | null;
  descriptionUr?:    string | null;
  productType?:      'physical' | 'digital' | 'educational';
  type?:             'physical' | 'digital';
  categoryId:        string;
  subCategoryId?:    string | null;
  educationLevel?:   string | null;
  customLevel?:      string | null;
  normalizedCustomLevel?: string | null;
  images:            string[];
  tags?:             string[];
  /** Exam boards it follows — see constants/learning.ts. */
  curricula?:        string[];
  /** Admin-assigned trust badges (listing review). */
  trust?:            { scholarReviewed: boolean; ageAppropriateMin: number | null; ageAppropriateMax: number | null } | null;
  ageMin?:           number | null;
  ageMax?:           number | null;
  /** Optional class range (constants/classLevels.ts values). */
  classFrom?:        string | null;
  classTo?:          string | null;
  /** 'flat' = plain photo card (toys etc.); anything else = book-cover look. */
  coverStyle?:       'book' | 'flat' | null;
  deliveryFormat?:   'download' | 'course' | 'live_class';
  /** Live classes only — the meeting link is never public. */
  liveSession?:      { startsAt: string; durationMinutes: number; platform: string; capacity: number | null; notes: string; registrationDeadline?: string | null; status?: 'scheduled' | 'cancelled' } | null;
  /** Online courses: lesson count and total minutes. */
  courseSummary?:    { lessonCount: number; totalMinutes: number } | null;
  digital?:          DigitalProduct | null;
  viewCount:         number;
  wishlistCount:     number;
  purchaseCount:     number;
  averageRating:     number;
  /** Only present for a signed-in buyer: may they review this product / already did. */
  canReview?:        boolean;
  hasReviewed?:      boolean;
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
  /** TODO(owner): list endpoints don't return the store name yet (only product detail does); cards fall back to sellerName until they do. */
  storeName?:        string | null;
  storeLogo?:        string | null;
  sellerVerified?:   boolean;
  activeCampaign?:   ActiveCampaignBadge | null;
  /** Lowest sale price across variants when a platform sale really discounts this product. */
  campaignPrice?:    number;
  /** Edudeen Premium teaser: percent the seller gives members (0/absent = none). */
  premiumPercent?:   number;
  /** Breakdown of premiumPercent: the seller's part and the Edudeen-funded part. */
  premiumSellerPercent?:   number;
  premiumPlatformPercent?: number;
}

export interface ProductsByCategoryResponse {
  message: string;
  success: boolean;
  /** Typo tolerance: the search found nothing for `originalQuery`, so these are results for `correctedQuery`. */
  correctedQuery?: string;
  originalQuery?: string;
  /** Few/no results: a likely spelling the buyer may have meant. */
  didYouMean?: string;
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
  format?: 'course' | 'live_class',
) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (format) params.set('format', format);
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

/** Everything the marketplace browse endpoint can filter on, as named fields. */
export interface BrowseParams {
  /** Skip typo correction ("Search instead for …"). */
  exact?:         boolean;
  q?:             string;
  categoryId?:    string;
  productType?:   'physical' | 'digital' | 'educational';
  educationLevel?: string;
  campaignId?:    string;
  minPrice?:      number;
  maxPrice?:      number;
  minRating?:     number;
  sortBy?:        MarketplaceSortBy;
  /** Exam board (CURRICULA value). */
  curriculum?:    string;
  /** Suitable for a child of this age. */
  age?:           number;
  /** Exact class (constants/classLevels.ts value), e.g. "class-3". */
  classValue?:    string;
  /** Only listings an admin has featured. */
  featured?:      boolean;
  /** Online course or live class listings only. */
  format?:        'course' | 'live_class';
  page?:          number;
  /** Server caps this at 50. */
  limit?:         number;
}

/** Free sample link (valid ~10 minutes). */
export function apiGetProductSample(idOrSlug: string) {
  return client.get<never, { success: boolean; data: { name: string; mimeType: string; url: string } }>(`/api/products/sample/${idOrSlug}`);
}

export function apiBrowseProducts(p: BrowseParams) {
  const params = new URLSearchParams({ page: String(p.page ?? 1), limit: String(p.limit ?? 24) });
  if (p.q?.trim()) params.set('q', p.q.trim());
  if (p.categoryId) params.set('id', p.categoryId);
  if (p.productType) params.set('productType', p.productType);
  if (p.educationLevel) params.set('educationLevel', p.educationLevel);
  if (p.campaignId) params.set('campaignId', p.campaignId);
  if (p.minPrice != null) params.set('minPrice', String(p.minPrice));
  if (p.maxPrice != null) params.set('maxPrice', String(p.maxPrice));
  if (p.minRating != null) params.set('minRating', String(p.minRating));
  if (p.sortBy) params.set('sortBy', p.sortBy);
  if (p.curriculum) params.set('curriculum', p.curriculum);
  if (p.age != null) params.set('age', String(p.age));
  if (p.classValue) params.set('class', p.classValue);
  if (p.featured) params.set('featured', '1');
  if (p.format) params.set('format', p.format);
  if (p.exact) params.set('exact', '1');
  return client.get<never, ProductsByCategoryResponse>(
    `${ENDPOINTS.MARKETPLACE.PRODUCTS_BY_CATEGORY}?${params.toString()}`,
  );
}

/** GET /api/products/compare?ids=a,b,c — public, max 4, same sanitised shape as listings. */
export function apiCompareProducts(ids: string[]) {
  return client.get<never, { success: boolean; message?: string; data: { products: MarketplaceProduct[] } }>(
    `/api/products/compare?ids=${ids.slice(0, 4).map(encodeURIComponent).join(',')}`,
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
  return cachedRequest(`product:${id}`, 3000, () => client.get<never, ProductByIdResponse>(
    ENDPOINTS.MARKETPLACE.PRODUCT_BY_ID(id),
  ));
}

/** GET /api/products/preview/:id — watermarked/trimmed preview of a digital product, never the original file. */
export function apiGetProductPreview(id: string) {
  return client.get<never, { success: boolean; data: ProductPreviewData }>(
    ENDPOINTS.MARKETPLACE.PRODUCT_PREVIEW(id),
  );
}

/** "Teachers who bought this also bought" — or similar resources for the same grade when there isn't enough order history. */
export function apiGetAlsoBought(idOrSlug: string, limit = 8) {
  return client.get<never, { success: boolean; data: { basis: 'bought_together' | 'similar'; products: MarketplaceProduct[] } }>(`/api/products/also-bought/${idOrSlug}?limit=${limit}`);
}

/** GET /api/products/bestsellers: real best sellers (units on paid orders). `purchaseCount` is the real number. */
export function apiGetBestsellers(limit = 10) {
  return client.get<never, { success: boolean; data: { products: MarketplaceProduct[] } }>(`/api/products/bestsellers?limit=${limit}`);
}

/** GET /api/products/free-resources: free downloads (`freeKind: 'free'`) then paid products that offer a free sample (`'sample'`). */
export function apiGetFreeResources(limit = 10) {
  return client.get<never, { success: boolean; data: { products: (MarketplaceProduct & { freeKind?: 'free' | 'sample' })[] } }>(`/api/products/free-resources?limit=${limit}`);
}
