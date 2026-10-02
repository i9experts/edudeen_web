import { useT } from '@/contexts/languageCtx';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

export interface BreadcrumbItem {
  label: string;
  path?: string; // omit for the current page (not a link)
}

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  const navigate = useNavigate();
  const t = useT();

  return (
    <nav
      aria-label="Breadcrumb"
      className={clsx(
        'flex items-center h-10 min-h-10 gap-1 overflow-x-auto whitespace-nowrap',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1 shrink-0">
            {i > 0 && <ChevronRight size={12} className="text-bone shrink-0" />}
            {item.path && !isLast ? (
              <button
                onClick={() => navigate(item.path!)}
                className="text-[12px] text-slate hover:text-brand-orange bg-transparent border-none cursor-pointer p-0 font-medium transition-colors rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/30"
              >
                {t(item.label)}
              </button>
            ) : (
              <span
                className={clsx(
                  'text-[12px] truncate max-w-[160px] sm:max-w-[280px]',
                  isLast ? 'text-charcoal font-semibold' : 'text-slate font-medium',
                )}
              >
                {t(item.label)}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
