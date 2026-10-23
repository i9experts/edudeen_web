import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, Loader2, UploadCloud, Wand2 } from 'lucide-react';
import { useUpload } from '@/hooks/upload/useUpload';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';

const MIN_WIDTH = 1280;
const BANNER_W = 2560;
const BANNER_H = 720;

interface Pending { file: File; w: number; h: number; preview: string }

/** Fills the whole banner box (2560 x 720): the picture is enlarged to cover it, extra edges are cropped evenly. */
async function fitToBanner(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = BANNER_W;
  canvas.height = BANNER_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) { bmp.close(); throw new Error('Your browser could not adjust this picture.'); }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const cover = Math.max(BANNER_W / bmp.width, BANNER_H / bmp.height);
  const w = bmp.width * cover;
  const h = bmp.height * cover;
  ctx.drawImage(bmp, (BANNER_W - w) / 2, (BANNER_H - h) / 2, w, h);
  bmp.close();
  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.95));
  if (!blob) throw new Error('Could not adjust this picture.');
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '-banner.jpg', { type: 'image/jpeg' });
}

/**
 * Banner picture upload. A picture at least 1280 px wide is uploaded as is. A smaller one is NOT sent: the admin sees a
 * notice and can press "Adjust to banner size" (after confirming that quality will drop) to set it to 2560 x 720.
 */
export function BannerImagePicker({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const { upload, uploading, error } = useUpload('public');
  const [pending, setPending] = useState<Pending | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const previewRef = useRef('');

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const clearPending = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = '';
    setPending(null);
  };

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLocalError('');
    clearPending();
    let w = 0;
    let h = 0;
    try {
      const bmp = await createImageBitmap(file);
      w = bmp.width;
      h = bmp.height;
      bmp.close();
    } catch {
      setLocalError('Could not read this picture. Use a JPG, PNG or WebP file.');
      return;
    }
    if (w >= MIN_WIDTH) {
      // The upload hook shows its own error message on failure.
      try { onChange((await upload(file)).url); } catch { /* shown via `error` */ }
      return;
    }
    const preview = URL.createObjectURL(file);
    previewRef.current = preview;
    setPending({ file, w, h, preview });
  }

  async function adjust() {
    if (!pending) return;
    setBusy(true);
    setLocalError('');
    try {
      const fixed = await fitToBanner(pending.file);
      const data = await upload(fixed);
      onChange(data.url);
      setConfirming(false);
      clearPending();
    } catch (err) {
      setConfirming(false);
      setLocalError(err instanceof Error ? err.message : 'Could not adjust this picture.');
    } finally {
      setBusy(false);
    }
  }

  const shownError = localError || error;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full aspect-[3.5/1] rounded-xl overflow-hidden border-2 border-dashed border-brand-orange bg-brand-pale-orange flex items-center justify-center">
        {value && !pending
          ? <img src={value} alt="Banner preview" className="absolute inset-0 w-full h-full object-contain bg-cream" />
          : pending
            ? <img src={pending.preview} alt="Selected picture" className="absolute inset-0 w-full h-full object-contain bg-cream opacity-60" />
            : <span className="text-[12px] text-brand-orange font-medium">No picture yet</span>}
        {(uploading || busy) && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="animate-spin text-brand-orange" size={24} /></div>}
      </div>
      <label className="self-start">
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} disabled={uploading || busy} />
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-bone bg-white px-3 py-2 text-[13px] font-medium text-charcoal cursor-pointer hover:bg-cream">
          <UploadCloud size={14} /> {value ? 'Change picture' : 'Upload picture'}
        </span>
      </label>

      {pending && (
        <div role="alert" className="rounded-lg border border-warning-border bg-warning-bg p-3 text-[12px] text-charcoal">
          <p className="m-0 font-semibold flex items-center gap-1.5"><AlertTriangle size={14} /> This picture is too small for the banner</p>
          <p className="m-0 mt-1">It is {pending.w} × {pending.h} px; the banner needs at least {MIN_WIDTH} px wide (best {BANNER_W} × {BANNER_H}). Upload a bigger picture, or use it anyway and let us adjust it.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button size="sm" icon={<Wand2 size={13} />} onClick={() => setConfirming(true)} disabled={busy}>Adjust to banner size</Button>
            <Button size="sm" variant="ghost" onClick={clearPending} disabled={busy}>Cancel</Button>
          </div>
        </div>
      )}
      {shownError && <p className="text-[12px] text-error m-0">{shownError}</p>}

      <div className="rounded-lg border border-bone bg-cream/60 px-3 py-2.5 text-[12px] text-slate leading-relaxed">
        <p className="m-0 font-semibold text-charcoal mb-1">Picture requirements</p>
        <ul className="m-0 ps-4 list-disc">
          <li><strong>Best size: {BANNER_W} × {BANNER_H} px</strong> (wide, about 3.5 : 1). Minimum width {MIN_WIDTH} px.</li>
          <li>JPG, PNG or WebP, up to 5 MB.</li>
          <li>The picture fills the whole banner box without stretching, so a little of the top/bottom or sides can be trimmed on some screens. Keep text and logos away from the edges.</li>
          <li>A smaller picture can be adjusted with the button, but it will look softer.</li>
        </ul>
      </div>

      {confirming && (
        <Modal title="Picture quality will drop" onClose={() => !busy && setConfirming(false)}
          footer={<>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button>
            <Button onClick={adjust} loading={busy}>Done, adjust it</Button>
          </>}>
          <p className="text-[13px] text-charcoal m-0">
            This picture will be enlarged to fill the whole banner ({BANNER_W} × {BANNER_H}); the top/bottom or side edges may be trimmed. Enlarging a small picture makes it look blurry, so its quality will get worse. Continue?
          </p>
        </Modal>
      )}
    </div>
  );
}