import client from '../../client';
import { ENDPOINTS } from '../../endpoints';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type AccountRole = 'buyer' | 'seller';

export interface AdminUsersStats {
  totalBuyers: number;
  activeSellerAccounts: number;
  suspended: number;
}

export interface AdminUsersQuery {
  role?: AccountRole;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AccountRow {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  plan: string;
  status: string;
  createdAt: string;
}

export interface AdminUsersListData {
  items: AccountRow[];
  total: number;
  page: number;
  limit: number;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────
export function apiGetAdminUsersStats() {
  return client.get<never, ApiResponse<AdminUsersStats>>(ENDPOINTS.USERS.ADMIN.STATS);
}

export function apiListAdminUsers(query: AdminUsersQuery = {}) {
  return client.get<never, ApiResponse<AdminUsersListData>>(ENDPOINTS.USERS.ADMIN.LIST, { params: query });
}

/** Full account document as `GET /api/admin/users/:role/:id` returns it
 *  (password/OTP/token fields stripped server-side). Seller-only fields are
 *  absent for buyers. */
export interface AdminAccountDetail {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  authProvider?: string | null;
  isVerified?: boolean;
  profileImage?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  isOnboarded?: boolean;
  storeId?: string | null;
  stripeConnectStatus?: 'not_connected' | 'pending' | 'active' | 'restricted';
}

export function apiGetAdminUserById(role: AccountRole, id: string) {
  return client.get<never, ApiResponse<AdminAccountDetail>>(ENDPOINTS.USERS.ADMIN.GET_BY_ID(role, id));
}

export function apiSuspendAccount(role: AccountRole, id: string) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.USERS.ADMIN.SUSPEND(role, id));
}

export function apiUnsuspendAccount(role: AccountRole, id: string) {
  return client.patch<never, ApiResponse<null>>(ENDPOINTS.USERS.ADMIN.UNSUSPEND(role, id));
}
