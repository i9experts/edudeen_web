import { clsx } from 'clsx';
import { CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface RoleSegmentOption {
  value:        string;
  label:        string;
  description?: string;
  Icon?:        LucideIcon;
}

interface RoleSegmentedControlProps {
  options:    RoleSegmentOption[];
  value:      string;
  onChange:   (value: string) => void;
  label?:     string;
  className?: string;
}

// Buyer/Seller switch — one track, a sliding thumb animates between segments.
// The thumb is a flat brand-pale-orange fill — same "secondary" fill Button.tsx
// already uses (bg-brand-pale-orange/text-brand-deep-orange). This app's
// components are flat-filled; gradients only appear on large hero panels, so
// a gradient thumb here always read as off-theme no matter the color stops.
export function RoleSegmentedControl({
  options,
  value,
  onChange,
  label,
  className,
}: RoleSegmentedControlProps) {
  const activeIndex = Math.max(0, options.findIndex(o => o.value === value));
  const hasDescriptions = options.some(o => o.description);

  return (
    <div className={className}>
      {label && (
        <label className="block text-[12px] font-medium text-charcoal mb-[6px]">{label}</label>
      )}
      <div
        role="radiogroup"
        aria-label={label ?? 'Select an option'}
        className="relative flex rounded-2xl bg-cream p-1 gap-1 border border-bone"
      >
        {/* Sliding thumb */}
        <div
          aria-hidden
          className="absolute top-1 bottom-1 rounded-[14px] bg-brand-pale-orange shadow-sm transition-[transform,width] duration-[280ms] ease-out"
          style={{
            width: `calc(${100 / options.length}% - 4px)`,
            transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 4}px))`,
          }}
        />
        {options.map((opt) => {
          const active = opt.value === value;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={clsx(
                'relative z-10 flex-1 flex flex-col gap-0.5 py-[10px] px-3 rounded-[14px]',
                'border-none bg-transparent cursor-pointer select-none outline-none',
                'transition-colors duration-200 ease-out',
                hasDescriptions ? 'text-start items-start' : 'items-center',
              )}
            >
              <span className={clsx('flex items-center gap-1.5 w-full', !hasDescriptions && 'justify-center')}>
                {Icon && (
                  <Icon
                    size={14}
                    strokeWidth={2.25}
                    className={clsx('shrink-0 transition-colors duration-150', active ? 'text-brand-deep-orange' : 'text-slate')}
                  />
                )}
                <span className={clsx('text-[13px] leading-tight', active ? 'font-semibold text-carbon' : 'font-medium text-slate')}>
                  {opt.label}
                </span>
                {hasDescriptions && (
                  <CheckCircle2
                    size={15}
                    className={clsx('ms-auto shrink-0 transition-opacity duration-150', active ? 'text-brand-orange opacity-100' : 'opacity-0')}
                  />
                )}
              </span>
              {opt.description && (
                <span className={clsx('text-[12px] leading-[1.35] transition-colors duration-150', active ? 'text-slate' : 'text-slate/70')}>
                  {opt.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
