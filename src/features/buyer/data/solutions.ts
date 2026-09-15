import type { StockPhotoKey } from '@/assets/stockPhotos';

export interface Solution {
  slug: string;
  name: string;
  headline: string;
  subtext: string;
  image: StockPhotoKey;
  highlights: string[];
}

// Positioning copy about how Edudeen's real, existing capabilities apply to
// each industry — not fabricated data or invented customer claims.
export const SOLUTIONS: Solution[] = [
  {
    slug: 'retail',
    name: 'Retail',
    headline: 'Retail, in-store and online, on one system.',
    subtext: 'Run a storefront and a POS counter off the exact same product catalog and stock counts — no separate spreadsheet to keep in sync.',
    image: 'fashionRack',
    highlights: ['Shared inventory between storefront and POS', 'Per-variant stock tracking', 'Order management across both channels'],
  },
  {
    slug: 'fashion',
    name: 'Fashion',
    headline: 'Sell fashion the way it actually works.',
    subtext: 'Size and color variants, a themeable storefront that fits your brand, and stock tracking that never mixes up a small and a large.',
    image: 'sneakers',
    highlights: ['Per-variant stock (size/color)', 'Curated storefront themes', 'AI-assisted product descriptions'],
  },
  {
    slug: 'restaurants',
    name: 'Restaurants & Food',
    headline: 'A counter-ready POS for food and drink.',
    subtext: 'Fast PIN-based staff login and a real till workflow, built for a counter that can\'t afford to slow down at rush hour.',
    image: 'coffeeShop',
    highlights: ['PIN employee login for fast shift changes', 'Register session tracking', 'Works with or without an online storefront'],
  },
  {
    slug: 'beauty',
    name: 'Beauty & Cosmetics',
    headline: 'A storefront built for beauty and skincare.',
    subtext: 'Product photography-forward storefront themes, plus loyalty tools to turn one-time buyers into repeat customers.',
    image: 'skincare',
    highlights: ['Image-forward storefront themes', 'Loyalty points & tiers', 'AI-assisted product descriptions'],
  },
  {
    slug: 'creators',
    name: 'Creators & Digital Sellers',
    headline: 'Sell digital products without the busywork.',
    subtext: 'Digital delivery, no inventory counts to manage, and AI Studio for the product copy you don\'t have time to write.',
    image: 'cameraGear',
    highlights: ['Digital product delivery, no stock tracking needed', 'AI-assisted product descriptions', 'Your own branded storefront'],
  },
  {
    slug: 'small-business',
    name: 'Small Business',
    headline: 'Everything a small team needs, in one place.',
    subtext: 'Store, POS, orders, customers and analytics under one login — instead of stitching together five separate tools.',
    image: 'workspaceLaptop',
    highlights: ['Store + POS + Analytics in one workspace', 'One order list across every sales channel', 'Self-serve setup, no approval queue to wait on'],
  },
];

export function getSolution(slug: string): Solution | undefined {
  return SOLUTIONS.find(s => s.slug === slug);
}
