import type { ReactNode } from 'react';
import { SectionHead } from '@/components/comman/marketplace/SectionHead';
import { ResourceCardSkeleton } from '@/components/comman/marketplace/ResourceCard';
import type { MarketplaceProduct } from '@/api/services/marketplace';

/**
 * One product rail of the home page (Bestsellers, Free resources...). Shows card skeletons while loading and
 * disappears completely when there is nothing to show (no empty box). The caller passes already de-duplicated items.
 */
export function ProductShelf<T extends MarketplaceProduct>({ id, eyebrow, title, sub, action, items, loading, renderCard, note }: {
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-[14px] gap-y-[25px] md:gap-x-[22px] md:gap-y-[28px]">
        {loading && items.length === 0
          ? Array.from({ length: 5 }).map((_, i) => <ResourceCardSkeleton key={i} />)
          : items.map((p, i) => {
              const extra = note?.(p);
              return extra ? <div key={p._id}>{renderCard(p, i)}{extra}</div> : renderCard(p, i);
            })}
      </div>
    </section>
  );
}
