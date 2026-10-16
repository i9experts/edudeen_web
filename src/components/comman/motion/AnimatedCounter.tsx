import { useEffect, useRef, useState } from 'react';
import { useInView, animate, useReducedMotion } from 'motion/react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

// Counts up from 0 to `value` once the element scrolls into view — used for
// real platform stats (seller count, GMV, ratings) so the number itself
// still comes straight from the live API response, only its reveal is
// animated. Never fabricates a value; `value` is always real data.
export function AnimatedCounter({ value, duration = 1.4, format = (n) => Math.round(n).toString(), className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (!isInView || reduceMotion) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [isInView, value, duration, reduceMotion]);

  // A whole-number stat stays a whole number at every frame of the count-up (no "5.8+" while counting to 6).
  const shown = Number.isInteger(value) ? Math.round(display) : display;
  return <span ref={ref} className={className}>{format(shown)}</span>;
}
