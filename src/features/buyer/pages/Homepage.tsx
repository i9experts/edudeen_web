import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useProductsByCategory } from '@/hooks/marketplace/useProductsByCategory';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { BuyerNavbar, Footer } from '@/components/comman/ui';
import { ResourceCard, ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import { CategoryTabs } from '@/components/comman/marketplace/CategoryTabs';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { EDUCATION_LEVELS } from '@/api/services/product';
import type { MarketplaceSortBy } from '@/api/services/marketplace';
import heroImage from '@/assets/learning-hero.jpg';

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

/**
 * Root landing page — a calm, resource-first shop front: warm hero, a short
 * promise strip, then the live catalogue with its own filters, and two
 * collection callouts. Every product, category and count is real API data.
 */
export function Homepage() {
  const navigate = useNavigate();
  usePageTitle('Home');

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  useEffect(() => {
    let cancelled = false;
    apiGetCategoryTree().then(res => { if (!cancelled) setCategories(res.data ?? []); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Filters (the category tabs filter the grid right here, like the rest)
  const [category, setCategory] = useState<CategoryNode | null>(null);
  const [level, setLevel]       = useState('');
  const [kind, setKind]         = useState<TypeFilter>('');
  const [sort, setSort]         = useState<SortFilter>('featured');
  const [freeOnly, setFreeOnly] = useState(false);
  const [limit, setLimit]       = useState(PAGE_SIZE);

  // Any filter change starts the grid over from the first page.
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

  const resourcesRef = useRef<HTMLElement>(null);
  const scrollToResources = () => resourcesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const selectCategory = (c: CategoryNode | null) => {
    setCategory(c);
    setTimeout(scrollToResources, 30);
  };

  const { isWishlisted, wishlisting, toggleWishlist } = useWishlistContext();
  const handleCardClick = useCallback((slug: string) => navigate(`/product/${slug}`), [navigate]);
  const handleToggleWishlist = useCallback((e: React.MouseEvent, id: string, variantId: string) => {
    e.stopPropagation();
    if (variantId) toggleWishlist(id, variantId);
  }, [toggleWishlist]);

  const tarbiyyah = categories.find(c => /tarbiy|islam/i.test(c.name));
  const hasFilters = !!(category || level || kind || freeOnly || sort !== 'featured');

  return (
    <div className="bg-white min-h-full">

      <div className="sticky top-0 z-50">
        <BuyerNavbar />
        <CategoryTabs categories={categories} activeId={category?._id ?? null} onSelect={selectCategory} />
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
              Find meaningful resources for the lessons you teach and the values you nurture.
            </p>
            <button
              onClick={scrollToResources}
              className="inline-block bg-brand-orange text-white border border-brand-orange rounded-lg px-5 py-[11px] text-[14px] font-bold cursor-pointer hover:brightness-95"
            >
              Find your next resource
            </button>
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
        <div className="flex justify-between md:justify-center gap-[15px] md:gap-10 pt-2 pb-[27px] text-[12px] md:text-[14px] text-carbon border-b border-bone mb-[30px]">
          {['For home & classroom', 'Preview before you choose', 'Created by educators'].map(t => (
            <span key={t}><span className="text-brand-green">✓</span> {t}</span>
          ))}
        </div>

        {/* ── Resources ── */}
        <section ref={resourcesRef} className="scroll-mt-[150px]">
          <div className="flex justify-between gap-5 items-end mb-[22px]">
            <div>
              <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-[13px]">
                {category ? category.name : 'Your next teaching moment'}
              </p>
              <h2 className="font-serif font-normal text-[25px] md:text-[30px] leading-[1.2] tracking-[-0.5px] text-carbon mb-[6px]">
                Resources with a purpose
              </h2>
              <p className="text-[14px] text-carbon">Thoughtful ideas for learning, growing and becoming.</p>
            </div>
            <button
              onClick={() => navigate(category ? `/marketplace/${category.slug}` : '/marketplace')}
              className="shrink-0 bg-transparent border-0 border-b border-current text-brand-orange pb-[3px] px-0 text-[14px] font-bold cursor-pointer"
            >
              View all resources
            </button>
          </div>

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
                : products.map((p, i) => {
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
                  })}
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

        {/* ── Collections ── */}
        <section className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-[22px]">
          <div className="rounded-[14px] p-7 bg-[#edf5e7]">
            <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-[13px]">The Tarbiyyah collection</p>
            <h2 className="font-serif font-normal text-[27px] leading-[1.2] text-carbon mb-[10px]">Small habits. Strong character.</h2>
            <p className="text-[14px] text-carbon max-w-[390px] mb-4">
              Bring kindness, gratitude and everyday good manners into your learning moments.
            </p>
            <button
              onClick={() => (tarbiyyah ? selectCategory(tarbiyyah) : navigate('/education'))}
              className="bg-transparent border-0 border-b border-current text-brand-orange pb-[3px] px-0 text-[14px] font-bold cursor-pointer"
            >
              Explore character-building resources →
            </button>
          </div>
          <div className="rounded-[14px] p-7 bg-[#f7f3d9]">
            <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-[13px]">Made by you. Shared with the world.</p>
            <h2 className="font-serif font-normal text-[27px] leading-[1.2] text-carbon mb-[10px]">Your knowledge can go further.</h2>
            <p className="text-[14px] text-carbon max-w-[390px] mb-4">
              Give your teaching ideas a home in the Edudeen Creator Network.
            </p>
            <button
              onClick={() => navigate('/sellers')}
              className="bg-transparent border-0 border-b border-current text-brand-orange pb-[3px] px-0 text-[14px] font-bold cursor-pointer"
            >
              Start selling on Edudeen →
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
