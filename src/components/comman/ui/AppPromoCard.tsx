import { clsx } from 'clsx';
import { Smartphone, GraduationCap } from 'lucide-react';
import { RealAppQr, StoreBadgeChip, RatingRow, PhoneMockup, FloatingMiniCard, GOOGLE_PLAY_URL } from './AppPromoParts';

// Google Play links to the real internal-test build in every card below;
// App Store stays the decorative/non-clickable chip — no iOS build yet.
function AndroidBadgeLink({ compact }: { compact?: boolean }) {
  return (
    <a
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Get it on Google Play"
      className="rounded-[9px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
    >
      <StoreBadgeChip platform="android" compact={compact} />
    </a>
  );
}

type Tone = 'dark' | 'light';

function toneText(tone: Tone) {
  return {
    heading: tone === 'dark' ? 'text-white' : 'text-carbon',
    body:    tone === 'dark' ? 'text-white/60' : 'text-slate',
    badge:   tone === 'dark' ? 'bg-white/10 border-white/20 text-brand-orange' : 'bg-brand-pale-orange border-brand-orange/20 text-brand-deep-orange',
    divider: tone === 'dark' ? 'border-white/15' : 'border-carbon/10',
  };
}

// ── Marketplace hero corner — adapts to whichever hero background is active ──
export function MarketplaceAppPromo({ tone = 'dark', className }: { tone?: Tone; className?: string }) {
  const t = toneText(tone);
  return (
    <div className={clsx(
      'w-full max-w-[264px] rounded-2xl p-4 backdrop-blur-md',
      tone === 'dark' ? 'bg-white/[0.07] border border-white/15' : 'bg-white/40 border border-carbon/10',
      className,
    )}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={clsx('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0', t.badge)}>
          <Smartphone size={14} />
        </div>
        <div className="min-w-0">
          <p className={clsx('text-[11.5px] font-bold leading-tight', t.heading)}>Shop faster in the app</p>
          <RatingRow />
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <RealAppQr size={52} />
        <div className="flex flex-col gap-[6px] flex-1 min-w-0">
          <StoreBadgeChip platform="ios" compact />
          <AndroidBadgeLink compact />
        </div>
      </div>
    </div>
  );
}

// ── Homepage hero (right column) — slightly more spacious, always on a dark gradient ──
export function HomeAppPromo({ className }: { className?: string }) {
  return (
    <div className={clsx('w-full max-w-[280px] rounded-2xl p-4 bg-white/[0.06] backdrop-blur-md border border-white/15', className)}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
          <Smartphone size={16} className="text-brand-orange" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-white leading-tight">Get the Edudeen app</p>
          <RatingRow />
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <RealAppQr size={52} />
        <div className="flex flex-col gap-[6px] flex-1 min-w-0">
          <StoreBadgeChip platform="ios" compact />
          <AndroidBadgeLink compact />
        </div>
      </div>
    </div>
  );
}

// ── Education Marketplace hero (right column) — themed to the green hero ──
export function EducationAppPromo({ className }: { className?: string }) {
  return (
    <div className={clsx('w-full max-w-[264px] rounded-2xl p-4 bg-white/[0.08] backdrop-blur-md border border-white/20', className)}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
          <GraduationCap size={16} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-white leading-tight">Learn on the go</p>
          <RatingRow label="Android now · iOS soon" />
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <RealAppQr size={52} />
        <div className="flex flex-col gap-[6px] flex-1 min-w-0">
          <StoreBadgeChip platform="ios" compact />
          <AndroidBadgeLink compact />
        </div>
      </div>
    </div>
  );
}

// ── Auth branding panel (Login / Register) — the richest variant: a large
// phone mockup with floating context cards, ratings, and store badges. Copy
// mirrors what's already stated on the page (thousands of buyers/sellers) —
// no new numbers are invented here.
export function AuthAppPromo({ className }: { className?: string }) {
  return (
    <div className={clsx('flex flex-col items-center gap-4', className)}>
      <div className="relative flex items-center justify-center py-2 w-full">
        {/* Floating context cards */}
        <FloatingMiniCard className="left-0 top-2 hidden sm:flex">
          <span className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
          </span>
          <span className="text-[10.5px] font-medium text-white/85 whitespace-nowrap">Order confirmed</span>
        </FloatingMiniCard>

        <FloatingMiniCard className="right-0 bottom-6 hidden sm:flex">
          <RatingRow />
        </FloatingMiniCard>

        <PhoneMockup size="lg" />
      </div>

      {/* QR + store badges */}
      <div className="rounded-2xl p-3.5 bg-white/[0.06] backdrop-blur-md border border-white/15 flex items-center gap-3 w-full max-w-[240px]">
        <RealAppQr size={48} />
        <div className="flex flex-col gap-[6px] flex-1 min-w-0">
          <StoreBadgeChip platform="ios" compact />
          <AndroidBadgeLink compact />
        </div>
      </div>
    </div>
  );
}
