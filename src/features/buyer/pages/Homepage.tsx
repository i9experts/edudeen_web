import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSellEntry } from '@/hooks/auth/useSellEntry';
import { Button } from '@/components/comman/ui/Button';
import { Card } from '@/components/comman/ui/Card';
import { Avatar } from '@/components/comman/ui/Avatar';
import { Footer, SkeletonBox, ClosingCtaBanner } from '@/components/comman/ui';
import {
  ArrowRight, Store, Sparkles, Check,
  Star, BadgeCheck, Quote, Loader2,
  MonitorSmartphone, BarChart3, PackageCheck, Users, UserPlus, Link2, Rows3, TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { apiGetTestimonials, type Testimonial } from '@/api/services/testimonials';
import { apiGetPlatformStats, type PlatformStats } from '@/api/services/store';
import { Reveal, RevealStagger } from '@/components/comman/motion/Reveal';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';
import { SplitText } from '@/components/comman/motion/SplitText';
import { Marquee } from '@/components/comman/motion/Marquee';
import { useMouseParallax } from '@/components/comman/motion/useMouseParallax';
import { SectionHeading } from '@/components/comman/motion/SectionHeading';
import { PremiumCard } from '@/components/comman/motion/PremiumCard';
import { AnimatedCounter } from '@/components/comman/motion/AnimatedCounter';
import {
  StorefrontPreview, POSPreview, SellerDashboardPreview, MobileStorePreview, mockupForProductSlug,
} from '@/components/comman/mockups/ProductMockups';
import { PLATFORM_PRODUCTS, getPlatformProduct } from '@/features/buyer/data/platformProducts';
import { SOLUTIONS } from '@/features/buyer/data/solutions';
import { unsplashUrl } from '@/assets/stockPhotos';
import { motion, useReducedMotion, useTransform, useInView, useScroll, AnimatePresence } from 'motion/react';

const compactNumber   = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactCurrency = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'USD' });

// A single live-signal ticker instead of four scattered absolutely-
// positioned labels — those kept landing on top of the centered headline/
// copy at different viewport heights since their position was guessed as a
// % of the section rather than anchored to anything real. One ticker,
// pinned to the true top-right corner (never inside the centered content
// flow), cycling through real commerce signals with a fade+slide, reads as
// "this is a live system" without risking a collision.
const HERO_SIGNALS = [
  { label: 'New order',        detail: 'Nike Air Max — Rs 12,900' },
  { label: 'AI insight',       detail: 'This product is trending' },
  { label: 'Payment received', detail: '+ Rs 8,900' },
  { label: 'New customer',     detail: 'Sarah joined your store' },
] as const;

function HeroActivityTicker() {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setIndex(i => (i + 1) % HERO_SIGNALS.length), 2400);
    return () => clearInterval(id);
  }, [reduceMotion]);
  const signal = HERO_SIGNALS[index];
  return (
    <div className="hidden lg:block absolute top-8 right-8 lg:right-14 text-right z-[2]">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-2 justify-end">
            <span className="relative flex h-[5px] w-[5px]">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-orange pos-live-pulse" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{signal.label}</span>
          </div>
          <p className="text-[11.5px] text-white/30 mt-1">{signal.detail}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const PRODUCT_ICONS: Record<string, LucideIcon> = {
  'store-builder': Store,
  pos: MonitorSmartphone,
  'ai-commerce': Sparkles,
  analytics: BarChart3,
  inventory: PackageCheck,
  'orders-customers': Users,
};

const HOW_IT_WORKS = [
  { Icon: Store,    step: 'Create',  desc: 'Build your storefront from a curated theme, or set up POS to sell in person.' },
  { Icon: Link2,    step: 'Connect', desc: 'Add products, connect a payment method, and your inventory syncs across every channel.' },
  { Icon: Rows3,     step: 'Sell',    desc: 'Take orders online and in person — from the same catalog, the same stock.' },
  { Icon: TrendingUp, step: 'Grow',   desc: 'Use real analytics and AI tools to see what\'s working and do more of it.' },
] as const;

const EXPLORER_SLUGS = ['analytics', 'inventory', 'orders-customers'] as const;
const POS_STEPS = ['Search', 'Cart', 'Payment', 'Receipt'] as const;

const SHORT_PRODUCT_LABEL: Record<string, string> = {
  'store-builder': 'Store',
  pos: 'POS',
  'ai-commerce': 'AI',
  analytics: 'Analytics',
  inventory: 'Inventory',
  'orders-customers': 'Orders',
};

// ── "One business. One connected system." — a hub-and-spoke diagram whose
// nodes light up in sequence on scroll-in, then keep auto-cycling one at a
// time (pause on hover, click jumps straight there) — each active node
// drives a real preview panel below it, so the diagram isn't just
// decoration, it's the same tabbed-explorer pattern used elsewhere on the
// page, staged as a system map instead of a row of tabs. Every node is
// still a real, working link to its /products/:slug page. ──
function ConnectedSystemDiagram({ onNavigate, activeIndex, onHover, onLeave }: {
  onNavigate: (slug: string) => void;
  activeIndex: number;
  onHover: (i: number) => void;
  onLeave: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

  const positions = PLATFORM_PRODUCTS.map((_, i) => {
    const angle = (-90 + i * (360 / PLATFORM_PRODUCTS.length)) * (Math.PI / 180);
    return { x: 50 + 38 * Math.cos(angle), y: 50 + 40 * Math.sin(angle) };
  });

  return (
    <div ref={ref} className="relative w-full max-w-[720px] mx-auto aspect-[4/3.4]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
        {positions.map((pos, i) => (
          <motion.line
            key={i}
            x1={50} y1={50} x2={pos.x} y2={pos.y}
            stroke="var(--color-brand-orange)" strokeWidth={i === activeIndex ? 1 : 0.5} strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: i === activeIndex ? 0.9 : 0.3 } : {}}
            transition={{ duration: 0.5, delay: 0.25 + i * 0.1, ease: EASE_OUT, opacity: { duration: 0.3 } }}
          />
        ))}
      </svg>

      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[2] w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] rounded-full bg-gradient-to-br from-brand-orange to-brand-deep-orange flex items-center justify-center shadow-xl"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <span className="absolute inset-0 rounded-full bg-brand-orange/40 blur-lg -z-10" />
        <span className="text-white font-bold text-[14px] sm:text-[16px] tracking-tight">Edudeen</span>
      </motion.div>

      {PLATFORM_PRODUCTS.map((p, i) => {
        const Icon = PRODUCT_ICONS[p.slug] ?? Store;
        const pos = positions[i];
        const active = i === activeIndex;
        return (
          <motion.button
            key={p.slug}
            onClick={() => onNavigate(p.slug)}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={onLeave}
            className="absolute z-[2] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 bg-transparent border-none cursor-pointer group"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={inView ? { scale: active ? 1.14 : 1, opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.45 + i * 0.1, ease: EASE_OUT }}
          >
            <span className={clsx(
              'w-12 h-12 sm:w-[60px] sm:h-[60px] rounded-xl border flex items-center justify-center transition-all duration-300',
              active ? 'bg-brand-orange border-brand-orange shadow-card-hover -translate-y-0.5' : 'bg-white border-bone shadow-card group-hover:border-brand-orange/40',
            )}>
              <Icon size={20} className={active ? 'text-white' : 'text-brand-orange'} />
            </span>
            <span className="text-[11px] sm:text-[12px] font-semibold text-carbon whitespace-nowrap">{SHORT_PRODUCT_LABEL[p.slug] ?? p.name}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ── "AI that helps you sell smarter" gets its own visual — a data → analysis
// → recommendation flow, distinct from `AICommercePreview` (which stays the
// dashboard-shaped card used in the mega menu / explorer / connected-system
// panel) so this section doesn't just repeat the same mockup it's next to. ──
function AIFlowVisual() {
  const STAGES = [
    { label: 'Your data', sub: '412 orders this month', Icon: BarChart3, tone: 'bg-white/10 text-white' },
    { label: 'AI analysis', sub: 'Demand trending up 24%', Icon: Sparkles, tone: 'bg-accent-violet text-white' },
    { label: 'Recommendation', sub: 'Raise price by 8%', Icon: Check, tone: 'bg-success text-white' },
  ] as const;
  return (
    <div className="w-full rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/12 p-6 sm:p-7">
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-2">
        {STAGES.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 flex-1 w-full sm:w-auto">
            <div className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 p-4 text-center">
              <span className={clsx('inline-flex w-9 h-9 rounded-lg items-center justify-center mb-2.5', s.tone)}>
                <s.Icon size={16} />
              </span>
              <p className="text-[12.5px] font-bold text-white">{s.label}</p>
              <p className="text-[10.5px] text-white/50 mt-0.5">{s.sub}</p>
            </div>
            {i < STAGES.length - 1 && (
              <ArrowRight size={16} className="text-white/25 shrink-0 hidden sm:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Homepage() {
  const navigate = useNavigate();
  const sellEntry = useSellEntry();
  const reduceMotion = useReducedMotion();
  const heroSectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroSectionRef, offset: ['start start', 'end start'] });
  const heroTextFade = useTransform(heroScroll, [0, 0.85], [1, 0]);
  // Editorial hero — each headline line drifts a few px in an alternating
  // direction as the page scrolls, and the scroll indicator fades out
  // almost immediately once the visitor actually starts scrolling.
  const heroLine1X = useTransform(heroScroll, [0, 1], [0, 26]);
  const heroLine2X = useTransform(heroScroll, [0, 1], [0, -26]);
  const heroScrollHintOpacity = useTransform(heroScroll, [0, 0.12], [1, 0]);
  // Subtle cursor-driven 3D tilt on the headline itself — desktop-only, a
  // few degrees at most — so the huge type feels alive/responsive instead
  // of a flat static block, without resorting to a hero product image.
  const { ref: heroTiltRef, px: heroTiltPx, py: heroTiltPy } = useMouseParallax<HTMLDivElement>();
  const heroTiltRotateX = useTransform(heroTiltPy, [-0.5, 0.5], [5, -5]);
  const heroTiltRotateY = useTransform(heroTiltPx, [-0.5, 0.5], [-6, 6]);
  usePageTitle('Home');

  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiGetTestimonials(5)
      .then(res => { if (!cancelled) setTestimonials(res.data ?? []); })
      .catch(() => { /* non-critical — section just stays hidden */ })
      .finally(() => { if (!cancelled) setTestimonialsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGetPlatformStats()
      .then(res => { if (!cancelled) setStats(res.data); })
      .catch(() => { /* non-critical — stat strip just stays hidden */ })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Feature explorer tab auto-advance — paused while the pointer is over the
  // section, resumes when it leaves; a manual click just jumps straight to
  // that tab, no separate timer reset needed.
  const [explorerTab, setExplorerTab] = useState(0);
  const explorerPausedRef = useRef(false);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      if (!explorerPausedRef.current) setExplorerTab(i => (i + 1) % EXPLORER_SLUGS.length);
    }, 4500);
    return () => clearInterval(id);
  }, [reduceMotion]);

  // Connected-system diagram — same auto-cycle/pause/hover pattern, driving
  // both the diagram's active node AND the preview panel underneath it.
  const [systemActive, setSystemActive] = useState(0);
  const systemPausedRef = useRef(false);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      if (!systemPausedRef.current) setSystemActive(i => (i + 1) % PLATFORM_PRODUCTS.length);
    }, 3200);
    return () => clearInterval(id);
  }, [reduceMotion]);
  const systemActiveProduct = PLATFORM_PRODUCTS[systemActive];

  // POS workflow strip — a small self-contained step indicator, purely
  // narrative (doesn't drive POSPreview's own content), cycling to imply
  // "search → cart → payment → receipt" without a full workflow rebuild.
  const [posStep, setPosStep] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setPosStep(i => (i + 1) % POS_STEPS.length), 1400);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const activeExplorerProduct = getPlatformProduct(EXPLORER_SLUGS[explorerTab])!;

  const statItems = stats ? [
    { value: stats.sellersCount, format: (n: number) => `${compactNumber.format(n)}+`, label: 'Active Sellers' },
    { value: stats.gmv,          format: (n: number) => `${compactCurrency.format(n)}+`, label: 'GMV Processed' },
    { value: stats.buyersCount,  format: (n: number) => `${compactNumber.format(n)}+`,  label: 'Registered Buyers' },
    { value: stats.ratingCount > 0 ? stats.avgRating : null, format: (n: number) => `${n.toFixed(1)} ★`, label: 'Average Rating' },
  ] : [];

  return (
    <div className="bg-white min-h-full">

      {/* ── Hero — typography-driven, not a screenshot-plus-text layout. The
         headline itself is the visual; there is deliberately no product
         mockup here (every real product gets its own dedicated visual
         further down the page instead). ─────────────────────────────────── */}
      <section ref={heroSectionRef} className="relative overflow-hidden bg-carbon min-h-[92vh] md:min-h-[100vh] flex flex-col">

        {/* Living background — a faintly drifting line grid (the "system"
           motif) instead of an empty black rectangle, plus a slow-breathing
           glow seated behind the accent headline line. Both are pure CSS,
           both respect prefers-reduced-motion via the app-wide rule. */}
        <div className="hero-grid-drift absolute inset-0 pointer-events-none opacity-60" />
        <div className="hero-breath absolute top-[38%] left-[8%] w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,var(--color-brand-orange)_0%,transparent_70%)] blur-3xl pointer-events-none" />

        <HeroActivityTicker />

        <div ref={heroTiltRef} className="relative z-[1] flex-1 flex flex-col justify-center px-5 sm:px-8 lg:px-14 pt-24 pb-16">
          <motion.div style={reduceMotion ? undefined : { opacity: heroTextFade }}>
            <Reveal delay={0}>
              <p className="flex items-center gap-2 text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.22em] text-brand-orange mb-6">
                <span className="w-[7px] h-[7px] rounded-full bg-brand-orange" />
                Edudeen — One connected commerce system
              </p>
            </Reveal>

            <motion.div style={reduceMotion ? undefined : { rotateX: heroTiltRotateX, rotateY: heroTiltRotateY, transformPerspective: 1000 }}>
              <h1 className="font-sans font-extrabold text-white leading-[0.94] tracking-[-0.03em] pb-[0.05em]">
                <motion.div style={reduceMotion ? undefined : { x: heroLine1X }}>
                  <SplitText
                    as="div"
                    text="Create. Sell."
                    delay={0.1}
                    stagger={0.07}
                    animateOnMount
                    className="text-[15vw] sm:text-[12vw] lg:text-[9.5vw] block"
                  />
                </motion.div>
                <motion.div style={reduceMotion ? undefined : { x: heroLine2X }}>
                  <SplitText
                    as="div"
                    text="Manage. Grow."
                    delay={0.3}
                    stagger={0.07}
                    animateOnMount
                    className="text-[15vw] sm:text-[12vw] lg:text-[9.5vw] block bg-gradient-to-r from-brand-orange to-[#f0a57a] bg-clip-text text-transparent"
                  />
                </motion.div>
                {/* Third giant line — same masked-reveal treatment as the
                   two lines above it, not a separate small paragraph. Names
                   a real, specific Edudeen differentiator (self-serve
                   activation — see "Seller activation is self-serve" in
                   CLAUDE.md) instead of a generic "One Platform." filler,
                   so the headline actually says something true and unique
                   to this product, not stock SaaS copy. Hollow/outline fill
                   (vs. the solid white and gradient fills above it) gives
                   the headline a layered, editorial hierarchy at this size
                   instead of three identically-styled lines. */}
                <SplitText
                  as="div"
                  text="Launch Instantly."
                  delay={0.5}
                  stagger={0.07}
                  animateOnMount
                  className="hero-outline-text text-[13vw] sm:text-[10.5vw] lg:text-[8vw] block"
                />
              </h1>
            </motion.div>

            <div className="mt-[9vw] sm:mt-[5vw] lg:mt-[3.5vw] flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 max-w-[1100px]">
              <Reveal delay={0.55}>
                <p className="text-[13.5px] sm:text-[14.5px] text-[#b0aea8] leading-[1.75] max-w-[420px]">
                  One connected commerce platform — build your store, sell in person with POS, manage every order, and grow with real analytics and AI.
                </p>
              </Reveal>

              <Reveal delay={0.68}>
                <div className="flex flex-col sm:flex-row items-start gap-3 shrink-0">
                  <MagneticButton className="w-full sm:w-auto">
                    <button
                      onClick={sellEntry.go}
                      disabled={sellEntry.loading}
                      data-cursor="hover"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-[11px] rounded-lg text-[13.5px] font-semibold text-white bg-gradient-to-r from-brand-orange to-brand-deep-orange hover:brightness-105 transition-[filter] cursor-pointer disabled:opacity-60"
                    >
                      {sellEntry.loading ? <Loader2 size={14} className="animate-spin" /> : null}
                      Start Selling Free <ArrowRight size={13} className="inline align-middle" />
                    </button>
                  </MagneticButton>
                  <MagneticButton className="w-full sm:w-auto">
                    <button
                      onClick={() => navigate('/products')}
                      className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-[10px] rounded-lg text-[13px] font-medium text-white border border-[rgba(255,255,255,0.25)] bg-transparent hover:bg-[rgba(255,255,255,0.08)] hover:border-white/40 transition-all cursor-pointer"
                    >
                      Explore the Platform
                      <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </MagneticButton>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.8}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-8">
                {['Self-serve setup — no approval queue', 'One login for store, POS & analytics', 'Real-time inventory sync'].map(label => (
                  <span key={label} className="text-[11.5px] text-white/35">{label}</span>
                ))}
              </div>
            </Reveal>
          </motion.div>
        </div>

        {/* Scroll indicator — fades out almost as soon as scrolling starts */}
        <motion.div
          style={reduceMotion ? undefined : { opacity: heroScrollHintOpacity }}
          className="relative z-[1] hidden sm:flex flex-col items-center gap-2 pb-8 text-white/40"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Scroll to explore</span>
          <motion.span
            animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          >
            <ArrowRight size={14} className="rotate-90" />
          </motion.span>
        </motion.div>
      </section>

      {/* ── Industries strip — a continuous marquee instead of a static pill
         row, editorial text links (no pill chrome) with a dot separator,
         real navigation into /solutions on click. ── */}
      <section className="bg-carbon border-b border-bone/20 py-5 overflow-hidden">
        <Marquee duration={26}>
          {SOLUTIONS.map(s => (
            <span key={s.slug} className="flex items-center shrink-0">
              <button
                onClick={() => navigate(`/solutions/${s.slug}`)}
                data-cursor="hover"
                className="text-[15px] sm:text-[17px] font-semibold uppercase tracking-[0.02em] text-white/50 hover:text-white transition-colors duration-300 bg-transparent border-none cursor-pointer px-5"
              >
                {s.name}
              </button>
              <span className="w-[5px] h-[5px] rounded-full bg-brand-orange/60 shrink-0" />
            </span>
          ))}
        </Marquee>
      </section>

      {/* ── One connected system — the strongest section on the page. A
         hub-and-spoke diagram whose active node drives a real preview panel
         underneath it, not a flat card grid. Every node is a real,
         clickable link into that product's own page. ── */}
      <section
        className="relative overflow-hidden py-20 sm:py-28 lg:py-36 px-4 sm:px-6 lg:px-12 bg-cream"
        onMouseEnter={() => { systemPausedRef.current = true; }}
        onMouseLeave={() => { systemPausedRef.current = false; }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,var(--color-brand-orange)_0%,transparent_65%)] opacity-[0.06] pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative max-w-[1320px] mx-auto">
          <div className="text-center max-w-[900px] mx-auto mb-16 lg:mb-20">
            <Reveal>
              <p className="text-[11px] font-semibold text-brand-deep-orange uppercase tracking-[0.12em] mb-5">The Edudeen difference</p>
            </Reveal>
            <h2 className="font-serif text-[40px] sm:text-[64px] lg:text-[84px] font-bold text-carbon leading-[1.02] tracking-[-0.015em]">
              <SplitText as="div" text="One business." delay={0.05} />
              <SplitText as="div" text="One connected system." delay={0.2} />
            </h2>
            <Reveal delay={0.4}>
              <p className="text-[15px] sm:text-[17px] text-slate leading-[1.7] mt-7 max-w-[620px] mx-auto">
                Store, POS, inventory, orders, customers, payments and analytics all read from the same real data — a sale at the counter updates the same stock your storefront shows, instantly.
              </p>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <ConnectedSystemDiagram
              onNavigate={slug => navigate(`/products/${slug}`)}
              activeIndex={systemActive}
              onHover={setSystemActive}
              onLeave={() => {}}
            />

            <div className="relative rounded-[24px] bg-white border border-bone shadow-raised p-6 sm:p-8">
              <p className="text-[11px] font-semibold text-brand-orange uppercase tracking-[0.1em] mb-2">{systemActiveProduct.name}</p>
              <p className="text-[13.5px] text-slate leading-[1.65] mb-5 max-w-[420px]">{systemActiveProduct.heroSubtext}</p>
              <div className="relative min-h-[240px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={systemActiveProduct.slug}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {mockupForProductSlug(systemActiveProduct.slug)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Store Builder ── */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-12 bg-white">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] gap-10 lg:gap-14 items-center">
          <Reveal>
            <p className="text-[11px] font-semibold text-brand-orange uppercase tracking-[0.1em] mb-3">Store Builder</p>
            <h2 className="text-[24px] sm:text-[32px] font-bold text-carbon leading-[1.2] mb-4" style={{ fontFamily: "'Lora', Georgia, serif" }}>
              Build a store that feels like your brand.
            </h2>
            <p className="text-[14px] text-slate leading-[1.7] mb-5">
              A real drag-and-drop storefront editor — themes, sections, header and footer — with a live preview, not a template you're stuck with.
            </p>
            <div className="flex flex-col gap-2 mb-6">
              {['Curated theme library', 'Section-by-section page editing', 'Live desktop & mobile preview', 'Your own store subdomain'].map(f => (
                <div key={f} className="flex items-center gap-2.5">
                  <Check size={14} className="text-success shrink-0" />
                  <span className="text-[13px] text-charcoal">{f}</span>
                </div>
              ))}
            </div>
            <MagneticButton>
              <Button onClick={() => navigate('/products/store-builder')}>
                Explore Store Builder <ArrowRight size={14} className="inline align-middle ml-1" />
              </Button>
            </MagneticButton>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="flex -space-x-1">
                {['#D97757', '#141413', '#7C3AED', '#2D8A4E'].map(c => (
                  <span key={c} className="w-6 h-6 rounded-full border-2 border-white shadow-sm" style={{ background: c }} />
                ))}
              </div>
              <span className="text-[11px] text-slate">Pick a theme, edit sections, publish</span>
              <ArrowRight size={12} className="text-slate/50" />
            </div>
            <div className="relative">
              <StorefrontPreview />
              {/* Mobile-preview companion — literally illustrates the "Live
                 desktop & mobile preview" bullet above instead of leaving it
                 as an unproven text claim. */}
              <div className="hidden sm:block absolute -bottom-7 -right-6 w-[110px] xl:w-[122px] drop-shadow-xl">
                <MobileStorePreview />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── POS ── */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-12 bg-cream">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] gap-10 lg:gap-14 items-center">
          <Reveal className="lg:order-2">
            <p className="text-[11px] font-semibold text-brand-orange uppercase tracking-[0.1em] mb-3">Point of Sale</p>
            <h2 className="text-[24px] sm:text-[32px] font-bold text-carbon leading-[1.2] mb-4" style={{ fontFamily: "'Lora', Georgia, serif" }}>
              Sell in-store. Sell online. One connected system.
            </h2>
            <p className="text-[14px] text-slate leading-[1.7] mb-5">
              A real point-of-sale terminal that shares the exact same inventory and order records as your online store — no separate system to reconcile.
            </p>
            <div className="flex flex-col gap-2 mb-6">
              {['PIN-based employee login', 'Real-time inventory sync', 'Works standalone, with no storefront needed', 'Register session tracking'].map(f => (
                <div key={f} className="flex items-center gap-2.5">
                  <Check size={14} className="text-success shrink-0" />
                  <span className="text-[13px] text-charcoal">{f}</span>
                </div>
              ))}
            </div>
            <MagneticButton>
              <Button onClick={() => navigate('/products/pos')}>
                Explore POS <ArrowRight size={14} className="inline align-middle ml-1" />
              </Button>
            </MagneticButton>
          </Reveal>
          <Reveal delay={0.1} className="lg:order-1">
            <div className="flex items-center justify-center gap-1.5 mb-3">
              {POS_STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors duration-300',
                    i === posStep ? 'bg-brand-orange text-white' : 'bg-bone text-slate',
                  )}>
                    {i + 1}
                  </span>
                  <span className={clsx('text-[11px] font-medium transition-colors duration-300 hidden sm:inline', i === posStep ? 'text-carbon' : 'text-slate')}>{s}</span>
                  {i < POS_STEPS.length - 1 && <ArrowRight size={11} className="text-slate/40 mx-0.5" />}
                </div>
              ))}
            </div>
            <POSPreview />
          </Reveal>
        </div>
      </section>

      {/* ── AI Commerce ── */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-12 bg-carbon relative overflow-hidden">
        <div className="absolute w-[300px] h-[300px] rounded-full bg-accent-violet/15 blur-3xl -top-20 -left-16 pointer-events-none" />
        <div className="relative z-[1] max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[0.82fr_1.18fr] gap-10 lg:gap-14 items-center">
          <Reveal>
            <p className="text-[11px] font-semibold text-accent-violet uppercase tracking-[0.1em] mb-3">AI Commerce</p>
            <h2 className="text-[24px] sm:text-[32px] font-bold text-white leading-[1.2] mb-4" style={{ fontFamily: "'Lora', Georgia, serif" }}>
              AI that helps you sell smarter.
            </h2>
            <p className="text-[14px] text-[#b0aea8] leading-[1.7] mb-5">
              Real AI tools built into your workspace — for the writing and analysis work that normally eats the most time. A productivity tool, not a sales guarantee.
            </p>
            <div className="flex flex-col gap-2 mb-6">
              {['AI-assisted product descriptions', 'Metered through an AI credits wallet', 'Built into the seller dashboard'].map(f => (
                <div key={f} className="flex items-center gap-2.5">
                  <Check size={14} className="text-accent-violet shrink-0" />
                  <span className="text-[13px] text-[#d8d6d0]">{f}</span>
                </div>
              ))}
            </div>
            <MagneticButton>
              <Button variant="dark" onClick={() => navigate('/products/ai-commerce')}>
                Explore AI Commerce <ArrowRight size={14} className="inline align-middle ml-1" />
              </Button>
            </MagneticButton>
          </Reveal>
          <Reveal delay={0.1}>
            <AIFlowVisual />
          </Reveal>
        </div>
      </section>

      {/* ── Seller Dashboard preview ── */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-12 bg-white">
        <div className="max-w-[1200px] mx-auto text-center">
          <SectionHeading title="Everything your business needs, in one dashboard." subtitle="Revenue, orders, customers and top products — computed from your real data, not a simulated preview." align="center" size="lg" className="mb-10" />
          <Reveal delay={0.1}>
            <SellerDashboardPreview className="max-w-[960px] mx-auto" />
          </Reveal>
        </div>
      </section>

      {/* ── Workspace Explorer — a large, immersive dashboard exploration,
         not another tab strip. Distinct crossfade (scale+blur) from the
         connected-system section above it. ── */}
      <section
        className="bg-carbon relative overflow-hidden py-16 sm:py-20 lg:py-24"
        onMouseEnter={() => { explorerPausedRef.current = true; }}
        onMouseLeave={() => { explorerPausedRef.current = false; }}
      >
        <div className="absolute w-[320px] h-[320px] rounded-full bg-brand-orange/15 blur-3xl -bottom-32 right-[8%] pointer-events-none" />
        <div className="absolute w-[240px] h-[240px] rounded-full bg-accent-violet/12 blur-3xl top-[10%] -left-16 pointer-events-none" />
        <div className="relative z-[1] px-4 sm:px-6 lg:px-12">
          <SectionHeading kicker="Keep exploring" title="Step inside the workspace" subtitle="The same dashboard a seller actually uses — revenue, stock, orders and AI, all live in one place." tone="dark" align="center" className="mb-12 sm:mb-14" />

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-12 items-stretch max-w-[1000px] mx-auto">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0 scrollbar-hide">
              {EXPLORER_SLUGS.map((slug, i) => {
                const product = getPlatformProduct(slug)!;
                const Icon = PRODUCT_ICONS[slug] ?? Store;
                const isActive = i === explorerTab;
                return (
                  <button
                    key={slug}
                    onClick={() => setExplorerTab(i)}
                    className={clsx(
                      'relative shrink-0 lg:shrink text-left rounded-xl px-4 py-4 border transition-all duration-300 cursor-pointer w-[220px] lg:w-auto overflow-hidden',
                      isActive ? 'bg-white/[0.08] border-brand-orange/40' : 'bg-transparent border-white/10 hover:border-white/20',
                    )}
                  >
                    {isActive && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-orange" />}
                    <span className="flex items-center gap-3">
                      <span className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300', isActive ? 'bg-brand-orange text-white' : 'bg-white/10 text-white/60')}>
                        <Icon size={17} />
                      </span>
                      <span>
                        <span className="block text-[13.5px] font-bold text-white">{product.name}</span>
                        <span className="hidden lg:block text-[11px] text-white/50 mt-0.5">{product.tagline}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative min-h-[340px] flex flex-col sm:flex-row items-center gap-8 rounded-[24px] bg-white/[0.05] backdrop-blur-md border border-white/12 overflow-hidden p-6 sm:p-9">
              <div className="absolute -inset-px rounded-[24px] bg-gradient-to-br from-brand-orange/10 via-transparent to-transparent pointer-events-none" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeExplorerProduct.slug}
                  initial={{ opacity: 0, scale: 0.94, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.94, filter: 'blur(6px)' }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="relative z-[1] flex flex-col sm:flex-row items-center gap-8 w-full"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-white mb-2.5">{activeExplorerProduct.name}</p>
                    <p className="text-[12.5px] text-white/60 leading-[1.65] mb-4">{activeExplorerProduct.heroSubtext}</p>
                    <div className="flex flex-col gap-2">
                      {activeExplorerProduct.features.slice(0, 3).map(f => (
                        <div key={f} className="flex items-center gap-2">
                          <Check size={12} className="text-success shrink-0" />
                          <span className="text-[12px] text-white/75">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="w-full sm:w-[320px] shrink-0">
                    {mockupForProductSlug(activeExplorerProduct.slug)}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ── How Edudeen works ── */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-12 bg-white">
        <div className="max-w-[1000px] mx-auto">
          <SectionHeading title="How Edudeen works" align="center" size="lg" className="mb-10" />
          <RevealStagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" step={0.08} y={20}>
            {HOW_IT_WORKS.map(({ Icon, step, desc }, i) => (
              <div key={step} className="relative text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-pale-orange flex items-center justify-center mx-auto mb-4">
                  <Icon size={24} className="text-brand-orange" />
                </div>
                <p className="text-[15px] font-bold text-carbon mb-1.5">{i + 1}. {step}</p>
                <p className="text-[12.5px] text-slate leading-[1.6]">{desc}</p>
              </div>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* ── Industries — full-bleed editorial image cards, text overlaid on
         the photo itself, not a photo-on-top / caption-below card. ── */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-12 bg-cream">
        <div className="max-w-[1100px] mx-auto">
          <SectionHeading kicker="Built for the way you sell" title="Whatever you sell, we've got you covered." align="center" size="lg" className="mb-10" />
          <RevealStagger className="grid grid-cols-2 sm:grid-cols-3 gap-4" step={0.06} y={18}>
            {SOLUTIONS.map(s => (
              <PremiumCard key={s.slug} onClick={() => navigate(`/solutions/${s.slug}`)} className="group relative overflow-hidden p-0 aspect-[4/5]">
                <img src={unsplashUrl(s.image, 320)} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3.5 flex items-end justify-between gap-2">
                  <p className="text-[13px] font-bold text-white leading-tight">{s.name}</p>
                  <span className="w-7 h-7 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-brand-orange group-hover:border-brand-orange">
                    <ArrowRight size={13} className="text-white" />
                  </span>
                </div>
              </PremiumCard>
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* ── Stats — real platform figures, self-hides until there's real data ── */}
      {(statsLoading || statItems.length > 0) && (
        <section className="py-12 sm:py-14 px-4 sm:px-6 lg:px-12 bg-white border-t border-b border-bone">
          <RevealStagger className="max-w-[1000px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center" step={0.08} y={14}>
            {statsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="text-center">
                    <SkeletonBox width={70} height={32} className="mb-2 mx-auto" />
                    <SkeletonBox width={90} height={13} className="mx-auto" />
                  </div>
                ))
              : statItems.map(s => (
                  <div key={s.label} className="text-center">
                    {s.value === null
                      ? <p className="block text-[32px] font-bold text-brand-orange">—</p>
                      : <AnimatedCounter value={s.value} format={s.format} className="block text-[32px] font-bold text-brand-orange" />}
                    <p className="text-[13px] text-slate">{s.label}</p>
                  </div>
                ))}
          </RevealStagger>
        </section>
      )}

      <ClosingCtaBanner />

      {/* ── Social Proof — real reviews only; section hides itself until there's enough real content ── */}
      {(testimonialsLoading || testimonials.length > 0) && (
        <section className="bg-cream border-t border-bone py-10 sm:py-12 lg:py-14">
          <div className="px-4 sm:px-6 lg:px-12">
            <SectionHeading kicker="Trusted by creators worldwide" title="Real stories from real sellers" align="center" className="mb-10" />
            {/* flex-wrap + centered, not a fixed 3-column grid — real
               testimonial count varies, and a rigid grid left fewer-than-3
               cards stranded on the left with a lopsided empty gap instead of
               sitting centered as a deliberate row. */}
            <RevealStagger className="flex flex-wrap justify-center gap-4" step={0.1} y={16}>
              {testimonialsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} padding="none" className="w-full sm:w-[340px]">
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <SkeletonBox width={70} height={12} />
                          <SkeletonBox width={22} height={22} rounded="6px" />
                        </div>
                        <SkeletonBox width="100%" height={13} className="mb-2" />
                        <SkeletonBox width="80%" height={13} className="mb-4" />
                        <div className="flex items-center gap-[10px] pt-3 border-t border-bone">
                          <SkeletonBox width={30} height={30} rounded="999px" />
                          <div>
                            <SkeletonBox width={90} height={13} className="mb-1" />
                            <SkeletonBox width={70} height={11} />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                : testimonials.map(t => (
                    <Card key={t.id} padding="none" hover className="group relative overflow-hidden w-full sm:w-[340px]">
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-orange to-[#f0a57a] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-[2px]">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star key={i} size={12} className={i <= Math.round(t.rating) ? 'text-brand-orange fill-brand-orange' : 'text-bone fill-bone'} />
                            ))}
                          </div>
                          <Quote size={20} className="text-brand-orange/20 fill-brand-orange/20 shrink-0" />
                        </div>
                        <p className="text-[13px] text-charcoal leading-[1.75] mb-4 italic">
                          "{t.text}"
                        </p>
                        <div className="flex items-center gap-[10px] pt-3 border-t border-bone">
                          <Avatar name={t.name} size={30} />
                          <div>
                            <div className="flex items-center gap-[6px]">
                              <p className="text-[13px] font-semibold text-carbon">{t.name}</p>
                              {t.isVerifiedSeller && <BadgeCheck size={13} className="text-info fill-info/15 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-slate">{t.storeName ? `Owner, ${t.storeName}` : 'Verified Seller'}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
            </RevealStagger>
          </div>
        </section>
      )}

      {/* ── Final CTA — a dark spotlight card floating on a LIGHT section,
         deliberately not another full-bleed dark block. The industries grid
         above is white and the Footer right below is dark-carbon — stacking
         a third full-dark section directly between them collapsed all three
         into one indistinguishable dark mass with no visible seams. Putting
         the card's own explicit dark bg on a bg-cream section restores the
         page's established white/orange/cream rhythm and gives the Footer's
         dark bg a real edge to contrast against again. ── */}
      <section className="relative bg-cream px-4 sm:px-6 lg:px-12 py-12 sm:py-16">
        <Reveal className="relative max-w-[860px] mx-auto overflow-hidden rounded-[24px] bg-carbon shadow-raised px-6 sm:px-12 py-10 sm:py-14 text-center">
          <div className="hero-grid-drift absolute inset-0 pointer-events-none opacity-25" />
          <div className="hero-breath absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-[radial-gradient(circle,var(--color-brand-orange)_0%,transparent_70%)] blur-3xl pointer-events-none" />

          <div className="relative z-[1]">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-brand-orange mb-3">
              Create · Sell · Manage · Grow
            </p>

            <h2 className="font-sans font-extrabold text-white leading-[1.12] tracking-[-0.02em]">
              <SplitText as="div" text="Ready to build," delay={0.08} className="text-[22px] sm:text-[27px] lg:text-[30px] block" />
              <SplitText
                as="div"
                text="sell and grow?"
                delay={0.24}
                className="text-[22px] sm:text-[27px] lg:text-[30px] block bg-gradient-to-r from-brand-orange to-[#f0a57a] bg-clip-text text-transparent"
              />
            </h2>

            <p className="text-[12.5px] text-[#b0aea8] leading-[1.6] mt-3 mb-6 max-w-[400px] mx-auto">
              One connected commerce platform — no separate tools to stitch together, no approval queue to wait on.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <MagneticButton>
                <Button size="lg" onClick={sellEntry.go} loading={sellEntry.loading} icon={<UserPlus size={14} />}>
                  Start Selling Free
                </Button>
              </MagneticButton>
              <MagneticButton>
                <Button variant="outline" size="lg" onClick={() => navigate('/products')} icon={<ArrowRight size={14} />}>
                  Explore the Platform
                </Button>
              </MagneticButton>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
