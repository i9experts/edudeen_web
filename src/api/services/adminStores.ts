import client from '../client';

interface ApiResponse<T> { success: boolean; message?: string; data: T }

export interface CreateStoreForSellerPayload {
  sellerId?: string;
  newSeller?: { name: string; email: string; phone?: string };
  store: { name: string; categoryId?: string; baseCurrency: string; description?: string };
}

export interface CreatedStoreResult {
  store: { id: string; name: string; slug: string };
  seller: { id: string; email: string; name: string };
  createdSeller: boolean;
  emailSent: boolean;
}

export interface ManageSessionResult {
  accessToken: string;
  expiresInSeconds: number;
  store: { id: string; name: string; slug: string };
}

/** Admin creates a store for a seller. Needs the admin password (client.ts asks for it on REAUTH_REQUIRED). */
export async function apiCreateStoreForSeller(payload: CreateStoreForSellerPayload): Promise<CreatedStoreResult> {
  const res = await client.post<never, ApiResponse<CreatedStoreResult>>('/api/admin/stores', payload);
  return res.data;
}

/** 30-minute, store-locked seller session for the admin. */
export async function apiStartManageSession(storeId: string): Promise<ManageSessionResult> {
  const res = await client.post<never, ApiResponse<ManageSessionResult>>(`/api/admin/stores/${storeId}/manage-session`, {});
  return res.data;
}
