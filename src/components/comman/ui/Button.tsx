import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'dark'
  | 'danger';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  icon?:      ReactNode;   // left icon
  iconRight?: ReactNode;   // right icon (e.g. ChevronDown)
  fullWidth?: boolean;
  loading?:   boolean;
  pill?:      boolean;     // rounded-full shape
  children?:  ReactNode;   // optional — allows icon-only buttons
}

// ─── Style Maps ───────────────────────────────────────────────────────────────

const BASE =
  'inline-flex items-center justify-center gap-[6px] font-medium cursor-pointer ' +
  'transition-[background-color,border-color,color,opacity,box-shadow,transform] duration-[160ms] ease-out whitespace-nowrap outline-none select-none shrink-0 ' +
  'no-underline leading-[1.4] active:scale-[0.98] enabled:hover:-translate-y-px active:translate-y-0 ' +
  'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50';

const SIZES: Record<ButtonSize, string> = {
  xs: 'text-[12px] py-[5px]  px-3        rounded-md',
  sm: 'text-[12px] py-[7px]  px-[14px]   rounded-md',
  md: 'text-[13px] py-[10px] px-[18px]   rounded-lg',
  lg: 'text-[15px] py-[13px] px-6        rounded-lg',
};

const VARIANTS: Record<ButtonVariant, string> = {
  // Orange filled — primary CTA
  primary:
    'bg-brand-orange text-white border-0 hover:bg-brand-deep-orange',
  // Soft orange fill — secondary CTA on light bg
  secondary:
    'bg-brand-pale-orange text-brand-deep-orange border-0 hover:opacity-[0.88]',
  // White with border — common "ghost" action button (Export, Edit, Clear…)
  outline:
    'bg-white text-carbon border border-bone hover:bg-cream hover:border-slate/40',
  // No bg, no border — subtle inline action
  ghost:
    'bg-transparent text-slate border-0 hover:bg-cream',
  // Inline link style — no padding, orange text (Forgot password, View All…)
  link:
    'bg-transparent text-brand-orange border-0 p-0! hover:opacity-80 active:scale-100',
  // Dark fill — dark-theme CTAs
  dark:
    'bg-charcoal text-white border-0 hover:bg-carbon',
  // Soft red — destructive actions (Flag, Delete, Cancel…)
  danger:
    'bg-error-bg text-error border border-error-border hover:bg-error hover:text-white hover:border-error',
};

const ICON_SIZE: Record<ButtonSize, number> = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Button({
  variant   = 'primary',
  size      = 'md',
  icon,
  iconRight,
  fullWidth = false,
  loading   = false,
  pill      = false,
  style,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={clsx(
        BASE,
        SIZES[size],
        VARIANTS[variant],
        fullWidth  && 'w-full',
        pill       && 'rounded-full!',
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
      style={style}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <Loader2 size={ICON_SIZE[size]} className="animate-spin shrink-0" />
      ) : icon ? (
        <span className="leading-none shrink-0">{icon}</span>
      ) : null}

      {children}

      {!loading && iconRight && (
        <span className="leading-none shrink-0">{iconRight}</span>
      )}
    </button>
  );
}