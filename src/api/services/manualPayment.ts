import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type ManualPaymentProofStatus = 'pending' | 'approved' | 'rejected';

export interface ManualPaymentBankDetails {
  /** The seller (store) the buyer pays directly. */
  payeeName?: string | null;
  bankName: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  iban: string | null;
  jazzcashNumber: string | null;
  easypaisaNumber: string | null;
  instructions: string | null;
  usdToPkrRate: number;
}

export interface ManualPaymentOrderSummary {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  currency: string;
}

export interface ManualPaymentProof {
  _id: string;
  userId: string;
  checkoutId: string;
  orderIds: string[];
  amountUSD: number;
  amountPKR: number;
  fxRateUsed: number;
  proofImageUrl: string | null;
  transactionReference: string | null;
  /** Advisory AI read of the receipt screenshot (bank transfers paid to a seller). */
  receiptCheck?: { status: 'match' | 'mismatch' | 'unreadable' | 'skipped'; amountRead: number | null; note: string } | null;
  senderName: string | null;
  status: ManualPaymentProofStatus;
  reviewedByAdminId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  reuploadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminManualPaymentProof extends ManualPaymentProof {
  buyerName: string;
  buyerEmail: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUYER
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetManualPaymentBankDetails(checkoutId: string) {
  return client.get<never, { success: boolean; data: ManualPaymentBankDetails }>(ENDPOINTS.MANUAL_PAYMENT.BANK_DETAILS, { params: { checkoutId } });
}

export function apiSubmitManualPayment(
  checkoutId: string,
  file: File,
  fields: { transactionReference?: string; senderName?: string },
  idempotencyKey: string,
) {
  const fd = new FormData();
  fd.append('checkoutId', checkoutId);
  fd.append('file', file);
  if (fields.transactionReference) fd.append('transactionReference', fields.transactionReference);
  if (fields.senderName) fd.append('senderName', fields.senderName);
  return client.post<never, { success: boolean; message: string; data: { proof: ManualPaymentProof; orders: ManualPaymentOrderSummary[] } }>(
    ENDPOINTS.MANUAL_PAYMENT.SUBMIT, fd, { headers: { 'Idempotency-Key': idempotencyKey } },
  );
}

export function apiGetMyManualPayments() {
  return client.get<never, { success: boolean; data: ManualPaymentProof[] }>(ENDPOINTS.MANUAL_PAYMENT.LIST_MINE);
}

export function apiGetManualPaymentStatus(proofId: string) {
  return client.get<never, { success: boolean; data: ManualPaymentProof }>(ENDPOINTS.MANUAL_PAYMENT.STATUS(proofId));
}

export function apiReuploadManualPayment(
  proofId: string,
  file: File,
  fields: { transactionReference?: string; senderName?: string },
) {
  const fd = new FormData();
  fd.append('file', file);
  if (fields.transactionReference) fd.append('transactionReference', fields.transactionReference);
  if (fields.senderName) fd.append('senderName', fields.senderName);
  return client.post<never, { success: boolean; message: string; data: ManualPaymentProof }>(
    ENDPOINTS.MANUAL_PAYMENT.REUPLOAD(proofId), fd,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export interface AdminManualPaymentQueue {
  proofs: AdminManualPaymentProof[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function apiAdminListManualPayments(status?: ManualPaymentProofStatus, page = 1, limit = 20) {
  return client.get<never, { success: boolean; data: AdminManualPaymentQueue }>(ENDPOINTS.MANUAL_PAYMENT.ADMIN.LIST, {
    params: { status, page, limit },
  });
}

export function apiAdminGetManualPayment(proofId: string) {
  return client.get<never, { success: boolean; data: AdminManualPaymentProof }>(ENDPOINTS.MANUAL_PAYMENT.ADMIN.GET(proofId));
}

export function apiAdminApproveManualPayment(proofId: string) {
  return client.patch<never, { success: boolean; data: ManualPaymentProof }>(ENDPOINTS.MANUAL_PAYMENT.ADMIN.APPROVE(proofId));
}

export function apiAdminRejectManualPayment(proofId: string, reason: string) {
  return client.patch<never, { success: boolean; data: ManualPaymentProof }>(ENDPOINTS.MANUAL_PAYMENT.ADMIN.REJECT(proofId), { reason });
}

// ─────────────────────────────────────────────────────────────────────────────
// SELLER — direct bank transfers (the buyer pays the seller's own account)
// ─────────────────────────────────────────────────────────────────────────────
export interface StorePaymentSettings {
  bankName: string | null; accountTitle: string | null; accountNumber: string | null; iban: string | null;
  jazzcashNumber: string | null; easypaisaNumber: string | null; instructions: string | null;
}

export function apiGetStorePaymentSettings(storeId: string) {
  return client.get<never, { success: boolean; data: { directPayment: StorePaymentSettings | null; enabled: boolean } }>(`/api/seller/manual-payments/${storeId}/settings`);
}
export function apiSaveStorePaymentSettings(storeId: string, body: Partial<StorePaymentSettings>) {
  return client.put<never, { success: boolean; data: { directPayment: StorePaymentSettings | null; enabled: boolean } }>(`/api/seller/manual-payments/${storeId}/settings`, body);
}
export function apiGetSellerTransferProofs(storeId: string, status?: ManualPaymentProofStatus) {
  return client.get<never, { success: boolean; data: { proofs: AdminManualPaymentProof[]; total: number } }>(`/api/seller/manual-payments/${storeId}/proofs`, { params: { status, limit: 30 } });
}
export function apiGetSellerProofUrl(storeId: string, proofId: string) {
  return client.get<never, { success: boolean; data: { url: string | null } }>(`/api/seller/manual-payments/${storeId}/proofs/${proofId}/proof-url`);
}
export function apiSellerApproveTransfer(storeId: string, proofId: string) {
  return client.patch<never, { success: boolean }>(`/api/seller/manual-payments/${storeId}/proofs/${proofId}/approve`);
}
export function apiSellerRejectTransfer(storeId: string, proofId: string, reason: string) {
  return client.patch<never, { success: boolean }>(`/api/seller/manual-payments/${storeId}/proofs/${proofId}/reject`, { reason });
}