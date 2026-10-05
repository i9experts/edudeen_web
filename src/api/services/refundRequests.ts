import client from '../client';
import { ENDPOINTS } from '../endpoints';

// Buyer-side item-level refund requests.
// Backend: src/refund-request (controller/service/schema/dto).
//   POST /api/refund-request              — auth (user/seller/admin), Idempotency-Key honoured
//   GET  /api/refund-request/order/:id    — auth; a buyer sees only their own order's requests

export type RefundRequestStatus = 'pending' | 'approved' | 'rejected';

/** Mirrors `RefundRequest` (refund-request.schema.ts) as serialised by the API. */
export interface RefundRequest {
  _id:                 string;
  orderId:             string;
  sellerOrderId:       string;
  storeId:             string;
  itemIds:             string[];
  requestedBy:         string;
  requestedByRole:     'user' | 'seller' | 'admin';
  reason:              string;
  status:              RefundRequestStatus;
  /** Set only once approved — in the buyer's order currency. */
  buyerRefundAmount:   number | null;
  buyerRefundCurrency: string | null;
  stripeRefundId:      string | null;
  reviewedAt:          string | null;
  resolutionNotes:     string | null;
  createdAt:           string;
  updatedAt:           string;
}

/** Mirrors `CreateRefundRequestDto` — one sellerOrder, one-or-more of its items. */
export interface CreateRefundRequestPayload {
  orderId:       string;
  sellerOrderId: string;
  itemIds:       string[];
  /** 3–500 characters (backend-validated). */
  reason:        string;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

function newIdempotencyKey(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* fall through */ }
  return `rr-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** POST /api/refund-request */
export function apiCreateRefundRequest(payload: CreateRefundRequestPayload, idempotencyKey = newIdempotencyKey()) {
  return client.post<never, ApiResponse<RefundRequest>>(
    '/api/refund-request', payload, { headers: { 'Idempotency-Key': idempotencyKey } },
  );
}

/** GET /api/refund-request/order/:orderId — newest first. */
export function apiListRefundRequestsForOrder(orderId: string) {
  return client.get<never, ApiResponse<RefundRequest[]>>(ENDPOINTS.REFUND_REQUEST.FOR_ORDER(orderId));
}

// ── Seller side ───────────────────────────────────────────────────────────────
//   GET   /api/refund-request/seller/:storeId  — the store's own queue (ownership checked)
//   PATCH /api/refund-request/:id/approve      — seller (own store) or admin; refunds the buyer
//   PATCH /api/refund-request/:id/reject       — with optional notes shown to the buyer

export function apiGetSellerRefundRequests(storeId: string, page = 1, limit = 20) {
  return client.get<never, ApiResponse<{ items: RefundRequest[]; total: number; page: number; limit: number }>>(
    `/api/refund-request/seller/${storeId}?page=${page}&limit=${limit}`,
  );
}

export function apiApproveRefundRequest(id: string, idempotencyKey = newIdempotencyKey()) {
  return client.patch<never, ApiResponse<RefundRequest>>(ENDPOINTS.REFUND_REQUEST.APPROVE(id), {}, { headers: { 'Idempotency-Key': idempotencyKey } });
}

export function apiRejectRefundRequest(id: string, notes: string) {
  return client.patch<never, ApiResponse<RefundRequest>>(ENDPOINTS.REFUND_REQUEST.REJECT(id), { notes });
}
