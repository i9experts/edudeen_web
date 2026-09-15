// Real-feature copy only — every entry describes a capability that actually
// exists in the Edudeen seller workspace today (see CLAUDE.md's backend/
// frontend module list). No invented features, no placeholder claims.
export interface PlatformProductFaq { q: string; a: string; }

export interface PlatformProduct {
  slug: string;
  name: string;
  tagline: string;
  heroHeadline: string;
  heroSubtext: string;
  benefits: { title: string; desc: string }[];
  features: string[];
  useCases: string[];
  faq: PlatformProductFaq[];
}

export const PLATFORM_PRODUCTS: PlatformProduct[] = [
  {
    slug: 'store-builder',
    name: 'Store Builder',
    tagline: 'Your store, your brand, your way',
    heroHeadline: 'Build a store that feels like your brand.',
    heroSubtext: 'A real drag-and-drop storefront editor — pages, sections, theme, header and footer — with a live preview that updates as you edit, not a template you\'re stuck with.',
    benefits: [
      { title: 'Curated theme library', desc: 'Start from one of several complete, professionally designed themes — colors, typography, button style, card style and layout — then customize any of it.' },
      { title: 'Section-by-section editing', desc: 'Add, remove and reorder hero banners, featured products, testimonials, FAQs and more, with real content — not fixed template blocks.' },
      { title: 'Live preview as you build', desc: 'Every change to theme, header, footer or page content reflects instantly in a real preview before you publish.' },
      { title: 'Responsive by default', desc: 'Every theme and section renders correctly from a small phone screen to a large desktop, with no separate mobile setup required.' },
    ],
    features: ['Drag-and-drop page sections', '10 curated starting themes', 'Custom header & footer navigation', 'Live desktop/mobile preview', 'Your own store subdomain', 'Blog pages for your store'],
    useCases: ['Launching a new storefront from scratch in minutes', 'Refreshing an existing store\'s look without touching code', 'Running a themed seasonal storefront redesign'],
    faq: [
      { q: 'Do I need any coding knowledge?', a: 'No. Every part of the storefront — theme, pages, header, footer — is edited through visual controls and a live preview.' },
      { q: 'Can I change themes after launching?', a: 'Yes. Applying a different theme updates your colors, typography and layout tokens; your actual page content and products are untouched.' },
    ],
  },
  {
    slug: 'pos',
    name: 'Point of Sale',
    tagline: 'Sell in person, synced with your store',
    heroHeadline: 'Sell in-store. Sell online. One connected system.',
    heroSubtext: 'A real point-of-sale terminal for in-person sales — PIN-based employee login, live cart, receipts — that shares the exact same inventory and order records as your online store.',
    benefits: [
      { title: 'One inventory, everywhere', desc: 'A sale rung up at the counter updates the same stock numbers your online storefront reads — no separate system to reconcile.' },
      { title: 'Fast employee sign-in', desc: 'Staff sign in to the register with a PIN, not a full account login, so shift changes at the counter stay quick.' },
      { title: 'Works as its own product', desc: 'A seller can run POS on its own without a public storefront, or pair it with a store — both are fully supported.' },
      { title: 'Register sessions & audit history', desc: 'Each till session is tracked from open to close, with an audit log of the sales and actions recorded during it.' },
    ],
    features: ['PIN employee login', 'Real-time inventory sync', 'Register session tracking', 'Order history shared with the online store', 'Works standalone or with a storefront'],
    useCases: ['A retail counter selling the same catalog as the online store', 'A market-stall or pop-up seller with no storefront at all', 'A multi-staff shop needing per-employee sales tracking'],
    faq: [
      { q: 'Do I need an online store to use POS?', a: 'No — POS can run entirely on its own for a seller who only sells in person.' },
      { q: 'Does a POS sale affect my online stock count?', a: 'Yes, immediately — both systems read from the same underlying inventory.' },
    ],
  },
  {
    slug: 'ai-commerce',
    name: 'AI Commerce',
    tagline: 'AI tools built into your workflow',
    heroHeadline: 'AI that helps you sell smarter.',
    heroSubtext: 'AI Studio gives sellers real, usable AI tools inside the dashboard — not a marketing gimmick — for the writing and analysis work that normally eats the most time.',
    benefits: [
      { title: 'Product copy, generated for you', desc: 'Turn a rough product idea or photo set into a real listing description, instead of writing every one by hand.' },
      { title: 'Backed by real AI credits', desc: 'Usage is metered through an AI credits wallet tied to your plan, so cost stays predictable rather than open-ended.' },
      { title: 'A genuine product capability', desc: 'AI Studio is a real workspace section built on Anthropic\'s Claude models — not a decorative "AI-powered" label with nothing behind it.' },
    ],
    features: ['AI-assisted product descriptions', 'AI credits wallet metering', 'Available directly inside the seller dashboard', 'Gated by your platform plan'],
    useCases: ['Writing first-draft listings for a large catalog quickly', 'Refreshing weak or thin product descriptions', 'Getting a second opinion on a listing before publishing'],
    faq: [
      { q: 'Does AI guarantee more sales?', a: 'No — AI Studio speeds up the writing and analysis work of running a store. It\'s a productivity tool, not a sales guarantee.' },
      { q: 'How is usage billed?', a: 'Through an AI credits wallet included with your plan, with add-on credits available if you need more.' },
    ],
  },
  {
    slug: 'analytics',
    name: 'Analytics',
    tagline: 'Real numbers, not vanity metrics',
    heroHeadline: 'Understand your business in real time.',
    heroSubtext: 'Revenue, orders and customer activity, computed from your real store data — viewable per store or rolled up across every store you own.',
    benefits: [
      { title: 'Per-store or cross-store view', desc: 'Look at one store\'s numbers on its own dashboard, or roll every store you own into one combined view.' },
      { title: 'Exportable reports', desc: 'Pull a PDF or CSV export of your store\'s analytics for a given period whenever you need it outside the dashboard.' },
      { title: 'Real orders, not samples', desc: 'Every figure is computed directly from your actual order and payment records — nothing is simulated or estimated.' },
    ],
    features: ['Revenue, orders & customer trends', 'Per-store and cross-store views', 'PDF & CSV export', 'Date-range filtering & comparison'],
    useCases: ['Tracking month-over-month growth for one store', 'Comparing performance across several stores you own', 'Pulling a report for an accountant or investor'],
    faq: [
      { q: 'Can I see all my stores in one report?', a: 'Yes — the cross-store view rolls every store you own into a single set of numbers.' },
      { q: 'Can I export the data?', a: 'Yes, as PDF or CSV, for a single store\'s period-based report.' },
    ],
  },
  {
    slug: 'inventory',
    name: 'Inventory',
    tagline: 'Stock that stays accurate',
    heroHeadline: 'Know exactly what you have, everywhere you sell.',
    heroSubtext: 'Stock levels tracked per product variant, kept in sync across your storefront and POS, so you never oversell what you don\'t have.',
    benefits: [
      { title: 'Per-variant tracking', desc: 'Stock is tracked at the exact variant level — size, color, edition — not just at the product level.' },
      { title: 'One source of truth', desc: 'Online orders and POS sales both draw from, and update, the same inventory record.' },
      { title: 'Built for physical and digital', desc: 'Works for physical stock counts as well as digital products that don\'t need quantity tracking at all.' },
    ],
    features: ['Per-variant stock tracking', 'Shared across storefront & POS', 'Physical and digital product support'],
    useCases: ['A store with sized/colored variants that need separate stock counts', 'A seller running both an online store and an in-person counter'],
    faq: [
      { q: 'Does inventory apply to digital products?', a: 'Digital products can skip quantity tracking entirely since there\'s nothing physical to run out of.' },
    ],
  },
  {
    slug: 'orders-customers',
    name: 'Orders & Customers',
    tagline: 'Every order and every customer, organized',
    heroHeadline: 'Manage every order, from placed to delivered.',
    heroSubtext: 'A real order-management workspace — status tracking, returns, and a customer list — for both your online store and in-person POS sales.',
    benefits: [
      { title: 'One order list, both channels', desc: 'Online orders and POS sales show up in the same order workspace, not two separate systems.' },
      { title: 'Returns handled properly', desc: 'A real returns workflow exists for processing and tracking return requests, not just a manual note.' },
      { title: 'A real customer list', desc: 'See who\'s actually bought from your store, not just a raw export of email addresses.' },
    ],
    features: ['Combined online + POS order list', 'Order status tracking', 'Returns management', 'Customer list per store'],
    useCases: ['Tracking fulfillment status across every channel you sell on', 'Handling a return or refund request end-to-end', 'Looking up a specific customer\'s order history'],
    faq: [
      { q: 'Do POS sales show up in the same order list as online orders?', a: 'Yes — both channels share one order workspace.' },
    ],
  },
];

export function getPlatformProduct(slug: string): PlatformProduct | undefined {
  return PLATFORM_PRODUCTS.find(p => p.slug === slug);
}
