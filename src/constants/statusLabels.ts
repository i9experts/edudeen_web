import { STATUS_COLORS } from '@/constants/tokens';

/**
 * Single source of truth for status wording + colour (Phase 2).
 * - StatusBadge reads `statusLabel` / `statusColor` from here.
 * - `UI_LABELS` records the ONE word chosen per concept; use it for new UI copy
 *   and keep i18n/ur.ts in step.
 */
export type StatusTone = 'green' | 'yellow' | 'blue' | 'gray' | 'red' | 'orange';

/** Canonical (lower-case, snake_case) status -> label. Anything missing is title-cased. */
export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  pending_review: 'In review',
  under_review: 'In review',
  in_review: 'In review',
  processing: 'Processing',
  partially_shipped: 'Partially shipped',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
  active: 'Active',
  published: 'Published',
  draft: 'Draft',
  not_started: 'Not started',
  pending_verification: 'Pending verification',
  out_of_stock: 'Out of stock',
  low_stock: 'Low stock',
};

/** Extra colours that make the seven headline statuses identical everywhere. */
const EXTRA_COLORS: Record<string, StatusTone> = {
  pending: 'yellow',
  processing: 'blue',
  shipped: 'blue',
  delivered: 'green',
  completed: 'green',
  cancelled: 'red',
  canceled: 'red',
  in_review: 'blue',
  under_review: 'blue',
  pending_review: 'blue',
  active: 'green',
  draft: 'gray',
  published: 'green',
};

const norm = (s: string) => String(s ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

export function statusLabel(status: string): string {
  const key = norm(status);
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  const words = String(status ?? '').split(/[_\s]+/).filter(Boolean);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function statusColor(status: string): StatusTone {
  const key = norm(status);
  return EXTRA_COLORS[key] ?? STATUS_COLORS[status] ?? STATUS_COLORS[String(status ?? '').toLowerCase()] ?? STATUS_COLORS[key] ?? 'gray';
}

/**
 * One label per concept (B10). Decisions:
 *  - product status: "Active" for live products (API `active`); "Published" is only for content (blog/pages/courses).
 *  - person who buys: "Buyer" (never "User"/"Shopper"); seller-side lists of buyers say "Customers".
 *  - bookmarked products: "Saved" (route stays /account/wishlist).
 *  - store workspace shows the store name, not "Seller Studio".
 */
export const UI_LABELS = {
  productLive: 'Active',
  contentLive: 'Published',
  buyer: 'Buyer',
  sellerSideBuyers: 'Customers',
  savedItems: 'Saved',
  directory: 'Users',
} as const;
