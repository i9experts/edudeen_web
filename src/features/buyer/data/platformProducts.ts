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
      { title: 'Section-by-section editing', desc: 'Add, remove and reorder hero banners, featured books and courses, testimonials, FAQs and more, with real content — not fixed template blocks.' },
      { title: 'Live preview as you build', desc: 'Every change to theme, header, footer or page content reflects instantly in a real preview before you publish.' },
      { title: 'Responsive by default', desc: 'Every theme and section renders correctly from a small phone screen to a large desktop, with no separate mobile setup required.' },
    ],
    features: ['Drag-and-drop page sections', '10 curated starting themes', 'Custom header & footer navigation', 'Live desktop/mobile preview', 'Your own store subdomain', 'Blog pages for your store'],
    useCases: ['Launching a tutoring or course storefront from scratch in minutes', 'Refreshing a bookshop\'s look without touching code', 'Running a back-to-school or Ramadan storefront refresh'],
    faq: [
      { q: 'Do I need any coding knowledge?', a: 'No. Every part of the storefront — theme, pages, header, footer — is edited through visual controls and a live preview.' },
      { q: 'Can I change themes after launching?', a: 'Yes. Applying a different theme updates your colors, typography and layout tokens; your actual page content and products are untouched.' },
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
    useCases: ['Seeing which courses and titles sell best each term', 'Comparing performance across several stores you own', 'Pulling a report for an accountant or your academy\'s board'],
    faq: [
      { q: 'Can I see all my stores in one report?', a: 'Yes — the cross-store view rolls every store you own into a single set of numbers.' },
      { q: 'Can I export the data?', a: 'Yes, as PDF or CSV, for a single store\'s period-based report.' },
    ],
  },
  {
    slug: 'inventory',
    name: 'Inventory',
    tagline: 'Stock that stays accurate',
    heroHeadline: 'Know exactly which titles you have in stock.',
    heroSubtext: 'Stock levels tracked per product variant — every edition, format and binding of a book, every size of a notebook — so you never oversell a title you don\'t have.',
    benefits: [
      { title: 'Per-variant tracking', desc: 'Stock is tracked at the exact variant level — edition, format, binding, grade level — not just at the product level.' },
      { title: 'One source of truth', desc: 'Every order automatically draws from, and updates, the same inventory record for that title or item.' },
      { title: 'Built for physical and digital', desc: 'Works for printed books and school supplies as well as eBooks, courses and printables that don\'t need quantity tracking at all.' },
    ],
    features: ['Per-variant stock tracking', 'Stock updated automatically with every order', 'Physical and digital product support'],
    useCases: ['A publisher with hardback, paperback and revised editions that need separate stock counts', 'A bookshop selling printed textbooks alongside digital study guides'],
    faq: [
      { q: 'Does inventory apply to digital products?', a: 'Digital products such as eBooks, recorded courses and worksheets can skip quantity tracking entirely since there\'s nothing physical to run out of.' },
    ],
  },
  {
    slug: 'orders-customers',
    name: 'Orders & Customers',
    tagline: 'Every order and every customer, organized',
    heroHeadline: 'Manage every order, from placed to delivered.',
    heroSubtext: 'A real order-management workspace — status tracking, returns, and a customer list — for every book, course and learning resource you sell.',
    benefits: [
      { title: 'One order list for everything', desc: 'Printed books, course bundles and digital downloads show up in the same order workspace, not separate systems.' },
      { title: 'Returns handled properly', desc: 'A real returns workflow exists for processing and tracking return requests, not just a manual note.' },
      { title: 'A real customer list', desc: 'See which students, parents and schools have actually bought from your store, not just a raw export of email addresses.' },
    ],
    features: ['One list for physical and digital orders', 'Order status tracking', 'Returns management', 'Customer list per store'],
    useCases: ['Tracking delivery status for a batch of textbook orders', 'Handling a return or refund request end-to-end', 'Looking up a student\'s or parent\'s order history'],
    faq: [
      { q: 'Do digital and physical orders show up in the same list?', a: 'Yes — course and eBook orders sit in the same order workspace as printed books and school supplies.' },
    ],
  },
];

export function getPlatformProduct(slug: string): PlatformProduct | undefined {
  return PLATFORM_PRODUCTS.find(p => p.slug === slug);
}
