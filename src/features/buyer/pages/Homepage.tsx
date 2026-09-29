import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getStorefrontUrl } from '@/utils/storefrontUrl';
import { useProductsByCategory } from '@/hooks/marketplace/useProductsByCategory';
import { useCountdownToMidnight } from '@/hooks/useCountdownToMidnight';
import { useCartContext } from '@/contexts/CartContext';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { Avatar } from '@/components/comman/ui/Avatar';
import {
  BuyerNavbar, Footer, SkeletonBox, ClosingCtaBanner, StoreFeatureCard, TrustServiceStrip,
} from '@/components/comman/ui';
import { ResourceCard, ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import { FlashSaleCard } from '@/components/comman/marketplace/FlashSaleCard';
import { MegaMenuBar } from '@/components/comman/marketplace/MegaMenuBar';
import { CategoryTabs } from '@/components/comman/marketplace/CategoryTabs';
import { SectionHead, sectionLinkClass } from '@/components/comman/marketplace/SectionHead';
import { Star, Quote, BadgeCheck, Zap, Tag, Shield, CreditCard, Headset, RefreshCcw } from 'lucide-react';
import { apiGetTestimonials, type Testimonial } from '@/api/services/testimonials';
import { apiGetPlatformStats, apiGetTopStores, type PlatformStats, type PublicStoreListItem } from '@/api/services/store';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { EDUCATION_LEVELS } from '@/api/services/product';
import type { MarketplaceProduct, MarketplaceSortBy } from '@/api/services/marketplace';
import { RevealStagger } from '@/components/comman/motion/Reveal';
import { AnimatedCounter } from '@/components/comman/motion/AnimatedCounter';
import heroImage from '@/assets/learning-hero.jpg';

// Same tree-search helper Marketplace.tsx uses to resolve a mega-menu/grid
// category click's id into its canonical slug for the `/marketplace/:slug` link.
function findCategoryById(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const n of nodes) {
    if (n._id === id) return n;
    const found = findCategoryById(n.children ?? [], id);
    if (found) return found;
  }
  return null;
}

const compactNumber   = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactCurrency = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'USD' });

const TRUST_ITEMS = [
  { Icon: Shield,     label: 'Buyer Protection', sub: 'Secure checkout, every order' },
  { Icon: CreditCard, label: 'Flexible Payment', sub: 'Cards, COD & bank transfer' },
  { Icon: RefreshCcw, label: 'Easy Returns',     sub: 'Hassle-free return window' },
  { Icon: Headset,    label: '24/7 Support',     sub: "We're here whenever you need us" },
];

type TypeFilter = '' | 'physical' | 'digital' | 'educational';
type SortFilter = 'featured' | 'popular' | 'low' | 'high';

const SORT_TO_API: Record<SortFilter, MarketplaceSortBy | undefined> = {
  featured: undefined,
  popular:  'popularity',
  low:      'price_asc',
  high:     'price_desc',
};

const PAGE_SIZE = 12;

const selectClass =
  'py-[10px] pl-3 pr-8 border border-bone rounded-[7px] bg-white text-carbon text-[14px] cursor-pointer max-w-[48%] sm:max-w-none';

const linkButtonClass = sectionLinkClass;

/**
 * Root landing page — a calm, resource-first shop front: hero, promise strip,
 * the live catalogue with its own filters, and every discovery rail
 * (categories, flash sale, top picks, best rated, featured sellers), trust,
 * platform stats and real reviews. Every product, store, count and review is
 * real API data; each section self-hides until it has something to show.
 */
export function Homepage() {
  const navigate = useNavigate();
  usePageTitle('Home');

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [topStores, setTopStores] = useState<PublicStoreListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiGetCategoryTree().then(res => { if (!cancelled) setCategories(res.data ?? []); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGetTopStores(10).then(res => { if (!cancelled) setTopStores(res.data?.stores ?? []); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleShopCategory = useCallback((id: string) => {
    const match = id ? findCategoryById(categories, id) : null;
    navigate(match ? `/marketplace/${match.slug}` : '/marketplace');
  }, [categories, navigate]);

  const submitSearch = (term: string) => {
    const q = term.trim();
    navigate(q ? `/marketplace?search=${encodeURIComponent(q)}` : '/marketplace');
  };

  // ── Discovery rails: one unfiltered catalogue pool, same source the
  //    Marketplace page's own rails use ──
  const { products: featuredPool, loading: poolLoading } = useProductsByCategory(1, 24);

  const flashDeals = featuredPool
    .map(p => {
      const dv = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
      const price = dv?.price ?? 0;
      const compareAt = dv?.compareAtPrice ?? null;
      const pct = compareAt != null && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;
      return { product: p, pct };
    })
    .filter(x => x.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);

  const topPicks = [...featuredPool]
    .sort((a, b) => (b.purchaseCount + b.averageRating * 10) - (a.purchaseCount + a.averageRating * 10))
    .slice(0, 10);

  const bestRated = [...featuredPool]
    .filter(p => p.averageRating > 0)
    .sort((a, b) => b.averageRating - a.averageRating || (b.totalRatings ?? 0) - (a.totalRatings ?? 0))
    .slice(0, 10);

  const countdown = useCountdownToMidnight();

  // ── Catalogue section filters ──
  const [category, setCategory] = useState<CategoryNode | null>(null);
  const [level, setLevel]       = useState('');
  const [kind, setKind]         = useState<TypeFilter>('');
  const [sort, setSort]         = useState<SortFilter>('featured');
  const [freeOnly, setFreeOnly] = useState(false);
  const [limit, setLimit]       = useState(PAGE_SIZE);

  useEffect(() => { setLimit(PAGE_SIZE); }, [category, level, kind, sort, freeOnly]);

  const { products, total, loading } = useProductsByCategory(
    1, limit, category?._id,
    level ? 'educational' : (kind || undefined),
    level || undefined, undefined, undefined,
    undefined, freeOnly ? 0 : undefined, undefined,
    SORT_TO_API[sort],
  );

  const resetFilters = () => {
    setCategory(null); setLevel(''); setKind(''); setSort('featured'); setFreeOnly(false);
  };
  const hasFilters = !!(category || level || kind || freeOnly || sort !== 'featured');

  const resourcesRef = useRef<HTMLElement>(null);
  const scrollToResources = () => resourcesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const selectCategory = (c: CategoryNode | null) => {
    setCategory(c);
    setTimeout(scrollToResources, 30);
  };

  // ── Cart + wishlist wiring (flash-sale cards add straight to cart) ──
  const { addToCart, adding, error: cartError, clearError: clearCartError } = useCartContext();
  const [addToCartFailedId, setAddToCartFailedId] = useState<string | null>(null);
  const lastAddAttemptRef = useRef<string | null>(null);
  useEffect(() => {
    if (!cartError || !lastAddAttemptRef.current) return;
    const failedId = lastAddAttemptRef.current;
    setAddToCartFailedId(failedId);
    const t = setTimeout(() => { setAddToCartFailedId(id => id === failedId ? null : id); clearCartError(); }, 2600);
    return () => clearTimeout(t);
  }, [cartError, clearCartError]);
  const { isWishlisted, wishlisting, toggleWishlist } = useWishlistContext();

  const handleCardClick = useCallback((slug: string) => navigate(`/product/${slug}`), [navigate]);
  const handleAddToCart = useCallback((e: React.MouseEvent, id: string, variantId: string, type: 'physical' | 'digital') => {
    e.stopPropagation();
    if (!variantId) return;
    lastAddAttemptRef.current = variantId;
    setAddToCartFailedId(prev => prev === variantId ? null : prev);
    addToCart(id, variantId, type);
  }, [addToCart]);
  const handleToggleWishlist = useCallback((e: React.MouseEvent, id: string, variantId: string) => {
    e.stopPropagation();
    if (variantId) toggleWishlist(id, variantId);
  }, [toggleWishlist]);

  const renderResourceCard = (p: MarketplaceProduct, i: number) => {
    const dv = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
    const vId = dv?._id ?? '';
    return (
      <ResourceCard
        key={p._id}
        index={i}
        product={p}
        onClick={handleCardClick}
        isWishlisted={isWishlisted(p._id, vId)}
        isWishlisting={wishlisting === vId}
        onToggleWishlist={handleToggleWishlist}
      />
    );
  };

  // ── Platform stats + reviews (non-critical, self-hiding) ──
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiGetTestimonials(5)
      .then(res => { if (!cancelled) setTestimonials(res.data ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTestimonialsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiGetPlatformStats()
      .then(res => { if (!cancelled) setStats(res.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const statItems = stats ? [
    { value: stats.sellersCount, format: (n: number) => `${compactNumber.format(n)}+`, label: 'Active Sellers' },
    { value: stats.gmv,          format: (n: number) => `${compactCurrency.format(n)}+`, label: 'GMV Processed' },
    { value: stats.buyersCount,  format: (n: number) => `${compactNumber.format(n)}+`,  label: 'Registered Buyers' },
    { value: stats.ratingCount > 0 ? stats.avgRating : null, format: (n: number) => `${n.toFixed(1)} ★`, label: 'Average Rating' },
  ] : [];

  const tarbiyyah = categories.find(c => /tarbiy|islam/i.test(c.name));

  return (
    <div className="bg-white min-h-full">

      {/* ── Header — the same navbar + mega-menu every shopping page uses ── */}
      <div className="sticky top-0 z-50 [&>nav]:!border-b-0">
        <BuyerNavbar />
        <MegaMenuBar
          compact
          categories={categories}
          topPicks={topPicks}
          bestRated={bestRated}
          flashDeals={flashDeals}
          topStores={topStores}
          countdown={countdown}
          onShopCategory={handleShopCategory}
          onProductClick={handleCardClick}
          onStoreClick={slug => window.location.href = getStorefrontUrl(slug)}
          onTrendingTerm={submitSearch}
          onNavigate={navigate}
        />
      </div>

      <main className="max-w-[1480px] mx-auto px-[5%] md:px-[4%] pt-5 md:pt-[30px] pb-10 md:pb-[65px]">

        {/* ── Hero ── */}
        <section className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] md:min-h-[280px] rounded-[18px] overflow-hidden bg-[#eaf2f8] mb-[25px]">
          <div className="p-[25px] md:p-[30px] lg:py-[35px] lg:px-[40px]">
            <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-[13px]">
              For curious minds &amp; caring hearts
            </p>
            <h1 className="font-serif font-normal text-[34px] md:text-[44px] leading-[1.12] tracking-[-1px] text-carbon mb-[14px]">
              Big discoveries.<br />
              <span className="text-brand-royal">Beautiful beginnings.</span>
            </h1>
            <p className="max-w-[450px] text-[15px] md:text-[16px] leading-[1.5] text-graphite mb-[21px]">
              Physical products, digital downloads and educational resources from sellers you can trust — for the lessons you teach and the values you nurture.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={scrollToResources}
                className="inline-block bg-brand-orange text-white border border-brand-orange rounded-lg px-5 py-[11px] text-[14px] font-bold cursor-pointer hover:brightness-95"
              >
                Find your next resource
              </button>
              <button
                onClick={() => navigate('/marketplace')}
                className="inline-block bg-white text-brand-orange border border-[#c5d2db] rounded-lg px-5 py-[11px] text-[14px] font-bold cursor-pointer hover:brightness-95"
              >
                Browse the marketplace
              </button>
            </div>
          </div>
          <div className="relative h-[170px] md:h-auto bg-[#ddeaf2] overflow-hidden">
            <img
              src={heroImage}
              alt="Learning workbooks and colourful stationery arranged on a desk"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute bottom-[22px] right-[22px] hidden sm:block bg-white px-[19px] py-3 rounded-[10px] text-[14px] text-carbon shadow-[0_8px_30px_rgba(19,57,86,0.09)]">
              A little learning. A lasting difference.
            </div>
          </div>
        </section>

        {/* ── Promise strip ── */}
        <div className="flex flex-wrap justify-between md:justify-center gap-x-[15px] gap-y-2 md:gap-x-10 pt-2 pb-[27px] text-[12px] md:text-[14px] text-carbon border-b border-bone mb-[30px]">
          {['For home & classroom', 'Preview before you choose', 'Created by educators', 'Verified sellers'].map(t => (
            <span key={t}><span className="text-brand-green">✓</span> {t}</span>
          ))}
        </div>

        {/* ── Shop by category ── */}
        {categories.length > 0 && (
          <section className="mb-12">
            <SectionHead
              eyebrow="Explore"
              title="Shop by category"
              action={{ label: 'View all', onClick: () => navigate('/marketplace') }}
            />
            <RevealStagger className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4" step={0.04} y={12}>
              {categories.slice(0, 12).map(c => (
                <button
                  key={c._id}
                  onClick={() => handleShopCategory(c._id)}
                  className="group flex flex-col items-center gap-2.5 p-4 rounded-xl bg-[#f5f8fa] border border-bone hover:border-brand-orange/40 hover:bg-white transition-all cursor-pointer"
                >
                  <span className="w-12 h-12 rounded-full bg-white border border-bone flex items-center justify-center overflow-hidden shrink-0 group-hover:border-brand-orange transition-colors">
                    {c.image
                      ? <img src={c.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : <Tag size={18} className="text-brand-orange" />}
                  </span>
                  <span className="text-[12.5px] font-semibold text-carbon text-center leading-tight line-clamp-2">{c.name}</span>
                </button>
              ))}
            </RevealStagger>
          </section>
        )}

        {/* ── Flash sale ── */}
        {flashDeals.length > 0 && (
          <section className="mb-12">
            <SectionHead
              eyebrow="Limited-time savings"
              title="Flash Sale"
              icon={<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-error-bg text-error"><Zap size={14} className="fill-error" /></span>}
              action={
                <span className="shrink-0 flex items-center gap-[6px] text-[12px] sm:text-[13px] font-semibold text-slate">
                  <span className="hidden sm:inline">Ends in</span>
                  <span className="tabular-nums text-error font-bold">{countdown.h}:{countdown.m}:{countdown.s}</span>
                </span>
              }
            />
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
              {flashDeals.map(({ product: p }) => {
                const dv = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
                const vId = dv?._id ?? '';
                return (
                  <div key={p._id} className="w-[118px] sm:w-[132px] lg:w-[144px] shrink-0 snap-start">
                    <FlashSaleCard
                      compact
                      product={p}
                      onClick={handleCardClick}
                      isAdding={adding === vId}
                      addToCartFailed={addToCartFailedId === vId}
                      onAddToCart={handleAddToCart}
                      isWishlisted={isWishlisted(p._id, vId)}
                      isWishlisting={wishlisting === vId}
                      onToggleWishlist={handleToggleWishlist}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Catalogue with filters ── */}
        <section ref={resourcesRef} className="scroll-mt-[150px] mb-12">
          <SectionHead
            eyebrow={category ? category.name : 'Your next teaching moment'}
            title="Resources with a purpose"
            sub="Thoughtful ideas for learning, growing and becoming."
            action={{ label: 'View all resources', onClick: () => navigate(category ? `/marketplace/${category.slug}` : '/marketplace') }}
          />

          {categories.length > 0 && (
            <CategoryTabs
              categories={categories}
              activeId={category?._id ?? null}
              onSelect={selectCategory}
              className="!px-0 mb-5"
            />
          )}

          <div className="flex gap-[10px] flex-wrap mb-6 items-center">
            <select aria-label="Filter by age or grade" value={level} onChange={e => setLevel(e.target.value)} className={selectClass}>
              <option value="">All ages &amp; grades</option>
              {EDUCATION_LEVELS.filter(l => l.value !== 'other').map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <select
              aria-label="Filter by type"
              value={level ? 'educational' : kind}
              disabled={!!level}
              onChange={e => setKind(e.target.value as TypeFilter)}
              className={selectClass}
            >
              <option value="">All types</option>
              <option value="physical">Physical</option>
              <option value="digital">Digital</option>
              <option value="educational">Educational</option>
            </select>
            <select aria-label="Sort resources" value={sort} onChange={e => setSort(e.target.value as SortFilter)} className={selectClass}>
              <option value="featured">Newest</option>
              <option value="popular">Most popular</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
            <label className="text-[14px] text-carbon flex items-center gap-[6px] cursor-pointer">
              <input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)} /> Free resources
            </label>
            {hasFilters && (
              <button onClick={resetFilters} className="bg-transparent border-none p-0 text-[13px] text-slate underline cursor-pointer">
                Clear filters
              </button>
            )}
            <span className="w-full sm:w-auto sm:ml-auto text-[14px] text-slate" aria-live="polite">
              {loading ? 'Loading…' : `${total} resource${total === 1 ? '' : 's'}`}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-[14px] gap-y-[25px] md:gap-x-[22px] md:gap-y-[28px]">
            {loading && products.length === 0
              ? Array.from({ length: 8 }).map((_, i) => <ResourceCardSkeleton key={i} />)
              : products.length === 0
                ? (
                  <div className="col-span-full p-[50px] text-center bg-cream rounded-xl">
                    <h3 className="text-[17px] font-bold text-carbon mb-2">No resources match just yet.</h3>
                    <p className="text-[14px] text-slate mb-4">Try a different subject or clear your filters.</p>
                    {hasFilters && (
                      <button onClick={resetFilters} className="bg-white text-brand-orange border border-[#c5d2db] rounded-lg px-5 py-[11px] text-[14px] font-bold cursor-pointer">
                        Clear filters
                      </button>
                    )}
                  </div>
                )
                : products.map(renderResourceCard)}
          </div>

          {products.length > 0 && products.length < total && (
            <div className="flex justify-center mt-9">
              <button
                onClick={() => setLimit(l => l + PAGE_SIZE)}
                disabled={loading}
                className="bg-white text-brand-orange border border-[#c5d2db] rounded-lg px-5 py-[11px] text-[14px] font-bold cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Loading…' : 'Show more resources'}
              </button>
            </div>
          )}
        </section>

        {/* ── Top picks ── */}
        {(poolLoading || topPicks.length > 0) && (
          <section className="mb-12">
            <SectionHead
              eyebrow="Loved by buyers"
              title="Top picks for you"
              action={{ label: 'View all', onClick: () => navigate('/marketplace?sort=popularity') }}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-[14px] gap-y-[25px] md:gap-x-[22px] md:gap-y-[28px]">
              {poolLoading
                ? Array.from({ length: 5 }).map((_, i) => <ResourceCardSkeleton key={i} />)
                : topPicks.map(renderResourceCard)}
            </div>
          </section>
        )}

        {/* ── Best rated ── */}
        {bestRated.length > 0 && (
          <section className="mb-12">
            <SectionHead
              eyebrow="Highest reviews"
              title="Best rated"
              action={{ label: 'View all', onClick: () => navigate('/marketplace?sort=best-rated') }}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-[14px] gap-y-[25px] md:gap-x-[22px] md:gap-y-[28px]">
              {bestRated.map(renderResourceCard)}
            </div>
          </section>
        )}

        {/* ── Collections ── */}
        <section className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-[22px]">
          <div className="rounded-[14px] p-7 bg-[#edf5e7]">
            <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-[13px]">The Tarbiyyah collection</p>
            <h2 className="font-serif font-normal text-[27px] leading-[1.2] text-carbon mb-[10px]">Small habits. Strong character.</h2>
            <p className="text-[14px] text-carbon max-w-[390px] mb-4">
              Bring kindness, gratitude and everyday good manners into your learning moments.
            </p>
            <button onClick={() => (tarbiyyah ? selectCategory(tarbiyyah) : navigate('/education'))} className={linkButtonClass}>
              Explore character-building resources →
            </button>
          </div>
          <div className="rounded-[14px] p-7 bg-[#f7f3d9]">
            <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-[13px]">Made by you. Shared with the world.</p>
            <h2 className="font-serif font-normal text-[27px] leading-[1.2] text-carbon mb-[10px]">Your knowledge can go further.</h2>
            <p className="text-[14px] text-carbon max-w-[390px] mb-4">
              Give your teaching ideas a home in the Edudeen Creator Network.
            </p>
            <button onClick={() => navigate('/sellers')} className={linkButtonClass}>
              Start selling on Edudeen →
            </button>
          </div>
        </section>

        {/* ── Featured sellers ── */}
        {topStores.length > 0 && (
          <section className="mb-12">
            <SectionHead eyebrow="Meet the makers" title="Featured sellers" />
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {topStores.map(s => (
                <StoreFeatureCard key={s.storeId} store={s} onClick={slug => window.location.href = getStorefrontUrl(slug)} />
              ))}
            </div>
          </section>
        )}

        {/* ── Trust ── */}
        <section className="mb-12">
          <SectionHead eyebrow="Shop with confidence" title="Why buyers choose Edudeen" />
          <TrustServiceStrip variant="card" items={TRUST_ITEMS} />
        </section>

        {/* ── Platform stats — self-hides until there's real data ── */}
        {(statsLoading || statItems.length > 0) && (
          <section className="mb-12 rounded-[14px] border border-bone px-5 py-8 md:py-10">
            <RevealStagger className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center" step={0.08} y={14}>
              {statsLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="text-center">
                      <SkeletonBox width={70} height={32} className="mb-2 mx-auto" />
                      <SkeletonBox width={90} height={13} className="mx-auto" />
                    </div>
                  ))
                : statItems.map(s => (
                    <div key={s.label} className="text-center">
                      {s.value === null
                        ? <p className="block font-serif text-[34px] text-carbon">—</p>
                        : <AnimatedCounter value={s.value} format={s.format} className="block font-serif text-[34px] text-carbon" />}
                      <p className="text-[13px] text-slate mt-1">{s.label}</p>
                    </div>
                  ))}
            </RevealStagger>
          </section>
        )}

        {/* ── Real reviews ── */}
        {(testimonialsLoading || testimonials.length > 0) && (
          <section className="mb-4">
            <SectionHead eyebrow="Trusted by buyers & sellers worldwide" title="Real stories from real people" />
            <RevealStagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[22px]" step={0.1} y={16}>
              {testimonialsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-[14px] border border-bone p-6">
                      <SkeletonBox width={70} height={12} className="mb-4" />
                      <SkeletonBox width="100%" height={13} className="mb-2" />
                      <SkeletonBox width="80%" height={13} className="mb-5" />
                      <SkeletonBox width={120} height={13} />
                    </div>
                  ))
                : testimonials.map(t => (
                    <figure key={t.id} className="m-0 rounded-[14px] border border-bone p-6 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-[2px]">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} size={13} className={i <= Math.round(t.rating) ? 'text-brand-gold fill-brand-gold' : 'text-bone fill-bone'} />
                          ))}
                        </div>
                        <Quote size={20} className="text-brand-royal/25 fill-brand-royal/15 shrink-0" />
                      </div>
                      <blockquote className="m-0 font-serif text-[16px] text-carbon leading-[1.6] mb-5">"{t.text}"</blockquote>
                      <figcaption className="flex items-center gap-[10px] pt-4 border-t border-bone">
                        <Avatar name={t.name} size={32} />
                        <div>
                          <div className="flex items-center gap-[6px]">
                            <p className="text-[13px] font-bold text-carbon">{t.name}</p>
                            {t.isVerifiedSeller && <BadgeCheck size={13} className="text-brand-royal shrink-0" />}
                          </div>
                          <p className="text-[12px] text-slate">{t.storeName ? `Owner, ${t.storeName}` : 'Verified Seller'}</p>
                        </div>
                      </figcaption>
                    </figure>
                  ))}
            </RevealStagger>
          </section>
        )}
      </main>

      {/* ── Closing CTA — explore marketplace / create an account ── */}
      <ClosingCtaBanner />

      <Footer />
    </div>
  );
}
