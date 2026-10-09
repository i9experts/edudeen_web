import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface PaginationProps {
  page:     number;
  total:    number;
  perPage?: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, total, perPage = 10, onChange, className }: PaginationProps) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3)               pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2)  pages.push('...');
    pages.push(totalPages);
  }

  const btnBase = 'flex items-center justify-center w-8 h-8 rounded-md border text-[13px] font-medium cursor-pointer transition-colors';

  return (
    <div className={clsx('flex items-center gap-1', className)}>
      <button aria-label="Previous"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className={clsx(btnBase, 'bg-white border-bone text-slate hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed')}
      >
        <ChevronLeft size={14} />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`el-${i}`} className="w-8 text-center text-[13px] text-slate select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={clsx(
              btnBase,
              p === page
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-white text-carbon border-bone hover:bg-cream',
            )}
          >
            {p}
          </button>
        ),
      )}

      <button aria-label="Next"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className={clsx(btnBase, 'bg-white border-bone text-slate hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed')}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
