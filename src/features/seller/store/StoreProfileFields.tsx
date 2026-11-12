import { useRef, useState } from 'react';
import { clsx } from 'clsx';
import { ImagePlus, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { Input, Textarea } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { apiUploadPublicFile } from '@/api/upload';
import {
  STORE_IMAGE_RULES, STORE_LIMITS, checkStoreImage, storeFieldError,
  type StoreField, type StoreImageKind,
} from '@/utils/storeProfileRules';

/**
 * The ONE text field for store name / tagline / description / contact phone / contact e-mail, used by Store Settings
 * AND Customize Your Store. Live counter, error text after leaving the field (or as soon as it is over the limit).
 * Pages decide whether Save is blocked with `storeFieldError` (same function), so the form and the button agree.
 */
export function StoreTextField({ field, label, value, onChange, original = '', placeholder, rows = 3, hint, className }: {
  field: StoreField;
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** The value saved today: an unchanged legacy value is not flagged. */
  original?: string;
  placeholder?: string;
  rows?: number;
  hint?: string;
  className?: string;
}) {
  const [touched, setTouched] = useState(false);
  const error = storeFieldError(field, value, original);
  const max = field === 'name' || field === 'tagline' || field === 'description' ? STORE_LIMITS[field] : null;
  const len = value.trim().length;
  // Live while typing past the limit; everything else once the field was left.
  const shown = error && (touched || (max !== null && len > max)) ? error : undefined;
  const common = { label, value, placeholder, error: shown, onBlur: () => setTouched(true), onChange: (e: { target: { value: string } }) => onChange(e.target.value) };
  return (
    <div className={className}>
      {field === 'description'
        ? <Textarea {...common} rows={rows} />
        : <Input {...common} type={field === 'contactPhone' ? 'tel' : 'text'} inputMode={field === 'contactEmail' ? 'email' : field === 'contactPhone' ? 'tel' : undefined} autoComplete={field === 'contactPhone' ? 'tel' : field === 'contactEmail' ? 'email' : 'off'} />}
      <div className="flex items-start justify-between gap-3 mt-1">
        <p className="text-[12px] text-slate m-0 min-w-0">{hint ?? ''}</p>
        {max !== null && (
          <p aria-live="polite" className={clsx('text-[12px] m-0 shrink-0 tabular-nums', len > max && error ? 'text-error' : 'text-slate')}>{len}/{max}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Store logo / cover picker. Rules are shown before picking; the file is checked in the browser (type, size,
 * dimensions) and again by the server. Preview, Replace, Remove, upload progress, error text and a success toast.
 */
export function StoreImageField({ kind, value, onChange, label }: {
  kind: StoreImageKind;
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const rule = STORE_IMAGE_RULES[kind];
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const uploading = progress !== null;
  const name = label ?? (kind === 'logo' ? 'Logo' : 'Cover image');

  const pick = async (file?: File | null) => {
    if (!file) return;
    setError('');
    const problem = await checkStoreImage(file, kind);
    if (problem) { setError(problem); return; }
    setProgress(0);
    try {
      const res = await apiUploadPublicFile(file, setProgress, rule.purpose);
      onChange(res.data.url);
      toast.success(`${name} uploaded. Save to keep it.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Try again.');
    } finally {
      setProgress(null);
    }
  };

  const box = kind === 'logo' ? 'size-[96px] rounded-2xl' : 'w-full aspect-[4/1] min-h-[84px] rounded-xl';
  return (
    <div>
      <p className="text-[12px] font-medium text-charcoal mb-0.5">{name}</p>
      <p className="text-[12px] text-slate mb-1.5">{rule.hint}</p>
      <div className={clsx('relative overflow-hidden border-2 border-dashed border-bone bg-cream flex items-center justify-center', box, error && 'border-error')}>
        {value && <img src={value} alt={`${name} preview`} className="absolute inset-0 size-full object-cover" />}
        {!value && !uploading && <ImagePlus size={20} className="text-brand-orange" aria-hidden="true" />}
        {uploading && (
          <div className="absolute inset-0 bg-white/75 flex flex-col items-center justify-center gap-1.5 px-3" role="status" aria-label={`Uploading ${name}`}>
            <Loader2 size={18} className="text-brand-orange animate-spin" aria-hidden="true" />
            <div className="w-full max-w-[160px] h-1.5 rounded-full bg-bone overflow-hidden"><div className="h-full bg-brand-orange transition-all" style={{ width: `${progress}%` }} /></div>
            <span className="text-[12px] text-charcoal tabular-nums">{progress}%</span>
          </div>
        )}
      </div>
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1.5">
        <button type="button" disabled={uploading} onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-royal bg-transparent border-0 cursor-pointer min-h-[28px] disabled:opacity-50 disabled:cursor-not-allowed">
          {value ? <RefreshCw size={13} aria-hidden="true" /> : <ImagePlus size={13} aria-hidden="true" />}{value ? 'Replace' : 'Choose image'}
        </button>
        {value && !uploading && (
          <button type="button" onClick={() => { setError(''); onChange(''); }}
            className="inline-flex items-center gap-1 text-[13px] text-slate hover:text-error bg-transparent border-0 cursor-pointer min-h-[28px]">
            <Trash2 size={13} aria-hidden="true" /> Remove
          </button>
        )}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label={`Choose ${name.toLowerCase()} file`}
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; void pick(f); }} />
      </div>
      {error && <p role="alert" className="text-[12px] text-error mt-1">{error}</p>}
    </div>
  );
}
