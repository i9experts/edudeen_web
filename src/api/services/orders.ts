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
    trackingNumber: string;
    trackingUrl:    string;
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
  productType?: 'physical' | 'digital' | 'educational';
  quantity:   number;
  price:      number;
  totalPrice: number;
  status:     string;
  returnStatus?: ReturnStatus;
}

export interface OrderStoreGroup {
  storeId:         string;
  fulfillmentType: string;
  status:          string;
  subtotal:        number;
  itemCount:       number;
  items:           OrderLineItem[];
  tracking?:       { carrier: string; trackingNumber: string; trackingUrl: string } | null;
  shippedAt?:      string | null;
  deliveredAt?:    string | null;
}

export interface OrderSummary {
  orderId:          string;
  orderNumber:      string;
  orderStatus:      OrderStatus;
  paymentType:      string;
  paymentStatus:    string;
  isPaid:           boolean;
  subtotal:         number;
  shippingFee:      number;
  taxAmount:        number;
  totalAmount:      number;
  currency:         string;
  shippingAddress:  Record<string, unknown>;
  stores:           OrderStoreGroup[];
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
  subtotal:        number;
  shippingFee:     number;
  taxAmount:       number;
  totalAmount:     number;
  currency:        string;
  shippingAddress: Record<string, unknown>;
  sellerOrders:    (OrderStoreGroup & { _id?: string; storeName?: string | null; storeSlug?: string | null; storeContactEmail?: string | null; storeContactPhone?: string | null; sellerName?: string | null })[];
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

export interface ReturnRequestPayload { reason: string; itemIds?: string[] }
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

export interface SellerReturnsParams { storeId?: string; status?: string; page?: number }
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

export function apiMarkOrderPaid(orderId: string) {
  return client.put<never, OrderActionResponse>(ENDPOINTS.ORDERS.MARK_PAID(orderId));
}

export function apiUpdateOrderStatus(payload: UpdateStatusPayload) {
  return client.put<never, OrderActionResponse>(ENDPOINTS.ORDERS.UPDATE_STATUS, payload);
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
  customLevel:    string | null;
  curricula:      string[];
  fileCount:      number;
  deliveryFormat?: 'download' | 'course' | 'live_class';
  liveStartsAt?:  string | null;
}

export function apiGetMyLibrary() {
  return client.get<never, { success: boolean; data: { items: LibraryItem[] } }>('/api/orders/my-library');
}
