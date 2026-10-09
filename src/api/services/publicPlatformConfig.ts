import client from '../client';

// GET /api/platform-config/public — no auth. Safe subset of the admin-managed
// platform config: social links (only the ones set) + payout schedule.

export type SocialNetwork = 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'x';

/** Admin-editable homepage copy (Admin → Platform Config → Homepage content). Blank/missing = built-in default. */
/** Admin-editable About page copy. Blank/missing = built-in text. */
export interface AboutContent {
  eyebrow?: string; heading?: string; intro?: string;
  pillars?: { title: string; desc: string }[];
  approachEyebrow?: string; approachHeading?: string; approachText?: string;
  headedEyebrow?: string; headedHeading?: string; headedText?: string;
  ctaHeading?: string; ctaButton?: string;
}

export interface HomeContent {
  heroEyebrow?: string; heroTitle?: string; heroHighlight?: string; heroText?: string;
  heroPrimaryLabel?: string; heroSecondaryLabel?: string; heroBadge?: string; heroImageUrl?: string;
  promiseItems?: string[];
  trustItems?: { label: string; sub: string }[];
  featureEyebrow?: string; featureHeading?: string; featureText?: string; featureLinkLabel?: string;
  /** Name (or part of it) of the category the hero's second button and the feature block open. */
  featuredCategory?: string;
  googlePlayUrl?: string;
  /** Set once an iOS app is live; until then the App Store badge says 'coming soon'. */
  appStoreUrl?: string;
  about?: AboutContent;
  /** Admin-written legal pages, keyed by route (privacy-policy, terms-of-service, cookie-policy). */
  legalPages?: Record<string, { text?: string; lastUpdated?: string }>;
}

export interface PublicPlatformConfig {
  socialLinks: Partial<Record<SocialNetwork, string>>;
  homeContent?: HomeContent;
  payout: {
    /** 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'manual' */
    frequency: string;
  };
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

export function apiGetPublicPlatformConfig() {
  return client.get<never, ApiResponse<PublicPlatformConfig>>('/api/platform-config/public');
}
