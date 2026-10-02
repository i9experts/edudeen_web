import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { SearchX, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { useCategoryTree, categoryPath } from '@/hooks/marketplace/useCategoryTree';
import { apiBrowseProducts, type MarketplaceProduct, type MarketplaceSortBy } from '@/api/services/marketplace';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { CURRICULA, CURRICULUM_LABEL } from '@/constants/learning';
import type { CategoryNode } from '@/api/services/categories';
import { BuyerNavbar, Breadcrumb, Footer, EmptyState } from '@/components/comman/ui';
import { ResourceCard, ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import {
  FiltersButton, FiltersDrawer, Section, RadioRow, PRICE_NO_MAX, type MarketplaceFilters,
} from '@/components/comman/marketplace/FiltersDrawer';

// Search results (`/search?q=`) and category pages (`/c/:slug`) — one layout.
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
    q: (params.get('q') ?? '').trim(),
    cat: params.get('cat') ?? '',
    grade: params.get('grade') ?? '',
    type: params.get('type') ?? '',
    min: num(params.get('min')),
    max: num(params.get('max')),
    rating: num(params.get('rating')),
    free: params.get('free') === '1',
    board: params.get('board') ?? '',
    age: num(params.get('age')),
    sort: (params.get('sort') ?? '') as MarketplaceSortBy | '',
    page: Math.max(1, num(params.get('page')) ?? 1),
  };
  const update = useCallback((patch: Record<string, string | number | boolean | undefined | null>, keepPage = false) => {
    setParams(prev => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === '' || v === false) next.delete(k);
        else next.set(k, v === true ? '1' : String(v));
      }
      if (!keepPage) next.delete('page');
      return next;
    });
  }, [setParams]);
  return { state, update, params };
}

export function BrowseResults({ title, eyebrow, intro, breadcrumb, categoryId, subcategories, showCategoryFilter, emptyHint, fixedGrade, subcategoryHref = categoryPath, subcategoriesLabel }: {
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
}) {
  const navigate = useNavigate();
  const { state, update } = useBrowseState();
  const { tree } = useCategoryTree();
  const { isWishlisted, wishlisting, toggleWishlist } = useWishlistContext();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

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
      page: state.page,
      limit: PAGE_SIZE,
    })
      .then(res => {
        if (cancelled) return;
        setProducts(res.data?.products ?? []);
        setTotal(res.data?.total ?? 0);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load resources.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [state.q, effectiveCategory, state.type, state.grade, state.min, maxPrice, state.free, state.rating, state.sort, state.board, state.age, state.page, reload, fixedGrade]);

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
  const clearAll = () => update({ board: undefined, age: undefined, cat: undefined, grade: undefined, type: undefined, min: undefined, max: undefined, rating: undefined, free: undefined, sort: undefined });

  const catName = state.cat ? tree.flatMap(c => [c, ...(c.children ?? [])]).find(c => c._id === state.cat)?.name : null;
  const chips: { key: string; label: string; clear: () => void }[] = [
    ...(showCategoryFilter && state.cat ? [{ key: 'cat', label: catName ?? 'Category', clear: () => update({ cat: undefined }) }] : []),
    ...(state.board ? [{ key: 'board', label: CURRICULUM_LABEL[state.board] ?? state.board, clear: () => update({ board: undefined }) }] : []),
    ...(state.age != null ? [{ key: 'age', label: `For age ${state.age}`, clear: () => update({ age: undefined }) }] : []),
    ...(state.grade && !fixedGrade ? [{ key: 'grade', label: GRADE_LABEL.get(state.grade) ?? state.grade, clear: () => update({ grade: undefined }) }] : []),
    ...(state.type ? [{ key: 'type', label: PARAM_TO_TYPE[state.type] ?? state.type, clear: () => update({ type: undefined }) }] : []),
    ...(state.free ? [{ key: 'free', label: 'Free only', clear: () => update({ free: undefined }) }] : []),
    ...(!state.free && (state.min != null || state.max != null)
      ? [{ key: 'price', label: `Rs ${(state.min ?? 0).toLocaleString()} – ${state.max != null ? `Rs ${state.max.toLocaleString()}` : 'any'}`, clear: () => update({ min: undefined, max: undefined }) }]
      : []),
    ...(state.rating ? [{ key: 'rating', label: `${state.rating}★ & up`, clear: () => update({ rating: undefined }) }] : []),
  ];

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (state.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, state.page * PAGE_SIZE);

  return (
    <div className="bg-white min-h-full">
      <div className="sticky top-0 z-50"><BuyerNavbar /></div>

      <main id="browse-top" className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-4 md:pt-6 pb-12 scroll-mt-28">
        <Breadcrumb className="mb-1" items={breadcrumb} />

        <header className="mb-5">
          {eyebrow && <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-1">{eyebrow}</p>}
          <h1 className="font-serif font-normal text-[28px] md:text-[36px] leading-[1.15] text-carbon text-balance">{title}</h1>
          {intro && <p className="text-[14.5px] text-graphite mt-2 max-w-[70ch]">{intro}</p>}
        </header>

        {subcategories && subcategories.length > 0 && (
          <nav aria-label={subcategoriesLabel ?? 'Subcategories'} className="flex gap-2 overflow-x-auto pb-2 mb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {subcategories.map(s => (
              <Link
                key={s._id}
                to={subcategoryHref(s)}
                className="shrink-0 rounded-full border border-bone bg-white px-4 py-[7px] text-[13.5px] font-medium text-carbon no-underline hover:border-brand-orange hover:text-brand-orange transition-colors"
              >
                {s.name}{typeof s.productCount === 'number' && <span className="text-slate ms-1.5">{s.productCount}</span>}
              </Link>
            ))}
          </nav>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <FiltersButton count={chips.length} onClick={() => setDrawerOpen(true)} />
          <label className="inline-flex items-center gap-2 text-[14px] text-slate">
            <span>Sort</span>
            <select
              id="browse-sort"
              value={state.sort}
              onChange={e => update({ sort: e.target.value || undefined })}
              className="rounded-full border border-bone bg-white px-4 py-[9px] text-[14px] font-semibold text-carbon cursor-pointer outline-none focus:border-brand-orange"
            >
              {SORTS.map(s => <option key={s.value || 'newest'} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-[14px] font-medium text-carbon cursor-pointer select-none">
            <input type="checkbox" id="browse-free" checked={state.free} onChange={e => update({ free: e.target.checked || undefined })} className="w-4 h-4 accent-brand-orange" />
            Free only
          </label>
          <p className="ms-auto text-[13.5px] text-slate tabular-nums" aria-live="polite">
            {loading ? 'Searching…' : total === 0 ? 'No results' : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} results`}
          </p>
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
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-8">
            {Array.from({ length: 8 }, (_, i) => <ResourceCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<SearchX size={28} className="text-slate" />}
            title={state.q ? `Nothing found for “${state.q}”` : 'No resources here yet'}
            description={chips.length ? 'Try removing a filter.' : emptyHint}
            action={chips.length ? { label: 'Clear filters', onClick: clearAll } : { label: 'Browse all resources', onClick: () => navigate('/') }}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-8">
            {products.map((p, i) => {
              const dv = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
              const vId = dv?._id ?? '';
              return (
                <ResourceCard
                  key={p._id}
                  index={i}
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
        extraActiveCount={(state.grade ? 1 : 0) + (state.free ? 1 : 0) + (state.board ? 1 : 0) + (state.age != null ? 1 : 0)}
      >
        <Section title="Sort by">
          {SORTS.map(s => (
            <RadioRow key={s.value || 'newest'} name="f-sort" label={s.label} checked={state.sort === s.value} onChange={() => update({ sort: s.value || undefined })} />
          ))}
        </Section>
        <Section title="Exam board" hint="Resources that follow your child's syllabus">
          <RadioRow name="f-board" label="Any board" checked={!state.board} onChange={() => update({ board: undefined })} />
          {CURRICULA.map(c => (
            <RadioRow key={c.value} name="f-board" label={c.label} checked={state.board === c.value} onChange={() => update({ board: c.value })} />
          ))}
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

/** `/search?q=…` */
export function SearchResultsPage() {
  const { state } = useBrowseState();
  usePageTitle(state.q ? `“${state.q}” — Search` : 'Search');
  return (
    <BrowseResults
      title={state.q ? `Results for “${state.q}”` : 'All resources'}
      eyebrow={state.q ? 'Search' : undefined}
      breadcrumb={[{ label: 'Home', path: '/' }, { label: state.q ? `Search: ${state.q}` : 'All resources' }]}
      showCategoryFilter
      emptyHint="Check the spelling, or try a broader word like “maths” or “Quran”."
    />
  );
}

/** `/c/:slug` — a main category or a subcategory. */
export function CategoryPage() {
  const { slug = '' } = useParams();
  const { bySlug, byId, loading } = useCategoryTree();
  const entry = bySlug.get(slug.toLowerCase()) ?? byId.get(slug) ?? null;
  usePageTitle(entry?.node.name ?? 'Category');

  const crumbs = useMemo(() => {
    if (!entry) return [{ label: 'Home', path: '/' }];
    return [
      { label: 'Home', path: '/' },
      ...(entry.parent ? [{ label: entry.parent.name, path: categoryPath(entry.parent) }] : []),
      { label: entry.node.name },
    ];
  }, [entry]);

  if (!loading && !entry) return <Navigate to={`/search?q=${encodeURIComponent(slug.replace(/-/g, ' '))}`} replace />;
  if (!entry) {
    return (
      <div className="bg-white min-h-full">
        <div className="sticky top-0 z-50"><BuyerNavbar /></div>
        <main className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-6 pb-12">
          <div className="h-8 w-64 bg-bone rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
            {Array.from({ length: 8 }, (_, i) => <ResourceCardSkeleton key={i} />)}
          </div>
        </main>
      </div>
    );
  }

  // A main category lists its subcategories; a subcategory lists its siblings.
  const subs = entry.parent ? entry.parent.children ?? [] : entry.node.children ?? [];
  return (
    <BrowseResults
      key={entry.node._id}
      title={entry.node.name}
      eyebrow={entry.parent?.name ?? 'Category'}
      intro={entry.node.description}
      breadcrumb={crumbs}
      categoryId={entry.node._id}
      subcategories={subs.filter(s => s._id !== entry.node._id)}
      showCategoryFilter={false}
      emptyHint="Sellers haven't listed anything in this category yet."
    />
  );
}
