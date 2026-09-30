import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from 'react';
import { clsx } from 'clsx';
import { TokenStorage } from '@/api/services/auth';
import { ProductImage } from '@/components/comman/marketplace/ProductCard';
import {
  Star, ChevronRight, ShieldCheck, BadgeCheck, ChevronDown, Tag, Store, Sparkles, Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MarketplaceProduct } from '@/api/services/marketplace';
import { type CategoryNode } from '@/api/services/categories';
import { isBuyerSession } from '@/hooks/auth/useIsBuyer';
import { type PublicStoreListItem } from '@/api/services/store';
import { RealAppQr, AppleGlyph, GooglePlayGlyph, GOOGLE_PLAY_URL } from '@/components/comman/ui/AppPromoParts';
import { StoreFeatureCard, useCompactOnScroll, CountdownUnit } from '@/components/comman/ui';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { currencySymbol } from '@/utils/currency';
import aboutImg1 from '@/assets/about/about-1.jfif';
import aboutImg2 from '@/assets/about/about-2.jfif';
import aboutImg3 from '@/assets/about/about-3.jfif';

// ── Compact rail card — dense Flash Sale / Top Picks strip card ────────────────
export function RailCard({ product, onClick, badge, rank, size = 'md', stockLabel }: {
  product: MarketplaceProduct;
  onClick: (id: string) => void;
  badge?: ReactNode;
  rank?: number;
  size?: 'md' | 'sm';
  stockLabel?: string;
}) {
  const dv              = (product.variants ?? []).find(v => v.isDefault) ?? product.variants?.[0];
  const nativePrice     = dv?.price ?? null;
  const nativeCompareAt = dv?.compareAtPrice ?? null;
  const { currency: displayCurrency, convert } = useCurrencyPreference();
  const priceSymbol = currencySymbol(displayCurrency);
  const price     = nativePrice != null ? convert(nativePrice, dv?.currency) : null;
  const compareAt = nativeCompareAt != null ? convert(nativeCompareAt, dv?.currency) : null;
  const isSm      = size === 'sm';
  return (
    <button
      onClick={() => onClick(product.slug)}
      className={clsx(
        'relative shrink-0 text-left bg-white rounded-[14px] border border-bone overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-[3px] hover:border-brand-orange/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
        isSm ? 'w-[92px] sm:w-[104px]' : 'w-[112px] sm:w-[126px]',
      )}
    >
      {/* Hover accent — same sweep-in top line used on TopStoreCard/Feature cards,
         so this rail card finally reads as the same design system, not a
         separate/older component. */}
      <div className="absolute top-0 left-0 right-0 h-[3px] z-[1] bg-gradient-to-r from-brand-orange to-[#66AD36] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />

      <div className="relative">
        <ProductImage
          images={product.images ?? []}
          name={product.name}
          className={clsx('transition-transform duration-500 ease-out group-hover:scale-[1.06]', isSm ? 'h-[74px] sm:h-[80px]' : 'h-[92px] sm:h-[100px]')}
        />
        {badge && <div className="absolute top-[5px] left-[5px]">{badge}</div>}
        {rank != null && (
          <span className="absolute bottom-[5px] left-[5px] w-[18px] h-[18px] rounded-full bg-carbon/85 backdrop-blur-sm text-white text-[10px] font-bold flex items-center justify-center">
            {rank}
          </span>
        )}
      </div>
      <div className={isSm ? 'px-[7px] py-[6px]' : 'px-[9px] py-[8px]'}>
        <p className={clsx('font-semibold text-carbon leading-tight line-clamp-2', isSm ? 'text-[10px] mb-[3px] min-h-[24px]' : 'text-[11px] mb-[5px] min-h-[28px]')}>{product.name}</p>
        <div className="flex items-baseline gap-[4px]">
          <span className={clsx('font-bold text-carbon', isSm ? 'text-[11px]' : 'text-[12px]')}>{price != null ? `${priceSymbol}${price.toLocaleString()}` : '—'}</span>
          {compareAt != null && compareAt > (price ?? 0) && (
            <span className="text-[9.5px] text-slate line-through">{priceSymbol}{compareAt.toLocaleString()}</span>
          )}
        </div>
        <span className="flex items-center gap-[2px] text-[9.5px] text-slate mt-[3px]">
          <Star size={8} className={product.averageRating > 0 ? 'text-brand-orange fill-brand-orange' : 'text-bone fill-bone'} />
          {product.averageRating > 0 ? product.averageRating.toFixed(1) : 'New'}
        </span>
        {stockLabel && (
          <span className="block text-[9px] font-semibold text-amber-600 mt-[3px]">{stockLabel}</span>
        )}
      </div>
    </button>
  );
}

// ── Category bar icon — reuses each category's real uploaded image, falls back to a tag glyph ──
export function CategoryBarIcon({ category }: { category: CategoryNode }) {
  if (category.image) {
    return (
      <span className="w-[24px] h-[24px] rounded-lg overflow-hidden shrink-0 bg-cream border border-bone">
        <img loading="lazy" decoding="async" src={category.image} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }
  return (
    <span className="w-[24px] h-[24px] rounded-lg bg-brand-pale-orange flex items-center justify-center shrink-0">
      <Tag size={13} className="text-brand-orange" />
    </span>
  );
}

// Shared "swipeable rail on mobile, fixed single-row grid at sm+" pattern —
// every mega-panel section that shows a row of RailCards (Flash Sale, both
// Top Picks sections) uses this exact className, so they can't drift into
// slightly different breakpoints/gaps from each other over time. Mobile gets
// a real horizontal swipe carousel (edge-to-edge via the `-mx-4 px-4` bleed,
// which exactly cancels the shared panel's own `px-4` mobile gutter) — the
// native app "deals rail" pattern — instead of forcing 3-4 cramped grid
// columns into the width. `sm:` and up switches to the wrapped grid, since
// there's real room there for a fixed single-row layout.
const RAIL_GRID_CLS = 'flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-5 sm:overflow-visible xl:grid-cols-7';

// ── Full-width mega-menu content panes ───────────────────────────────────────
// Each of the 5 nav items below renders into the SAME shared full-width panel
// (see MegaMenuBar) rather than its own floating box — matching Alibaba's
// mega menu, which always opens as one bar spanning the page under the header.
// One label component for every section header inside any of the 5 panes —
// guarantees the "one consistent design language" requirement structurally
// (a shared component can't drift the way 8 copy-pasted <p> tags eventually do).
export function MegaSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10.5px] font-bold text-slate uppercase tracking-[0.07em] mb-3">
      {children}
    </p>
  );
}

export function CategoriesMegaContent({
  categories, onShopCategory, initialActiveId,
  fixedHeight,
}: {
  categories:     CategoryNode[];
  onShopCategory: (id: string) => void;
  /** Which category starts selected — defaults to the first one. Lets a
   *  caller open this already focused on a specific category (e.g. the one
   *  the shopper just clicked to get here) instead of always resetting to
   *  the top of the list. */
  initialActiveId?: string;
  /** When set, columns 1 & 2 lock to this pixel height with their own
   *  independent scroll beneath a fixed header, so clicking a category with
   *  fewer/more subcategories never resizes the modal/dropdown around it
   *  (Alibaba's category-browser pattern). Used by both the "Categories for
   *  you" modal (520px) and the navbar's hover dropdown (380px, a shorter
   *  cap fitting a slim bar rather than a full-screen modal). */
  fixedHeight?: number;
}) {
  const [activeId, setActiveId] = useState<string | null>(initialActiveId ?? categories[0]?._id ?? null);
  const active = categories.find(c => c._id === activeId) ?? categories[0] ?? null;

  if (categories.length === 0) return <p className="text-[13px] text-slate">No categories yet.</p>;

  // Fixed height is applied via a CSS custom property + a static `lg:h-` arbitrary-value utility
  // class — never a plain inline `height`, and never gated below `lg` — so
  // that below `lg` both columns flow naturally with the page's own single
  // scroll (the outer mega-panel's `max-h-[70vh] overflow-y-auto`) instead
  // of being boxed into two independently-scrolling fixed-height panes
  // stacked on top of each other. That nested-scroll-inside-scroll (plus a
  // static 3-column subcategory grid that could only grow taller) is
  // exactly what read as heavy/cramped on a phone; one clean scroll and a
  // horizontally swipeable subcategory rail (below) is the native app
  // pattern instead. (Tailwind's scanner can see the literal class
  // `lg:h-[var(--mega-col-h)]` in source — it just can't see a value baked
  // into a template-literal class name — which is why the actual pixel
  // number still has to travel through a real inline style.)
  const colVars = fixedHeight ? ({ '--mega-col-h': `${fixedHeight}px` } as CSSProperties) : undefined;
  const colHeightCls = fixedHeight ? 'lg:h-[var(--mega-col-h)]' : undefined;
  const colInnerCls = fixedHeight ? 'lg:flex-1 lg:min-h-0 lg:overflow-y-auto' : 'max-h-[400px] overflow-y-auto';

  return (
    <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
      {/* Column 1 — category links */}
      <div className={clsx('w-full lg:w-[220px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-bone pb-4 lg:pb-0 pr-0 lg:pr-6', colHeightCls)} style={colVars}>
        <MegaSectionLabel>Categories</MegaSectionLabel>
        <div className={clsx('flex flex-col gap-[2px] pr-1 -mr-1', colInnerCls)}>
          {categories.map(cat => (
            <button
              key={cat._id}
              onMouseEnter={() => setActiveId(cat._id)}
              onFocus={() => setActiveId(cat._id)}
              onClick={() => onShopCategory(cat._id)}
              className={clsx(
                'w-full flex items-center gap-[10px] px-[10px] py-[9px] rounded-lg text-left bg-transparent border-none cursor-pointer transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                activeId === cat._id ? 'bg-brand-pale-orange text-brand-orange' : 'text-charcoal hover:bg-cream',
              )}
            >
              <CategoryBarIcon category={cat} />
              <span className="flex-1 text-[12.5px] font-medium truncate">{cat.name}</span>
              <ChevronRight size={13} className={clsx('shrink-0 transition-transform', activeId === cat._id ? 'text-brand-orange translate-x-[2px]' : 'text-slate/50')} />
            </button>
          ))}
        </div>
      </div>

      {/* Column 2 — subcategory rail/grid + trending searches */}
      <div className={clsx('w-full lg:flex-1 lg:min-w-0 flex flex-col border-b lg:border-b-0 lg:border-r border-bone pb-4 lg:pb-0 pr-0 lg:pr-8', colHeightCls)} style={colVars}>
        <MegaSectionLabel>Subcategories</MegaSectionLabel>
        <div className={clsx('pr-1 -mr-1', colInnerCls)}>
        {active && active.children.length > 0 ? (
          // Mobile: one horizontally swipeable icon rail — the same
          // "browse by subcategory" pattern every shopping app uses —
          // instead of a static 3-column grid that only ever grew taller
          // with more items. `lg:` and up switches to that original grid.
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1 mb-5 lg:mx-0 lg:px-0 lg:pb-0 lg:mb-6 lg:grid lg:grid-cols-4 xl:grid-cols-5 lg:gap-x-3 lg:gap-y-4 lg:overflow-visible">
            {active.children.map(sub => (
              <button
                key={sub._id}
                onClick={() => onShopCategory(sub._id)}
                className="flex flex-col items-center gap-[7px] text-center bg-transparent border-none cursor-pointer p-0 shrink-0 w-[64px] lg:w-auto group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                <span className="w-14 h-14 rounded-full overflow-hidden bg-cream border border-bone flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:-translate-y-[2px] group-hover:border-brand-orange/40">
                  {sub.image
                    ? <img loading="lazy" decoding="async" src={sub.image} alt="" className="w-full h-full object-cover" />
                    : <Tag size={18} className="text-brand-orange opacity-50" />}
                </span>
                <span className="text-[11px] font-medium text-charcoal leading-tight line-clamp-2 group-hover:text-brand-orange transition-colors">
                  {sub.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-slate mb-5 lg:mb-6">No subcategories yet — browse everything in {active?.name}.</p>
        )}
        </div>
      </div>
    </div>
  );
}

export function FlashSaleMegaContent({ flashDeals, countdown, onProductClick }: {
  flashDeals: { product: MarketplaceProduct; pct: number }[];
  countdown:  { h: string; m: string; s: string };
  onProductClick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-5">
      {/* Countdown banner — a slim horizontal strip on mobile (icon + title +
         timer in one row, description hidden), placed ABOVE the deals rail
         via `order-first` — the native app pattern (Daraz/Temu: a compact
         sale banner pinned above a swipeable card row), instead of a tall
         vertical card squeezed below a cramped grid. At `lg:` it reverts to
         the original vertical card, sitting to the right of the rail
         (`order-none` restores normal DOM order — products first). */}
      <div className="relative order-first lg:order-none w-full lg:w-[190px] shrink-0 overflow-hidden rounded-2xl border border-black/10 flex flex-row lg:flex-col items-center gap-3 lg:gap-0 p-3 lg:p-4 text-white">
        <div className="gradient-drift absolute inset-0 bg-gradient-to-br from-[#e11d48] via-[#d9375b] to-brand-deep-orange" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.2),transparent_55%)]" />
        <div className="pointer-events-none absolute -bottom-8 -right-6 size-24 rounded-full bg-white/10 blur-2xl" />

        <span className="relative z-[1] flex size-9 items-center justify-center rounded-full bg-white/15 shrink-0 lg:mb-2">
          <Flame size={17} className="text-white" />
        </span>

        <div className="relative z-[1] min-w-0 flex-1 lg:flex-none lg:text-center">
          <p className="text-[13.5px] font-bold leading-tight lg:mb-[3px]">Flash Sale</p>
          <p className="hidden lg:block text-[10.5px] text-white/80 mb-3 leading-snug">Deep discounts, while stock lasts.</p>
        </div>

        <div className="relative z-[1] flex flex-col items-center shrink-0">
          <span className="text-[7.5px] font-bold uppercase tracking-[0.1em] text-white/70 mb-[3px] lg:mb-[6px]">Ends In</span>
          <div className="flex items-center gap-[5px]">
            <CountdownUnit value={Number(countdown.h)} label="Hrs" size="sm" />
            <span className="pb-[10px] text-[13px] font-bold leading-none text-white/50">:</span>
            <CountdownUnit value={Number(countdown.m)} label="Min" size="sm" />
            <span className="pb-[10px] text-[13px] font-bold leading-none text-white/50">:</span>
            <CountdownUnit value={Number(countdown.s)} label="Sec" size="sm" />
          </div>
        </div>
      </div>

      <div className="w-full lg:flex-1 lg:min-w-0">
        <MegaSectionLabel>Today's Flash Deals</MegaSectionLabel>
        {flashDeals.length === 0 ? (
          <p className="text-[12px] text-slate">No flash deals right now.</p>
        ) : (
          <div className={RAIL_GRID_CLS}>
            {flashDeals.slice(0, 7).map(({ product, pct }) => {
              const dv = (product.variants ?? []).find(v => v.isDefault) ?? product.variants?.[0];
              const isPhysical = (product.productType ?? product.type ?? 'physical') === 'physical';
              // Real stock only — no fabricated "sold" percentage, since there's
              // no original-stock figure to compute one against honestly. A
              // variant marked unlimitedStock is never "low stock" either.
              const stock = isPhysical && !dv?.unlimitedStock ? (dv?.stock ?? 0) : null;
              return (
                <RailCard
                  key={product._id}
                  product={product}
                  onClick={onProductClick}
                  size="sm"
                  badge={<span className="px-[6px] py-[2px] rounded-[5px] text-[9px] font-bold bg-[#e11d48] text-white shadow-[0_2px_6px_rgba(225,29,72,0.35)]">-{pct}%</span>}
                  stockLabel={stock != null && stock > 0 && stock <= 5 ? `Only ${stock} left` : undefined}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function TopPicksMegaContent({ topPicks, bestRated = [], onProductClick }: {
  topPicks: MarketplaceProduct[];
  /** A distinct, purely-rating-sorted slice — real signal, separate from
   *  topPicks' purchase+rating blend, so the panel isn't one section twice
   *  under two names. Optional/defaults to empty so callers that don't
   *  compute it (Education) just don't get a second section. */
  bestRated?: MarketplaceProduct[];
  onProductClick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <MegaSectionLabel>Trending With Buyers</MegaSectionLabel>
        {topPicks.length === 0 ? (
          <p className="text-[12px] text-slate">No top picks yet.</p>
        ) : (
          <div className={RAIL_GRID_CLS}>
            {topPicks.slice(0, 7).map(product => (
              <RailCard
                key={product._id}
                product={product}
                onClick={onProductClick}
                size="sm"
                badge={product.purchaseCount > 0 ? (
                  <span className="px-[6px] py-[2px] rounded-[5px] text-[9px] font-bold bg-carbon/80 text-white backdrop-blur-sm">
                    {product.purchaseCount} sold
                  </span>
                ) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {bestRated.length > 0 && (
        <div className="pt-4 border-t border-bone">
          <MegaSectionLabel>Best Rated</MegaSectionLabel>
          <div className={RAIL_GRID_CLS}>
            {bestRated.slice(0, 7).map(product => (
              <RailCard
                key={product._id}
                product={product}
                onClick={onProductClick}
                size="sm"
                badge={product.averageRating > 0 ? (
                  <span className="flex items-center gap-[2px] px-[6px] py-[2px] rounded-[5px] text-[9px] font-bold bg-carbon/80 text-white backdrop-blur-sm">
                    <Star size={8} className="fill-white" /> {product.averageRating.toFixed(1)}
                  </span>
                ) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FeaturedSellersMegaContent({ topStores, onStoreClick }: {
  topStores: PublicStoreListItem[];
  onStoreClick: (slug: string) => void;
}) {
  return (
    <div>
      <MegaSectionLabel>Featured Stores</MegaSectionLabel>
      {topStores.length === 0 ? (
        <p className="text-[12px] text-slate">No featured stores yet.</p>
      ) : (
        // `StoreFeatureCard` is a fixed-width rail card (240-264px), not a
        // grid-friendly square — `flex-wrap` let it stack full-width cards
        // vertically on a narrow phone (4 stacked ≈ 560px of dead height).
        // A horizontal swipe rail instead — desktop is unaffected, since 4
        // cards already fit in one row there with room to spare either way.
        <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
          {topStores.slice(0, 4).map(s => <StoreFeatureCard key={s.storeId} store={s} onClick={onStoreClick} />)}
        </div>
      )}
    </div>
  );
}

// ── "About Edudeen.com" mega content — plain, borderless image+text
// columns (no card box/border/shadow around each item) + an app/QR column
// after a thin divider, matching Alibaba's actual "About Alibaba.com" tab
// layout exactly (verified against a screenshot of it) rather than the
// boxed-card look this had before. Real photos, object-cover on a fixed-
// height crop so any source aspect ratio lands the same, subtle zoom on
// hover. Single row always (no wrap): `flex-1` lets the 3 photo columns
// grow evenly when there's room, `shrink-0`+`min-w` stops them shrinking
// below legible size on a narrow screen instead — the row scrolls sideways
// there rather than wrapping. ──
const ABOUT_CARDS: { image: string; title: string; description: string; path: string }[] = [
  { image: aboutImg1, title: 'Why Edudeen',      description: 'One platform for books, courses and learning downloads.', path: '/' },
  { image: aboutImg2, title: 'Buyer Protection', description: 'Secure payments and easy returns, every order.',    path: '/faq' },
  { image: aboutImg3, title: 'Sell on Edudeen',  description: 'Launch your own branded store — no coding.',        path: '/sellers' },
];

function AboutMegaContent({ onNavigate }: { onNavigate: (path: string) => void }) {
  // No "Sell on Edudeen" card for a signed-in buyer.
  const cards = isBuyerSession() ? ABOUT_CARDS.filter(c => c.path !== '/sellers') : ABOUT_CARDS;
  return (
    <div className="flex items-start gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-1">
      {cards.map(({ image, title, description, path }, i) => (
        <button
          key={title}
          onClick={() => onNavigate(path)}
          style={{ animationDelay: `${i * 60}ms` }}
          className="dash-section-enter group flex-1 min-w-[150px] shrink-0 text-left bg-transparent border-none p-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
        >
          <div className="relative h-[92px] overflow-hidden rounded-lg mb-3">
            <img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]"
            />
          </div>
          <p className="text-[13px] font-bold text-carbon leading-snug mb-1 group-hover:text-brand-orange transition-colors">{title}</p>
          <p className="text-[11px] text-slate leading-[1.5]">{description}</p>
        </button>
      ))}

      {/* Thin divider before the app column — same as Alibaba's reference. */}
      <div className="w-px self-stretch bg-bone shrink-0" />

      <div style={{ animationDelay: `${3 * 60}ms` }} className="dash-section-enter w-[220px] shrink-0">
        <p className="text-[13px] font-bold text-brand-orange leading-snug mb-1">Get the Edudeen app</p>
        <p className="text-[11px] text-slate leading-[1.5] mb-3">Browse products, chat with sellers, and manage and pay for your orders with the Edudeen app — anytime, anywhere.</p>
        <div className="flex items-center gap-3">
          <div className="shrink-0 rounded-md bg-white p-1 border border-bone">
            <RealAppQr size={64} />
          </div>
          <div className="flex flex-col gap-[6px]">
            <a
              href={GOOGLE_PLAY_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-[6px] rounded-[6px] bg-carbon px-[10px] py-[6px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <GooglePlayGlyph size={11} />
              <span className="text-[10.5px] font-semibold text-white leading-none">Google Play</span>
            </a>
            <span className="flex items-center gap-[6px] rounded-[6px] bg-carbon px-[10px] py-[6px]">
              <AppleGlyph size={12} />
              <span className="text-[10.5px] font-semibold text-white leading-none">App Store</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared full-width mega-menu bar — one bar hosts all 5 nav triggers plus a
// single mega-menu panel that spans the whole content container directly under
// the header, exactly like Alibaba: hovering any trigger swaps the panel's
// content; the panel stays open while the cursor is over the trigger row OR
// the panel itself (they share one DOM subtree, so no gap-crossing flicker),
// and closes only once the mouse leaves both. ──
type MegaMenuKey = 'categories' | 'flash-sale' | 'top-picks' | 'featured-sellers' | 'about';

interface MegaMenuExtraTrigger {
  key: Exclude<MegaMenuKey, 'categories'>;
  label: string;
  icon: LucideIcon;
  chevron: boolean;
  className: string;
}

// Default trigger set — Flash Sale / Top Picks / Featured Stores / About, each
// with its own icon and a filled hover/active pill (not a plain text link) so
// this reads as a real navigation feature, not an afterthought row.
const DEFAULT_EXTRA_TRIGGERS: MegaMenuExtraTrigger[] = [
  { key: 'flash-sale',       label: 'Flash Sale',      icon: Flame,    chevron: true,  className: '' },
  { key: 'top-picks',        label: 'Top Picks',       icon: Star,     chevron: true,  className: '' },
  { key: 'featured-sellers', label: 'Featured Stores', icon: Store,    chevron: true,  className: '' },
  { key: 'about',            label: 'About Edudeen',   icon: Sparkles, chevron: false, className: '' },
];

export function MegaMenuBar({
  categories = [], topPicks, bestRated = [], flashDeals, topStores, countdown,
  onShopCategory = () => {}, onProductClick, onStoreClick, onNavigate,
  categoriesLabel = 'All Categories', categoriesContent, extraTriggers = DEFAULT_EXTRA_TRIGGERS, compact = false,
}: {
  categories?: CategoryNode[];
  topPicks:   MarketplaceProduct[];
  /** Purely-rating-sorted slice for Top Picks' second "Best Rated" section —
   *  optional, defaults to empty (no second section) for callers that don't
   *  compute one. */
  bestRated?: MarketplaceProduct[];
  flashDeals: { product: MarketplaceProduct; pct: number }[];
  topStores:  PublicStoreListItem[];
  countdown:  { h: string; m: string; s: string };
  onShopCategory?: (id: string) => void;
  onProductClick: (id: string) => void;
  onStoreClick:   (slug: string) => void;
  onTrendingTerm?: (term: string) => void;
  onNavigate:     (path: string) => void;
  /** Trigger label for the first item — defaults to "All Categories" (Marketplace).
   *  Education passes "Grade Levels" instead. */
  categoriesLabel?: string;
  /** Override the first panel's content entirely — Education has no real
   *  CategoryNode tree, so it passes its own grade-level/subject panel here
   *  instead of forcing facet data into a category shape it doesn't have. */
  categoriesContent?: ReactNode;
  /** Triggers rendered after "All Categories" — defaults to Flash Sale/Top
   *  Picks/Featured Stores/About. Pass `[]` to render just the categories
   *  trigger (Marketplace, once that content has its own page sections). */
  extraTriggers?: MegaMenuExtraTrigger[];
  /** Small, plain-text scale (no icons, no hover pills) — the row reads as
   *  a thin Alibaba-style utility bar with breathing room in the middle,
   *  instead of the default larger app-nav look. Used when this row sits
   *  above the hero (Marketplace) rather than below it. */
  compact?: boolean;
}) {
  const [active, setActive] = useState<MegaMenuKey | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Switching straight from one open panel to another swapped content
  // instantly mid-transition — the shared panel never actually left the
  // screen, it just snapped to the new tab's content. Alibaba's own mega
  // menu instead closes the current panel first, then opens the new one,
  // so this holds the requested key and fires it only after the close
  // transition (200ms, matches the panel's own `duration-200`) has played.
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Same scroll-direction signal BuyerNavbar uses for its own mobile
  // hide-on-scroll-down/show-on-scroll-up — so when this bar sits directly
  // under that navbar, the two hide and reappear together as one unit
  // instead of the navbar sliding away while this one stays put.
  const { hidden } = useCompactOnScroll();

  const clearCloseTimer = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; } };
  const clearSwitchTimer = () => { if (switchTimer.current) { clearTimeout(switchTimer.current); switchTimer.current = null; } };
  const scheduleClose = () => {
    clearCloseTimer();
    clearSwitchTimer();
    closeTimer.current = setTimeout(() => setActive(null), 150);
  };
  const openMenu = (key: MegaMenuKey) => {
    clearCloseTimer();
    // Always cancel any switch already in flight first — otherwise a stale
    // timer from a *previous* hover target could still fire later and
    // stomp on whatever this fresh call is about to do.
    clearSwitchTimer();
    if (active === key) return;
    if (active === null) { setActive(key); return; }
    // Something else is already open — close it first (triggers the panel's
    // own fade/slide-up), then open the newly-hovered one once that's had
    // time to play, instead of hard-swapping the content underneath it.
    setActive(null);
    switchTimer.current = setTimeout(() => setActive(key), 200);
  };
  const selectMenu = (key: MegaMenuKey) => {
    clearCloseTimer();
    if (active === key) { clearSwitchTimer(); setActive(null); return; }
    openMenu(key);
  };

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);

  useEffect(() => () => { clearCloseTimer(); clearSwitchTimer(); }, []);

  const triggerCls = (key: MegaMenuKey, extra?: string) => clsx(
    'group relative flex items-center gap-[6px] py-2 text-[13px] font-semibold border-none cursor-pointer whitespace-nowrap transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
    active === key ? 'text-brand-orange' : 'text-charcoal hover:text-brand-orange',
    extra,
  );
  const triggerUnderlineCls = (key: MegaMenuKey) => clsx(
    'absolute left-0 right-0 -bottom-[2px] h-[2px] rounded-full bg-brand-orange origin-left transition-transform duration-200',
    active === key ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50',
  );

  return (
    <div className="relative" onMouseLeave={scheduleClose}>
      {/* ── Merged navigation row — "All Categories" + Flash Sale/Top Picks/Featured
         Stores/About triggers (left, in their own nowrap+horizontal-scroll
         sub-row — same `scrollbar-hide` chip-row pattern used elsewhere in
         this app, and it never wraps/grows tall, same as the navbar above
         it, so it can't cover other fixed UI like the mobile Filter tab),
         Verified Sellers/Verified Stores/Track Order/Help Center/Contact
         (right, pushed there via `ml-auto`, desktop-only). Previously two
         separate white rows (a "category line" and a "welcome line") that
         duplicated the same navigational weight — merged into one to remove
         that redundancy. On a tablet-width screen where the nav row and the
         utility links together don't fit side by side, the utility links
         wrap down to their own full-width second line instead of cramming/
         overlapping the nav row (the outer row is `flex-wrap`; only the
         nav sub-row is nowrap). ── */}
      <div className={clsx(
        'bg-white border-b border-bone transition-transform duration-200',
        hidden ? '-translate-y-full md:translate-y-0' : 'translate-y-0',
      )}>
        <div className={clsx(
          // Outer row wraps as a whole (`flex-wrap`) — but the nav group
          // (categories + extraTriggers) is wrapped in its own nested
          // nowrap+horizontal-scroll container just below, so IT never
          // breaks apart: it either fits on line 1 in full or scrolls
          // sideways. That leaves the utility link span (below, its own
          // flex child with `ml-auto`) as the only thing that can drop
          // onto its own full-width line 2 when the two groups together
          // don't fit — instead of the old behavior of both cramming/
          // overlapping on one line.
          'flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-6 lg:px-10',
          compact ? 'py-[7px]' : 'py-[11px]',
        )}>
          <div className="flex flex-nowrap items-center gap-x-4 overflow-x-auto scrollbar-hide min-w-0 shrink">
          <button
            aria-haspopup="true"
            aria-expanded={active === 'categories'}
            onMouseEnter={() => openMenu('categories')}
            onClick={() => selectMenu('categories')}
            className={triggerCls('categories', clsx(
              // Mobile: a real chip (rounded, filled), same native-app feel
              // as the rest of this row on a small screen — regardless of
              // `compact`, which only governs the *desktop* thin-utility-bar
              // look from `md:` up. `md:` (768px), not `sm:`, so this switches
              // at the exact same breakpoint BuyerLayout's bottom nav bar
              // hides at (`md:hidden`) — the whole page should flip from
              // mobile-app-style chrome to desktop chrome at one shared line,
              // not several slightly-different ones.
              'shrink-0 rounded-full px-3 py-[7px]',
              active === 'categories' ? 'bg-brand-pale-orange' : 'bg-cream',
              compact && 'md:rounded-none md:bg-transparent md:px-0 md:py-1 md:text-[11.5px]',
            ))}
          >
            {categoriesLabel}
            <ChevronDown size={compact ? 12 : 14} className={clsx('transition-transform duration-200', active === 'categories' && 'rotate-180')} />
            <span className={triggerUnderlineCls('categories')} />
          </button>

          {extraTriggers.length > 0 && <span className="hidden md:block w-px h-4 bg-bone shrink-0" />}

          {/* Segmented nav. Mobile: always a real chip — icon + filled
             hover/active pill, native-app tab-bar feel, regardless of
             `compact`. Desktop (`md:` up — same breakpoint as the bottom nav
             bar's own `md:hidden`) when `compact`: overridden down to plain
             small text (no icon, no pill) — a thin Alibaba-style utility
             link, matching the Verified Sellers/Track Order group on the right. */}
          {extraTriggers.map(item => (
            <button
              key={item.key}
              aria-haspopup="true"
              aria-expanded={active === item.key}
              onMouseEnter={() => openMenu(item.key)}
              onClick={() => selectMenu(item.key)}
              className={clsx(
                'group flex items-center whitespace-nowrap shrink-0 border-none cursor-pointer transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                'gap-[6px] py-[7px] px-[11px] rounded-full text-[12.5px] font-semibold',
                active === item.key ? 'text-brand-deep-orange bg-brand-pale-orange' : 'text-charcoal hover:bg-cream',
                compact && 'md:gap-1 md:py-1 md:px-0 md:rounded-none md:text-[11.5px] md:font-medium md:bg-transparent md:hover:bg-transparent',
                compact && (active === item.key ? 'md:text-brand-orange' : 'md:text-slate md:hover:text-brand-orange'),
                item.className,
              )}
            >
              <item.icon
                size={13}
                className={clsx(
                  'shrink-0 transition-colors duration-200',
                  active === item.key ? 'text-brand-orange' : 'text-slate group-hover:text-brand-orange',
                  compact && 'md:hidden',
                )}
              />
              {item.label}
              {item.chevron && <ChevronDown size={compact ? 11 : 12} className={clsx('transition-transform duration-200', active === item.key && 'rotate-180')} />}
            </button>
          ))}
          </div>

          {/* Utility links — desktop only. On mobile this row is already a
              tight, swipeable chip bar (native-app style); cramming these
              five extra links into it too was the opposite of that look.
              `ml-auto` keeps it flush right whether it stays on line 1
              (room permitting) or drops to its own line 2 below the nav
              group (outer row is `flex-wrap` — see above). */}
          <span className={clsx(
            'hidden md:flex items-center gap-x-4 gap-y-2 flex-wrap text-slate whitespace-nowrap ml-auto',
            compact ? 'text-[11.5px]' : 'text-[12.5px]',
          )}>
            <span className="flex items-center gap-1 shrink-0">
              <BadgeCheck size={compact ? 11 : 13} className="text-success" /> Verified Sellers
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <ShieldCheck size={compact ? 11 : 13} className="text-success" /> Verified Stores
            </span>
            <span className="w-px h-4 bg-bone shrink-0" />
            <button
              onClick={() => onNavigate(TokenStorage.isLoggedIn() ? '/account/orders' : '/login')}
              className="shrink-0 bg-transparent border-none cursor-pointer text-slate hover:text-brand-orange transition-colors p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              Track Order
            </button>
            <button onClick={() => onNavigate('/faq')} className="shrink-0 bg-transparent border-none cursor-pointer text-slate hover:text-brand-orange transition-colors p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
              Help Center
            </button>
            <button onClick={() => onNavigate('/contact-us')} className="shrink-0 bg-transparent border-none cursor-pointer text-slate hover:text-brand-orange transition-colors p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
              Contact
            </button>
          </span>
        </div>
      </div>

      {/* ── Shared full-width panel ── */}
      <div
        onMouseEnter={clearCloseTimer}
        className={clsx(
          'absolute left-0 right-0 top-full z-50 bg-white border-b border-bone transition-all duration-200 origin-top',
          active ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none',
        )}
      >
        <div className="px-4 sm:px-6 lg:px-10 py-6 max-h-[70vh] overflow-y-auto">
          {active === 'categories' && (
            categoriesContent ?? (
              // Fixed height (unlike the "Categories for you" modal's 520px —
              // this is a slim hover dropdown, not a full-screen modal) so
              // Categories/Subcategories each get their own internal scroll
              // once the list is long, instead of growing the whole bar
              // downward — the Alibaba mega-menu pattern.
              <CategoriesMegaContent categories={categories} onShopCategory={onShopCategory} fixedHeight={380} />
            )
          )}
          {active === 'flash-sale' && (
            <FlashSaleMegaContent flashDeals={flashDeals} countdown={countdown} onProductClick={onProductClick} />
          )}
          {active === 'top-picks' && (
            <TopPicksMegaContent topPicks={topPicks} bestRated={bestRated} onProductClick={onProductClick} />
          )}
          {active === 'featured-sellers' && (
            <FeaturedSellersMegaContent topStores={topStores} onStoreClick={onStoreClick} />
          )}
          {active === 'about' && (
            <AboutMegaContent onNavigate={onNavigate} />
          )}
        </div>
      </div>
    </div>
  );
}
