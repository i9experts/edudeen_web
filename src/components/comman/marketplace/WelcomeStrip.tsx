import { useState } from 'react';
import { clsx } from 'clsx';
import { ShieldCheck, Store, GraduationCap, Tag } from 'lucide-react';
import { Modal, DealsBanner } from '@/components/comman/ui';
import { CategoriesMegaContent } from './MegaMenuBar';
import { BannerCarousel, type BannerCarouselItem } from './BannerCarousel';
import type { CategoryNode } from '@/api/services/categories';

// ── "Welcome to Edudeen" discovery strip — Categories for you, the real
// marketplace Hero Banner, and the real DealsBanner side by side in one row,
// in the spirit of Alibaba's homepage welcome section. Clicking a category
// opens the same categories/subcategories/popular-products mega-panel the
// navbar's own "All Categories" dropdown already uses (`CategoriesMegaContent`,
// reused as-is, not reimplemented) inside a big modal — the Alibaba pattern:
// a left category list, its subcategory icon grid, and popular products,
// switching live as you click a different category on the left. ──
export function WelcomeStrip({
  categories, banners, onShopCategory, onNavigate,
}: {
  categories: CategoryNode[];
  /** Real marketplace/category hero banners — same data Marketplace's hero
   *  section used before this moved here. Omitted entirely (no empty
   *  placeholder box) when there's no banner configured for this placement. */
  banners: BannerCarouselItem[];
  onShopCategory: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  const hasCategories = categories.length > 0;
  const hasHero = banners.length > 0;

  const [modalCategoryId, setModalCategoryId] = useState<string | null>(null);

  if (!hasCategories && !hasHero) return null;

  return (
    <div>
      {/* Welcome bar — pulled out above the card (its own row, not sharing
         the card's border/rounded corners), with breathing room below it.
         Real quick links to distinct destinations, not a restated copy of
         the utility row already above the hero. Sized up as a real section
         header (bigger heading, chip-style icon links) rather than a thin
         utility line, with a border to give it visual weight. */}
      <div className="flex items-center justify-between gap-4 px-1 pb-4 mb-1 border-b border-bone">
        <p className="text-[19px] sm:text-[22px] font-bold text-carbon tracking-[-0.01em]">Welcome to Edudeen</p>
        <div className="hidden sm:flex items-center gap-[6px] text-[13.5px] font-semibold text-charcoal">
          <button onClick={() => onNavigate('/faq')} className="flex items-center gap-[9px] rounded-full pl-[5px] pr-[14px] py-[5px] bg-cream border border-transparent cursor-pointer transition-all duration-150 hover:bg-brand-pale-orange/70 hover:border-brand-orange/15 hover:text-brand-deep-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
            <span className="flex size-8 items-center justify-center rounded-full bg-white shrink-0 shadow-card"><ShieldCheck size={16} className="text-brand-orange" /></span>
            Buyer Protection
          </button>
          <button onClick={() => onNavigate('/sellers')} className="flex items-center gap-[9px] rounded-full pl-[5px] pr-[14px] py-[5px] bg-cream border border-transparent cursor-pointer transition-all duration-150 hover:bg-brand-pale-orange/70 hover:border-brand-orange/15 hover:text-brand-deep-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
            <span className="flex size-8 items-center justify-center rounded-full bg-white shrink-0 shadow-card"><Store size={16} className="text-brand-orange" /></span>
            Sell on Edudeen
          </button>
          <button onClick={() => onNavigate('/education')} className="flex items-center gap-[9px] rounded-full pl-[5px] pr-[14px] py-[5px] bg-cream border border-transparent cursor-pointer transition-all duration-150 hover:bg-brand-pale-orange/70 hover:border-brand-orange/15 hover:text-brand-deep-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
            <span className="flex size-8 items-center justify-center rounded-full bg-white shrink-0 shadow-card"><GraduationCap size={16} className="text-brand-orange" /></span>
            Education Marketplace
          </button>
        </div>
      </div>

      {/* One row: Categories for you, the real Hero Banner (when a caller
         actually has one to show — e.g. Marketplace now runs its own
         full-width hero carousel above instead and passes none here), and
         the real DealsBanner — side by side, not stacked. Column template
         collapses to 2 columns instead of leaving the hero's column empty
         when there's no hero to fill it. */}
      <div className={clsx(
        'grid grid-cols-1 lg:grid-rows-[220px] gap-4',
        hasHero ? 'lg:grid-cols-[0.8fr_1.4fr_1fr]' : 'lg:grid-cols-[0.8fr_1fr]',
      )}>
        {/* Categories for you — click opens the full categories/subcategories/
           popular-products mega-panel as a big modal. */}
        {hasCategories && (
          <div className="bg-cream rounded-[14px] p-3 flex flex-col lg:h-full">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <p className="text-[11.5px] font-bold text-carbon">Categories for you</p>
              <button
                onClick={() => setModalCategoryId(categories[0]?._id ?? null)}
                className="text-[10px] font-semibold text-brand-orange bg-transparent border-none cursor-pointer p-0 hover:text-brand-deep-orange transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              >
                See all
              </button>
            </div>
            <div className="grid grid-cols-3 gap-[7px] lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-0.5 content-start">
              {categories.slice(0, 6).map(cat => (
                <button
                  key={cat._id}
                  onClick={() => setModalCategoryId(cat._id)}
                  className="group flex flex-col items-center justify-center gap-[6px] rounded-xl bg-white border border-transparent px-1.5 py-[10px] text-center cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:border-brand-orange/25 hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                >
                  <span className="relative flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-pale-orange to-[#fdf6f0] ring-1 ring-black/[0.03] overflow-hidden shrink-0 transition-transform duration-200 group-hover:scale-110">
                    {cat.image
                      ? <img loading="lazy" decoding="async" src={cat.image} alt="" className="w-full h-full object-cover" />
                      : <Tag size={15} className="text-brand-orange" />}
                  </span>
                  <span className="w-full text-[10.5px] font-semibold text-charcoal leading-tight line-clamp-1 group-hover:text-brand-orange transition-colors">
                    {cat.name}
                  </span>
                  {typeof cat.productCount === 'number' && cat.productCount > 0 && (
                    <span className="text-[9px] text-slate leading-none">{cat.productCount} items</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hero Banner — real marketplace/category banners, filling the same
           fixed-size card as DealsBanner beside it (default `fit="cover"`) —
           one consistent size every banner image fills completely, premium/
           production look, instead of letterboxing around whatever aspect
           ratio each upload happens to be. */}
        {hasHero && (
          <div className="relative min-h-[200px] lg:h-full rounded-[14px] overflow-hidden">
            <BannerCarousel entityType="banner" banners={banners} />
          </div>
        )}

        {/* DealsBanner — the real campaign banner, right beside the hero, not
           stacked below it. Just the campaign image (compact mode), filling
           the card the same way. */}
        <DealsBanner compact className="min-h-[200px] lg:h-full" />
      </div>

      {/* Categories mega-modal — the exact same panel the navbar's "All
         Categories" dropdown shows (categories list / subcategory icon grid
         / popular products), just as a big modal here instead of a hover
         panel, opened already focused on whichever category was clicked. */}
      {modalCategoryId && (
        <Modal title="Categories for you" onClose={() => setModalCategoryId(null)} width={900}>
          <CategoriesMegaContent
            categories={categories}
            initialActiveId={modalCategoryId}
            fixedHeight={520}
            onShopCategory={id => { onShopCategory(id); setModalCategoryId(null); }}
          />
        </Modal>
      )}
    </div>
  );
}
