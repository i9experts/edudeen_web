import type { AxiosRequestConfig } from 'axios';
import client from '../client';

/** POST /api/admin/reauth/verify-password - step-up check for the inline site editor. Never log the password. */
export function apiVerifyAdminPassword(password: string) {
  return client.post<never, { success: boolean; data: { reauthToken: string; expiresInSeconds: number } }>(
    '/api/admin/reauth/verify-password', { password },
  );
}

/** Extra request config that marks a write as an inline edit and proves the password was just confirmed. */
export function inlineEditConfig(reauthToken: string): AxiosRequestConfig {
  return { headers: { 'X-Inline-Edit': '1', 'X-Admin-Reauth': reauthToken } };
}