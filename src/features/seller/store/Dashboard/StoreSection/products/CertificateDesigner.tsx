import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Input, Select } from '@/components/comman/ui';
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
  signatureImageUrl: string;
  issuerName: string;
}

export const EMPTY_DESIGN: CertDesign = { watermarkMode: 'none', watermarkText: '', watermarkImageUrl: '', stampImageUrl: '', signatureName: '', signatureTitle: '', signatureImageUrl: '', issuerName: '' };

export function designFromConfig(c?: CertificateConfig | null): CertDesign {
  if (!c) return EMPTY_DESIGN;
  return {
    watermarkMode: c.watermarkImageUrl ? 'image' : c.watermarkText ? 'text' : 'none',
    watermarkText: c.watermarkText ?? '',
    watermarkImageUrl: c.watermarkImageUrl ?? '',
    stampImageUrl: c.stampImageUrl ?? '',
    signatureName: c.signatureName ?? '',
    signatureTitle: c.signatureTitle ?? '',
    signatureImageUrl: c.signatureImageUrl ?? '',
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
    signatureImageUrl: v(d.signatureImageUrl),
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

const SIGNATURE_TITLES = ['Course Instructor', 'Teacher', 'Principal', 'Director', 'Founder', 'Academy Head'];

/** Makes the plain background of a signature photo transparent, keeping only the ink. */
async function removeBackground(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 900 / bmp.width);
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Could not process the image.');
  ctx.drawImage(bmp, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // Background colour = average of the four corner patches.
  let r = 0, g = 0, b = 0, n = 0;
  const patch = Math.max(2, Math.min(12, Math.floor(Math.min(w, h) / 10)));
  for (const [x0, y0] of [[0, 0], [w - patch, 0], [0, h - patch], [w - patch, h - patch]]) {
    for (let y = y0; y < y0 + patch; y++) for (let x = x0; x < x0 + patch; x++) {
      const i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    }
  }
  r /= n; g /= n; b /= n;
  const lo = 40, hi = 110;
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.sqrt((d[i] - r) ** 2 + (d[i + 1] - g) ** 2 + (d[i + 2] - b) ** 2);
    const a = Math.max(0, Math.min(1, (dist - lo) / (hi - lo)));
    d[i + 3] = Math.round(a * d[i + 3]);
  }
  ctx.putImageData(img, 0, 0);
  return new Promise((res, rej) => c.toBlob(bl => (bl ? res(bl) : rej(new Error('Could not process the image.'))), 'image/png'));
}

function SignatureField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [mode, setMode] = useState<'upload' | 'draw'>('upload');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const send = async (blob: Blob) => {
    const res = await apiUploadPublicFile(new File([blob], 'signature.png', { type: 'image/png' }));
    onChange(res.data.url);
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!ALLOWED.includes(file.type)) { setError('Use a JPG, PNG or WebP image.'); return; }
    if (file.size > MAX_BYTES) { setError('The image is over 2 MB. Please use a smaller one.'); return; }
    setBusy(true);
    try { await send(await removeBackground(file)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Upload failed. Try again.'); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  };

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const el = canvas.current!;
    const rect = el.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (el.width / rect.width), y: (e.clientY - rect.top) * (el.height / rect.height) };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvas.current?.getContext('2d'); if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = pos(e);
    ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b1f33';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); ctx.stroke();
    setHasInk(true);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvas.current?.getContext('2d'); if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y); ctx.stroke();
  };
  const up = () => { drawing.current = false; };
  const clear = () => {
    const el = canvas.current; if (!el) return;
    el.getContext('2d')?.clearRect(0, 0, el.width, el.height);
    setHasInk(false);
  };
  const useDrawn = async () => {
    const el = canvas.current; if (!el || !hasInk) return;
    setBusy(true); setError('');
    try {
      const blob = await new Promise<Blob>((res, rej) => el.toBlob(bl => (bl ? res(bl) : rej(new Error('Could not save the signature.'))), 'image/png'));
      await send(blob);
      clear();
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed. Try again.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-carbon">Signature (optional)</span>
      {value && (
        <div className="flex items-center gap-3">
          <div className="h-[72px] w-[160px] rounded-lg border border-bone bg-white flex items-center justify-center overflow-hidden">
            <img src={value} alt="Signature" className="max-w-full max-h-full object-contain" />
          </div>
          <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1 text-[12.5px] text-error bg-transparent border-none cursor-pointer p-0"><X size={13} /> Remove</button>
        </div>
      )}
      <div role="radiogroup" aria-label="Signature method" className="inline-flex rounded-lg border border-bone overflow-hidden self-start">
        {([['upload', 'Upload picture'], ['draw', 'Draw with mouse']] as const).map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)}
            className={clsx('px-4 py-1.5 text-[12.5px] font-semibold border-none cursor-pointer', mode === id ? 'bg-carbon text-white' : 'bg-white text-carbon')}>{label}</button>
        ))}
      </div>
      {mode === 'upload' ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} className="rounded-lg border border-bone bg-white px-3 py-1.5 text-[12.5px] font-semibold text-carbon cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5">
              {busy && <Loader2 size={14} className="animate-spin" />}{value ? 'Replace picture' : 'Upload picture'}
            </button>
          </div>
          <span className="text-[12px] text-slate">Photo of your signature on plain paper. The background is removed automatically so only the signature shows. JPG, PNG or WebP, up to 2 MB.</span>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <canvas ref={canvas} width={600} height={180} aria-label="Signature drawing area"
            className="w-full max-w-[480px] h-auto rounded-lg border border-dashed border-bone bg-white touch-none cursor-crosshair"
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} />
          <div className="flex items-center gap-2">
            <button type="button" disabled={busy || !hasInk} onClick={useDrawn} className="rounded-lg bg-carbon text-white px-3 py-1.5 text-[12.5px] font-semibold border-none cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5">
              {busy && <Loader2 size={14} className="animate-spin" />}Use this signature
            </button>
            <button type="button" disabled={busy || !hasInk} onClick={clear} className="rounded-lg border border-bone bg-white px-3 py-1.5 text-[12.5px] font-semibold text-carbon cursor-pointer disabled:opacity-50">Clear</button>
          </div>
          <span className="text-[12px] text-slate">Sign inside the box with your mouse or finger.</span>
        </div>
      )}
      {error && <span role="alert" className="text-[12px] text-error">{error}</span>}
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

      <SignatureField value={value.signatureImageUrl} onChange={url => set({ signatureImageUrl: url })} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Signed by (name)" maxLength={80} value={value.signatureName} onChange={e => set({ signatureName: e.target.value })} />
        <Select label="Title under the signature" value={value.signatureTitle} onChange={e => set({ signatureTitle: e.target.value })}>
          <option value="">Select a title</option>
          {value.signatureTitle && !SIGNATURE_TITLES.includes(value.signatureTitle) && <option value={value.signatureTitle}>{value.signatureTitle}</option>}
          {SIGNATURE_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
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
