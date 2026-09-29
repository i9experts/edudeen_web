import { useState, useEffect } from 'react';
import {
  Zap, PackageCheck, Bell, ShoppingBag, Search, Gift, ShieldCheck, Award, Headphones,
  Signal, Wifi, BatteryFull, Home, ShoppingCart, Package, User, Shirt, Sparkles, BookOpen,
  Check, Send, Percent,
} from 'lucide-react';
import { clsx } from 'clsx';
import { StoreBadgeChip, RatingRow, RealAppQr, useAppQrDataUrl, GOOGLE_PLAY_URL } from './AppPromoParts';
import { apiGetPlatformStats, type PlatformStats } from '@/api/services/store';
import { apiSubscribeNewsletter } from '@/api/services/newsletter';

const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

const FEATURES = [
  { Icon: Zap,          title: 'Faster, one-tap checkout',         sub: 'Complete your order in seconds' },
  { Icon: PackageCheck, title: 'Real-time order tracking',         sub: 'Track every step in real time' },
  { Icon: Bell,         title: 'Instant deal & price-drop alerts', sub: 'Never miss the best deals' },
];

// ── Shared iOS-style status bar — time + signal/wifi/battery glyphs ───────────
export function StatusBar({ dark = false }: { dark?: boolean }) {
  const tone = dark ? 'text-white' : 'text-carbon';
  return (
    <div className={clsx('h-8 flex items-center justify-between px-[16px] pt-[4px] text-[9px] font-semibold', tone)}>
      <span>9:41</span>
      <div className="flex items-center gap-[4px]">
        <Signal size={10} className={tone} />
        <Wifi size={10} className={tone} />
        <BatteryFull size={13} className={tone} />
      </div>
    </div>
  );
}

// ── Shared bottom tab bar — mirrors the real app's own floating pill nav
// (BuyerLayout's BottomNav: Home/Search/elevated Cart/Orders/Account), not
// a generic flat 5-icon row, since this mockup is supposed to be a preview
// of the actual app rather than a stand-in placeholder. ──
const TAB_ITEMS = [
  { Icon: Home,         label: 'Home',    elevated: false },
  { Icon: Search,       label: 'Search',  elevated: false },
  { Icon: ShoppingCart, label: 'Cart',    elevated: true },
  { Icon: Package,      label: 'Orders',  elevated: false },
  { Icon: User,         label: 'Account', elevated: false },
] as const;

function BottomTabBar({ active }: { active: number }) {
  return (
    <div className="mt-auto h-[30px] flex items-center px-[6px] pb-[3px] bg-white">
      <div className="relative flex items-stretch justify-around w-full h-[24px] rounded-full border border-bone bg-white">
        {TAB_ITEMS.map((tab, i) =>
          tab.elevated ? (
            <div key={tab.label} className="relative flex-1 flex items-center justify-center">
              <span className="absolute -top-[7px] flex items-center justify-center size-[16px] rounded-full bg-gradient-to-br from-brand-orange to-brand-deep-orange border-[1.5px] border-white shadow-[0_2px_5px_rgba(23,71,113,0.5)]">
                <tab.Icon size={8} className="text-white" strokeWidth={2.4} />
              </span>
            </div>
          ) : (
            <div key={tab.label} className="flex-1 flex items-center justify-center">
              <tab.Icon size={9} className={i === active ? 'text-brand-orange' : 'text-slate/70'} strokeWidth={i === active ? 2.4 : 1.8} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// ── "My Orders" screen — back phone. Real Rs. (PKR) formatting and plain
// 4-digit order numbers, matching how the actual app displays them
// elsewhere — not USD `$`/a fabricated long order id. ──
function OrdersScreenMockup() {
  const tabs = ['All', 'Processing', 'Shipped', 'Delivered'];
  const orders = [
    { id: '1234', status: 'Processing', color: 'bg-[#fef3c7] text-[#b45309]', items: '2 items', price: 3998 },
    { id: '1233', status: 'Shipped',    color: 'bg-info-bg text-info',       items: '1 item',  price: 1499 },
    { id: '1232', status: 'Delivered',  color: 'bg-success-bg text-success', items: '3 items', price: 5999 },
  ];
  return (
    <div className="relative w-full h-full bg-white overflow-hidden flex flex-col">
      <StatusBar />
      <div className="px-[14px] pt-[6px] pb-[8px]">
        <p className="text-[13px] font-bold text-carbon">My Orders</p>
      </div>
      <div className="flex items-center gap-[14px] px-[14px] border-b border-bone">
        {tabs.map((t, i) => (
          <span key={t} className={clsx(
            'text-[8px] font-semibold pb-[7px] border-b-2',
            i === 0 ? 'text-brand-orange border-brand-orange' : 'text-slate border-transparent',
          )}>
            {t}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-[7px] px-[10px] pt-[9px] overflow-hidden">
        {orders.map((o, i) => (
          <div key={i} className="flex items-center gap-[8px] rounded-[10px] border border-bone p-[8px]">
            <div className="w-9 h-9 rounded-[7px] bg-brand-pale-orange shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-[5px]">
                <p className="text-[8px] font-semibold text-carbon truncate">Order #{o.id}</p>
                <span className={clsx('shrink-0 px-[6px] py-[1.5px] rounded-full text-[6.5px] font-semibold', o.color)}>{o.status}</span>
              </div>
              <p className="text-[7px] text-slate mt-[2px]">{o.items} · Rs. {o.price.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-center text-[7.5px] font-semibold text-brand-orange mt-[8px]">View all orders</p>
      <BottomTabBar active={3} />
    </div>
  );
}

// ── Home / discover screen — front phone ───────────────────────────────────────
const HOME_CATEGORIES = [
  { Icon: Headphones, label: 'Electronics' },
  { Icon: Shirt,       label: 'Fashion' },
  { Icon: Home,        label: 'Home' },
  { Icon: BookOpen,    label: 'Books' },
];

// Rs. (PKR), matching how the real Flash Sale rail prices things elsewhere
// in the app — not a fabricated USD price.
const FLASH_DEAL_PRODUCTS = [
  { name: 'Smartphone',           color: '#111111', price: 54999,  compareAt: 91998,  pct: 40 },
  { name: 'Wireless Headphones',  color: '#E4F0DA', price: 3499,   compareAt: 6998,   pct: 50 },
];

export function HomeScreenMockup() {
  return (
    <div className="relative w-full h-full bg-white overflow-hidden flex flex-col">
      <StatusBar />
      <div className="h-9 flex items-center justify-between px-[13px]">
        <p className="text-[13px] font-bold text-carbon flex items-center gap-[3px]">
          <span className="w-4 h-4 rounded-[5px] bg-brand-orange text-white flex items-center justify-center text-[9px] font-black">S</span>
          edudeen
        </p>
        <Bell size={13} className="text-brand-orange" />
      </div>
      <div className="px-[11px]">
        <div className="flex items-center gap-[6px] rounded-full border border-bone bg-cream px-[10px] py-[6px] mb-[9px]">
          <Search size={10} className="text-slate" />
          <span className="text-[7.5px] text-slate">Search products, stores...</span>
        </div>

        <div className="rounded-[12px] bg-gradient-to-br from-brand-orange to-brand-deep-orange px-[11px] py-[10px] flex items-center justify-between mb-[10px]">
          <div>
            <p className="text-[8.5px] font-bold text-white leading-tight">EXTRA 20% OFF</p>
            <p className="text-[7px] text-white/85 leading-tight mt-[1px]">App Exclusive Deals</p>
            <span className="inline-block mt-[5px] px-[8px] py-[2.5px] rounded-full bg-white text-[6.5px] font-bold text-brand-deep-orange">Shop Now</span>
          </div>
          <Gift size={22} className="text-white/90 shrink-0" />
        </div>

        <div className="flex items-center justify-between mb-[6px]">
          <p className="text-[8.5px] font-bold text-carbon">Categories</p>
          <span className="text-[7px] text-brand-orange font-semibold">See all &gt;</span>
        </div>
        <div className="flex items-center justify-between mb-[10px]">
          {HOME_CATEGORIES.map(({ Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-[4px]">
              <span className="w-[26px] h-[26px] rounded-full bg-cream border border-bone flex items-center justify-center">
                <Icon size={12} className="text-brand-orange" />
              </span>
              <span className="text-[5.5px] text-slate whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-[6px]">
          <p className="text-[8.5px] font-bold text-carbon flex items-center gap-[3px]">
            <Zap size={9} className="text-brand-orange fill-brand-orange" /> Flash Sale
          </p>
          <span className="text-[6.5px] font-semibold text-error tabular-nums">Ends in 06:25:43</span>
        </div>
        <div className="grid grid-cols-2 gap-[7px]">
          {FLASH_DEAL_PRODUCTS.map((p, i) => (
            <div key={i} className="rounded-[8px] border border-bone overflow-hidden relative">
              <div className="aspect-square relative" style={{ background: p.color }}>
                <span className="absolute top-[3px] left-[3px] px-[4px] py-[1px] rounded-[3px] text-[5px] font-bold bg-[#e11d48] text-white">-{p.pct}%</span>
              </div>
              <div className="px-[5px] py-[4px]">
                <p className="text-[6px] font-semibold text-charcoal truncate">{p.name}</p>
                <div className="flex items-baseline gap-[3px]">
                  <p className="text-[7px] font-bold text-carbon">Rs. {p.price.toLocaleString()}</p>
                </div>
                <p className="text-[5px] text-slate line-through">Rs. {p.compareAt.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomTabBar active={0} />
    </div>
  );
}

// Every screen mockup (OrdersScreenMockup/HomeScreenMockup) is authored at
// one fixed scale — real px font-sizes tuned to look right inside the `md`
// phone's ~172px-wide screen. `size="sm"` used to just shrink the OUTER
// shell to ~78px while reusing those exact same fixed border-radius/padding/
// notch values and leaving the (unshrunk) content to overflow/clip inside —
// that's what produced the melted-blob shell with cut-off "My Orders" text.
// Radius/padding/notch now scale with `size`, and the content itself is
// rendered at its normal designed size then scaled down bodily via CSS
// `transform` to fit — same technique as scaling down a poster, not
// reflowing every font-size by hand for a second size.
// 0.4 read as illegible mush on the order-list/price text (7-8px source
// text shrunk again to ~3px has no pixels left to render with) — widened
// the `sm` shell itself so less shrinking is needed to fit, instead of
// trying to chase legibility through the transform alone.
const SM_CONTENT_SCALE = 0.56;
const MD_CONTENT_WIDTH = 172;
const MD_CONTENT_HEIGHT = 363;

export function PhoneShell({ className, primary = true, size = 'md', heightPx, children }: {
  className?: string;
  primary?: boolean;
  size?: 'sm' | 'md';
  /** Explicit height in px, deriving width from the same 9:19 aspect ratio
   *  instead of a fixed Tailwind width class — for placements (the compact
   *  banner's phone cluster) that need to fit a specific available height
   *  rather than "however tall this width happens to be", which is what let
   *  the phones grow taller than the card around them and get clipped. */
  heightPx?: number;
  children: React.ReactNode;
}) {
  const isSmSize = size === 'sm';
  const compact = isSmSize || heightPx != null;
  const width = isSmSize ? 'w-[102px] xl:w-[112px]' : 'w-[188px] xl:w-[204px]';
  // A real phone's own 9:19 ratio makes any shell tall enough to read as
  // "phone-shaped" also fairly narrow (a 165-185px-tall shell is only
  // ~78-88px wide) — too narrow to shrink the same dense screen content
  // into and still have legible text no matter what scale is computed from
  // that width; a lower scale just makes the text blank/illegible mush,
  // which is worse than a *little* of the screen's edge getting cropped by
  // the phone's own screen bezel (`overflow-hidden` below). So this always
  // uses the one fixed scale already confirmed legible, rather than
  // deriving a (smaller, illegible) one from the actual narrow width.
  const contentScale = SM_CONTENT_SCALE;

  return (
    <div
      className={clsx('relative shrink-0 aspect-[9/19]', heightPx == null && width, primary ? 'z-[1]' : 'opacity-95', className)}
      style={heightPx != null ? { height: `${heightPx}px` } : undefined}
    >
      {/* Side buttons — the detail that reads "real phone" instead of a bare rounded rectangle */}
      <div className="absolute -left-px top-[20%] w-[2px] h-[6%] rounded-l-sm bg-[#0a0a09]" />
      <div className="absolute -left-px top-[29%] w-[2px] h-[9%] rounded-l-sm bg-[#0a0a09]" />
      <div className="absolute -left-px top-[40%] w-[2px] h-[9%] rounded-l-sm bg-[#0a0a09]" />
      <div className="absolute -right-px top-[24%] w-[2px] h-[10%] rounded-r-sm bg-[#0a0a09]" />

      <div className={clsx(
        'w-full h-full bg-gradient-to-b from-[#333130] via-carbon to-[#0a0a09] border',
        compact ? 'rounded-[16px] p-[4px]' : 'rounded-[36px] p-[8px]',
        primary ? 'border-white/20' : 'border-white/10',
      )}>
        <div className={clsx('relative w-full h-full overflow-hidden ring-1 ring-black/60', compact ? 'rounded-[12px]' : 'rounded-[28px]')}>
          {/* Notch */}
          <div className={clsx(
            'absolute top-0 left-1/2 -translate-x-1/2 w-[38%] bg-carbon z-20',
            compact ? 'h-[9px] rounded-b-[7px]' : 'h-[16px] rounded-b-[12px]',
          )} />
          {compact ? (
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{ width: MD_CONTENT_WIDTH, height: MD_CONTENT_HEIGHT, transform: `scale(${contentScale})` }}
            >
              {children}
            </div>
          ) : children}
          {/* Home indicator */}
          <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[30%] h-[4px] rounded-full bg-carbon/25 z-20" />
        </div>
      </div>
    </div>
  );
}

// Compact newsletter form for the light side-panel of the compact banner —
// mirrors Footer's Newsletter (same apiSubscribeNewsletter call/states) but
// styled for a light background instead of the footer's dark one.
function NewsletterMini() {
  const [email, setEmail] = useState('');
  const [subscribed, setSub] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      await apiSubscribeNewsletter(email.trim());
      setSub(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div className="flex items-center gap-2 text-[12.5px] text-carbon bg-white/60 border border-carbon/10 rounded-lg px-3 py-2.5">
        <Check size={15} className="text-brand-deep-orange shrink-0" />
        You're subscribed — welcome aboard!
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={submit} className="flex items-stretch gap-2">
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          required
          placeholder="Your email address"
          aria-label="Email address"
          disabled={loading}
          className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-carbon/15 bg-white text-[11.5px] text-carbon placeholder:text-slate outline-none transition-colors duration-200 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-brand-orange text-white text-[11.5px] font-semibold border-none cursor-pointer hover:bg-brand-deep-orange transition-colors duration-200 shrink-0 disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
        >
          <Send size={12} /> {loading ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {error && <p className="mt-1.5 text-[10.5px] text-error">{error}</p>}
    </div>
  );
}

// Compact variant — Marketplace-only for now (ProductDetail and
// EducationMarketplace keep the fuller default banner below).
// Two genuinely separate cards (own full border-radius + a real gap between
// them, not one card split in the middle with a shared flattened seam) laid
// out on a `3fr 1fr` grid — matching the dark app-promo card at ~75% next
// to the peach newsletter card at ~25%, exactly as specced. Side-by-side
// from `md:` up. Below `md` (real phone widths) the columns stack into one
// column, reordered — headline/copy → phone mockups (the hero visual) → QR
// + store badges → the newsletter card — instead of literally shrinking the
// whole 3-column desktop canvas: a uniform scale-to-fit was tried first and
// rejected, since shrinking the *whole* layout down to phone width shrinks
// the text past legible size too, which is what actually produced the
// "tiny frame surrounded by empty dark space" look — the phones were
// readable, everything else had shrunk into illegible blank-looking space
// around them. Every real piece (StoreBadgeChip, the actual QR image,
// PhoneShell mockups, NewsletterMini's working form) is unchanged, only the
// wrapper/breakpoints/order moved.
function CompactAppDownloadBanner({ className }: { className?: string }) {
  const qrDataUrl = useAppQrDataUrl(GOOGLE_PLAY_URL);

  return (
    <section className={clsx('flex flex-col gap-3 md:grid md:grid-cols-[3fr_1fr] md:gap-4', className)}>
      <div className="relative md:min-h-[236px] rounded-2xl bg-gradient-to-br from-carbon to-charcoal px-5 sm:px-6 md:px-7 lg:px-8 py-5 md:py-4 flex flex-col justify-center">
        {/* Decorative background layer only — clipped to the rounded corners
            on its own (this layer, not the card itself, gets `overflow-
            hidden`), so the phone mockups below (a sibling, not a child of
            this clipped layer) are still free to bleed above the card's top
            edge for the floating-app effect instead of getting cut off. */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-brand-orange to-[#66AD36]" />
          <div className="absolute w-[160px] h-[160px] rounded-full bg-[#3a3633] -top-12 -right-8" />
          {/* Purely decorative — no carousel behind this banner, just the same
             small dot accent the reference design has near the phone cluster. */}
          <div className="hidden md:flex absolute bottom-3 right-[70px] lg:right-[86px] items-center gap-[5px]">
            <span className="size-[5px] rounded-full bg-brand-orange/70" />
            <span className="size-[5px] rounded-full bg-white/25" />
          </div>
        </div>

        {/* Real 3-column grid (copy / QR / phones) at the exact proportions
           requested — `minmax(0,1.45fr) minmax(90px,0.5fr) minmax(220px,0.9fr)`
           — so the phone column gets a genuinely large, dedicated ~35% of
           the card's width instead of being squeezed into a small trailing
           cluster next to the QR. Below `md`, `order` reshuffles this into
           copy → phones → QR (phones as the hero visual right under the
           headline, QR last as a small secondary CTA) instead of the grid's
           copy → QR → phones column order. */}
        <div className="relative z-[1] flex flex-col items-center text-center gap-4 md:grid md:grid-cols-[minmax(0,1.45fr)_minmax(90px,0.5fr)_minmax(220px,0.9fr)] md:items-center md:text-left md:gap-3 lg:gap-5">
          <div className="order-1 min-w-0">
            <h3 className="text-[19px] sm:text-[21px] md:text-[22px] lg:text-[25px] font-bold text-white mb-1.5 leading-[1.2] tracking-tight md:whitespace-nowrap">
              Shop <span className="text-brand-orange">smarter.</span> Anywhere, anytime.
            </h3>
            <p className="text-[12px] md:text-[12px] text-[#b0aea8] max-w-[280px] mx-auto md:mx-0 leading-snug mb-3">
              Track orders, get app-only deals and shop faster with the Edudeen app.
            </p>
            {/* Real, visible CTAs — never hidden behind the phones/QR, which
               sit in their own dedicated grid columns, not on top of this. */}
            <div className="flex items-center justify-center md:justify-start gap-2">
              <StoreBadgeChip platform="ios" />
              <a
                href={GOOGLE_PLAY_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Get it on Google Play"
                className="rounded-[9px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                <StoreBadgeChip platform="android" />
              </a>
            </div>
          </div>

          {/* Phone cluster — the hero visual on mobile (right under the
             headline, before the QR), its own dedicated wide grid column on
             desktop (~35% of the card) via `order-3`/`md:order-3`, sized in
             px via `heightPx` (not a fixed width) so the two phones read as
             a real, large hero visual instead of a small thumbnail. Back
             phone: left + behind + tilted (-7deg); front: right + in front
             + upright (0deg); overlap ~40% of the front phone's width. */}
          <div className="order-2 md:order-3 flex items-center justify-center relative w-full min-h-[170px] md:min-h-[180px] py-2 md:py-3">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse 75% 70% at 50% 55%, rgba(23,71,113,0.28) 0%, rgba(23,71,113,0.10) 45%, transparent 75%)' }}
            />
            <div className="absolute bottom-2 w-[74px] h-[10px] rounded-[50%] bg-black/25 blur-[2px]" />
            <PhoneShell primary={false} size="sm" heightPx={165} className="-mr-[38px] -rotate-[7deg]">
              <OrdersScreenMockup />
            </PhoneShell>
            <PhoneShell size="sm" heightPx={185} className="rotate-0">
              <HomeScreenMockup />
            </PhoneShell>
          </div>

          {/* QR — its own dedicated grid column on desktop (`md:order-2`,
             between copy and phones); on mobile it comes last, right after
             the phones. Sized up to ~68px so it reads clearly, with its own
             breathing room on both sides rather than sitting flush against
             the phone cluster. */}
          <div className="order-3 md:order-2 flex flex-col items-center gap-[6px]">
            <a
              href={GOOGLE_PLAY_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Scan to download the Edudeen app"
              className="block rounded-xl border border-white/15 bg-white p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              {qrDataUrl
                ? <img src={qrDataUrl} alt="" width={68} height={68} className="block" />
                : <div className="w-[68px] h-[68px]" />}
            </a>
            <p className="text-[9.5px] text-[#b0aea8] leading-tight whitespace-nowrap">Scan to download</p>
          </div>
        </div>
      </div>

      <div className="md:min-h-[236px] rounded-2xl bg-brand-pale-orange px-6 py-4 flex flex-col justify-center gap-2">
        <p className="text-[14px] font-bold text-carbon leading-tight">Get deals before anyone else</p>
        <p className="text-[10.5px] text-charcoal/70 leading-snug">Sign up for exclusive offers, new arrivals and price-drop alerts.</p>
        <NewsletterMini />
        <div className="flex items-center justify-between gap-2 mt-1">
          {[
            { Icon: ShieldCheck, label: 'No spam',       sub: 'We promise' },
            { Icon: Percent,     label: 'Exclusive',     sub: 'App deals' },
            { Icon: Bell,        label: 'Instant',       sub: 'Notifications' },
          ].map(({ Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-[6px] min-w-0">
              <Icon size={13} className="text-brand-orange shrink-0" />
              <span className="min-w-0">
                <p className="text-[10px] font-semibold text-carbon leading-tight truncate">{label}</p>
                <p className="text-[9px] text-charcoal/60 leading-tight truncate">{sub}</p>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AppDownloadBanner({ className, variant = 'full' }: { className?: string; variant?: 'full' | 'compact' }) {
  if (variant === 'compact') return <CompactAppDownloadBanner className={className} />;
  // Self-fetches — this banner is reused across several pages that don't already
  // load platform stats, so it can't rely on a prop from the caller.
  const [stats, setStats] = useState<PlatformStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiGetPlatformStats()
      .then(res => { if (!cancelled) setStats(res.data); })
      .catch(() => { /* non-critical — trust stats just fall back to static copy */ });
    return () => { cancelled = true; };
  }, []);

  // "Secure Shopping" and "Customer Support" are policy statements, not measured
  // metrics — there's no backing field for either, so those two stay static.
  // Happy Shoppers / Verified Stores are real counts once they load.
  const trustStats = [
    { Icon: ShoppingBag, value: stats ? `${compactNumber.format(stats.buyersCount)}+` : '—', label: 'Happy Shoppers' },
    { Icon: ShieldCheck, value: '100%', label: 'Secure Shopping' },
    { Icon: Award,       value: stats ? `${compactNumber.format(stats.storesCount)}+` : '—', label: 'Verified Stores' },
    { Icon: Headphones,  value: '24/7', label: 'Customer Support' },
  ];

  return (
    <section className={clsx('relative overflow-hidden rounded-2xl bg-gradient-to-br from-carbon to-charcoal', className)}>
      {/* Thin top accent line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-brand-orange to-[#66AD36]" />

      {/* Soft ambient circle + faint dotted-grid texture — CSS only. No orange
          here — the only orange glow in this banner lives locally behind the
          phone mockups (see the phone-cluster spotlight below), not hero-wide. */}
      <div className="absolute w-[280px] h-[280px] rounded-full bg-[#3a3633] -top-20 -right-16 pointer-events-none" />
      <div
        className="hidden lg:block absolute right-0 top-0 bottom-0 w-[40%] opacity-[0.05] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      />

      <div className="relative z-[1] px-6 sm:px-8 lg:px-10 pt-6 sm:pt-7 pb-5 grid grid-cols-1 lg:grid-cols-[1.1fr_auto_auto] items-center gap-6 lg:gap-8">

        {/* Copy + features */}
        <div className="text-center lg:text-left min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3 bg-[rgba(23,71,113,0.15)] border border-[rgba(23,71,113,0.3)]">
            <ShoppingBag size={12} className="text-brand-orange shrink-0" />
            <span className="text-[11px] font-medium text-brand-orange">Edudeen Mobile</span>
          </div>
          <h3 className="text-[22px] sm:text-[25px] lg:text-[28px] font-bold text-white mb-2 leading-[1.15] tracking-tight">
            Shop <span className="text-brand-orange">smarter.</span> Anywhere, anytime.
          </h3>
          <p className="text-[12.5px] sm:text-[13px] text-[#b0aea8] max-w-[420px] mx-auto lg:mx-0 leading-relaxed mb-3">
            One-tap checkout, live order tracking, and app-only deals — right in your pocket.
          </p>

          <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
            <RatingRow />
          </div>

          {/* Feature cards */}
          <ul className="flex flex-col gap-[6px] mb-4">
            {FEATURES.map(({ Icon, title, sub }) => (
              <li
                key={title}
                className="flex items-center gap-[10px] text-left rounded-xl px-1 py-1"
              >
                <span className="w-8 h-8 rounded-[9px] border border-brand-orange/25 bg-brand-orange/[0.12] flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-brand-orange" />
                </span>
                <span className="min-w-0">
                  <p className="text-[12px] font-semibold text-white leading-tight">{title}</p>
                  <p className="text-[10.5px] text-slate leading-tight mt-[1px]">{sub}</p>
                </span>
              </li>
            ))}
          </ul>

          {/* Google Play links to the real internal-test build; App Store
              stays the decorative/non-clickable chip — no iOS build yet. */}
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <StoreBadgeChip platform="ios" />
            <a
              href={GOOGLE_PLAY_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="Get it on Google Play"
              className="rounded-[9px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <StoreBadgeChip platform="android" />
            </a>
          </div>
        </div>

        {/* QR code — its own column, beside the phones (not attached to them).
            Real, scannable — links to the Google Play internal-test build. */}
        <div className="hidden lg:flex flex-col items-start gap-[8px] shrink-0">
          <div className="rounded-2xl border-2 border-brand-orange/50 p-3">
            <RealAppQr size={84} />
          </div>
          <p className="text-[11px] text-[#b0aea8] leading-tight">Scan to download</p>
          <div className="flex items-center gap-[6px]">
            <Sparkles size={13} className="text-brand-orange" />
            <p className="text-[10.5px] text-brand-orange italic whitespace-nowrap">Android only — iOS coming soon</p>
          </div>
        </div>

        {/* Phone mockups — layered composition: back phone tilted left, lower,
            further left; front phone near-upright, overlapping ~40% of it. */}
        <div className="hidden lg:flex items-end justify-center shrink-0 relative pb-1 pl-6">
          {/* Localized "studio spotlight" — orange only immediately behind the
              phone cluster, fading to nothing well before the hero's edges. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 65% 60% at 50% 55%, rgba(23,71,113,0.30) 0%, rgba(23,71,113,0.12) 40%, transparent 72%)' }}
          />
          {/* Contact shadow — grounds the phones on the pedestal */}
          <div className="absolute bottom-0 w-[220px] h-[30px] rounded-[50%] bg-black/25 blur-[2px]" />

          <PhoneShell primary={false} className="-mr-[86px] -translate-x-[14px] translate-y-[16px] -rotate-[15deg]">
            <OrdersScreenMockup />
          </PhoneShell>
          <PhoneShell className="rotate-[1deg]">
            <HomeScreenMockup />
          </PhoneShell>
        </div>
      </div>

      {/* Trust stats — its own rounded/bordered card, sitting at the bottom of the banner */}
      <div className="relative z-[1] px-6 sm:px-8 lg:px-10 pb-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 sm:px-6 py-[14px]">
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-3">
            {trustStats.map(({ Icon, value, label }, i) => (
              <div key={label} className={clsx('flex items-center gap-[8px]', i > 0 && 'sm:border-l sm:border-white/10 sm:pl-4')}>
                <span className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                  <Icon size={13} className="text-brand-orange" />
                </span>
                <span>
                  <p className="text-[13px] font-bold text-white leading-none">{value}</p>
                  <p className="text-[10px] text-slate mt-[2px] whitespace-nowrap">{label}</p>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
