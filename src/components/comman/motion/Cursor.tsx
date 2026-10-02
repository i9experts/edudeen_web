import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

// Desktop-only custom cursor with contextual states driven by a
// `data-cursor="label"` attribute on any element (label omitted or
// `"hover"` just enlarges the dot; a real string shows as text inside it,
// e.g. `data-cursor="View"`). Disabled entirely on touch/coarse pointers
// and under prefers-reduced-motion — never blocks clicks since it's
// `pointer-events-none` and purely decorative chrome layered on public
// marketing pages only (mounted by `PublicLayout`, not globally).
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 700, damping: 45, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 700, damping: 45, mass: 0.4 });

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduceMotion) return;
    setEnabled(true);

    function handleMove(e: PointerEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor]');
      if (target) {
        const value = target.dataset.cursor ?? 'hover';
        setHovering(true);
        setLabel(value === 'hover' ? null : value);
      } else {
        setHovering(false);
        setLabel(null);
      }
    }

    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => window.removeEventListener('pointermove', handleMove);
  }, [x, y]);

  if (!enabled) return null;

  const size = label ? 76 : hovering ? 44 : 8;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 start-0 z-[90] hidden md:block"
      style={{ x: springX, y: springY }}
    >
      <motion.div
        className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold tracking-[0.15em] text-white uppercase"
        animate={{ width: size, height: size, opacity: hovering || label ? 1 : 0.85 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      >
        {label}
      </motion.div>
    </motion.div>
  );
}
