import type {
  SellerPageCard, SellerPageContent, SellerPageFeatureRow, SellerPageHeadings, SellerPageSectionKey, SellerPageSupportCard,
} from '@/api/services/publicPlatformConfig';

/**
 * Built-in text of /become-a-seller. The page renders `effectiveSellerPage()` and the
 * editors start from the SAME values, so an empty config shows today's page and the
 * admin always edits exactly what visitors read (same pattern as homeDefaults.ts).
 */
export const SELLER_PAGE_SECTIONS: { key: SellerPageSectionKey; label: string }[] = [
  { key: 'hero', label: 'Hero' },
  { key: 'stats', label: 'Live numbers' },
  { key: 'plans', label: 'Plans heading' },
  { key: 'steps', label: 'How it works steps' },
  { key: 'featureRows', label: 'Feature rows' },
  { key: 'benefits', label: 'Benefit cards' },
  { key: 'whoSells', label: 'Who sells' },
  { key: 'supportCards', label: 'Support cards' },
  { key: 'faqs', label: 'FAQs' },
  { key: 'finalCta', label: 'Closing banner' },
];

export const DEFAULT_SELLER_HERO = {
  eyebrow: '',
  title: 'Sell your resources where educators and learners shop',
  highlight: '',
  text: 'Edudeen is the marketplace for educational and Islamic resources. Bring your ideas to our community and get paid.',
  primaryCta: 'Start earning',
  secondaryCta: '',
  imageUrl: '',
};

export const DEFAULT_SELLER_STATS = {
  buyers: 'Learners and parents on Edudeen',
  stores: 'Stores selling educational resources',
  sales: 'In sales made through Edudeen',
};

export const DEFAULT_SELLER_HEADINGS: SellerPageHeadings = {
  plans: 'Choose the seller plan',
  plansHighlight: 'for you',
  steps: 'How it works',
  featureRows: 'Reach educators and learners. Earn from your expertise.',
  benefits: 'Everything you need to sell',
  whoSells: 'Who sells on Edudeen',
  support: 'Get support along every step of your journey',
  faqs: 'FAQs',
};

export const DEFAULT_SELLER_FEATURE_ROWS: SellerPageFeatureRow[] = [
  { title: 'Easily create your own store', text: 'We give you everything you need to sell on Edudeen — a store, a theme, product pages and secure checkout — so you can focus on creating great resources.', imageUrl: '', mockKind: 'store', bullets: [] },
  { title: 'Grow your business', text: 'Use sales data, marketing tools, discounts and AI Studio to see what is working and boost your earnings.', imageUrl: '', mockKind: 'sales', bullets: [] },
  { title: 'Connect with buyers in your niche', text: 'No matter your teaching specialty, find buyers who are eager for your ideas. Followers hear about your new resources and sales.', imageUrl: '', mockKind: 'followers', bullets: [] },
];

export const DEFAULT_SELLER_WHO_SELLS: SellerPageCard[] = [
  { title: 'Teachers & educators', text: 'Worksheets, lesson plans, bundles and courses for every grade and subject.', icon: 'star' },
  { title: 'Quran & Islamic teachers', text: 'Quran, Tajweed, Arabic and Islamic studies material and classes.', icon: 'book' },
  { title: 'Creators & publishers', text: 'Printables, eBooks, flashcards, and printed books and stationery.', icon: 'users' },
];

export const DEFAULT_SELLER_SUPPORT: SellerPageSupportCard[] = [
  { title: 'Edudeen Blog', text: 'Discover tips and updates for sellers and educators.', ctaLabel: '', ctaLink: '/blog' },
  { title: 'Help Centre', text: 'Guides and answers on setting up and running your store.', ctaLabel: '', ctaLink: '/help' },
  { title: 'Seller support', text: 'Focus on creating resources and leave the technical support to us.', ctaLabel: '', ctaLink: '/contact' },
];

/** `{fromPrice}` becomes " starting at $X a month" once the plans have loaded (blank when no paid plan exists). */
export const FROM_PRICE_TOKEN = '{fromPrice}';
export const DEFAULT_SELLER_FAQS: { q: string; a: string }[] = [
  { q: 'How do I become an Edudeen seller?', a: 'Sign up for a free Edudeen account, choose a seller plan, then add your store details and payment to open your store. You can set your own prices, upload digital or printed resources, and promote your store.' },
  { q: 'What kinds of resources can I sell?', a: 'Educational resources such as worksheets, lesson plans, printables, eBooks, courses, and Islamic and educational books and supplies. Please follow the content guidelines.' },
  { q: 'How much can I earn?', a: 'Buyers pay Edudeen and each sale is credited to your wallet after a small platform fee set by Edudeen, then paid out via payout requests. Earnings depend on your resources, pricing and how well you promote them.' },
  { q: 'Are there any fees?', a: `You pay a monthly or yearly plan fee${FROM_PRICE_TOKEN}, plus a small platform fee per sale set by Edudeen. Buyers pay Edudeen and your earnings are credited to your wallet after that fee.` },
  { q: 'How do I get paid?', a: 'Buyers can pay by bank transfer directly to the account you add in Finance. Card payments are paid out to you from your Finance page.' },
  { q: 'Can I change or cancel my plan?', a: 'Yes. You can change your plan any time from Plan & Billing in your store dashboard.' },
];

export const DEFAULT_SELLER_FINAL_CTA = { title: '', text: '', button: 'Start your store' };

/** Text fields: a blank stored value falls back to the default. Lists: a stored list (even an empty one) wins. */
function textMerge<T extends Record<string, string>>(def: T, stored?: Partial<Record<keyof T, string>>): T {
  const out = { ...def };
  for (const k of Object.keys(def) as (keyof T)[]) {
    const v = stored?.[k];
    if (typeof v === 'string' && v.trim()) out[k] = v as T[keyof T];
  }
  return out;
}
const list = <T,>(stored: T[] | undefined, def: T[]): T[] => (Array.isArray(stored) ? stored : def);

export function effectiveSellerPage(sp?: SellerPageContent | null) {
  const s = sp ?? {};
  const visible = Object.fromEntries(SELLER_PAGE_SECTIONS.map(x => [x.key, s.visible?.[x.key] !== false])) as Record<SellerPageSectionKey, boolean>;
  return {
    hero: textMerge(DEFAULT_SELLER_HERO, s.hero),
    stats: textMerge(DEFAULT_SELLER_STATS, s.stats),
    headings: textMerge(DEFAULT_SELLER_HEADINGS as unknown as Record<string, string>, s.headings) as unknown as SellerPageHeadings,
    steps: list(s.steps, []),
    featureRows: list(s.featureRows, DEFAULT_SELLER_FEATURE_ROWS),
    benefits: list(s.benefits, []),
    whoSells: list(s.whoSells, DEFAULT_SELLER_WHO_SELLS),
    supportCards: list(s.supportCards, DEFAULT_SELLER_SUPPORT),
    faqs: list(s.faqs, DEFAULT_SELLER_FAQS),
    finalCta: textMerge(DEFAULT_SELLER_FINAL_CTA, s.finalCta),
    visible,
  };
}
export type EffectiveSellerPage = ReturnType<typeof effectiveSellerPage>;
