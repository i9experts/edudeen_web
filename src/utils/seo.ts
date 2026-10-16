/** Canonical site origin for canonical/og URLs (never localhost, so previews and crawlers agree). */
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, '') || 'https://edudeen.com';
export const SITE_NAME = 'Edudeen';
/** Branded 1200x630 share card (public/og-default.svg is the source; the PNG is what crawlers fetch). */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;
