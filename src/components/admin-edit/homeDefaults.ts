import type { AboutContent, HomeContent } from '@/api/services/publicPlatformConfig';

/**
 * Built-in text of the public pages. The pages render `effectiveHomeContent()` /
 * `effectiveAbout()` and the inline editors start from the SAME values, so what
 * the admin sees in the form is exactly what the visitor reads (no drifting copies).
 */
export const DEFAULT_PROMISE_ITEMS = ['For home & classroom', 'Preview before you choose', 'Created by educators', 'Verified sellers'];

export const DEFAULT_TRUST_TEXT: { label: string; sub: string }[] = [
  { label: 'Secure Checkout', sub: 'Payments handled by Edudeen' },
  { label: 'Flexible Payment', sub: 'Cards, COD & bank transfer' },
  { label: 'Refund Requests', sub: 'Raise one from My Orders' },
  { label: 'Help When Needed', sub: 'Message the seller or contact us' },
];

export const DEFAULT_ABOUT_PILLARS: { title: string; desc: string }[] = [
  { title: 'One workspace', desc: 'A store, orders, inventory and analytics that all read from the same real data — not five separate tools stitched together.' },
  { title: 'Printed and digital', desc: 'Sell printed books and school supplies alongside courses, eBooks and worksheets, from one catalog.' },
  { title: 'AI where it helps', desc: "Real, metered AI tools for the writing and analysis work that eats an educator's time — not a decorative label." },
  { title: 'Numbers you can trust', desc: 'Every figure a seller sees is computed from their actual orders and payments, never a simulated placeholder.' },
];

export const DEFAULT_ABOUT: Required<Omit<AboutContent, 'pillars'>> = {
  eyebrow: 'About Edudeen',
  heading: "Sharing knowledge shouldn't need five different logins.",
  intro: "Edudeen exists because teachers, scholars, academies and publishers who sell learning materials online usually end up juggling a store builder, a file-delivery service, an inventory tracker and an analytics tool that don't talk to each other. We built one education marketplace where they all share the same real data instead.",
  approachEyebrow: 'Our approach',
  approachHeading: 'Easy to start, verified to trust.',
  approachText: "Educators can set up a store and start listing quickly. Sellers who complete Edudeen's verification earn a verified badge, so learners and parents can see at a glance which stores have been checked — and buyers always pay through Edudeen's own checkout.",
  headedEyebrow: "Where we're headed",
  headedHeading: 'More independence for every seller.',
  headedText: "Sellers' own payment gateways and custom domains per store are real items on our roadmap — the direction is always toward an educator owning more of their own teaching business, not less.",
  ctaHeading: 'Share what you teach on Edudeen.',
  ctaButton: 'Start Selling Free',
};

/** Stored About copy, else the built-in text (same blank-means-default rule the page used). */
export function effectiveAbout(stored?: AboutContent | null): Required<Omit<AboutContent, 'pillars'>> & { pillars: { title: string; desc: string }[] } {
  const s = stored ?? {};
  const out = { ...DEFAULT_ABOUT } as Record<string, string>;
  (Object.keys(DEFAULT_ABOUT) as (keyof typeof DEFAULT_ABOUT)[]).forEach(k => { const v = s[k]; if (typeof v === 'string' && v) out[k] = v; });
  const pillars = DEFAULT_ABOUT_PILLARS.map((d, i) => { const o = s.pillars?.[i]; return o?.title ? { title: o.title, desc: o.desc || d.desc } : d; });
  return { ...(out as typeof DEFAULT_ABOUT), pillars };
}

export interface HomeDefaultsContext {
  /** Label of the category the hero's second button / feature block open (first admin category when none chosen). */
  featuredLabel?: string;
}

const str = (v: string | undefined, d: string) => (v ? v : d);

/** Stored homepage copy, else exactly the text the homepage shows when nothing is saved. */
export function effectiveHomeContent(stored: HomeContent | null | undefined, ctx: HomeDefaultsContext = {}): Required<Omit<HomeContent, 'about' | 'legalPages'>> {
  const s = stored ?? {};
  const f = ctx.featuredLabel;
  return {
    heroEyebrow: str(s.heroEyebrow, 'For curious minds & caring hearts'),
    heroTitle: str(s.heroTitle, 'Big discoveries.'),
    heroHighlight: str(s.heroHighlight, 'Beautiful beginnings.'),
    heroText: str(s.heroText, 'Physical products, digital downloads and educational resources from sellers you can trust — for the lessons you teach and the values you nurture.'),
    heroPrimaryLabel: str(s.heroPrimaryLabel, 'Find your next resource'),
    heroSecondaryLabel: str(s.heroSecondaryLabel, f ? 'Explore ' + f : 'Browse all'),
    heroBadge: str(s.heroBadge, 'A little learning. A lasting difference.'),
    heroImageUrl: s.heroImageUrl ?? '', // empty = the built-in picture
    promiseItems: s.promiseItems?.length ? s.promiseItems : DEFAULT_PROMISE_ITEMS,
    trustItems: DEFAULT_TRUST_TEXT.map((d, i) => { const o = s.trustItems?.[i]; return o?.label ? { label: o.label, sub: o.sub ?? '' } : d; }),
    featureEyebrow: str(s.featureEyebrow, f ? 'The ' + f + ' collection' : 'Featured collection'),
    featureHeading: str(s.featureHeading, 'Small habits. Strong character.'),
    featureText: str(s.featureText, 'Bring kindness, gratitude and everyday good manners into your learning moments.'),
    featureLinkLabel: str(s.featureLinkLabel, 'Explore character-building resources →'),
    featuredCategory: str(s.featuredCategory, f ?? ''),
    creatorEyebrow: str(s.creatorEyebrow, 'Made by you. Shared with the world.'),
    creatorHeading: str(s.creatorHeading, 'Your knowledge can go further.'),
    creatorText: str(s.creatorText, 'Give your teaching ideas a home in the Edudeen Creator Network.'),
    creatorLinkLabel: str(s.creatorLinkLabel, 'Start selling on Edudeen →'),
    googlePlayUrl: str(s.googlePlayUrl, GOOGLE_PLAY_DEFAULT),
    appStoreUrl: s.appStoreUrl ?? '',
  };
}

// Same link AppPromoParts falls back to (kept here to avoid a UI import cycle; AppPromoParts imports it from here).
export const GOOGLE_PLAY_DEFAULT = 'https://play.google.com/apps/internaltest/4699462862361720775';
