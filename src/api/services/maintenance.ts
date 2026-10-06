import client from '@/api/client';

export type MaintenanceScope = 'all' | 'buyer' | 'seller' | 'checkout' | 'uploads';
export type MaintenanceType = 'scheduled_upgrade' | 'database' | 'payments' | 'security' | 'performance' | 'emergency' | 'other';

/** What is down — shown to admins when picking, and to users on the maintenance page. */
export const MAINTENANCE_SCOPE_INFO: Record<MaintenanceScope, { label: string; hint: string }> = {
  all:      { label: 'Whole platform',        hint: 'Everything except admin tools and sign-in' },
  buyer:    { label: 'Shopping & browsing',   hint: 'Home, search, categories, product pages, reviews, wishlist' },
  seller:   { label: 'Seller dashboards',     hint: 'Store management, products, finance, marketing' },
  checkout: { label: 'Checkout & payments',   hint: 'Placing orders, card and bank-transfer payments' },
  uploads:  { label: 'File uploads',          hint: 'Images, digital files and payment proofs' },
};

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
  updatedAt?: string | null;
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
}