import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStickyBox } from '@/hooks/useStickyBox';
import { getStorefrontUrl } from '@/utils/storefrontUrl';
import { useProductsByCategory } from '@/hooks/marketplace/useProductsByCategory';
import { useProductSearch } from '@/hooks/marketplace/useProductSearch';
import { apiGetProductById, type MarketplaceSortBy } from '@/api/services/marketplace';
import { useBanners } from '@/hooks/useBanners';
import { useCountdownToMidnight } from '@/hooks/useCountdownToMidnight';
import { useCartContext } from '@/contexts/CartContext';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { Button } from '@/components/comman/ui/Button';
import { Pagination, FilterDropdown, BuyerNavbar, AppDownloadBanner, Footer, TrustServiceStrip, StoreFeatureCard, EmptyState, DealsBanner, useCountdown, SkeletonBox } from '@/components/comman/ui';
import { ProductCard, ProductCardSkeleton } from '@/components/comman/marketplace/ProductCard';
import { FlashSaleCard } from '@/components/comman/marketplace/FlashSaleCard';
import { FilterAccordionSection, FilterRadioRow, FilterCheckboxRow, FilterStarRow, ActiveFilterChip, PriceRangeSlider, PRICE_MIN, PRICE_MAX } from '@/components/comman/marketplace/FilterAccordionSection';
import { MegaMenuBar, CategoryBarIcon, CategoriesMegaContent } from '@/components/comman/marketplace/MegaMenuBar';
import { Modal } from '@/components/comman/ui/Modal';
import { BannerCarousel } from '@/components/comman/marketplace/BannerCarousel';
import {
  ShoppingBag,
  SlidersHorizontal, X, Zap, LayoutGrid, LayoutList,
  RefreshCcw, Headset, ArrowRight,
  Shield, CreditCard, BadgeCheck,
} from 'lucide-react';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { currencySymbol } from '@/utils/currency';
import { apiGetCategoryTree, type CategoryNode } from '@/api/services/categories';
import { apiGetTopStores, apiGetPlatformStats, type PublicStoreListItem, type PlatformStats } from '@/api/services/store';
import { apiSearchStores } from '@/api/services/search';
import { scrollRootToTop } from '@/utils/scrollRoot';
import { apiGetPublicActiveCampaigns, type PublicCampaign } from '@/api/services/marketing/publicCampaigns';



const compactNumber = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const compactCurrency = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'USD' });

// ── Filter data ───────────────────────────────────────────────────────────────
const TYPE_ITEMS = ['Physical', 'Digital', 'Educational'];
const RATING_ITEMS: { label: string; stars: number }[] = [
  { label: '4★ & up', stars: 4 },
  { label: '3★ & up', stars: 3 },
];

interface FilterState { priceRange: [number, number]; type: string[]; minRating: number | null; }

function FilterPanel({ filters, onToggleType, onRatingChange, onPriceRangeChange, categories = [], selectedCategory, onCategoryChange }: {
  filters:  FilterState;
  onToggleType: (value: string) => void;
  onRatingChange: (stars: number | null) => void;
  onPriceRangeChange: (value: [number, number]) => void;
  categories:       CategoryNode[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
}) {
  const isPriceRangeActive = filters.priceRange[0] !== PRICE_MIN || filters.priceRange[1] !== PRICE_MAX;
  return (
    <div>
      {categories.length > 0 && (
        <FilterAccordionSection title="Category" activeCount={selectedCategory ? 1 : 0}>
          <div className="flex flex-col">
            <FilterRadioRow label="All Categories" active={selectedCategory === ''} onClick={() => onCategoryChange('')} count={categories.reduce((sum, c) => sum + (c.productCount ?? 0), 0)} />
            {categories.map(c => (
              <FilterRadioRow key={c._id} label={c.name} active={selectedCategory === c._id} onClick={() => onCategoryChange(c._id)} count={c.productCount} />
            ))}
          </div>
        </FilterAccordionSection>
      )}
      <FilterAccordionSection title="Price Range" activeCount={isPriceRangeActive ? 1 : 0}>
        <PriceRangeSlider value={filters.priceRange} onChange={onPriceRangeChange} />
      </FilterAccordionSection>
      <FilterAccordionSection title="Product Type" activeCount={filters.type.length}>
        <div className="flex flex-col">
          {TYPE_ITEMS.map(label => (
            <FilterCheckboxRow key={label} label={label} active={filters.type.includes(label)} onClick={() => onToggleType(label)} />
          ))}
        </div>
      </FilterAccordionSection>
      <FilterAccordionSection title="Rating" activeCount={filters.minRating ? 1 : 0}>
        <div className="flex flex-col">
          {RATING_ITEMS.map(({ label, stars }) => (
            <FilterStarRow key={label} stars={stars} active={filters.minRating === stars} onClick={() => onRatingChange(filters.minRating === stars ? null : stars)} />
          ))}
        </div>
      </FilterAccordionSection>
    </div>
  );
}

// ── Config ────────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest'         },
  { value: 'price-asc',  label: 'Price: Low–High' },
  { value: 'price-desc', label: 'Price: High–Low' },
  { value: 'best-rated', label: 'Best Rated'      },
  { value: 'popularity', label: 'Best Sellers'    },
];

// The page's one trust-badges row, sitting right below the product grid and
// above AppDownloadBanner. Each item gets its own accent color (not a
// uniform orange) — rendered as a soft mint card via TrustServiceStrip's
// `variant="card"`.
const TRUST_ITEMS = [
  {
    Icon: Shield, label: 'Buyer Protection', sub: "Get full refund if product isn't as described",
    accent: { bg: '#E6F1FB', icon: '#1A72C2' },
  },
  {
    Icon: CreditCard, label: 'Secure Payments', sub: '100% secure and trusted payment methods',
    accent: { bg: '#EAF2F8', icon: '#174771' },
  },
  {
    Icon: RefreshCcw, label: 'Easy Returns', sub: 'Hassle-free returns within 7 days',
    accent: { bg: '#EBF7EF', icon: '#2D8A4E' },
  },
  {
    Icon: BadgeCheck, label: 'Verified Sellers', sub: 'Shop from trusted and verified stores',
    accent: { bg: '#F5F0FB', icon: '#7C3AED' },
  },
  {
    Icon: Headset, label: '24/7 Support', sub: "We're here anytime you need us",
    accent: { bg: '#F1EFE8', icon: '#4A4945' },
  },
];


// Recursively search a category tree (root categories with nested `children`,
// capped at 2 levels server-side) by slug or id — used to resolve the
// `:slugOrId` route param and legacy `?category=<id>` links against the tree
// the page already has loaded, with no extra network round-trip.
function findCategoryBySlug(nodes: CategoryNode[], slug: string): CategoryNode | null {
  for (const n of nodes) {
    if (n.slug === slug) return n;
    const found = findCategoryBySlug(n.children ?? [], slug);
    if (found) return found;
  }
  return null;
}
function findCategoryById(nodes: CategoryNode[], id: string): CategoryNode | null {
  for (const n of nodes) {
    if (n._id === id) return n;
    const found = findCategoryById(n.children ?? [], id);
    if (found) return found;
  }
  return null;
}
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

export function Marketplace() {
  const navigate = useNavigate();
  // Optional — bare `/marketplace` browses everything. When present, either
  // a category slug (new canonical form) or a 24-hex legacy product id (old
  // bookmarked `/marketplace/:id` product links) — see the resolution
  // effects below for how each is handled.
  const { slugOrId } = useParams<{ slugOrId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  usePageTitle('Marketplace');

  const isLegacyProductId = !!slugOrId && OBJECT_ID_RE.test(slugOrId);

  // A legacy product id resolves+redirects to the new canonical
  // /product/:slug immediately — it was never a category, so it must never
  // reach the category-resolution logic below or the product-listing fetch.
  useEffect(() => {
    if (!isLegacyProductId || !slugOrId) return;
    let cancelled = false;
    apiGetProductById(slugOrId)
      .then(res => {
        if (cancelled) return;
        const resolvedSlug = res.data?.product?.slug;
        navigate(resolvedSlug ? `/product/${resolvedSlug}` : '/marketplace', { replace: true });
      })
      .catch(() => { if (!cancelled) navigate('/marketplace', { replace: true }); });
    return () => { cancelled = true; };
  }, [isLegacyProductId, slugOrId, navigate]);

  // Every one of these is seeded from the URL on first mount so a shared/
  // bookmarked/back-button link reproduces the exact same browse state.
  const [sortBy,        setSortBy]        = useState(() => searchParams.get('sort') ?? 'newest');
  const [viewMode,      setViewMode]      = useState<'grid' | 'list'>('grid');
  const [page,          setPage]          = useState(() => { const p = Number(searchParams.get('page')); return p > 0 ? p : 1; });
  const [mobileFilters, setMobileFilters] = useState(false);
  // "More" at the end of the category quick-link row — opens the categories/
  // subcategories/popular-products mega-panel (CategoriesMegaContent, reused
  // as-is from the navbar's own "All Categories" dropdown), not a second/
  // duplicated category browser.
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  // The floating Filters tab starts fully off-screen (not just invisible —
  // translated past the viewport edge) and slides in shortly after the page
  // has settled, instead of being visible immediately on load.
  const [showFilterTab, setShowFilterTab] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowFilterTab(true), 700);
    return () => clearTimeout(t);
  }, []);
  // Flash Sale rail auto-advances one card at a time — paused on hover/touch
  // so a shopper reading or reaching for a card never has it slide away
  // mid-interaction.
  const flashSaleTrackRef = useRef<HTMLDivElement>(null);
  const [flashSalePaused, setFlashSalePaused] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => {
    const [minStr, maxStr] = searchParams.get('price')?.split('-') ?? [];
    const minPrice = Number(minStr);
    const maxPrice = Number(maxStr);
    const ratingParam = Number(searchParams.get('rating'));
    return {
      priceRange: [
        minPrice > 0 ? minPrice : PRICE_MIN,
        maxPrice > 0 ? maxPrice : PRICE_MAX,
      ],
      type: searchParams.get('type')?.split(',').filter(Boolean) ?? [],
      minRating: ratingParam >= 1 && ratingParam <= 5 ? ratingParam : null,
    };
  });
  const isPriceRangeActive = filters.priceRange[0] !== PRICE_MIN || filters.priceRange[1] !== PRICE_MAX;
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') ?? '');
  const [search,      setSearch]      = useState(() => (searchParams.get('search') ?? '').trim().toLowerCase());
  const [categories,       setCategories]       = useState<CategoryNode[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  // Resolved from the `:slugOrId` route param against the loaded category
  // tree once it's available (see the resolution effect below) — this is
  // the category `_id` every existing filter/fetch below already keys off.
  const [selectedCategory, setSelectedCategory] = useState('');
  // A plain derived read, not state — `?campaign=` is the one piece of
  // browse state that still lives entirely in the query string, so there's
  // nothing async to resolve and no separate sync effect needed.
  const campaignFilterId = searchParams.get('campaign') ?? '';
  const [campaignFilterInfo, setCampaignFilterInfo] = useState<PublicCampaign | null>(null);
  const [topStores,        setTopStores]        = useState<PublicStoreListItem[]>([]);
  const [storeResults,     setStoreResults]      = useState<PublicStoreListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiGetCategoryTree()
      .then(res => { if (!cancelled) setCategories(res.data ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCategoriesLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  // Resolve the category path segment once the tree has loaded — gated so a
  // direct /marketplace/:categorySlug visit never fires an unfiltered fetch
  // first and a filtered one a moment later. A legacy product id never
  // reaches here (handled by the effect above). A slug that doesn't match
  // any category (typo'd/stale link) falls back to the unfiltered browse
  // view rather than hanging in a permanent "still loading" state.
  useEffect(() => {
    if (isLegacyProductId) return;
    if (!slugOrId) { setSelectedCategory(''); return; }
    if (!categoriesLoaded) return;
    const match = findCategoryBySlug(categories, slugOrId);
    if (match) {
      setSelectedCategory(match._id);
    } else {
      navigate('/marketplace', { replace: true });
    }
  }, [slugOrId, isLegacyProductId, categoriesLoaded, categories, navigate]);

  // Legacy `?category=<id>` links (old query-param form) — resolve against
  // the same loaded tree and redirect into the new path-based form once.
  useEffect(() => {
    if (!categoriesLoaded) return;
    const legacyCategoryId = searchParams.get('category');
    if (!legacyCategoryId) return;
    const match = findCategoryById(categories, legacyCategoryId);
    const rest = new URLSearchParams(searchParams);
    rest.delete('category');
    const qs = rest.toString();
    const path = match ? `/marketplace/${match.slug}` : '/marketplace';
    navigate(`${path}${qs ? `?${qs}` : ''}`, { replace: true });
  }, [categoriesLoaded, categories, searchParams, navigate]);

  // Campaign metadata (name/discount) for the filter banner — the product
  // list itself only needs the id (passed straight to the backend), but the
  // banner needs something human-readable to show what's being browsed.
  useEffect(() => {
    if (!campaignFilterId) { setCampaignFilterInfo(null); return; }
    let cancelled = false;
    apiGetPublicActiveCampaigns()
      .then(res => { if (!cancelled) setCampaignFilterInfo((res.data ?? []).find(c => c._id === campaignFilterId || c.slug === campaignFilterId) ?? null); })
      .catch(() => { if (!cancelled) setCampaignFilterInfo(null); });
    return () => { cancelled = true; };
  }, [campaignFilterId]);

  const campaignFilterCountdown = useCountdown(campaignFilterInfo?.endDate ?? '');

  const clearCampaignFilter = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('campaign');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    apiGetTopStores(10)
      .then(res => { if (!cancelled) setTopStores(res.data?.stores ?? []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Store/seller matches for the navbar search — runs alongside the existing
  // client-side product filter, so search covers both products and stores.
  useEffect(() => {
    if (!search) { setStoreResults([]); return; }
    let cancelled = false;
    apiSearchStores(search, 1, 6)
      .then(res => { if (!cancelled) setStoreResults(res.data?.stores ?? []); })
      .catch(() => { if (!cancelled) setStoreResults([]); });
    return () => { cancelled = true; };
  }, [search]);

  // Reset to page 1 whenever the active facet set actually changes (new
  // category/campaign/search/sort) — not on every page-number change itself,
  // which would otherwise loop with the URL write-back effect below.
  const isFirstFacetRun = useRef(true);
  useEffect(() => {
    if (isFirstFacetRun.current) { isFirstFacetRun.current = false; return; }
    setPage(1);
    // Price/rating/type are now real server-side facets (see serverMinPrice/
    // serverMinRating/serverProductType above), so changing them must reset
    // the page like every other facet — otherwise a filter change while on
    // page 3 would fetch page 3 of the NEW filtered set instead of page 1.
  }, [selectedCategory, campaignFilterId, search, sortBy, filters.priceRange[0], filters.priceRange[1], filters.type.join(','), filters.minRating]);

  // A legacy `?category=<id>` hasn't been resolved into the new path form
  // yet — skip the write-back below so it doesn't strip that param (via its
  // own unrelated setSearchParams replace) before the legacy-redirect effect
  // above gets a chance to read and act on it.
  const hasPendingLegacyCategory = !!searchParams.get('category');

  // Write the current browse state into the URL — shareable/bookmarkable,
  // and what lets a back/forward navigation or a pasted link reproduce this
  // exact view. `replace` so typing/paging doesn't spam browser history.
  // Category lives in the path segment (see handleCategoryChange), not here.
  useEffect(() => {
    if (hasPendingLegacyCategory) return;
    const next = new URLSearchParams();
    if (campaignFilterId)    next.set('campaign', campaignFilterId);
    if (search)              next.set('search', search);
    if (sortBy !== 'newest') next.set('sort', sortBy);
    if (page > 1)            next.set('page', String(page));
    if (filters.priceRange[0] !== PRICE_MIN || filters.priceRange[1] !== PRICE_MAX) {
      next.set('price', `${filters.priceRange[0]}-${filters.priceRange[1]}`);
    }
    if (filters.type.length) next.set('type', filters.type.join(','));
    if (filters.minRating)   next.set('rating', String(filters.minRating));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPendingLegacyCategory, campaignFilterId, search, sortBy, page, filters.priceRange[0], filters.priceRange[1], filters.type.join(','), filters.minRating]);

  // Category selection updates the path segment (not the query string) —
  // an explicit navigate rather than local state alone, preserving whatever
  // other query params (search/sort/filters) are already active.
  const handleCategoryChange = (id: string) => {
    setSelectedCategory(id);
    const match = id ? findCategoryById(categories, id) : null;
    const path = match ? `/marketplace/${match.slug}` : '/marketplace';
    const qs = searchParams.toString();
    navigate(`${path}${qs ? `?${qs}` : ''}`);
  };

  // Browsing (an active search, category, or campaign filter) replaces the
  // homepage-style landing view (Hero + Trust Strip) with results, immediately
  // — same behavior Amazon/Alibaba use once a shopper has committed to a query.
  const isBrowsing = !!search || !!selectedCategory || !!campaignFilterId;

  const LIMIT = 20;

  // Real server-side facets — the backend's products-by-category endpoint
  // already supports minPrice/maxPrice/minRating/sortBy (see
  // ProductsController), it just wasn't being sent. `productType` only goes
  // server-side when exactly one type is checked (the endpoint takes a
  // single value, not a set) — with 0 or 2+ types checked, `filtered` below
  // still does a light client-side pass on top of the (now-correct) fetched
  // page, same as before for that one edge case only.
  const serverSortBy: MarketplaceSortBy | undefined =
    sortBy === 'price-asc' ? 'price_asc' :
    sortBy === 'price-desc' ? 'price_desc' :
    sortBy === 'best-rated' ? 'rating' :
    sortBy === 'popularity' ? 'popularity' : undefined;
  const serverProductType = filters.type.length === 1
    ? (filters.type[0].toLowerCase() as 'physical' | 'digital' | 'educational')
    : undefined;
  const serverMinPrice = isPriceRangeActive ? filters.priceRange[0] : undefined;
  const serverMaxPrice = isPriceRangeActive && filters.priceRange[1] < PRICE_MAX ? filters.priceRange[1] : undefined;
  const serverMinRating = filters.minRating ?? undefined;

  // True while a :categorySlug in the URL hasn't been resolved against the
  // category tree yet — see the resolution effect above. Keeps the fetch
  // below from firing once unfiltered (before the tree loads) and again a
  // moment later once the real category id is known.
  const categoryPending = !isLegacyProductId && !!slugOrId && !selectedCategory;

  // A real search term switches the data source entirely to the dedicated
  // full-catalog search endpoint (useProductSearch) instead of narrowing
  // whatever single category-scoped page happened to already be loaded —
  // that endpoint doesn't support category/price/rating/type facets, so an
  // active search intentionally takes priority over those for now.
  const browseResult = useProductsByCategory(
    page, LIMIT, selectedCategory || undefined, serverProductType, undefined, undefined, campaignFilterId || undefined,
    serverMinPrice, serverMaxPrice, serverMinRating, serverSortBy, !categoryPending,
  );
  const searchResult = useProductSearch(search, page, LIMIT);
  const { products, total, loading, error, refetch } = search ? searchResult : browseResult;
  const { addToCart, adding, error: cartError, clearError: clearCartError } = useCartContext();
  // Tracks which product's Add to Cart request just failed, so that one
  // card (and only that one) can show a real recoverable-error state
  // ("Try Again") instead of the button silently reverting to idle — the
  // shopper otherwise has no signal a click didn't work.
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
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const priceSymbol = currencySymbol(displayCurrency);
  const { banners: marketplaceBanners, loading: marketplaceBannersLoading } = useBanners('marketplaceHero');
  // Category Hero — same hero region, but scoped to the `categoryHero`
  // placement whenever the shopper is browsing a specific category (via the
  // mega-menu/sidebar/?category= link), instead of the generic marketplace-wide banner.
  const { banners: categoryBanners, loading: categoryBannersLoading } = useBanners('categoryHero');
  const banners = selectedCategory ? categoryBanners : marketplaceBanners;
  const bannersLoading = selectedCategory ? categoryBannersLoading : marketplaceBannersLoading;
  const countdown = useCountdownToMidnight();

  // Real platform trust stats (sellers/GMV/buyers/rating) — same fields and
  // labels ForSellersPage's own cream stat strip already uses, rendered here
  // between the deal banner and the hero carousel.
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [platformStatsLoading, setPlatformStatsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    apiGetPlatformStats()
      .then(res => { if (!cancelled) setPlatformStats(res.data); })
      .catch(() => { /* non-critical — strip just stays hidden */ })
      .finally(() => { if (!cancelled) setPlatformStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const trustStatItems = platformStats ? [
    { value: `${compactNumber.format(platformStats.sellersCount)}+`,  label: 'Active Sellers' },
    { value: `${compactCurrency.format(platformStats.gmv)}+`,         label: 'GMV Processed' },
    { value: `${compactNumber.format(platformStats.buyersCount)}+`,   label: 'Registered Buyers' },
    { value: platformStats.ratingCount > 0 ? `${platformStats.avgRating.toFixed(1)} ★` : '—', label: 'Average Rating' },
  ] : [];

  // Marketplace-wide pool (unfiltered by the user's current category/search) used to
  // surface real, currently-active discounts and real purchase/rating signals —
  // independent of whatever the shopper happens to be filtering by right now.
  const { products: featuredPool } = useProductsByCategory(1, 24);

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

  // Desktop filters sidebar sticks to `top-[88px]` (below the sticky navbar
  // + mega-menu row) while scrolling through the taller product column, and
  // releases at the row's bottom edge — via `useStickyBox`, not CSS
  // `position: sticky`, since the app's real scroll container is
  // RootLayout's custom `position: fixed` wrapper, not `window`, and native
  // sticky doesn't reliably engage against that. Re-measures whenever the
  // above-the-fold async content (hero banners/categories/flash deals)
  // finishes loading and changes this row's natural page position — plain
  // scroll/resize listeners alone don't catch that, so without this the
  // sidebar could stick against a still-loading (shorter) layout and then
  // never re-release once the real content pushed the row further down.
  const { wrapperRef: filterWrapperRef, contentRef: filterContentRef, wrapperStyle: filterWrapperStyle, contentStyle: filterContentStyle } =
    useStickyBox(88, [bannersLoading, categories.length, flashDeals.length]);

  const topPicks = [...featuredPool]
    .sort((a, b) => (b.purchaseCount + b.averageRating * 10) - (a.purchaseCount + a.averageRating * 10))
    .slice(0, 10);

  // Distinct real signal from topPicks — pure rating (tie-broken by review
  // count), not the purchase+rating blend, so Top Picks' second section
  // isn't just the same list under a different name.
  const bestRated = [...featuredPool]
    .filter(p => p.averageRating > 0)
    .sort((a, b) => b.averageRating - a.averageRating || (b.totalRatings ?? 0) - (a.totalRatings ?? 0))
    .slice(0, 10);

  // Auto-scroll the Flash Sale rail one card at a time, looping back to the
  // start at the end — pauses on hover/touch (see the handlers on the rail
  // below) so it never fights a shopper's own scroll/tap.
  useEffect(() => {
    const track = flashSaleTrackRef.current;
    if (!track || flashSalePaused || flashDeals.length === 0) return;
    const id = setInterval(() => {
      const card = track.firstElementChild as HTMLElement | null;
      const step = (card?.offsetWidth ?? 140) + 12; // card width + the rail's gap-3
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step, behavior: 'smooth' });
    }, 2200);
    return () => clearInterval(id);
  }, [flashSalePaused, flashDeals.length]);

  const totalPages = Math.ceil(total / LIMIT) || 1;
  const activeFilterCount = (isPriceRangeActive ? 1 : 0) + filters.type.length + (filters.minRating ? 1 : 0);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const toggleType = (value: string) => {
    setFilters(prev => ({
      ...prev,
      type: prev.type.includes(value) ? prev.type.filter(v => v !== value) : [...prev.type, value],
    }));
  };

  const setMinRating = (stars: number | null) => setFilters(prev => ({ ...prev, minRating: stars }));

  const setPriceRange = (range: [number, number]) => setFilters(prev => ({ ...prev, priceRange: range }));

  const clearFilters = () => setFilters({ priceRange: [PRICE_MIN, PRICE_MAX], type: [], minRating: null });

  // Active filter chip strip — one removable chip per currently-applied facet,
  // so a shopper can see (and undo) exactly what's narrowing the grid without
  // opening the sidebar accordion it came from.
  const activeFilterChips: { key: string; label: string; onRemove: () => void }[] = [
    ...(selectedCategory
      ? [{ key: 'category', label: findCategoryById(categories, selectedCategory)?.name ?? 'Category', onRemove: () => handleCategoryChange('') }]
      : []),
    ...(isPriceRangeActive
      ? [{
          key: 'price',
          label: filters.priceRange[1] >= PRICE_MAX ? `$${filters.priceRange[0]}+` : `$${filters.priceRange[0]}–$${filters.priceRange[1]}`,
          onRemove: () => setPriceRange([PRICE_MIN, PRICE_MAX]),
        }]
      : []),
    ...filters.type.map(t => ({ key: `type-${t}`, label: t, onRemove: () => toggleType(t) })),
    ...(filters.minRating
      ? [{ key: 'rating', label: `${filters.minRating}★ & up`, onRemove: () => setMinRating(null) }]
      : []),
  ];

  const goToPage = (p: number) => { setPage(p); scrollRootToTop('smooth'); };

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

  // Price/rating/sort/search/single-selected-type are all real server-side
  // facets now (see serverMinPrice/serverMaxPrice/serverMinRating/
  // serverSortBy/serverProductType above and useProductSearch for the search
  // path) — `products`/`total` already reflect the correctly filtered full
  // result set, not just today's page. The only thing still applied
  // client-side here is the 2-or-more-types-checked case, since the backend
  // only accepts one `productType` value at a time.
  const multiTypeSelected = filters.type.length > 1;
  const filtered = multiTypeSelected
    ? products.filter(p => {
        const pType = p.productType ?? p.type ?? 'physical';
        return filters.type.some(t => t.toLowerCase() === pType);
      })
    : products;

  // Only the multi-type-select edge case still only narrows the current
  // page rather than the full result set — everything else (search, price,
  // rating, sort, a single selected type) is a real server query, so the
  // total/range below is accurate for it.
  const isNarrowedView = multiTypeSelected;
  const rangeStart = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const rangeEnd   = Math.min(page * LIMIT, total);
  const countLabel = isNarrowedView
    ? `${filtered.length} matching on this page`
    : `${rangeStart}–${rangeEnd} of ${total} Products`;

  return (
    <div className="min-h-screen bg-cream">

      {/* Navbar + category/mega-menu row stay pinned together as one sticky
          header block. Sticking each independently doesn't work — a
          `sticky` element can only stay stuck while its own parent still
          overlaps the viewport, and MegaMenuBar's own wrapper is barely
          taller than the row itself, so it would unstick again 1px after
          its natural position. Wrapping both in one taller sticky container
          gives the real scroll runway needed. */}
      {/* `[&>nav]:!border-b-0` — BuyerNavbar draws its own bottom border once
          scrolled (for when it's used standalone), which reads as a stray
          divider line now that MegaMenuBar is stacked directly under it as
          one visually continuous sticky block; MegaMenuBar's own border-b
          is the only seam that should show. */}
      <div className="sticky top-0 z-50 [&>nav]:!border-b-0">
        <BuyerNavbar
          search={{
            value: searchInput,
            onChange: setSearchInput,
            placeholder: 'Search marketplace...',
            categories: categories.map(c => ({ id: c._id, name: c.name })),
            onCategorySelect: handleCategoryChange,
            popularStores: topStores,
          }}
        />

        {/* ── Marketplace navigation — single merged row: All Categories + Flash
           Sale/Top Picks/Featured Stores/About (real discovery features, kept —
           not removed), plus the utility links on the right. Sits directly
           under the navbar so the full navigation is visible before a shopper
           ever scrolls past the hero. ── */}
        <MegaMenuBar
          compact
          categories={categories}
          topPicks={topPicks}
          bestRated={bestRated}
          flashDeals={flashDeals}
          topStores={topStores}
          countdown={countdown}
          onShopCategory={handleCategoryChange}
          onProductClick={handleCardClick}
          onStoreClick={slug => window.location.href = getStorefrontUrl(slug)}
          onTrendingTerm={term => { setSearchInput(term); setSearch(term); }}
          onNavigate={navigate}
        />
      </div>

      {/* ── Hero carousel — real marketplace/category banner data, inset with
         side padding + rounded corners as its own floating card rather than
         edge-to-edge. Uses BannerCarousel as-is (real impression/click
         tracking, Ken Burns pan, swipe-safe dot indicators) — not a new
         carousel implementation. The hero's own height is reserved and a
         skeleton shown the instant the page mounts, while `apiGetBanners` is
         still in flight — previously this whole block rendered nothing
         until the fetch resolved, so the hero popped in late and shoved
         everything below it down (a real layout shift, not just a "slow"
         feeling). ── */}
      {(banners.length > 0 || bannersLoading) && (
        <div className="px-4 sm:px-6 lg:px-10 py-3">
          <div className="relative w-full h-[200px] sm:h-[320px] lg:h-[420px] xl:h-[460px] overflow-hidden rounded-2xl">
            {banners.length > 0
              ? <BannerCarousel entityType="banner" banners={banners.map(b => ({ _id: b._id, order: b.order, imageUrl: b.bannerImage, linkUrl: b.urlOnTap }))} />
              : <SkeletonBox className="absolute inset-0 w-full h-full" rounded="16px" />}
          </div>
        </div>
      )}

      {/* ── Trust stats — real platform numbers (sellers/GMV/buyers/rating),
         cream band sitting between the hero carousel above and the deal
         banner below. Same cream/centered treatment ForSellersPage already
         uses for its own stat strip, reused here for consistency rather
         than inventing new styling. Renders nothing once loaded if the
         fetch failed (no fake placeholders). ── */}
      {(platformStatsLoading || trustStatItems.length > 0) && (
        <div className="bg-cream">
          <div className="px-4 sm:px-6 lg:px-10 py-3 sm:py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center max-w-[1100px] mx-auto">
              {platformStatsLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="text-center">
                      <SkeletonBox width={70} height={28} className="mb-1.5 mx-auto" />
                      <SkeletonBox width={90} height={12} className="mx-auto" />
                    </div>
                  ))
                : trustStatItems.map(s => (
                    <div key={s.label} className="text-center">
                      <p className="block text-[22px] sm:text-[26px] font-bold text-brand-orange">{s.value}</p>
                      <p className="text-[12px] text-slate">{s.label}</p>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Flash Sale strip — the real active platform sale campaign
         (self-fetching `DealsBanner`, compact mode with `label`), sitting
         below the hero/trust-stats band, above the category quick-links —
         inset with the same side padding + vertical breathing room as the
         hero carousel above it, instead of floating edge-to-edge. Owns its
         own countdown + "Shop Now" CTA internally. Renders nothing if
         there's no active campaign, same honest fallback DealsBanner
         already has everywhere else it's used — no longer gated on the
         unrelated `flashDeals` product pool (that gate made this mount only
         once a separate, slower products fetch resolved, so it visibly
         popped in late even after its own campaign data was already
         ready). ── */}
      {!isBrowsing && (
        <div className="px-4 sm:px-6 lg:px-10 py-3">
          {/* DealsBanner's own compact+label surface is deliberately unrounded
             (built for edge-to-edge placement) — now that it's inset with
             side padding like the hero carousel above it, this wrapper clips
             it into the same `rounded-2xl` card shape from the outside,
             matching the hero's own `overflow-hidden rounded-2xl` wrapper,
             instead of changing the shared component's built-in style (which
             EducationMarketplace also uses full-bleed, unchanged). */}
          <div className="overflow-hidden rounded-2xl">
            <DealsBanner compact label className="h-auto w-full sm:h-[100px]" />
          </div>
        </div>
      )}

      {/* ── Category quick-links — icon + name + real product count per
         top-level category (same data the sidebar's Category filter and
         the mega-menu already use), plus a "More" link into the full
         categories mega-panel. Reuses CategoryBarIcon (real uploaded image,
         falls back to a tag glyph) rather than inventing a second icon
         mapping. Sits right under the hero carousel, above the search bar/
         Flash Sale card. ── */}
      {categories.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-10 pt-5 pb-2">
          <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto scrollbar-hide pb-1">
            {categories.slice(0, 8).map(cat => (
              <button
                key={cat._id}
                onClick={() => handleCategoryChange(cat._id)}
                className={clsx(
                  'flex flex-col items-center gap-[6px] shrink-0 w-[76px] text-center cursor-pointer group bg-transparent border-none p-0',
                  selectedCategory === cat._id && 'text-brand-orange',
                )}
              >
                <span className={clsx(
                  'flex size-11 items-center justify-center rounded-full border transition-colors duration-150',
                  selectedCategory === cat._id ? 'border-brand-orange bg-brand-pale-orange' : 'border-bone bg-white group-hover:border-brand-orange/40',
                )}>
                  <CategoryBarIcon category={cat} />
                </span>
                <span className="text-[11px] font-semibold text-charcoal leading-tight line-clamp-1 group-hover:text-brand-orange transition-colors">{cat.name}</span>
                {typeof cat.productCount === 'number' && (
                  <span className="text-[9.5px] text-slate leading-none">{cat.productCount.toLocaleString()}+ items</span>
                )}
              </button>
            ))}
            {categories.length > 8 && (
              <button
                onClick={() => setCategoriesModalOpen(true)}
                className="flex flex-col items-center gap-[6px] shrink-0 w-[76px] text-center cursor-pointer group bg-transparent border-none p-0"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-brand-orange text-white group-hover:bg-brand-deep-orange transition-colors">
                  <ArrowRight size={16} />
                </span>
                <span className="text-[11px] font-semibold text-charcoal leading-tight">More</span>
              </button>
            )}
          </div>
        </div>
      )}

      {categoriesModalOpen && (
        <Modal title="All Categories" onClose={() => setCategoriesModalOpen(false)} width={900}>
          <CategoriesMegaContent
            categories={categories}
            fixedHeight={520}
            onShopCategory={id => { handleCategoryChange(id); setCategoriesModalOpen(false); }}
          />
        </Modal>
      )}

      {/* ── Flash Sale — a compact, always-visible rail (real discount signal
         from the same `flashDeals` pool the mega-menu dropdown already uses),
         not just hidden behind a hover trigger. Hidden while actively
         browsing/searching — a discovery rail doesn't belong above a
         shopper's own filtered results. Reuses FlashSaleCard as-is (already
         used by Homepage's rail) rather than a new component. ── */}
      {!isBrowsing && flashDeals.length > 0 && (
        <div id="flash-sale-rail" className="px-4 sm:px-6 lg:px-10 pt-5 scroll-mt-[76px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-error-bg text-error">
                <Zap size={14} className="fill-error" />
              </span>
              <h2 className="font-serif text-[16px] sm:text-[19px] font-bold text-carbon tracking-[-0.01em]">Flash Sale</h2>
            </div>
            <div className="flex items-center gap-[6px] text-[11px] sm:text-[12px] font-semibold text-slate">
              <span className="hidden sm:inline">Ends in</span>
              <span className="tabular-nums text-error font-bold">{countdown.h}:{countdown.m}:{countdown.s}</span>
            </div>
          </div>
          <div
            ref={flashSaleTrackRef}
            onMouseEnter={() => setFlashSalePaused(true)}
            onMouseLeave={() => setFlashSalePaused(false)}
            onTouchStart={() => setFlashSalePaused(true)}
            onTouchEnd={() => setTimeout(() => setFlashSalePaused(false), 1500)}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory scroll-smooth"
          >
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
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-10 py-4 sm:py-5 lg:py-6">

        {/* Results heading — only when browsing (search/category/campaign), so
            a shopper always knows what narrowed the grid they're looking at.
            Category/campaign already get their own indicator further down
            (the removable category chip / the campaign banner) — this only
            fills the one real gap: there was no visible confirmation of what
            was typed into the search box. */}
        {isBrowsing && search && (
          <p className="text-[13px] text-slate mb-4">
            Search results for <span className="font-semibold text-carbon">"{search}"</span>
          </p>
        )}

        {/* Sort/view toolbar — Filters now lives on its own tab stuck to the
           left edge of the viewport on mobile/tablet (see below); a real
           persistent sidebar takes over at `lg` instead. */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <span className="text-[13px] font-medium text-slate">
            {!loading && (error ? 'Error loading' : <>Showing <span className="text-carbon font-semibold">{countLabel}</span></>)}
          </span>
          <div className="flex items-center gap-3">
            <FilterDropdown options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
            <div className="hidden sm:flex items-center gap-[2px] rounded-lg border border-bone bg-white p-[3px]">
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={clsx(
                  'flex items-center justify-center w-8 h-8 rounded-md cursor-pointer transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                  viewMode === 'grid' ? 'bg-brand-pale-orange text-brand-orange' : 'bg-transparent text-slate hover:text-charcoal',
                )}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
                className={clsx(
                  'flex items-center justify-center w-8 h-8 rounded-md cursor-pointer transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                  viewMode === 'list' ? 'bg-brand-pale-orange text-brand-orange' : 'bg-transparent text-slate hover:text-charcoal',
                )}
              >
                <LayoutList size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Stores matching the current search — sits above the product grid so a
            search for a seller's name surfaces the store itself, not just products. */}
        {search && storeResults.length > 0 && (
          <div className="mb-5">
            <p className="text-[11px] font-semibold text-slate uppercase tracking-[0.08em] mb-[10px]">
              Stores matching "{search}"
            </p>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
              {storeResults.map(s => (
                <StoreFeatureCard key={s.storeId} store={s} onClick={slug => window.location.href = getStorefrontUrl(slug)} />
              ))}
            </div>
          </div>
        )}

        {/* Active campaign filter — cleared explicitly, never silently dropped,
            so a buyer always knows they're viewing a narrowed "sale" set.
            When the campaign has an uploaded banner image, this is its real
            showcase — there's enough height here for a normal photo to read
            properly (unlike the thin DealsBanner ticker, which only ever
            shows a small recognizable preview of the same image). */}
        {campaignFilterId && (
          campaignFilterInfo?.bannerImage ? (
            /* Same layered orange→light-orange promo card as the hero Flash
               Sale strip's `DealsBanner label` card (animated gradient,
               soft highlight, dot texture, glow blobs) — image first (left,
               wide + fixed-size so any campaign's image lands in the same
               box), then the real campaign data from the API response,
               then a live countdown + a way to leave the filter on the
               right. */
            <div className="relative mb-5 h-[110px] w-full overflow-hidden rounded-2xl border border-brand-orange/20">
              <div className="gradient-drift absolute inset-0 bg-gradient-to-r from-brand-orange via-[#e28b63] to-brand-pale-orange" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.22),transparent_55%)]" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] bg-[length:14px_14px]" />
              <div className="pointer-events-none absolute -top-8 left-[30%] size-24 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 right-[15%] size-28 rounded-full bg-[#7a3520]/20 blur-2xl" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30" />

              <div className="relative z-[1] flex h-full items-stretch gap-4 px-5 py-4">
                <div className="relative flex items-center justify-center w-[160px] sm:w-[220px] h-full shrink-0 py-3 pl-3">
                  <div className="relative h-full w-full rounded-[14px] border border-white/25 bg-white/10 backdrop-blur-sm p-2 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)]">
                    <img src={campaignFilterInfo.bannerImage} alt="" className="max-h-full max-w-full object-contain rounded-[10px]" />
                  </div>
                  {campaignFilterInfo.discountType === 'percentage' && campaignFilterInfo.discountValue != null && (
                    <span className="absolute top-1 right-1 rotate-6 flex flex-col items-center justify-center size-[30px] rounded-full bg-error text-white border-2 border-white/50 shadow-md z-[1]">
                      <span className="text-[8px] font-bold leading-none">-{campaignFilterInfo.discountValue}%</span>
                      <span className="text-[4px] font-semibold uppercase tracking-wide leading-none mt-[0.5px]">off</span>
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center gap-[5px] pl-4 pr-3">
                  <span className="inline-flex w-fit items-center gap-[5px] rounded-full bg-white px-[9px] py-[4px] text-[9px] font-bold uppercase tracking-wide text-brand-deep-orange shadow-sm">
                    <Zap size={10} className="fill-brand-deep-orange" /> Limited Time
                  </span>
                  <span className="font-serif text-[17px] font-bold text-carbon leading-tight truncate">{campaignFilterInfo.name}</span>
                  <span className="text-[12px] font-semibold text-brand-deep-orange leading-none truncate">
                    {campaignFilterInfo.discountType === 'percentage' ? `UP TO ${campaignFilterInfo.discountValue}% OFF` : campaignFilterInfo.discountType === 'fixed' && campaignFilterInfo.discountValue != null ? `${priceSymbol}${convert(campaignFilterInfo.discountValue as number, campaignFilterInfo.currency ?? 'USD')} OFF` : 'SPECIAL DEALS'}
                  </span>
                  <span className="text-[10px] text-charcoal/60 truncate">
                    {!loading && `${total} product${total === 1 ? '' : 's'} from participating stores`}
                  </span>
                </div>

                <div className="hidden sm:block w-px self-stretch my-4 bg-white/30 shrink-0" />

                <div className="flex flex-col items-center justify-center gap-[8px] shrink-0 pl-3 pr-4">
                  <div className="flex items-center gap-[3px]">
                    {[['H', campaignFilterCountdown.hours], ['M', campaignFilterCountdown.minutes], ['S', campaignFilterCountdown.seconds]].map(([label, val]) => (
                      <div key={label as string} className="flex flex-col items-center justify-center w-[28px] h-[28px] rounded-[8px] bg-carbon text-white shadow-sm">
                        <span className="text-[10px] font-bold tabular-nums leading-none">{String(val).padStart(2, '0')}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={clearCampaignFilter}
                    className="inline-flex items-center gap-[5px] rounded-full bg-white border border-white/50 px-3.5 py-[6px] text-[11px] font-bold text-brand-deep-orange whitespace-nowrap shadow-md cursor-pointer hover:bg-brand-pale-orange transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                  >
                    <X size={11} /> Clear
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-5 flex items-center gap-3 rounded-[12px] border border-brand-orange/25 bg-brand-pale-orange px-4 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-brand-orange">
                <Zap size={15} className="fill-brand-orange" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-brand-deep-orange truncate">
                  {campaignFilterInfo ? `Shopping: ${campaignFilterInfo.name}` : 'Shopping a platform sale'}
                </p>
                <p className="text-[11.5px] text-charcoal/70">
                  {!loading && `${total} product${total === 1 ? '' : 's'} from participating stores`}
                  {campaignFilterInfo?.discountType && campaignFilterInfo.discountValue != null && (
                    <> · {campaignFilterInfo.discountType === 'percentage' ? `Up to ${campaignFilterInfo.discountValue}% off` : `${priceSymbol}${convert(campaignFilterInfo.discountValue as number, campaignFilterInfo.currency ?? 'USD')} off`}</>
                  )}
                </p>
              </div>
              <button
                onClick={clearCampaignFilter}
                className="shrink-0 flex items-center gap-1 rounded-full border border-brand-orange/30 bg-white px-3 min-h-10 text-[12px] font-semibold text-brand-deep-orange cursor-pointer hover:bg-brand-pale-orange transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                <X size={12} /> Clear
              </button>
            </div>
          )
        )}

        {/* ── Filters sidebar + products — a real persistent left column at
           `lg` and up (Amazon/Daraz-style), same FilterPanel the mobile
           bottom-sheet drawer below already renders (one filter UI, two
           places it can appear, not a second implementation). ── */}
        <div className="lg:flex lg:items-start lg:gap-6">
          <aside ref={filterWrapperRef} className="hidden lg:block w-[264px] shrink-0" style={filterWrapperStyle}>
            <div ref={filterContentRef} className="bg-white rounded-2xl border border-bone p-4" style={filterContentStyle}>
              <div className="flex items-center justify-between mb-1">
                <p className="flex items-center gap-[7px] text-[13.5px] font-bold text-carbon">
                  <SlidersHorizontal size={14} className="text-charcoal" /> Filters
                </p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-[11px] font-medium text-slate hover:text-brand-orange transition-colors duration-200 cursor-pointer bg-transparent border-none p-0"
                  >
                    <RefreshCcw size={11} /> Reset All
                  </button>
                )}
              </div>
              <FilterPanel filters={filters} onToggleType={toggleType} onRatingChange={setMinRating} onPriceRangeChange={setPriceRange} categories={categories} selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange} />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
                {/* Active filter chips — one removable chip per applied facet */}
                {activeFilterChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {activeFilterChips.map(chip => (
                      <ActiveFilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
                    ))}
                  </div>
                )}

                {/* Mobile: product count (sm+ already shows this inline in the toolbar above) */}
                <p className="sm:hidden text-[12px] text-slate mb-3">
                  {!loading && !error && countLabel}
                </p>

                {error && !loading && (
                  <div className="p-6 flex flex-col items-center gap-3 text-center bg-error-bg rounded-[12px] border border-error-border text-error text-[13px]">
                    <span>{error}</span>
                    <Button variant="outline" size="sm" onClick={refetch}>Try again</Button>
                  </div>
                )}

                {/* With a persistent sidebar sharing width at `lg`+, the grid
                    stops one column short of the old sidebar-less ceiling:
                    2 @ 320-767 → 3 @ md → 4 @ lg/xl instead of 5, so cards
                    never get cramped against the filter column. */}
                <div
                  id="marketplace-grid"
                  className={clsx(
                    'scroll-mt-[76px]',
                    viewMode === 'list'
                      ? 'flex flex-col gap-3'
                      : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5',
                  )}
                >
                  {loading
                    ? Array.from({ length: 10 }).map((_, i) => <ProductCardSkeleton key={i} layout={viewMode} />)
                    : filtered.map(p => {
                        const defVariant = (p.variants ?? []).find(v => v.isDefault) ?? p.variants?.[0];
                        const vId = defVariant?._id ?? '';
                        return (
                          <ProductCard
                            key={p._id}
                            layout={viewMode}
                            product={p}
                            onClick={handleCardClick}
                            isAdding={adding === vId}
                            addToCartFailed={addToCartFailedId === vId}
                            onAddToCart={handleAddToCart}
                            isWishlisted={isWishlisted(p._id, vId)}
                            isWishlisting={wishlisting === vId}
                            onToggleWishlist={handleToggleWishlist}
                            highlightQuery={search || undefined}
                          />
                        );
                      })
                  }
                </div>

                {!loading && !error && filtered.length === 0 && (
                  <div>
                    <EmptyState
                      icon={<ShoppingBag size={30} className="text-brand-orange" />}
                      title={search || activeFilterCount > 0 ? 'No products match' : 'No products yet'}
                      description={
                        search || activeFilterCount > 0
                          ? 'No products match your search or filters.'
                          : 'No products found in this category yet.'
                      }
                      action={
                        search
                          ? { label: 'Clear search', onClick: () => { setSearchInput(''); setSearch(''); } }
                          : activeFilterCount > 0
                          ? { label: 'Clear filters', onClick: clearFilters }
                          : undefined
                      }
                    />
                    {/* A dead-end result shouldn't be a dead end — real categories,
                       not a fabricated "you might also like" list, so a shopper
                       always has somewhere else to go from here. */}
                    {categories.length > 0 && (
                      <div className="flex flex-col items-center gap-3 -mt-2 pb-2">
                        <p className="text-[12px] font-semibold text-slate">Or browse a category instead</p>
                        <div className="flex flex-wrap justify-center gap-2 max-w-[560px]">
                          {categories.slice(0, 8).map(cat => (
                            <button
                              key={cat._id}
                              onClick={() => handleCategoryChange(cat._id)}
                              className="px-[14px] py-[7px] rounded-full text-[12.5px] font-medium bg-cream text-charcoal border border-bone hover:border-brand-orange hover:text-brand-orange transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                            >
                              {cat.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!loading && !error && totalPages > 1 && (
                  <div className="flex flex-col items-center gap-2 mt-8 pb-2">
                    <Pagination page={page} total={total} perPage={LIMIT} onChange={goToPage} />
                    <p className="text-[12px] text-slate text-center">
                      Page {page} of {totalPages} · {total} products total
                    </p>
                  </div>
                )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-10 pt-2">
        <TrustServiceStrip variant="card" items={TRUST_ITEMS} />
      </div>

      {/* ── App download + footer ── */}
      <div id="app-download" className="px-4 sm:px-6 lg:px-10 pt-5 pb-8 scroll-mt-[76px]">
        <AppDownloadBanner variant="compact" />
      </div>
      <Footer showNewsletter={false} />

      {/* ── Filters — a real sidebar, not an inline panel or a bottom sheet.
         A slim vertical ribbon tab stays stuck to the left edge of the
         viewport, vertically centered; clicking it slides a full-height
         drawer in from the left, over the page. The label is rotated as one
         line (not stacked letter-by-letter — that reads much slower) so it
         reads like a spine label on a folder tab. ── */}
      <button
        onClick={() => setMobileFilters(o => !o)}
        aria-expanded={mobileFilters}
        aria-label="Toggle filters"
        className={clsx(
          'lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-[58] flex flex-col items-center gap-2 rounded-r-xl border border-l-0 border-white/10 py-[10px] px-[6px] text-white bg-gradient-to-b from-charcoal to-brand-orange shadow-[0_8px_24px_-4px_rgba(23,71,113,0.4),0_4px_14px_rgba(20,15,10,0.25)] cursor-pointer transition-all duration-500 ease-out hover:px-2 hover:brightness-110 hover:shadow-[0_10px_28px_-4px_rgba(23,71,113,0.5),0_4px_14px_rgba(20,15,10,0.3)]',
          showFilterTab ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0',
          (mobileFilters || activeFilterCount > 0) && 'ring-2 ring-brand-orange/50',
        )}
      >
        <SlidersHorizontal size={11} strokeWidth={2} className="shrink-0" />
        {/* `writing-mode:vertical-rl` (not a `rotate-90` transform on
           horizontal text) — a transform is purely visual and doesn't
           affect layout, so the button would still be laid out as wide as
           the unrotated text; vertical-rl actually reflows the text
           vertically, so the box sizes correctly narrow+tall, and Latin
           glyphs rotate clockwise automatically (browser default
           text-orientation: mixed) reading top-to-bottom. */}
        <span className="[writing-mode:vertical-rl] whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.05em] my-0.5">
          Filter Products
        </span>
        {activeFilterCount > 0 && (
          <span className="min-w-[15px] h-[15px] rounded-full bg-white text-brand-deep-orange text-[8px] font-bold flex items-center justify-center px-[3px] leading-none shrink-0">
            {activeFilterCount}
          </span>
        )}
      </button>

      <div
        className={clsx(
          'lg:hidden fixed inset-0 bg-black/40 z-[59] transition-opacity duration-300',
          mobileFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setMobileFilters(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileFilters}
        className={clsx(
          'lg:hidden fixed top-0 left-0 h-full w-[300px] max-w-[85vw] z-[60] bg-white shadow-2xl outline-none overflow-y-auto',
          'transition-transform duration-300 ease-out',
          mobileFilters ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="sticky top-0 bg-white z-[1] flex items-center justify-between gap-2 px-5 py-4 border-b border-bone">
          <div className="flex items-center gap-[9px]">
            <SlidersHorizontal size={15} className="text-charcoal" strokeWidth={2} />
            <span className="text-[14.5px] font-bold text-carbon tracking-[-0.01em]">Filters</span>
            {activeFilterCount > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-brand-orange text-white text-[9px] font-bold flex items-center justify-center px-[4px] leading-none">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-[12px] font-medium text-slate hover:text-brand-orange transition-colors duration-200 cursor-pointer p-2 -m-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                <RefreshCcw size={12} /> Reset All
              </button>
            )}
            <button
              onClick={() => setMobileFilters(false)}
              aria-label="Close filters"
              className="size-9 rounded-full bg-cream flex items-center justify-center cursor-pointer hover:bg-bone transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <X size={14} className="text-charcoal" />
            </button>
          </div>
        </div>
        <div className="px-5 py-4 pb-24">
          <FilterPanel filters={filters} onToggleType={toggleType} onRatingChange={setMinRating} onPriceRangeChange={setPriceRange} categories={categories} selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange} />
        </div>

        {/* Sticky "show results" footer — filtering is already live as you
           toggle each control above, so this isn't really an "Apply" action;
           it's the same confirm-and-close affordance Amazon/Shopify's mobile
           filter sheets use, so closing the drawer never requires scrolling
           back up to find the header's X button. */}
        <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-bone px-5 py-3.5">
          <button
            onClick={() => setMobileFilters(false)}
            className="w-full flex items-center justify-center gap-2 bg-brand-orange text-white text-[13.5px] font-bold rounded-xl py-[11px] cursor-pointer hover:bg-brand-deep-orange transition-colors duration-200"
          >
            Show {total} {total === 1 ? 'Result' : 'Results'}
          </button>
        </div>
      </div>
    </div>
  );
}
