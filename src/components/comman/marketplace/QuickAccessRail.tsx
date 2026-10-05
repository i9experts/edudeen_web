import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronUp, Flame, LayoutGrid, History, UserRound, Star, GraduationCap, ArrowRight,
  Package, LibraryBig, Heart, MessageSquare, FileSpreadsheet, HelpCircle, Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { scrollRootRef } from '@/utils/scrollRoot';
import { TokenStorage } from '@/api/services/auth';
import { useTopBarDeals, timeLeft } from '@/hooks/useTopBarDeals';
import { useCategoryTree, categoryPath } from '@/hooks/marketplace/useCategoryTree';
import { getRecentlyViewed, clearRecentlyViewed, type RecentlyViewedItem } from '@/components/comman/ui/BuyerNavbar';
import { fetchRecentlyViewed } from '@/utils/recentlyViewedSync';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { currencySymbol } from '@/utils/currency';

type PanelId = 'deals' | 'categories' | 'recent' | 'account';

/** Pages where a floating rail would get in the way of the task. */
const HIDDEN_ON = /^\/(checkout|order-success|account)(\/|$)/;

function useScrolledPast(px: number) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    // Scroll events don't bubble, but a capturing listener on the document
    // sees the app's scroll container (RootLayout) whenever it's ready.
    const onScroll = () => setPast((scrollRootRef.current?.scrollTop ?? 0) > px);
    onScroll();
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, [px]);
  return past;
}

/** 44px product thumbnail for the panels — the image, or the product's own colour cover. */
function Thumb({ image, name }: { image: string | null | undefined; name: string }) {
  return (
    <span className="w-11 h-11 rounded-lg overflow-hidden shrink-0 block border border-bone">
      {image
        ? <img src={image} alt="" loading="lazy" className="w-full h-full object-cover block" />
        : <ProductCoverFallback name={name} size="xs" className="w-full h-full" />}
    </span>
  );
}

function PanelShell({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="w-[320px] max-h-[min(520px,calc(100vh-250px))] flex flex-col bg-white rounded-2xl border border-bone shadow-[0_18px_50px_-12px_rgba(23,71,113,0.28)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-bone">
        <p className="text-[13.5px] font-bold text-carbon m-0 flex-1">{title}</p>
        {action}
      </div>
      <div className="overflow-y-auto">{children}</div>
    </div>
  );
}

function DealsPanel({ close }: { close: () => void }) {
  const deals = useTopBarDeals();
  const { currency, convert } = useCurrencyPreference();
  const sym = currencySymbol(currency);
  if (!deals) return <PanelShell title="Deals"><p className="p-4 text-[13px] text-slate m-0">Loading…</p></PanelShell>;
  const empty = !deals.campaigns.length && !deals.flashDeals.length;
  return (
    <PanelShell title="Deals" action={<Link to="/#deals" onClick={close} className="text-[12px] font-semibold text-brand-orange no-underline">All deals</Link>}>
      {empty && <p className="p-4 text-[13px] text-slate m-0">No live deals right now — check back soon.</p>}
      {deals.campaigns.slice(0, 2).map(c => (
        <Link key={c._id} to={`/?campaign=${c._id}`} onClick={close} className="flex items-center gap-3 mx-3 mt-3 rounded-xl bg-gradient-to-r from-brand-orange to-[#2c6a9e] text-white px-3 py-2.5 no-underline">
          <Flame size={18} className="shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-bold truncate">{c.name}</span>
            <span className="block text-[11px] opacity-85">Ends in <span className="tabular-nums">{timeLeft(c.endDate)}</span></span>
          </span>
          {c.discountType === 'percentage' && c.discountValue ? <span className="text-[12px] font-bold bg-white/20 rounded-full px-2 py-0.5">{`${c.discountValue}% off`}</span> : null}
        </Link>
      ))}
      {deals.flashDeals.length > 0 && (
        <ul className="list-none p-0 m-0 py-2">
          {deals.flashDeals.map(({ product: p, pct }) => {
            const dv = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
            return (
              <li key={p._id}>
                <Link to={`/product/${p.slug}`} onClick={close} className="flex items-center gap-3 px-4 py-2 no-underline hover:bg-cream">
                  <Thumb image={p.images?.[0]} name={p.name} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] text-carbon font-medium truncate" translate="no">{p.name}</span>
                    {dv && (
                      <span className="block text-[12px] tabular-nums">
                        <b className="text-carbon">{sym}{convert(dv.price, dv.currency).toLocaleString()}</b>
                        {dv.compareAtPrice ? <span className="text-slate line-through ms-1.5">{sym}{convert(dv.compareAtPrice, dv.currency).toLocaleString()}</span> : null}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-bold text-error bg-error-bg rounded-full px-2 py-0.5 shrink-0">-{pct}%</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PanelShell>
  );
}

function CategoriesPanel({ close }: { close: () => void }) {
  const { tree, loading } = useCategoryTree();
  return (
    <PanelShell title="Categories" action={<Link to="/search" onClick={close} className="text-[12px] font-semibold text-brand-orange no-underline">Browse all</Link>}>
      <Link to="/learn" onClick={close} className="flex items-center gap-3 mx-3 mt-3 rounded-xl border border-brand-royal/20 bg-brand-pale-orange/40 px-3 py-2.5 no-underline">
        <GraduationCap size={18} className="text-brand-royal shrink-0" />
        <span className="flex-1">
          <span className="block text-[13px] font-bold text-carbon">Learn by grade</span>
          <span className="block text-[11.5px] text-slate">Preschool to university, by subject</span>
        </span>
        <ArrowRight size={14} className="text-brand-royal" />
      </Link>
      {loading && <p className="p-4 text-[13px] text-slate m-0">Loading…</p>}
      <ul className="list-none p-0 m-0 py-2">
        {tree.map(c => (
          <li key={c._id} className="px-4 py-2">
            <Link to={categoryPath(c)} onClick={close} className="text-[13px] font-semibold text-carbon no-underline hover:text-brand-orange">{c.name}</Link>
            {(c.children?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {c.children!.slice(0, 6).map(s => (
                  <Link key={s._id} to={categoryPath(s)} onClick={close} className="text-[11.5px] text-graphite no-underline rounded-full border border-bone px-2.5 py-[3px] hover:border-brand-orange hover:text-brand-orange">{s.name}</Link>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

function RecentPanel({ items, onClear, close }: { items: RecentlyViewedItem[]; onClear: () => void; close: () => void }) {
  const { currency, convert } = useCurrencyPreference();
  const sym = currencySymbol(currency);
  return (
    <PanelShell
      title="Recently viewed"
      action={items.length > 0 ? <button type="button" onClick={onClear} className="inline-flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer text-[12px] text-slate hover:text-error"><Trash2 size={12} /> Clear</button> : undefined}
    >
      {items.length === 0 ? (
        <p className="p-4 text-[13px] text-slate m-0">Resources you open will show up here, so you can find them again.</p>
      ) : (
        <ul className="list-none p-0 m-0 py-2">
          {items.slice(0, 8).map(it => (
            <li key={it.id}>
              <Link to={`/product/${it.id}`} onClick={close} className="flex items-center gap-3 px-4 py-2 no-underline hover:bg-cream">
                <Thumb image={it.image} name={it.name} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] text-carbon font-medium truncate" translate="no">{it.name}</span>
                  {it.price != null && <span className="block text-[12px] text-graphite tabular-nums">{sym}{convert(it.price, it.currency ?? 'PKR').toLocaleString()}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}

function AccountPanel({ close }: { close: () => void }) {
  const loggedIn = TokenStorage.isLoggedIn();
  const user = TokenStorage.getUser<{ name?: string }>();
  const links: { to: string; label: string; Icon: LucideIcon }[] = [
    { to: '/account/orders', label: 'My Orders', Icon: Package },
    { to: '/account/downloads', label: 'My Library', Icon: LibraryBig },
    { to: '/account/wishlist', label: 'Wishlist', Icon: Heart },
    { to: '/account/messages', label: 'Messages', Icon: MessageSquare },
    { to: '/account/quotes', label: 'School Quotes', Icon: FileSpreadsheet },
    { to: '/faq', label: 'Help Center', Icon: HelpCircle },
  ];
  return (
    <PanelShell title={loggedIn ? 'My Account' : 'Welcome to Edudeen'}>
      {loggedIn ? (
        <p className="px-4 pt-3 m-0 text-[13px] text-graphite">Hello, <b className="text-carbon" translate="no">{(user?.name ?? '').split(' ')[0] || 'there'}</b></p>
      ) : (
        <div className="px-4 pt-3 flex flex-col gap-2">
          <p className="m-0 text-[12.5px] text-slate">Sign in to track orders, download your resources and save lists.</p>
          <Link to="/login" onClick={close} className="text-center rounded-lg bg-brand-orange text-white text-[13px] font-bold py-2 no-underline hover:bg-brand-deep-orange">Sign In</Link>
          <Link to="/register" onClick={close} className="text-center text-[12.5px] font-semibold text-brand-orange no-underline">New customer? Create an account</Link>
        </div>
      )}
      <ul className="list-none p-0 m-0 py-2 grid grid-cols-2 gap-1 px-2">
        {(loggedIn ? links : links.slice(-1)).map(l => (
          <li key={l.to}>
            <Link to={l.to} onClick={close} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12.5px] text-carbon no-underline hover:bg-cream">
              <l.Icon size={14} className="text-brand-royal shrink-0" /> {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

/**
 * Floating quick-access rail on the page edge (Daraz-style), with a preview
 * panel for each button instead of a bare link: live deals, the category
 * tree, recently viewed resources (like Amazon's browsing history) and
 * account shortcuts — plus "back to top" once the visitor has scrolled.
 * Desktop only; on phones the bottom nav covers this and just the
 * back-to-top button shows. Uses start/end positioning, so in Urdu it sits
 * on the left automatically.
 */
export function QuickAccessRail() {
  const { pathname } = useLocation();
  const scrolled = useScrolledPast(600);
  const [open, setOpen] = useState<PanelId | null>(null);
  const [recent, setRecent] = useState<RecentlyViewedItem[]>([]);
  const deals = useTopBarDeals();
  const rootRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const show = (id: PanelId) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    if (id === 'recent') {
      setRecent(getRecentlyViewed());
      // Signed in: include what they viewed on other devices.
      fetchRecentlyViewed(8).then(remote => {
        if (!remote.length) return;
        setRecent(local => {
          const merged = [...remote.map(r => ({ ...r, id: r.slug ?? r.id })), ...local];
          return merged.filter((it, i) => merged.findIndex(x => x.id === it.id) === i).slice(0, 8);
        });
      });
    }
    setOpen(id);
  };
  const scheduleClose = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setOpen(null), 220);
  };

  // Close on route change, Escape and outside clicks.
  useEffect(() => { setOpen(null); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(null); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  if (HIDDEN_ON.test(pathname)) return null;

  const toTop = () => scrollRootRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  const liveSale = (deals?.campaigns.length ?? 0) > 0;
  const clearRecent = () => { clearRecentlyViewed(); setRecent([]); };

  const buttons: { id: PanelId; label: string; Icon: LucideIcon; badge?: ReactNode }[] = [
    { id: 'deals', label: 'Deals', Icon: Flame, badge: liveSale ? <span className="absolute top-1.5 end-1.5 size-2 rounded-full bg-error ring-2 ring-white" aria-hidden /> : null },
    { id: 'categories', label: 'Categories', Icon: LayoutGrid },
    { id: 'recent', label: 'Recently viewed', Icon: History },
    { id: 'account', label: 'My Account', Icon: UserRound, badge: <Star size={9} className="absolute bottom-2 end-2 fill-brand-orange text-brand-orange" aria-hidden /> },
  ];

  return (
    <>
      {/* Desktop rail */}
      <div ref={rootRef} className="hidden lg:flex fixed end-3 top-[calc(50%+40px)] -translate-y-1/2 z-[60] items-center gap-2 print:hidden" onMouseLeave={scheduleClose}>
        {open && (
          <div className="order-first" onMouseEnter={() => show(open)} role="dialog" aria-label={buttons.find(b => b.id === open)?.label}>
            {open === 'deals' && <DealsPanel close={close} />}
            {open === 'categories' && <CategoriesPanel close={close} />}
            {open === 'recent' && <RecentPanel items={recent} onClear={clearRecent} close={close} />}
            {open === 'account' && <AccountPanel close={close} />}
          </div>
        )}
        <nav aria-label="Quick access" className="flex flex-col items-center bg-white/95 backdrop-blur border border-bone rounded-full shadow-[0_10px_30px_-10px_rgba(23,71,113,0.35)] p-1.5 gap-1">
          <button
            type="button"
            onClick={toTop}
            aria-label="Back to top"
            title="Back to top"
            className={clsx(
              'group relative size-11 rounded-full flex items-center justify-center border-none cursor-pointer bg-transparent text-slate hover:bg-cream hover:text-brand-royal transition-all duration-200',
              scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 -my-0.5',
            )}
            tabIndex={scrolled ? 0 : -1}
          >
            <ChevronUp size={20} />
          </button>
          {buttons.map(b => (
            <button
              key={b.id}
              type="button"
              aria-label={b.label}
              aria-expanded={open === b.id}
              onMouseEnter={() => show(b.id)}
              onFocus={() => show(b.id)}
              onClick={() => (open === b.id ? setOpen(null) : show(b.id))}
              className={clsx(
                'group relative size-11 rounded-full flex items-center justify-center border-none cursor-pointer transition-colors duration-150',
                open === b.id ? 'bg-brand-pale-orange text-brand-orange' : 'bg-transparent text-slate hover:bg-cream hover:text-brand-orange',
                b.id === 'deals' && open !== b.id && 'text-[#e8590c]',
              )}
            >
              <b.Icon size={20} />
              {b.badge}
              {open !== b.id && (
                <span className="pointer-events-none absolute end-full me-3 whitespace-nowrap rounded-md bg-carbon text-white text-[11.5px] font-semibold px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {b.label}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Phones: just back-to-top, above the bottom nav */}
      <button
        type="button"
        onClick={toTop}
        aria-label="Back to top"
        className={clsx(
          'lg:hidden fixed end-4 bottom-[84px] z-40 size-11 rounded-full bg-white border border-bone shadow-lg flex items-center justify-center text-brand-royal cursor-pointer transition-all duration-200 print:hidden',
          scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none',
        )}
        tabIndex={scrolled ? 0 : -1}
      >
        <ChevronUp size={20} />
      </button>
    </>
  );
}
