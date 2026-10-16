import { m as motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

// A left-to-right clip-path text reveal — each line/word masks in rather
// than just fading, for headline moments that need more presence than the
// generic fade+lift `Reveal` gives every other section. Kept to a single
// mask sweep (no per-character stagger) so it reads as premium, not busy.
export function ClipReveal({ children, delay = 0, className, as = 'span' }: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'span' | 'div';
}) {
  const reduceMotion = useReducedMotion();
  const Tag = motion[as];

  if (reduceMotion) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      className={className}
      style={{ display: 'inline-block' }}
      initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0.4 }}
      animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
    >
      {children}
    </Tag>
  );
}
