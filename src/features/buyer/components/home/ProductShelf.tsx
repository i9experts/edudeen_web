import type { ReactNode } from 'react';
import { SectionHead } from '@/components/comman/marketplace/SectionHead';
import { ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import { FlashSaleCardSkeleton } from '@/components/comman/marketplace/FlashSaleCard';
import { ScrollRow } from '@/components/comman/ui/ScrollRow';
import type { MarketplaceProduct } from '@/api/services/marketplace';

/**
 * One product rail of the home page (Bestsellers, Free resources...). Shows card skeletons while loading and
 * disappears completely when there is nothing to show (no empty box). The caller passes already de-duplicated items.
 */
export function ProductShelf<T extends MarketplaceProduct>({ id, eyebrow, title, sub, action, items, loading, renderCard, note, layout = 'grid' }: {
  /** 'scroll' = one horizontal Flash-Sale-style row; 'grid' = the default wrapping grid. */
  layout?: 'grid' | 'scroll';
  id?: string;
  eyebrow: string;
  title: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
  items: T[];
  loading: boolean;
  renderCard: (p: T, i: number) => ReactNode;
  /** Small line under a card (e.g. "120 sold", "Free sample"). Return null for none. */
  note?: (p: T) => ReactNode;
}) {
  if (!loading && items.length === 0) return null;
  return (
    <section id={id} className="mb-12 scroll-mt-[150px]">
      <SectionHead eyebrow={eyebrow} title={title} sub={sub} action={items.length > 0 ? action : undefined} />
      {layout === 'scroll' ? (
        <ScrollRow className="flex gap-3 pb-1 snap-x snap-mandatory">
          {loading && items.length === 0
            ? Array.from({ length: 7 }).map((_, i) => <div key={i} className="w-[118px] sm:w-[132px] lg:w-[144px] shrink-0"><FlashSaleCardSkeleton /></div>)
            : items.map((p, i) => {
                const extra = note?.(p);
                return (
                  <div key={p._id} className="w-[118px] sm:w-[132px] lg:w-[144px] shrink-0 snap-start">
                    {renderCard(p, i)}{extra}
                  </div>
                );
              })}
        </ScrollRow>
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-x-[8px] gap-y-[16px] md:gap-x-[10px] md:gap-y-[18px] items-start">
        {loading && items.length === 0
          ? Array.from({ length: 5 }).map((_, i) => <ResourceCardSkeleton key={i} />)
          : items.map((p, i) => {
              const extra = note?.(p);
              return extra ? <div key={p._id}>{renderCard(p, i)}{extra}</div> : renderCard(p, i);
            })}
      </div>
      )}
    </section>
  );
}
