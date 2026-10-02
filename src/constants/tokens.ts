// ─── Edudeen Brand Design Tokens ───────────────────────────────────────────
// JS-accessible mirror of the color values in the Tailwind `@theme` block
// (src/index.css) — for the few places (e.g. Recharts inline styling) that
// can't take a Tailwind class. Prefer Tailwind utility classes everywhere else.

export const COLORS = {
  // Brand
  orange:      '#174771',
  deepOrange:  '#0F3354',
  paleOrange:  '#EAF2F8',

  // Neutrals
  carbon:   '#152D43',
  charcoal: '#1F3A52',
  slate:    '#64727B',
  bone:     '#E1E7EA',
  cream:    '#F5F8FA',
  white:    '#FFFFFF',

  // Semantic
  success:    '#2D8A4E',
  successBg:  '#EBF7EF',
  warning:    '#C08B1E',
  warningBg:  '#FEF7E5',
  error:      '#C13030',
  errorBg:    '#FDEAEA',
  info:       '#1A72C2',
  infoBg:     '#E6F1FB',
} as const;

// ── Status → Badge color mapping ────────────────────────────────────────────
export const STATUS_COLORS: Record<string, 'green' | 'yellow' | 'blue' | 'gray' | 'red' | 'orange'> = {
  // Title-case (UI display values)
  Active:           'green',
  Paid:             'green',
  Delivered:        'green',
  Published:        'green',
  Approved:         'green',
  Fulfilled:        'green',
  InStock:          'green',
  Pending:          'yellow',
  'Low Stock':      'yellow',
  Scheduled:        'yellow',
  Processing:       'blue',
  Digital:          'blue',
  'In Review':      'blue',
  Draft:            'gray',
  Unpublished:      'gray',
  Archived:         'gray',
  Paused:           'gray',
  Refunded:         'gray',
  Expired:          'gray',
  Suspended:        'red',
  Cancelled:        'red',
  'Out of Stock':   'red',
  Flagged:          'red',
  VIP:              'orange',
  Loyal:            'green',
  Returning:        'blue',
  New:              'gray',
  Read:             'blue',
  Resolved:         'green',
  Rejected:         'red',
  'At Risk':        'red',
  Physical:         'orange',
  // Lowercase (API response values)
  active:           'green',
  paid:             'green',
  delivered:        'green',
  fulfilled:        'green',
  published:        'green',
  pending:          'yellow',
  under_review:     'blue',
  not_started:      'gray',
  verified:         'green',
  scheduled:        'yellow',
  processing:       'blue',
  draft:            'gray',
  archived:         'gray',
  paused:           'gray',
  refunded:         'gray',
  expired:          'gray',
  cancelled:        'red',
  suspended:        'red',
  rejected:         'red',
  'out of stock':   'red',
  digital:          'blue',
  physical:         'orange',
  completed:        'green',
  Completed:        'green',
  pending_review:   'blue',
  pending_verification: 'yellow',
  unpaid:           'yellow',
  failed:           'red',
  partially_shipped: 'blue',
  shipped:          'blue',
};

// ── Seller Onboarding Steps ──────────────────────────────────────────────────
export const ONBOARDING_STEPS = [
  'Account',
  'Store Info',
  'Seller Type',
  'What You Sell',
  'Go Live',
] as const;

export const SELLER_TYPES = [
  { id: 'creator',    icon: 'palette',    title: 'Content Creator',   desc: 'Printables, flashcards, educational templates and media' },
  { id: 'educator',   icon: 'book-open',  title: 'Educator',          desc: 'Worksheets, lesson plans, curriculum, assessments'  },
  { id: 'retailer',   icon: 'store',      title: 'Bookseller / Retailer', desc: 'Books, Quran sets, stationery and school supplies' },
  { id: 'brand',      icon: 'briefcase',  title: 'Publisher / Institute', desc: 'Publish books or run a full online learning store' },
  { id: 'freelancer', icon: 'monitor',    title: 'Tutor / Teacher',   desc: 'Offer tutoring, Quran classes or course packages'   },
  { id: 'multiple',   icon: 'gift',       title: 'Mix of the above',  desc: 'I sell across multiple learning categories and formats' },
] as const;

export const PRODUCT_TYPES = [
  { id: 'physical',       icon: 'package',   label: 'Books & School Supplies', desc: 'Ship books, stationery and kits' },
  { id: 'digital',        icon: 'download',  label: 'Digital Learning Resources', desc: 'eBooks, PDFs, audio, video'   },
  { id: 'educational',    icon: 'book-open', label: 'Educational Resources', desc: 'Worksheets, lesson plans'    },
  { id: 'subscriptions',  icon: 'repeat',    label: 'Learning Subscriptions', desc: 'Recurring course or membership access' },
] as const;

// ── Pricing Plans ────────────────────────────────────────────────────────────
export const PRICING_PLANS = [
  {
    name: 'Starter',
    monthly: 0, annual: 0,
    badge: null,
    desc: 'Perfect for trying Edudeen and selling your first products.',
    cta: 'Start Free',
    transactionFee: '3%',
    features: [
      'Up to 10 products', 'Marketplace listing', 'Basic store page',
      'Digital product delivery', 'Standard checkout', 'Email support',
      '100 AI credits / month', '3% transaction fee',
    ],
    missing: ['Custom domain', 'Advanced analytics', 'Store Builder themes', 'Priority support'],
  },
  {
    name: 'Professional',
    monthly: 49, annual: 39,
    badge: 'Most Popular',
    desc: 'For growing sellers who need the full commerce toolkit.',
    cta: 'Start Free Trial',
    transactionFee: '1%',
    features: [
      'Unlimited products', 'Custom domain (.com)', 'Full Store Builder',
      'Course & subscription products', 'Advanced analytics', 'AI Studio — 1,000 credits / mo',
      '5 staff accounts', 'Email campaigns', 'Abandoned cart recovery',
      'Priority support', '1% transaction fee', 'Marketplace featured badge',
    ],
    missing: [],
  },
  {
    name: 'Business',
    monthly: 99, annual: 79,
    badge: null,
    desc: 'For high-volume booksellers, publishers, and learning institutes.',
    cta: 'Start Free Trial',
    transactionFee: '0.5%',
    features: [
      'Everything in Professional', 'Unlimited staff accounts',
      'AI Studio — 5,000 credits / mo', 'Loyalty & Rewards program',
      'Subscription products', 'Advanced shipping rules',
      'API access & webhooks', 'Dedicated account manager',
      '0.5% transaction fee', 'White-label store option', 'SLA — 99.9% uptime',
    ],
    missing: [],
  },
  {
    name: 'Enterprise',
    monthly: null, annual: null,
    badge: 'Custom',
    desc: 'For schools, brands, and platforms with custom requirements.',
    cta: 'Contact Sales',
    transactionFee: '0%',
    features: [
      'Everything in Business', 'Custom AI credits', 'School purchase accounts',
      'Multi-brand management', 'Custom integrations', 'Dedicated infrastructure',
      'SSO & SAML login', 'Contract billing', '0% transaction fee', '24/7 dedicated support',
    ],
    missing: [],
  },
] as const;
