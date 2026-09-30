import { clsx } from 'clsx';

export interface CategoryTab {
  id:    string;
  label: string;
}

interface CategoryTabsProps {
  tabs:       CategoryTab[];
  /** `null` = the "All resources" tab. */
  activeId:   string | null;
  onSelect:   (id: string | null) => void;
  allLabel?:  string;
  className?: string;
}

/** The flat category tab row under the header — underline marks the active one. */
export function CategoryTabs({ tabs, activeId, onSelect, allLabel = 'All resources', className }: CategoryTabsProps) {
  const all: { id: string | null; label: string }[] = [{ id: null, label: allLabel }, ...tabs];

  return (
    <nav
      aria-label="Resource categories"
      className={clsx(
        'flex gap-[22px] md:gap-[30px] px-[5%] md:px-[4%] border-b border-bone overflow-x-auto scrollbar-hide bg-white',
        className,
      )}
    >
      {all.map(t => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id ?? 'all'}
            onClick={() => onSelect(t.id)}
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
