import client from '../client';

// GET /api/platform-config/public — no auth. Safe subset of the admin-managed
// platform config: social links (only the ones set) + payout schedule.

export type SocialNetwork = 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'x';

export interface PublicPlatformConfig {
  socialLinks: Partial<Record<SocialNetwork, string>>;
  payout: {
    /** 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'manual' */
    frequency: string;
  };
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

export function apiGetPublicPlatformConfig() {
  return client.get<never, ApiResponse<PublicPlatformConfig>>('/api/platform-config/public');
}
