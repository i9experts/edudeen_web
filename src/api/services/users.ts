import client from '../client';
import { ENDPOINTS } from '../endpoints';
import { TokenStorage } from './auth';
import { getAuthCookie } from '@/utils/authCookie';

interface ApiResponse<T> { success: boolean; message?: string; data?: T }

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_RULES_TEXT = `Use at least ${PASSWORD_MIN_LENGTH} characters (max 72), different from your current password.`;

/** Client-side check mirroring the API's ChangePasswordDto. Returns an error message, or '' when valid. */
export function validateNewPassword(currentPassword: string, newPassword: string): string {
  if (!currentPassword) return 'Enter your current password.';
  if (newPassword.length < PASSWORD_MIN_LENGTH) return `New password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  if (newPassword.length > 72) return 'New password must be at most 72 characters long.';
  if (newPassword === currentPassword) return 'New password must be different from your current password.';
  return '';
}

/**
 * PUT /api/users/change-password
 * The API bumps the account's tokenVersion (signs out every other device), so the
 * response carries a FRESH token pair for this device. It must be stored, otherwise
 * this session's next request is rejected and the user is thrown out to /login.
 */
export async function apiChangePassword(payload: ChangePasswordPayload) {
  const res = await client.put<never, ApiResponse<{ token?: { accessToken?: string; refreshToken?: string } }>>(
    ENDPOINTS.USERS.CHANGE_PASSWORD, payload,
  );
  const t = res.data?.token;
  if (t?.accessToken && t?.refreshToken) {
    TokenStorage.save(t.accessToken, t.refreshToken, getAuthCookie('authRemember') !== '0');
  }
  return res;
}
/** PUT /api/users/logout-others — revokes every other session; this device keeps a fresh token pair. */
export async function apiLogoutOtherDevices() {
  const res = await client.put<never, ApiResponse<{ token?: { accessToken?: string; refreshToken?: string } }>>('/api/users/logout-others');
  const t = res.data?.token;
  if (t?.accessToken && t?.refreshToken) {
    TokenStorage.save(t.accessToken, t.refreshToken, getAuthCookie('authRemember') !== '0');
  }
  return res;
}
/** DELETE /api/users/profile — soft-deletes (deactivates) the account */
export function apiDeleteAccount() {
  return client.delete<never, ApiResponse<null>>(ENDPOINTS.USERS.DELETE_ACCOUNT);
}
