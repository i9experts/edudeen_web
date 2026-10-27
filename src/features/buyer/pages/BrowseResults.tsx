import { PlacementBanner } from '@/components/comman/marketplace/PlacementBanner';
import { ScrollRow } from '@/components/comman/ui/ScrollRow';
import { formatPrice } from '@/utils/formatPrice';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import type { PromotionPlacement } from '@/api/services/banner';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { SearchX, X, ChevronLeft, ChevronRight, ChevronDown, Check, List, LayoutGrid } from 'lucide-react';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { useCategoryTree, categoryPath } from '@/hooks/marketplace/useCategoryTree';
import { apiBrowseProducts, type MarketplaceProduct, type MarketplaceSortBy } from '@/api/services/marketplace';
import { apiGetTrendingSearches } from '@/api/services/search';
import { useT } from '@/contexts/languageCtx';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { CURRICULA, CURRICULUM_LABEL } from '@/constants/learning';
import { CLASS_LEVELS, canonicalClass, classLabel, isClassValue } from '@/constants/classLevels';
import { ShoppingForBar } from '@/features/buyer/components/ShoppingForBar';
import { useChildren, childLevelLabel } from '@/hooks/useChildren';
import type { CategoryNode } from '@/api/services/categories';
import { BuyerNavbar, Breadcrumb, Footer, EmptyState } from '@/components/comman/ui';
import { ResourceCard, ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import {
  FiltersButton, FiltersDrawer, Section, RadioRow, PRICE_NO_MAX, type MarketplaceFilters,
} from '@/components/comman/marketplace/FiltersDrawer';

// The shop's browse layout — the homepage in browse mode (`/?category=…` / `/?search=…`, see HomeBrowse) and the Learn pages.
// Every filter lives in the URL and is applied on the server, so results page
// past the first screen and a filtered view can be shared or bookmarked.

const PAGE_SIZE = 24;

const SORTS: { value: MarketplaceSortBy | ''; label: string }[] = [
  { value: '',           label: 'Newest' },
  { value: 'popularity', label: 'Most popular' },
  { value: 'rating',     label: 'Top rated' },
  { value: 'price_asc',  label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];
const TYPE_TO_PARAM: Record<string, 'physical' | 'digital' | 'educational'> = {
  Physical: 'physical', Digital: 'digital', Educational: 'educational',
};
const PARAM_TO_TYPE: Record<string, string> = { physical: 'Physical', digital: 'Digital', educational: 'Educational' };
const GRADE_LABEL = new Map<string, string>(EDUCATION_LEVELS.map(l => [l.value, l.label]));

const num = (v: string | null) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);

/** URL ⇄ filter state. */
function useBrowseState() {
  const [params, setParams] = useSearchParams();
  const state = {
    q: (params.get('search') ?? params.get('q') ?? '').trim(),
    cat: params.get('cat') ?? '',
    grade: params.get('grade') ?? '',
    cls: isClassValue(params.get('class')) ? (params.get('class') as string) : '',
    type: params.get('type') ?? '',
    min: num(params.get('min')),
    max: num(params.get('max')),
    rating: num(params.get('rating')),
    free: params.get('free') === '1',
    exact: params.get('exact') === '1',
    board: params.get('board') ?? '',
    age: num(params.get('age')),
    sort: (params.get('sort') ?? '') as MarketplaceSortBy | '',
    page: Math.min(1000, Math.max(1, Math.floor(num(params.get('page')) ?? 1))),
  };
  const update = useCallback((patch: Record<string, string | number | boolean | undefined | null>, keepPage = false, replace = false) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === '' || v === false) next.delete(k);
        else next.set(k, v === true ? '1' : String(v));
      }
      if (!keepPage) next.delete('page');
      return next;
    }, replace ? { replace: true } : undefined);
  }, [setParams]);
  return { state, update, params };
}

export function BrowseResults({ title, eyebrow, intro, breadcrumb, categoryId, subcategories, showCategoryFilter, emptyHint, fixedGrade, subcategoryHref = categoryPath, subcategoriesLabel, bannerPlacement, showMainCategories = false }: {
  showMainCategories?: boolean;
  title: string;
  eyebrow?: string;
  intro?: string | null;
  breadcrumb: { label: string; path?: string }[];
  categoryId?: string;
  subcategories?: CategoryNode[];
  showCategoryFilter: boolean;
  emptyHint: string;
  /** Landing pages pin the grade; the grade filter is hidden then. */
  fixedGrade?: string;
  subcategoryHref?: (node: CategoryNode) => string;
  subcategoriesLabel?: string;
  /** Admin banners / paid promotions shown above the results (Admin → Banners). */
  bannerPlacement?: PromotionPlacement;
}) {
  const navigate = useNavigate();
  const t = useT();
  const { state, update } = useBrowseState();
  const { currency: prefCurrency, convertBetween, ratesLoaded } = useCurrencyPreference();
  // The price filter lives in PKR (catalogue currency); the chip shows it in the currency the buyer picked.
  const chipCur = ratesLoaded ? prefCurrency : 'PKR';
  const chipMoney = (pkr: number) => formatPrice(chipCur === 'PKR' ? pkr : Math.round(convertBetween(pkr, 'PKR', chipCur) * 100) / 100, chipCur);
  const { tree, byId } = useCategoryTree();
  // Main-category switcher (shop views only): main categories that have products; the active one is the root of the open category.
  const mainCategories = showMainCategories ? tree.filter(c => (c.productCount ?? 0) > 0) : [];
  const activeRootId = categoryId ? (byId.get(categoryId)?.ancestors[0]?._id ?? categoryId) : '';
  const pillBase = 'shrink-0 rounded-full border px-4 py-[7px] min-h-11 inline-flex items-center text-[13.5px] font-medium no-underline transition-colors';
  const { isWishlisted, wishlisting, toggleWishlist } = useWishlistContext();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [view, setView] = useBrowseView();
  /** Typo tolerance info from the API: results are for `corrected` (typed `original`), or `didYouMean` is a hint. */
  const [fix, setFix] = useState<{ corrected?: string; original?: string; didYouMean?: string }>({});

  // "Shopping for" a child: pre-apply their level once per selected child (as a normal, removable grade filter).
  const { selected: activeChild } = useChildren();
  const appliedChild = useRef('');
  useEffect(() => {
    if (!activeChild || fixedGrade || appliedChild.current === activeChild._id) return;
    appliedChild.current = activeChild._id;
    // Exact class when the child has one, else their level.
    const childClass = canonicalClass(activeChild.gradeLabel);
    if (!state.grade && !state.cls && state.age == null) update(childClass ? { class: childClass } : { grade: activeChild.educationLevel }, false, true);
  }, [activeChild, fixedGrade, state.grade, state.cls, state.age, update]);

  const effectiveCategory = categoryId ?? (state.cat || undefined);
  const maxPrice = state.free ? 0 : state.max;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiBrowseProducts({
      q: state.q || undefined,
      categoryId: effectiveCategory,
      productType: TYPE_TO_PARAM[PARAM_TO_TYPE[state.type] ?? ''],
      educationLevel: fixedGrade ?? (state.grade || undefined),
      minPrice: state.free ? undefined : state.min,
      maxPrice,
      minRating: state.rating,
      sortBy: state.sort || undefined,
      curriculum: state.board || undefined,
      age: state.age,
      classValue: state.cls || undefined,
      exact: state.exact,
      page: state.page,
      limit: PAGE_SIZE,
    })
      .then(res => {
        if (cancelled) return;
        setProducts(res.data?.products ?? []);
        setTotal(res.data?.total ?? 0);
        setFix({ corrected: res.correctedQuery, original: res.originalQuery, didYouMean: res.didYouMean });
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load resources.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [state.q, effectiveCategory, state.type, state.grade, state.min, maxPrice, state.free, state.rating, state.sort, state.board, state.age, state.cls, state.exact, state.page, reload, fixedGrade]);

  // Back to the top of the results when the page number changes.
  useEffect(() => { window.document.getElementById('browse-top')?.scrollIntoView({ block: 'start' }); }, [state.page]);

  // The shared drawer's shape ⇄ the URL.
  const drawerFilters: MarketplaceFilters = {
    priceRange: [state.min ?? 0, state.max ?? PRICE_NO_MAX],
    type: state.type && PARAM_TO_TYPE[state.type] ? [PARAM_TO_TYPE[state.type]] : [],
    minRating: state.rating ?? null,
    onSale: false,
  };
  const applyDrawer = (f: MarketplaceFilters) => update({
    min: f.priceRange[0] > 0 ? f.priceRange[0] : undefined,
    max: f.priceRange[1] < PRICE_NO_MAX ? f.priceRange[1] : undefined,
    type: f.type[0] ? TYPE_TO_PARAM[f.type[0]] : undefined,
    rating: f.minRating ?? undefined,
  });
  const clearAll = () => update({ board: undefined, age: undefined, class: undefined, cat: undefined, grade: undefined, type: undefined, min: undefined, max: undefined, rating: undefined, free: undefined, sort: undefined });

  const catName = state.cat ? tree.flatMap(c => [c, ...(c.children ?? [])]).find(c => c._id === state.cat)?.name : null;
  const chips: { key: string; label: string; clear: () => void }[] = [
    ...(showCategoryFilter && state.cat ? [{ key: 'cat', label: catName ?? 'Category', clear: () => update({ cat: undefined }) }] : []),
    ...(state.board ? [{ key: 'board', label: CURRICULUM_LABEL[state.board] ?? state.board, clear: () => update({ board: undefined }) }] : []),
    ...(state.age != null ? [{ key: 'age', label: `For age ${state.age}`, clear: () => update({ age: undefined }) }] : []),
    ...(state.cls ? [{ key: 'class', label: activeChild && state.cls === canonicalClass(activeChild.gradeLabel) ? `${t('For')} ${activeChild.name} (${classLabel(state.cls)})` : classLabel(state.cls), clear: () => update({ class: undefined }) }] : []),
    ...(state.grade && !fixedGrade ? [{ key: 'grade', label: activeChild && state.grade === activeChild.educationLevel ? `${t('For')} ${activeChild.name} (${childLevelLabel(activeChild)})` : GRADE_LABEL.get(state.grade) ?? state.grade, clear: () => update({ grade: undefined }) }] : []),
    ...(state.type ? [{ key: 'type', label: PARAM_TO_TYPE[state.type] ?? state.type, clear: () => update({ type: undefined }) }] : []),
    ...(state.free ? [{ key: 'free', label: 'Free only', clear: () => update({ free: undefined }) }] : []),
    ...(!state.free && (state.min != null || state.max != null)
      ? [{ key: 'price', label: `${chipMoney(state.min ?? 0)} – ${state.max != null ? chipMoney(state.max) : 'any'}`, clear: () => update({ min: undefined, max: undefined }) }]
      : []),
    ...(state.rating ? [{ key: 'rating', label: `${state.rating}★ & up`, clear: () => update({ rating: undefined }) }] : []),
  ];

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (state.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, state.page * PAGE_SIZE);

  return (
    <div className="bg-white min-h-full">
      <div className="sticky top-[var(--navbar-top,0px)] z-50"><BuyerNavbar /></div>

      <main id="browse-top" className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-4 md:pt-6 pb-12 scroll-mt-28">
        <ShoppingForBar className="mb-3" />
        <Breadcrumb className="mb-1" items={breadcrumb} />

        {bannerPlacement && <PlacementBanner placement={bannerPlacement} className="mb-5" />}
        <header className="mb-5">
          {eyebrow && <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-1">{eyebrow}</p>}
          <h1 className="font-serif font-normal text-[28px] md:text-[36px] leading-[1.15] text-carbon text-balance">{title}</h1>
          {intro && <p className="text-[14.5px] text-graphite mt-2 max-w-[70ch]">{intro}</p>}
        </header>

        {mainCategories.length > 0 && (
          <nav aria-label="Main categories" className="mb-3"><ScrollRow className="flex gap-2 pb-2">
            <Link
              to="/?browse=1"
              aria-current={!activeRootId ? 'page' : undefined}
              className={clsx(pillBase, !activeRootId ? 'border-brand-royal bg-brand-royal text-white' : 'border-bone bg-white text-carbon hover:border-brand-orange hover:text-brand-orange')}
            >
              {t('All')}
            </Link>
            {mainCategories.map(c => (
              <Link
                key={c._id}
                to={categoryPath(c)}
                aria-current={c._id === activeRootId ? 'page' : undefined}
                className={clsx(pillBase, c._id === activeRootId ? 'border-brand-royal bg-brand-royal text-white' : 'border-bone bg-white text-carbon hover:border-brand-orange hover:text-brand-orange')}
              >
                {c.name}
              </Link>
            ))}
          </ScrollRow></nav>
        )}

        {subcategories && subcategories.length > 0 && (
          <nav aria-label={subcategoriesLabel ?? 'Subcategories'} className="mb-4"><ScrollRow className="flex gap-2 pb-2">
            {subcategories.map(s => (
              <Link
                key={s._id}
                to={subcategoryHref(s)}
                className="shrink-0 rounded-full border border-bone bg-white px-4 py-[7px] min-h-11 inline-flex items-center text-[13.5px] font-medium text-carbon no-underline hover:border-brand-orange hover:text-brand-orange transition-colors"
              >
                {s.name}{typeof s.productCount === 'number' && <span className="text-slate ms-1.5">{s.productCount}</span>}
              </Link>
            ))}
          </ScrollRow></nav>
        )}

        {state.q && fix.corrected && !loading && (
          <p className="mb-3 text-[14.5px] text-graphite" role="status">
            {t('Showing results for')} <b className="text-carbon">{fix.corrected}</b>.{' '}
            {t('Search instead for')}{' '}
            <button type="button" onClick={() => update({ exact: true })} className="p-0 bg-transparent border-none cursor-pointer text-brand-royal font-semibold underline underline-offset-2">{fix.original ?? state.q}</button>
          </p>
        )}
        {state.q && !fix.corrected && fix.didYouMean && !loading && (
          <p className="mb-3 text-[14.5px] text-graphite" role="status">
            {t('Did you mean')}{' '}
            <Link to={`/?search=${encodeURIComponent(fix.didYouMean)}`} className="text-brand-royal font-semibold underline underline-offset-2">{fix.didYouMean}</Link>?
          </p>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <FiltersButton count={chips.length} onClick={() => setDrawerOpen(true)} />
          <SortMenu value={state.sort} defaultLabel={state.q ? 'Relevance' : 'Newest'} onChange={v => update({ sort: v || undefined })} />
          <label className="inline-flex items-center gap-2 min-h-11 text-[14px] -mx-3 px-3 font-medium text-carbon cursor-pointer select-none">
            <input type="checkbox" id="browse-free" checked={state.free} onChange={e => update({ free: e.target.checked || undefined })} className="w-4 h-4 accent-brand-orange" />
            Free only
          </label>
          <p className="ms-auto text-[13.5px] text-slate tabular-nums" aria-live="polite">
            {loading ? 'Searching…' : total === 0 ? 'No results' : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} results`}
          </p>
          <ViewToggle value={view} onChange={setView} />
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {chips.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={c.clear}
                aria-label={`Remove filter ${c.label}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-pale-orange/60 text-brand-deep-orange px-3 py-[5px] text-[13px] font-semibold border-none cursor-pointer hover:bg-brand-pale-orange"
              >
                {c.label} <X size={13} />
              </button>
            ))}
            <button type="button" onClick={clearAll} className="text-[13px] font-semibold text-carbon underline underline-offset-4 bg-transparent border-none cursor-pointer">
              Clear all
            </button>
          </div>
        )}

        {error ? (
          <div role="alert" className="text-center py-16">
            <p className="text-[14px] text-error mb-3">{error}</p>
            <button type="button" onClick={() => setReload(r => r + 1)} className="rounded-full bg-carbon text-white px-5 py-2 text-[14px] font-semibold border-none cursor-pointer">Try again</button>
          </div>
        ) : loading ? (
          view === 'list' ? (
            <div className="border-t border-bone">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex gap-4 sm:gap-6 py-5 border-b border-bone animate-pulse">
                  <div className="w-[112px] sm:w-[168px] aspect-square rounded-xl bg-bone shrink-0" />
                  <div className="flex-1"><div className="h-3 w-1/3 bg-bone rounded" /><div className="h-4 w-3/4 bg-bone rounded mt-3" /><div className="h-3 w-1/4 bg-bone rounded mt-3" /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 md:gap-x-4 gap-y-5">
              {Array.from({ length: 8 }, (_, i) => <ResourceCardSkeleton key={i} />)}
            </div>
          )
        ) : products.length === 0 ? (
          <>
            <EmptyState
              icon={<SearchX size={28} className="text-slate" />}
              title={state.q ? `Nothing found for “${state.q}”` : 'No resources here yet'}
              description={chips.length ? 'Try removing a filter.' : emptyHint}
              action={chips.length ? { label: 'Clear filters', onClick: clearAll } : { label: 'Browse all resources', onClick: () => navigate('/') }}
            />
            {state.q && <SearchEmptyHelp didYouMean={fix.didYouMean} categories={tree} />}
          </>
        ) : (
          <div className={view === 'list' ? 'border-t border-bone' : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 md:gap-x-4 gap-y-5'}>
            {products.map((p, i) => {
              const dv = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
              const vId = dv?._id ?? '';
              return (
                <ResourceCard
                  key={p._id}
                  index={i}
                  layout={view}
                  product={p}
                  onClick={slug => navigate(`/product/${slug}`)}
                  isWishlisted={isWishlisted(p._id, vId)}
                  isWishlisting={wishlisting === vId}
                  onToggleWishlist={(e, id, variantId) => { e.stopPropagation(); if (variantId) toggleWishlist(id, variantId); }}
                />
              );
            })}
          </div>
        )}

        {!loading && !error && pages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-center gap-1.5 mt-10">
            <button
              type="button" disabled={state.page <= 1} onClick={() => update({ page: state.page - 1 }, true)}
              aria-label="Previous page"
              className="size-10 rounded-full border border-bone bg-white flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default"
            ><ChevronLeft size={18} /></button>
            {pageList(state.page, pages).map((n, i) => n === '…'
              ? <span key={`gap-${i}`} className="px-1 text-slate">…</span>
              : (
                <button
                  key={n} type="button" onClick={() => update({ page: n === 1 ? undefined : n }, true)}
                  aria-current={n === state.page ? 'page' : undefined}
                  className={clsx(
                    'min-w-10 h-10 px-2 rounded-full text-[14px] font-semibold border cursor-pointer tabular-nums',
                    n === state.page ? 'bg-carbon border-carbon text-white' : 'bg-white border-bone text-carbon hover:border-carbon',
                  )}
                >{n}</button>
              ))}
            <button
              type="button" disabled={state.page >= pages} onClick={() => update({ page: state.page + 1 }, true)}
              aria-label="Next page"
              className="size-10 rounded-full border border-bone bg-white flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default"
            ><ChevronRight size={18} /></button>
          </nav>
        )}
      </main>

      <Footer />

      <FiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={drawerFilters}
        onChange={applyDrawer}
        onClear={clearAll}
        total={total}
        showOnSale={false}
        categories={showCategoryFilter ? tree : []}
        selectedCategory={showCategoryFilter ? state.cat : ''}
        onCategoryChange={id => update({ cat: id || undefined })}
        extraActiveCount={(state.grade ? 1 : 0) + (state.cls ? 1 : 0) + (state.free ? 1 : 0) + (state.board ? 1 : 0) + (state.age != null ? 1 : 0)}
      >
        <Section title="Sort by">
          {SORTS.map(s => (
            <RadioRow key={s.value || 'newest'} name="f-sort" label={s.value === '' && state.q ? 'Relevance' : s.label} checked={state.sort === s.value} onChange={() => update({ sort: s.value || undefined })} />
          ))}
        </Section>
        <Section title="Exam board" hint="Resources that follow your child's syllabus">
          <RadioRow name="f-board" label="Any board" checked={!state.board} onChange={() => update({ board: undefined })} />
          {CURRICULA.map(c => (
            <RadioRow key={c.value} name="f-board" label={c.label} checked={state.board === c.value} onChange={() => update({ board: c.value })} />
          ))}
        </Section>
        <Section title="Class" hint="Resources that suit your child's exact class">
          <select
            id="f-class"
            aria-label="Class"
            value={state.cls}
            onChange={e => update({ class: e.target.value || undefined })}
            className="rounded-lg border border-[#8a959d] px-4 py-3 text-[16px] text-carbon bg-white"
          >
            <option value="">Any class</option>
            {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Section>
        <Section title="Child's age">
          <select
            id="f-age"
            aria-label="Child's age"
            value={state.age ?? ''}
            onChange={e => update({ age: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="rounded-lg border border-[#8a959d] px-4 py-3 text-[16px] text-carbon bg-white"
          >
            <option value="">Any age</option>
            {Array.from({ length: 18 }, (_, i) => i + 2).map(a => <option key={a} value={a}>{a} years</option>)}
          </select>
        </Section>
        {!fixedGrade && <Section title="Age & grade">
          <RadioRow name="f-grade" label="All ages" checked={!state.grade} onChange={() => update({ grade: undefined })} />
          {EDUCATION_LEVELS.filter(l => l.value !== 'other').map(l => (
            <RadioRow key={l.value} name="f-grade" label={l.label} checked={state.grade === l.value} onChange={() => update({ grade: l.value })} />
          ))}
        </Section>}
      </FiltersDrawer>
    </div>
  );
}

type BrowseView = 'grid' | 'list';
const VIEW_KEY = 'edudeen.browseView';

/** Grid/list choice — remembered per browser (a convenience, so storage may fail). */
function useBrowseView(): [BrowseView, (v: BrowseView) => void] {
  const [view, setView] = useState<BrowseView>(() => {
    try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'; } catch { return 'grid'; }
  });
  const set = useCallback((v: BrowseView) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage unavailable */ }
  }, []);
  return [view, set];
}

/** "Sort by: Newest ⌄" — opens a small menu of sort orders. */
function SortMenu({ value, onChange, defaultLabel }: { value: MarketplaceSortBy | ''; onChange: (v: MarketplaceSortBy | '') => void; defaultLabel: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const labelOf = (s: { value: string; label: string }) => (s.value === '' ? defaultLabel : s.label);
  const current = SORTS.find(s => s.value === value) ?? SORTS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id="browse-sort"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 rounded-full bg-transparent border-none px-2 py-[9px] text-[15px] text-carbon cursor-pointer hover:bg-[#f3f5f6]"
      >
        <span>Sort by:</span>
        <b className="font-bold">{labelOf(current)}</b>
        <ChevronDown size={17} className={clsx('transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <ul role="listbox" aria-label="Sort by" className="absolute start-0 top-full mt-1 z-30 min-w-[220px] list-none m-0 p-1.5 bg-white border border-bone rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
          {SORTS.map(s => (
            <li key={s.value || 'newest'}>
              <button
                type="button"
                role="option"
                aria-selected={s.value === value}
                onClick={() => { onChange(s.value); setOpen(false); }}
                className={clsx(
                  'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-start text-[14px] border-none cursor-pointer',
                  s.value === value ? 'bg-[#f3f5f6] font-bold text-carbon' : 'bg-transparent text-carbon hover:bg-[#f7f8f9]',
                )}
              >
                {labelOf(s)}
                {s.value === value && <Check size={15} className="text-success" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** List / grid switch — a pill with the active view ringed in green. */
function ViewToggle({ value, onChange }: { value: BrowseView; onChange: (v: BrowseView) => void }) {
  const opt = (v: BrowseView, Icon: typeof List, label: string) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      aria-pressed={value === v}
      aria-label={label}
      title={label}
      className={clsx(
        'size-[38px] rounded-full flex items-center justify-center cursor-pointer transition-colors',
        value === v ? 'bg-[#e9f8f0] border-2 border-[#3ccf8e] text-carbon' : 'bg-transparent border-2 border-transparent text-carbon hover:bg-[#f3f5f6]',
      )}
    >
      <Icon size={18} aria-hidden />
    </button>
  );
  return (
    <div role="group" aria-label="View" className="inline-flex items-center gap-1 p-[3px] rounded-full border border-bone bg-white">
      {opt('list', List, 'List view')}
      {opt('grid', LayoutGrid, 'Grid view')}
    </div>
  );
}

/** No results: a "did you mean" hint, trending searches and popular categories (reuses the trending endpoint). */
function SearchEmptyHelp({ didYouMean, categories }: { didYouMean?: string; categories: CategoryNode[] }) {
  const t = useT();
  const [trending, setTrending] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    apiGetTrendingSearches(8).then(r => { if (!cancelled) setTrending((r.data ?? []).map(x => x.query)); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const cats = categories.filter(c => c.slug || c._id).slice(0, 8);
  const pill = 'rounded-full border border-bone bg-white px-4 py-[7px] min-h-11 inline-flex items-center text-[13.5px] font-medium text-carbon no-underline hover:border-brand-orange hover:text-brand-orange transition-colors';
  return (
    <div className="max-w-[720px] mx-auto mt-2 mb-6 text-center space-y-6">
      {didYouMean && (
        <p className="text-[15px] text-graphite">{t('Did you mean')} <Link to={`/?search=${encodeURIComponent(didYouMean)}`} className="text-brand-royal font-semibold underline underline-offset-2">{didYouMean}</Link>?</p>
      )}
      {trending.length > 0 && (
        <div>
          <h2 className="text-[12px] font-bold tracking-[0.15em] uppercase text-slate mb-2">{t('Trending searches')}</h2>
          <div className="flex flex-wrap justify-center gap-2">{trending.map(q => <Link key={q} to={`/?search=${encodeURIComponent(q)}`} className={pill}>{q}</Link>)}</div>
        </div>
      )}
      {cats.length > 0 && (
        <div>
          <h2 className="text-[12px] font-bold tracking-[0.15em] uppercase text-slate mb-2">{t('Popular categories')}</h2>
          <div className="flex flex-wrap justify-center gap-2">{cats.map(c => <Link key={c._id} to={categoryPath(c)} className={pill}>{c.name}</Link>)}</div>
        </div>
      )}
    </div>
  );
}

/** 1 … 4 5 [6] 7 8 … 20 */
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  if (lo > 2) out.push('…');
  for (let n = lo; n <= hi; n++) out.push(n);
  if (hi < total - 1) out.push('…');
  out.push(total);
  return out;
}
