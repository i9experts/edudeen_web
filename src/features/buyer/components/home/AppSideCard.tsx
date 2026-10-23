import { Gift, Zap } from 'lucide-react';
import { EdudeenLogo } from '@/components/comman/ui/EdudeenLogo';
import { StoreBadgeChip, useAppQrDataUrl, useGooglePlayUrl, useAppStoreUrl } from '@/components/comman/ui/AppPromoParts';

// Soft light-blue tint from the Edudeen logo palette.
const BG = 'bg-gradient-to-b from-white via-[#F1F6FB] to-[#DCE9F6] border border-[#CFE0F1]';

function QrTile({ href, dataUrl, className }: { href: string; dataUrl: string | null; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Scan to download the Edudeen app"
      className={`block aspect-square rounded-xl bg-white p-1.5 shadow-sm border border-[#CFE0F1] ${className ?? ''}`}
    >
      {dataUrl ? <img src={dataUrl} alt="" className="block w-full h-full" /> : null}
    </a>
  );
}

/**
 * "Try Edudeen app" card beside the homepage hero banner.
 * lg+: exactly the banner's height (absolutely fills its grid cell); parts drop out as the height shrinks.
 * Below lg: a compact horizontal strip under the banner.
 */
export function AppSideCard({ className }: { className?: string }) {
  const googlePlay = useGooglePlayUrl();
  const appStore = useAppStoreUrl();
  // No public store link yet: the QR still works and opens the site.
  const qrTarget = googlePlay || appStore || (typeof window !== 'undefined' ? window.location.origin : 'https://edudeen.com');
  const qrDataUrl = useAppQrDataUrl(qrTarget);

  return (
    <aside aria-label="Get the Edudeen app" className={`${className ?? ''}`}>
      {/* ── Below lg: horizontal strip ── */}
      <div className={`lg:hidden rounded-2xl ${BG} text-[#0F3354] px-4 py-3 flex items-center gap-3 sm:gap-4`}>
        <div className="min-w-0 flex-1">
          <EdudeenLogo size={20} />
          <p className="text-[13px] font-bold mt-1 leading-tight">Try Edudeen app</p>
          <p className="text-[12px] text-[#4A6A88] leading-snug">Fast checkout &amp; app-only deals</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <StoreBadgeChip platform="ios" compact onLight />
            <StoreBadgeChip platform="android" compact onLight />
          </div>
        </div>
        <QrTile href={qrTarget} dataUrl={qrDataUrl} className="hidden sm:block w-[92px] shrink-0" />
      </div>

      {/* ── lg+: fills the banner's height ── */}
      <div
        className={`hidden lg:flex absolute inset-0 rounded-2xl ${BG} text-[#0F3354] p-2.5 xl:p-3 flex-col items-center justify-between gap-2 text-center overflow-hidden`}
        style={{ containerType: 'size' }}
      >
        <div className="flex flex-col items-center gap-1 shrink-0">
          <EdudeenLogo size={20} />
          <p className="text-[12px] xl:text-[13px] font-bold tracking-wide uppercase leading-tight">Try Edudeen app</p>
        </div>

        {/* Offer rows: only when the card is tall enough */}
        <div className="hidden [@container(min-height:300px)]:flex flex-col gap-1.5 w-full shrink-0">
          <div className="flex items-center gap-2 rounded-lg bg-white border border-[#CFE0F1] px-2 py-1.5 text-start">
            <Zap size={14} className="shrink-0 text-[#2F6AA8]" />
            <span className="text-[12px] font-semibold leading-tight">Fast checkout</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white border border-[#CFE0F1] px-2 py-1.5 text-start">
            <Gift size={14} className="shrink-0 text-[#2F6AA8]" />
            <span className="text-[12px] font-semibold leading-tight">App-only deals</span>
          </div>
        </div>

        {/* QR takes the leftover space */}
        <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center gap-1">
          <QrTile href={qrTarget} dataUrl={qrDataUrl} className="max-h-[calc(100%-18px)] max-w-[88%]" />
          <p className="text-[12px] text-[#4A6A88] leading-none shrink-0">Scan to download</p>
        </div>

        <div className="hidden [@container(min-height:250px)]:flex flex-col gap-1.5 w-full shrink-0 [&>*]:w-full [&>*>div]:justify-center">
          <StoreBadgeChip platform="ios" compact onLight />
          <StoreBadgeChip platform="android" compact onLight />
        </div>
      </div>
    </aside>
  );
}
