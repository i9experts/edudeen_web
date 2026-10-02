import type { ReactNode, MouseEvent } from 'react';
import { useState } from 'react';
import { clsx } from 'clsx';

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  /** Adds hover lift + border glow + a cursor-tracked radial highlight. */
  interactive?: boolean;
  tone?: 'light' | 'dark';
  onClick?: () => void;
}

// Replaces the plain `bg-white border border-bone p-X` box repeated across
// Pricing/ForSellers/Contact/Legal — one consistent card shell for the
// redesigned public pages, with a cursor-tracked radial glow on hover
// (desktop only) instead of a flat border-color swap. Not used by
// the admin/seller dashboards — those keep the existing shared `Card` component as-is.
export function PremiumCard({ children, className, interactive = true, tone = 'light', onClick }: PremiumCardProps) {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);

  function handleMove(e: MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  }

  const isDark = tone === 'dark';

  // The glow is the card's own `background-image` layer (painted above its
  // Tailwind `background-color` but below any real in-flow content, same as
  // any element's background vs. its children) — not a separate absolutely-
  // positioned overlay div. An absolute overlay would paint ON TOP of static
  // children per normal CSS stacking rules (positioned descendants always
  // paint after non-positioned ones, regardless of z-index or DOM order),
  // and wrapping the real children in their own "relative z-10" div to win
  // that fight would have broken every caller's flex/grid/padding className
  // — those classes need to land on this actual box, not a wrapper one level
  // in. Doing it as a background avoids the problem entirely.
  const sharedClassName = clsx(
    'relative rounded-2xl border transition-[transform,box-shadow,border-color] duration-300',
    isDark ? 'bg-charcoal border-white/10' : 'bg-white border-bone',
    interactive && 'hover:-translate-y-1 hover:shadow-card-hover',
    interactive && (isDark ? 'hover:border-white/20' : 'hover:border-brand-orange/30'),
    className,
  );
  const sharedStyle = interactive ? {
    backgroundImage: hovering ? `radial-gradient(220px circle at ${pos.x}% ${pos.y}%, var(--color-brand-pale-orange) 0%, transparent 70%)` : undefined,
    transition: 'background-image 300ms, transform 300ms, box-shadow 300ms, border-color 300ms',
  } : undefined;
  const sharedHandlers = {
    onMouseMove: interactive ? handleMove : undefined,
    onMouseEnter: interactive ? () => setHovering(true) : undefined,
    onMouseLeave: interactive ? () => setHovering(false) : undefined,
  };

  // Renders as a real <button> when `onClick` is given (keyboard-focusable,
  // Enter/Space activates it, no separate role/tabIndex/onKeyDown to hand-
  // roll) rather than a div with a click handler — a clickable card is
  // still a button semantically, same as `Card`'s own `onClick` path.
  if (onClick) {
    return (
      <button type="button" onClick={onClick} {...sharedHandlers} style={sharedStyle} className={clsx(sharedClassName, 'cursor-pointer text-start w-full appearance-none')}>
        {children}
      </button>
    );
  }
  return (
    <div {...sharedHandlers} style={sharedStyle} className={sharedClassName}>
      {children}
    </div>
  );
}
