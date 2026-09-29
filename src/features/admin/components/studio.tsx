import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { PageHeader } from '@/components/comman/ui/PageHeader';

// ── Admin "team workspace" primitives ──────────────────────────────────────────
// Thin admin-only wrappers around the shared studio components, so every admin
// page shares one page gutter, one intro and one panel style (white bordered
// panel, 12px radius, serif h2) without each page re-deriving the classes.

/** Horizontal page gutter shared by the intro and page content. */
export const ADMIN_GUTTER = 'px-4 sm:px-7';

/** Underlined bold text-link action ("Review submission") — for table actions. */
export const textLinkClass =
  'inline-flex items-center gap-1 bg-transparent border-0 border-b border-current px-0 pb-[2px] ' +
  'text-[13px] font-bold text-brand-orange cursor-pointer hover:text-brand-deep-orange whitespace-nowrap ' +
  'outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 focus-visible:ring-offset-2 rounded-[1px]';

interface AdminStudioHeaderProps {
  title: string;
  /** Muted sub-line under the serif title. */
  subtitle?: string;
  /** Royal-blue uppercase eyebrow — defaults to the workspace name. */
  eyebrow?: string;
  actions?: ReactNode;
  /** Accepted for call-site compatibility with the old `AdminPageHeader`; the studio intro is icon-free. */
  icon?: ReactNode;
  className?: string;
  /** Rendered inside a page container that already applies the gutter + top padding. */
  inset?: boolean;
}

/** Studio page intro for admin pages: eyebrow, serif title, muted sub-line, actions right. */
export function AdminStudioHeader({ title, subtitle, eyebrow = 'Edudeen team workspace', actions, className, inset = false }: AdminStudioHeaderProps) {
  return (
    <div className={clsx(inset ? 'pt-1 sm:pt-4 pb-1' : [ADMIN_GUTTER, 'pt-7 sm:pt-10 pb-1'], className)}>
      <PageHeader eyebrow={eyebrow} title={title} description={subtitle} actions={actions} />
    </div>
  );
}

interface StudioPanelProps {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** `flush` lets a table run edge to edge under the heading. */
  bodyClassName?: string;
  as?: 'section' | 'div';
  id?: string;
}

/** Bordered white panel with a serif heading — the studio `.panel`. */
export function StudioPanel({ title, description, actions, children, className, bodyClassName, as = 'section', id }: StudioPanelProps) {
  const Tag = as;
  const headingId = id ? `${id}-title` : undefined;
  return (
    <Tag
      id={id}
      aria-labelledby={title && headingId ? headingId : undefined}
      className={clsx('bg-white border border-bone rounded-xl p-5 sm:p-[27px] min-w-0', className)}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4 sm:mb-5">
          <div className="min-w-0">
            {title && (
              <h2 id={headingId} className="font-serif font-normal text-[21px] sm:text-[25px] text-carbon leading-[1.2] tracking-[-0.3px]">
                {title}
              </h2>
            )}
            {description && <p className="text-[13px] sm:text-[14px] text-slate mt-2 leading-relaxed max-w-[680px]">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}

/** Three-up "what this should establish" explainer — plain heading + muted copy per column. */
export function StudioInfoGrid({ items, className }: { items: { title: string; body: ReactNode }[]; className?: string }) {
  return (
    <div className={clsx('grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-7', className)}>
      {items.map(item => (
        <div key={item.title} className="min-w-0">
          <h3 className="text-[15px] sm:text-[16px] font-bold text-carbon mb-2">{item.title}</h3>
          <p className="text-[13px] sm:text-[14px] text-slate leading-relaxed">{item.body}</p>
        </div>
      ))}
    </div>
  );
}
