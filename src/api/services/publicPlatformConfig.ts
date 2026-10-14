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
  /** 'Made by you' seller invitation block (shown to non-buyers). */
  creatorEyebrow?: string; creatorHeading?: string; creatorText?: string; creatorLinkLabel?: string;
  googlePlayUrl?: string;
  /** Set once an iOS app is live; until then the App Store badge says 'coming soon'. */
  appStoreUrl?: string;
  about?: AboutContent;
  /** Admin-written legal pages, keyed by route (privacy-policy, terms-of-service, cookie-policy). */
  legalPages?: Record<string, { text?: string; lastUpdated?: string }>;
}

/** Admin-editable /become-a-seller page. Missing/blank = built-in default (components/seller-page/sellerPageDefaults.ts). */
export type SellerPageIcon = 'star' | 'book' | 'users' | 'store' | 'chart' | 'bell' | 'headphones' | 'shield' | 'wallet' | 'sparkles' | 'globe' | 'check' | 'heart' | 'graduation';
export type SellerPageMock = 'store' | 'sales' | 'followers' | 'none';
export type SellerPageSectionKey = 'hero' | 'stats' | 'plans' | 'steps' | 'featureRows' | 'benefits' | 'whoSells' | 'supportCards' | 'faqs' | 'finalCta';
export interface SellerPageCard { title: string; text: string; icon: SellerPageIcon }
export interface SellerPageFeatureRow { title: string; text: string; imageUrl: string; mockKind: SellerPageMock; bullets: string[] }
export interface SellerPageSupportCard { title: string; text: string; ctaLabel: string; ctaLink: string }
export interface SellerPageHeadings { plans: string; plansHighlight: string; steps: string; featureRows: string; benefits: string; whoSells: string; support: string; faqs: string }
export interface SellerPageContent {
  hero?: { eyebrow?: string; title?: string; highlight?: string; text?: string; primaryCta?: string; secondaryCta?: string; imageUrl?: string };
  stats?: { buyers?: string; stores?: string; sales?: string };
  headings?: Partial<SellerPageHeadings>;
  steps?: SellerPageCard[];
  featureRows?: SellerPageFeatureRow[];
  benefits?: SellerPageCard[];
  whoSells?: SellerPageCard[];
  supportCards?: SellerPageSupportCard[];
  faqs?: { q: string; a: string }[];
  finalCta?: { title?: string; text?: string; button?: string };
  visible?: Partial<Record<SellerPageSectionKey, boolean>>;
}

export interface PublicPlatformConfig {
  socialLinks: Partial<Record<SocialNetwork, string>>;
  homeContent?: HomeContent;
  sellerPage?: SellerPageContent;
  payout: {
    /** 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'manual' */
    frequency: string;
  };
}

interface ApiResponse<T> { success: boolean; message?: string; data: T }

export function apiGetPublicPlatformConfig() {
  return client.get<never, ApiResponse<PublicPlatformConfig>>('/api/platform-config/public');
}
