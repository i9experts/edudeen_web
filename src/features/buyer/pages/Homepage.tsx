import { HomeBrowse, isBrowseMode } from './HomeBrowse';
import { EarlyAccessChip } from '@/components/comman/ui/EarlyAccessChip';
import { PlacementBanner } from '@/components/comman/marketplace/PlacementBanner';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { EditableHomeSection } from '@/components/admin-edit/EditableHomeSection';
import { effectiveHomeContent } from '@/components/admin-edit/homeDefaults';
import { EditableCategories, EditableDeals } from '@/components/admin-edit/EditableInline';
import { DealsBanner } from '@/components/comman/ui/DealsBanner';
import { FeatureMaintenance } from '@/components/comman/ui/FeatureMaintenance';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { useIsBuyer } from '@/hooks/auth/useIsBuyer';
import { useLanguage } from '@/contexts/languageCtx';
import { useTopBarDeals } from '@/hooks/useTopBarDeals';
import { usePremiumDeals } from '@/hooks/usePremiumDeals';
import { apiSearchProducts } from '@/api/services/search';
import { usePageMeta } from '@/hooks/usePageMeta';
import { getStorePagePath } from '@/utils/storefrontUrl';
import { categoryPath } from '@/hooks/marketplace/useCategoryTree';
import { useProductsByCategory } from '@/hooks/marketplace/useProductsByCategory';
import { useCountdownTo } from '@/hooks/useCountdownTo';
import { useCartContext } from '@/contexts/CartContext';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { Avatar } from '@/components/comman/ui/Avatar';
import {
  BuyerNavbar, Footer, SkeletonBox, StoreFeatureCard, TrustServiceStrip,
} from '@/components/comman/ui';
import { ResourceCard, ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import { ScrollRow } from '@/components/comman/ui/ScrollRow';
import { FlashSaleCard } from '@/components/comman/marketplace/FlashSaleCard';
import { MegaMenuBar } from '@/components/comman/marketplace/MegaMenuBar';
import { CategoryTabs } from '@/components/comman/marketplace/CategoryTabs';
import {
  FiltersButton, FiltersDrawer, Section, RadioRow, CheckRow,
  EMPTY_FILTERS, PRICE_NO_MAX, type MarketplaceFilters,
} from '@/components/comman/marketplace/FiltersDrawer';
import { SectionHead, sectionLinkClass } from '@/components/comman/marketplace/SectionHead';
import { Star, Quote, BadgeCheck, Zap, Crown, Shield, CreditCard, Headset, RefreshCcw } from 'lucide-react';
import { apiGetTestimonials, type Testimonial } from '@/api/services/testimonials';
import { apiGetTopStores, type PublicStoreListItem } from '@/api/services/store';
import { PlatformStatsSection } from '@/features/buyer/components/PlatformStatsSection';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { type MarketplaceProduct, type MarketplaceSortBy } from '@/api/services/marketplace';
import { productSalePct, soonestSaleEnd } from '@/utils/saleMath';
import { apiGetHomeShelves, type CuratedShelf } from '@/api/services/classroom';
import { apiBrowseProducts } from '@/api/services/marketplace';
import { RevealStagger } from '@/components/comman/motion/Reveal';
import { PickedForChildRail } from '@/features/buyer/components/PickedForChildRail';
import { ShoppingForBar } from '@/features/buyer/components/ShoppingForBar';
import { HomeHero, HomeHeroSkeleton } from '@/features/buyer/components/home/HomeHero';
import { ShopByCategory } from '@/features/buyer/components/home/ShopByCategory';
import { ProductShelf } from '@/features/buyer/components/home/ProductShelf';
import { BundlesShelf } from '@/features/buyer/components/home/BundlesShelf';
import { PaymentTrustStrip } from '@/features/buyer/components/home/PaymentTrustStrip';
import { RecentlyViewedRail } from '@/features/buyer/components/home/RecentlyViewedRail';
import { HomeNewsletter } from '@/features/buyer/components/home/HomeNewsletter';
import { useHomeShelves } from '@/features/buyer/components/home/useHomeShelves';
import { dedupeInOrder, soldLabel } from '@/features/buyer/components/home/homeRules';

// Text lives in admin-edit/homeDefaults.ts (shared with the inline editor).
const TRUST_ITEMS = [{ Icon: Shield }, { Icon: CreditCard }, { Icon: RefreshCcw }, { Icon: Headset }];

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

/** Mirrors the API rule for the Featured sellers rail (logo, banner, bio of 30+ characters, 5+ published items) in case an older API answers. */
function isFeaturedSeller(s: PublicStoreListItem): boolean {
  return !!s.logo && !!s.coverImage && (s.description ?? '').trim().length >= 30 && (s.productCount ?? 0) >= 5;
}

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
function HomeLanding() {
  // Admin-editable copy (Admin → Platform Config → Homepage content); blank = built-in default below.
  const { config: publicConfig, loading: configLoading } = usePublicPlatformConfig();
  const hc = publicConfig?.homeContent ?? {};
  const trustItems = TRUST_ITEMS.map((d, i) => ({ ...d, ...effectiveHomeContent(hc).trustItems[i] }));
  const navigate = useNavigate();
  // Edudeen's curated, seasonal shelves ("Exam ki tayyari" etc.), set by the admin team.
  const [shelves, setShelves] = useState<CuratedShelf[]>([]);
  useEffect(() => { apiGetHomeShelves().then(res => setShelves(res.data ?? [])).catch(() => {}); }, []);
  // Listings the Edudeen team has featured (Admin → Listings → Feature).
  const [featured, setFeatured] = useState<MarketplaceProduct[]>([]);
  // The isFeatured check keeps the row honest on an API deploy that predates
  // the `featured` filter (it would otherwise return the newest products).
  useEffect(() => { apiBrowseProducts({ featured: true, limit: 10 }).then(res => setFeatured((res.data?.products ?? []).filter(p => p.isFeatured === true))).catch(() => {}); }, []);
  const isBuyer = useIsBuyer();
  usePageMeta({ title: 'Edudeen - Educational resources, books & courses from trusted sellers', description: 'Edudeen is an education marketplace: worksheets, books, digital downloads and courses for home and classroom from verified sellers.', canonical: '/' });

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [topStores, setTopStores] = useState<PublicStoreListItem[]>([]);

  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const reloadCategories = useCallback(() => { apiGetCategoryTree().then(res => setCategories(res.data ?? [])).catch(() => {}); }, []);
  useEffect(() => {
    let cancelled = false;
    apiGetCategoryTree()
      .then(res => { if (!cancelled) setCategories(res.data ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCategoriesLoaded(true); });
    return () => { cancelled = true; };
  }, []);
  // The hero is painted only once its text can no longer change: the admin's content is known (or cached from the last
  // visit) AND the category list has answered (the default second button reads "Explore <category>", so painting
  // earlier made "Browse all" flip to "Explore ..." a moment later). An admin-set second button needs no category.
  const heroReady = (!!publicConfig || !configLoading) && (categoriesLoaded || !!hc.heroSecondaryLabel);

  useEffect(() => {
    let cancelled = false;
    apiGetTopStores(10).then(res => { if (!cancelled) setTopStores((res.data?.stores ?? []).filter(isFeaturedSeller)); }).catch(() => {});
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
    navigate(q ? `/?search=${encodeURIComponent(q)}` : '/');
  };
  const clearSearch = () => setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    next.delete('search');
    return next;
  }, { replace: true });

  // ── Discovery rails: one unfiltered catalogue pool, same source the
  //    Marketplace page's own rails use ──
  const { products: featuredPool, loading: poolLoading } = useProductsByCategory(1, 24);

  // Deals are ranked over a much bigger slice of the catalogue than the first page. The ranking is shared with
  // the top-bar ticker (useTopBarDeals: one fetch, one maths helper), so every "Up to X% off" agrees.
  const normalFlashDeals = (topBarDeals?.allDeals.length ? topBarDeals.allDeals : featuredPool.map(p => ({ product: p, pct: productSalePct(p) })).filter(x => x.pct > 0).sort((a, b) => b.pct - a.pct))
    .filter(x => !!x.product.name?.trim() && (x.product.variants ?? []).length > 0)
    .slice(0, 10);
  // Premium members: the same slot shows the biggest member discounts (Premium Deals) instead of the seller / platform flash sale.
  const { deals: premiumDeals } = usePremiumDeals();
  const flashDeals = premiumDeals ?? normalFlashDeals;
  const topPicks = [...featuredPool]
    .sort((a, b) => (b.purchaseCount + b.averageRating * 10) - (a.purchaseCount + a.averageRating * 10))
    .slice(0, 10);

  const bestRated = [...featuredPool]
    .filter(p => p.averageRating > 0)
    .sort((a, b) => b.averageRating - a.averageRating || (b.totalRatings ?? 0) - (a.totalRatings ?? 0))
    .slice(0, 10);

  // The flash-sale timer counts down to the soonest-ending live sale campaign;
  // with no campaign running there's no timer (discounted items still show).
  const saleEnd = soonestSaleEnd(topBarDeals?.campaigns);
  // Premium members: a sale that is not public yet (the API only sends these to members).
  const earlyCampaign = (topBarDeals?.campaigns ?? []).find(c => c.earlyAccess) ?? null;
  const saleCountdown = useCountdownTo(saleEnd);
  const countdown = premiumDeals ? null : saleCountdown;

  // ── Home shelves with their own endpoints + the ONE de-dupe pass ──
  // A product appears in at most one section of the landing page, in render order: Flash Sale first, then
  // Bestsellers, Free resources, Featured by Edudeen, and each curated shelf. The catalogue grid at the bottom
  // ("Browse everything") is the complete list and is deliberately left out of this.
  const homeShelves = useHomeShelves();
  const unique = dedupeInOrder<string, MarketplaceProduct>(
    ['flash', 'bestsellers', 'featured', ...shelves.map(s => `shelf-${s._id}`)],
    {
      flash: flashDeals.map(d => d.product),
      bestsellers: homeShelves.bestsellers.items,
      featured,
      ...Object.fromEntries(shelves.map(s => [`shelf-${s._id}`, s.products])),
    },
    { bestsellers: 5, featured: 5, ...Object.fromEntries(shelves.map(s => [`shelf-${s._id}`, 5])) },
  );

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
  // Subject tabs come straight from the admin's categories (Admin → Categories).
  const shopTabs = useMemo<ShopTab[]>(() => categories.map(c => ({ id: catTabId(c._id), label: c.name, categoryId: c._id, node: c })), [categories]);

  // The category the hero's second button and the feature block open: the admin's pick, else the first category.
  const featuredTab = useMemo<ShopTab | null>(() => {
    const want = (hc.featuredCategory ?? '').trim().toLowerCase();
    return (want ? shopTabs.find(t => t.label.toLowerCase().includes(want)) : undefined) ?? shopTabs[0] ?? null;
  }, [shopTabs, hc.featuredCategory]);
  // What the page shows: stored text, else the built-in text. The inline editors start from this same object.
  const { lang } = useLanguage();
  const eff = useMemo(() => effectiveHomeContent(hc, { featuredLabel: featuredTab?.label, lang }), [hc, featuredTab?.label, lang]);

  // A tab id, or `cat-<id>` for a subcategory picked from the mega menu.
  const subjectTab: ShopTab | null = useMemo(() => {
    if (!subject) return null;
    const tab = shopTabs.find(t => t.id === subject);
    if (tab) return tab;
    const node = allCategories.find(c => catTabId(c._id) === subject);
    return node ? { id: subject, label: node.name, categoryId: node._id, node } : null;
  }, [subject, shopTabs, allCategories]);

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


  useEffect(() => {
    let cancelled = false;
    apiGetTestimonials(5)
      .then(res => { if (!cancelled) setTestimonials(res.data ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTestimonialsLoading(false); });
    return () => { cancelled = true; };
  }, []);



  return (
    <div className="bg-white min-h-full">

      {/* ── Header — the same navbar + mega-menu every shopping page uses ── */}
      <div className="sticky top-[var(--navbar-top,0px)] z-50 [&>nav]:!border-b-0">
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
        <ShoppingForBar className="mb-4" />

        {/* ── Admin banners / paid promotions (Admin → Banners, homepage slot) ── */}
        <PlacementBanner placement="homepageHero" className="mb-[25px]" />

        {/* ── Hero: admin content (text + desktop/phone picture); brand artwork when no picture is set. Same box while loading → no layout shift. ── */}
        <EditableHomeSection section="hero" defaults={eff} label="hero">
          {heroReady
            ? <HomeHero eff={eff} onPrimary={scrollToResources} onSecondary={() => selectSubject(featuredTab?.id ?? null)} />
            : <HomeHeroSkeleton />}
        </EditableHomeSection>

        {/* ── Promise strip ── */}
        <EditableHomeSection section="promise" defaults={eff} label="tick strip">
        <div className="flex flex-wrap justify-between md:justify-center gap-x-[15px] gap-y-2 md:gap-x-10 pt-2 pb-[27px] text-[12px] md:text-[14px] text-carbon border-b border-bone mb-[30px]">
          {eff.promiseItems.map(t => (
            <span key={t}><span className="text-brand-green">✓</span> {t}</span>
          ))}
        </div>
        </EditableHomeSection>

        {/* ── Shop by category ── */}
        <ShopByCategory categories={categories} loading={!categoriesLoaded} />

        {/* While an admin has the flash sale / deals under maintenance, their message replaces this block. */}
        <FeatureMaintenance feature="flash_sale">
        {/* ── Live sale campaign (Admin → Marketing → Campaigns), with its banner image ── */}
        <EditableDeals className="min-h-[56px] mb-12"><DealsBanner className="!px-0 !pt-0 mb-12" /></EditableDeals>

        {/* ── Flash sale ── */}
        {flashDeals.length > 0 && (
          <section id="deals" className="mb-12 scroll-mt-[150px]">
            <SectionHead
              eyebrow={premiumDeals ? "Your member savings" : "Limited-time savings"}
              title={premiumDeals ? "Premium Deals" : "Flash Sale"}
              icon={premiumDeals
                ? <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#fff6d6] text-[#8a6100]"><Crown size={14} /></span>
                : <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-error-bg text-error"><Zap size={14} className="fill-error" /></span>}
              action={countdown ? (
                <span className="shrink-0 flex items-center gap-[6px] text-[12px] sm:text-[13px] font-semibold text-slate">
                  <span>Ends in</span>
                  <span className="tabular-nums text-error font-bold">{countdown.text}</span>
                </span>
              ) : earlyCampaign && !premiumDeals ? <EarlyAccessChip startDate={earlyCampaign.startDate} /> : undefined}
            />
            <ScrollRow className="flex gap-3 pb-1 snap-x snap-mandatory">
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
            </ScrollRow>
          </section>
        )}
        </FeatureMaintenance>

        {/* ── 4-6. Bestsellers, free resources, bundles (each hides itself when it has nothing) ── */}
        <ProductShelf
          eyebrow="What parents and teachers buy" title="Bestsellers"
          action={{ label: 'View all', onClick: () => navigate('/?sort=popularity') }}
          items={unique.bestsellers} loading={homeShelves.bestsellers.loading} renderCard={renderResourceCard}
          note={p => { const s = soldLabel(p.purchaseCount); return s ? <p className="text-[12px] text-slate mt-1 mb-0">{s}</p> : null; }}
        />
        {/* ── Browse everything: category tabs + filters + 12 per page with "Show more". Sits right under Bestsellers. ── */}
        <section ref={resourcesRef} id="browse" className="scroll-mt-[150px] mb-12">
          <SectionHead
            eyebrow={searchQ ? 'Search results' : campaignId ? (activeCampaign?.name ?? 'Sale') : subjectTab ? subjectTab.label : 'Your next teaching moment'}
            title="Browse everything"
            sub="Filter by subject, grade, language and price."
          />

          <EditableCategories onChanged={reloadCategories} className="mb-5">
          <CategoryTabs
            tabs={shopTabs}
            activeId={subjectTab && !shopTabs.some(t => t.id === subjectTab.id) ? null : subject}
            onSelect={selectSubject}
            className="!px-0 mb-5"
          />
          </EditableCategories>

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

        <BundlesShelf bundles={homeShelves.bundles.items} loading={homeShelves.bundles.loading} />

        {/* ── Picked for the active child (My children) ── */}
        <PickedForChildRail renderCard={renderResourceCard} />

        {/* ── Featured by Edudeen (admin-featured listings) ── */}
        {unique.featured.length > 0 && (
          <section className="mb-12">
            <SectionHead eyebrow="Hand-picked by our team" title="Featured by Edudeen" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-[14px] gap-y-[25px] md:gap-x-[22px] md:gap-y-[28px]">
              {unique.featured.map(renderResourceCard)}
            </div>
          </section>
        )}

        {/* ── Edudeen picks (curated shelves) ── */}
        {shelves.map(s => {
          const items = unique[`shelf-${s._id}`] ?? [];
          if (items.length === 0) return null;
          return (
            <section key={s._id} className="mb-12">
              <SectionHead
                eyebrow="Edudeen picks"
                title={s.title}
                action={{ label: 'View all', onClick: () => navigate(`/picks/${s.slug}`) }}
              />
              {s.subtitle && <p className="text-[13.5px] text-graphite -mt-3 mb-4">{s.subtitle}</p>}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-[14px] gap-y-[25px] md:gap-x-[22px] md:gap-y-[28px]">
                {items.map(renderResourceCard)}
              </div>
            </section>
          );
        })}

        {/* ── Featured sellers ── */}
        {topStores.length > 0 && (
          <section className="mb-12">
            <SectionHead eyebrow="Meet the makers" title="Featured sellers" />
            <ScrollRow className="flex gap-3 pb-1 pt-1">
              {topStores.map(s => (
                <StoreFeatureCard key={s.storeId} store={s} onClick={slug => navigate(getStorePagePath(slug))} />
              ))}
            </ScrollRow>
          </section>
        )}

        {/* ── Collections ── */}
        <section className={clsx('mb-12 grid grid-cols-1 gap-[22px]', !isBuyer && 'md:grid-cols-2')}>
          <EditableHomeSection section="feature" defaults={eff} label="feature block">
          <div className="rounded-[14px] p-7 bg-[#edf5e7]">
            <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-[13px]">{eff.featureEyebrow}</p>
            <h2 className="font-serif font-normal text-[27px] leading-[1.2] text-carbon mb-[10px]">{eff.featureHeading}</h2>
            <p className="text-[14px] text-carbon max-w-[390px] mb-4">
              {eff.featureText}
            </p>
            <button onClick={() => selectSubject(featuredTab?.id ?? null)} className={linkButtonClass}>
              {eff.featureLinkLabel}
            </button>
          </div>
          </EditableHomeSection>
          {!isBuyer && (
            <EditableHomeSection section="creator" defaults={eff} label="seller invitation block">
            <div className="rounded-[14px] p-7 bg-[#f7f3d9]">
              <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-[13px]">{eff.creatorEyebrow}</p>
              <h2 className="font-serif font-normal text-[27px] leading-[1.2] text-carbon mb-[10px]">{eff.creatorHeading}</h2>
              <p className="text-[14px] text-carbon max-w-[390px] mb-4">
                {eff.creatorText}
              </p>
              <Link to="/become-a-seller" className={linkButtonClass}>
                {eff.creatorLinkLabel}
              </Link>
            </div>
            </EditableHomeSection>
          )}
        </section>

        {/* ── Trust ── */}
        <section className="mb-12">
          <SectionHead eyebrow="Shop with confidence" title="Why buyers choose Edudeen" />
          <EditableHomeSection section="trust" defaults={eff} label="trust items"><TrustServiceStrip variant="card" items={trustItems} /></EditableHomeSection>
          <PaymentTrustStrip />
        </section>

        {/* ── Platform stats - the single stats block; real numbers only past the admin's thresholds ── */}
        <PlatformStatsSection />

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
                          <p className="text-[12px] text-slate">{t.storeName ? `Owner, ${t.storeName}` : t.isVerifiedSeller ? 'Verified Seller' : 'Edudeen member'}</p>
                        </div>
                      </figcaption>
                    </figure>
                  ))}
            </RevealStagger>
          </section>
        )}
        {/* ── Recently viewed (only when the visitor has some) ── */}
        <RecentlyViewedRail />



      </main>

      {/* ── Newsletter (the one sign-up block; the footer's own is switched off here) ── */}
      <HomeNewsletter />

      <Footer showNewsletter={false} />
    </div>
  );
}

/** The homepage is the shop: with a category / search / filter in the URL it shows the browse view, otherwise the landing page. */
export function Homepage() {
  const [params] = useSearchParams();
  return isBrowseMode(params) ? <HomeBrowse /> : <HomeLanding />;
}
