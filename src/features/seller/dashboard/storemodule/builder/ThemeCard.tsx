import { clsx } from 'clsx';
import { Check, Eye } from 'lucide-react';
import { ThemeStorefrontPreview } from './ThemeStorefrontPreview';
import type { ThemeDefinition } from './themes';

const BADGE_LABEL: Record<string, string> = { new: 'NEW', popular: 'POPULAR', trending: 'TRENDING' };
const BADGE_COLOR: Record<string, string> = {
  new: 'bg-accent-violet-bg text-accent-violet',
  popular: 'bg-brand-pale-orange text-brand-deep-orange',
  trending: 'bg-success-bg text-success',
};

/** One Theme Gallery card — a large, real, scaled-down storefront preview
 *  dominates the card (see `ThemeStorefrontPreview`), with the theme's name/
 *  description and two distinct actions below it: clicking the preview
 *  itself (or "Use Theme") applies it; "Preview" opens the complete real
 *  storefront in a brand-new browser tab (`onPreview`, resolved purely from
 *  this theme's own id — see `ThemeTab.tsx`'s `openPreview`) without
 *  applying anything. */
export function ThemeCard({ theme, active, onApply, onPreview, size = 'default' }: {
  theme: ThemeDefinition;
  active: boolean;
  onApply: () => void;
  onPreview: () => void;
  /** `compact` is used by the Recommended strip — same card, smaller type. */
  size?: 'default' | 'compact';
}) {
  return (
    <div
      className={clsx(
        'group relative flex flex-col rounded-2xl border bg-white overflow-hidden transition-all duration-200',
        active ? 'border-brand-orange shadow-[0_2px_14px_rgba(23,71,113,0.18)]' : 'border-bone hover:border-slate/30 hover:shadow-[0_2px_14px_rgba(0,0,0,0.06)]',
      )}
    >
      <button
        type="button"
        onClick={onApply}
        aria-label={`Use ${theme.name} theme`}
        className="relative block w-full border-none bg-transparent p-0 cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50 rounded-t-2xl overflow-hidden"
      >
        <ThemeStorefrontPreview theme={theme} className="transition-transform duration-300 group-hover:scale-[1.015]" />

        {theme.badge && (
          <span className={clsx('absolute top-2.5 left-2.5 px-2 py-[3px] rounded-full text-[10px] font-bold tracking-wide', BADGE_COLOR[theme.badge])}>
            {BADGE_LABEL[theme.badge]}
          </span>
        )}
        {active && (
          <span className="absolute top-2.5 right-2.5 flex items-center gap-1 pl-1.5 pr-2 py-[3px] rounded-full bg-brand-orange text-white text-[10px] font-bold">
            <Check size={11} /> Active
          </span>
        )}
      </button>

      <div className={clsx('flex flex-col gap-2', size === 'compact' ? 'p-3' : 'p-4')}>
        <div>
          <p className={clsx('font-bold text-charcoal', size === 'compact' ? 'text-[13px]' : 'text-[14.5px]')}>{theme.name}</p>
          {size !== 'compact' && <p className="text-[12px] text-slate leading-snug mt-0.5">{theme.description}</p>}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={onPreview}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-[8px] rounded-lg text-[12px] font-semibold border border-bone bg-white text-charcoal hover:bg-cream cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50"
          >
            <Eye size={13} /> Preview
          </button>
          <button
            type="button"
            onClick={onApply}
            className={clsx(
              'flex-1 px-3 py-[8px] rounded-lg text-[12px] font-bold cursor-pointer transition-colors border-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50',
              active ? 'bg-brand-pale-orange text-brand-deep-orange' : 'bg-brand-orange text-white hover:bg-brand-deep-orange',
            )}
          >
            {active ? 'Active' : 'Use Theme'}
          </button>
        </div>
      </div>
    </div>
  );
}
