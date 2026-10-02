import client from '../client';

export type AdminOrderStatus = 'pending' | 'processing' | 'partially_shipped' | 'completed' | 'cancelled';
export type AdminPaymentStatus = 'unpaid' | 'pending_verification' | 'paid' | 'failed' | 'refunded';
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
  stores: { id: string; name: string; status: string }[];
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
