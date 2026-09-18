import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowRight, Search, Clock, LayoutGrid, X, TrendingUp, Tag, Star, Sparkles, ChevronDown, Check, Store as StoreIcon, Lightbulb, Trash2, Eye, Loader2 } from 'lucide-react';
import { TokenStorage } from '@/api/services/auth';
import { apiGetRecentSearches, apiSearchStores } from '@/api/services/search';
import { apiGetAllProducts, type MarketplaceProduct } from '@/api/services/marketplace';
import type { PublicStoreListItem } from '@/api/services/store';
import { getStorefrontUrl } from '@/utils/storefrontUrl';
import { ProductImage } from '@/components/comman/marketplace/ProductCard';
import { Button } from './Button';
import { EdudeenLogo } from './EdudeenLogo';
import { SkeletonBox } from './SkeletonBox';
import { NotificationBell } from './NotificationBell';
import { ProfileAvatar } from './ProfileAvatar';
import { ActionMenu } from './ActionMenu';
import { useCurrencyPreference, type SupportedCurrency } from '@/contexts/CurrencyPreferenceContext';
import { currencySymbol } from '@/utils/currency';
import { SignInPreview } from './SignInPreview';
import { MiniCart } from './MiniCart';
import { MiniWishlist } from './MiniWishlist';
import { scrollRootRef } from '@/utils/scrollRoot';
import { useSellEntry } from '@/hooks/auth/useSellEntry';

export interface BuyerNavbarSearchConfig {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Real category list (e.g. from Marketplace) shown as "Popular Categories" suggestions. */
  categories?: { id: string; name: string }[];
  /** Called when a category suggestion is clicked — lets the host page filter locally instead of falling back to a text search. */
  onCategorySelect?: (id: string) => void;
  /** Real top-stores list (e.g. Marketplace's own `topStores`) shown as "Popular Stores" — no separate fetch inside the search box for this one. */
  popularStores?: PublicStoreListItem[];
}

// ── Recently viewed — client-tracked (no view-history API exists), same
// pattern as recent searches: a small real snapshot cached on-device from
// ProductDetail so the dropdown can show it without an extra fetch. ──
const RECENTLY_VIEWED_KEY = 'edudeen_recently_viewed';
export interface RecentlyViewedItem {
  id: string;
  name: string;
  image: string | null;
  price: number | null;
  currency?: 'PKR' | 'USD' | null;
}
export function getRecentlyViewed(): RecentlyViewedItem[] {
  try { return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) ?? '[]'); } catch { return []; }
}
export function pushRecentlyViewed(item: RecentlyViewedItem) {
  try {
    const next = [item, ...getRecentlyViewed().filter(v => v.id !== item.id)].slice(0, 8);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  } catch { /* storage unavailable */ }
}

export interface BuyerNavbarProps {
  /** 'full' shows search/wishlist/cart/notifications/account (default). 'minimal' shows only the logo + optional backTo — used on Checkout/OrderSuccess to keep the flow distraction-free. */
  variant?: 'full' | 'minimal';
  /** Short label shown next to the logo, e.g. "Marketplace", "Education", a store name. */
  contextLabel?: string;
  /** Controlled search box — pass when the page filters locally (Marketplace, EducationMarketplace, SellerStorefront). Omit to get an uncontrolled box that navigates to /marketplace?search=... on submit. */
  search?: BuyerNavbarSearchConfig;
  /** Cart-button background override, used by SellerStorefront to match its store theme color. */
  accentColor?: string;
  /** Optional back-link button, e.g. "Continue Shopping" or "Back to Cart". */
  backTo?: { label: string; path: string };
  /** Hides the built-in search box (and its mobile icon toggle) entirely —
   *  for pages (e.g. Marketplace) that already render their own larger,
   *  dedicated search bar below the navbar, so search isn't duplicated. */
  hideSearch?: boolean;
  /** Optional centered nav links (desktop only) between the logo and the
   *  search box — used by PublicLayout's marketing pages (Marketplace,
   *  Education, Pricing, FAQ, Sell on Edudeen) so that navigation lives in
   *  the one real navbar instead of a separate strip underneath it. Omitted
   *  everywhere else (Marketplace, ProductDetail, etc.) — unaffected. */
  centerLinks?: {
    label: string; path: string; highlight?: boolean;
    /** Runs instead of navigating to `path` when present — e.g. "Become a
     *  Seller" routing through useSellEntry() (checks login/store state)
     *  rather than a plain link to the static /sellers info page. */
    onClick?: () => void;
    children?: { label: string; path: string }[];
  }[];
  /** Drops wishlist/cart/currency entirely and swaps the logged-out account
   *  actions for a plain "Sign In" + "Start Selling" pair — for marketing
   *  pages (PublicLayout: Homepage, Pricing, etc.) that aren't a shopping
   *  context and shouldn't offer shopping actions. */
  hideCommerce?: boolean;
}

const RECENT_KEY = 'edudeen_recent_searches';
const TRENDING_SEARCHES = ['Wireless Earbuds', 'Digital Planner', 'Desk Organizer', 'Handmade Jewelry', 'Watercolor Prints'];

function getLocalRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}
function pushLocalRecentSearch(term: string) {
  const t = term.trim();
  if (!t) return;
  const next = [t, ...getLocalRecentSearches().filter(s => s.toLowerCase() !== t.toLowerCase())].slice(0, 5);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
}
function removeLocalRecentSearch(term: string) {
  const next = getLocalRecentSearches().filter(s => s.toLowerCase() !== term.toLowerCase());
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
}

function useUncontrolledSearch() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const submit = (term?: string) => {
    const q = (term ?? value).trim();
    if (q) navigate(`/marketplace?search=${encodeURIComponent(q)}`);
  };
  return { value, onChange: setValue, submit };
}

// ── Section header — one consistent label style for every dropdown section ──
function SearchSectionLabel({ icon, tone = 'neutral', children }: { icon: React.ReactNode; tone?: 'neutral' | 'brand'; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-[7px] text-[10px] font-bold text-slate uppercase tracking-[0.08em] mb-[10px]">
      <span className={clsx(
        'flex size-[18px] items-center justify-center rounded-full shrink-0',
        tone === 'brand' ? 'bg-brand-pale-orange text-brand-deep-orange' : 'bg-bone/70 text-graphite',
      )}>
        {icon}
      </span>
      {children}
    </p>
  );
}

// ── Compact suggestion row — Recent/Trending searches as a real row (icon +
// term, full-width, hover fill), not a chip cloud. ──
function SuggestionRow({ icon, label, onClick, onRemove }: { icon: React.ReactNode; label: React.ReactNode; onClick: () => void; onRemove?: () => void }) {
  return (
    <div className="group w-full flex items-center gap-[11px] pl-2 pr-1 rounded-lg hover:bg-cream">
      <button
        data-search-item
        onClick={onClick}
        className="flex-1 min-w-0 flex items-center gap-[11px] py-[9px] bg-transparent border-none text-left cursor-pointer focus-visible:outline-none"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-cream text-slate shrink-0 group-hover:bg-white">
          {icon}
        </span>
        <span className="flex-1 text-[13px] text-charcoal truncate">{label}</span>
      </button>
      {/* Single-item remove — separate from the section's "Clear History"
         bulk action, so a shopper can drop just one stale term. */}
      {onRemove && (
        <button
          data-search-item
          onClick={e => { e.stopPropagation(); onRemove(); }}
          aria-label="Remove search"
          className="shrink-0 p-[6px] rounded-full bg-transparent border-none cursor-pointer text-slate hover:text-charcoal hover:bg-bone transition-colors"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ── Highlighted match — wraps the first occurrence of `query` inside `text`
// in a real <mark>, restyled to the brand palette instead of the browser's
// default yellow. Used across every grouped typing-state result row. ──
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-brand-pale-orange text-brand-deep-orange rounded-[2px]">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Recommended product row — 56×56 thumbnail + title + category + rating +
// price, not a cropped image strip. Reuses ProductImage (same component
// ProductCard/MegaMenuBar use) inside a fixed-size frame — ProductImage's
// own base classes force `w-full`, so it must be wrapped in a sized box
// rather than sized directly, or it stretches to its flex row's full width. ──
function RecommendedProductRow({ product, categoryName, query, onClick }: { product: MarketplaceProduct; categoryName: string; query: string; onClick: () => void }) {
  const dv              = (product.variants ?? []).find(v => v.isDefault) ?? product.variants?.[0];
  const nativePrice     = dv?.price ?? null;
  const nativeCompareAt = dv?.compareAtPrice ?? null;
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const priceSymbol = currencySymbol(displayCurrency);
  const price     = nativePrice != null ? convert(nativePrice, dv?.currency) : null;
  const compareAt = nativeCompareAt != null ? convert(nativeCompareAt, dv?.currency) : null;
  return (
    <button
      data-search-item
      onClick={onClick}
      className="group w-full flex items-center gap-3 px-2 py-2 rounded-xl bg-transparent border-none text-left cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:bg-cream"
    >
      <span className="w-14 h-14 rounded-[10px] overflow-hidden shrink-0 bg-brand-pale-orange">
        <ProductImage images={product.images ?? []} name={product.name} className="w-full h-full object-cover" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-carbon leading-snug line-clamp-1 group-hover:text-brand-deep-orange transition-colors">
          <HighlightMatch text={product.name} query={query} />
        </p>
        <div className="flex items-center gap-[6px] mt-[3px] min-w-0">
          <span className="text-[10.5px] text-slate truncate">{categoryName}</span>
          <span className="text-bone shrink-0">•</span>
          <span className="flex items-center gap-[3px] text-[10.5px] text-slate shrink-0">
            <Star size={9} className={product.averageRating > 0 ? 'text-brand-orange fill-brand-orange' : 'text-bone fill-bone'} />
            {product.averageRating > 0 ? product.averageRating.toFixed(1) : 'New'}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-[2px] shrink-0">
        <span className="text-[13px] font-bold text-carbon">{price != null ? `${priceSymbol}${price.toLocaleString()}` : '—'}</span>
        {compareAt != null && price != null && compareAt > price && (
          <span className="text-[10px] text-slate line-through">{priceSymbol}{compareAt.toLocaleString()}</span>
        )}
      </div>
    </button>
  );
}

// ── Store match row — same 56×56 thumbnail/title layout language as
// RecommendedProductRow, so "Stores" reads as a sibling group, not a
// different design. ──
function StoreMatchRow({ store, query, onClick }: { store: PublicStoreListItem; query: string; onClick: () => void }) {
  return (
    <button
      data-search-item
      onClick={onClick}
      className="group w-full flex items-center gap-3 px-2 py-2 rounded-xl bg-transparent border-none text-left cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:bg-cream"
    >
      <span className="w-14 h-14 rounded-[10px] overflow-hidden shrink-0 bg-brand-pale-orange flex items-center justify-center">
        {store.logo
          ? <img loading="lazy" decoding="async" src={store.logo} alt="" className="w-full h-full object-cover" />
          : <StoreIcon size={20} className="text-brand-orange opacity-50" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-carbon leading-snug line-clamp-1 group-hover:text-brand-deep-orange transition-colors">
          <HighlightMatch text={store.name} query={query} />
        </p>
        <p className="text-[10.5px] text-slate truncate mt-[3px]">
          {store.followersCount > 0 ? `${store.followersCount.toLocaleString()} followers` : 'Store'}
        </p>
      </div>
      <ChevronDown size={13} className="text-slate/50 -rotate-90 shrink-0" />
    </button>
  );
}

// ── Search box with recent / trending / category / product suggestions ──────
// `size="lg"` renders the same real search box (same suggestions dropdown,
// same state) at the enlarged, pill-shaped scale used as a standalone hero
// search bar (e.g. Marketplace, above the banner) instead of its default
// compact navbar scale.
export interface SearchBoxProps extends BuyerNavbarSearchConfig {
  onSubmit: (term?: string) => void;
  autoFocus?: boolean;
  size?: 'md' | 'lg';
  /** Fires when the shopper explicitly backs out of the full-screen mobile
   *  search (the back arrow) — lets a standalone host (e.g. BuyerLayout's
   *  global search, mounted with no other UI around it) unmount this
   *  instead of it collapsing back to a bare, out-of-context search icon. */
  onClose?: () => void;
  /** Forces the full-screen "phone takeover" rendering unconditionally,
   *  instead of the default `isMobileViewport` (<640px) check + self-portal.
   *  For a caller that already hosts this component inside its OWN fixed
   *  full-screen container reachable from a wider range than 640px — e.g.
   *  BuyerLayout's global search, triggered from the bottom nav which stays
   *  visible up to 768px (`md`). Without this, the width window between
   *  640-767px fell through: not narrow enough for the internal <640px
   *  check, so it rendered as a plain in-flow block whatever container it
   *  happened to be mounted in, instead of ever taking over the screen. */
  alwaysFullScreen?: boolean;
}
export function SearchBox({
  value, onChange, placeholder, categories, onCategorySelect, popularStores, onSubmit, autoFocus, size = 'md', onClose,
  alwaysFullScreen = false,
}: SearchBoxProps) {
  const isLg = size === 'lg';
  const navigate = useNavigate();
  const panelId = useId();
  // Portals the open mobile take-over straight to <body> — this component
  // usually lives deep inside a page's own layout, and any ancestor along
  // that path (there's always at least one) can silently trap a nested
  // z-index inside its own stacking context, leaving the fixed bottom nav
  // (or anything else fixed) visibly poking through on top of it. A body
  // portal sidesteps that entirely, the same fix ActionMenu's dropdown
  // already uses for the identical problem. Desktop keeps the plain
  // anchored-dropdown, non-portaled — no stacking issue there since it's
  // never full-screen.
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  useEffect(() => {
    if (alwaysFullScreen) return; // host already guarantees the full-screen context; no viewport check needed
    const mq = window.matchMedia('(max-width: 639.98px)');
    setIsMobileViewport(mq.matches);
    const onMqChange = () => setIsMobileViewport(mq.matches);
    mq.addEventListener('change', onMqChange);
    return () => mq.removeEventListener('change', onMqChange);
  }, [alwaysFullScreen]);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  // Kept separate (rather than one merged "recent" array) so "Clear History"
  // can actually clear what it controls — the on-device list — without
  // pretending to delete account-synced server history it has no delete
  // endpoint for.
  const [syncedRecent, setSyncedRecent] = useState<string[]>([]);
  const [localRecent,  setLocalRecent]  = useState<string[]>([]);
  const [pool, setPool] = useState<MarketplaceProduct[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const poolFetched = useRef(false);
  const [storeMatches, setStoreMatches] = useState<PublicStoreListItem[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  const [isMac] = useState(() => typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent));

  const recent = [...syncedRecent, ...localRecent.filter(t => !syncedRecent.some(s => s.toLowerCase() === t.toLowerCase()))].slice(0, 5);

  const clearHistory = () => {
    try { localStorage.removeItem(RECENT_KEY); } catch { /* storage unavailable */ }
    setLocalRecent([]);
  };

  // Single-item remove — clears it from local storage for good, and also
  // drops it from `syncedRecent` in memory for this session (there's no
  // backend endpoint to actually delete one synced entry, so it can still
  // reappear next time the account history is fetched fresh — but the tap
  // has to make the row disappear right now regardless of which list the
  // term came from, or a term present in both looked completely broken:
  // removing it locally did nothing since the merged list was still
  // pulling it from `syncedRecent`).
  const removeRecent = (term: string) => {
    const t = term.toLowerCase();
    removeLocalRecentSearch(term);
    setLocalRecent(prev => prev.filter(s => s.toLowerCase() !== t));
    setSyncedRecent(prev => prev.filter(s => s.toLowerCase() !== t));
  };

  useEffect(() => {
    if (!open) return;

    setLocalRecent(getLocalRecentSearches());
    setRecentlyViewed(getRecentlyViewed());
    if (TokenStorage.isLoggedIn()) {
      // Account-synced history when the backend has it.
      apiGetRecentSearches(5)
        .then(res => setSyncedRecent(res.data.map(r => r.query)))
        .catch(() => setSyncedRecent([]));
    } else {
      setSyncedRecent([]);
    }

    // Recommended-products pool — fetched once per mount (not on every open),
    // reusing the same public listing endpoint Homepage/Marketplace already
    // call for their own "trending"/"top picks" rails. Filtered client-side
    // by the typed query below — no new endpoint, no backend change.
    if (!poolFetched.current) {
      poolFetched.current = true;
      setPoolLoading(true);
      apiGetAllProducts(1, 20)
        .then(res => setPool(res.data?.products ?? []))
        .catch(() => {})
        .finally(() => setPoolLoading(false));
    }

    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); onClose?.(); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Store matches for the typing state's "Stores" group — same public
  // search endpoint the Marketplace page already uses for its own below-hero
  // store row, just a smaller top-N here. Debounced locally since this fires
  // on every keystroke rather than sharing the host page's debounce.
  useEffect(() => {
    const query = value.trim();
    if (!open || query.length < 2) { setStoreMatches([]); return; }
    let cancelled = false;
    setStoresLoading(true);
    const id = setTimeout(() => {
      apiSearchStores(query, 1, 3)
        .then(res => { if (!cancelled) setStoreMatches(res.data?.stores ?? []); })
        .catch(() => { if (!cancelled) setStoreMatches([]); })
        .finally(() => { if (!cancelled) setStoresLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(id); };
  }, [open, value]);

  // Global ⌘K / Ctrl+K — focuses and opens the search from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const pick = (term: string) => {
    onChange(term);
    onSubmit(term);
    setOpen(false);
    onClose?.();
  };

  const goToProduct = (slug: string) => {
    setOpen(false);
    onClose?.();
    navigate(`/product/${slug}`);
  };

  const goToStore = (slug: string) => {
    setOpen(false);
    onClose?.();
    window.location.href = getStorefrontUrl(slug);
  };

  // Arrow-key navigation across every suggestion — moves real DOM focus (not
  // a simulated highlight), so Enter/Space on a focused item just works via
  // native button semantics, and Tab order stays correct for free.
  const moveFocus = (dir: 'down' | 'up') => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[data-search-item]') ?? []);
    if (items.length === 0) return;
    const active = document.activeElement;
    const idx = items.indexOf(active as HTMLElement);
    if (dir === 'down') {
      items[idx === -1 ? 0 : Math.min(idx + 1, items.length - 1)]?.focus();
    } else {
      if (idx <= 0) inputRef.current?.focus();
      else items[idx - 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); moveFocus('down'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus('up'); }
    else if (e.key === 'Enter' && document.activeElement === inputRef.current) { onSubmit(); setOpen(false); onClose?.(); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); onClose?.(); }
  };

  const query = value.trim().toLowerCase();
  const isTyping = query.length > 0;

  // Typing state — grouped, deliberately capped small (this is a preview,
  // not a results page; "View all results" is what a shopper wants for more).
  const matchingProducts = isTyping ? pool.filter(p => p.name.toLowerCase().includes(query)).slice(0, 4) : [];
  const matchingCategories = isTyping ? (categories ?? []).filter(c => c.name.toLowerCase().includes(query)).slice(0, 5) : [];

  const typeLabel = (p: MarketplaceProduct) => {
    const t = p.productType ?? p.type ?? 'physical';
    return t === 'physical' ? 'Physical' : t === 'educational' ? 'Educational' : 'Digital';
  };
  // Real category name when the host page has the list (Marketplace) —
  // falls back to the product type (Physical/Digital/Educational) where it
  // doesn't (Education Marketplace, Seller Store), so the row never shows a
  // raw id or goes blank.
  const categoryNameFor = (p: MarketplaceProduct) => categories?.find(c => c.id === p.categoryId)?.name ?? typeLabel(p);

  const hasEmptyStateContent = recent.length > 0 || TRENDING_SEARCHES.length > 0 || (categories?.length ?? 0) > 0
    || recentlyViewed.length > 0 || (popularStores?.length ?? 0) > 0;
  const hasTypingContent = matchingProducts.length > 0 || matchingCategories.length > 0 || storeMatches.length > 0 || poolLoading || storesLoading;
  const hasSuggestions = isTyping ? hasTypingContent : hasEmptyStateContent;

  const closeFullScreen = () => { setOpen(false); inputRef.current?.blur(); onClose?.(); };

  const panel = (
    <div
      ref={ref}
      className={clsx(
        isLg ? 'w-full' : 'flex-1 px-2 md:px-4',
        // Below `sm`, an open search takes over the whole screen — a real
        // native-app search page (back arrow + input pinned at top, results
        // filling the rest) instead of a small dropdown hanging off the
        // input. `md:` and up keeps the original anchored-dropdown behavior
        // unchanged — a mouse user doesn't need a full takeover.
        // `inset-0` would tuck the top edge under ReferenceNav's 44px dev-only
        // bar (see AdminLayout/BuyerNavbar's own `top-[44px]`-in-DEV pattern
        // elsewhere) — production has no such bar, so `top-0` there is exact.
        open && !alwaysFullScreen && clsx(
          'max-md:fixed max-md:right-0 max-md:bottom-0 max-md:left-0 max-md:z-[9999] max-md:flex-col max-md:justify-start max-md:bg-white max-md:px-3 max-md:pt-3',
          import.meta.env.DEV ? 'max-md:top-[44px]' : 'max-md:top-0',
        ),
        // The full-screen and normal-anchored states are written as two
        // complete, mutually exclusive literal class strings — never
        // composed piecemeal from separate flags — because several of these
        // utilities share a CSS property with their counterpart in the
        // other state (position, justify-content), and Tailwind's
        // generated stylesheet decides which bare utility wins by its own
        // fixed internal ordering, not by className string order. Mixing
        // `justify-center` (here) with a conditionally-added `justify-start`
        // silently kept `justify-center` active despite `alwaysFullScreen`,
        // which is exactly what collapsed the layout down to a sliver.
        open && alwaysFullScreen
          ? clsx(
              'fixed right-0 bottom-0 left-0 z-[9999] flex flex-col justify-start bg-white px-3 pt-3',
              import.meta.env.DEV ? 'top-[44px]' : 'top-0',
            )
          : 'relative flex justify-center',
      )}
      onKeyDown={handleKeyDown}
    >
      {/* Input and dropdown share this one sized wrapper so they're always
         exactly the same width — the dropdown reads as an extension of the
         input, not a separately-floating box. */}
      {/* No base max-width — on mobile this only renders inside the full-width
         expanded search row (mobileSearchOpen), where a 240px cap would leave
         no room for the 56px product-row thumbnails; sm+ still caps it to sit
         comfortably between the logo and the account icons. lg is a
         standalone hero search bar (Marketplace, above the banner), so it
         gets its own, much wider cap instead. */}
      <div className={clsx(
        'relative w-full',
        // `max-w-none` (below) and this base max-w share the same property —
        // only applying one or the other, never both as bare classes,
        // avoids the exact same ordering trap as the position/justify fix above.
        open && alwaysFullScreen ? 'max-w-none' : (isLg ? 'max-w-[820px]' : 'md:max-w-[360px] lg:max-w-[480px]'),
        open && (alwaysFullScreen
          ? 'flex flex-1 min-h-0 flex-col'
          : 'max-md:flex max-md:flex-1 max-md:min-h-0 max-md:flex-col max-md:max-w-none'),
      )}>
        <div
          className={clsx(
            'group relative flex items-center bg-white border w-full',
            'transition-[border-color,box-shadow,background-color] duration-200 ease-out',
            isLg
              ? 'gap-3 pl-6 pr-1.5 py-1.5 rounded-full border-2'
              : 'gap-[9px] px-[14px] py-[9px] rounded-xl',
            open
              ? 'border-brand-orange shadow-[0_2px_12px_rgba(217,119,87,0.12)] ring-[3px] ring-brand-orange/10'
              : isLg ? 'border-brand-orange shadow-[0_6px_24px_rgba(217,119,87,0.16)]' : 'border-bone hover:border-border-hover',
            open && (alwaysFullScreen ? 'shrink-0' : 'max-md:shrink-0'),
          )}
        >
          {open && (
            <button
              type="button"
              onClick={closeFullScreen}
              aria-label="Close search"
              className={clsx(
                'shrink-0 items-center justify-center -ml-1 mr-[2px] w-6 h-6 bg-transparent border-none cursor-pointer text-charcoal',
                alwaysFullScreen ? 'flex' : 'hidden max-md:flex',
              )}
            >
              <ArrowLeft size={17} />
            </button>
          )}
          <Search size={isLg ? 19 : 15} className={clsx('shrink-0 transition-colors duration-200', open || isLg ? 'text-brand-orange' : 'text-slate')} />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={panelId}
            aria-autocomplete="list"
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder ?? 'Search products, categories, stores…'}
            aria-label={placeholder ?? 'Search products, categories, stores'}
            autoFocus={autoFocus}
            className={clsx('border-0 outline-none text-carbon placeholder:text-slate/80 bg-transparent w-full min-w-0', isLg ? 'text-[15px] md:text-[16px] py-[8px]' : 'text-[13.5px]')}
          />
          {value && (
            <button
              onClick={() => onChange('')}
              aria-label="Clear search"
              className="text-slate hover:text-charcoal bg-transparent border-none cursor-pointer p-0 shrink-0 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          {!isLg && !value && !open && (
            <kbd className="hidden md:flex items-center gap-[2px] text-[10px] font-semibold text-slate/70 bg-cream border border-bone rounded-[5px] px-[6px] py-[2px] shrink-0 leading-none">
              {isMac ? '⌘' : 'Ctrl'}K
            </kbd>
          )}
          {isLg && (
            <button
              onClick={() => onSubmit(value)}
              className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-brand-orange to-brand-deep-orange px-7 md:px-9 py-[13px] rounded-full text-[15px] font-bold text-white cursor-pointer hover:opacity-95 transition-opacity"
            >
              <Search size={16} /> <span className="hidden md:inline">Search</span>
            </button>
          )}
        </div>

        {open && hasSuggestions && (
          <div
            id={panelId}
            role="listbox"
            aria-label="Search suggestions"
            className={clsx(
              'dropdown-enter z-30 bg-white overflow-y-auto overscroll-contain',
              // Two complete, mutually exclusive literal strings (not
              // composed from separate flags) for the same reason as the
              // outer panel above — `absolute`/`relative` share the
              // `position` property, and several other pairs here
              // (top-[...]/top-0, max-h-[460px]/max-h-none) share their own
              // properties too.
              alwaysFullScreen
                ? 'relative top-0 mt-3 flex-1 max-h-none border-0 rounded-none shadow-none'
                : 'absolute left-0 right-0 top-[calc(100%+6px)] border border-bone rounded-2xl shadow-card-hover max-h-[460px] max-md:relative max-md:top-0 max-md:mt-3 max-md:flex-1 max-md:max-h-none max-md:rounded-none max-md:border-0 max-md:shadow-none',
            )}
          >
            {!isTyping ? (
              <>
                {/* ── Empty state: Recent Searches / Popular Categories / Trending / Tips ── */}
                {recent.length > 0 && (
                  <div className="px-3 py-3 border-b border-bone">
                    <div className="px-1 flex items-center justify-between gap-2">
                      <SearchSectionLabel icon={<Clock size={10} />}>Recent Searches</SearchSectionLabel>
                      <button
                        data-search-item
                        onClick={clearHistory}
                        className="flex items-center gap-1 text-[10.5px] font-semibold text-slate hover:text-brand-orange transition-colors cursor-pointer bg-transparent border-none p-1 -m-1"
                      >
                        <Trash2 size={11} /> Clear History
                      </button>
                    </div>
                    <div className="flex flex-col">
                      {recent.map(term => (
                        <SuggestionRow
                          key={term}
                          icon={<Clock size={13} />}
                          label={term}
                          onClick={() => pick(term)}
                          onRemove={() => removeRecent(term)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {recentlyViewed.length > 0 && (
                  <div className="px-3 py-3 border-b border-bone">
                    <div className="px-1"><SearchSectionLabel icon={<Eye size={10} />}>Recently Viewed</SearchSectionLabel></div>
                    <div className="flex gap-[10px] overflow-x-auto scrollbar-hide px-1">
                      {recentlyViewed.map(item => (
                        <button
                          key={item.id}
                          data-search-item
                          onClick={() => goToProduct(item.id)}
                          className="group shrink-0 w-[74px] text-left bg-transparent border-none cursor-pointer p-0 focus-visible:outline-none"
                        >
                          <span className="block w-[74px] h-[74px] rounded-[10px] overflow-hidden bg-brand-pale-orange">
                            {item.image
                              ? <img loading="lazy" decoding="async" src={item.image} alt="" className="w-full h-full object-cover" />
                              : <span className="w-full h-full flex items-center justify-center"><Sparkles size={16} className="text-brand-orange opacity-40" /></span>}
                          </span>
                          <span className="block text-[10.5px] text-charcoal leading-snug line-clamp-2 mt-[5px] group-hover:text-brand-deep-orange transition-colors">
                            {item.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {categories && categories.length > 0 && (
                  <div className="px-4 py-3 border-b border-bone">
                    <SearchSectionLabel icon={<LayoutGrid size={10} />}>Popular Categories</SearchSectionLabel>
                    <div className="flex flex-wrap gap-[7px]">
                      {categories.slice(0, 8).map(cat => (
                        <button
                          key={cat.id}
                          data-search-item
                          onClick={() => {
                            if (onCategorySelect) { onCategorySelect(cat.id); setOpen(false); onClose?.(); }
                            else pick(cat.name);
                          }}
                          className="flex items-center gap-[6px] max-w-[170px] px-[12px] py-[7px] rounded-full text-[11.5px] font-medium bg-white text-charcoal border border-bone hover:border-brand-orange hover:bg-brand-pale-orange hover:text-brand-deep-orange focus-visible:outline-none focus-visible:border-brand-orange focus-visible:bg-brand-pale-orange transition-colors duration-150 cursor-pointer"
                          title={cat.name}
                        >
                          <Tag size={11} className="shrink-0 text-brand-orange" />
                          <span className="truncate">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {popularStores && popularStores.length > 0 && (
                  <div className="px-4 py-3 border-b border-bone">
                    <SearchSectionLabel icon={<StoreIcon size={10} />} tone="brand">Popular Stores</SearchSectionLabel>
                    <div className="flex flex-wrap gap-[7px]">
                      {popularStores.slice(0, 6).map(s => (
                        <button
                          key={s.storeId}
                          data-search-item
                          onClick={() => goToStore(s.slug)}
                          className="flex items-center gap-[7px] max-w-[180px] pl-[5px] pr-[12px] py-[5px] rounded-full text-[11.5px] font-medium bg-white text-charcoal border border-bone hover:border-brand-orange hover:bg-brand-pale-orange hover:text-brand-deep-orange focus-visible:outline-none focus-visible:border-brand-orange focus-visible:bg-brand-pale-orange transition-colors duration-150 cursor-pointer"
                          title={s.name}
                        >
                          <span className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-brand-pale-orange flex items-center justify-center">
                            {s.logo
                              ? <img loading="lazy" decoding="async" src={s.logo} alt="" className="w-full h-full object-cover" />
                              : <StoreIcon size={12} className="text-brand-orange opacity-60" />}
                          </span>
                          <span className="truncate">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="px-3 py-3 border-b border-bone">
                  <div className="px-1"><SearchSectionLabel icon={<TrendingUp size={10} />} tone="brand">Trending Searches</SearchSectionLabel></div>
                  <div className="flex flex-col">
                    {TRENDING_SEARCHES.map(term => (
                      <SuggestionRow key={term} icon={<TrendingUp size={13} />} label={term} onClick={() => pick(term)} />
                    ))}
                  </div>
                </div>

                <div className="px-3 py-3">
                  <div className="px-1"><SearchSectionLabel icon={<Lightbulb size={10} />}>Search Tips</SearchSectionLabel></div>
                  <ul className="flex flex-col gap-[7px] px-1 text-[11.5px] text-slate leading-snug">
                    <li>Search a store's name to jump straight to its page.</li>
                    <li>Try a category name (e.g. "Digital Planner") to browse fast.</li>
                    <li>Keep it short — one or two words find more matches.</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                {/* ── Typing state: grouped Products / Stores / Categories, then "View all results" ── */}
                {(matchingProducts.length > 0 || poolLoading) && (
                  <div className="px-3 py-3 border-b border-bone">
                    <div className="px-1"><SearchSectionLabel icon={<Sparkles size={10} />}>Products</SearchSectionLabel></div>
                    {poolLoading && matchingProducts.length === 0 ? (
                      <div className="flex flex-col gap-2">
                        {[1, 2].map(i => (
                          <div key={i} className="flex items-center gap-3 px-2 py-2">
                            <SkeletonBox width={56} height={56} rounded="10px" />
                            <div className="flex-1 flex flex-col gap-[6px]">
                              <SkeletonBox width="70%" height={11} rounded="4px" />
                              <SkeletonBox width="35%" height={9} rounded="4px" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-[2px]">
                        {matchingProducts.map(p => (
                          <RecommendedProductRow key={p._id} product={p} categoryName={categoryNameFor(p)} query={query} onClick={() => goToProduct(p.slug)} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(storeMatches.length > 0 || storesLoading) && (
                  <div className="px-3 py-3 border-b border-bone">
                    <div className="px-1"><SearchSectionLabel icon={<StoreIcon size={10} />} tone="brand">Stores</SearchSectionLabel></div>
                    {storesLoading && storeMatches.length === 0 ? (
                      <div className="flex items-center gap-3 px-2 py-2">
                        <SkeletonBox width={56} height={56} rounded="10px" />
                        <div className="flex-1 flex flex-col gap-[6px]">
                          <SkeletonBox width="60%" height={11} rounded="4px" />
                          <SkeletonBox width="30%" height={9} rounded="4px" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-[2px]">
                        {storeMatches.map(s => (
                          <StoreMatchRow key={s.storeId} store={s} query={query} onClick={() => goToStore(s.slug)} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {matchingCategories.length > 0 && (
                  <div className="px-4 py-3 border-b border-bone">
                    <SearchSectionLabel icon={<LayoutGrid size={10} />}>Categories</SearchSectionLabel>
                    <div className="flex flex-col">
                      {matchingCategories.map(cat => (
                        <SuggestionRow
                          key={cat.id}
                          icon={<Tag size={13} />}
                          label={<HighlightMatch text={cat.name} query={query} />}
                          onClick={() => {
                            if (onCategorySelect) { onCategorySelect(cat.id); setOpen(false); onClose?.(); }
                            else pick(cat.name);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <button
                  data-search-item
                  onClick={() => { onSubmit(value); setOpen(false); onClose?.(); }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-transparent border-none text-left cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:bg-cream"
                >
                  <span className="text-[12.5px] font-semibold text-brand-orange">
                    View all results for "{value.trim()}"
                  </span>
                  <ArrowRight size={13} className="text-brand-orange shrink-0" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // alwaysFullScreen callers already host this inside their own fixed
  // full-screen container (see BuyerLayout's global search) — portaling to
  // <body> again on top of that would just be a redundant second layer.
  return !alwaysFullScreen && open && isMobileViewport ? createPortal(panel, document.body) : panel;
}

// Real SVG flags, not emoji — Windows has no built-in flag glyphs for
// regional-indicator emoji (it falls back to showing literal "PK"/"US"
// letter codes instead of a flag), so emoji flags render inconsistently
// across platforms. A small inline SVG renders identically everywhere.
function FlagPK({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={className} aria-hidden>
      <rect width="20" height="14" fill="#01411C" />
      <rect width="5" height="14" fill="#fff" />
      <circle cx="13.5" cy="7" r="3.6" fill="#fff" />
      <circle cx="14.6" cy="7" r="2.9" fill="#01411C" />
      <path d="M15.8 4.4l.5 1.5 1.5.1-1.2 1 .4 1.5-1.2-.9-1.2.9.4-1.5-1.2-1 1.5-.1z" fill="#fff" />
    </svg>
  );
}
function FlagUS({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={className} aria-hidden>
      <rect width="20" height="14" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map(y => (
        <rect key={y} y={y} width="20" height="1.077" fill="#B22234" />
      ))}
      <rect width="9" height="7.54" fill="#3C3B6E" />
    </svg>
  );
}

const CURRENCY_OPTIONS: { code: SupportedCurrency; Flag: typeof FlagPK; label: string }[] = [
  { code: 'PKR', Flag: FlagPK, label: 'Pakistani Rupee' },
  { code: 'USD', Flag: FlagUS, label: 'US Dollar' },
];

// PKR/USD dropdown, country flag + code in the trigger — built on the
// shared ActionMenu (same portal/positioning/keyboard-nav/click-outside
// mechanics used by every other dropdown in the app, e.g. admin table row
// actions) rather than a one-off implementation. Manual selection here
// always wins and persists — location detection only ever sets the
// initial default, never overrides an explicit choice.
export function CurrencySelector() {
  const { currency, setCurrency } = useCurrencyPreference();
  const active = CURRENCY_OPTIONS.find(c => c.code === currency) ?? CURRENCY_OPTIONS[0];

  return (
    <ActionMenu
      ariaLabel={`Currency: ${active.code}. Change currency`}
      trigger={
        <>
          <active.Flag className="w-4 h-3 rounded-[2px] shrink-0 object-cover" />
          <span className="hidden md:inline">{active.code}</span>
          <ChevronDown size={12} className="hidden md:inline text-slate" />
        </>
      }
      triggerClassName="flex items-center gap-1.5 text-[12px] font-semibold text-charcoal border border-bone rounded-md pl-2 pr-2 md:pr-[7px] py-1 bg-white hover:bg-cream transition-colors cursor-pointer shrink-0"
      items={CURRENCY_OPTIONS.map(c => ({
        label: (
          <span className="flex items-center gap-2 flex-1">
            <span className="flex-1">{c.code} — {c.label}</span>
            {c.code === active.code && <Check size={13} className="text-brand-orange shrink-0" />}
          </span>
        ),
        onClick: () => setCurrency(c.code),
        icon: <c.Flag className="w-4 h-3 rounded-[2px] shrink-0 object-cover" />,
      }))}
    />
  );
}

// `simple` mode (PublicLayout's marketing pages — Homepage/Pricing/etc.) drops
// wishlist/cart/currency entirely and, when logged out, shows a plain
// "Sign In" + "Start Selling" pair instead of the hover-preview quick-login
// widget (whose Orders/Wishlist/Messages shortcuts are buyer-shopping
// features that don't belong on a page whose one job is converting a visitor
// into a seller).
function AccountActions({ simple = false }: { simple?: boolean }) {
  const navigate = useNavigate();
  const sellEntry = useSellEntry();

  if (TokenStorage.isLoggedIn()) {
    return (
      <div className="flex items-center gap-2.5">
        <NotificationBell />
        <ProfileAvatar />
        {!simple && <CurrencySelector />}
      </div>
    );
  }

  if (simple) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate('/login')}
          className="text-[13px] font-medium text-white border border-white/25 rounded-md px-[14px] py-[7px] bg-transparent cursor-pointer hover:bg-white/10 transition-colors"
        >
          Sign In
        </button>
        <button
          onClick={sellEntry.go}
          disabled={sellEntry.loading}
          className="inline-flex items-center gap-[6px] text-[13px] font-semibold text-white border-none rounded-md px-[14px] py-[7px] bg-brand-orange cursor-pointer hover:bg-brand-deep-orange transition-colors disabled:opacity-60"
        >
          {sellEntry.loading && <Loader2 size={13} className="animate-spin" />}
          Start Selling
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
      <SignInPreview />
      <button
        onClick={() => navigate('/login')}
        className="md:hidden text-[13px] font-medium text-white border-none rounded-md px-[10px] py-[6px] bg-brand-orange cursor-pointer hover:bg-brand-deep-orange transition-colors"
      >
        Sign In
      </button>
      {/* Currency sits at the very end — the rightmost element in the navbar
         on every page. */}
      <CurrencySelector />
    </div>
  );
}

// A centerLinks entry with `children` — hover (desktop pointer) or click opens
// a small panel of real sub-pages (e.g. FAQ/Contact/Privacy under "Resources"),
// closes on outside click so it never lingers open while browsing elsewhere.
function NavDropdown({ label, children }: { label: string; children: { label: string; path: string }[] }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const isActive = children.some(c => pathname.startsWith(c.path));

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={clsx(
          'flex items-center gap-1 text-[13px] font-medium bg-transparent border-none cursor-pointer transition-colors duration-150',
          isActive ? 'text-brand-orange' : 'text-charcoal hover:text-brand-orange',
        )}
      >
        {label}
        <ChevronDown size={13} className={clsx('transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[180px] rounded-xl border border-bone bg-white shadow-raised py-1.5 z-50">
          {children.map(c => (
            <button
              key={c.path}
              onClick={() => { navigate(c.path); setOpen(false); }}
              className={clsx(
                'w-full text-left px-3.5 py-2 text-[13px] bg-transparent border-none cursor-pointer transition-colors duration-150',
                pathname.startsWith(c.path) ? 'text-brand-orange' : 'text-charcoal hover:bg-cream hover:text-brand-orange',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Shrinks slightly and gains a solid background + border once the page scrolls — the same
// "compact sticky header" behavior applies everywhere BuyerNavbar is used
// (Marketplace, Product Detail, Seller Storefront, Category/Search views).
// On mobile it also hides on scroll-down and reappears on scroll-up (the
// native-app pattern) — gated behind a 48px threshold + a real directional
// move so tiny scroll jitter near the top never flickers it, while still
// reacting quickly once a shopper actually starts scrolling down.
// Exported so MegaMenuBar can hide/show itself in the exact same
// scroll-direction rhythm as this navbar when the two are stacked together
// (Marketplace/EducationMarketplace) — otherwise the navbar slides off on
// scroll-down but MegaMenuBar stays put, leaving a dead gap where the
// navbar used to be instead of both moving as one unit.
export function useCompactOnScroll() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden]     = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    const el = scrollRootRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      setScrolled(y > 8);
      if (y > 48 && y > lastY.current + 3) setHidden(true);
      else if (y < lastY.current - 3 || y <= 8) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  return { scrolled, hidden };
}

export function BuyerNavbar({ variant = 'full', contextLabel, search, accentColor, backTo, hideSearch = false, centerLinks, hideCommerce = false }: BuyerNavbarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const uncontrolled = useUncontrolledSearch();
  const { scrolled, hidden } = useCompactOnScroll();
  const searchValue    = search?.value    ?? uncontrolled.value;
  const searchOnChange = search?.onChange ?? uncontrolled.onChange;
  // Below sm (~640px) there isn't room for logo + a real search input + wishlist/cart/
  // account icons in one row (confirmed via measurement: they need ~110px more than a
  // 320-375px viewport has) — so on mobile the search collapses to a single icon button
  // that expands to a full-width row in its place, same pattern as Amazon/Shopify mobile.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // The bottom-nav "Shop"/search tab links here with `?openSearch=1` so
  // tapping it feels like a native app's dedicated search screen — landing
  // straight on a focused search input instead of just a generic browse
  // page the shopper still has to go tap search on.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('openSearch') !== '1') return;
    setMobileSearchOpen(true);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('openSearch');
      return next;
    }, { replace: true });
    // Only ever react to the param this navbar instance mounted with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = useCallback((term?: string) => {
    pushLocalRecentSearch(term ?? searchValue);
    if (!search) uncontrolled.submit(term);
  }, [search, searchValue, uncontrolled]);

  return (
    <nav className={clsx(
      'sticky top-0 z-50 backdrop-blur-md transition-[background-color,border-color,transform] duration-200 border-b',
      scrolled ? 'bg-white border-bone' : 'bg-white/90 border-transparent',
      hidden ? '-translate-y-full md:translate-y-0' : 'translate-y-0',
    )}>
      <div className={clsx(
        'flex items-center gap-3 md:gap-5 px-4 md:px-6 lg:px-10 transition-[height] duration-200',
        scrolled ? 'h-[52px]' : 'h-[60px]',
      )}>

        {/* Logo — hidden while the mobile search row is expanded so the input gets full width */}
        <button
          onClick={() => navigate('/')}
          aria-label="Edudeen home"
          className={clsx(
            'items-center gap-[6px] shrink-0 cursor-pointer bg-transparent border-none p-0 outline-none rounded-sm focus-visible:ring-2 focus-visible:ring-brand-orange/40',
            mobileSearchOpen ? 'hidden md:flex' : 'flex',
          )}
        >
          <EdudeenLogo size={scrolled ? 28 : 34} className="transition-[width,height] duration-200" />
          {contextLabel && (
            <>
              <span className="text-bone mx-1 hidden md:inline">|</span>
              <span className="text-[13px] text-slate hidden md:inline">{contextLabel}</span>
            </>
          )}
        </button>

        {/* Center nav links — desktop only, real navigation living in the one
           navbar instead of a separate strip underneath it. flex-1 + justify-center
           so it actually centers in the row's remaining space (the search box
           beside it drops its own flex-1 in this mode — see below — so this
           is the only flexible element and gets the true middle). */}
        {centerLinks && centerLinks.length > 0 && !mobileSearchOpen && (
          <div className="hidden lg:flex flex-1 items-center justify-center gap-6">
            {centerLinks.map(item => {
              const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
              if (item.children?.length) {
                return <NavDropdown key={item.label} label={item.label} children={item.children} />;
              }
              return (
                <button
                  key={item.label}
                  onClick={() => (item.onClick ? item.onClick() : navigate(item.path))}
                  className={clsx(
                    'text-[13px] font-medium bg-transparent border-none cursor-pointer transition-colors duration-150',
                    isActive || item.highlight ? 'text-brand-orange' : 'text-charcoal hover:text-brand-orange',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}

        {variant === 'minimal' ? (
          <div className="flex-1 flex items-center justify-end">
            {backTo && (
              <Button variant="ghost" size="sm" onClick={() => navigate(backTo.path)}>
                <ArrowLeft size={14} className="inline align-middle mr-1" />
                {backTo.label}
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Single SearchBox instance — its container is always visible at sm+,
                and on mobile only shown once the search icon below is tapped.
                Omitted entirely when hideSearch (page already has its own
                larger dedicated search bar below the navbar). */}
            {!hideSearch && (
              <div className={clsx(
                'min-w-0 justify-center',
                mobileSearchOpen ? 'flex flex-1' : clsx('hidden md:flex md:flex-1', centerLinks?.length && 'lg:flex-none lg:max-w-[300px]'),
              )}>
                <SearchBox
                  // Forces a fresh mount every time the icon tap opens this
                  // row — `autoFocus` only ever fires at real mount time, so
                  // without this, toggling the prop on an already-mounted
                  // instance focused nothing and the shopper had to tap the
                  // (now-visible) input a second time before the full-screen
                  // search actually opened.
                  key={mobileSearchOpen ? 'open' : 'closed'}
                  value={searchValue}
                  onChange={searchOnChange}
                  placeholder={search?.placeholder}
                  categories={search?.categories}
                  onCategorySelect={search?.onCategorySelect}
                  popularStores={search?.popularStores}
                  onSubmit={term => { handleSearchSubmit(term); setMobileSearchOpen(false); }}
                  autoFocus={mobileSearchOpen}
                  onClose={() => setMobileSearchOpen(false)}
                />
              </div>
            )}

            {!hideSearch && !mobileSearchOpen && (
              <button
                onClick={() => setMobileSearchOpen(true)}
                aria-label="Search"
                className="md:hidden ml-auto shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-charcoal cursor-pointer hover:bg-cream transition-colors"
              >
                <Search size={16} />
              </button>
            )}
            {!hideSearch && mobileSearchOpen && (
              <button
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Close search"
                className="md:hidden shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-cream text-charcoal cursor-pointer"
              >
                <X size={16} />
              </button>
            )}

            {/* Actions — hidden on mobile while search is expanded so the input gets full width.
               With hideSearch there's no flex-1 search container to push this group to the
               right edge, so it takes ml-auto itself in that case. `overflow-x-auto` is a
               safety net, not the primary fix — on a narrow phone this many icons (wishlist/
               cart/notifications/avatar/currency) plus the logo genuinely don't all fit, and
               previously the excess (usually the currency picker, being last) just rendered
               past the screen edge with no way to reach it at all. This guarantees every
               icon stays reachable by a horizontal swipe even in the tightest case. */}
            <div className={clsx('items-center gap-1 md:gap-2.5 min-w-0 overflow-x-auto scrollbar-hide', mobileSearchOpen ? 'hidden md:flex' : 'flex', hideSearch && 'ml-auto')}>
              {backTo && (
                <div className="hidden md:inline-flex">
                  <Button variant="ghost" size="sm" onClick={() => navigate(backTo.path)}>
                    <ArrowLeft size={14} className="inline align-middle mr-1" />
                    {backTo.label}
                  </Button>
                </div>
              )}
              {!hideCommerce && (
                <>
                  <MiniWishlist />
                  <MiniCart accentColor={accentColor} />
                </>
              )}
              <AccountActions simple={hideCommerce} />
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
