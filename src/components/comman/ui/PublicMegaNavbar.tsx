import { useState, useRef, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { Variants } from 'motion/react';
import {
  Store, BarChart3, PackageCheck, Users,
  ChevronDown, ArrowRight, Plus, LifeBuoy, HelpCircle, Mail,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EdudeenLogo } from './EdudeenLogo';
import { TokenStorage } from '@/api/services/auth';
import { ProfileAvatar } from './ProfileAvatar';
import { PlatformTopBar } from './PlatformTopBar';
import { useSellEntry } from '@/hooks/auth/useSellEntry';
import { useCompactOnScroll } from './BuyerNavbar';
import { PLATFORM_PRODUCTS } from '@/features/buyer/data/platformProducts';
import { SOLUTIONS } from '@/features/buyer/data/solutions';
import { unsplashUrl } from '@/assets/stockPhotos';
import { mockupForProductSlug } from '@/components/comman/mockups/ProductMockups';

const NAV_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PRODUCT_ICONS: Record<string, LucideIcon> = {
  'store-builder': Store,
  analytics: BarChart3,
  inventory: PackageCheck,
  'orders-customers': Users,
};

const RESOURCE_LINKS = [
  { Icon: HelpCircle, label: 'FAQ', desc: 'Answers to common questions', path: '/faq' },
  { Icon: LifeBuoy,    label: 'Help Center', desc: 'Get support from our team', path: '/help' },
  { Icon: Mail,        label: 'Contact Us', desc: 'Reach sales, support or partnerships', path: '/contact-us' },
];

type MenuKey = 'products' | 'solutions' | 'resources' | null;

function DesktopMenuButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-1 text-[13px] font-medium px-1 py-2 bg-transparent border-none cursor-pointer transition-colors',
        active ? 'text-brand-orange' : 'text-charcoal hover:text-brand-orange',
      )}
    >
      {label} <ChevronDown size={13} className={clsx('transition-transform duration-200', active && 'rotate-180')} />
    </button>
  );
}

// Real hamburger→X bar morph (two bars rotating/translating to converge),
// not an icon swap — the touch target is a full 44px even though the
// visible glyph is small.
function MobileMenuButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  const reduceMotion = useReducedMotion();
  const transition = { duration: reduceMotion ? 0 : 0.32, ease: NAV_EASE };
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      aria-controls="mobile-nav-panel"
      className="lg:hidden relative flex items-center justify-center w-11 h-11 -mr-1 bg-transparent border-none cursor-pointer"
    >
      <motion.span
        className="absolute w-[19px] h-[1.5px] rounded-full bg-carbon"
        animate={{ y: open ? 0 : -4, rotate: open ? 45 : 0 }}
        transition={transition}
      />
      <motion.span
        className="absolute w-[19px] h-[1.5px] rounded-full bg-carbon"
        animate={{ y: open ? 0 : 4, rotate: open ? -45 : 0 }}
        transition={transition}
      />
    </button>
  );
}

// ── Mobile overlay motion choreography ──────────────────────────────────────
// Panel reveals via clip-path wipe (not a side drawer). Rows live behind an
// `overflow-hidden` mask each and slide up into place, staggered by the
// parent list container — matches the "slide upward from behind a mask"
// choreography rather than a simultaneous fade.
const navListVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.14 } },
};
const navRowVariants: Variants = {
  hidden: { y: '100%' },
  show: { y: '0%', transition: { duration: 0.55, ease: NAV_EASE } },
};
const navFadeVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: NAV_EASE } },
};

export function PublicMegaNavbar() {
  const navigate = useNavigate();
  const sellEntry = useSellEntry();
  const { scrolled } = useCompactOnScroll();
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<'products' | 'solutions' | 'resources' | null>(null);
  const [hoveredProduct, setHoveredProduct] = useState(PLATFORM_PRODUCTS[0].slug);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNow = useCallback((key: MenuKey) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(key);
  }, []);
  const closeSoon = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120);
  }, []);
  const closeMenu = useCallback(() => setMobileOpen(false), []);

  // Lock the page underneath while the overlay is open — the overlay itself
  // scrolls independently (`overscroll-contain`), the homepage must not.
  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  // Accordions reset closed each time the panel is reopened, rather than
  // remembering whatever was expanded on a previous visit.
  useEffect(() => {
    if (!mobileOpen) setExpanded(null);
  }, [mobileOpen]);

  const loggedIn = TokenStorage.isLoggedIn();

  return (
    <>
      <header
        className={clsx(
          'sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-200 border-b',
          scrolled ? 'bg-white/95 backdrop-blur-md border-bone shadow-[0_1px_0_rgba(0,0,0,0.03)]' : 'bg-white/80 backdrop-blur-sm border-transparent',
        )}
        onMouseLeave={closeSoon}
      >
        <PlatformTopBar />
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0" aria-label="Edudeen home">
            <EdudeenLogo size={28} />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-6">
            <div onMouseEnter={() => openNow('products')}>
              <DesktopMenuButton label="Products" active={openMenu === 'products'} onClick={() => openNow(openMenu === 'products' ? null : 'products')} />
            </div>
            <div onMouseEnter={() => openNow('solutions')}>
              <DesktopMenuButton label="Solutions" active={openMenu === 'solutions'} onClick={() => openNow(openMenu === 'solutions' ? null : 'solutions')} />
            </div>
            <div onMouseEnter={() => openNow('resources')}>
              <DesktopMenuButton label="Resources" active={openMenu === 'resources'} onClick={() => openNow(openMenu === 'resources' ? null : 'resources')} />
            </div>
            <Link to="/pricing" onMouseEnter={() => openNow(null)} className="text-[13px] font-medium text-charcoal hover:text-brand-orange transition-colors">Pricing</Link>
            <Link to="/sellers" onMouseEnter={() => openNow(null)} className="text-[13px] font-medium text-charcoal hover:text-brand-orange transition-colors">For Sellers</Link>
          </nav>

          {/* Actions */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {loggedIn ? (
              <ProfileAvatar withNotifications />
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="text-[13px] font-medium text-charcoal hover:text-brand-orange transition-colors bg-transparent border-none cursor-pointer">
                  Log in
                </button>
                <button
                  onClick={sellEntry.go}
                  disabled={sellEntry.loading}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-brand-orange hover:bg-brand-deep-orange transition-colors rounded-lg px-4 py-[9px] border-none cursor-pointer disabled:opacity-60"
                >
                  Start Selling
                </button>
              </>
            )}
          </div>

          {/* Mobile/tablet header controls — kept deliberately minimal: "Log
             in" (a returning seller's primary action, so it stays visible at
             every width, not buried inside the hamburger panel), an optional
             compact CTA (hidden on the smallest phones so the header never
             feels crowded at 320–414px), and the menu toggle. */}
          <div className="lg:hidden flex items-center gap-1.5 shrink-0">
            {!loggedIn && (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="text-[12.5px] font-medium text-charcoal hover:text-brand-orange transition-colors bg-transparent border-none cursor-pointer px-1.5"
                >
                  Log in
                </button>
                <button
                  onClick={sellEntry.go}
                  disabled={sellEntry.loading}
                  className="hidden sm:inline-flex items-center text-[12.5px] font-semibold text-white bg-brand-orange hover:bg-brand-deep-orange transition-colors rounded-lg px-3.5 py-[7px] border-none cursor-pointer disabled:opacity-60"
                >
                  Start Selling
                </button>
              </>
            )}
            <MobileMenuButton open={mobileOpen} onClick={() => setMobileOpen(o => !o)} />
          </div>
        </div>

        {/* Mega menu panels (desktop only, unchanged) */}
        <AnimatePresence>
          {openMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: NAV_EASE }}
              onMouseEnter={() => openNow(openMenu)}
              className="hidden lg:block absolute left-0 right-0 top-full bg-white border-b border-bone shadow-xl"
            >
              <div className="max-w-[1280px] mx-auto px-8 py-7">
                {openMenu === 'products' && (
                  <div className="grid grid-cols-[1fr_320px] gap-8">
                    <div className="grid grid-cols-2 gap-1">
                      {PLATFORM_PRODUCTS.map(p => {
                        const Icon = PRODUCT_ICONS[p.slug] ?? Store;
                        return (
                          <Link
                            key={p.slug}
                            to={`/products/${p.slug}`}
                            onClick={() => setOpenMenu(null)}
                            onMouseEnter={() => setHoveredProduct(p.slug)}
                            className={clsx(
                              'flex items-start gap-3 rounded-xl p-3 transition-colors',
                              hoveredProduct === p.slug ? 'bg-cream' : 'hover:bg-cream',
                            )}
                          >
                            <span className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors', hoveredProduct === p.slug ? 'bg-brand-orange' : 'bg-brand-pale-orange')}>
                              <Icon size={17} className={hoveredProduct === p.slug ? 'text-white' : 'text-brand-orange'} />
                            </span>
                            <span>
                              <span className="block text-[13px] font-semibold text-carbon">{p.name}</span>
                              <span className="block text-[11.5px] text-slate leading-snug mt-0.5">{p.tagline}</span>
                            </span>
                          </Link>
                        );
                      })}
                      <Link
                        to="/products"
                        onClick={() => setOpenMenu(null)}
                        className="flex items-center justify-between rounded-xl p-3 bg-cream text-[13px] font-semibold text-brand-orange hover:bg-brand-pale-orange transition-colors col-span-2"
                      >
                        Explore all products <ArrowRight size={14} />
                      </Link>
                    </div>

                    {/* Live preview — swaps to whichever product row is hovered */}
                    <div className="rounded-2xl bg-cream p-4 flex items-center justify-center overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={hoveredProduct}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2, ease: NAV_EASE }}
                          className="w-full [&>div]:shadow-none [&>div]:border-bone/60"
                          style={{ transform: 'scale(0.82)' }}
                        >
                          {mockupForProductSlug(hoveredProduct)}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {openMenu === 'solutions' && (
                  <div className="grid grid-cols-3 gap-3">
                    {SOLUTIONS.map(s => (
                      <Link
                        key={s.slug}
                        to={`/solutions/${s.slug}`}
                        onClick={() => setOpenMenu(null)}
                        className="group rounded-xl overflow-hidden border border-transparent hover:border-bone transition-colors"
                      >
                        <div className="aspect-[16/9] overflow-hidden">
                          <img src={unsplashUrl(s.image, 240)} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                        </div>
                        <div className="p-2.5">
                          <span className="block text-[12.5px] font-semibold text-carbon">{s.name}</span>
                          <span className="block text-[11px] text-slate leading-snug mt-0.5">{s.headline}</span>
                        </div>
                      </Link>
                    ))}
                    <Link
                      to="/solutions"
                      onClick={() => setOpenMenu(null)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-cream text-[13px] font-semibold text-brand-orange hover:bg-brand-pale-orange transition-colors p-2.5"
                    >
                      All solutions <ArrowRight size={14} />
                    </Link>
                  </div>
                )}

                {openMenu === 'resources' && (
                  <div className="grid grid-cols-3 gap-2 max-w-[600px]">
                    {RESOURCE_LINKS.map(r => (
                      <Link
                        key={r.path}
                        to={r.path}
                        onClick={() => setOpenMenu(null)}
                        className="flex items-start gap-3 rounded-xl p-3 hover:bg-cream transition-colors"
                      >
                        <span className="w-9 h-9 rounded-lg bg-brand-pale-orange flex items-center justify-center shrink-0">
                          <r.Icon size={16} className="text-brand-orange" />
                        </span>
                        <span>
                          <span className="block text-[13px] font-semibold text-carbon">{r.label}</span>
                          <span className="block text-[11.5px] text-slate leading-snug mt-0.5">{r.desc}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Mobile/tablet navigation overlay — a full-screen panel that wipes
         open via clip-path beneath the persistent header (not a dropdown,
         not a side drawer), with each row revealing from behind its own
         overflow-hidden mask in a staggered choreography. The header above
         stays put — only the menu button itself morphs — so the logo never
         moves. ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav-panel"
            role="navigation"
            aria-label="Mobile navigation"
            initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
            exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            transition={{ duration: 0.55, ease: NAV_EASE }}
            className="lg:hidden fixed left-0 right-0 top-[60px] bottom-0 z-[55] bg-cream"
          >
            <motion.div
              variants={navListVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
              className="h-full overflow-y-auto overscroll-contain px-5 sm:px-8 pt-3 flex flex-col"
              style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
            >
              <div className="flex-1 flex flex-col">
                <MobileAccordionRow
                  title="Products"
                  isOpen={expanded === 'products'}
                  onToggle={() => setExpanded(e => (e === 'products' ? null : 'products'))}
                >
                  {PLATFORM_PRODUCTS.map(p => {
                    const Icon = PRODUCT_ICONS[p.slug] ?? Store;
                    return (
                      <MobileNavRow
                        key={p.slug}
                        to={`/products/${p.slug}`}
                        title={p.name}
                        desc={p.tagline}
                        onNavigate={closeMenu}
                        icon={<Icon size={16} className="text-brand-orange" />}
                      />
                    );
                  })}
                  <Link to="/products" onClick={closeMenu} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-orange py-2.5 px-2">
                    View all products <ArrowRight size={12} />
                  </Link>
                </MobileAccordionRow>

                <MobileAccordionRow
                  title="Solutions"
                  isOpen={expanded === 'solutions'}
                  onToggle={() => setExpanded(e => (e === 'solutions' ? null : 'solutions'))}
                >
                  {SOLUTIONS.map(s => (
                    <MobileNavRow
                      key={s.slug}
                      to={`/solutions/${s.slug}`}
                      title={s.name}
                      desc={s.headline}
                      onNavigate={closeMenu}
                      thumbnail={unsplashUrl(s.image, 80)}
                    />
                  ))}
                  <Link to="/solutions" onClick={closeMenu} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-orange py-2.5 px-2">
                    View all solutions <ArrowRight size={12} />
                  </Link>
                </MobileAccordionRow>

                <MobileAccordionRow
                  title="Resources"
                  isOpen={expanded === 'resources'}
                  onToggle={() => setExpanded(e => (e === 'resources' ? null : 'resources'))}
                >
                  {RESOURCE_LINKS.map(r => (
                    <MobileNavRow
                      key={r.path}
                      to={r.path}
                      title={r.label}
                      desc={r.desc}
                      onNavigate={closeMenu}
                      icon={<r.Icon size={16} className="text-brand-orange" />}
                    />
                  ))}
                </MobileAccordionRow>

                <div className="overflow-hidden">
                  <motion.div variants={navRowVariants}>
                    <Link to="/pricing" onClick={closeMenu} className="group flex items-center justify-between py-[18px] border-b border-carbon/10">
                      <span className="text-[26px] sm:text-[30px] font-extrabold text-carbon tracking-tight">Pricing</span>
                      <ArrowRight size={20} className="text-slate transition-transform duration-200 group-active:translate-x-1 group-active:text-brand-orange" />
                    </Link>
                  </motion.div>
                </div>

                <div className="overflow-hidden">
                  <motion.div variants={navRowVariants} className="pt-4">
                    <Link
                      to="/sellers"
                      onClick={closeMenu}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-brand-orange/20 bg-brand-pale-orange px-4 py-4"
                    >
                      <span>
                        <span className="block text-[19px] font-extrabold text-carbon">For Sellers</span>
                        <span className="block text-[12px] text-slate mt-0.5">Share and sell what you teach on Edudeen.</span>
                      </span>
                      <ArrowRight size={18} className="text-brand-orange shrink-0 transition-transform duration-200 group-active:translate-x-1" />
                    </Link>
                  </motion.div>
                </div>
              </div>

              <motion.div variants={navFadeVariants} className="flex flex-col gap-2.5 pt-6 mt-6 pb-6 border-t border-carbon/10">
                {loggedIn ? (
                  <div className="flex items-center gap-3 py-1">
                    <ProfileAvatar withNotifications />
                    <span className="text-[12px] text-slate">Signed in</span>
                  </div>
                ) : (
                  <>
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <button
                        onClick={() => { closeMenu(); sellEntry.go(); }}
                        disabled={sellEntry.loading}
                        className="w-full text-[14.5px] font-semibold text-white bg-gradient-to-r from-brand-orange to-brand-deep-orange rounded-xl py-[14px] border-none cursor-pointer disabled:opacity-60"
                      >
                        Start Selling Free
                      </button>
                    </motion.div>
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <button
                        onClick={() => { closeMenu(); navigate('/products'); }}
                        className="w-full text-[13.5px] font-medium text-charcoal bg-transparent border border-bone rounded-xl py-3 cursor-pointer"
                      >
                        Explore the Platform
                      </button>
                    </motion.div>
                    <button
                      onClick={() => { closeMenu(); navigate('/login'); }}
                      className="text-[12.5px] font-medium text-slate bg-transparent border-none cursor-pointer py-1.5"
                    >
                      Already selling? <span className="text-brand-orange font-semibold">Log in</span>
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// One accordion row of the mobile panel — large editorial label + a plus
// indicator that rotates into a cross, expanding into real icon/thumbnail
// rows via a smooth height animation (not a boring instant show/hide).
// Wrapped in its own overflow-hidden mask so it participates in the panel's
// entrance stagger like every other row.
function MobileAccordionRow({ title, isOpen, onToggle, children }: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden">
      <motion.div variants={navRowVariants} className="border-b border-carbon/10">
        <button
          onClick={onToggle}
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between py-[18px] bg-transparent border-none cursor-pointer text-left"
        >
          <span className="text-[26px] sm:text-[30px] font-extrabold text-carbon tracking-tight">{title}</span>
          <motion.span
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.3, ease: NAV_EASE }}
            className="text-brand-orange shrink-0"
          >
            <Plus size={22} />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: NAV_EASE }}
              className="overflow-hidden"
            >
              <div className="pb-4 flex flex-col gap-0.5">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function MobileNavRow({ to, title, desc, icon, thumbnail, onNavigate }: {
  to: string;
  title: string;
  desc?: string;
  icon?: ReactNode;
  thumbnail?: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="group flex items-center gap-3 rounded-xl px-2 py-2 active:bg-white transition-colors"
    >
      {thumbnail ? (
        <img src={thumbnail} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-cover shrink-0" />
      ) : icon ? (
        <span className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-carbon">{title}</span>
        {desc && <span className="block text-[12px] text-slate leading-snug mt-0.5 truncate">{desc}</span>}
      </span>
      <ArrowRight size={13} className="text-bone shrink-0 transition-all duration-200 group-active:text-brand-orange group-active:translate-x-0.5" />
    </Link>
  );
}
