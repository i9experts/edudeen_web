import { useRef, useState } from 'react';
import { Film, Trash2, Upload } from 'lucide-react';
import { apiUploadProductVideo } from '@/api/upload';
import type { ProductVideoValue } from './ProductFormKit';

const MAX_MB = 60;
const OK_EXT = /\.(mp4|mov|webm)$/i;

/** Seller picks ONE optional product video and whether it is the first thing buyers see on the product page. */
export function ProductVideoField({ value, onChange }: { value: ProductVideoValue | null; onChange: (v: ProductVideoValue | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState('');

  async function pick(file: File | undefined) {
    if (!file) return;
    setError('');
    if (!OK_EXT.test(file.name)) { setError('Choose an .mp4, .mov or .webm video.'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setError(`The video is too large. Maximum is ${MAX_MB} MB.`); return; }
    setBusy(true); setPct(0);
    try {
      const res = await apiUploadProductVideo(file, setPct);
      const d = res.data;
      onChange({ url: d.url, posterUrl: d.posterUrl ?? null, frontFirst: value?.frontFirst ?? false });
    } catch (e) {
      setError((e as { message?: string })?.message || 'Could not upload the video. Please try again.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" className="hidden" data-no-live-validate onChange={e => void pick(e.target.files?.[0])} />
      {value ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-[220px] aspect-video rounded-xl overflow-hidden border border-bone bg-black shrink-0">
            <video src={value.url} poster={value.posterUrl ?? undefined} controls preload="metadata" playsInline className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <fieldset className="border-0 p-0 m-0">
              <legend className="text-[13px] font-semibold text-carbon mb-1">What should buyers see first on the product page?</legend>
              <label className="flex items-center gap-2 text-[13px] text-charcoal cursor-pointer min-h-[32px]">
                <input type="radio" name="video-front" checked={!value.frontFirst} onChange={() => onChange({ ...value, frontFirst: false })} /> Pictures first (video comes after the pictures)
              </label>
              <label className="flex items-center gap-2 text-[13px] text-charcoal cursor-pointer min-h-[32px]">
                <input type="radio" name="video-front" checked={value.frontFirst} onChange={() => onChange({ ...value, frontFirst: true })} /> Video first (play button on the first picture)
              </label>
            </fieldset>
            <p className="text-[12px] text-slate m-0">Product cards in search and on the shelf always show your first picture.</p>
            <div className="flex gap-2 flex-wrap">
              <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-lg border border-bone bg-white cursor-pointer">
                <Upload size={14} aria-hidden /> Replace video
              </button>
              <button type="button" disabled={busy} onClick={() => onChange(null)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-lg border border-bone bg-white text-error cursor-pointer">
                <Trash2 size={14} aria-hidden /> Remove video
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
          className="flex items-center justify-center gap-2 w-full min-h-[88px] rounded-xl border-2 border-dashed border-bone bg-cream/40 text-[13px] font-semibold text-slate cursor-pointer">
          <Film size={18} aria-hidden /> {busy ? `Uploading… ${pct}%` : 'Add a video (mp4, mov or webm, up to 60 MB)'}
        </button>
      )}
      {busy && value && <p role="status" className="text-[12px] text-slate m-0">Uploading… {pct}%</p>}
      {error && <p role="alert" className="text-[12.5px] text-error m-0">{error}</p>}
    </div>
  );
}
