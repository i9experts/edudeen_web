import { clsx } from 'clsx';
import type { CategoryNode } from '@/api/services/categories';

interface CategoryTabsProps {
  categories: CategoryNode[];
  /** `null` = the "All resources" tab. */
  activeId:   string | null;
  onSelect:   (category: CategoryNode | null) => void;
  allLabel?:  string;
  className?: string;
}

/** The flat category tab row under the header — underline marks the active one. */
export function CategoryTabs({ categories, activeId, onSelect, allLabel = 'All resources', className }: CategoryTabsProps) {
  const tabs: { id: string | null; label: string; node: CategoryNode | null }[] = [
    { id: null, label: allLabel, node: null },
    ...categories.map(c => ({ id: c._id, label: c.name, node: c })),
  ];

  return (
    <nav
      aria-label="Resource categories"
      className={clsx(
        'flex gap-[22px] md:gap-[30px] px-[5%] md:px-[4%] border-b border-bone overflow-x-auto scrollbar-hide bg-white',
        className,
      )}
    >
      {tabs.map(t => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id ?? 'all'}
            onClick={() => onSelect(t.node)}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'shrink-0 whitespace-nowrap bg-transparent border-0 border-b-[3px] py-[14px] px-0 text-[14px] text-carbon cursor-pointer transition-colors',
              active ? 'border-brand-green font-bold' : 'border-transparent hover:border-bone',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
