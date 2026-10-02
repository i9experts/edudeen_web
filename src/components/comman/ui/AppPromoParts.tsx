import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import QRCode from 'qrcode';

// Real Android build — internal testing track. No iOS build published yet,
// so every App Store badge across the app stays the decorative/non-clickable
// chip while every Google Play badge/QR links here for real.
export const GOOGLE_PLAY_URL = 'https://play.google.com/apps/internaltest/4699462862361720775';

export function useAppQrDataUrl(value: string) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 1, width: 240, color: { dark: '#141413', light: '#ffffff' } })
      .then(url => { if (!cancelled) setDataUrl(url); })
      .catch(() => { /* non-critical — falls back to a blank white card */ });
    return () => { cancelled = true; };
  }, [value]);
  return dataUrl;
}

// Real, scannable QR linking to the Google Play internal-test build — same
// footprint (a `size`×`size` white rounded card) as the old decorative
// QrGlyph it replaces everywhere, so it drops in without touching callers'
// surrounding layout.
export function RealAppQr({ size = 74, className }: { size?: number; className?: string }) {
  const dataUrl = useAppQrDataUrl(GOOGLE_PLAY_URL);
  const inner = size - 18;
  return (
    <a
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Scan or click to download the Edudeen Android app"
      className={clsx('block bg-white rounded-[14px] p-[9px] shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {dataUrl
        ? <img src={dataUrl} alt="" width={inner} height={inner} className="block" />
        : <div style={{ width: inner, height: inner }} />}
    </a>
  );
}

// Real brand glyphs (not the generic lucide Apple/Play icons) so every badge
// across the app reads as the actual App Store / Google Play mark rather
// than a generic "download" icon. Apple logo path from simple-icons (MIT);
// the Google Play triangle keeps its real 4-color split (blue/green/yellow/
// red sub-paths), matching the official mark — a monochrome recolor would
// look off since Google's own badge guidelines never render it single-color.
export function AppleGlyph({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={clsx('text-white shrink-0', className)}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}
export function GooglePlayGlyph({ size = 15, className }: { size?: number; className?: string }) {
  const h = size * (129.2 / 120.9);
  return (
    <svg width={size} height={h} viewBox="30 336.7 120.9 129.2" className={clsx('shrink-0', className)}>
      <path fill="#FFD400" d="M119.2,421.2c15.3-8.4,27-14.8,28-15.3c3.2-1.7,6.5-6.2,0-9.7c-2.1-1.1-13.4-7.3-28-15.3l-20.1,20.2L119.2,421.2z" />
      <path fill="#FF3333" d="M99.1,401.1l-64.2,64.7c1.5,0.2,3.2-0.2,5.2-1.3c4.2-2.3,48.8-26.7,79.1-43.3L99.1,401.1L99.1,401.1z" />
      <path fill="#48FF48" d="M99.1,401.1l20.1-20.2c0,0-74.6-40.7-79.1-43.1c-1.7-1-3.6-1.3-5.3-1L99.1,401.1z" />
      <path fill="#3BCCFF" d="M99.1,401.1l-64.3-64.3c-2.6,0.6-4.8,2.9-4.8,7.6c0,7.5,0,107.5,0,113.8c0,4.3,1.7,7.4,4.9,7.7L99.1,401.1z" />
    </svg>
  );
}

// Shared, unbranded building blocks for the app-promotion surfaces
// (hero corners, auth branding panel, floating widget). Nothing here renders
// a solid standalone card — callers are responsible for integrating these
// into whatever glassy/transparent surface fits their context.

export function StoreBadgeChip({ platform, compact = false }: { platform: 'ios' | 'android'; compact?: boolean }) {
  const isIos = platform === 'ios';
  return (
    <div
      role="img"
      aria-label={isIos ? 'Download on the App Store' : 'Get it on Google Play'}
      className={clsx(
        'flex items-center gap-[7px] rounded-[9px] border border-white/20 bg-white/10 backdrop-blur-sm select-none transition-colors hover:bg-white/[0.16]',
        compact ? 'px-2.5 py-[6px]' : 'px-3.5 py-[9px]',
      )}
    >
      {isIos
        ? <AppleGlyph size={compact ? 13 : 17} />
        : <GooglePlayGlyph size={compact ? 13 : 16} />}
      {compact ? (
        <p className="text-[10.5px] font-semibold text-white leading-none">{isIos ? 'App Store' : 'Google Play'}</p>
      ) : (
        <div className="text-start leading-none">
          <p className="text-[7.5px] text-white/60 mb-[2px]">{isIos ? 'Download on the' : 'GET IT ON'}</p>
          <p className="text-[12.5px] font-bold text-white leading-none">{isIos ? 'App Store' : 'Google Play'}</p>
        </div>
      )}
    </div>
  );
}

// No published rating/download count to show yet (Android is internal-test
// only) — this deliberately does NOT render a star rating or a download
// count, both of which would be fabricated numbers with no backing data.
// `label` lets a caller supply different real, honest copy instead.
export function RatingRow({ label = 'Available now on Android — iOS coming soon' }: { label?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Sparkles size={12} className="text-brand-orange" />
      <span className="text-[10.5px] text-white/60">{label}</span>
    </div>
  );
}

// Phone silhouette built from the app's own UI language — no external assets.
export function PhoneMockup({ className, primary = true, size = 'md' }: { className?: string; primary?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const width = size === 'lg' ? 'w-[168px] sm:w-[190px]' : size === 'sm' ? 'w-[110px]' : 'w-[126px] sm:w-[142px]';
  return (
    <div
      className={clsx(
        width,
        'aspect-[9/19] rounded-[24px] bg-carbon p-[5px] border',
        primary ? 'border-white/15 z-[1]' : 'border-white/10 opacity-90',
        className,
      )}
    >
      <div className="relative w-full h-full rounded-[19px] bg-cream overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-11 h-3 bg-carbon rounded-b-lg z-10" />
        <div className="h-8 bg-white flex items-center px-2.5 pt-2">
          <div className="w-10 h-[6px] rounded-full bg-brand-pale-orange" />
        </div>
        <div className="mx-[7px] mt-[6px] h-11 rounded-[9px] bg-gradient-to-br from-brand-orange to-brand-deep-orange" />
        <div className="grid grid-cols-2 gap-[5px] px-[7px] mt-[6px]">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-[7px] bg-white border border-bone aspect-square flex items-end p-[4px]">
              <div className="w-full h-[4px] rounded-full bg-bone" />
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 inset-x-0 h-7 bg-white border-t border-bone flex items-center justify-around px-2">
          {[0, 1, 2, 3].map(i => <div key={i} className="w-[10px] h-[10px] rounded-full bg-bone" />)}
        </div>
      </div>
    </div>
  );
}

// Small decorative card that "floats" beside the phone mockup — order
// confirmation, a review, etc. Purely illustrative chrome, no invented stats.
export function FloatingMiniCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx(
      'absolute flex items-center gap-2 px-3 py-2 rounded-[12px] border border-white/15 bg-white/10 backdrop-blur-md',
      className,
    )}>
      {children}
    </div>
  );
}
