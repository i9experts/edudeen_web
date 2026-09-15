import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SolvexoLogo } from '@/components/comman/ui/SolvexoLogo';

const FLAG = 'edudeen:splash-shown';
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

// A minimal brand splash — just the Edudeen mark, once, centered. No staged
// word sequence (tried, then explicitly asked to be removed — that decision
// stands). What was upgraded instead is production quality within that
// constraint: the same living-grid/glow background language as the hero
// (so it reads as one connected brand moment, not a separate spinner), a
// larger mark, and a small accent underline draw-in — still a single beat,
// still no text. Fades/scales in, holds briefly, then exits with a smooth
// curtain slide. Mounted independently by `PublicLayout` and
// `AuthSplitLayout` (whichever the visitor lands on first) so it plays
// exactly once per tab session in production — in dev it replays on every
// refresh (import.meta.env.DEV) so it can be iterated on without clearing
// sessionStorage by hand.
const ENTER_MS = 500;
const HOLD_MS = 380;
const EXIT_MS = 550;

export function BrandSplash() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (import.meta.env.DEV) return true;
    return sessionStorage.getItem(FLAG) !== '1';
  });

  useEffect(() => {
    if (!visible) return;
    if (!import.meta.env.DEV) sessionStorage.setItem(FLAG, '1');
    const t = setTimeout(() => setVisible(false), ENTER_MS + HOLD_MS);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[999] bg-carbon flex items-center justify-center overflow-hidden"
          initial={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ duration: EXIT_MS / 1000, ease: EASE_OUT }}
        >
          <div className="hero-grid-drift absolute inset-0 pointer-events-none opacity-50" />
          <div className="hero-breath absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,var(--color-brand-orange)_0%,transparent_70%)] blur-3xl pointer-events-none" />

          <motion.div
            className="relative z-[1] flex flex-col items-center gap-4"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: ENTER_MS / 1000, ease: EASE_OUT }}
          >
            <SolvexoLogo size={52} variant="light" />
            <motion.span
              className="h-[2px] rounded-full bg-gradient-to-r from-transparent via-brand-orange to-transparent"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 64, opacity: 1 }}
              transition={{ duration: ENTER_MS / 1000, delay: 0.12, ease: EASE_OUT }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
