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
  /** Present only on requests made with a fixed reason + evidence. */
  reasonCode?:         string | null;
  note?:               string | null;
  evidenceImages?:     string[];
  status:              RefundRequestStatus;
  /** Tracking-only step after approval. */
  followUp?:           FollowUpStep | null;
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
  /** 3–500 characters (backend-validated); optional when reasonCode is sent. */
  reason?:       string;
  reasonCode?:   RefundReasonCode;
  /** 20–1000 characters, required with reasonCode. */
  note?:         string;
  /** Up to 4 uploaded image URLs, physical items only. */
  evidenceImages?: string[];
}

/** The ONE reason list (mirror of the API's REFUND_REASON_CODES, refund-evidence.util.ts). */
export const REFUND_REASON_OPTIONS = [
  { code: 'damaged',                label: 'Item arrived damaged' },
  { code: 'missing_pages',          label: 'Missing pages or parts' },
  { code: 'printing_error',         label: 'Printing error' },
  { code: 'wrong_item',             label: 'Wrong item received' },
  { code: 'wrong_edition_or_class', label: 'Wrong edition or class' },
  { code: 'not_as_described',       label: 'Not as described' },
  { code: 'digital_not_working',    label: 'Digital file is not working' },
  { code: 'other',                  label: 'Other' },
] as const;
export type RefundReasonCode = typeof REFUND_REASON_OPTIONS[number]['code'];
/** Codes stored by earlier versions: still shown as written, never offered. */
const LEGACY_REASON_LABELS: Record<string, string> = {
  incomplete: 'Incomplete (missing parts or pages)',
  cant_access_file: "Can't access the digital file",
};
export const refundReasonLabel = (code?: string | null) =>
  REFUND_REASON_OPTIONS.find(o => o.code === code)?.label ?? (code ? LEGACY_REASON_LABELS[code] ?? null : null);
export const REFUND_MAX_PHOTOS = 4;
export const REJECT_REASON_MIN = 10;

/** Tracking-only steps after approval (no money). */
export type FollowUpStep = 'item_received' | 'replacement_sent';
export const FOLLOW_UP_LABEL: Record<FollowUpStep, string> = {
  item_received: 'Item received back',
  replacement_sent: 'Replacement sent',
};

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

/** notes: at least REJECT_REASON_MIN characters (the buyer sees them). */
export function apiRejectRefundRequest(id: string, notes: string) {
  return client.patch<never, ApiResponse<RefundRequest>>(ENDPOINTS.REFUND_REQUEST.REJECT(id), { notes });
}

/** PATCH /api/refund-request/:id/follow-up — tracking only, no money. */
export function apiFollowUpRefundRequest(id: string, step: FollowUpStep, note?: string) {
  return client.patch<never, ApiResponse<{ followUp: FollowUpStep }>>(`/api/refund-request/${id}/follow-up`, { step, ...(note?.trim() ? { note: note.trim() } : {}) });
}
