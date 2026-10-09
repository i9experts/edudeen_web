import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Package, Heart, ShoppingCart, Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/comman/ui/Button';
import { FilterDropdown, SkeletonBox } from '@/components/comman/ui';
import {
  apiGetPublicStoreProducts, apiGetPublicStoreFilters,
  type PublicStoreProduct, type PublicStoreProductsParams,
} from '@/api/services/store';
import { useCartContext } from '@/contexts/CartContext';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { currencySymbol } from '@/utils/currency';
import { useStorefront, useStorefrontPaths } from '../StorefrontContext';
import { ProductCardShell, ProductCardImage } from '../ProductCard';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest'          },
  { value: 'price_asc',  label: 'Price: Low–High' },
  { value: 'price_desc', label: 'Price: High–Low' },
  { value: 'best_rated', label: 'Best Rated'      },
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

function StarRating({ rating, color }: { rating: number; color: string }) {
  return (
    <div className="flex items-center gap-[3px]">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill={i <= Math.round(rating) ? color : '#C8C6BE'}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
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
  const displaySymbol = currencySymbol(displayCurrency);
  const { addToCart, adding } = useCartContext();
  const { isWishlisted, wishlisting, toggleWishlist } = useWishlistContext();

  const [products, setProducts] = useState<PublicStoreProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<NonNullable<PublicStoreProductsParams['sort']>>(settings.defaultSort ?? 'newest');
  const [tags, setTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetPublicStoreFilters(store.storeId).then(r => setTags(r.data.tags ?? [])).catch(() => {});
  }, [store.storeId]);

  const load = useCallback(() => {
    setLoading(true);
    apiGetPublicStoreProducts(store.storeId, {
      page, limit: 12, sort: sortBy, tag: activeTag !== 'all' ? activeTag : undefined,
      categoryId: settings.categoryId, collectionId: settings.collectionId, search: settings.search,
    })
      .then(res => {
        setProducts(res.data?.products ?? []);
        setTotal(res.data?.pagination?.total ?? 0);
        setTotalPages(res.data?.pagination?.totalPages ?? 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [store.storeId, page, sortBy, activeTag, settings.categoryId, settings.collectionId, settings.search]);

  useEffect(() => { load(); }, [load]);

  // Changing the filter itself (not just paging within it) should always
  // jump back to page 1 — otherwise a search-results page kept mounted
  // across two different queries (same route, new `?q=`) could silently
  // request a now-out-of-range page.
  useEffect(() => { setPage(1); }, [settings.categoryId, settings.collectionId, settings.search]);

  const colClass = { 2: 'grid-cols-2', 3: 'grid-cols-2 md:grid-cols-3', 4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' }[settings.columns ?? 3];
  const gapClass = cfg.productGridDensity === 'relaxed' ? 'gap-4 sm:gap-5 lg:gap-6' : 'gap-[10px] sm:gap-3 lg:gap-[14px]';

  return (
    <div className="px-4 sm:px-6 lg:px-10" style={{ paddingTop: 24 * cfg.sectionSpacingScale, paddingBottom: 24 * cfg.sectionSpacingScale }}>
      {settings.heading && <h2 className="font-bold mb-4" style={{ color: cfg.textColor, fontSize: Math.round(20 * cfg.typeScaleFactor) }}>{settings.heading}</h2>}

      {settings.showFilters !== false && tags.length > 0 && (
        <div className="flex items-center gap-5 overflow-x-auto scrollbar-none mb-3 border-b border-bone">
          {['all', ...tags].map(tag => {
            const active = activeTag === tag;
            return (
              <button key={tag} onClick={() => { setActiveTag(tag); setPage(1); }}
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
        <FilterDropdown options={SORT_OPTIONS} value={sortBy} onChange={v => { setSortBy(v as typeof sortBy); setPage(1); }} />
      </div>

      {loading ? (
        <div className={clsx('grid', gapClass, colClass)}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonBox key={i} height={170} rounded="10px" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <Package size={36} className="text-bone" />
          <p className="text-[14px] text-slate">No products yet</p>
        </div>
      ) : (
        <>
          <div className={clsx('grid gap-[10px] sm:gap-3 lg:gap-[14px]', colClass)}>
            {products.map(p => {
              const pType = p.productType ?? p.type ?? 'physical';
              const isPhysical = pType === 'physical';
              const typeLabel = isPhysical ? 'Physical' : pType === 'educational' ? 'Educational' : 'Digital';
              const vId = p.variantId ?? '';
              return (
                <ProductCardShell key={p._id} onClick={() => toMain(`/product/${p.slug}`)}>
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
                    {p.activeCampaign && (
                      <div className="absolute top-[6px] end-[6px]">
                        <span className="flex items-center gap-[3px] px-[5px] py-[2px] rounded-[4px] text-[12px] font-bold leading-none bg-gradient-to-r from-brand-orange to-[#66AD36] text-white">
                          <Zap size={8} className="fill-white shrink-0" />
                          {p.activeCampaign.discountType && p.activeCampaign.discountValue != null
                            ? (p.activeCampaign.discountType === 'percentage' ? `${p.activeCampaign.discountValue}% OFF` : `${displaySymbol}${convert(p.activeCampaign.discountValue, p.activeCampaign.currency ?? 'USD')} OFF`)
                            : 'FEATURED'}
                        </span>
                      </div>
                    )}
                  </ProductCardImage>
                  <div className="px-2 pt-2 pb-2 sm:px-3 sm:pt-[10px] sm:pb-3">
                    <p className="font-bold text-[12px] sm:text-[13px] mb-[3px] leading-[1.4] line-clamp-2" style={{ color: cfg.textColor }}>{p.name}</p>
                    {(p.averageRating ?? 0) > 0 && <StarRating rating={p.averageRating!} color={cfg.primaryColor} />}
                    {p.subscriberPrice != null && (
                      <p className="text-[12px] sm:text-[12px] font-semibold mt-1" style={{ color: cfg.primaryColor }}>Members save {p.discountPercent}%</p>
                    )}
                    <div className="flex items-center justify-between gap-1 mt-[6px] sm:mt-[10px]">
                      <span className="flex items-baseline gap-[6px] shrink-0">
                        <span className="font-bold text-[12px] sm:text-[15px]" style={{ color: p.subscriberPrice != null ? cfg.primaryColor : cfg.textColor }}>
                          {(() => {
                            const shown = p.subscriberPrice ?? p.defaultVariantPrice;
                            return shown != null ? `${displaySymbol}${convert(shown, store.baseCurrency).toLocaleString()}` : '—';
                          })()}
                        </span>
                        {p.subscriberPrice != null && p.defaultVariantPrice != null && (
                          <span className="text-[12px] sm:text-[12px] line-through opacity-60" style={{ color: cfg.textColor }}>
                            {displaySymbol}{convert(p.defaultVariantPrice, store.baseCurrency).toLocaleString()}
                          </span>
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
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-[13px] text-slate self-center">Page {page} of {totalPages}</span>
              <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
