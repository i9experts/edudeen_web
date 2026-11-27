import client from '../client';

export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected';
export type KycSellerType = 'individual' | 'company';
export type KycIdType = 'cnic' | 'passport' | 'national_id' | 'driving_licence';
export type KycDocumentType = 'id_front' | 'id_back' | 'registration_certificate' | 'bank_proof';

export const KYC_ID_TYPES: { value: KycIdType; label: string }[] = [
  { value: 'national_id',     label: 'National ID card' },
  { value: 'cnic',            label: 'CNIC (Pakistan)' },
  { value: 'passport',        label: 'Passport' },
  { value: 'driving_licence', label: 'Driving licence' },
];
export const kycIdTypeLabel = (t: string | null) => KYC_ID_TYPES.find(x => x.value === t)?.label ?? '—';

export const KYC_DOC_LABEL: Record<KycDocumentType, string> = {
  id_front: 'ID front side',
  id_back: 'ID back side',
  registration_certificate: 'Business registration certificate',
  bank_proof: 'Bank statement or cheque',
};

export interface KycAddress { country: string | null; state: string | null; city: string | null; line: string | null }
export interface KycDocumentView { type: KycDocumentType; fileName: string; uploadedAt: string; viewUrl: string | null }

export interface MyKyc {
  status: KycStatus;
  editable: boolean;
  sellerType: KycSellerType | null;
  address: KycAddress;
  idType: KycIdType | null;
  fullName: string | null;
  idNumberMasked: string | null;
  taxNumberMasked: string | null;
  legalBusinessName: string | null;
  registrationNumber: string | null;
  bankAccountHolder: string | null;
  bankName: string | null;
  documents: KycDocumentView[];
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  missing: string[];
  history: { action: string; note: string | null; at: string }[];
}

/** Only the fields being changed. idNumber / taxNumber are sent in full once and come back masked. */
export interface KycDraftPayload {
  sellerType?: KycSellerType | null;
  idType?: KycIdType | null;
  fullName?: string;
  idNumber?: string;
  taxNumber?: string;
  legalBusinessName?: string;
  registrationNumber?: string;
  bankAccountHolder?: string;
  bankName?: string;
  address?: Partial<KycAddress>;
}

type Res<T> = { success: boolean; data: T };

export function apiGetMyKyc() {
  return client.get<never, Res<MyKyc>>('/api/seller/kyc');
}
export function apiSaveKyc(payload: KycDraftPayload) {
  return client.put<never, Res<MyKyc>>('/api/seller/kyc', payload);
}
export function apiUploadKycDocument(type: KycDocumentType, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return client.post<never, Res<MyKyc>>(`/api/seller/kyc/documents/${type}`, fd);
}
export function apiSubmitKyc() {
  return client.post<never, Res<MyKyc>>('/api/seller/kyc/submit');
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminKycRow {
  id: string;
  sellerId: string;
  sellerName: string | null;
  sellerEmail: string | null;
  status: KycStatus;
  sellerType: KycSellerType | null;
  fullName: string | null;
  legalBusinessName: string | null;
  country: string | null;
  nameMismatchFlagged: boolean;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface AdminKycDetail {
  id: string;
  sellerId: string;
  seller: { name: string | null; email: string | null; phone: string | null; status: string | null; joinedAt: string | null } | null;
  stores: { id: string; name: string; slug: string; status: string }[];
  status: KycStatus;
  sellerType: KycSellerType | null;
  address: Partial<KycAddress>;
  idType: KycIdType | null;
  fullName: string | null;
  idNumber: string | null;
  taxNumber: string | null;
  legalBusinessName: string | null;
  registrationNumber: string | null;
  bankAccountHolder: string | null;
  bankName: string | null;
  nameMismatchFlagged: boolean;
  documents: KycDocumentView[];
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  history: { action: string; note: string | null; actorRole: string; at: string }[];
}

export function apiAdminListKyc(params: { status?: KycStatus; search?: string; page?: number }) {
  return client.get<never, Res<{ items: AdminKycRow[]; total: number; page: number; limit: number; counts: Partial<Record<KycStatus, number>> }>>(
    '/api/admin/seller-kyc', { params });
}
export function apiAdminGetKyc(id: string) {
  return client.get<never, Res<AdminKycDetail>>(`/api/admin/seller-kyc/${id}`);
}
export function apiAdminDecideKyc(id: string, decision: 'approve' | 'reject' | 'revoke', reason?: string) {
  return client.patch<never, Res<{ id: string; status: KycStatus }>>(`/api/admin/seller-kyc/${id}/decision`, { decision, reason });
}
