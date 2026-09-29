import type { ReactNode } from 'react';
import { clsx } from 'clsx';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/** Studio-style page intro: blue eyebrow, serif title, muted sub-line, actions on the right. */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={clsx('flex items-center justify-between gap-4 flex-wrap', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] sm:text-[12px] font-bold text-brand-royal uppercase tracking-[0.15em] mb-2 sm:mb-[10px]">{eyebrow}</p>
        )}
        <h1 className="font-serif font-normal text-[26px] sm:text-[34px] text-carbon leading-[1.15] tracking-[-0.5px]">{title}</h1>
        {description && (
          <p className="text-[13px] sm:text-[15px] text-slate mt-1.5 max-w-[620px] leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
