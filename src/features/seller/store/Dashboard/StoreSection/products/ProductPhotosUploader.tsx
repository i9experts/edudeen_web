import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, Star, UploadCloud, X } from 'lucide-react';
import { apiUploadPublicFile } from '@/api/upload';

export const MAX_PRODUCT_PHOTOS = 20;
const CONCURRENCY = 3;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/webp';
const OK_TYPES = ACCEPT.split(',');

interface Pending { id: string; name: string; preview: string; status: 'queued' | 'uploading' | 'error'; error?: string; file: File }

/**
 * Multi-photo uploader for the product form (Add + Edit): select or drop several images at once, up to MAX_PRODUCT_PHOTOS.
 * Uploads run a few at a time through the existing public upload endpoint; finished URLs are appended to `value`.
 * Reorder with the arrows, "Make cover" moves a photo to the first position (the cover buyers see).
 */
export function ProductPhotosUploader({ value, onChange, max = MAX_PRODUCT_PHOTOS }: { value: string[]; onChange: (urls: string[]) => void; max?: number }) {
  const [items, setItems] = useState<Pending[]>([]);
  const [notice, setNotice] = useState('');
  const [drag, setDrag] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const itemsRef = useRef<Pending[]>([]);
  itemsRef.current = items;
  const active = useRef(0);
  const started = useRef(new Set<string>());
  const alive = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    alive.current = true; // StrictMode (dev) runs the cleanup once and re-runs the effect
    return () => {
    alive.current = false;
    itemsRef.current.forEach(i => URL.revokeObjectURL(i.preview));
    };
  }, []);

  const total = value.length + items.filter(i => i.status !== 'error').length;
  const full = total >= max;

  const patch = (id: string, p: Partial<Pending>) => setItems(prev => prev.map(i => (i.id === id ? { ...i, ...p } : i)));
  const drop = (id: string) => setItems(prev => {
    const hit = prev.find(i => i.id === id);
    if (hit) URL.revokeObjectURL(hit.preview);
    return prev.filter(i => i.id !== id);
  });

  const runOne = (it: Pending) => {
    if (started.current.has(it.id)) return;
    started.current.add(it.id);
    active.current += 1;
    patch(it.id, { status: 'uploading', error: undefined });
    apiUploadPublicFile(it.file)
      .then(res => {
        const url = res.data?.url;
        if (!url) throw new Error('Upload failed');
        if (alive.current) onChangeRef.current([...valueRef.current, url].slice(0, max));
        valueRef.current = [...valueRef.current, url].slice(0, max);
        drop(it.id);
      })
      .catch((e: unknown) => patch(it.id, { status: 'error', error: e instanceof Error && e.message ? e.message : 'Upload failed' }))
      .finally(() => { active.current -= 1; pump(); });
  };

  const pump = () => {
    if (!alive.current) return;
    const free = Math.max(0, CONCURRENCY - active.current);
    itemsRef.current.filter(i => i.status === 'queued' && !started.current.has(i.id)).slice(0, free).forEach(runOne);
  };

  const addFiles = (list: FileList | File[]) => {
    const files = Array.from(list);
    if (!files.length) return;
    const msgs: string[] = [];
    const room = max - (valueRef.current.length + itemsRef.current.filter(i => i.status !== 'error').length);
    const good: File[] = [];
    for (const f of files) {
      if (!OK_TYPES.includes(f.type)) { msgs.push(`${f.name}: only PNG, JPG or WebP images.`); continue; }
      if (f.size > MAX_BYTES) { msgs.push(`${f.name}: larger than 10 MB.`); continue; }
      good.push(f);
    }
    const take = good.slice(0, Math.max(0, room));
    if (good.length > take.length) msgs.push(`Only ${max} photos are allowed per product - ${good.length - take.length} extra photo${good.length - take.length > 1 ? 's were' : ' was'} not added.`);
    setNotice(msgs.join(' '));
    if (!take.length) return;
    const next: Pending[] = take.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, preview: URL.createObjectURL(file), status: 'queued', file,
    }));
    itemsRef.current = [...itemsRef.current, ...next];
    setItems(itemsRef.current);
    pump();
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!full) addFiles(e.dataTransfer.files);
    else setNotice(`Only ${max} photos are allowed per product.`);
  };

  const move = (i: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  const remove = (i: number) => { setNotice(''); onChange(value.filter((_, idx) => idx !== i)); };
  const retry = (it: Pending) => {
    started.current.delete(it.id);
    itemsRef.current = itemsRef.current.map(i => (i.id === it.id ? { ...i, status: 'queued', error: undefined } : i));
    setItems(itemsRef.current);
    pump();
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={e => { e.preventDefault(); if (!drag) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed px-4 py-5 flex flex-col items-center gap-2 text-center transition-colors ${drag ? 'border-brand-orange bg-brand-pale-orange' : 'border-bone bg-cream/40'} ${full ? 'opacity-60' : ''}`}
      >
        <UploadCloud size={22} className="text-slate" aria-hidden />
        <p className="text-[13px] text-charcoal m-0">Drag and drop photos here, or</p>
        <button
          type="button" disabled={full} onClick={() => inputRef.current?.click()}
          className="px-4 py-2 rounded-lg bg-brand-royal text-white text-[13px] font-semibold border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >Select photos</button>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={onPick} data-testid="photos-input" />
        <p className="text-[12px] text-slate m-0" aria-live="polite">{total}/{max} photos · PNG, JPG or WebP, up to 10 MB each{full ? ' · limit reached' : ''}</p>
      </div>
      {notice && <p role="alert" className="text-[12px] text-error m-0">{notice}</p>}

      {(value.length > 0 || items.length > 0) && (
        <ul className="list-none p-0 m-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {value.map((url, i) => (
            <li key={`${url}-${i}`} className="relative rounded-lg overflow-hidden border border-bone bg-white">
              <img loading="lazy" decoding="async" src={url} alt={`Photo ${i + 1}`} className="w-full aspect-square object-cover" />
              {i === 0 && <span className="absolute top-1 start-1 text-[12px] font-bold bg-brand-orange text-white rounded px-1.5 py-[1px]">Cover</span>}
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => remove(i)} className="absolute top-1 end-1 size-6 rounded-full bg-black/65 text-white flex items-center justify-center border-none cursor-pointer"><X size={12} /></button>
              <div className="flex items-center justify-between gap-1 px-1 py-1 border-t border-bone">
                <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, i - 1)} className="size-6 flex items-center justify-center rounded bg-white border border-bone cursor-pointer disabled:opacity-30"><ArrowLeft size={12} /></button>
                {i > 0
                  ? <button type="button" onClick={() => move(i, 0)} className="flex items-center gap-1 text-[12px] font-semibold text-brand-royal bg-transparent border-none cursor-pointer"><Star size={11} aria-hidden /> Make cover</button>
                  : <span className="text-[12px] text-slate">Cover</span>}
                <button type="button" aria-label="Move later" disabled={i === value.length - 1} onClick={() => move(i, i + 1)} className="size-6 flex items-center justify-center rounded bg-white border border-bone cursor-pointer disabled:opacity-30"><ArrowRight size={12} /></button>
              </div>
            </li>
          ))}
          {items.map(it => (
            <li key={it.id} className="relative rounded-lg overflow-hidden border border-bone bg-white">
              <img src={it.preview} alt="" className={`w-full aspect-square object-cover ${it.status === 'error' ? 'opacity-40' : 'opacity-70'}`} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1 text-center">
                {it.status === 'error' ? (
                  <>
                    <AlertCircle size={16} className="text-error" aria-hidden />
                    <span className="text-[12px] text-error leading-tight">{it.error}</span>
                    <button type="button" onClick={() => retry(it)} className="text-[12px] font-semibold text-brand-royal bg-white border border-bone rounded px-2 py-[1px] cursor-pointer">Retry</button>
                  </>
                ) : (
                  <><Loader2 size={18} className="animate-spin text-brand-orange" aria-hidden /><span className="text-[12px] text-charcoal">{it.status === 'queued' ? 'Waiting…' : 'Uploading…'}</span></>
                )}
              </div>
              {it.status === 'error' && <button type="button" aria-label={`Dismiss ${it.name}`} onClick={() => drop(it.id)} className="absolute top-1 end-1 size-6 rounded-full bg-black/65 text-white flex items-center justify-center border-none cursor-pointer"><X size={12} /></button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
