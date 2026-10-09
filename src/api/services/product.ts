import client from '../client';
import { ENDPOINTS } from '../endpoints';
import type { PublicStoreProduct } from './store';

// ── Education taxonomy ──────────────────────────────────────────────────────────

export const EDUCATION_LEVELS = [
  { value: 'preschool',            label: 'Preschool' },
  { value: 'primary_school',       label: 'Primary School' },
  { value: 'middle_school',        label: 'Middle School' },
  { value: 'secondary_school',     label: 'Secondary School' },
  { value: 'college',              label: 'College' },
  { value: 'university',           label: 'University' },
  { value: 'professional_courses', label: 'Professional Courses' },
  { value: 'islamic_education',    label: 'Islamic Education' },
  { value: 'other',                label: 'Other' },
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number]['value'];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DigitalFile {
  url:      string;
  name:     string;
  size:     number;
  mimeType: string;
}

export interface DigitalPreviewMeta {
  enabled:         boolean;
  sourceFileIndex: number;
}

export interface DigitalMeta {
  files:                DigitalFile[];
  downloadLimit:        string;          // 'unlimited' or a number as string
  linkExpiryDays:       number | null;
  pdfStampingEnabled:   boolean;
  licenseType:          'personal' | 'single_classroom' | 'school' | 'commercial';
  buyerDeliveryMessage: string;
  preview?:             DigitalPreviewMeta;
  /** Free sample anyone can download (seller views only — public views get sampleAvailable). */
  sampleFile?:          DigitalFile | null;
}

/** Who a resource is for — exam boards and an age range. */
export interface LearningMetaInput {
  curricula?: string[];
  ageMin?:    number | null;
  ageMax?:    number | null;
  /** Digital only: files, an online course, or a scheduled live class. */
  deliveryFormat?: DeliveryFormat;
  liveSession?:    LiveSessionInput | null;
}

export type DeliveryFormat = 'download' | 'course' | 'live_class';
export interface LiveSessionInput {
  startsAt:        string;
  durationMinutes: number;
  platform:        'zoom' | 'google_meet' | 'teams' | 'other';
  meetingUrl:      string;
  capacity:        number | null;
  notes:           string;
}

/** Extra licenses at their own price (digital only). */
export interface LicenseTierInput { license: 'single_classroom' | 'school' | 'commercial'; price: number; compareAtPrice?: number | null }

/** A single seller-defined attribute on a variant, e.g. {name:'Color', value:'Red'} — a
 *  product's variants can mix any attributes (Color, Size, Material…), up to 3 each,
 *  as long as every variant on the same product uses the same set of attribute names. */
export interface VariantOption {
  name:  string;
  value: string;
}

export interface ProductVariant {
  _id:            string;
  productId:      string;
  sku:            string;
  price:          number;
  /** The currency `price`/`compareAtPrice` are denominated in — the owning
   *  store's own Store.baseCurrency, stamped server-side at creation. */
  currency?:      'PKR' | 'USD' | null;
  compareAtPrice: number | null;
  options:        VariantOption[];
  stock:          number;
  unlimitedStock: boolean;
  shippingWeight: string | null;
  images:         string[];
  isDefault:      boolean;
  status:         string;
  isDelete:       boolean;
  createdAt:      string;
  updatedAt:      string;
}

/** Payload for creating (or editing) one variant via the dedicated variant-CRUD endpoints. */
export interface VariantInput {
  price:          number;
  compareAtPrice?: number | null;
  options?:       VariantOption[];
  stock?:         number;
  unlimitedStock?: boolean;
  shippingWeight?: string;
  images?:        string[];
  sku?:           string;
  isDefault?:     boolean;
}

export interface StoreProduct {
  _id:               string;
  sellerId:          string;
  storeId:           string;
  name:              string;
  slug:              string;
  description:       string;
  productType:       'physical' | 'digital' | 'educational';
  type:              'physical' | 'digital';
  categoryId:        string;
  subCategoryId:     string | null;
  educationLevel:    EducationLevel | null;
  customLevel:       string | null;
  normalizedCustomLevel: string | null;
  images:            string[];
  tags:              string[];
  curricula?:        string[];
  ageMin?:           number | null;
  ageMax?:           number | null;
  /** Admin-assigned trust badges (listing review). */
  trust?:            { scholarReviewed: boolean; ageAppropriateMin: number | null; ageAppropriateMax: number | null } | null;
  deliveryFormat?:   DeliveryFormat;
  liveSession?:      LiveSessionInput | null;
  digital:           DigitalMeta | null;
  status:            'draft' | 'active' | 'archived' | 'scheduled' | 'inactive' | 'pending_review' | 'rejected';
  scheduledAt:       string | null;
  /** Reviewer's note when an admin sent the listing back. */
  reviewNote?:       string | null;
  isListedOnEdudeen: boolean;
  isDelete:          boolean;
  createdAt:         string;
  updatedAt:         string;
  // injected by getProductById
  sellerName:        string | null;
  storeSlug:         string | null;
  storeName:         string | null;
}

// ── Request payloads ──────────────────────────────────────────────────────────

export interface CreatePhysicalPayload extends LearningMetaInput {
  storeId:           string;
  name:              string;
  description:       string;
  subCategoryId:     string | null;
  images:            string[];
  tags:              string[];
  isListedOnEdudeen: boolean;
  status:            'draft' | 'active' | 'scheduled';
  scheduledAt?:      string | null;
  // At least one variant is required — every variant must share the same
  // set of attribute names (e.g. all "Color"+"Size", not a mix).
  variants:          VariantInput[];
}

export interface CreateDigitalPayload extends LearningMetaInput {
  storeId:           string;
  name:              string;
  description:       string;
  productType:       'digital' | 'educational';
  subCategoryId:     string | null;
  educationLevel?:   EducationLevel | null;
  customLevel?:      string | null;
  images:            string[];
  tags:              string[];
  isListedOnEdudeen: boolean;
  status:            'draft' | 'active' | 'scheduled';
  scheduledAt?:      string | null;
  price:             number;
  compareAtPrice:    number | null;
  digital:           DigitalMeta;
  licenseTiers?:     LicenseTierInput[];
}

// Physical products manage price/stock/options per-variant exclusively through
// the variant CRUD endpoints below now — this payload only touches
// product-level fields (name/images/status/etc), never price or variants.
export interface EditPhysicalPayload extends LearningMetaInput {
  productId:         string;
  name:              string;
  description:       string;
  subCategoryId:     string | null;
  images:            string[];
  tags:              string[];
  isListedOnEdudeen: boolean;
  status:            'draft' | 'active' | 'scheduled';
  scheduledAt?:      string | null;
}

export interface EditDigitalPayload extends LearningMetaInput {
  productId:      string;
  variantId:      string | null;
  name:           string;
  description:    string;
  subCategoryId:  string | null;
  educationLevel?: EducationLevel | null;
  customLevel?:   string | null;
  status:         'draft' | 'active' | 'scheduled';
  scheduledAt?:   string | null;
  price:          number;
  compareAtPrice: number | null;
  digital:        DigitalMeta;
  /** Replaces all extra licenses; [] removes them. */
  licenseTiers?:  LicenseTierInput[];
}

// ── Response shapes ───────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data:    T;
}

export interface CreateProductData {
  product:        StoreProduct;
  defaultVariant: ProductVariant;
}

export interface EditProductData {
  product: StoreProduct;
  variant: ProductVariant;
}

export interface GetProductData {
  product:        StoreProduct;
  variants:       ProductVariant[];
  defaultVariant: ProductVariant | null;
}


export interface InventoryProduct {
  productId:    string;
  sku:          string;
  name:         string;
  image:        string | null;
  type:         'physical' | 'digital';
  productType?: 'physical' | 'digital' | 'educational';
  stock:        number | string;
  stockStatus:  string;
  status:       'active' | 'draft' | 'archived' | 'inactive' | 'scheduled' | 'pending_review' | 'rejected';
  /** Reviewer's note when an admin sent the listing back. */
  reviewNote?:  string | null;
  price:        number;
  allTimeSales: number;
}

export interface InventoryStats {
  totalProducts: number;
  inStock:       number;
  lowStock:      number;
  outOfStock:    number;
}

export interface InventoryPagination {
  page:          number;
  limit:         number;
  totalPages:    number;
  totalProducts: number;
}

export interface GetInventoryData {
  stats:      InventoryStats;
  pagination: InventoryPagination;
  products:   InventoryProduct[];
}

export interface LowStockItem {
  productId: string;
  name:      string;
  stock:     number;
}

export interface LowStockSummaryData {
  count:     number;
  threshold: number;
  items:     LowStockItem[];
}

// ── API functions ─────────────────────────────────────────────────────────────

export function apiCreatePhysicalProduct(payload: CreatePhysicalPayload) {
  return client.post<never, ApiResponse<CreateProductData>>(
    ENDPOINTS.PRODUCT.CREATE_PHYSICAL, payload,
  );
}

export function apiCreateDigitalProduct(payload: CreateDigitalPayload) {
  return client.post<never, ApiResponse<CreateProductData>>(
    ENDPOINTS.PRODUCT.CREATE_DIGITAL, payload,
  );
}

export function apiEditPhysicalProduct(_id: string, payload: EditPhysicalPayload) {
  return client.post<never, ApiResponse<EditProductData>>(
    ENDPOINTS.PRODUCT.EDIT_PRODUCT, payload,
  );
}

export function apiEditDigitalProduct(_id: string, payload: EditDigitalPayload) {
  return client.post<never, ApiResponse<EditProductData>>(
    ENDPOINTS.PRODUCT.EDIT_PRODUCT, payload,
  );
}

export function apiGetMyProductById(id: string) {
  return client.get<never, ApiResponse<GetProductData>>(
    ENDPOINTS.PRODUCT.GET_MY_PRODUCT_BY_ID(id),
  );
}

export function apiDeleteProduct(id: string) {
  return client.delete<never, ApiResponse<null>>(
    ENDPOINTS.PRODUCT.DELETE_PRODUCT(id),
  );
}

// ── Variant CRUD (physical products only, seller-owned) ────────────────────────
// Add/edit/remove a variant after the product already exists — used by the
// "Manage Variants" section on the Edit Product page. Creation of the first
// variant(s) happens inline as part of apiCreatePhysicalProduct above.

export function apiListVariants(productId: string) {
  return client.get<never, ApiResponse<ProductVariant[]>>(ENDPOINTS.PRODUCT.VARIANTS.LIST(productId));
}

export function apiCreateVariant(productId: string, payload: VariantInput) {
  return client.post<never, ApiResponse<ProductVariant>>(ENDPOINTS.PRODUCT.VARIANTS.CREATE(productId), payload);
}

export function apiUpdateVariant(productId: string, variantId: string, payload: Partial<VariantInput>) {
  return client.patch<never, ApiResponse<ProductVariant>>(ENDPOINTS.PRODUCT.VARIANTS.UPDATE(productId, variantId), payload);
}

export function apiDeleteVariant(productId: string, variantId: string) {
  return client.delete<never, ApiResponse<ProductVariant[]>>(ENDPOINTS.PRODUCT.VARIANTS.DELETE(productId, variantId));
}

export function apiGetStoreInventory(
  storeId: string, page = 1, limit = 10,
  filters: { status?: 'active' | 'draft' | 'archived'; q?: string } = {},
) {
  // Backend supports ?status= and ?q= (name/SKU, case-insensitive) and counts
  // stats.totalProducts on the same filter. `limit` is capped at 100 server-side.
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.status) params.set('status', filters.status);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  return client.get<never, ApiResponse<GetInventoryData>>(
    `${ENDPOINTS.INVENTORY.GET_STORE_INVENTORY(storeId)}?${params.toString()}`,
  );
}

/** GET /api/inventory/low-stock-summary/:storeId — seller/admin only. */
export function apiGetLowStockSummary(storeId: string) {
  return client.get<never, ApiResponse<LowStockSummaryData>>(
    ENDPOINTS.INVENTORY.LOW_STOCK_SUMMARY(storeId),
  );
}

// ── Seller Orders types ───────────────────────────────────────────────────────

export interface SellerOrderCustomer {
  name:  string;
  email: string;
}

export interface SellerOrder {
  orderId:     string;
  orderNumber: string;
  customer:    SellerOrderCustomer;
  product:     string;
  /** sellerOrder.fulfillmentType — 'mixed' when the store's part of the order has both kinds. */
  type:        'physical' | 'digital' | 'mixed';
  productType?: 'physical' | 'digital' | 'educational';
  date:        string;
  amount:      number;
  /** Currency `amount` is denominated in (the order's own currency, fixed per store). */
  currency:    string | null;
  status:      string;
  isPaid:      boolean;
  paymentType: string;
}

export interface SellerOrderStats {
  totalOrders: number;
  revenue:     number;
  pending:     number;
  avgOrder:    number;
}

export interface SellerOrderPagination {
  page:        number;
  limit:       number;
  totalPages:  number;
  totalOrders: number;
}

export interface GetSellerOrdersData {
  stats:      SellerOrderStats;
  pagination: SellerOrderPagination;
  orders:     SellerOrder[];
}

/** Server-side filters supported by GET /orders/seller-orders/:storeId
 *  (orders.service getSellerOrders): `status` matches sellerOrders.status,
 *  `type` matches sellerOrders.fulfillmentType, `q` searches order number /
 *  buyer name or email / this store's item names. The backend caps `limit` at 50. */
export interface SellerOrderFilters {
  status?: string;
  type?:   'physical' | 'digital' | 'mixed' | '';
  time?:   'today' | 'week' | 'month' | '';
  q?:      string;
}

export function apiGetSellerOrders(storeId: string, page = 1, limit = 10, filters: SellerOrderFilters = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters.status) params.set('status', filters.status);
  if (filters.type)   params.set('type', filters.type);
  if (filters.time)   params.set('time', filters.time);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  return client.get<never, ApiResponse<GetSellerOrdersData>>(
    `${ENDPOINTS.SELLER_ACCOUNT.GET_SELLER_ORDERS(storeId)}?${params.toString()}`,
  );
}

export interface SellerOrderDetailItem {
  productId:   string;
  variantId:   string | null;
  name:        string;
  image:       string | null;
  sku:         string | null;
  type:        'physical' | 'digital';
  productType: string | null;
  options:     { name: string; value: string }[];
  licenseType: string | null;
  quantity:    number;
  price:       number;
  totalPrice:  number;
  status:      string | null;
}

export interface SellerOrderShippingAddress {
  recipientName: string;
  phoneNumber:   string;
  addressLine1:  string;
  addressLine2:  string | null;
  city:          string;
  state:         string;
  zipCode:       string;
}

export interface SellerOrderDetail {
  orderId:         string;
  orderNumber:     string;
  date:            string;
  currency:        string;
  isPaid:          boolean;
  paymentType:     string;
  customer:        SellerOrderCustomer & { phone: string | null };
  shippingAddress: SellerOrderShippingAddress | null;
  status:          string;
  type:            'physical' | 'digital' | 'mixed';
  subtotal:        number;
  tracking:        { carrier: string | null; trackingNumber: string | null; trackingUrl: string | null } | null;
  /** Set when the shipment was booked through a courier integration. */
  shipment?:       { courier: string | null; trackingNumber: string | null; labelUrl: string | null; bookedAt: string | null } | null;
  giftMessage?:    string | null;
  giftWrap?:       boolean;
  trackingEvents?: Array<{ status: string | null; description: string | null; location: string | null; at: string | null; source: string }>;
  shippedAt:       string | null;
  deliveredAt:     string | null;
  items:           SellerOrderDetailItem[];
}

/** GET /api/orders/seller-orders/:storeId/:orderId — this store's part of one order (owner only). */
export function apiGetSellerOrderDetail(storeId: string, orderId: string) {
  return client.get<never, ApiResponse<SellerOrderDetail>>(
    `${ENDPOINTS.SELLER_ACCOUNT.GET_SELLER_ORDERS(storeId)}/${orderId}`,
  );
}

/** Orders across every store the seller owns — used by the cross-store seller dashboard. */
export function apiGetMySellerOrders(page = 1, limit = 10) {
  return client.get<never, ApiResponse<GetSellerOrdersData>>(
    `${ENDPOINTS.SELLER_ACCOUNT.GET_MY_SELLER_ORDERS}?page=${page}&limit=${limit}`,
  );
}

/** GET /api/products/education/custom-level-suggestions?q= — seller-only autocomplete for the "Other" custom level input. */
export function apiGetCustomLevelSuggestions(q: string) {
  return client.get<never, ApiResponse<string[]>>(
    `${ENDPOINTS.PRODUCT.EDUCATION_CUSTOM_LEVEL_SUGGESTIONS}?q=${encodeURIComponent(q)}`,
  );
}

// ── Storefront promotion sections (public) ─────────────────────────────────────
interface StorefrontProductsData { products: PublicStoreProduct[] }

/** Seller-pinned products ("Manual Pin"/"Seller Featured"), in the seller's chosen order. */
export function apiGetPinnedProducts(storeId: string) {
  return client.get<never, ApiResponse<StorefrontProductsData>>(ENDPOINTS.PRODUCT.STORE_PINNED(storeId));
}

export function apiGetNewArrivals(storeId: string, limit = 12) {
  return client.get<never, ApiResponse<StorefrontProductsData>>(ENDPOINTS.PRODUCT.STORE_NEW_ARRIVALS(storeId), { params: { limit } });
}

/** All-time unit-sales leaderboard for the store. */
export function apiGetBestSellers(storeId: string, limit = 12) {
  return client.get<never, ApiResponse<StorefrontProductsData>>(ENDPOINTS.PRODUCT.STORE_BEST_SELLERS(storeId), { params: { limit } });
}

/** Same leaderboard narrowed to the last 7 days. */
export function apiGetTrendingProducts(storeId: string, limit = 12) {
  return client.get<never, ApiResponse<StorefrontProductsData>>(ENDPOINTS.PRODUCT.STORE_TRENDING(storeId), { params: { limit } });
}


/** Changes only a listing's status (the edit endpoint ignores fields it isn't sent). */
export function apiSetProductStatus(productId: string, status: 'draft' | 'active') {
  return client.post<never, ApiResponse<EditProductData>>(ENDPOINTS.PRODUCT.EDIT_PRODUCT, { productId, status });
}
