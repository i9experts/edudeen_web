import { useRef } from 'react';
import { m as motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';
import type { ReactNode, MouseEvent } from 'react';

// Restrained magnetic-hover wrapper for a primary CTA — the button drifts a
// few px toward the cursor while hovered, spring-settles back on leave.
// Desktop-only (checks for a fine pointer + hover support) and disabled under
// prefers-reduced-motion; on touch/mobile it's a plain inert wrapper so tap
// targets never shift under a finger.
const PULL = 0.25; // fraction of cursor offset the button actually travels — kept subtle on purpose

export function MagneticButton({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const supportsHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.4 });

  if (reduceMotion || !supportsHover) {
    return <div className={className}>{children}</div>;
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - (rect.left + rect.width / 2)) * PULL);
    y.set((e.clientY - (rect.top + rect.height / 2)) * PULL);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  );
}
