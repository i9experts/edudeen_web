import type { PromotionPlacement } from '@/api/services/banner';

/** Light copy of the admin banner placement names (kept out of the admin page chunk so the public bundle stays small). */
export const PLACEMENT_NAME: Record<PromotionPlacement, string> = {
  homepageHero: 'Homepage Hero',
  marketplaceHero: 'Marketplace Hero',
  educationHero: 'Education Marketplace Hero',
  categoryHero: 'Category Hero',
  productPage: 'Product Page Banner',
};

/** Where each placement is shown (for the sidebar). */
export const PLACEMENT_WHERE: Record<PromotionPlacement, string> = {
  homepageHero: 'Home page',
  marketplaceHero: 'Search / marketplace page',
  educationHero: 'Learn hub',
  categoryHero: 'Category pages',
  productPage: 'Product pages',
};
