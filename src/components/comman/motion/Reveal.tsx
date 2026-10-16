import { m as motion, useReducedMotion, type Variants } from 'motion/react';
import { Children, type ReactNode } from 'react';

// Shared scroll-reveal primitive for the public marketing/auth pages only —
// mirrors the fade+lift LegalPageLayout's own `useRevealOnScroll` hook already
// does by hand, just reusable and with proper reduced-motion handling via
// `motion`'s `useReducedMotion` (index.css's global CSS `prefers-reduced-motion`
// rule already neutralizes plain CSS transitions, but `motion`-driven transform
// animations run outside that CSS and need this explicit opt-out).
type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger helper — delay in seconds before this element's animation starts. */
  delay?: number;
  /** Distance (px) the element lifts from as it reveals. */
  y?: number;
  /** Fires once per mount the first time it scrolls into view (default) or every time. */
  once?: boolean;
  as?: 'div' | 'span';
};

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function Reveal({ children, className, delay = 0, y = 18, once = true, as = 'div' }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const Tag = motion[as];

  if (reduceMotion) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const variants: Variants = {
    hidden: { opacity: 0, y },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay, ease: EASE_OUT } },
  };

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-80px' }}
      variants={variants}
    >
      {children}
    </Tag>
  );
}

// Applies an incrementing delay to each direct child via `Reveal`, for a
// staggered group entrance (icon grids, card rows) without hand-writing a
// `delay={i * 0.1}` on every item.
export function RevealStagger({
  children,
  className,
  step = 0.08,
  y = 18,
}: {
  // Accepts anything JSX can pass as children — a single conditional branch
  // (e.g. an empty-state message) is just as valid as a mapped array of
  // cards; `Children.toArray` normalizes either shape into a real array with
  // stable keys before staggering.
  children: ReactNode;
  className?: string;
  step?: number;
  y?: number;
}) {
  return (
    <div className={className}>
      {Children.toArray(children).map((child, i) => (
        <Reveal key={i} delay={i * step} y={y}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
