import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Send, Check, ChevronDown, ArrowUp, Mail } from 'lucide-react';
import { EdudeenLogo } from './EdudeenLogo';
import { AppleGlyph, GooglePlayGlyph } from './AppPromoParts';
import { apiSubscribeNewsletter } from '../../../api/services/newsletter';
import { scrollRootToTop } from '@/utils/scrollRoot';
import { useSellEntry } from '@/hooks/auth/useSellEntry';

interface FooterLink {
  label: string;
  path?: string; // omit for links to pages that don't exist yet (rendered inert)
}

const FOOTER_COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Shop',
    links: [
      { label: 'Education',   path: '/education' },
      { label: 'My Orders',   path: '/account/orders' },
      { label: 'Wishlist',    path: '/account/wishlist' },
    ],
  },
  {
    heading: 'Products',
    links: [
      { label: 'Store Builder', path: '/products/store-builder' },
      { label: 'Analytics',     path: '/products/analytics' },
      { label: 'Inventory',     path: '/products/inventory' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { label: 'Teachers & Tutors',      path: '/solutions/teachers-tutors' },
      { label: 'Quran & Islamic Studies', path: '/solutions/islamic-scholars' },
      { label: 'Schools & Academies',    path: '/solutions/schools-academies' },
      { label: 'Publishers & Bookshops', path: '/solutions/publishers-bookshops' },
      { label: 'Educational Creators',   path: '/solutions/creators' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'FAQ',         path: '/faq' },
      { label: 'Help Center', path: '/help' },
      { label: 'Contact Us',  path: '/contact-us' },
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
      { label: 'Privacy Policy',   path: '/privacy-policy' },
      { label: 'Terms of Service', path: '/terms-of-service' },
      { label: 'Cookie Policy',    path: '/cookie-policy' },
    ],
  },
];

const CONTACT_EMAIL = 'support@edudeen.com';

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
      className="flex items-center gap-2.5 h-11 px-3.5 rounded-[9px] bg-carbon text-white select-none w-fit"
    >
      {isIos ? <AppleGlyph size={18} /> : <GooglePlayGlyph size={16} />}
      <span className="leading-none">
        <span className="block text-[8px] text-white/70 tracking-[0.04em]">{isIos ? 'Download on the' : 'GET IT ON'}</span>
        <span className="block text-[12.5px] font-bold mt-[2px]">{isIos ? 'App Store' : 'Google Play'}</span>
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
      <div className="flex items-center gap-2.5 text-[13px] text-carbon bg-white border border-bone rounded-full px-5 py-3.5">
        <Check size={15} className="text-brand-green shrink-0" />
        You're subscribed — welcome aboard!
      </div>
    );
  }

  return (
    <div className="w-full sm:max-w-[420px]">
      <form onSubmit={submit} className="flex items-stretch border border-[#afbdc6] rounded-full overflow-hidden bg-white focus-within:border-brand-orange transition-colors">
        <Mail size={15} className="ml-4 self-center text-slate shrink-0" />
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          required
          placeholder="Your email address"
          aria-label="Email address"
          disabled={loading}
          className="flex-1 min-w-0 px-3 py-[12px] bg-transparent text-[13.5px] text-carbon placeholder:text-slate outline-none border-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 flex items-center gap-2 px-5 bg-brand-orange text-white text-[13px] font-bold border-none cursor-pointer hover:brightness-95 disabled:opacity-70"
        >
          <Send size={13} /> <span className="hidden sm:inline">{loading ? 'Subscribing…' : 'Subscribe'}</span>
        </button>
      </form>
      {error && <p className="mt-2 pl-3 text-[11.5px] text-error">{error}</p>}
    </div>
  );
}

// Accordion on mobile (each column independently collapsible), static and
// always-open at sm: and up.
function FooterColumn({ heading, links, navigate }: { heading: string; links: FooterLink[]; navigate: (p: string) => void }) {
  const [open, setOpen] = useState(false);
  const contentId = `footer-col-${heading.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="border-b border-bone sm:border-none">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full min-h-11 flex items-center justify-between gap-2 py-3 sm:py-0 sm:pointer-events-none text-left bg-transparent border-none cursor-pointer sm:cursor-default outline-none"
      >
        <span className="text-[12px] font-bold text-carbon uppercase tracking-[0.12em] sm:mb-4">{heading}</span>
        <ChevronDown size={15} className={clsx('text-slate transition-transform duration-200 sm:hidden shrink-0', open && 'rotate-180')} />
      </button>

      <ul id={contentId} className={clsx(open ? 'flex' : 'hidden', 'sm:!flex flex-col gap-3 pb-4 sm:pb-0 m-0 p-0 list-none')}>
        {links.map(link => (
          <li key={link.label}>
            {link.path ? (
              <button
                onClick={() => navigate(link.path!)}
                className="min-h-11 sm:min-h-0 text-[13px] text-slate hover:text-brand-orange transition-colors bg-transparent border-none p-0 cursor-pointer text-left"
              >
                {link.label}
              </button>
            ) : (
              <span className="inline-flex items-center min-h-11 sm:min-h-0 text-[13px] text-slate/60 cursor-default">{link.label}</span>
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
  // "Start Selling" is the only footer link that means seller intent — route
  // it through the shared entry handler instead of a raw navigate.
  const footerNavigate = (path: string) => path === '/onboard' ? sellEntry.go() : navigate(path);

  return (
    <footer className="bg-white border-t border-bone text-slate">

      {/* ── Newsletter ── */}
      {showNewsletter && (
        <div className="bg-[#f5f8fa] border-b border-bone">
          <div className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] py-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div>
              <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-2">Stay in the loop</p>
              <p className="font-serif text-[22px] text-carbon leading-tight">Get new resources &amp; deals before anyone else</p>
              <p className="text-[13px] text-slate mt-1">Sign up for exclusive offers, new arrivals and price-drop alerts.</p>
            </div>
            <Newsletter />
          </div>
        </div>
      )}

      {/* ── Brand + link columns ── */}
      <div className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(6,1fr)_1fr] gap-8 lg:gap-6">

          <div className="sm:col-span-2 lg:col-span-1 pb-2 sm:pb-0">
            <button onClick={() => navigate('/')} aria-label="Edudeen home" className="bg-transparent border-none p-0 cursor-pointer">
              <EdudeenLogo size={28} />
            </button>
            <p className="text-[13px] text-brand-orange mt-3 mb-2">Purposeful learning. Meaningful possibilities.</p>
            <p className="text-[13px] leading-relaxed max-w-[280px]">
              Islamic &amp; educational resources for homes and classrooms — plus your own storefront, digital delivery and AI-powered tools for teachers, scholars, publishers and educational creators.
            </p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-block mt-3 text-[13px] text-carbon font-semibold hover:text-brand-orange">
              {CONTACT_EMAIL}
            </a>

            {/* Decorative only — no real social accounts to link to yet */}
            <div className="flex items-center gap-2.5 mt-5">
              {SOCIALS.map(({ label, Glyph }) => (
                <div
                  key={label}
                  role="img"
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-bone bg-white flex items-center justify-center text-slate select-none"
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
            <p className="text-[12px] font-bold text-carbon uppercase tracking-[0.12em] mb-4">Get the App</p>
            <div className="flex flex-col gap-2.5">
              <AppBadge platform="ios" />
              <AppBadge platform="android" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-bone">
        <div className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] py-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 text-[12px]">
          <p className="m-0">© {new Date().getFullYear()} Edudeen LLC. All rights reserved.</p>
          <button
            type="button"
            onClick={() => scrollRootToTop('smooth')}
            className="group flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer text-slate hover:text-brand-orange"
          >
            Back to top <ArrowUp size={13} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
