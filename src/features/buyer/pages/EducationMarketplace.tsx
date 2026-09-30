import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getStorefrontUrl } from '@/utils/storefrontUrl';
import { useSellEntry } from '@/hooks/auth/useSellEntry';
import { useProductsByCategory } from '@/hooks/marketplace/useProductsByCategory';
import type { MarketplaceSortBy } from '@/api/services/marketplace';
import { useEducationFacets } from '@/hooks/marketplace/useEducationFacets';
import { useBanners } from '@/hooks/useBanners';
import { useCountdownToMidnight } from '@/hooks/useCountdownToMidnight';
import { useCartContext } from '@/contexts/CartContext';
import { useWishlistContext } from '@/contexts/WishlistContext';
import { apiGenerateWorksheetTrial } from '@/api/services/marketplace';
import { EDUCATION_LEVELS } from '@/api/services/product';
import { apiGetTopStores, type PublicStoreListItem } from '@/api/services/store';
import { Button } from '@/components/comman/ui/Button';
import { ProductCard, ProductCardSkeleton } from '@/components/comman/marketplace/ProductCard';
import { FilterAccordionSection, FilterChipPill, FilterRadioRow, FilterCheckboxRow, FilterStarRow, ActiveFilterChip, PriceRangeSlider, PRICE_MIN, PRICE_MAX } from '@/components/comman/marketplace/FilterAccordionSection';
import { BannerCarousel } from '@/components/comman/marketplace/BannerCarousel';
import { FlashSaleCard } from '@/components/comman/marketplace/FlashSaleCard';
import { MegaMenuBar, RailCard, MegaSectionLabel } from '@/components/comman/marketplace/MegaMenuBar';
import { BuyerNavbar, AppDownloadBanner, Footer, FilterDropdown, Modal, DealsBanner, TrustServiceStrip, Pagination, EmptyState, SkeletonBox } from '@/components/comman/ui';
import { ArrowRight, Sparkles, SlidersHorizontal, Loader2, RefreshCcw, GraduationCap, ShieldCheck, Store, X, Zap, LayoutGrid, LayoutList, Wallet, Headset, Truck, Smartphone } from 'lucide-react';

// Bottom-of-page trust strip — plain facts, distinct set/wording from the
// persuasive header badges — same convention as the general Marketplace.
const BOTTOM_TRUST_ITEMS = [
  { Icon: Truck,       label: 'Books Delivered to You'  },
  { Icon: RefreshCcw,  label: 'Return Requests'        },
  { Icon: ShieldCheck, label: 'Secure Checkout'        },
  { Icon: Headset,     label: 'Help When You Need It'  },
];

const SUBJECTS = ['Math', 'ELA', 'Science', 'Social Studies', 'Art', 'SEL'];
const RATING_ITEMS: { label: string; stars: number }[] = [
  { label: '4★ & up', stars: 4 },
  { label: '3★ & up', stars: 3 },
];

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest'          },
  { value: 'price-asc',  label: 'Price: Low–High' },
  { value: 'price-desc', label: 'Price: High–Low' },
  { value: 'best-rated', label: 'Best Rated'      },
  { value: 'popularity', label: 'Best Sellers'    },
];

const LEVEL_LABEL: Record<string, string> = Object.fromEntries(EDUCATION_LEVELS.map(l => [l.value, l.label]));

// ── AI Worksheet Builder — free trial modal ──────────────────────────────────
function WorksheetTrialModal({ onClose }: { onClose: () => void }) {
  const [subject, setSubject]             = useState('');
  const [gradeLevel, setGradeLevel]       = useState('');
  const [topicsInput, setTopicsInput]     = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [result, setResult]               = useState<{ title: string; sections: { instructions: string; questions: { prompt: string; type: string; choices?: string[]; answer?: string }[] }[] } | null>(null);

  const handleGenerate = async () => {
    const topics = topicsInput.split(',').map(t => t.trim()).filter(Boolean);
    if (!subject || !gradeLevel || topics.length === 0) {
      setError('Subject, grade level, and at least one topic are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await apiGenerateWorksheetTrial({
        subject, gradeLevel, topics, questionCount, includeAnswerKey,
      });
      setResult(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate a worksheet right now — please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  const inp = 'w-full px-3 py-2 text-[13px] border border-bone rounded-lg text-charcoal bg-white placeholder:text-[#b5b3ac] outline-none';

  return (
    <Modal title="AI Worksheet Builder — Free Trial" onClose={onClose} width={560}>
      {!result ? (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-slate">Try it free — up to 6 questions. Create a full worksheet from your seller dashboard's AI Studio.</p>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject (e.g. Fractions)" className={inp} />
          <input value={gradeLevel} onChange={e => setGradeLevel(e.target.value)} placeholder="Grade level (e.g. Grade 4)" className={inp} />
          <input value={topicsInput} onChange={e => setTopicsInput(e.target.value)} placeholder="Topics, comma separated" className={inp} />
          <div className="flex items-center gap-3">
            <label className="text-[12px] text-charcoal flex items-center gap-2">
              Questions:
              <input type="number" min={1} max={6} value={questionCount}
                onChange={e => setQuestionCount(Math.min(6, Math.max(1, Number(e.target.value))))}
                className={`${inp} w-16`} />
            </label>
            <label className="text-[12px] text-charcoal flex items-center gap-2">
              <input type="checkbox" checked={includeAnswerKey} onChange={e => setIncludeAnswerKey(e.target.checked)} />
              Include answer key
            </label>
          </div>
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <Button variant="primary" size="md" onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <><Loader2 size={14} className="animate-spin inline mr-1" />Generating…</> : 'Generate Worksheet'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          <p className="text-[15px] font-bold text-charcoal">{result.title}</p>
          {result.sections.map((s, i) => (
            <div key={i} className="border border-bone rounded-lg p-3">
              <p className="text-[12px] text-slate mb-2">{s.instructions}</p>
              <ol className="flex flex-col gap-2 list-decimal list-inside">
                {s.questions.map((q, qi) => (
                  <li key={qi} className="text-[13px] text-charcoal">
                    {q.prompt}
                    {q.choices && q.choices.length > 0 && (
                      <ul className="mt-1 ml-4 text-[12px] text-slate list-disc list-inside">
                        {q.choices.map((c, ci) => <li key={ci}>{c}</li>)}
                      </ul>
                    )}
                    {q.answer && <p className="text-[11px] text-success mt-1">Answer: {q.answer}</p>}
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <p className="text-[11px] text-slate text-center">Like what you see? Sellers get the full builder (up to 40 questions, PDF export) in the seller AI Studio.</p>
        </div>
      )}
    </Modal>
  );
}

// ── Filter sidebar — same accordion/pill components as the general Marketplace ──
function EducationFilterPanel({
  levels, otherLevels, facetsLoading,
  activeLevel, onLevelChange, activeOtherSlug, onOtherSlugChange,
  activeSubjects, onToggleSubject,
  priceRange, onPriceRangeChange, minRating, onRatingChange,
}: {
  levels: { level: string; count: number }[];
  otherLevels: { slug: string; displayName: string; count: number }[];
  facetsLoading: boolean;
  activeLevel: string;
  onLevelChange: (level: string) => void;
  activeOtherSlug: string;
  onOtherSlugChange: (slug: string) => void;
  activeSubjects: string[];
  onToggleSubject: (s: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (v: [number, number]) => void;
  minRating: number | null;
  onRatingChange: (stars: number | null) => void;
}) {
  return (
    <div>
      <FilterAccordionSection title="Education Level">
        <div className="flex flex-col">
          <FilterRadioRow label="All Levels" active={activeLevel === ''} onClick={() => onLevelChange('')} count={levels.reduce((sum, l) => sum + (l.count ?? 0), 0)} />
          {!facetsLoading && levels.map(l => (
            <FilterRadioRow
              key={l.level}
              label={LEVEL_LABEL[l.level] ?? l.level}
              count={l.count}
              active={activeLevel === l.level}
              onClick={() => onLevelChange(l.level)}
            />
          ))}
        </div>
      </FilterAccordionSection>

      {activeLevel === 'other' && otherLevels.length > 0 && (
        <FilterAccordionSection title="Other">
          <div className="flex flex-col">
            <FilterRadioRow label="All" active={activeOtherSlug === ''} onClick={() => onOtherSlugChange('')} />
            {otherLevels.map(o => (
              <FilterRadioRow
                key={o.slug}
                label={o.displayName}
                count={o.count}
                active={activeOtherSlug === o.slug}
                onClick={() => onOtherSlugChange(o.slug)}
              />
            ))}
          </div>
        </FilterAccordionSection>
      )}

      <FilterAccordionSection title="Subject">
        <div className="flex flex-col">
          {SUBJECTS.map(s => (
            <FilterCheckboxRow key={s} label={s} active={activeSubjects.includes(s)} onClick={() => onToggleSubject(s)} />
          ))}
        </div>
      </FilterAccordionSection>

      <FilterAccordionSection title="Price Range">
        <PriceRangeSlider value={priceRange} onChange={onPriceRangeChange} />
      </FilterAccordionSection>

      <FilterAccordionSection title="Rating">
        <div className="flex flex-col">
          {RATING_ITEMS.map(({ label, stars }) => (
            <FilterStarRow key={label} stars={stars} active={minRating === stars} onClick={() => onRatingChange(minRating === stars ? null : stars)} />
          ))}
        </div>
      </FilterAccordionSection>
    </div>
  );
}

// ── Mega-menu "Grade Levels" panel — Education has no real CategoryNode tree
// (that's a general-marketplace concept), so this reuses the same real facet
// data as the sidebar (levels/subjects) instead of forcing it into a category
// shape it doesn't have. Passed to MegaMenuBar's categoriesContent override. ──
function EducationCategoriesMegaContent({
  levels, otherLevels, activeLevel, onLevelChange, activeOtherSlug, onOtherSlugChange,
  activeSubjects, onToggleSubject, topPicks, onProductClick, showSpotlight = true,
  fixedHeight,
}: {
  levels: { level: string; count: number }[];
  otherLevels: { slug: string; displayName: string; count: number }[];
  activeLevel: string;
  onLevelChange: (level: string) => void;
  activeOtherSlug: string;
  onOtherSlugChange: (slug: string) => void;
  activeSubjects: string[];
  onToggleSubject: (s: string) => void;
  topPicks: import('@/api/services/marketplace').MarketplaceProduct[];
  onProductClick: (id: string) => void;
  /** Hides the "Popular Resources" column — for callers that just want the
   *  grade-levels/subjects browse experience (e.g. the "Grade Levels for
   *  you" modal) without a third products column. */
  showSpotlight?: boolean;
  /** When set, columns 1 & 2 lock to this pixel height with their own
   *  independent scroll beneath a fixed header, so expanding "Other Levels"
   *  never resizes the modal around it — same fixed-size pattern as
   *  Marketplace's "Categories for you" modal. Omitted by the navbar's
   *  hover dropdown, which stays content-sized as before. */
  fixedHeight?: number;
}) {
  const colStyle = fixedHeight ? { height: fixedHeight } : undefined;
  return (
    <div className="flex gap-8">
      <div className="w-[220px] shrink-0 flex flex-col border-r border-bone pr-6" style={colStyle}>
        <MegaSectionLabel>Grade Levels</MegaSectionLabel>
        <div className={clsx('flex flex-col gap-[2px] overflow-y-auto pr-1 -mr-1', fixedHeight && 'flex-1 min-h-0')}>
          <button
            onClick={() => onLevelChange('')}
            className={`w-full text-left px-[10px] py-[9px] rounded-lg text-[12.5px] font-medium bg-transparent border-none cursor-pointer transition-colors ${activeLevel === '' ? 'bg-brand-pale-orange text-brand-orange' : 'text-charcoal hover:bg-cream'}`}
          >
            All Levels
          </button>
          {levels.map(l => (
            <button
              key={l.level}
              onClick={() => onLevelChange(l.level)}
              className={`w-full text-left px-[10px] py-[9px] rounded-lg text-[12.5px] font-medium bg-transparent border-none cursor-pointer transition-colors ${activeLevel === l.level ? 'bg-brand-pale-orange text-brand-orange' : 'text-charcoal hover:bg-cream'}`}
            >
              {LEVEL_LABEL[l.level] ?? l.level} ({l.count})
            </button>
          ))}
          {activeLevel === 'other' && otherLevels.map(o => (
            <button
              key={o.slug}
              onClick={() => onOtherSlugChange(o.slug)}
              className={`w-full text-left pl-[22px] pr-[10px] py-[7px] rounded-lg text-[12px] font-medium bg-transparent border-none cursor-pointer transition-colors ${activeOtherSlug === o.slug ? 'text-brand-orange' : 'text-slate hover:text-charcoal'}`}
            >
              {o.displayName} ({o.count})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col border-r border-bone pr-8" style={colStyle}>
        <MegaSectionLabel>Subjects</MegaSectionLabel>
        <div className={clsx('flex flex-wrap gap-[7px] overflow-y-auto pr-1 -mr-1', fixedHeight && 'flex-1 min-h-0')}>
          {SUBJECTS.map(s => (
            <FilterChipPill key={s} label={s} active={activeSubjects.includes(s)} onClick={() => onToggleSubject(s)} />
          ))}
        </div>
      </div>

      {showSpotlight && (
        <div className="shrink-0">
          <MegaSectionLabel>Popular Resources</MegaSectionLabel>
          {topPicks.length === 0 ? (
            <p className="text-[12px] text-slate">Nothing trending yet.</p>
          ) : (
            <div className="flex gap-3">
              {topPicks.slice(0, 4).map(p => <RailCard key={p._id} product={p} onClick={onProductClick} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export function EducationMarketplace() {
  const navigate = useNavigate();
  // EDUCATION_LEVELS values are already machine-readable (e.g. 'primary_school'),
  // so — unlike Marketplace's category slug — this needs no async tree lookup;
  // the route param IS the filter value, used directly.
  const { levelSlug } = useParams<{ levelSlug?: string }>();
  const activeLevel = levelSlug ?? '';
  const [searchParams, setSearchParams] = useSearchParams();
  usePageTitle('Education');
  const { addToCart, adding, error: cartError, clearError: clearCartError } = useCartContext();
  // Same recoverable-error surfacing as Marketplace.tsx — a failed add-to-cart
  // must not silently revert to idle.
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

  // Every one of these is seeded from the URL on first mount so a shared/
  // bookmarked/back-button link reproduces the exact same browse state —
  // same convention as the general Marketplace page. `activeLevel` itself
  // comes from the route param above, not from here.
  const [activeOtherSlug, setActiveOtherSlug] = useState(() => searchParams.get('otherLevel') ?? '');
  const [activeSubjects,  setActiveSubjects]  = useState<string[]>(() => searchParams.get('subjects')?.split(',').filter(Boolean) ?? []);
  const [priceRange,      setPriceRange]      = useState<[number, number]>(() => {
    const [minStr, maxStr] = searchParams.get('price')?.split('-') ?? [];
    const minPrice = Number(minStr);
    const maxPrice = Number(maxStr);
    return [minPrice > 0 ? minPrice : PRICE_MIN, maxPrice > 0 ? maxPrice : PRICE_MAX];
  });
  const [minRating, setMinRating] = useState<number | null>(() => {
    const r = Number(searchParams.get('rating'));
    return r >= 1 && r <= 5 ? r : null;
  });
  const [searchQuery,     setSearchQuery]     = useState(() => searchParams.get('search') ?? '');
  const [sortBy,          setSortBy]          = useState(() => searchParams.get('sort') ?? 'newest');
  const [viewMode,        setViewMode]        = useState<'grid' | 'list'>('grid');
  const [showAiTrial,     setShowAiTrial]     = useState(false);
  const [mobileFilters,   setMobileFilters]   = useState(false);
  // "More" at the end of the grade-level quick-link row — opens the same
  // grade-levels/subjects mega-panel the navbar's own "All Category"
  // dropdown already uses (EducationCategoriesMegaContent, reused as-is).
  const [levelsModalOpen, setLevelsModalOpen] = useState(false);
  const sellEntry = useSellEntry();
  // Same off-screen-then-slide-in entrance as the general Marketplace's
  // filter tab — starts fully off-screen, not just invisible.
  const [showFilterTab, setShowFilterTab] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowFilterTab(true), 700);
    return () => clearTimeout(t);
  }, []);
  const [page,            setPage]            = useState(() => { const p = Number(searchParams.get('page')); return p > 0 ? p : 1; });
  // Flash Sale rail auto-advances one card at a time — paused on hover/touch,
  // same behavior as Marketplace's own rail.
  const flashSaleTrackRef = useRef<HTMLDivElement>(null);
  const [flashSalePaused, setFlashSalePaused] = useState(false);

  const { levels, otherLevels, loading: facetsLoading } = useEducationFacets();
  const { banners, loading: bannersLoading } = useBanners('educationHero');
  const countdown = useCountdownToMidnight();
  const [topStores, setTopStores] = useState<PublicStoreListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiGetTopStores(10)
      .then(res => { if (!cancelled) setTopStores(res.data?.stores ?? []); })
      .catch(() => { /* non-critical — Featured Sellers panel just stays empty */ });
    return () => { cancelled = true; };
  }, []);

  const LIMIT = 24;
  // Price/rating/sort are real server-side facets (see ProductsController) —
  // previously only fetched page 1 of 24 with no pagination at all, making
  // any catalog beyond the first 24 items permanently unreachable, and
  // price/rating/sort only ever re-sorted/re-filtered that one fixed page.
  const serverSortBy: MarketplaceSortBy | undefined =
    sortBy === 'price-asc' ? 'price_asc' :
    sortBy === 'price-desc' ? 'price_desc' :
    sortBy === 'best-rated' ? 'rating' :
    sortBy === 'popularity' ? 'popularity' : undefined;
  const isPriceRangeActive = priceRange[0] !== PRICE_MIN || priceRange[1] !== PRICE_MAX;
  const serverMinPrice = isPriceRangeActive ? priceRange[0] : undefined;
  const serverMaxPrice = isPriceRangeActive && priceRange[1] < PRICE_MAX ? priceRange[1] : undefined;
  const serverMinRating = minRating ?? undefined;

  const { products, total, loading, error } = useProductsByCategory(
    page, LIMIT, undefined, 'educational',
    activeLevel || undefined,
    activeLevel === 'other' ? (activeOtherSlug || undefined) : undefined,
    undefined, serverMinPrice, serverMaxPrice, serverMinRating, serverSortBy,
  );

  // Subject (tag-based) and free-text search have no server-side facet on
  // this endpoint — they still narrow only the current fetched page, same
  // limitation as before. Changing any real server facet resets to page 1,
  // same as Marketplace, so a filter change never fetches a stale page.
  const isFirstFacetRun = useRef(true);
  useEffect(() => {
    if (isFirstFacetRun.current) { isFirstFacetRun.current = false; return; }
    setPage(1);
  }, [activeLevel, activeOtherSlug, sortBy, priceRange[0], priceRange[1], minRating]);

  // Write the current browse state into the URL — shareable/bookmarkable,
  // same convention as the general Marketplace page. `activeLevel` lives in
  // the path segment (see handleLevelChange), not here.
  useEffect(() => {
    const next = new URLSearchParams();
    if (activeOtherSlug)           next.set('otherLevel', activeOtherSlug);
    if (activeSubjects.length)     next.set('subjects', activeSubjects.join(','));
    if (searchQuery)               next.set('search', searchQuery);
    if (sortBy !== 'newest')       next.set('sort', sortBy);
    if (page > 1)                  next.set('page', String(page));
    if (priceRange[0] !== PRICE_MIN || priceRange[1] !== PRICE_MAX) {
      next.set('price', `${priceRange[0]}-${priceRange[1]}`);
    }
    if (minRating)                 next.set('rating', String(minRating));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOtherSlug, activeSubjects.join(','), searchQuery, sortBy, page, priceRange[0], priceRange[1], minRating]);

  // Level selection updates the path segment, preserving other query params
  // (subjects/price/rating/etc) — mirrors Marketplace's handleCategoryChange.
  const handleLevelChange = (level: string) => {
    setActiveOtherSlug('');
    const rest = new URLSearchParams(searchParams);
    rest.delete('otherLevel');
    const qs = rest.toString();
    const path = level ? `/education/${level}` : '/education';
    navigate(`${path}${qs ? `?${qs}` : ''}`);
  };

  // Unfiltered educational pool (independent of the sidebar's current level
  // filter) — same approach Marketplace uses for its own Flash Sale/Top Picks
  // mega-menu content, so those panels always reflect the whole catalog.
  const { products: featuredPool } = useProductsByCategory(1, 24, undefined, 'educational');

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

  // Auto-scroll the Flash Sale rail one card at a time, looping back to the
  // start at the end — pauses on hover/touch (see the handlers on the rail
  // below) so it never fights a shopper's own scroll/tap. Same as Marketplace.
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

  const topPicks = [...featuredPool]
    .sort((a, b) => (b.purchaseCount + b.averageRating * 10) - (a.purchaseCount + a.averageRating * 10))
    .slice(0, 10);

  const toggleSubject = useCallback((s: string) => {
    setActiveSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }, []);
  // Price/rating/sort are already applied server-side (see serverMinPrice/
  // serverMinRating/serverSortBy above) — only search/subject (no server
  // facet for either) still narrow the already-fetched page here.
  const filtered = products.filter(p => {
    const matchesSearch = !searchQuery
      || p.name.toLowerCase().includes(searchQuery.toLowerCase())
      || (p.sellerName ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = activeSubjects.length === 0
      || activeSubjects.some(s => (p.tags ?? []).some(t => t.toLowerCase() === s.toLowerCase()));
    return matchesSearch && matchesSubject;
  });

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

  // Hides the discovery rail (Flash Sale) while a shopper is actively
  // narrowing results — same rule Marketplace uses, a discovery feed doesn't
  // belong above a shopper's own filtered results.
  const isBrowsing = !!searchQuery || !!activeLevel || activeSubjects.length > 0;

  const activeFilterCount = (activeLevel ? 1 : 0) + (activeOtherSlug ? 1 : 0) + activeSubjects.length
    + (isPriceRangeActive ? 1 : 0) + (minRating ? 1 : 0);
  const clearFilters = () => {
    handleLevelChange(''); setActiveSubjects([]);
    setPriceRange([PRICE_MIN, PRICE_MAX]); setMinRating(null);
  };

  // Active filter chip strip — mirrors the general Marketplace's sidebar.
  const activeFilterChips: { key: string; label: string; onRemove: () => void }[] = [
    ...(activeLevel
      ? [{ key: 'level', label: LEVEL_LABEL[activeLevel] ?? activeLevel, onRemove: () => handleLevelChange('') }]
      : []),
    ...(activeOtherSlug
      ? [{ key: 'other', label: otherLevels.find(o => o.slug === activeOtherSlug)?.displayName ?? 'Other', onRemove: () => setActiveOtherSlug('') }]
      : []),
    ...(isPriceRangeActive
      ? [{
          key: 'price',
          label: priceRange[1] >= PRICE_MAX ? `$${priceRange[0]}+` : `$${priceRange[0]}–$${priceRange[1]}`,
          onRemove: () => setPriceRange([PRICE_MIN, PRICE_MAX]),
        }]
      : []),
    ...activeSubjects.map(s => ({ key: `subject-${s}`, label: s, onRemove: () => toggleSubject(s) })),
    ...(minRating
      ? [{ key: 'rating', label: `${minRating}★ & up`, onRemove: () => setMinRating(null) }]
      : []),
  ];

  return (
    <div className="theme-education min-h-screen bg-cream">

      <div className="theme-brand-default">
        <BuyerNavbar
          search={{ value: searchQuery, onChange: setSearchQuery, placeholder: 'Search resources...', popularStores: topStores }}
        />
      </div>

      {/* ── Flash Sale strip — the real active platform sale campaign
         scoped to educational resources (self-fetching `DealsBanner`,
         compact mode with `label`), sitting flush between the navbar and
         the grade-levels/mega-menu bar — full width, no gutter/background
         wrapper, same treatment as the general Marketplace page. Owns its
         own countdown + "Shop Now" CTA internally. Renders nothing if
         there's no active campaign — no longer gated on the unrelated
         `flashDeals` product pool (that gate made this mount only once a
         separate, slower products fetch resolved, so it visibly popped in
         late even after its own campaign data was already ready). ── */}
      {!isBrowsing && (
        <DealsBanner compact label storeType="educational_resources" className="h-auto w-full sm:h-[100px]" />
      )}

      {/* ── Education navigation — Grade Levels / Flash Sale / Top Picks /
         Featured Stores / About, compact, above the hero — same merged row
         as Marketplace's own nav, positioned the same way. ── */}
      <MegaMenuBar
        compact
        categoriesLabel="All Category"
        categoriesContent={
          <EducationCategoriesMegaContent
            levels={levels} otherLevels={otherLevels}
            activeLevel={activeLevel} onLevelChange={handleLevelChange}
            activeOtherSlug={activeOtherSlug} onOtherSlugChange={setActiveOtherSlug}
            activeSubjects={activeSubjects} onToggleSubject={toggleSubject}
            topPicks={topPicks} onProductClick={handleCardClick}
          />
        }
        topPicks={topPicks}
        flashDeals={flashDeals}
        topStores={topStores}
        countdown={countdown}
        onProductClick={handleCardClick}
        onStoreClick={slug => window.location.href = getStorefrontUrl(slug)}
        onNavigate={navigate}
      />

      {/* ── Full-width hero carousel — real education-hero banner data,
         edge-to-edge under the nav row, same treatment as the general
         Marketplace page. Space is reserved and a skeleton shown the
         instant the page mounts, while the banner fetch is still in
         flight — previously this whole block rendered nothing until the
         fetch resolved, popping in late and shoving everything below it
         down. ── */}
      {(banners.length > 0 || bannersLoading) && (
        <div className="relative w-full h-[200px] sm:h-[320px] lg:h-[420px] xl:h-[460px] overflow-hidden">
          {banners.length > 0
            ? <BannerCarousel entityType="banner" banners={banners.map(b => ({ _id: b._id, order: b.order, imageUrl: b.bannerImage, linkUrl: b.urlOnTap }))} />
            : <SkeletonBox className="absolute inset-0 w-full h-full" rounded="0" />}
        </div>
      )}

      {/* ── Grade Level quick-links — Education's mirror of Marketplace's
         category quick-link row (no CategoryNode tree here, so it's built
         from the same real `levels` facet data the sidebar's Education
         Level filter already uses), plus a "More" opening the same
         grade-levels/subjects mega-panel. ── */}
      {levels.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-10 pt-5 pb-2">
          <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto scrollbar-hide pb-1">
            {levels.slice(0, 8).map(l => (
              <button
                key={l.level}
                onClick={() => handleLevelChange(l.level)}
                className={clsx(
                  'flex flex-col items-center gap-[6px] shrink-0 w-[76px] text-center cursor-pointer group bg-transparent border-none p-0',
                  activeLevel === l.level && 'text-brand-orange',
                )}
              >
                <span className={clsx(
                  'flex size-11 items-center justify-center rounded-full border transition-colors duration-150',
                  activeLevel === l.level ? 'border-brand-orange bg-brand-pale-orange' : 'border-bone bg-white group-hover:border-brand-orange/40',
                )}>
                  <GraduationCap size={18} className="text-brand-orange" />
                </span>
                <span className="text-[11px] font-semibold text-charcoal leading-tight line-clamp-1 group-hover:text-brand-orange transition-colors">{LEVEL_LABEL[l.level] ?? l.level}</span>
                {l.count > 0 && (
                  <span className="text-[9.5px] text-slate leading-none">{l.count.toLocaleString()}+ items</span>
                )}
              </button>
            ))}
            {levels.length > 8 && (
              <button
                onClick={() => setLevelsModalOpen(true)}
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

      {levelsModalOpen && (
        <Modal title="Grade Levels" onClose={() => setLevelsModalOpen(false)} width={900}>
          <EducationCategoriesMegaContent
            levels={levels} otherLevels={otherLevels}
            activeLevel={activeLevel} onLevelChange={handleLevelChange}
            activeOtherSlug={activeOtherSlug} onOtherSlugChange={setActiveOtherSlug}
            activeSubjects={activeSubjects} onToggleSubject={toggleSubject}
            topPicks={topPicks}
            onProductClick={id => { handleCardClick(id); setLevelsModalOpen(false); }}
            showSpotlight={false}
            fixedHeight={520}
          />
        </Modal>
      )}

      {/* ── Page header — H1 + subtitle, and the 4 "why shop here"
         reassurance badges, same set/positioning as the general Marketplace
         page (brand-orange tokens render green here automatically via
         .theme-education, no hardcoded color needed). ── */}
      <div className="px-4 sm:px-6 lg:px-10 pt-5">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="font-serif text-[28px] sm:text-[34px] lg:text-[38px] font-bold text-carbon tracking-[-0.01em] leading-tight">Education Marketplace</h1>
            <p className="text-[13px] sm:text-[14px] text-slate mt-1">Curated learning resources from trusted sellers</p>
          </div>
          <div className="hidden lg:flex items-center gap-5 pt-1">
            {[
              { Icon: ShieldCheck, label: 'Verified Sellers',  sub: 'Look for the verified badge'  },
              { Icon: Wallet,      label: 'Secure Checkout',   sub: 'You pay Edudeen directly'     },
              { Icon: Zap,         label: 'Instant Downloads', sub: 'Digital items, right away'    },
              { Icon: Headset,     label: 'Help When Needed',  sub: 'Message sellers or contact us' },
            ].map(({ Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-[10px]">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white border border-bone shadow-card">
                  <Icon size={16} className="text-brand-orange" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-charcoal leading-tight whitespace-nowrap">{label}</p>
                  <p className="text-[10.5px] text-slate leading-tight mt-[1px] whitespace-nowrap">{sub}</p>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Flash Sale — a compact, always-visible rail (real discount signal
         from the same `flashDeals` pool the mega-menu dropdown already uses),
         same as Marketplace's own rail. Hidden while actively browsing. ── */}
      {!isBrowsing && flashDeals.length > 0 && (
        <div id="education-flash-sale-rail" className="px-4 sm:px-6 lg:px-10 pt-5 scroll-mt-[76px]">
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

        {/* Sort/view toolbar — Filters lives on its own tab stuck to the left
           edge of the viewport (see below), same as Marketplace, not a
           sidebar or an inline row here. */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <span className="text-[13px] font-medium text-slate">
            {!loading && (error ? 'Error loading' : <>Showing <span className="text-carbon font-semibold">{filtered.length} of {total}</span> resources</>)}
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

        {/* ── Filters sidebar + resources — a real persistent left column at
           `lg` and up (same as the general Marketplace page), sharing one
           EducationFilterPanel instance with the mobile bottom-sheet drawer
           below (now `lg:hidden`, the sidebar takes over there). ── */}
        <div className="lg:flex lg:items-start lg:gap-6">
          <aside className="hidden lg:block w-[264px] shrink-0">
            <div className="bg-white rounded-2xl border border-bone p-4 sticky top-[88px]">
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
              <EducationFilterPanel
                levels={levels} otherLevels={otherLevels} facetsLoading={facetsLoading}
                activeLevel={activeLevel} onLevelChange={handleLevelChange}
                activeOtherSlug={activeOtherSlug} onOtherSlugChange={setActiveOtherSlug}
                activeSubjects={activeSubjects} onToggleSubject={toggleSubject}
                priceRange={priceRange} onPriceRangeChange={setPriceRange}
                minRating={minRating} onRatingChange={setMinRating}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {activeFilterChips.map(chip => (
                  <ActiveFilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
                ))}
              </div>
            )}

            {error && !loading && (
              <div className="p-6 flex flex-col items-center gap-3 text-center bg-error-bg rounded-[12px] border border-error-border text-error text-[13px]">
                <span>Couldn't load resources right now — please try again shortly.</span>
              </div>
            )}

            {/* With a persistent sidebar sharing width at `lg`+, the grid
                stops one column short of the old sidebar-less ceiling:
                2 @ 320-767 → 3 @ md → 4 @ lg instead of 5, same as
                Marketplace. List view collapses to a single column of rows. */}
            <div
              id="education-grid"
              className={clsx(
                'scroll-mt-[76px]',
                viewMode === 'list'
                  ? 'flex flex-col gap-3'
                  : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[10px] sm:gap-3 lg:gap-[14px]',
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
                      />
                    );
                  })
              }
            </div>

            {!loading && !error && filtered.length === 0 && (
              <EmptyState
                icon={<GraduationCap size={30} className="text-brand-orange" />}
                title="No resources match"
                description="No educational resources match your filters yet."
                action={
                  activeFilterCount > 0 || searchQuery
                    ? { label: 'Clear filters', onClick: () => { clearFilters(); setSearchQuery(''); } }
                    : undefined
                }
              />
            )}

            {!loading && !error && total > LIMIT && (
              <div className="flex justify-center mt-8 pb-2">
                <Pagination page={page} total={total} perPage={LIMIT} onChange={p => setPage(p)} />
              </div>
            )}
          </div>
        </div>

        {/* ── AI Builder CTA ─────────────────────────────────────────────── */}
        <div
          className="mt-6 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5"
          style={{ background: 'linear-gradient(120deg, #EAF2F8, #FFF)' }}
        >
          <div className="w-12 h-12 rounded-xl bg-[rgba(23,71,113,0.12)] flex items-center justify-center shrink-0">
            <Sparkles size={24} className="text-brand-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] sm:text-[16px] font-bold text-carbon mb-1">
              AI Worksheet Builder — Try Free
            </p>
            <p className="text-[12px] sm:text-[13px] text-slate leading-[1.6]">
              Generate custom worksheets, quizzes, and lesson activities in seconds with AI. Save hours of prep time.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => setShowAiTrial(true)} className="shrink-0 w-full sm:w-auto">
            Try AI Builder <ArrowRight size={14} className="inline align-middle ml-1" />
          </Button>
        </div>
      </div>

      {/* ── 3-up promo row — Sell Your Resources / Safe & Secure Shopping /
         Download the App, same gradient-card language as the general
         Marketplace page's own 3-up row. ── */}
      <div className="px-4 sm:px-6 lg:px-10 pt-2 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-orange to-brand-deep-orange p-5 flex items-center gap-4 min-h-[136px]">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute right-3 -top-9 w-20 h-20 rounded-full bg-white/10" />
            <div className="relative z-[1] min-w-0 flex-1">
              <p className="text-[15px] font-bold text-white mb-1">Sell Your Resources</p>
              <p className="text-[12px] text-white/85 leading-snug mb-4">Start earning from your content.</p>
              <Button variant="dark" size="sm" onClick={sellEntry.go} loading={sellEntry.loading} className="w-fit">
                Start Selling <ArrowRight size={12} className="inline align-middle ml-1" />
              </Button>
            </div>
            <div className="relative z-[1] shrink-0 w-[64px] h-[64px] rounded-full bg-white/15 border border-white/25 backdrop-blur-sm flex items-center justify-center">
              <Store size={28} className="text-white" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-carbon p-5 flex items-center gap-4 min-h-[136px]">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-success/15" />
            <div className="absolute right-3 -top-9 w-20 h-20 rounded-full bg-success/10" />
            <div className="relative z-[1] min-w-0 flex-1">
              <p className="text-[15px] font-bold text-white mb-1">Safe &amp; Secure Shopping</p>
              <p className="text-[12px] text-white/60 leading-snug mb-4">Your security is our top priority.</p>
              <Button variant="primary" size="sm" onClick={() => navigate('/faq')} className="w-fit">
                Learn More <ArrowRight size={12} className="inline align-middle ml-1" />
              </Button>
            </div>
            <div className="relative z-[1] shrink-0 w-[64px] h-[64px] rounded-full bg-success/20 border border-success/30 flex items-center justify-center">
              <ShieldCheck size={28} className="text-success" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-brand-pale-orange p-5 flex items-center gap-4 min-h-[136px]">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/40" />
            <div className="absolute right-3 -top-9 w-20 h-20 rounded-full bg-white/30" />
            <div className="relative z-[1] min-w-0 flex-1">
              <p className="text-[15px] font-bold text-carbon mb-1">Download Edudeen App</p>
              <p className="text-[12px] text-charcoal/70 leading-snug mb-4">Shop anywhere, anytime.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => document.getElementById('education-app-download')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="w-fit"
              >
                Download Now <ArrowRight size={12} className="inline align-middle ml-1" />
              </Button>
            </div>
            <div className="relative z-[1] shrink-0 w-[64px] h-[64px] rounded-full bg-white border border-white flex items-center justify-center shadow-md">
              <Smartphone size={28} className="text-brand-orange" />
            </div>
          </div>
        </div>
      </div>

      {/* ── App download + bottom trust strip + footer — universal chrome,
         stays brand-orange even here ── */}
      <div id="education-app-download" className="theme-brand-default px-4 sm:px-6 lg:px-10 pb-8 pt-2 scroll-mt-[76px]">
        <AppDownloadBanner />
      </div>
      <TrustServiceStrip items={BOTTOM_TRUST_ITEMS} />

      {showAiTrial && <WorksheetTrialModal onClose={() => setShowAiTrial(false)} />}

      <div className="theme-brand-default">
        <Footer />
      </div>

      {/* ── Filters — a real sidebar, not an inline panel or a bottom sheet,
         same as Marketplace. A slim vertical ribbon tab stays stuck to the
         left edge of the viewport, vertically centered; clicking it slides
         a full-height drawer in from the left, over the page. Green/white
         instead of Marketplace's orange/black — this page's own accent. ── */}
      <button
        onClick={() => setMobileFilters(o => !o)}
        aria-expanded={mobileFilters}
        aria-label="Toggle filters"
        className={clsx(
          'lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-[58] flex flex-col items-center gap-2 rounded-r-xl border border-l-0 border-white/10 py-[10px] px-[6px] text-white bg-gradient-to-b from-charcoal to-success shadow-[0_8px_24px_-4px_rgba(45,138,78,0.4),0_4px_14px_rgba(20,15,10,0.25)] cursor-pointer transition-all duration-500 ease-out hover:px-2 hover:brightness-110 hover:shadow-[0_10px_28px_-4px_rgba(45,138,78,0.5),0_4px_14px_rgba(20,15,10,0.3)]',
          showFilterTab ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0',
          (mobileFilters || activeFilterCount > 0) && 'ring-2 ring-success/50',
        )}
      >
        <SlidersHorizontal size={11} strokeWidth={2} className="shrink-0" />
        <span className="[writing-mode:vertical-rl] whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.05em] my-0.5">
          Filter Products
        </span>
        {activeFilterCount > 0 && (
          <span className="min-w-[15px] h-[15px] rounded-full bg-white text-success text-[8px] font-bold flex items-center justify-center px-[3px] leading-none shrink-0">
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
        <div className="px-5 py-4">
          <EducationFilterPanel
            levels={levels} otherLevels={otherLevels} facetsLoading={facetsLoading}
            activeLevel={activeLevel} onLevelChange={handleLevelChange}
            activeOtherSlug={activeOtherSlug} onOtherSlugChange={setActiveOtherSlug}
            activeSubjects={activeSubjects} onToggleSubject={toggleSubject}
            priceRange={priceRange} onPriceRangeChange={setPriceRange}
            minRating={minRating} onRatingChange={setMinRating}
          />
        </div>
      </div>
    </div>
  );
}
