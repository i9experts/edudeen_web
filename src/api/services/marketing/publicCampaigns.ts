import client from '../../client';
import { ENDPOINTS } from '../../endpoints';
import { cachedRequest } from '../requestCache';

export interface PublicCampaign {
  _id: string;
  slug: string;
  name: string;
  description: string | null;
  bannerImage: string | null;
  backgroundImage?: string | null;
  endDate: string;
  /** Edudeen Premium members only: the sale is not public yet; startDate is when it opens to everyone. */
  earlyAccess?: boolean;
  startDate?: string | null;
  /** Published by the admin but not started yet (only returned when `includeUpcoming` is asked for). */
  comingSoon?: boolean;
  discountType: 'percentage' | 'fixed' | null;
  discountValue: number | null;
  /** Only meaningful when discountType === 'fixed' — always 'USD' (the platform pivot). */
  currency: string | null;
  // 'platform': applies to every active store automatically — storeCount
  // below is the platform's total active-store count, not an opt-in tally.
  sponsorType: 'seller' | 'platform';
  storeCount: number;
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

/** Public — no auth required. Active platform-wide sale campaigns for the buyer marketplace/homepage banner.
 * `storeType` (e.g. 'educational_resources') scopes seller-sponsored campaigns to only those with a
 * participating store of that type — platform-sponsored campaigns are unaffected either way. */
export function apiGetPublicActiveCampaigns(storeType?: string, includeUpcoming = false) {
  const params = { ...(storeType ? { storeType } : {}), ...(includeUpcoming ? { includeUpcoming: '1' } : {}) };
  return cachedRequest(`public-campaigns:${storeType ?? ''}:${includeUpcoming ? 'up' : ''}`, 5000, () =>
    client.get<never, ApiResponse<PublicCampaign[]>>(ENDPOINTS.MARKETING.PUBLIC_CAMPAIGNS, { params: Object.keys(params).length ? params : undefined }));
}
