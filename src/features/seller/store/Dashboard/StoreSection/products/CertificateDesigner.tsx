import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Input } from '@/components/comman/ui';
import { apiUploadPublicFile } from '@/api/upload';
import { CertificateView } from '@/features/buyer/components/CertificateView';
import type { CertificateConfig } from '@/api/services/classroom';

/** Editable form state. Strings are never null here; empty = not set. */
export interface CertDesign {
  watermarkMode: 'none' | 'text' | 'image';
  watermarkText: string;
  watermarkImageUrl: string;
  stampImageUrl: string;
  signatureName: string;
  signatureTitle: string;
  issuerName: string;
}

export const EMPTY_DESIGN: CertDesign = { watermarkMode: 'none', watermarkText: '', watermarkImageUrl: '', stampImageUrl: '', signatureName: '', signatureTitle: '', issuerName: '' };

export function designFromConfig(c?: CertificateConfig | null): CertDesign {
  if (!c) return EMPTY_DESIGN;
  return {
    watermarkMode: c.watermarkImageUrl ? 'image' : c.watermarkText ? 'text' : 'none',
    watermarkText: c.watermarkText ?? '',
    watermarkImageUrl: c.watermarkImageUrl ?? '',
    stampImageUrl: c.stampImageUrl ?? '',
    signatureName: c.signatureName ?? '',
    signatureTitle: c.signatureTitle ?? '',
    issuerName: c.issuerName ?? '',
  };
}

/** What the API gets: only the active watermark type, empty values as null (null clears). */
export function configFromDesign(d: CertDesign): CertificateConfig {
  const v = (s: string) => s.trim() || null;
  return {
    watermarkText: d.watermarkMode === 'text' ? v(d.watermarkText) : null,
    watermarkImageUrl: d.watermarkMode === 'image' ? v(d.watermarkImageUrl) : null,
    stampImageUrl: v(d.stampImageUrl),
    signatureName: v(d.signatureName),
    signatureTitle: v(d.signatureTitle),
    issuerName: v(d.issuerName),
  };
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

function ImageSlot({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!ALLOWED.includes(file.type)) { setError('Use a JPG, PNG or WebP image.'); return; }
    if (file.size > MAX_BYTES) { setError('The image is over 2 MB. Please use a smaller one.'); return; }
    setBusy(true);
    try {
      const res = await apiUploadPublicFile(file);
      onChange(res.data.url);
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed. Try again.'); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-carbon">{label}</span>
      <div className="flex items-center gap-3">
        <div className="w-[72px] h-[72px] rounded-lg border border-dashed border-bone bg-fog flex items-center justify-center overflow-hidden shrink-0">
          {busy ? <Loader2 size={18} className="animate-spin text-slate" /> : value ? <img src={value} alt="" className="w-full h-full object-contain" /> : <ImagePlus size={20} className="text-slate" />}
        </div>
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-lg border border-bone bg-white px-3 py-1.5 text-[12.5px] font-semibold text-carbon cursor-pointer disabled:opacity-50">{value ? 'Replace' : 'Upload image'}</button>
            {value && !busy && (
              <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1 text-[12.5px] text-error bg-transparent border-none cursor-pointer p-0"><X size={13} /> Remove</button>
            )}
          </div>
          <span className="text-[12px] text-slate">{hint}</span>
          {error && <span role="alert" className="text-[12px] text-error">{error}</span>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}

interface Props {
  value: CertDesign;
  onChange: (next: CertDesign) => void;
  courseTitle: string;
  instructorName: string;
  storeName: string;
}

/** Seller's certificate design: watermark, stamp, signature, plus a live preview with sample learner details. */
export function CertificateDesigner({ value, onChange, courseTitle, instructorName, storeName }: Props) {
  const set = (patch: Partial<CertDesign>) => onChange({ ...value, ...patch });
  const modes: { id: CertDesign['watermarkMode']; label: string }[] = [{ id: 'none', label: 'None' }, { id: 'text', label: 'Text' }, { id: 'image', label: 'Image' }];

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-bone">
      <div>
        <p className="text-[13.5px] font-bold text-carbon m-0">Certificate design</p>
        <p className="text-[12.5px] text-slate m-0 mt-0.5">Add your watermark and stamp. They appear on every certificate learners print or download. Learners add their own name and details.</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-carbon">Watermark</span>
        <div role="radiogroup" aria-label="Watermark type" className="inline-flex rounded-lg border border-bone overflow-hidden self-start">
          {modes.map(m => (
            <button key={m.id} type="button" role="radio" aria-checked={value.watermarkMode === m.id} onClick={() => set({ watermarkMode: m.id })}
              className={clsx('px-4 py-1.5 text-[12.5px] font-semibold border-none cursor-pointer', value.watermarkMode === m.id ? 'bg-carbon text-white' : 'bg-white text-carbon')}>{m.label}</button>
          ))}
        </div>
        {value.watermarkMode === 'text' && (
          <Input aria-label="Watermark text" placeholder="e.g. Your academy name" maxLength={40} value={value.watermarkText} onChange={e => set({ watermarkText: e.target.value })} />
        )}
        {value.watermarkMode === 'image' && (
          <ImageSlot label="Watermark image" hint="Your logo, shown faintly behind the text. JPG, PNG or WebP, up to 2 MB." value={value.watermarkImageUrl} onChange={url => set({ watermarkImageUrl: url })} />
        )}
      </div>

      <ImageSlot label="Stamp / seal" hint="Printed at the bottom of the certificate. A transparent PNG looks best. Up to 2 MB." value={value.stampImageUrl} onChange={url => set({ stampImageUrl: url })} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Signed by (name)" maxLength={80} value={value.signatureName} onChange={e => set({ signatureName: e.target.value })} />
        <Input label="Title under the signature" placeholder="e.g. Course Instructor" maxLength={80} value={value.signatureTitle} onChange={e => set({ signatureTitle: e.target.value })} />
      </div>
      <Input label="Issued by (academy or school name)" maxLength={80} value={value.issuerName} onChange={e => set({ issuerName: e.target.value })} />

      <div>
        <p className="text-[12.5px] font-semibold text-slate m-0 mb-1.5">Preview</p>
        <div className="rounded-xl overflow-hidden border border-bone">
          <CertificateView
            sample
            config={configFromDesign(value)}
            data={{
              learnerName: 'Student Name',
              courseTitle: courseTitle || 'Your course title',
              code: 'EDU-SAMPLE00',
              date: new Date().toISOString(),
              guardianName: 'Father Name',
              institute: 'School name',
              city: 'City',
              country: 'Country',
              instructorName: instructorName || null,
              storeName: storeName || null,
            }}
          />
        </div>
      </div>
    </div>
  );
}
