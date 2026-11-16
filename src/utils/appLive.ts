/** App promos (side card, product-page banner, open-app prompt) stay OFF until the app is public: build with VITE_APP_LIVE=true. */
export const APP_LIVE = import.meta.env.VITE_APP_LIVE === 'true';

/**
 * Gates ONLY the new bundle surfaces (product-page "Also in: <bundle>" line, and any future "Class N complete set" page).
 * Existing store bundles, the cart bundle discount and "Add all to cart" are NOT affected. Build with VITE_BUNDLES_ENABLED=true.
 */
export const BUNDLES_ENABLED = import.meta.env.VITE_BUNDLES_ENABLED === 'true';
