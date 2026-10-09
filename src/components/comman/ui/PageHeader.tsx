import { useT } from '@/contexts/languageCtx';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /** Shows a "back" link above the title. */
  backTo?: string;
  backLabel?: string;
  /** Tabs (e.g. <TabBar/>) rendered BELOW the title block. */
  tabs?: ReactNode;
  /** Smaller title/spacing for dense admin screens. */
  compact?: boolean;
}

/** Studio-style page intro: blue eyebrow (seller pages: the store name), serif title, muted sub-line, actions on the right, tabs below. */
export function PageHeader({ eyebrow, title, description, actions, className, backTo, backLabel = 'Back', tabs, compact }: PageHeaderProps) {
  const t = useT();
  return (
    <div className={className}>
      {backTo && (
        <Link to={backTo} className="inline-flex items-center gap-1 text-[13px] text-slate hover:text-carbon mb-2 min-h-[32px]">
          <ArrowLeft size={14} className="rtl:rotate-180" aria-hidden="true" />{t(backLabel)}
        </Link>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[12px] font-bold text-brand-royal uppercase tracking-[0.15em] mb-2 sm:mb-[10px] truncate" title={eyebrow}>{t(eyebrow)}</p>
          )}
          <h1 className={clsx('font-serif font-normal text-carbon leading-[1.15] tracking-[-0.5px]', compact ? 'text-[22px] sm:text-[26px]' : 'text-[26px] sm:text-[34px]')}>{t(title)}</h1>
          {description && (
            <p className="text-[13px] sm:text-[15px] text-slate mt-1.5 max-w-[620px] leading-relaxed">{t(description)}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {tabs && <div className="mt-4">{tabs}</div>}
    </div>
  );
}