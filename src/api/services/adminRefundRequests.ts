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
export function apiAdminListPendingRefunds(params: { page?: number; limit?: number } = {}) {
  return client.get<never, ApiResponse<RefundRequestPage>>(ENDPOINTS.REFUND_REQUEST.ADMIN_PENDING, {
    params: { page: params.page ?? 1, limit: params.limit ?? 20 },
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
