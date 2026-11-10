import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — mirror edudeen_api/src/refund-request/schemas/refund-request.schema.ts
// ─────────────────────────────────────────────────────────────────────────────
export type RefundRequestStatus = 'pending' | 'approved' | 'rejected';

export interface RefundRequestRow {
  _id: string;
  orderId: string;
  sellerOrderId: string;
  storeId: string;
  itemIds: string[];
  requestedBy: string;
  requestedByRole: 'user' | 'seller' | 'admin';
  reason: string;
  reasonCode?: string | null;
  note?: string | null;
  evidenceImages?: string[];
  status: RefundRequestStatus;
  /** Filled in only once the request is approved (computed from the order's own item totals). */
  buyerRefundAmount: number | null;
  buyerRefundCurrency: string | null;
  sellerDebitAmount: number | null;
  sellerDebitCurrency: string | null;
  stripeRefundId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  /** Resolved server-side by the admin list endpoint only — null if the order/requester couldn't be found. */
  orderNumber: string | null;
  storeName: string | null;
  requester: { name: string; email: string } | null;
}

export interface AdminRefundsQuery {
  status?: RefundRequestStatus;
  storeId?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface RefundRequestPage {
  items: RefundRequestRow[];
  total: number;
  page: number;
  limit: number;
}

export interface RefundApprovalResult {
  buyerRefundAmount: number;
  buyerRefundCurrency: string;
  sellerDebitAmount: number;
  settlementCurrency: string;
  stripeRefundId: string | null;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN API
// ─────────────────────────────────────────────────────────────────────────────
/** Every status unless `status` narrows it, filterable by store/date/search. */
export function apiAdminListRefunds(params: AdminRefundsQuery = {}) {
  return client.get<never, ApiResponse<RefundRequestPage>>(ENDPOINTS.REFUND_REQUEST.ADMIN_LIST, {
    params: { page: params.page ?? 1, limit: params.limit ?? 20, status: params.status, storeId: params.storeId, q: params.q, from: params.from, to: params.to },
  });
}

export function apiAdminApproveRefund(id: string, idempotencyKey: string) {
  return client.patch<never, ApiResponse<RefundApprovalResult>>(
    ENDPOINTS.REFUND_REQUEST.APPROVE(id), undefined, { headers: { 'Idempotency-Key': idempotencyKey } },
  );
}

/** `notes` is required by the backend (3–500 chars). */
export function apiAdminRejectRefund(id: string, notes: string) {
  return client.patch<never, ApiResponse<RefundRequestRow>>(ENDPOINTS.REFUND_REQUEST.REJECT(id), { notes });
}
