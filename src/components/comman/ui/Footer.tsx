import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Send, Check, ChevronDown, ChevronRight, ArrowUp, Mail } from 'lucide-react';
import { SolvexoLogo, SolvexoIcon } from './SolvexoLogo';
import { AppleGlyph, GooglePlayGlyph } from './AppPromoParts';
import { apiSubscribeNewsletter } from '../../../api/services/newsletter';
import { scrollRootToTop } from '@/utils/scrollRoot';
import { useSellEntry } from '@/hooks/auth/useSellEntry';
import { Reveal } from '@/components/comman/motion/Reveal';
import { MagneticButton } from '@/components/comman/motion/MagneticButton';

interface FooterLink {
  label: string;
  path?: string; // omit for links to pages that don't exist yet (rendered inert)
}

// The buyer-facing "Shop" column (Marketplace/Education/My Orders/Wishlist)
// was removed — Edudeen is no longer a central marketplace a buyer browses;
// the apex app has no buyer-facing entry point at all any more (a buyer
// only ever shops a seller's own storefront subdomain). The routes/pages
// themselves are untouched, just unlinked from here.
const FOOTER_COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Products',
    links: [
      { label: 'Store Builder', path: '/products/store-builder' },
      { label: 'Point of Sale', path: '/products/pos' },
      { label: 'AI Commerce',   path: '/products/ai-commerce' },
      { label: 'Analytics',     path: '/products/analytics' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { label: 'Retail',      path: '/solutions/retail' },
      { label: 'Fashion',     path: '/solutions/fashion' },
      { label: 'Restaurants', path: '/solutions/restaurants' },
      { label: 'Beauty',      path: '/solutions/beauty' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'FAQ',          path: '/faq' },
      { label: 'Help Center',  path: '/help' },
      { label: 'Contact Us',   path: '/contact-us' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About',       path: '/about' },
      { label: 'For Sellers', path: '/sellers' },
      { label: 'Pricing',     path: '/pricing' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', path: '/privacy-policy' },
      { label: 'Terms of Service', path: '/terms-of-service' },
      { label: 'Cookie Policy', path: '/cookie-policy' },
    ],
  },
];

/* ── Minimal inline social glyphs — abstract, not brand logo assets ─────────── */
function FacebookGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function InstagramGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function XGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  );
}
function LinkedinGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
      <path d="M10 21v-7a3 3 0 0 1 6 0v7M13 12v9" />
    </svg>
  );
}

const SOCIALS = [
  { label: 'Facebook',  Glyph: FacebookGlyph },
  { label: 'Instagram', Glyph: InstagramGlyph },
  { label: 'X',         Glyph: XGlyph },
  { label: 'LinkedIn',  Glyph: LinkedinGlyph },
];

// Decorative only — no real store listing to link to yet. `role="img"` (not
// a button) so screen readers don't announce a control that does nothing.
function AppBadge({ platform }: { platform: 'ios' | 'android' }) {
  const isIos = platform === 'ios';
  return (
    <div
      role="img"
      aria-label={isIos ? 'Download on the App Store' : 'Get it on Google Play'}
      className="flex items-center gap-2.5 h-11 px-3.5 rounded-[9px] border border-white/[0.12] bg-white/[0.03] select-none"
    >
      {isIos
        ? <AppleGlyph size={18} />
        : <GooglePlayGlyph size={16} />}
      <span className="leading-none">
        <span className="block text-[8px] text-[#8b8985] tracking-[0.04em]">{isIos ? 'Download on the' : 'GET IT ON'}</span>
        <span className="block text-[12.5px] font-bold text-white mt-[2px]">{isIos ? 'App Store' : 'Google Play'}</span>
      </span>
    </div>
  );
}

function Newsletter() {
  const [email, setEmail]     = useState('');
  const [subscribed, setSub]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiSubscribeNewsletter(email.trim());
      setSub(true);
      void res;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div className="flex items-center gap-2.5 text-[13px] text-white bg-white/[0.05] border border-white/[0.12] rounded-full px-5 py-3.5">
        <Check size={15} className="text-brand-orange shrink-0" />
        You're subscribed — welcome aboard!
      </div>
    );
  }

  return (
    <div className="w-full sm:max-w-[420px]">
      <form onSubmit={submit} className="relative flex items-center gap-2 p-1.5 rounded-full border border-white/[0.14] bg-white/[0.04] transition-colors duration-200 focus-within:border-brand-orange/50 focus-within:bg-white/[0.06]">
        <Mail size={15} className="ml-2.5 text-[#7a7873] shrink-0" />
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          required
          placeholder="Your email address"
          aria-label="Email address"
          disabled={loading}
          className="flex-1 min-w-0 h-9 bg-transparent text-[13px] text-white placeholder:text-[#7a7873] outline-none border-none disabled:opacity-60"
        />
        <MagneticButton className="shrink-0">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 h-9 px-5 rounded-full bg-brand-orange text-white text-[13px] font-semibold border-none cursor-pointer hover:bg-brand-deep-orange transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
          >
            <Send size={13} /> <span className="hidden sm:inline">{loading ? 'Subscribing…' : 'Subscribe'}</span>
          </button>
        </MagneticButton>
      </form>
      {error && <p className="mt-2 pl-2 text-[11.5px] text-red-400">{error}</p>}
    </div>
  );
}

// Accordion on mobile (each column independently collapsible, real <button>
// with aria-expanded/aria-controls), static and always-open at sm: and up —
// the `open ? 'flex' : 'hidden'` base class is overridden by `sm:flex`, which
// wins at the sm breakpoint regardless of local state, so no separate
// desktop/mobile markup is needed.
function FooterColumn({ heading, links, navigate }: { heading: string; links: FooterLink[]; navigate: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  const contentId = `footer-col-${heading.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="border-b border-white/[0.08] sm:border-none">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full min-h-11 flex items-center justify-between gap-2 py-3 sm:py-0 sm:pointer-events-none text-left bg-transparent border-none cursor-pointer sm:cursor-default outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 rounded-sm"
      >
        <span className="relative inline-block text-[11px] font-bold text-white uppercase tracking-[0.08em] pb-2 sm:mb-4">
          {heading}
          <span className="absolute left-0 bottom-0 w-5 h-[2px] rounded-full bg-brand-orange" />
        </span>
        <ChevronDown
          size={15}
          className={clsx('text-[#8b8985] transition-transform duration-200 sm:hidden shrink-0', open && 'rotate-180')}
        />
      </button>

      <ul
        id={contentId}
        className={clsx(open ? 'flex' : 'hidden', 'sm:!flex flex-col gap-3 pb-4 sm:pb-0')}
      >
        {links.map(link => (
          <li key={link.label}>
            {link.path ? (
              <button
                onClick={() => navigate(link.path!)}
                className="group inline-flex items-center gap-1 min-h-11 sm:min-h-0 text-[12.5px] text-[#b0aea8] hover:text-white transition-colors duration-200 bg-transparent border-none p-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 rounded-sm"
              >
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">{link.label}</span>
                <ChevronRight
                  size={12}
                  className="text-brand-orange opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                />
              </button>
            ) : (
              <span className="inline-flex items-center min-h-11 sm:min-h-0 text-[12.5px] text-[#5e5c58] cursor-default">{link.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer({ showNewsletter = true }: { showNewsletter?: boolean }) {
  const navigate = useNavigate();
  const sellEntry = useSellEntry();
  const scrollToTop = () => scrollRootToTop('smooth');
  // "Start Selling" is the only footer link that means seller intent — route
  // it through the shared entry handler instead of a raw navigate, every
  // other link behaves exactly as before.
  const footerNavigate = (path: string) => path === '/onboard' ? sellEntry.go() : navigate(path);

  return (
    <footer className="bg-carbon text-[#b0aea8]">

      {/* Top accent — a soft cut line from the rest of the page, on-brand instead of a flat border */}
      <div className="h-[2px] bg-gradient-to-r from-brand-orange via-brand-orange/40 to-transparent" />

      {/* ── Newsletter — omitted by pages whose own AppDownloadBanner already
           has one (Marketplace's compact variant), so it never renders twice ── */}
      {showNewsletter && (
        <div className="relative overflow-hidden border-b border-white/10">
          <div
            className="absolute top-1/2 left-[12%] -translate-y-1/2 w-[360px] h-[360px] rounded-full bg-[radial-gradient(circle,var(--color-brand-orange)_0%,transparent_70%)] opacity-[0.08] blur-3xl pointer-events-none"
            aria-hidden="true"
          />
          <Reveal className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <span className="hidden sm:flex shrink-0 w-9 h-9 rounded-full bg-brand-orange/10 border border-brand-orange/20 items-center justify-center">
                <Mail size={15} className="text-brand-orange" />
              </span>
              <div>
                <p className="text-[16px] sm:text-[17px] font-bold text-white leading-tight tracking-[-0.01em]">Get deals before anyone else</p>
                <p className="text-[12px] text-[#8b8985] mt-1">Sign up for exclusive offers, new arrivals and price-drop alerts.</p>
              </div>
            </div>
            <Newsletter />
          </Reveal>
        </div>
      )}

      {/* ── Link columns ─────────────────────────────────────────────────────── */}
      <Reveal className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-8 lg:gap-6">

          <div className="sm:col-span-2 lg:col-span-1 pb-2 sm:pb-0">
            <SolvexoLogo size={26} variant="light" />
            <p className="text-[12.5px] mt-4 leading-relaxed max-w-[260px] text-[#9a9894]">
              The commerce OS for sellers, creators and educators — your own storefront, POS, and AI-powered tools in one platform.
            </p>

            {/* Decorative only — no real social accounts to link to yet, same
               honest treatment as the App Store/Google Play badges below
               (role="img", not a button, so it never invites a click that
               does nothing). */}
            <div className="flex items-center gap-2.5 mt-5">
              {SOCIALS.map(({ label, Glyph }) => (
                <div
                  key={label}
                  role="img"
                  aria-label={label}
                  className="w-10 h-10 rounded-full border border-white/[0.12] bg-white/[0.03] flex items-center justify-center text-[#b0aea8] select-none"
                >
                  <Glyph />
                </div>
              ))}
            </div>
          </div>

          {FOOTER_COLUMNS.map(col => (
            <FooterColumn key={col.heading} heading={col.heading} links={col.links} navigate={footerNavigate} />
          ))}

          <div className="pb-2 sm:pb-0">
            <p className="relative inline-block text-[11px] font-bold text-white uppercase tracking-[0.08em] pb-2 sm:mb-4">
              Get the App
              <span className="absolute left-0 bottom-0 w-5 h-[2px] rounded-full bg-brand-orange" />
            </p>
            <div className="flex flex-col gap-2.5">
              <AppBadge platform="ios" />
              <AppBadge platform="android" />
            </div>
          </div>
        </div>
      </Reveal>

      {/* ── Bottom bar ───────────────────────────────────────────────────────── */}
      <div className="border-t border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SolvexoIcon size={16} />
            <p className="text-[12px] text-[#8b8985]">© {new Date().getFullYear()} Edudeen. All rights reserved.</p>
          </div>
          <button
            type="button"
            onClick={scrollToTop}
            className="group flex items-center gap-1.5 py-1 px-2 -mx-2 text-[12px] text-[#8b8985] hover:text-white transition-colors duration-200 bg-transparent border-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 rounded-sm"
          >
            Back to top <ArrowUp size={13} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
