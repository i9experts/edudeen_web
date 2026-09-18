import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getStorefrontUrl } from '@/utils/storefrontUrl';
import { useProductsByCategory } from '@/hooks/marketplace/useProductsByCategory';
import { useCountdownToMidnight } from '@/hooks/useCountdownToMidnight';
import { useCartContext } from '@/contexts/CartContext';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { Card } from '@/components/comman/ui/Card';
import { Avatar } from '@/components/comman/ui/Avatar';
import {
  BuyerNavbar, Footer, SkeletonBox, ClosingCtaBanner, StoreFeatureCard, TrustServiceStrip,
} from '@/components/comman/ui';
import { ProductCard, ProductCardSkeleton } from '@/components/comman/marketplace/ProductCard';
import { FlashSaleCard } from '@/components/comman/marketplace/FlashSaleCard';
import { MegaMenuBar } from '@/components/comman/marketplace/MegaMenuBar';
import {
  Search, ArrowRight, Star, Quote, BadgeCheck, Zap, Tag,
  Shield, CreditCard, Headset, RefreshCcw,
} from 'lucide-react';
import { apiGetTestimonials, type Testimonial } from '@/api/services/testimonials';
import { apiGetPlatformStats, apiGetTopStores, type PlatformStats, type PublicStoreListItem } from '@/api/services/store';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { Reveal, RevealStagger } from '@/components/comman/motion/Reveal';
import { SectionHeading } from '@/components/comman/motion/SectionHeading';
import { AnimatedCounter } from '@/components/comman/motion/AnimatedCounter';

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
  { Icon: Shield,    label: 'Buyer Protection',  sub: 'Secure checkout, every order' },
  { Icon: CreditCard, label: 'Flexible Payment',  sub: 'Cards, COD & bank transfer' },
  { Icon: RefreshCcw, label: 'Easy Returns',      sub: 'Hassle-free return window' },
  { Icon: Headset,   label: '24/7 Support',       sub: "We're here whenever you need us" },
];

/**
 * Root landing page — a real shopper-first marketplace front door (search,
 * categories, featured/flash-sale products, seller spotlights), not the
 * former seller-acquisition pitch. That pitch content is unchanged and still
 * reachable at /sellers, /products/:slug and /solutions/:slug — this page
 * just no longer duplicates it as the first thing every visitor sees.
 * Deliberately reuses the exact same data shapes/handlers Marketplace.tsx
 * already built (categories tree, top stores, featured pool → top picks /
 * best rated / flash deals, add-to-cart & wishlist wiring) instead of
 * inventing a second version of any of it.
 */
export function Homepage() {
  const navigate = useNavigate();
  usePageTitle('Home');

  const [heroSearch, setHeroSearch] = useState('');
  const submitHeroSearch = (term?: string) => {
    const q = (term ?? heroSearch).trim();
    navigate(q ? `/marketplace?search=${encodeURIComponent(q)}` : '/marketplace');
  };

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

  // Real, unfiltered catalog pool — same source Marketplace.tsx's own
  // flash-sale/top-picks/best-rated rails are derived from, so the homepage
  // shows genuine signals instead of fabricated placeholder products.
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

  // Add-to-cart / wishlist wiring — identical pattern to Marketplace.tsx's
  // ProductCard/FlashSaleCard handlers, so a homepage add-to-cart behaves
  // exactly the same way (guest cart, failure recovery, wishlist gate) as
  // it does everywhere else in the app.
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

  // Real platform stats + reviews — unchanged from the previous homepage,
  // still non-critical (each section self-hides until there's real data).
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

  return (
    <div className="bg-cream min-h-full">

      {/* ── Header — same navbar + mega-menu combo every other shopping page
         (Marketplace, ProductDetail, Cart) uses, so a shopper never sees a
         different navigation system depending on which page they land on. */}
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
          onTrendingTerm={term => { setHeroSearch(term); submitHeroSearch(term); }}
          onNavigate={navigate}
        />
      </div>

      {/* ── Hero — search-first, not a SaaS pitch headline. ── */}
      <section className="relative overflow-hidden bg-carbon px-4 sm:px-6 lg:px-12 py-14 sm:py-20">
        <div className="hero-grid-drift absolute inset-0 pointer-events-none opacity-40" />
        <div className="relative z-[1] max-w-[760px] mx-auto text-center">
          <Reveal>
            <h1 className="font-serif text-[30px] sm:text-[42px] lg:text-[50px] font-bold text-white leading-[1.12] tracking-[-0.015em]">
              Find what you need, from sellers you can trust.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-[13.5px] sm:text-[15px] text-white/60 leading-[1.7] mt-4 mb-8 max-w-[520px] mx-auto">
              Shop physical products, digital downloads and educational resources — all in one marketplace.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <form
              onSubmit={e => { e.preventDefault(); submitHeroSearch(); }}
              className="flex items-center gap-2 bg-white rounded-full p-[6px] pl-5 shadow-raised max-w-[560px] mx-auto"
            >
              <Search size={17} className="text-slate shrink-0" />
              <input
                value={heroSearch}
                onChange={e => setHeroSearch(e.target.value)}
                placeholder="Search products, resources, or stores..."
                className="flex-1 min-w-0 bg-transparent border-none outline-none text-[13.5px] text-carbon placeholder:text-slate py-2"
              />
              <button
                type="submit"
                className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-brand-orange to-brand-deep-orange px-5 sm:px-7 py-[11px] rounded-full text-[13px] sm:text-[14px] font-bold text-white cursor-pointer hover:opacity-95 transition-opacity"
              >
                Search
              </button>
            </form>
          </Reveal>
          {categories.length > 0 && (
            <Reveal delay={0.3}>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                {categories.slice(0, 6).map(c => (
                  <button
                    key={c._id}
                    onClick={() => handleShopCategory(c._id)}
                    className="px-[13px] py-[6px] rounded-full text-[12px] font-medium text-white/70 border border-white/15 hover:border-white/35 hover:text-white transition-colors cursor-pointer"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ── Shop by category ── */}
      {categories.length > 0 && (
        <section className="py-12 sm:py-14 px-4 sm:px-6 lg:px-12">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <SectionHeading title="Shop by category" size="md" />
              <button onClick={() => navigate('/marketplace')} className="hidden sm:flex items-center gap-1 text-[12.5px] font-semibold text-brand-orange hover:text-brand-deep-orange transition-colors cursor-pointer">
                View all <ArrowRight size={13} />
              </button>
            </div>
            <RevealStagger className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4" step={0.04} y={12}>
              {categories.slice(0, 12).map(c => (
                <button
                  key={c._id}
                  onClick={() => handleShopCategory(c._id)}
                  className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white border border-bone hover:border-brand-orange/40 hover:shadow-card transition-all cursor-pointer"
                >
                  <span className="w-12 h-12 rounded-xl bg-brand-pale-orange flex items-center justify-center overflow-hidden shrink-0 group-hover:bg-brand-orange transition-colors">
                    {c.image
                      ? <img src={c.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : <Tag size={18} className="text-brand-orange group-hover:text-white transition-colors" />}
                  </span>
                  <span className="text-[11.5px] font-semibold text-charcoal text-center leading-tight line-clamp-2">{c.name}</span>
                </button>
              ))}
            </RevealStagger>
          </div>
        </section>
      )}

      {/* ── Flash Sale — same rail Marketplace.tsx's own browse page shows,
         reused as-is rather than a second implementation. ── */}
      {flashDeals.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-12 pb-2">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-error-bg text-error">
                <Zap size={14} className="fill-error" />
              </span>
              <h2 className="font-serif text-[16px] sm:text-[19px] font-bold text-carbon tracking-[-0.01em]">Flash Sale</h2>
              <span className="ml-auto flex items-center gap-[6px] text-[11px] sm:text-[12px] font-semibold text-slate">
                <span className="hidden sm:inline">Ends in</span>
                <span className="tabular-nums text-error font-bold">{countdown.h}:{countdown.m}:{countdown.s}</span>
              </span>
            </div>
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
          </div>
        </section>
      )}

      {/* ── Top Picks ── */}
      {(poolLoading || topPicks.length > 0) && (
        <section className="py-10 sm:py-12 px-4 sm:px-6 lg:px-12">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-center justify-between mb-5">
              <SectionHeading title="Top picks for you" size="md" />
              <button onClick={() => navigate('/marketplace?sort=popularity')} className="hidden sm:flex items-center gap-1 text-[12.5px] font-semibold text-brand-orange hover:text-brand-deep-orange transition-colors cursor-pointer">
                View all <ArrowRight size={13} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {poolLoading
                ? Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} layout="grid" />)
                : topPicks.map(p => {
                    const dv = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
                    const vId = dv?._id ?? '';
                    return (
                      <ProductCard
                        key={p._id}
                        layout="grid"
                        product={p}
                        onClick={handleCardClick}
                        isAdding={adding === vId}
                        addToCartFailed={addToCartFailedId === vId}
                        onAddToCart={handleAddToCart}
                        isWishlisted={isWishlisted(p._id, vId)}
                        isWishlisting={wishlisting === vId}
                        onToggleWishlist={handleToggleWishlist}
                      />
                    );
                  })}
            </div>
          </div>
        </section>
      )}

      {/* ── Best Rated ── */}
      {bestRated.length > 0 && (
        <section className="py-10 sm:py-12 px-4 sm:px-6 lg:px-12 bg-white">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex items-center justify-between mb-5">
              <SectionHeading title="Best rated" size="md" />
              <button onClick={() => navigate('/marketplace?sort=best-rated')} className="hidden sm:flex items-center gap-1 text-[12.5px] font-semibold text-brand-orange hover:text-brand-deep-orange transition-colors cursor-pointer">
                View all <ArrowRight size={13} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {bestRated.map(p => {
                const dv = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
                const vId = dv?._id ?? '';
                return (
                  <ProductCard
                    key={p._id}
                    layout="grid"
                    product={p}
                    onClick={handleCardClick}
                    isAdding={adding === vId}
                    addToCartFailed={addToCartFailedId === vId}
                    onAddToCart={handleAddToCart}
                    isWishlisted={isWishlisted(p._id, vId)}
                    isWishlisting={wishlisting === vId}
                    onToggleWishlist={handleToggleWishlist}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Seller spotlights ── */}
      {topStores.length > 0 && (
        <section className="py-10 sm:py-12 px-4 sm:px-6 lg:px-12">
          <div className="max-w-[1280px] mx-auto">
            <SectionHeading title="Featured sellers" size="md" className="mb-5" />
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {topStores.map(s => (
                <StoreFeatureCard key={s.storeId} store={s} onClick={slug => window.location.href = getStorefrontUrl(slug)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Trust strip ── */}
      <div className="px-4 sm:px-6 lg:px-12 pb-2">
        <div className="max-w-[1280px] mx-auto">
          <TrustServiceStrip variant="card" items={TRUST_ITEMS} />
        </div>
      </div>

      {/* ── Platform stats — self-hides until there's real data ── */}
      {(statsLoading || statItems.length > 0) && (
        <section className="py-12 sm:py-14 px-4 sm:px-6 lg:px-12 bg-white border-t border-b border-bone">
          <RevealStagger className="max-w-[1000px] mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center" step={0.08} y={14}>
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
                      ? <p className="block text-[32px] font-bold text-brand-orange">—</p>
                      : <AnimatedCounter value={s.value} format={s.format} className="block text-[32px] font-bold text-brand-orange" />}
                    <p className="text-[13px] text-slate">{s.label}</p>
                  </div>
                ))}
          </RevealStagger>
        </section>
      )}

      {/* ── Social proof — real reviews only ── */}
      {(testimonialsLoading || testimonials.length > 0) && (
        <section className="bg-cream border-b border-bone py-10 sm:py-12 lg:py-14">
          <div className="px-4 sm:px-6 lg:px-12">
            <SectionHeading kicker="Trusted by buyers &amp; sellers worldwide" title="Real stories from real people" align="center" className="mb-10" />
            <RevealStagger className="flex flex-wrap justify-center gap-4" step={0.1} y={16}>
              {testimonialsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} padding="none" className="w-full sm:w-[340px]">
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <SkeletonBox width={70} height={12} />
                          <SkeletonBox width={22} height={22} rounded="6px" />
                        </div>
                        <SkeletonBox width="100%" height={13} className="mb-2" />
                        <SkeletonBox width="80%" height={13} className="mb-4" />
                        <div className="flex items-center gap-[10px] pt-3 border-t border-bone">
                          <SkeletonBox width={30} height={30} rounded="999px" />
                          <div>
                            <SkeletonBox width={90} height={13} className="mb-1" />
                            <SkeletonBox width={70} height={11} />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                : testimonials.map(t => (
                    <Card key={t.id} padding="none" hover className="group relative overflow-hidden w-full sm:w-[340px]">
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-orange to-[#f0a57a] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-[2px]">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star key={i} size={12} className={i <= Math.round(t.rating) ? 'text-brand-orange fill-brand-orange' : 'text-bone fill-bone'} />
                            ))}
                          </div>
                          <Quote size={20} className="text-brand-orange/20 fill-brand-orange/20 shrink-0" />
                        </div>
                        <p className="text-[13px] text-charcoal leading-[1.75] mb-4 italic">"{t.text}"</p>
                        <div className="flex items-center gap-[10px] pt-3 border-t border-bone">
                          <Avatar name={t.name} size={30} />
                          <div>
                            <div className="flex items-center gap-[6px]">
                              <p className="text-[13px] font-semibold text-carbon">{t.name}</p>
                              {t.isVerifiedSeller && <BadgeCheck size={13} className="text-info fill-info/15 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-slate">{t.storeName ? `Owner, ${t.storeName}` : 'Verified Seller'}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
            </RevealStagger>
          </div>
        </section>
      )}

      {/* ── Closing CTA — self-contained, already offers both "Explore
         Marketplace" and "Create Your Account" (sell entry), so it covers
         the seller-acquisition funnel without a second dedicated pitch
         section dominating the shopper-first homepage. ── */}
      <ClosingCtaBanner />

      <Footer />
    </div>
  );
}
