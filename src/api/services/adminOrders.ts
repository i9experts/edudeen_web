import client from '../client';
import type { AddressPayload } from './address';

export type AdminOrderStatus = 'pending' | 'processing' | 'partially_shipped' | 'completed' | 'cancelled';
export type AdminPaymentStatus = 'unpaid' | 'partially_paid' | 'pending_verification' | 'paid' | 'failed' | 'refunded';
export type AdminPaymentType = 'cash_on_delivery' | 'stripe' | 'manual_bank_transfer';

export interface AdminOrdersQuery {
  /** Order number, order id, or buyer name / email / phone. */
  q?: string;
  status?: AdminOrderStatus;
  paymentStatus?: AdminPaymentStatus;
  paymentType?: AdminPaymentType;
  storeId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  buyer: { id: string; name: string; email: string } | null;
  stores: { id: string; name: string; status: string; possibleDuplicate: { orderId: string; orderNumber: string } | null }[];
  itemCount: number;
  totalAmount: number;
  currency: string;
  paymentType: AdminPaymentType;
  paymentStatus: AdminPaymentStatus;
  orderStatus: AdminOrderStatus;
  fulfillment: string[];
}

export interface AdminOrderItem {
  productId: string;
  name: string;
  image: string | null;
  sku: string | null;
  options: { name: string; value: string }[];
  type: 'physical' | 'digital';
  licenseType: string | null;
  quantity: number;
  price: number;
  totalPrice: number;
  status?: string;
  refundedAmount?: number;
  downloadCount?: number;
  returnStatus?: string | null;
}

export interface AdminSellerOrder {
  id: string;
  storeId: string;
  storeName: string;
  storeSlug: string | null;
  fulfillmentType: 'physical' | 'digital' | 'mixed';
  status: string;
  subtotal: number;
  items: AdminOrderItem[];
  tracking?: { carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null } | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  /** Multi-seller Cash on Delivery: this seller package's own cash state. */
  packageIsPaid?: boolean;
  codAmount?: number;
  /** Who collects this COD package's cash ('platform' = Edudeen's courier). Old orders: fall back to fulfillmentMode. */
  codCollector?: 'seller' | 'platform' | null;
  fulfillmentMode?: 'seller' | 'platform' | null;
  /** Same buyer + same products in another live order on this store, within 24h — advisory only. */
  possibleDuplicate?: { orderId: string; orderNumber: string } | null;
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  createdAt: string;
  currency: string;
  buyer: { id: string; name: string; email: string; phone: string | null } | null;
  shippingAddress: {
    recipientName?: string; phoneNumber?: string; addressLine1?: string; addressLine2?: string | null;
    city?: string; state?: string; zipCode?: string; country?: string | null;
  } | null;
  sellerOrders: AdminSellerOrder[];
  subtotal: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  couponCode?: string | null;
  couponDiscountTotal?: number;
  giftCardDiscountTotal?: number;
  campaignDiscountTotal?: number;
  autoDiscountTotal?: number;
  subscriberDiscountTotal?: number;
  paymentType: AdminPaymentType;
  paymentStatus: AdminPaymentStatus;
  isPaid: boolean;
  paidAt: string | null;
  orderStatus: AdminOrderStatus;
  /** Only set when at least one package needs a street address (physical/mixed fulfillment). */
  addressWarnings?: { code: string; text: string }[];
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

export function apiAdminListOrders(query: AdminOrdersQuery = {}) {
  return client.get<never, ApiResponse<{ items: AdminOrderRow[]; total: number; page: number; limit: number; byPaymentStatus: Record<string, number> }>>(
    '/api/admin/orders', { params: query },
  );
}

export function apiAdminGetOrder(id: string) {
  return client.get<never, ApiResponse<AdminOrderDetail>>(`/api/admin/orders/${id}`);
}

// ── Manual order creation (admin places an order on a buyer's behalf) ─────────

export interface ManualOrderVariant {
  id: string;
  price: number;
  currency: string;
  stock: number;
  unlimitedStock: boolean;
  options: { name: string; value: string }[];
  sku: string | null;
  isDefault: boolean;
}

export interface ManualOrderProduct {
  id: string;
  name: string;
  image: string | null;
  type: 'physical' | 'digital';
  storeId: string;
  storeName: string;
  variants: ManualOrderVariant[];
}

export interface CreateManualOrderPayload {
  buyerId: string;
  productId: string;
  variantId: string;
  quantity: number;
  /** A fresh address for this order — saved to the buyer's account (`AddressService.addAddress`), same as the buyer's own checkout form. */
  address?: AddressPayload;
  shippingZoneId?: string;
  reason: string;
}

/** `q` must be at least 2 characters — shorter queries return no results without hitting the database. */
export function apiAdminSearchManualOrderProducts(q: string) {
  return client.get<never, ApiResponse<{ items: ManualOrderProduct[] }>>('/api/admin/orders/manual/products', { params: { q } });
}

export function apiAdminCreateManualOrder(payload: CreateManualOrderPayload) {
  return client.post<never, ApiResponse<{ orderId: string; orderNumber: string }>>('/api/admin/orders/manual', payload);
}
