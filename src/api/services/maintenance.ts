import client from '@/api/client';

export type MaintenanceFeature =
  | 'flash_sale' | 'search' | 'categories' | 'product_page' | 'cart' | 'reviews' | 'messaging' | 'stores' | 'learn' | 'orders';
export type BaseMaintenanceScope = 'all' | 'buyer' | 'seller' | 'checkout' | 'uploads';
export type MaintenanceScope = BaseMaintenanceScope | `feature:${MaintenanceFeature}`;
export type MaintenanceType = 'scheduled_upgrade' | 'database' | 'payments' | 'security' | 'performance' | 'emergency' | 'other';

/** Whole areas an admin can take down. */
export const MAINTENANCE_AREA_INFO: Record<BaseMaintenanceScope, { label: string; hint: string }> = {
  all:      { label: 'Whole platform',        hint: 'Everything except admin tools and sign-in' },
  buyer:    { label: 'Shopping & browsing',   hint: 'Home, search, categories, product pages, reviews, wishlist' },
  seller:   { label: 'Seller dashboards',     hint: 'Store management, products, finance, marketing' },
  checkout: { label: 'Checkout & payments',   hint: 'Placing orders, card and bank-transfer payments' },
  uploads:  { label: 'File uploads',          hint: 'Images, digital files and payment proofs' },
};

/** Single features / pages — everything else keeps working; users see the admin's message in that spot. */
export const MAINTENANCE_FEATURE_INFO: Record<MaintenanceFeature, { label: string; hint: string }> = {
  flash_sale:   { label: 'Flash sale & deals',   hint: 'Flash-sale section, deals banner and sale countdowns' },
  search:       { label: 'Search',               hint: 'The search box suggestions and the search results page' },
  categories:   { label: 'Category pages',       hint: 'Browsing a category or sub-category' },
  product_page: { label: 'Product pages',        hint: 'Opening a product (details, previews, "also bought")' },
  cart:         { label: 'Cart & wishlist',      hint: 'The cart and saved items' },
  reviews:      { label: 'Reviews',              hint: 'Reading and writing reviews' },
  messaging:    { label: 'Messages',             hint: 'Buyer–seller chat' },
  stores:       { label: 'Stores',               hint: 'Seller storefronts and store search' },
  learn:        { label: 'Learn by grade',       hint: 'The grade and curriculum landing pages' },
  orders:       { label: 'My orders',            hint: 'Order history and tracking' },
};

export const MAINTENANCE_FEATURES = Object.keys(MAINTENANCE_FEATURE_INFO) as MaintenanceFeature[];

export const featureScope = (f: MaintenanceFeature): MaintenanceScope => `feature:${f}`;

/** Human label for any scope (area or feature). */
export function scopeLabel(s: string): string {
  if (s.startsWith('feature:')) return MAINTENANCE_FEATURE_INFO[s.slice(8) as MaintenanceFeature]?.label ?? s;
  return MAINTENANCE_AREA_INFO[s as BaseMaintenanceScope]?.label ?? s;
}

/** Kept for existing imports: area info by scope. */
export const MAINTENANCE_SCOPE_INFO = MAINTENANCE_AREA_INFO;

/** The kind of work — each one is what big platforms announce, in plain words. */
export const MAINTENANCE_TYPE_INFO: Record<MaintenanceType, { label: string; blurb: string; defaultTitle: string; defaultMessage: string }> = {
  scheduled_upgrade: { label: 'Scheduled upgrade',    blurb: 'Planned improvements and new features',
    defaultTitle: 'Scheduled upgrade in progress', defaultMessage: "We're rolling out improvements to Edudeen. Everything will be back shortly." },
  database:          { label: 'Database maintenance', blurb: 'Moving or optimising data — orders and accounts are safe',
    defaultTitle: 'Database maintenance', defaultMessage: "We're optimising our databases to keep Edudeen fast. Your orders, downloads and account data are safe." },
  payments:          { label: 'Payments maintenance', blurb: 'Payment provider or bank-transfer work',
    defaultTitle: 'Payments are temporarily unavailable', defaultMessage: "We're updating our payment systems. You can still browse; please try checkout again soon. You will not be charged during this time." },
  security:          { label: 'Security update',      blurb: 'Patching or hardening the platform',
    defaultTitle: 'Security update in progress', defaultMessage: "We're applying an important security update to keep your account and payments protected." },
  performance:       { label: 'Performance tuning',   blurb: 'Speeding up servers and search',
    defaultTitle: 'Performance improvements', defaultMessage: "We're making Edudeen faster. This should only take a few minutes." },
  emergency:         { label: 'Emergency fix',        blurb: 'An unexpected problem is being repaired',
    defaultTitle: "We're fixing a problem", defaultMessage: "Something unexpected came up and our team is already fixing it. Thank you for your patience." },
  other:             { label: 'Other maintenance',    blurb: 'Anything else',
    defaultTitle: 'Under maintenance', defaultMessage: "We're doing some maintenance and will be back soon." },
};

export interface MaintenanceStatus {
  state: 'active' | 'scheduled' | 'off';
  scopes?: MaintenanceScope[];
  type?: MaintenanceType;
  title?: string;
  message?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  statusNote?: string;
  scopeMessages?: Record<string, { title?: string; message?: string }>;
  updatedAt?: string | null;
}

/** True when `feature` is currently down (maintenance live and that feature, or the whole platform / browsing side, is selected). */
export function isFeatureDown(status: MaintenanceStatus | null, feature: MaintenanceFeature): boolean {
  if (!status || status.state !== 'active') return false;
  const s = status.scopes ?? [];
  return s.includes(featureScope(feature)) || s.includes('all') || (s.includes('buyer') && feature !== 'orders' && feature !== 'messaging');
}

/** Public — read by the maintenance page and the site-wide notice. */
export function apiGetMaintenanceStatus() {
  return client.get<never, { success: boolean; data: MaintenanceStatus }>('/api/platform-config/maintenance');
}

export interface MaintenancePayload {
  maintenanceMode: boolean;
  scopes?: MaintenanceScope[];
  type?: MaintenanceType;
  title?: string;
  message?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  statusNote?: string;
  scopeMessages?: Record<string, { title?: string; message?: string }>;
}
