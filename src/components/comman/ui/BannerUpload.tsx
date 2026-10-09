import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useUpload } from '@/hooks/upload/useUpload';

/** Wide (4:1) drag-and-drop image zone with a live preview - used for store banners. */
export function BannerUpload({ value, onChange, accept = 'image/png,image/jpeg,image/webp', hint = 'Drop an image here or click to browse - 1600 x 400 (4:1) works best' }: {
  value: string; onChange: (url: string) => void; accept?: string; hint?: string;
}) {
  const { upload, uploading, error } = useUpload('public');
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const send = (file?: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    upload(file).then(d => onChange(d.url)).catch(() => {});
  };
  const onPick = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ''; send(f); };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files?.[0]); };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={value ? 'Replace banner image' : 'Upload banner image'}
        onClick={() => !uploading && input.current?.click()}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) { e.preventDefault(); input.current?.click(); } }}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={clsx(
          'relative w-full aspect-[4/1] min-h-[84px] rounded-xl overflow-hidden border-2 border-dashed flex items-center justify-center text-center cursor-pointer transition-colors',
          over ? 'border-brand-orange bg-brand-pale-orange' : 'border-bone bg-cream hover:border-brand-orange/60',
          uploading && 'cursor-wait opacity-70',
        )}
      >
        {value && <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        {uploading ? (
          <Loader2 size={22} className="text-brand-orange animate-spin relative" />
        ) : !value ? (
          <span className="relative flex flex-col items-center gap-1 px-3 text-[12px] text-slate">
            <ImagePlus size={20} className="text-brand-orange" aria-hidden="true" />{hint}
          </span>
        ) : null}
        <input ref={input} type="file" accept={accept} className="hidden" onChange={onPick} disabled={uploading} />
      </div>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        {error ? <p className="text-[12px] text-error">{error}</p> : <span />}
        {value && !uploading && (
          <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1 text-[12px] text-slate hover:text-error bg-transparent border-0 cursor-pointer min-h-[28px]">
            <Trash2 size={12} aria-hidden="true" /> Remove banner
          </button>
        )}
      </div>
    </div>
  );
}