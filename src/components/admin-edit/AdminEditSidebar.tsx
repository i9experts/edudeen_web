import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, ExternalLink, FileText, HelpCircle, Image as ImageIcon, LayoutGrid, Link2, Megaphone, Pencil, PanelRightClose, Plus, Smartphone, Type } from 'lucide-react';
import { useAdminEdit } from '@/contexts/adminEditCtx';
import { pulseElement, useEditableRegistry, type EditableEntry } from '@/contexts/editRegistryCtx';
import { apiGetAllProducts } from '@/api/services/marketplace';
import { categoryPath, useCategoryTree } from '@/hooks/marketplace/useCategoryTree';
import { scrollRootRef } from '@/utils/scrollRoot';

const PANEL_WIDTH = 340;

const PAGES: { label: string; to: string }[] = [
  { label: 'Home page', to: '/' },
  { label: 'Marketplace / Search', to: '/search' },
  { label: 'Learn hub', to: '/learn' },
  { label: 'Learning paths', to: '/learning-paths' },
  { label: 'Premium', to: '/premium' },
  { label: 'Become a seller', to: '/become-a-seller' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact-us' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Privacy policy', to: '/privacy-policy' },
  { label: 'Terms of service', to: '/terms-of-service' },
  { label: 'Cookie policy', to: '/cookie-policy' },
];

/** Friendly page name from the route. */
function pageName(pathname: string): string {
  const p = pathname.replace(/\/+$/, '') || '/';
  const hit = PAGES.find(x => x.to === p);
  if (hit) return hit.to === '/' ? 'Home page' : `${hit.label}${/page|hub|paths/i.test(hit.label) ? '' : ' page'}`;
  if (p.startsWith('/c/')) return 'Category page';
  if (p.startsWith('/product/')) return 'Product page';
  if (p.startsWith('/learn')) return 'Learn page';
  if (p.startsWith('/search')) return 'Marketplace page';
  return 'This page';
}

/** Where the full admin screen for a page lives (used by the empty state). */
function adminFor(pathname: string): { label: string; to: string } {
  if (pathname.startsWith('/faq')) return { label: 'FAQs', to: '/admin/faqs' };
  if (pathname.startsWith('/contact')) return { label: 'Contact messages', to: '/admin/messages?tab=contact' };
  if (pathname.startsWith('/premium')) return { label: 'Premium', to: '/admin/premium' };
  if (pathname.startsWith('/pricing')) return { label: 'Platform plans', to: '/admin/platform-plans' };
  if (pathname.startsWith('/learning-paths')) return { label: 'Learning paths', to: '/admin/learning-paths' };
  if (pathname.startsWith('/product') || pathname.startsWith('/c/') || pathname.startsWith('/search')) return { label: 'Banners', to: '/admin/banners' };
  return { label: 'the admin dashboard', to: '/admin' };
}

function iconFor(e: EditableEntry) {
  if (e.placement) return ImageIcon;
  const l = e.label.toLowerCase();
  if (l.includes('faq')) return HelpCircle;
  if (l.includes('social')) return Link2;
  if (l.includes('app')) return Smartphone;
  if (l.includes('deal') || l.includes('sale')) return Megaphone;
  if (l.includes('categor')) return LayoutGrid;
  if (l.includes('text') || l.includes('about') || l.includes('hero') || l.includes('block')) return Type;
  return Pencil;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Edit-mode side panel: ONLY what the admin can edit on the page being shown (from the live registry), plus a light
 * "More" footer (page switcher, admin panel). Desktop: right drawer that pushes the page aside. Phone: slim bottom bar
 * that expands into a sheet. Admin-only, lazy loaded.
 */
export default function AdminEditSidebar({ onCollapse }: { onCollapse: () => void }) {
  const { setEditing } = useAdminEdit();
  const { pathname } = useLocation();
  const { entries } = useEditableRegistry();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches);
  const [expanded, setExpanded] = useState(false); // phones only; starts as a slim bar

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const on = () => setIsMobile(!mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // On desktop the panel pushes the page aside instead of covering it, so the page stays fully usable.
  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root || isMobile) return;
    root.style.paddingInlineEnd = `${PANEL_WIDTH}px`;
    return () => { root.style.paddingInlineEnd = ''; };
  }, [isMobile]);

  // Esc collapses the panel (unless a dialog is open - the dialog uses Esc itself).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;
      if (isMobile) setExpanded(false); else onCollapse();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCollapse, isMobile]);

  // Page items first (document order), site-wide ones (footer etc.) separate.
  const { pageItems, globalItems } = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      const ea = a.getEl(); const eb = b.getEl();
      if (!ea || !eb) return 0;
      return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    const pageItems: EditableEntry[] = []; const globalItems: EditableEntry[] = [];
    for (const e of sorted) (e.global || e.getEl()?.closest('footer, header') ? globalItems : pageItems).push(e);
    return { pageItems, globalItems };
  }, [entries]);

  const name = pageName(pathname);
  const total = pageItems.length + globalItems.length;
  const go = (e: EditableEntry) => {
    if (isMobile) setExpanded(false);
    pulseElement(e.getEl());
    window.setTimeout(() => e.open(), 350);
  };

  const done = (
    <button type="button" onClick={() => setEditing(false)}
      className="inline-flex items-center rounded-full bg-carbon text-white text-[13px] font-bold px-4 py-1.5 border-0 cursor-pointer hover:opacity-90 focus-visible:outline-2 focus-visible:outline-brand-orange">
      Done
    </button>
  );

  // Phone, collapsed: one slim bar above the bottom navigation.
  if (isMobile && !expanded) {
    return (
      <aside translate="no" role="complementary" aria-label="Site editor"
        className="fixed z-[900] inset-x-3 bottom-[68px] flex items-center gap-2 rounded-full bg-white text-carbon shadow-xl border border-bone ps-4 pe-1.5 py-1.5">
        <button type="button" onClick={() => setExpanded(true)} aria-expanded={false}
          className="flex-1 min-w-0 inline-flex items-center gap-2 bg-transparent border-0 p-0 text-start text-[13px] font-semibold text-carbon cursor-pointer">
          <Pencil size={14} className="text-brand-orange shrink-0" />
          <span className="truncate">{total} editable item{total === 1 ? '' : 's'}</span>
          <ChevronDown size={14} className="rotate-180 text-slate shrink-0" />
        </button>
        {done}
      </aside>
    );
  }

  return (
    <aside
      translate="no"
      role="complementary"
      aria-label="Site editor"
      className={clsx(
        'fixed z-[900] flex flex-col bg-white text-carbon shadow-2xl border-bone',
        'max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[70vh] max-md:rounded-t-2xl max-md:border-t',
        'md:inset-y-0 md:end-0 md:border-s',
      )}
      style={isMobile ? undefined : { width: PANEL_WIDTH }}
    >
      <header className="shrink-0 border-b border-bone px-4 pt-3 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange/10 text-brand-orange text-[12px] font-bold px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" /> Edit mode ON
          </span>
          <span className="flex-1" />
          <button type="button" onClick={() => (isMobile ? setExpanded(false) : onCollapse())} aria-label="Collapse site editor" title="Collapse (Esc)"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg border-0 bg-transparent text-slate cursor-pointer hover:bg-fog">
            {isMobile ? <ChevronDown size={16} /> : <PanelRightClose size={16} />}
          </button>
          {done}
        </div>
        <h2 className="m-0 mt-3 text-[17px] font-bold">Editing: {name}</h2>
        <p className="m-0 mt-0.5 text-[12px] text-slate">Click any highlighted area on the page to edit it. Changes ask for your password.</p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {pageItems.length === 0 ? (
          <EmptyState pathname={pathname} hasGlobal={globalItems.length > 0} />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {pageItems.map(e => <ItemRow key={e.id} e={e} onGo={go} />)}
          </ul>
        )}

        {globalItems.length > 0 && (
          <Fold title={`On every page (${globalItems.length})`}>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {globalItems.map(e => <ItemRow key={e.id} e={e} onGo={go} />)}
            </ul>
          </Fold>
        )}

        <Fold title="More">
          <MoreMenu pathname={pathname} />
        </Fold>
      </div>
    </aside>
  );
}

function ItemRow({ e, onGo }: { e: EditableEntry; onGo: (e: EditableEntry) => void }) {
  const Icon = iconFor(e);
  return (
    <li>
      <button type="button" onClick={() => onGo(e)} aria-label={`Edit ${e.label}`}
        className="w-full flex items-center gap-3 text-start rounded-xl border border-bone bg-white px-3 py-2.5 cursor-pointer hover:border-brand-orange/60 hover:bg-cream/50 focus-visible:outline-2 focus-visible:outline-brand-orange">
        <span className="shrink-0 w-8 h-8 rounded-lg bg-cream text-brand-orange inline-flex items-center justify-center"><Icon size={15} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-carbon">{cap(e.label)}</span>
          {e.empty
            ? <span className="block text-[12px] font-semibold text-brand-orange">Empty - add one</span>
            : e.hint && <span className="block truncate text-[12px] text-slate">{e.hint}</span>}
        </span>
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-brand-orange text-white text-[12px] font-semibold px-2.5 py-1">
          {e.empty ? <><Plus size={12} />Add</> : <><Pencil size={11} />Edit</>}
        </span>
      </button>
    </li>
  );
}

function EmptyState({ pathname, hasGlobal }: { pathname: string; hasGlobal: boolean }) {
  const a = adminFor(pathname);
  return (
    <div className="rounded-xl border border-dashed border-bone p-4 text-center">
      <p className="m-0 text-[13px] font-semibold text-carbon">Nothing on this page can be edited here.</p>
      <p className="m-0 mt-1 text-[12px] text-slate">
        {hasGlobal ? 'Only site-wide items (below) are editable here. ' : ''}Use the admin panel for {a.label}.
      </p>
      <Link to={a.to} target="_blank" rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-bone px-3 py-1.5 text-[12px] font-semibold text-carbon no-underline hover:border-brand-orange/60">
        <ExternalLink size={12} /> Open {a.label}
      </Link>
    </div>
  );
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-4 border-t border-bone pt-2">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full flex items-center gap-1.5 bg-transparent border-0 px-0 py-1.5 text-start text-[12px] font-bold uppercase tracking-wide text-slate cursor-pointer">
        <ChevronRight size={13} className={clsx('transition-transform rtl:rotate-180', open && 'rotate-90 rtl:rotate-90')} />
        {title}
      </button>
      {open && <div className="mt-1.5">{children}</div>}
    </section>
  );
}

/** Page switcher + admin panel link. Mounted only while "More" is open, so the sample lookups run on demand. */
function MoreMenu({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  const { tree } = useCategoryTree();
  const [productSlug, setProductSlug] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiGetAllProducts(1, 1)
      .then(r => { if (alive) setProductSlug(r.data?.products?.[0]?.slug ?? null); })
      .catch(() => { /* sample product is optional */ });
    return () => { alive = false; };
  }, []);

  const firstCat = tree.find(c => c.slug || c._id);
  const catTo = firstCat ? categoryPath(firstCat) : null;
  const prodTo = productSlug ? `/product/${productSlug}` : null;
  const current = pathname.startsWith('/c/') ? catTo ?? '' : pathname.startsWith('/product/') ? prodTo ?? '' : (PAGES.find(p => (p.to === '/' ? pathname === '/' : pathname === p.to))?.to ?? '');

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
        <span className="inline-flex items-center gap-1"><FileText size={12} /> Go to another page</span>
        <select value={current} onChange={e => { if (e.target.value) navigate(e.target.value); }}
          className="rounded-lg border border-bone bg-white px-2.5 py-2 text-[13px] font-normal text-carbon">
          <option value="" disabled>Choose a page...</option>
          {PAGES.map(p => <option key={p.to} value={p.to}>{p.label}</option>)}
          {catTo && <option value={catTo}>A category page{firstCat ? ` (${firstCat.name})` : ''}</option>}
          {prodTo && <option value={prodTo}>A product page</option>}
        </select>
      </label>
      <Link to="/admin" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-carbon no-underline hover:text-brand-orange">
        <ExternalLink size={13} /> Open admin panel
      </Link>
    </div>
  );
}
