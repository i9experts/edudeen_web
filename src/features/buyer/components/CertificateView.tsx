import { useEffect, useRef, useState } from 'react';
import { EdudeenLogo } from '@/components/comman/ui/EdudeenLogo';
import { safeHttpUrl } from '@/utils/safeRedirect';
import type { CertificateConfig } from '@/api/services/classroom';

/** A4 landscape at 96 dpi. The sheet is always laid out at this size, then scaled to fit the screen. */
const W = 1122;
const H = 793;

export interface CertificateViewData {
  learnerName: string;
  courseTitle: string;
  code: string;
  /** ISO date shown on the certificate. */
  date: string | null;
  guardianName?: string | null;
  institute?: string | null;
  city?: string | null;
  country?: string | null;
  instructorName?: string | null;
  storeName?: string | null;
}

interface Props {
  data: CertificateViewData;
  config?: CertificateConfig | null;
  /** Shows a 'Sample' tag (seller preview). */
  sample?: boolean;
  /** Only the real certificate page is printable; previews must not hijack the print stylesheet. */
  printable?: boolean;
}

function formatDate(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Watermark({ text, image }: { text?: string | null; image?: string | null }) {
  if (image) {
    return (
      <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img src={image} alt="" style={{ width: '58%', maxHeight: '70%', objectFit: 'contain', opacity: 0.08 }} />
      </div>
    );
  }
  if (!text) return null;
  const rows = Array.from({ length: 6 });
  const cols = Array.from({ length: 4 });
  return (
    <div aria-hidden className="absolute pointer-events-none overflow-hidden" style={{ inset: 0 }}>
      <div style={{ position: 'absolute', inset: '-25%', transform: 'rotate(-28deg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
        {rows.map((_, r) => (
          <div key={r} style={{ display: 'flex', justifyContent: 'space-around', paddingLeft: r % 2 ? 120 : 0 }}>
            {cols.map((__, c) => (
              <span key={c} style={{ fontSize: 34, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0F3354', opacity: 0.07, whiteSpace: 'nowrap' }}>{text}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The completion certificate. Used by the public certificate page (printable) and by the seller's designer preview.
 * Everything optional: old certificates without details/config still render.
 */
export function CertificateView({ data, config, sample, printable }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / W) || 1);
    fit();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const watermarkImage = safeHttpUrl(config?.watermarkImageUrl ?? '') || null;
  const stamp = safeHttpUrl(config?.stampImageUrl ?? '') || null;
  const signatureImg = safeHttpUrl(config?.signatureImageUrl ?? '') || null;
  const watermarkText = watermarkImage ? null : (config?.watermarkText?.trim() || null);
  const issuer = config?.issuerName?.trim() || data.storeName || null;
  const details = [data.institute, [data.city, data.country].filter(Boolean).join(', ')].filter(Boolean) as string[];
  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://edudeen.com'}/certificates/${data.code}`;

  return (
    <div ref={box} className={printable ? 'cert-print-root relative w-full' : 'relative w-full'} style={{ height: H * scale }}>
      {sample && <span className="cert-no-print absolute start-2 top-2 z-10 rounded-full bg-brand-gold text-carbon text-[11px] font-bold px-2.5 py-0.5">Sample</span>}
      <div
        translate="no"
        className="cert-sheet relative bg-white overflow-hidden text-center shadow-sm"
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <div className="absolute inset-[22px] border-[4px] border-double rounded-md pointer-events-none" style={{ borderColor: 'rgba(212,160,23,0.75)' }} />
        <div className="absolute inset-[40px] border pointer-events-none" style={{ borderColor: 'rgba(15,51,84,0.18)' }} />
        <Watermark text={watermarkText} image={watermarkImage} />

        <div className="relative h-full flex flex-col items-center px-[110px] pt-[70px] pb-[64px]">
          <EdudeenLogo size={40} />
          <p className="text-[15px] font-bold tracking-[0.34em] uppercase text-brand-royal mt-7 mb-1">Certificate of completion</p>
          <p className="text-[17px] text-slate m-0 mt-5">This certifies that</p>
          <h1 className="font-serif font-normal text-[58px] text-carbon mt-3 mb-1 leading-tight break-words max-w-full">{data.learnerName}</h1>
          {data.guardianName && <p className="text-[16px] text-graphite m-0">Son/Daughter of {data.guardianName}</p>}
          {details.length > 0 && <p className="text-[15px] text-slate m-0 mt-1">{details.join(' · ')}</p>}
          <p className="text-[17px] text-slate m-0 mt-5">has successfully completed the course</p>
          <h2 className="text-[32px] font-bold text-carbon mt-2 mb-1 max-w-[860px] leading-snug">{data.courseTitle}</h2>
          {(data.instructorName || data.storeName) && (
            <p className="text-[16px] text-graphite m-0">
              {data.instructorName ? `taught by ${data.instructorName}` : ''}{data.instructorName && data.storeName ? ' · ' : ''}{data.storeName ?? ''}
            </p>
          )}

          <div className="mt-auto w-full grid grid-cols-3 items-end gap-6 text-[14px] text-slate">
            <div className="text-start">
              <p className="m-0 font-semibold text-carbon text-[16px]">{formatDate(data.date)}</p>
              <p className="m-0">Date of completion</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              {stamp && <img src={stamp} alt="Seal" style={{ width: 118, height: 118, objectFit: 'contain' }} />}
              <p className="m-0 font-mono font-semibold text-carbon text-[14px]">{data.code}</p>
              <p className="m-0 text-[12px]">Verify at {verifyUrl.replace(/^https?:\/\//, '')}</p>
            </div>
            <div className="text-end">
              <div className="ms-auto w-[230px] border-t border-carbon/60 pt-1 relative">
                {signatureImg && <img src={signatureImg} alt="Signature" style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', width: 420, height: 168, marginBottom: 2, maxWidth: 'none', objectFit: 'contain', objectPosition: 'center bottom' }} />}
                <p className="m-0 font-semibold text-carbon text-[16px]">{config?.signatureName?.trim() || issuer || ''}</p>
                <p className="m-0">{config?.signatureTitle?.trim() || (config?.signatureName ? '' : 'Instructor')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
