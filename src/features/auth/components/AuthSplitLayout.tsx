import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { EdudeenLogo, EdudeenIcon } from '@/components/comman/ui/EdudeenLogo';
import { Reveal, RevealStagger } from '@/components/comman/motion/Reveal';
import { BrandSplash } from '@/components/comman/motion/BrandSplash';
import { motion, useReducedMotion } from 'motion/react';

interface AuthHighlight {
  Icon: LucideIcon;
  text: string;
}

interface AuthSplitLayoutProps {
  panelGradient?:  string;
  brandingHeader?: ReactNode;
  heading:         ReactNode;
  subtext:         string;
  highlights?:     AuthHighlight[];
  accentIconClass?: string;
  maxWidth?:       string;
  /** Unique per-screen branding illustration (marketplace grid, dashboard preview, security badge, etc). */
  visual?:         ReactNode;
  /** Skips the centered maxWidth/white-card wrapper — for screens (like the seller
   *  onboarding wizard) that need the full 65% panel and manage their own inner
   *  layout/scroll (e.g. a sticky sub-header above scrolling step content). */
  bare?:           boolean;
  children:        ReactNode;
}

// Shared two-pane shell for auth screens: a fixed 35% branding panel on the
// left (desktop only) and a 65% form panel on the right. The outer shell is
// locked to the viewport height (no page-level scrollbar, on any screen size);
// if a form's content is ever taller than the viewport, only the form panel
// scrolls internally — the branding panel never causes page-level scroll either.
//
// `fixed inset-0` (not `h-full`/`h-screen`/a `calc(100vh - …)` height) so this
// shell is pinned directly to the viewport, independent of any ancestor's
// computed height. A height-based
// approach (even one meant to be pixel-exact) can still drift by a pixel at some
// zoom levels or when a mobile browser's chrome shows/hides, which overflows
// RootLayout's wrapper and puts a scrollbar on the whole page; being taken out
// of flow via `fixed` makes that structurally impossible.
export function AuthSplitLayout({
  panelGradient = 'from-carbon via-[#241f1b] to-brand-deep-orange',
  brandingHeader,
  heading,
  subtext,
  highlights = [],
  accentIconClass = 'text-white',
  maxWidth = 'max-w-[420px]',
  visual,
  bare = false,
  children,
}: AuthSplitLayoutProps) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="fixed inset-0 w-full overflow-hidden bg-cream flex flex-col lg:flex-row">
      <BrandSplash />

      {/* ── Mobile branding strip (below lg only) — centered icon, headline,
         subtext, on the same gradient/dot-grid/glow language as the desktop
         panel. Sized with vh-based clamp()s (same technique as the desktop
         panel) so it shrinks on short phone screens instead of pushing the
         form into its own internal scroll — the whole point is that no
         screen, of any height, ever needs to scroll to see the form. The
         sheet below is pulled up over its bottom edge (rounded-t + negative
         margin) for the curved hero→sheet transition, not a flat seam. */}
      <div className={clsx('lg:hidden shrink-0 relative overflow-hidden bg-gradient-to-br px-5 text-center pt-[clamp(10px,2.5vh,20px)] pb-[clamp(14px,4vh,32px)]', panelGradient)}>
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }} />
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-56 h-40 rounded-full bg-brand-orange/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-[clamp(6px,1.5vh,12px)]">
            {brandingHeader ?? <EdudeenIcon size={44} />}
          </div>

          <h2 className="font-serif text-[clamp(16px,3.2vh,22px)] font-bold text-white leading-[1.2] max-w-[300px] mb-[clamp(3px,1vh,8px)]">
            {heading}
          </h2>
          <p className="text-[clamp(10px,1.8vh,12px)] text-white/70 leading-[1.4] max-w-[300px]">
            {subtext}
          </p>
        </div>
      </div>

      {/* ── Branding panel (desktop only, fixed 35%) ───────────────────────── */}
      <div className={clsx('hidden lg:flex lg:w-[35%] h-full min-w-0 relative overflow-hidden bg-gradient-to-br', panelGradient)}>
        {/* Dot-grid texture */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />
        {/* Ambient glow — subtle enterprise polish, consistent across every auth screen */}
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-brand-orange/20 blur-3xl auth-glow-pulse pointer-events-none" />
        <div className="absolute -top-20 -right-10 w-56 h-56 rounded-full bg-white/[0.06] blur-3xl pointer-events-none" />

        {/* `overflow-hidden` (not `overflow-y-auto`) + clamp()-based, viewport-height-
           relative sizing below — this content must always fit, never scroll, on any
           screen height, so every gap/font-size (and each mockup's own padding, see
           AuthMockups.tsx) shrinks together as the panel shrinks rather than
           overflowing and needing a scrollbar. */}
        <div className="relative z-10 flex flex-col justify-between h-full w-full overflow-hidden p-[clamp(16px,3vh,40px)]">
          {brandingHeader ?? <EdudeenLogo size={38} variant="light" />}

          <div className="min-h-0 overflow-hidden">
            <Reveal delay={0}>
              <h2 className="font-serif text-[clamp(20px,3vh,34px)] font-bold text-white leading-[1.15] mb-[clamp(10px,1.4vh,14px)]">
                {heading}
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="text-[clamp(11px,1.4vh,13px)] text-white/70 leading-[1.6] max-w-[360px] mb-[clamp(14px,2.2vh,24px)]">
                {subtext}
              </p>
            </Reveal>
            {highlights.length > 0 && (
              <RevealStagger className="flex flex-col gap-[clamp(8px,1.4vh,14px)] mb-2" step={0.06} y={8}>
                {highlights.map(({ Icon, text }) => (
                  <div key={text} className="group flex items-center gap-3 transition-transform duration-200 ease-out hover:translate-x-0.5">
                    <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 transition-colors duration-200 group-hover:bg-brand-orange/20">
                      <Icon size={16} className={clsx(accentIconClass, 'transition-colors duration-200 group-hover:text-brand-orange')} />
                    </div>
                    <span className="text-[12.5px] text-white/85 leading-[1.4]">{text}</span>
                  </div>
                ))}
              </RevealStagger>
            )}

            {visual && (
              <motion.div
                className="mt-[clamp(8px,2vh,24px)]"
                initial={reduceMotion ? undefined : { opacity: 0, y: 14, scale: 0.97 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                {visual}
              </motion.div>
            )}
          </div>

          <p className="text-[11px] text-white/40 shrink-0">© {new Date().getFullYear()} Edudeen. All rights reserved.</p>
        </div>
      </div>

      {/* ── Form panel (65%) — scrollbar always hidden; fluid padding keeps
         typical form content fitting without needing to scroll on short
         screens, and on the rare oversized form only the invisible-scrollbar
         internal scroll (never a visible bar, never the page) kicks in. ── */}
      {bare ? (
        <div className={clsx(
          'flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col',
          'rounded-t-[28px] -mt-6 relative z-10 bg-cream shadow-[0_-6px_20px_rgba(0,0,0,0.06)]',
          'lg:rounded-none lg:mt-0 lg:shadow-none',
        )}>
          {children}
        </div>
      ) : (
        <div className={clsx(
          'flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide flex flex-col items-center px-4 py-[clamp(12px,3vh,32px)]',
          'rounded-t-[28px] -mt-6 relative z-10 bg-cream shadow-[0_-6px_20px_rgba(0,0,0,0.06)]',
          'lg:rounded-none lg:mt-0 lg:shadow-none',
        )}>
          <motion.div
            className={clsx('w-full my-auto', maxWidth)}
            initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </div>
  );
}
