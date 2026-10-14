import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChevronRight, ExternalLink, FileText, Image as ImageIcon, LayoutGrid, MousePointerClick, PanelRightClose, Pencil, Plus } from 'lucide-react';
import { useAdminEdit } from '@/contexts/adminEditCtx';
import { pulseElement, useEditableRegistry, type EditableEntry } from '@/contexts/editRegistryCtx';
import { PROMOTION_PLACEMENTS, type PromotionPlacement } from '@/api/services/banner';
import { apiGetAllProducts } from '@/api/services/marketplace';
import { categoryPath, refreshCategoryTree, useCategoryTree } from '@/hooks/marketplace/useCategoryTree';
import { scrollRootRef } from '@/utils/scrollRoot';
import { PLACEMENT_NAME, PLACEMENT_WHERE } from './placementLabels';
import type { HomeSection } from './HomeContentEditorModal';

// Admin-only editors: lazy chunks, loaded the first time they are opened.
const PlacementEditorModal = lazy(() => import('./PlacementEditorModal'));
const CategoriesEditorModal = lazy(() => import('./CategoriesEditorModal'));
const SocialLinksEditorModal = lazy(() => import('./SocialLinksEditorModal'));
const DealsEditorModal = lazy(() => import('./DealsEditorModal'));
const HomeContentEditorModal = lazy(() => import('./HomeContentEditorModal'));

const PANEL_WIDTH = 360;
const TAB_KEY = 'adminEditPanelTab';

type Tab = 'page' | 'pages' | 'global' | 'admin';
const TABS: { id: Tab; label: string }[] = [
  { id: 'page', label: 'On this page' },
  { id: 'pages', label: 'Pages' },
  { id: 'global', label: 'Global' },
  { id: 'admin', label: 'Admin panel' },
];

type PageLink = { label: string; to: string; match?: 'prefix' };
const PAGE_GROUPS: { title: string; pages: PageLink[] }[] = [
  { title: 'Main', pages: [
    { label: 'Home', to: '/' },
    { label: 'Marketplace / Search', to: '/search' },
    { label: 'Learn hub', to: '/learn' },
    { label: 'Learning paths', to: '/learning-paths' },
    { label: 'Premium', to: '/premium' },
    { label: 'Become a seller', to: '/become-a-seller' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact-us' },
    { label: 'FAQ', to: '/faq' },
    { label: 'Pricing', to: '/pricing' },
  ] },
  { title: 'Legal', pages: [
    { label: 'Privacy policy', to: '/privacy-policy' },
    { label: 'Terms of service', to: '/terms-of-service' },
    { label: 'Cookie policy', to: '/cookie-policy' },
  ] },
];

const ADMIN_LINKS: { label: string; to: string; hint: string }[] = [
  { label: 'FAQs', to: '/admin/faqs', hint: 'Also editable on the FAQ page' },
  { label: 'Testimonials', to: '/admin/testimonials', hint: 'Not editable inline' },
  { label: 'Announcements', to: '/admin/announcements', hint: 'Site announcement bars' },
  { label: 'Onboarding slides', to: '/admin/app-slides', hint: 'Mobile app intro' },
  { label: 'Contact messages', to: '/admin/contact', hint: 'Messages sent from the Contact page' },
  { label: 'Banners (full manager)', to: '/admin/banners', hint: 'Stats, schedule and placement limits' },
  { label: 'Categories (attributes, images)', to: '/admin/categories', hint: 'Images and attributes' },
  { label: 'Campaigns / flash sale', to: '/admin/marketing', hint: 'All campaign settings' },
  { label: 'Premium', to: '/admin/premium', hint: 'Plans, members, offers' },
  { label: 'Platform plans', to: '/admin/platform-plans', hint: 'Seller plans and pricing' },
  { label: 'Platform config', to: '/admin/config', hint: 'Fees, payments, maintenance, email, AI' },
  { label: 'Learning paths', to: '/admin/learning-paths', hint: 'Create and order paths' },
  { label: 'Picks and shelves', to: '/admin/picks', hint: 'Curated product shelves' },
  { label: 'SEO', to: '/admin/seo', hint: 'Meta, sitemap, redirects' },
  { label: 'Admin dashboard', to: '/admin', hint: 'Overview' },
];

const GLOBAL_HOME_SECTIONS: { section: HomeSection; label: string }[] = [
  { section: 'hero', label: 'Hero (title, text, image, buttons)' },
  { section: 'promise', label: 'Tick strip' },
  { section: 'trust', label: 'Trust items' },
  { section: 'feature', label: 'Feature block' },
  { section: 'creator', label: 'Seller invitation block' },
  { section: 'about', label: 'About page text' },
];

const rowBtn = 'w-full flex items-center gap-2 text-start rounded-lg border border-bone bg-white px-3 py-2 text-[13px] text-carbon cursor-pointer hover:border-brand-orange/60 hover:bg-cream/50 focus-visible:outline-2 focus-visible:outline-brand-orange';

/** Edit-mode side panel: pages of the site, editable regions on the current page, site-wide editors and admin shortcuts. Admin-only, lazy loaded. */
export default function AdminEditSidebar({ onCollapse }: { onCollapse: () => void }) {
  const { setEditing } = useAdminEdit();
  const { pathname } = useLocation();
  const asideRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<Tab>(() => {
    try { const t = localStorage.getItem(TAB_KEY); if (t === 'page' || t === 'pages' || t === 'global' || t === 'admin') return t; } catch { /* storage blocked */ }
    return 'page';
  });
  const [modal, setModal] = useState<{ kind: 'placement'; placement: PromotionPlacement } | { kind: 'categories' } | { kind: 'social' } | { kind: 'deals' } | { kind: 'home'; section: HomeSection } | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches);

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
      onCollapse();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCollapse]);

  const pickTab = (t: Tab) => {
    setTab(t);
    try { localStorage.setItem(TAB_KEY, t); } catch { /* storage blocked */ }
  };

  const closeModal = () => setModal(null);

  return (
    <>
      <aside
        ref={asideRef}
        translate="no"
        role="complementary"
        aria-label="Site editor"
        className={clsx(
          'fixed z-[900] flex flex-col bg-white text-carbon shadow-2xl border-bone',
          'max-md:inset-x-0 max-md:bottom-0 max-md:h-[68vh] max-md:rounded-t-2xl max-md:border-t',
          'md:inset-y-0 md:end-0 md:border-s',
        )}
        style={isMobile ? undefined : { width: PANEL_WIDTH }}
      >
        <header className="shrink-0 border-b border-bone px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Pencil size={15} className="text-brand-orange" />
            <h2 className="m-0 text-[14px] font-bold flex-1">Site editor</h2>
            <button type="button" role="switch" aria-checked onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-carbon text-white text-[12px] font-semibold px-2.5 py-1 border-0 cursor-pointer">
              Edit mode: ON
            </button>
            <button type="button" onClick={onCollapse} aria-label="Collapse site editor" title="Collapse (Esc)"
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg border-0 bg-transparent text-slate cursor-pointer hover:bg-fog">
              <PanelRightClose size={16} />
            </button>
          </div>
          <p className="m-0 mt-2 rounded-md bg-cream px-2.5 py-1.5 text-[12px] text-graphite">Edit mode - changes ask for your password.</p>
          <div role="tablist" aria-label="Site editor sections" className="mt-2 flex gap-1 overflow-x-auto" data-no-edge-scroll>
            {TABS.map(t => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => pickTab(t.id)}
                className={clsx('shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold border cursor-pointer',
                  tab === t.id ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-charcoal border-bone hover:border-brand-orange/50')}>
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3" role="tabpanel">
          {tab === 'page' && <OnThisPage onBeforeOpen={() => { if (isMobile) onCollapse(); }} />}
          {tab === 'pages' && <PagesTab pathname={pathname} />}
          {tab === 'global' && <GlobalTab onOpen={setModal} />}
          {tab === 'admin' && <AdminTab />}
        </div>
      </aside>

      {modal && (
        <Suspense fallback={null}>
          {modal.kind === 'placement' && <PlacementEditorModal placement={modal.placement} onClose={closeModal} />}
          {modal.kind === 'categories' && <CategoriesEditorModal onChanged={() => { void refreshCategoryTree(); }} onClose={closeModal} />}
          {modal.kind === 'social' && <SocialLinksEditorModal onClose={closeModal} />}
          {modal.kind === 'deals' && <DealsEditorModal onClose={closeModal} />}
          {modal.kind === 'home' && <HomeContentEditorModal section={modal.section} onClose={closeModal} />}
        </Suspense>
      )}
    </>
  );
}

// â”€â”€ On this page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OnThisPage({ onBeforeOpen }: { onBeforeOpen: () => void }) {
  const { entries } = useEditableRegistry();
  const { pathname } = useLocation();

  // Group + document order. Recomputed whenever the registry changes (page navigation, banners loading, ...).
  const groups = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      const ea = a.getEl(); const eb = b.getEl();
      if (!ea || !eb) return 0;
      return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    const map = new Map<string, EditableEntry[]>();
    for (const e of sorted) {
      const g = e.getEl()?.closest('footer') ? 'Footer (every page)' : e.placement ? 'Banners' : (e.group ?? 'Page content');
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(e);
    }
    return [...map.entries()];
  }, [entries]);

  const go = (e: EditableEntry) => {
    onBeforeOpen();
    pulseElement(e.getEl());
    window.setTimeout(() => e.open(), 350);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[12px] text-slate">Editable parts of <strong className="text-carbon">{pathname}</strong>. Click one to jump to it and open its editor.</p>
      {groups.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed border-bone p-4 text-center text-[13px] text-slate">Nothing on this page can be edited inline. Use the Global tab for site-wide items, or the Admin panel tab.</p>
      ) : groups.map(([title, items]) => (
        <section key={title} aria-label={title}>
          <h3 className="m-0 mb-1.5 text-[12px] font-bold uppercase tracking-wide text-brand-orange">{title}</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {items.map(e => (
              <li key={e.id}>
                <button type="button" onClick={() => go(e)} className={rowBtn}>
                  {e.placement ? <ImageIcon size={14} className="shrink-0 text-slate" /> : <MousePointerClick size={14} className="shrink-0 text-slate" />}
                  <span className="min-w-0 flex-1 truncate">{e.label}</span>
                  {e.placement ? <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-brand-orange"><Plus size={12} />Add / edit</span> : <ChevronRight size={14} className="shrink-0 text-slate rtl:rotate-180" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// â”€â”€ Pages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PagesTab({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  const { tree } = useCategoryTree();
  const [productSlug, setProductSlug] = useState<string | null>(null);
  const [productErr, setProductErr] = useState(false);

  useEffect(() => {
    let alive = true;
    apiGetAllProducts(1, 1)
      .then(r => { if (alive) setProductSlug(r.data?.products?.[0]?.slug ?? null); })
      .catch(() => { if (alive) setProductErr(true); });
    return () => { alive = false; };
  }, []);

  const firstCat = tree.find(c => c.slug || c._id);
  const samples: { label: string; to: string | null; prefix: string; hint?: string }[] = [
    { label: 'A category page', to: firstCat ? categoryPath(firstCat) : null, prefix: '/c/', hint: firstCat ? firstCat.name : undefined },
    { label: 'A product page', to: productSlug ? `/product/${productSlug}` : null, prefix: '/product/', hint: productErr ? 'No product found' : undefined },
  ];

  const isCurrent = (p: PageLink) => (p.to === '/' ? pathname === '/' : pathname === p.to || pathname.startsWith(p.to + '/'));

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[12px] text-slate">Open any page and edit it there. Edit mode stays on while you move around.</p>
      {PAGE_GROUPS.map(g => (
        <section key={g.title} aria-label={g.title}>
          <h3 className="m-0 mb-1.5 text-[12px] font-bold uppercase tracking-wide text-brand-orange">{g.title}</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {g.pages.map(p => {
              const cur = isCurrent(p);
              return (
                <li key={p.to}>
                  <button type="button" aria-current={cur ? 'page' : undefined} onClick={() => navigate(p.to)}
                    className={clsx(rowBtn, cur && 'border-brand-orange bg-cream font-semibold')}>
                    <FileText size={14} className="shrink-0 text-slate" />
                    <span className="min-w-0 flex-1 truncate">{p.label}</span>
                    {cur && <span className="text-[12px] font-semibold text-brand-orange">Current</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <section aria-label="Sample pages">
        <h3 className="m-0 mb-1.5 text-[12px] font-bold uppercase tracking-wide text-brand-orange">Open a sample</h3>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {samples.map(s => {
            const cur = pathname.startsWith(s.prefix);
            return (
              <li key={s.label}>
                <button type="button" disabled={!s.to} aria-current={cur ? 'page' : undefined} onClick={() => s.to && navigate(s.to)}
                  className={clsx(rowBtn, 'disabled:opacity-50 disabled:cursor-not-allowed', cur && 'border-brand-orange bg-cream font-semibold')}>
                  <LayoutGrid size={14} className="shrink-0 text-slate" />
                  <span className="min-w-0 flex-1 truncate">{s.label}{s.hint ? <span className="ms-1 font-normal text-slate">({s.hint})</span> : null}</span>
                  {cur && <span className="text-[12px] font-semibold text-brand-orange">Current</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

// â”€â”€ Global â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type OpenModal = (m: { kind: 'placement'; placement: PromotionPlacement } | { kind: 'categories' } | { kind: 'social' } | { kind: 'deals' } | { kind: 'home'; section: HomeSection }) => void;

function GlobalTab({ onOpen }: { onOpen: OpenModal }) {
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Banners">
        <h3 className="m-0 mb-1.5 text-[12px] font-bold uppercase tracking-wide text-brand-orange">Banners (every placement)</h3>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {PROMOTION_PLACEMENTS.map(p => (
            <li key={p}>
              <button type="button" onClick={() => onOpen({ kind: 'placement', placement: p })} className={rowBtn}>
                <ImageIcon size={14} className="shrink-0 text-slate" />
                <span className="min-w-0 flex-1"><span className="block truncate">{PLACEMENT_NAME[p]}</span><span className="block text-[12px] text-slate">{PLACEMENT_WHERE[p]}</span></span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-brand-orange"><Plus size={12} />Add / edit</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Site-wide content">
        <h3 className="m-0 mb-1.5 text-[12px] font-bold uppercase tracking-wide text-brand-orange">Site-wide</h3>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          <li><button type="button" onClick={() => onOpen({ kind: 'categories' })} className={rowBtn}><Pencil size={14} className="shrink-0 text-slate" /><span className="flex-1">Categories (full tree)</span></button></li>
          <li><button type="button" onClick={() => onOpen({ kind: 'social' })} className={rowBtn}><Pencil size={14} className="shrink-0 text-slate" /><span className="flex-1">Social links</span></button></li>
          <li><button type="button" onClick={() => onOpen({ kind: 'home', section: 'apps' })} className={rowBtn}><Pencil size={14} className="shrink-0 text-slate" /><span className="flex-1">App Store / Google Play links</span></button></li>
          <li><button type="button" onClick={() => onOpen({ kind: 'deals' })} className={rowBtn}><Pencil size={14} className="shrink-0 text-slate" /><span className="flex-1">Deals and sale campaigns</span></button></li>
        </ul>
      </section>
      <section aria-label="Homepage content">
        <h3 className="m-0 mb-1.5 text-[12px] font-bold uppercase tracking-wide text-brand-orange">Homepage content</h3>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {GLOBAL_HOME_SECTIONS.map(s => (
            <li key={s.section}><button type="button" onClick={() => onOpen({ kind: 'home', section: s.section })} className={rowBtn}><Pencil size={14} className="shrink-0 text-slate" /><span className="flex-1">{s.label}</span></button></li>
          ))}
        </ul>
        <p className="m-0 mt-2 text-[12px] text-slate">Legal pages (Privacy, Terms, Cookie) are edited on the page itself - open it from the Pages tab.</p>
      </section>
    </div>
  );
}

// â”€â”€ Admin panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AdminTab() {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[12px] text-slate">Opens the full admin screen in a new tab.</p>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {ADMIN_LINKS.map(l => (
          <li key={l.to}>
            <Link to={l.to} target="_blank" rel="noopener noreferrer" className={clsx(rowBtn, 'no-underline')}>
              <ExternalLink size={14} className="shrink-0 text-slate" />
              <span className="min-w-0 flex-1"><span className="block truncate">{l.label}</span><span className="block truncate text-[12px] text-slate">{l.hint}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
