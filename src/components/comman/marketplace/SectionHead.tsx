import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type LinkAction = { label: string; onClick: () => void };

function isLinkAction(a: unknown): a is LinkAction {
  return !!a && typeof a === 'object' && 'label' in a && 'onClick' in a;
}

export const sectionLinkClass =
  'shrink-0 bg-transparent border-0 border-b border-current text-brand-orange pb-[3px] px-0 text-[14px] font-bold cursor-pointer hover:text-brand-deep-orange';

/** Eyebrow + serif title + optional sub-line and right-aligned link — the one
 *  heading style every storefront section uses. `as="h1"` for a page title. */
export function SectionHead({ eyebrow, title, sub, action, icon, as = 'h2', className }: {
  eyebrow?: string;
  title: string;
  sub?: string;
  icon?: ReactNode;
  action?: LinkAction | ReactNode;
  as?: 'h1' | 'h2';
  className?: string;
}) {
  const Heading = as;
  return (
    <div className={clsx('flex justify-between gap-5 items-end mb-[22px]', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-[12px] font-bold tracking-[0.15em] uppercase text-brand-royal mb-[13px]">{eyebrow}</p>}
        <Heading
          className={clsx(
            'flex items-center gap-2 font-serif font-normal text-carbon mb-[6px]',
            as === 'h1'
              ? 'text-[30px] md:text-[40px] leading-[1.12] tracking-[-1px]'
              : 'text-[25px] md:text-[30px] leading-[1.2] tracking-[-0.5px]',
          )}
        >
          {icon}{title}
        </Heading>
        {sub && <p className="text-[14px] text-carbon m-0">{sub}</p>}
      </div>
      {isLinkAction(action)
        ? <button onClick={action.onClick} className={sectionLinkClass}>{action.label}</button>
        : action}
    </div>
  );
}
