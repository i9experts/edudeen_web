import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { useIsBuyer } from '@/hooks/auth/useIsBuyer';
import { useEdgeHoverScroll } from '@/hooks/useEdgeHoverScroll';
import { useTopBarDeals } from '@/hooks/useTopBarDeals';
import { apiSearchProducts } from '@/api/services/search';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getStorePagePath } from '@/utils/storefrontUrl';
import { categoryPath } from '@/hooks/marketplace/useCategoryTree';
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
import {
  FiltersButton, FiltersDrawer, Section, RadioRow, CheckRow,
  EMPTY_FILTERS, PRICE_NO_MAX, type MarketplaceFilters,
} from '@/components/comman/marketplace/FiltersDrawer';
import { SectionHead, sectionLinkClass } from '@/components/comman/marketplace/SectionHead';
import { Star, Quote, BadgeCheck, Zap, Shield, CreditCard, Headset, RefreshCcw } from 'lucide-react';
import { apiGetTestimonials, type Testimonial } from '@/api/services/testimonials';
import { apiGetPlatformStats, apiGetTopStores, type PlatformStats, type PublicStoreListItem } from '@/api/services/store';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { EDUCATION_LEVELS } from '@/api/services/product';
import type { MarketplaceProduct, MarketplaceSortBy } from '@/api/services/marketplace';
import { apiGetHomeShelves, type CuratedShelf } from '@/api/services/classroom';
import { RevealStagger } from '@/components/comman/motion/Reveal';
import { AnimatedCounter } from '@/components/comman/motion/AnimatedCounter';
import heroImage from '@/assets/learning-hero.jpg';

const compactNumber   = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactCurrency = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'USD' });

const TRUST_ITEMS = [
  { Icon: Shield,     label: 'Secure Checkout',   sub: 'Payments handled by Edudeen' },
  { Icon: CreditCard, label: 'Flexible Payment',  sub: 'Cards, COD & bank transfer' },
  { Icon: RefreshCcw, label: 'Refund Requests',   sub: 'Raise one from My Orders' },
  { Icon: Headset,    label: 'Help When Needed',  sub: 'Message the seller or contact us' },
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
// The API caps a page at 50 — the pool used when a filter has to run in the browser.
const CLIENT_POOL = 50;

const SORT_LABELS: Record<SortFilter, string> = {
  featured: 'Featured',
  popular:  'Most popular',
  low:      'Price: low to high',
  high:     'Price: high to low',
};

// Fixed subject tabs. When an admin category with a matching name exists it
// filters server-side by that category; otherwise the tab matches on the
// product's name, description and tags.
const SUBJECT_TABS: { id: string; label: string; category: RegExp; keywords: RegExp }[] = [
  { id: 'tarbiyyah',     label: 'Tarbiyyah',       category: /tarbiy/i,
    keywords: /tarbiy|islam|quran|qur'an|seerah|sirah|dua|salah|namaz|hadith|akhlaq|deen|tajweed|prophet|ramadan|wudu/i },
  { id: 'arabic-urdu',   label: 'Arabic & Urdu',   category: /arabic|urdu/i,
    keywords: /arabic|urdu|qaida|noorani|عربي|اردو/i },
  { id: 'english',       label: 'English',         category: /^english/i,
    keywords: /english|phonics|grammar|spelling|vocabulary|reading|writing|alphabet tracing/i },
  { id: 'maths-science', label: 'Maths & Science', category: /math|science|stem/i,
    keywords: /math|maths|science|stem|physics|chemistry|biology|arithmetic|numbers|geometry|algebra/i },
  { id: 'homeschooling', label: 'Homeschooling',   category: /home ?school/i,
    keywords: /home ?school|curriculum|lesson plan|planner|unit study|montessori/i },
];

const LANGUAGES: { value: string; label: string; match: RegExp }[] = [
  { value: 'english', label: 'English', match: /english/i },
  { value: 'arabic',  label: 'Arabic',  match: /arabic|عربي/i },
  { value: 'urdu',    label: 'Urdu',    match: /urdu|اردو/i },
];

function flattenCategories(nodes: CategoryNode[], out: CategoryNode[] = []): CategoryNode[] {
  for (const n of nodes) { out.push(n); flattenCategories(n.children ?? [], out); }
  return out;
}

const sameRange = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

// Category names are left out on purpose: a broad category like "Islamic &
// Educational Resources" would make every product match every subject.
function productText(p: MarketplaceProduct) {
  return `${p.name} ${p.description ?? ''} ${(p.tags ?? []).join(' ')}`;
}

function defaultVariant(p: MarketplaceProduct) {
  return (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
}

function isOnSale(p: MarketplaceProduct) {
  const dv = defaultVariant(p);
  return dv?.compareAtPrice != null && dv.compareAtPrice > (dv.price ?? 0);
}

/**
 * One shop category — a fixed subject (optionally backed by a real admin
 * category of the same name) or any other admin root category. The same list
 * drives the tabs, the "All Categories" menu and the
 * Filters drawer, so they can never disagree.
 */
interface ShopTab {
  id: string;
  label: string;
  /** Real category → filtered server-side. */
  categoryId?: string;
  /** No real category → matched on name/description/tags. */
  keywords?: RegExp;
  node?: CategoryNode;
}

const catTabId = (categoryId: string) => `cat-${categoryId}`;


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
  // Edudeen's curated, seasonal shelves ("Exam ki tayyari" etc.), set by the admin team.
  const [shelves, setShelves] = useState<CuratedShelf[]>([]);
  useEffect(() => { apiGetHomeShelves().then(res => setShelves(res.data ?? [])).catch(() => {}); }, []);
  const isBuyer = useIsBuyer();
  const sellersRowRef = useEdgeHoverScroll<HTMLDivElement>();
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

  const [searchParams, setSearchParams] = useSearchParams();
  const searchQ = (searchParams.get('search') ?? '').trim();
  // `/?campaign=<id>` — opened from a sale in the top bar; narrows the catalogue to that sale.
  const campaignId = (searchParams.get('campaign') ?? '').trim();
  const topBarDeals = useTopBarDeals();
  const activeCampaign = campaignId ? topBarDeals?.campaigns.find(c => c._id === campaignId) ?? null : null;
  const clearCampaign = () => setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    next.delete('campaign');
    return next;
  }, { replace: true });

  const submitSearch = (term: string) => {
    const q = term.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/');
  };
  const clearSearch = () => setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    next.delete('search');
    return next;
  }, { replace: true });

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
  const [subject, setSubject]   = useState<string | null>(null);
  const [level, setLevel]       = useState('');
  const [language, setLanguage] = useState('');
  const [sort, setSort]         = useState<SortFilter>('featured');
  const [freeOnly, setFreeOnly] = useState(false);
  const [filters, setFilters]   = useState<MarketplaceFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit]       = useState(PAGE_SIZE);

  useEffect(() => { setLimit(PAGE_SIZE); }, [subject, level, language, sort, freeOnly, filters, searchQ]);

  const allCategories = useMemo(() => flattenCategories(categories), [categories]);
  const shopTabs = useMemo<ShopTab[]>(() => {
    const used = new Set<string>();
    const subjects = SUBJECT_TABS.map(t => {
      const node = allCategories.find(c => t.category.test(c.name));
      if (node) used.add(node._id);
      return { id: t.id, label: t.label, categoryId: node?._id, keywords: node ? undefined : t.keywords, node };
    });
    const extra = categories
      .filter(c => !used.has(c._id))
      .map(c => ({ id: catTabId(c._id), label: c.name, categoryId: c._id, node: c }));
    return [...subjects, ...extra];
  }, [categories, allCategories]);

  // A tab id, or `cat-<id>` for a subcategory picked from the mega menu.
  const subjectTab: ShopTab | null = useMemo(() => {
    if (!subject) return null;
    const tab = shopTabs.find(t => t.id === subject);
    if (tab) return tab;
    const node = allCategories.find(c => catTabId(c._id) === subject);
    return node ? { id: subject, label: node.name, categoryId: node._id, node } : null;
  }, [subject, shopTabs, allCategories]);

  // `/?category=<slug>` (old /marketplace/<slug> links) opens that category.
  useEffect(() => {
    const slug = searchParams.get('category');
    if (!slug || allCategories.length === 0) return;
    const node = allCategories.find(c => c.slug === slug);
    if (node) {
      const tab = shopTabs.find(t => t.categoryId === node._id);
      setSubject(tab ? tab.id : catTabId(node._id));
    }
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete('category'); return n; }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCategories.length]);

  const languageDef = LANGUAGES.find(l => l.value === language) ?? null;
  const itemType = filters.type[0]?.toLowerCase() as TypeFilter | undefined;
  const [minP, maxP] = filters.priceRange;

  // ── Search (`/?search=`) — a real text search; every filter below then
  //    narrows its results in the browser. ──
  const [searchPool, setSearchPool] = useState<MarketplaceProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  useEffect(() => {
    if (!searchQ) { setSearchPool([]); return; }
    let cancelled = false;
    setSearchLoading(true);
    apiSearchProducts(searchQ, 1, CLIENT_POOL)
      .then(res => { if (!cancelled) setSearchPool(res.data?.products ?? []); })
      .catch(() => { if (!cancelled) setSearchPool([]); })
      .finally(() => { if (!cancelled) setSearchLoading(false); });
    const t = setTimeout(() => resourcesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [searchQ]);

  // Subject keywords, language and "on sale" aren't API filters — when any is
  // on, fetch the largest page the API allows and narrow it here.
  const clientSide = !!searchQ || !!subjectTab?.keywords || !!languageDef || filters.onSale;

  const { products: browsed, total: serverTotal, loading: browseLoading } = useProductsByCategory(
    1, clientSide ? CLIENT_POOL : limit, subjectTab?.categoryId,
    level ? 'educational' : (itemType || undefined),
    level || undefined, undefined, campaignId || undefined,
    freeOnly ? undefined : (minP > 0 ? minP : undefined),
    freeOnly ? 0 : (maxP < PRICE_NO_MAX ? maxP : undefined),
    filters.minRating ?? undefined,
    SORT_TO_API[sort],
    !searchQ,
  );

  const narrowed = useMemo(() => {
    if (!clientSide) return browsed;
    const inSubject = (p: MarketplaceProduct) => {
      if (!subjectTab) return true;
      if (subjectTab.keywords) return subjectTab.keywords.test(productText(p));
      return p.categoryId === subjectTab.categoryId || p.subCategoryId === subjectTab.categoryId;
    };
    const list = (searchQ ? searchPool : browsed).filter(p => {
      if (!inSubject(p)) return false;
      if (languageDef && !languageDef.match.test(productText(p))) return false;
      if (filters.onSale && !isOnSale(p)) return false;
      if (searchQ) {
        // The browse API already applied these; search results need them here.
        const price = defaultVariant(p)?.price ?? 0;
        const kind = p.productType ?? p.type;
        if (level && p.educationLevel !== level) return false;
        if (itemType && kind !== itemType) return false;
        if (freeOnly ? price > 0 : (price < minP || price > maxP)) return false;
        if (filters.minRating && p.averageRating < filters.minRating) return false;
      }
      return true;
    });
    if (searchQ && sort !== 'featured') {
      const price = (p: MarketplaceProduct) => defaultVariant(p)?.price ?? 0;
      list.sort((a, b) =>
        sort === 'low' ? price(a) - price(b)
        : sort === 'high' ? price(b) - price(a)
        : b.purchaseCount - a.purchaseCount);
    }
    return list;
  }, [clientSide, browsed, searchPool, searchQ, subjectTab, languageDef, filters, level, itemType, freeOnly, minP, maxP, sort]);

  const loading = searchQ ? searchLoading : browseLoading;
  const products = clientSide ? narrowed.slice(0, limit) : narrowed;
  const total = clientSide ? narrowed.length : serverTotal;

  const resetFilters = () => {
    setSubject(null); setLevel(''); setLanguage(''); setSort('featured'); setFreeOnly(false); setFilters(EMPTY_FILTERS);
    if (searchQ) clearSearch();
    if (campaignId) clearCampaign();
  };
  const pageFilterCount = (subject ? 1 : 0) + (level ? 1 : 0) + (language ? 1 : 0) + (freeOnly ? 1 : 0) + (sort !== 'featured' ? 1 : 0);
  const drawerFilterCount =
    (sameRange(filters.priceRange, EMPTY_FILTERS.priceRange) ? 0 : 1) + filters.type.length + (filters.minRating ? 1 : 0) + (filters.onSale ? 1 : 0);
  const hasFilters = pageFilterCount + drawerFilterCount > 0 || !!campaignId;

  // Arriving from a top-bar sale → bring the filtered catalogue into view.
  useEffect(() => {
    if (!campaignId) return;
    const t = setTimeout(() => resourcesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
    return () => clearTimeout(t);
  }, [campaignId]);

  const resourcesRef = useRef<HTMLElement>(null);

  // `/#deals` (from the quick-access rail): jump to the flash sale, or —
  // when there isn't one today — show the catalogue filtered to items on sale.
  const { hash } = useLocation();
  const hasDeals = flashDeals.length > 0;
  useEffect(() => {
    if (hash !== '#deals' || poolLoading) return;
    if (!hasDeals) setFilters(f => ({ ...f, onSale: true }));
    const t = setTimeout(() => (hasDeals ? document.getElementById('deals') : resourcesRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    return () => clearTimeout(t);
  }, [hash, hasDeals, poolLoading]);
  const scrollToResources = () => resourcesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const selectSubject = (id: string | null) => {
    setSubject(id);
    setTimeout(scrollToResources, 30);
  };
  // A real category opens its own page; a keyword-only subject tab (no
  // matching category) still filters the catalogue below.
  const handleShopCategory = useCallback((id: string) => {
    const tabNode = shopTabs.find(t => t.id === id)?.node;
    const node = tabNode ?? allCategories.find(c => c._id === id || catTabId(c._id) === id);
    if (node) { navigate(categoryPath(node)); return; }
    setSubject(id || null);
    setTimeout(() => resourcesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }, [shopTabs, allCategories, navigate]);

  // The shared tab list in the shape the mega menu / category grid expect.
  const menuCategories = useMemo<CategoryNode[]>(() => shopTabs.map(t => ({
    ...(t.node ?? {}),
    _id: t.id,
    name: t.label,
    slug: t.node?.slug ?? t.id,
    image: t.node?.image ?? null,
    children: (t.node?.children ?? []).map(ch => ({ ...ch, _id: catTabId(ch._id) })),
  }) as CategoryNode), [shopTabs]);

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


  // Old `/?search=` links now open the real search results page.
  if (searchQ) return <Navigate to={`/search?q=${encodeURIComponent(searchQ)}`} replace />;

  return (
    <div className="bg-white min-h-full">

      {/* ── Header — the same navbar + mega-menu every shopping page uses ── */}
      <div className="sticky top-0 z-50 [&>nav]:!border-b-0">
        <BuyerNavbar />
        <MegaMenuBar
          compact
          categories={menuCategories}
          topPicks={topPicks}
          bestRated={bestRated}
          flashDeals={flashDeals}
          topStores={topStores}
          countdown={countdown}
          onShopCategory={handleShopCategory}
          onProductClick={handleCardClick}
          onStoreClick={slug => navigate(getStorePagePath(slug))}
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
                onClick={() => selectSubject('tarbiyyah')}
                className="inline-block bg-white text-brand-orange border border-[#c5d2db] rounded-lg px-5 py-[11px] text-[14px] font-bold cursor-pointer hover:brightness-95"
              >
                Explore Tarbiyyah
              </button>
            </div>
          </div>
          <div className="relative h-[170px] md:h-auto bg-[#ddeaf2] overflow-hidden">
            <img
              src={heroImage}
              alt="Learning workbooks and colourful stationery arranged on a desk"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute bottom-[22px] end-[22px] hidden sm:block bg-white px-[19px] py-3 rounded-[10px] text-[14px] text-carbon shadow-[0_8px_30px_rgba(19,57,86,0.09)]">
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

        {/* ── Flash sale ── */}
        {flashDeals.length > 0 && (
          <section id="deals" className="mb-12 scroll-mt-[150px]">
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

        {/* ── Edudeen picks (curated shelves) ── */}
        {shelves.map(s => (
          <section key={s._id} className="mb-12">
            <SectionHead
              eyebrow="Edudeen picks"
              title={s.title}
              action={{ label: 'View all', onClick: () => navigate(`/picks/${s.slug}`) }}
            />
            {s.subtitle && <p className="text-[13.5px] text-graphite -mt-3 mb-4">{s.subtitle}</p>}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-[14px] gap-y-[25px] md:gap-x-[22px] md:gap-y-[28px]">
              {s.products.slice(0, 5).map(renderResourceCard)}
            </div>
          </section>
        ))}

        {/* ── Catalogue with filters ── */}
        <section ref={resourcesRef} className="scroll-mt-[150px] mb-12">
          <SectionHead
            eyebrow={searchQ ? 'Search results' : campaignId ? (activeCampaign?.name ?? 'Sale') : subjectTab ? subjectTab.label : 'Your next teaching moment'}
            title="Resources with a purpose"
            sub="Thoughtful ideas for learning, growing and becoming."
          />

          <CategoryTabs
            tabs={shopTabs}
            activeId={subjectTab && !shopTabs.some(t => t.id === subjectTab.id) ? null : subject}
            onSelect={selectSubject}
            className="!px-0 mb-5"
          />

          <div className="flex gap-[10px] flex-wrap mb-6 items-center">
            <FiltersButton count={pageFilterCount + drawerFilterCount} onClick={() => setFiltersOpen(true)} />
            {campaignId && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4DC4C] text-[#152D43] text-[13px] font-semibold ps-3 pe-1.5 py-[6px]">
                Sale: {activeCampaign?.name ?? 'Selected sale'}
                <button onClick={clearCampaign} aria-label="Clear sale filter" className="size-5 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer hover:bg-white/60">
                  <X size={13} />
                </button>
              </span>
            )}
            {searchQ && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-pale-orange text-carbon text-[13px] font-semibold ps-3 pe-1.5 py-[6px]">
                “{searchQ}”
                <button onClick={clearSearch} aria-label="Clear search" className="size-5 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer hover:bg-white/70">
                  <X size={13} />
                </button>
              </span>
            )}
            {subjectTab && !shopTabs.some(t => t.id === subjectTab.id) && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-pale-orange text-carbon text-[13px] font-semibold ps-3 pe-1.5 py-[6px]">
                {subjectTab.label}
                <button onClick={() => setSubject(null)} aria-label="Clear category" className="size-5 rounded-full flex items-center justify-center bg-transparent border-none cursor-pointer hover:bg-white/70">
                  <X size={13} />
                </button>
              </span>
            )}
            {hasFilters && (
              <button onClick={resetFilters} className="bg-transparent border-none p-0 text-[13px] text-slate underline cursor-pointer">
                Clear filters
              </button>
            )}
            <span className="w-full sm:w-auto sm:ms-auto text-[14px] text-slate" aria-live="polite">
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

          <FiltersDrawer
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            filters={filters}
            onChange={setFilters}
            onClear={resetFilters}
            total={total}
            extraActiveCount={pageFilterCount}
          >
            <Section title="Subject">
              <RadioRow name="f-subject" label="All resources" checked={!subject} onChange={() => setSubject(null)} />
              {shopTabs.map(t => (
                <RadioRow key={t.id} name="f-subject" label={t.label} checked={subject === t.id} onChange={() => setSubject(t.id)} />
              ))}
            </Section>

            <Section title="Age & grade">
              <RadioRow name="f-level" label="All ages & grades" checked={!level} onChange={() => setLevel('')} />
              {EDUCATION_LEVELS.filter(l => l.value !== 'other').map(l => (
                <RadioRow key={l.value} name="f-level" label={l.label} checked={level === l.value} onChange={() => setLevel(l.value)} />
              ))}
            </Section>

            <Section title="Language">
              <RadioRow name="f-lang" label="All languages" checked={!language} onChange={() => setLanguage('')} />
              {LANGUAGES.map(l => (
                <RadioRow key={l.value} name="f-lang" label={l.label} checked={language === l.value} onChange={() => setLanguage(l.value)} />
              ))}
            </Section>

            <Section title="Sort by">
              {(Object.keys(SORT_LABELS) as SortFilter[]).map(s => (
                <RadioRow key={s} name="f-sort" label={SORT_LABELS[s]} checked={sort === s} onChange={() => setSort(s)} />
              ))}
            </Section>

            <Section title="Price type">
              <CheckRow label="Free resources" checked={freeOnly} onChange={() => setFreeOnly(v => !v)} />
            </Section>
          </FiltersDrawer>
        </section>

        {/* ── Top picks ── */}
        {(poolLoading || topPicks.length > 0) && (
          <section className="mb-12">
            <SectionHead
              eyebrow="Loved by buyers"
              title="Top picks for you"
              action={{ label: 'View all', onClick: () => { setSort('popular'); selectSubject(null); } }}
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
              action={{ label: 'View all', onClick: () => { setFilters(f => ({ ...f, minRating: 4 })); selectSubject(null); } }}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-[14px] gap-y-[25px] md:gap-x-[22px] md:gap-y-[28px]">
              {bestRated.map(renderResourceCard)}
            </div>
          </section>
        )}

        {/* ── Collections ── */}
        <section className={clsx('mb-12 grid grid-cols-1 gap-[22px]', !isBuyer && 'md:grid-cols-2')}>
          <div className="rounded-[14px] p-7 bg-[#edf5e7]">
            <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-[13px]">The Tarbiyyah collection</p>
            <h2 className="font-serif font-normal text-[27px] leading-[1.2] text-carbon mb-[10px]">Small habits. Strong character.</h2>
            <p className="text-[14px] text-carbon max-w-[390px] mb-4">
              Bring kindness, gratitude and everyday good manners into your learning moments.
            </p>
            <button onClick={() => selectSubject('tarbiyyah')} className={linkButtonClass}>
              Explore character-building resources →
            </button>
          </div>
          {!isBuyer && (
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
          )}
        </section>

        {/* ── Featured sellers ── */}
        {topStores.length > 0 && (
          <section className="mb-12">
            <SectionHead eyebrow="Meet the makers" title="Featured sellers" />
            {/* Hover near either edge to glide the row that way. */}
            <div ref={sellersRowRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 pt-1">
              {topStores.map(s => (
                <StoreFeatureCard key={s.storeId} store={s} onClick={slug => navigate(getStorePagePath(slug))} />
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
