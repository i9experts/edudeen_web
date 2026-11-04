import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { Package, Heart, ShoppingCart, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/comman/ui/Button';
import { FilterDropdown, SkeletonBox } from '@/components/comman/ui';
import {
  apiGetPublicStoreProducts, apiGetPublicStoreFilters, apiGetStoreCatalogFacets,
  type PublicStoreProduct, type PublicStoreProductsParams, type StoreCatalogFacets,
} from '@/api/services/store';
import { filtersFromParams, filtersToParams, anyFilterActive, type CatalogFilters } from '../catalogFilters';
import { StoreCatalogFilterBar } from './StoreCatalogFilterBar';
import { StoreCollectionTabs } from './StoreCollectionTabs';
import { useCartContext } from '@/contexts/CartContext';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { formatPrice } from '@/utils/formatPrice';
import { useStorefront, useStorefrontPaths } from '../StorefrontContext';
import { ProductCardShell, ProductCardImage } from '../ProductCard';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { RatingLine } from '@/components/comman/marketplace/ResourceCard';
import { classRangeLabel } from '@/constants/classLevels';
import { storeCardPrice } from '../storeCardPrice';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest'          },
  { value: 'price_asc',  label: 'Price: Low–High' },
  { value: 'price_desc', label: 'Price: High–Low' },
  { value: 'best_rated', label: 'Best Rated'      },
];

const KIND_OPTIONS: { value: 'all' | NonNullable<PublicStoreProductsParams['kind']>; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'digital',   label: 'Digital' },
  { value: 'physical',  label: 'Physical' },
  { value: 'course',    label: 'Online courses' },
];

// No photo (or a broken one) → the same designed name cover the homepage
// cards use, instead of a bare box icon.
function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) return <ProductCoverFallback name={alt} size="lg" className="w-full h-full" />;
  return (
    <img loading="lazy" decoding="async" src={src} alt={alt} onError={() => setErrored(true)}
      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]" />
  );
}

export interface ProductCatalogSectionSettings {
  heading?:      string;
  defaultSort?:  'newest' | 'price_asc' | 'price_desc' | 'best_rated';
  columns?:      2 | 3 | 4;
  showFilters?:  boolean;
  /** At most one of these two — a catalog scoped to both at once isn't a
   *  meaningful combination this builder supports (see the validator). */
  categoryId?:   string;
  collectionId?: string;
  /** Not seller-configurable in the builder — set only by `SearchResultsPage`
   *  for the navbar search box's results, reusing this section's existing
   *  grid/sort/pagination instead of a second implementation. */
  search?: string;
}

// The seller's full product catalog — tag filter + sort + paginated grid.
// Extracted from the old fixed `SellerStorefront` grid so it can be composed
// as one section among others (hero, testimonials, etc.) instead of always
// being hardcoded on the page.
export function ProductCatalogSection({ settings }: { settings: ProductCatalogSectionSettings }) {
  const { store, cfg } = useStorefront();
  const { toMain } = useStorefrontPaths();
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const { addToCart, adding } = useCartContext();
  const { isWishlisted, wishlisting, toggleWishlist } = useWishlistContext();

  const [products, setProducts] = useState<PublicStoreProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const defSort = settings.defaultSort ?? 'newest';
  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [facets, setFacets] = useState<StoreCatalogFacets | null>(null);
  const [facetsLoading, setFacetsLoading] = useState(false);
  const [facetsError, setFacetsError] = useState(false);
  const reqId = useRef(0);

  // The shop page keeps its filters in the URL (Back / refresh / shared link). Sections scoped by the builder or by the
  // search page (category, collection, ?q= results) keep their own local state and ignore the URL.
  const urlMode = !settings.search && !settings.categoryId && !settings.collectionId;
  const [params, setParams] = useSearchParams();
  const [local, setLocal] = useState<CatalogFilters>(() => filtersFromParams(new URLSearchParams(), defSort));
  const filters = urlMode ? filtersFromParams(params, defSort) : local;
  const { page, sort: sortBy, kind } = filters;

  const setFilters = useCallback((patch: Partial<CatalogFilters>) => {
    const next = { ...filters, ...patch, page: patch.page ?? 1 };
    if (!urlMode) { setLocal(next); return; }
    const nextParams = filtersToParams(params, next, defSort);
    if (nextParams.toString() === params.toString()) return;
    setParams(nextParams, { replace: false });
  }, [filters, urlMode, params, setParams, defSort]);

  // Reset local paging when a scoped section is re-pointed at a different category/collection/search.
  useEffect(() => { if (!urlMode) setLocal(f => ({ ...f, page: 1 })); }, [urlMode, settings.categoryId, settings.collectionId, settings.search]);

  useEffect(() => {
    apiGetPublicStoreFilters(store.storeId).then(r => setTags(r.data.tags ?? [])).catch(() => {});
  }, [store.storeId]);

  const loadFacets = useCallback(() => {
    if (!urlMode) return;
    setFacetsLoading(true);
    setFacetsError(false);
    apiGetStoreCatalogFacets(store.storeId)
      .then(r => setFacets(r.data ?? null))
      .catch(() => setFacetsError(true))
      .finally(() => setFacetsLoading(false));
  }, [store.storeId, urlMode]);
  useEffect(() => { loadFacets(); }, [loadFacets]);

  // A collection id in the URL that is hidden/empty/gone is ignored (shows everything) instead of an empty page.
  const collectionTabs = facets?.collections ?? [];
  const collection = filters.collection && (!facets || collectionTabs.some(c => c.id === filters.collection)) ? filters.collection : '';

  const load = useCallback(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(false);
    apiGetPublicStoreProducts(store.storeId, {
      page, limit: 12, sort: sortBy, tag: activeTag !== 'all' ? activeTag : undefined,
      kind: kind !== 'all' ? kind : undefined,
      ...(urlMode && collection ? { collectionId: collection } : {}),
      categoryId: settings.categoryId, collectionId: settings.collectionId, search: settings.search,
      ...(urlMode ? {
        q: filters.q.trim() || undefined, class: filters.cls || undefined, subject: filters.subject || undefined,
        min: filters.min ?? undefined, max: filters.max ?? undefined,
      } : {}),
    })
      .then(res => {
        if (id !== reqId.current) return;
        setProducts(res.data?.products ?? []);
        setTotal(res.data?.pagination?.total ?? 0);
        setTotalPages(res.data?.pagination?.totalPages ?? 1);
      })
      .catch(() => { if (id === reqId.current) setError(true); })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [store.storeId, page, sortBy, activeTag, kind, urlMode, collection, filters.q, filters.cls, filters.subject, filters.min, filters.max,
    settings.categoryId, settings.collectionId, settings.search]);

  useEffect(() => { load(); }, [load]);

  const clearAll = () => { setActiveTag('all'); setFilters({ q: '', cls: '', subject: '', collection: '', min: null, max: null, kind: 'all' }); };
  const filtered = anyFilterActive(filters) || activeTag !== 'all' || !!collection;
  const kindOptions = KIND_OPTIONS.filter(o => o.value === 'all' || !facets || facets.kinds[o.value] > 0 || kind === o.value);

  const colClass = { 2: 'grid-cols-2', 3: 'grid-cols-2 md:grid-cols-3', 4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' }[settings.columns ?? 3];
  const gapClass = cfg.productGridDensity === 'relaxed' ? 'gap-4 sm:gap-5 lg:gap-6' : 'gap-[10px] sm:gap-3 lg:gap-[14px]';

  return (
    <div className="px-4 sm:px-6 lg:px-10" style={{ paddingTop: 24 * cfg.sectionSpacingScale, paddingBottom: 24 * cfg.sectionSpacingScale }}>
      {settings.heading && <h2 className="font-bold mb-4" style={{ color: cfg.textColor, fontSize: Math.round(20 * cfg.typeScaleFactor) }}>{settings.heading}</h2>}

      {urlMode && settings.showFilters !== false && (
        <StoreCatalogFilterBar filters={filters} facets={facets} onChange={setFilters} />
      )}

      {settings.showFilters !== false && !settings.search && (
        <div role="group" aria-label="Product type" className="flex items-center gap-2 overflow-x-auto scrollbar-none mb-3">
          {kindOptions.map(o => {
            const active = kind === o.value;
            return (
              <button key={o.value} type="button" aria-pressed={active}
                onClick={() => setFilters({ kind: o.value })}
                className="shrink-0 px-3 py-[6px] rounded-full text-[13px] font-semibold border cursor-pointer whitespace-nowrap transition-colors"
                style={active ? { background: cfg.primaryColor, color: '#fff', borderColor: cfg.primaryColor } : { background: 'transparent', color: cfg.textColor, borderColor: '#D9D7CF' }}>
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      {urlMode && settings.showFilters !== false && (facetsLoading || facetsError || collectionTabs.length > 0) && (
        <StoreCollectionTabs collections={collectionTabs} total={facets?.total ?? 0} activeId={collection}
          onSelect={id => { setActiveTag('all'); setFilters({ collection: id }); }}
          loading={facetsLoading && !facets} error={facetsError && !facets} onRetry={loadFacets}
          primaryColor={cfg.primaryColor} textColor={cfg.textColor} />
      )}

      {settings.showFilters !== false && tags.length > 0 && !(urlMode && collectionTabs.length > 0) && !(urlMode && facetsLoading && !facets) && (
        <div className="flex items-center gap-5 overflow-x-auto scrollbar-none mb-3 border-b border-bone">
          {['all', ...tags].map(tag => {
            const active = activeTag === tag;
            return (
              <button key={tag} onClick={() => { setActiveTag(tag); setFilters({}); }}
                className="relative shrink-0 py-[10px] text-[13px] font-semibold bg-transparent border-none cursor-pointer whitespace-nowrap"
                style={{ color: active ? cfg.primaryColor : '#8C8A82' }}>
                {tag === 'all' ? 'All Products' : tag}
                <span className="absolute start-0 end-0 -bottom-[1px] h-[2px] rounded-full origin-left transition-transform duration-200"
                  style={{ background: cfg.primaryColor, transform: active ? 'scaleX(1)' : 'scaleX(0)' }} />
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px]" style={{ color: cfg.textColor + '99' }}>{total} Products</span>
        <FilterDropdown options={SORT_OPTIONS} value={sortBy} onChange={v => setFilters({ sort: v as typeof sortBy })} />
      </div>

      {loading ? (
        <div className={clsx('grid', gapClass, colClass)}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonBox key={i} height={170} rounded="10px" />)}
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center py-16 gap-3">
          <Package size={36} className="text-bone" />
          <p className="text-[14px] text-slate">Could not load products.</p>
          <Button variant="secondary" size="sm" onClick={load}>Retry</Button>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <Package size={36} className="text-bone" />
          <p className="text-[14px] text-slate">{filtered ? 'No results' : 'No products yet'}</p>
          {filtered && <p className="text-[13px] text-slate">Try a different word or clear the filters.</p>}
          {filtered && <Button variant="secondary" size="sm" onClick={clearAll}>Clear filters</Button>}
        </div>
      ) : (
        <>
          <div className={clsx('grid gap-[10px] sm:gap-3 lg:gap-[14px]', colClass)}>
            {products.map(p => {
              const pType = p.productType ?? p.type ?? 'physical';
              const isPhysical = pType === 'physical';
              const typeLabel = isPhysical ? 'Physical' : 'Digital';
              const vId = p.variantId ?? '';
              const pr = storeCardPrice(p, store.baseCurrency);
              if (!pr.valid) return null;
              const classLabel = classRangeLabel(p.classFrom, p.classTo);
              return (
                <ProductCardShell key={p._id} onClick={() => toMain(`/product/${p.slug}`)} className="flex flex-col h-full">
                  <div className="absolute top-0 start-0 w-full h-[3px] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 z-[1]" style={{ background: cfg.primaryColor }} />
                  <ProductCardImage>
                    {p.images?.[0] ? <ProductImage src={p.images[0]} alt={p.name} /> : <ProductCoverFallback name={p.name} size="lg" className="w-full h-full" />}
                    <button
                      onClick={e => { e.stopPropagation(); if (vId) toggleWishlist(p._id, vId); }}
                      disabled={!vId || wishlisting === vId}
                      aria-label="Save to wishlist"
                      className={clsx('absolute bottom-[6px] end-[6px] w-6 h-6 rounded-full bg-[rgba(255,255,255,0.92)] flex items-center justify-center border-none transition-transform duration-150', vId ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-50')}
                    >
                      <Heart size={11} className={clsx(isWishlisted(p._id, vId) ? 'text-[#e11d48] fill-[#e11d48]' : 'text-slate fill-none')} />
                    </button>
                    <div className="absolute top-[6px] start-[6px]">
                      <span className={clsx('px-[5px] py-[2px] rounded-[4px] text-[12px] font-semibold border leading-none', isPhysical ? 'bg-[#edf5e7] text-[#3b6720] border-[#c7e0b5]' : 'bg-accent-violet-bg text-accent-violet border-accent-violet/25')}>
                        {typeLabel}
                      </span>
                    </div>
                    {!p.activeCampaign && pr.pct > 0 && (
                      <div className="absolute top-[6px] end-[6px]">
                        <span className="px-[5px] py-[2px] rounded-[4px] text-[12px] font-bold leading-none bg-error text-white">-{pr.pct}%</span>
                      </div>
                    )}
                    {p.activeCampaign && (
                      <div className="absolute top-[6px] end-[6px]">
                        <span className="flex items-center gap-[3px] px-[5px] py-[2px] rounded-[4px] text-[12px] font-bold leading-none bg-gradient-to-r from-brand-orange to-[#66AD36] text-white">
                          <Zap size={8} className="fill-white shrink-0" />
                          {p.activeCampaign.discountType && p.activeCampaign.discountValue != null
                            ? (p.activeCampaign.discountType === 'percentage' ? `${p.activeCampaign.discountValue}% OFF` : `${formatPrice(convert(p.activeCampaign.discountValue, p.activeCampaign.currency ?? 'USD'), displayCurrency)} OFF`)
                            : 'FEATURED'}
                        </span>
                      </div>
                    )}
                  </ProductCardImage>
                  <div className="flex-1 flex flex-col px-2 pt-2 pb-2 sm:px-3 sm:pt-[10px] sm:pb-3 min-w-0">
                    {/* Title always reserves 2 lines so cards in a row line up; rating and class lines only take room when present. */}
                    <p className="font-bold text-[12px] sm:text-[13px] mb-[3px] leading-[1.4] line-clamp-2 min-h-[2.8em] break-words" style={{ color: cfg.textColor }}>{p.name}</p>
                    {classLabel && <p className="text-[12px] text-slate truncate mb-[2px]">{classLabel}</p>}
                    <RatingLine rating={p.averageRating} count={p.totalRatings} className="mb-[2px]" />
                    {p.subscriberPrice != null && (
                      <p className="text-[12px] sm:text-[12px] font-semibold mt-1" style={{ color: cfg.primaryColor }}>Members save {p.discountPercent}%</p>
                    )}
                    <div className="flex items-end justify-between gap-1 mt-auto pt-[6px] sm:pt-[10px]">
                      <span className="flex items-baseline flex-wrap gap-x-[6px] min-w-0">
                        <span className="font-bold text-[12px] sm:text-[15px]" style={{ color: p.subscriberPrice != null ? cfg.primaryColor : pr.was ? '#c0392b' : cfg.textColor }}>
                          {(() => {
                            if (p.subscriberPrice != null) return formatPrice(convert(p.subscriberPrice, store.baseCurrency), displayCurrency);
                            if (pr.price > 0) return formatPrice(convert(pr.price, pr.currency), displayCurrency);
                            return p.variants?.length || p.defaultVariantPrice === 0 ? 'Free' : '—';
                          })()}
                        </span>
                        {p.subscriberPrice != null && p.defaultVariantPrice != null ? (
                          <span className="text-[12px] sm:text-[12px] line-through opacity-60" style={{ color: cfg.textColor }}>
                            {formatPrice(convert(p.defaultVariantPrice, store.baseCurrency), displayCurrency)}
                          </span>
                        ) : pr.was != null && pr.price > 0 && (
                          <s className="text-[12px] text-slate" aria-label={`Was ${formatPrice(convert(pr.was, pr.currency), displayCurrency)}`}>
                            {formatPrice(convert(pr.was, pr.currency), displayCurrency)}
                          </s>
                        )}
                      </span>
                      <Button variant="secondary" size="sm" className="inline-flex" disabled={!vId || adding === vId} title={!vId ? 'Currently unavailable' : undefined}
                        onClick={e => { e.stopPropagation(); if (vId) addToCart(p._id, vId, isPhysical ? 'physical' : 'digital'); }}>
                        {adding === vId ? <Loader2 size={11} className="animate-spin" /> : <ShoppingCart size={11} />}
                        <span className="hidden lg:inline">{!vId ? 'Unavailable' : adding === vId ? 'Adding…' : 'Add to Cart'}</span>
                      </Button>
                    </div>
                  </div>
                </ProductCardShell>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setFilters({ page: page - 1 })}>Previous</Button>
              <span className="text-[13px] text-slate self-center">Page {page} of {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setFilters({ page: page + 1 })}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
