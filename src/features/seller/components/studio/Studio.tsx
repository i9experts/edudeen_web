import type { ReactNode } from 'react';
import { clsx } from 'clsx';

// ── Creator-studio building blocks shared by the seller workspace pages ─────
// (dashboard, earnings, add product). Mirrors the reference studio design:
// bordered white panels with serif headings, royal-blue eyebrows, and bold
// underlined text-link actions.

/** Bordered white card (radius 12px, ~27px padding) with an optional serif h2 + right-side action. */
export function StudioPanel({
  title, eyebrow, sub, action, children, className, bodyClassName, id,
}: {
  title?: string;
  eyebrow?: string;
  sub?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={clsx('bg-white border border-bone rounded-xl px-5 py-5 sm:px-[27px] sm:py-[26px]', className)}
    >
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 mb-[18px] flex-wrap">
          <div className="min-w-0">
            {eyebrow && <StudioEyebrow className="mb-2">{eyebrow}</StudioEyebrow>}
            {title && (
              <h2 id={headingId} className="font-serif font-normal text-[21px] sm:text-[25px] text-carbon leading-[1.2] tracking-[-0.3px]">
                {title}
              </h2>
            )}
            {sub && <p className="text-[13px] text-slate mt-1 leading-relaxed">{sub}</p>}
          </div>
          {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Small uppercase letter-spaced royal-blue label. */
export function StudioEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx('text-[12px] sm:text-[12px] font-bold text-brand-royal uppercase tracking-[0.15em]', className)}>
      {children}
    </p>
  );
}

/** Bold navy text link with an underline — the studio table/panel action style. */
export function StudioTextLink({
  children, onClick, href, external, className, ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const cls = clsx(
    'inline-flex items-center gap-1 bg-transparent border-0 border-b-2 border-current px-0 pb-[2px] text-[13.5px] font-bold text-brand-orange cursor-pointer no-underline hover:text-brand-royal transition-colors whitespace-nowrap',
    className,
  );
  if (href) {
    return (
      <a href={href} aria-label={ariaLabel} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  }
  return <button type="button" onClick={onClick} aria-label={ariaLabel} className={cls}>{children}</button>;
}

/** "01 · LEARNING" style 3-column steps. */
export interface WorkflowStep { tag: string; title: string; body: string }

export function StudioWorkflow({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 list-none p-0 m-0">
      {steps.map((s, i) => (
        <li key={s.title}>
          <StudioEyebrow className="mb-3">{String(i + 1).padStart(2, '0')} · {s.tag}</StudioEyebrow>
          <p className="text-[15.5px] font-bold text-carbon mb-2">{s.title}</p>
          <p className="text-[13.5px] text-slate leading-[1.6]">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

/** Soft status pill in the studio palette. */
export function StudioPill({ tone = 'gray', children }: { tone?: 'green' | 'amber' | 'gray' | 'blue' | 'red'; children: ReactNode }) {
  const tones: Record<string, string> = {
    green: 'bg-[#eaf3e3] text-[#3b6720]',
    amber: 'bg-[#faf0d4] text-[#755600]',
    gray:  'bg-mist text-slate',
    blue:  'bg-info-bg text-info',
    red:   'bg-error-bg text-error',
  };
  return (
    <span className={clsx('inline-flex items-center rounded-full px-[10px] py-[4px] text-[12px] font-medium whitespace-nowrap', tones[tone])}>
      {children}
    </span>
  );
}

/** Studio table shell: pale header row, 12px muted uppercase headers, bottom-bordered rows. */
export function StudioTable({ head, children, caption }: { head: { label: string; align?: 'left' | 'right'; className?: string }[]; children: ReactNode; caption?: string }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full border-collapse text-[13.5px] min-w-[520px]">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-cream">
            {head.map(h => (
              <th
                key={h.label}
                scope="col"
                className={clsx(
                  'px-3 py-[13px] text-[12px] font-medium uppercase tracking-[0.04em] text-slate whitespace-nowrap',
                  h.align === 'right' ? 'text-right' : 'text-left',
                  h.className,
                )}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-bone [&>tr>td]:px-3 [&>tr>td]:py-[15px] [&>tr>td]:text-carbon">
          {children}
        </tbody>
      </table>
    </div>
  );
}
