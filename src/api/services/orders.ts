import client from '../client';
import { ENDPOINTS } from '../endpoints';
import { API_BASE_URL } from '@/api/apiBase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderActionResponse {
  success: boolean;
  message: string;
}

export interface UpdateStatusPayload {
  orderId: string;
  storeId: string;
  status:  'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  tracking?: {
    carrier:        string;
    trackingNumber?: string;
    trackingUrl?:    string;
    expectedDeliveryDate?: string;
    note?: string;
  };
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
export type ReturnStatus = 'none' | 'requested' | 'partial_requested' | 'approved' | 'rejected';

export interface OrderLineItem {
  itemId:     string;
  productId:  string;
  name:       string;
  image:      string | null;
  sku:        string;
  type:       'physical' | 'digital';
  productType?: 'physical' | 'digital';
  quantity:   number;
  price:      number;
  totalPrice: number;
  status:     string;
  /** Server's verified-purchase answer (same rule addReview enforces). */
  canReview?: boolean;
  returnStatus?: ReturnStatus;
}

export interface OrderStoreGroup {
  storeId:         string;
  fulfillmentType: string;
  status:          string;
  subtotal:        number;
  itemCount:       number;
  items:           OrderLineItem[];
  tracking?:       { carrier: string; trackingNumber?: string | null; trackingUrl?: string | null; expectedDeliveryDate?: string | null; note?: string | null } | null;
  shippedAt?:      string | null;
  deliveredAt?:    string | null;
  /** Multi-seller Cash on Delivery: each seller package is paid in cash separately. Absent on legacy orders. */
  packageIsPaid?:  boolean;
  packagePaidAt?:  string | null;
  codAmount?:      number;
  /** 'platform' = Edudeen's courier collects the cash; 'seller' = the seller's rider. */
  codCollector?:   'seller' | 'platform' | null;
}

export interface OrderSummary {
  orderId:          string;
  orderNumber:      string;
  orderStatus:      OrderStatus;
  paymentType:      string;
  paymentStatus:    string;
  isPaid:           boolean;
  /** Free product the buyer "availed" (no payment involved). */
  isFreeClaim?:     boolean;
  subtotal:         number;
  shippingFee:      number;
  taxAmount:        number;
  totalAmount:      number;
  currency:         string;
  shippingAddress:  Record<string, unknown>;
  shippingEstimate?: string | null;
  stores:          OrderStoreGroup[];
  createdAt:        string;
  paidAt?:          string | null;
}

export interface MyOrdersParams { page?: number; limit?: number; status?: string }
interface MyOrdersResponse {
  success: boolean;
  data: {
    pagination: { page: number; limit: number; totalPages: number; total: number };
    orders: OrderSummary[];
  };
}

// Raw order document (used for the single order-detail view)
export interface OrderDetail {
  _id:             string;
  userId:          string;
  orderNumber:     string;
  orderStatus:     OrderStatus;
  paymentType:     string;
  paymentStatus:   string;
  isPaid:          boolean;
  isFreeClaim?:    boolean;
  subtotal:        number;
  shippingFee:     number;
  taxAmount:       number;
  totalAmount:     number;
  currency:        string;
  shippingAddress: Record<string, unknown>;
  shippingEstimate?: string | null;
  sellerOrders:  (OrderStoreGroup & { _id?: string; storeName?: string | null; storeSlug?: string | null; storeContactEmail?: string | null; storeContactPhone?: string | null; sellerName?: string | null })[];
  couponCode?:     string | null;
  couponDiscountTotal?: number;
  giftCardDiscountTotal?: number;
  campaignDiscountTotal?: number;
  autoDiscountTotal?: number;
  subscriberDiscountTotal?: number;
  createdAt:       string;
  paidAt?:         string | null;
}
interface OrderDetailResponse { success: boolean; data: OrderDetail }

export interface CancelOrderPayload { reason: string; itemIds?: string[] }
interface CancelOrderResponse {
  success: boolean;
  message: string;
  data: { orderId: string; cancelledItems: number; refundProcessed: boolean };
}

export interface ReturnRequestPayload {
  reason?: string; itemIds?: string[];
  /** Optional structured reason + note (20-1000) + up to 4 photos: same rules as refund requests. */
  reasonCode?: string; note?: string; evidenceImages?: string[];
}
interface ReturnRequestResponse {
  success: boolean;
  message: string;
  data: { orderId: string; requestedItems: number };
}

export interface SellerReturnItem {
  orderId:            string;
  orderNumber:        string;
  itemId:             string;
  customer:           { name: string; email: string | null };
  storeId:            string;
  productName:        string;
  productImage:       string | null;
  returnReason:       string;
  amount:             number;
  refundedAmount:     number;
  returnStatus:       ReturnStatus;
  returnRejectReason: string | null;
  returnRequestedAt:  string;
}

/** `q` = order number / item name / buyer name or email (server-side, list only — stats stay store-wide). 10 per page. */
export interface SellerReturnsParams { storeId?: string; status?: string; page?: number; q?: string }
interface SellerReturnsResponse {
  success: boolean;
  data: {
    stats: { openRequests: number; returnRate: string; totalRefunded: number };
    pagination: { page: number; limit: number; totalPages: number; total: number };
    returns: SellerReturnItem[];
  };
}

export interface ReturnActionPayload {
  storeId:      string;
  itemIds:      string[];
  action:       'approve' | 'reject';
  rejectReason?: string;
}
interface ReturnActionResponse {
  success: boolean;
  message: string;
  data: { orderId: string; action: string; processedItems: number; refundProcessed: boolean };
}

interface DownloadLinkResponse {
  success: boolean;
  data: { token: string; endpoint: string; fileName: string; expiresIn: string };
}

// ── API ───────────────────────────────────────────────────────────────────────

/** storeId = the seller package being marked paid (required by the API for multi-seller Cash on Delivery orders). */
export function apiMarkOrderPaid(orderId: string, storeId?: string) {
  return client.put<never, OrderActionResponse>(ENDPOINTS.ORDERS.MARK_PAID(orderId), storeId ? { storeId } : undefined);
}

export function apiUpdateOrderStatus(payload: UpdateStatusPayload) {
  return client.put<never, OrderActionResponse>(ENDPOINTS.ORDERS.UPDATE_STATUS, payload);
}

/** Seller cancels THIS store's items of an order that has not shipped (refund handled by the API like a buyer cancel). */
export function apiSellerCancelOrder(orderId: string, storeId: string, reason: string) {
  return client.post<never, OrderActionResponse>(ENDPOINTS.ORDERS.SELLER_CANCEL(orderId), { storeId, reason });
}

/** Admin cancels an order (every store's remaining items, or just `itemIds`) — no store ownership check, unlike the seller cancel above. */
export function apiAdminCancelOrder(orderId: string, reason: string, itemIds?: string[]) {
  return client.post<never, OrderActionResponse>(ENDPOINTS.ORDERS.SELLER_CANCEL(orderId), { reason, itemIds });
}

export interface DigitalDownloadFile {
  index:     number;
  fileName:  string;
  mimeType:  string;
  size?:     number;
  type:      'stamped' | 'download';
  endpoint:  string;
  token:     string;
  expiresIn: string;
}

interface DownloadFilesResponse {
  success: boolean;
  message: string;
  data: {
    files:         DigitalDownloadFile[];
    downloadCount: number;
    downloadLimit: string;
    remaining:     string;
  };
}

/** GET /api/orders/download-url — every file of a purchased digital product,
 *  each with its own short-lived (10 min) token + direct-download endpoint.
 *  Also enforces link expiry / download limit up front. */
export function apiGetDownloadFiles(orderId: string, productId: string) {
  return client.get<never, DownloadFilesResponse>(ENDPOINTS.ORDERS.DOWNLOAD_URL, {
    params: { orderId, productId },
  });
}

/** Absolute URL for a token-based download endpoint (no auth header needed). */
export function buildDownloadHref(endpoint: string, token: string) {
  const base = API_BASE_URL;
  return `${base}${endpoint}?token=${encodeURIComponent(token)}`;
}

/** @deprecated Response is actually `data.files[]` — use apiGetDownloadFiles. */
export function apiGetDownloadUrl(orderId: string, productId: string) {
  return client.get<never, { success: boolean; message: string; data: { downloadUrl: string } }>(
    `${ENDPOINTS.ORDERS.DOWNLOAD_URL}?orderId=${orderId}&productId=${productId}`,
  );
}

/** GET /api/orders/my-orders — buyer's paginated order list */
export function apiGetMyOrders(params?: MyOrdersParams) {
  return client.get<never, MyOrdersResponse>(ENDPOINTS.ORDERS.MY_ORDERS, { params });
}

/** GET /api/orders/by-checkout/:checkoutId — every order one checkout produced (same shape as my-orders). */
export function apiGetOrdersByCheckout(checkoutId: string) {
  return client.get<never, MyOrdersResponse>(ENDPOINTS.ORDERS.BY_CHECKOUT(checkoutId));
}

/** GET /api/orders/:orderId — single order detail (buyer, must own the order) */
export function apiGetOrderById(orderId: string) {
  return client.get<never, OrderDetailResponse>(ENDPOINTS.ORDERS.GET_BY_ID(orderId));
}

/** POST /api/orders/cancel/:orderId — buyer cancels a whole order or specific items */
export function apiCancelOrder(orderId: string, payload: CancelOrderPayload) {
  return client.post<never, CancelOrderResponse>(ENDPOINTS.ORDERS.CANCEL(orderId), payload);
}

/** POST /api/orders/return-request/:orderId — buyer requests a return on delivered items */
export function apiRequestReturn(orderId: string, payload: ReturnRequestPayload) {
  return client.post<never, ReturnRequestResponse>(ENDPOINTS.ORDERS.RETURN_REQUEST(orderId), payload);
}

/** GET /api/orders/returns — seller's paginated return requests across their store(s) */
export function apiGetSellerReturns(params?: SellerReturnsParams) {
  return client.get<never, SellerReturnsResponse>(ENDPOINTS.ORDERS.SELLER_RETURNS, { params });
}

/** One row of the merged seller returns list (item return OR item refund request). */
export interface SellerReturnRow {
  source:      'return' | 'refund';
  /** return: "<orderId>:<itemId>"; refund: the refund request id. */
  requestId:   string;
  itemIds:     string[];
  orderId:     string;
  orderNumber: string;
  storeId:     string;
  item:        string;
  buyer:       string;
  type:        'Return' | 'Refund only';
  reason:      string;
  status:      'open' | 'approved' | 'rejected';
  requestedAt: string | null;
  /** requestedAt + 48 h, only while open. Display only. */
  respondBy:   string | null;
  isOverdue:   boolean;
  amount:      number;
  note?:       string | null;
  evidenceImages?: string[];
  /** Tracking-only step after approval. */
  followUp?:   'item_received' | 'replacement_sent' | null;
  reasonLabel?: string;
}

/** Drawer detail (GET /api/orders/seller-returns-all/:storeId/:source/:requestId). */
export interface SellerReturnDetail {
  source: 'return' | 'refund';
  requestId: string;
  orderId: string;
  orderNumber: string;
  storeId: string;
  type: 'Return' | 'Refund only';
  status: 'open' | 'approved' | 'rejected';
  followUp: 'item_received' | 'replacement_sent' | null;
  followUpNote: string | null;
  buyer: string;
  currency: string;
  items: { id: string; name: string; type: 'physical' | 'digital'; quantity: number; totalPrice: number; refundedAmount: number; downloadCount: number | null }[];
  reasonCode: string | null;
  reasonLabel: string;
  reason: string;
  note: string | null;
  evidenceImages: string[];
  rejectReason: string | null;
  amount: number;
  refundedAmount: number;
  /** Derived from the items' stored refundedAmount (> 0). */
  refunded: boolean;
  requestedAt: string | null;
  respondBy: string | null;
  isOverdue: boolean;
  timeline: { status: string; label: string; at: string | null; byRole: string | null; note: string | null }[];
  actions: { canReview: boolean; canMarkReceived: boolean; canMarkReplacementSent: boolean };
}

/** GET detail of one return / refund request (own store only). */
export function apiGetSellerReturnDetail(storeId: string, source: 'return' | 'refund', requestId: string) {
  return client.get<never, { success: boolean; data: SellerReturnDetail }>(
    `/api/orders/seller-returns-all/${storeId}/${source}/${encodeURIComponent(requestId)}`,
  );
}

/** PATCH /api/orders/return-follow-up/:orderId — tracking only (item received back / replacement sent). */
export function apiReturnFollowUp(orderId: string, payload: { storeId: string; itemId: string; step: 'item_received' | 'replacement_sent'; note?: string }) {
  return client.patch<never, { success: boolean }>(`/api/orders/return-follow-up/${orderId}`, payload);
}
export interface SellerReturnsAllStats {
  open: number; overdue: number;
  returnRate30d: { pct: number | null; returns: number; orders: number };
  refunded30d: number;
}
export interface SellerReturnsAllParams { status?: string; q?: string; page?: number }
interface SellerReturnsAllResponse {
  success: boolean;
  data: {
    stats: SellerReturnsAllStats;
    pagination: { page: number; limit: number; total: number; totalPages: number };
    items: SellerReturnRow[];
  };
}

/** GET /api/orders/seller-returns-all/:storeId — returns + refund requests in one list, open first by respond-by. */
export function apiGetSellerReturnsAll(storeId: string, params?: SellerReturnsAllParams) {
  return client.get<never, SellerReturnsAllResponse>(`/api/orders/seller-returns-all/${storeId}`, { params });
}

/** PUT /api/orders/return-action/:orderId — seller approves/rejects a return request */
export function apiReturnAction(orderId: string, payload: ReturnActionPayload) {
  return client.put<never, ReturnActionResponse>(ENDPOINTS.ORDERS.RETURN_ACTION(orderId), payload);
}

/** GET /api/orders/get-download-link — issues a short-lived (10 min) download token for a digital file */
export function apiGetDownloadLink(orderId: string, productId: string, fileIndex = 0) {
  return client.get<never, DownloadLinkResponse>(ENDPOINTS.ORDERS.GET_DOWNLOAD_LINK, {
    params: { orderId, productId, fileIndex },
  });
}

/** GET /api/orders/download-zip-link/:orderId/:productId — 10-minute token for ONE streamed zip of every file (counts one download) */
export function apiGetZipLink(orderId: string, productId: string) {
  return client.get<never, DownloadLinkResponse>(ENDPOINTS.ORDERS.DOWNLOAD_ZIP_LINK(orderId, productId));
}

/** GET /api/orders/stream-pdf — downloads the (optionally watermark-stamped) PDF as a blob */
export function apiStreamPdf(orderId: string, productId: string, fileIndex = 0) {
  return client.get<never, Blob>(ENDPOINTS.ORDERS.STREAM_PDF, {
    params: { orderId, productId, fileIndex },
    responseType: 'blob',
  });
}

// ── My Library (every digital resource the buyer owns) ───────────────────────
export interface LibraryItem {
  orderId:        string;
  orderNumber:    string;
  itemId:         string;
  productId:      string;
  slug:           string | null;
  name:           string;
  image:          string | null;
  licenseType:    string | null;
  storeId:        string;
  storeName:      string | null;
  storeSlug:      string | null;
  isPaid:         boolean;
  purchasedAt:    string;
  downloadCount:  number;
  reviewable:     boolean;
  category:       string | null;
  subCategory:    string | null;
  educationLevel: string | null;
  curricula:      string[];
  fileCount:      number;
  deliveryFormat?: 'download' | 'course';
  /** File extensions (lowercase) and combined size in bytes of the product's files. */
  fileTypes?:     string[];
  totalSize?:     number;
  /** Set when the buyer can no longer download: removed by an admin, or the seller's access window ended. */
  unavailable?:   'removed' | 'expired' | null;
  expiresAt?:     string | null;
}

/** POST /api/orders/resend-download-link - emails the buyer a link to My Library for one purchased item (5 per 10 min). */
export function apiResendDownloadLink(orderId: string, productId: string) {
  return client.post<never, { success: boolean; message: string }>('/api/orders/resend-download-link', { orderId, productId });
}

export function apiGetMyLibrary() {
  return client.get<never, { success: boolean; data: { items: LibraryItem[] } }>('/api/orders/my-library');
}
