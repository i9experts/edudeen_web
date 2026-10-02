import { clsx } from 'clsx';
import { Plus, Trash2 } from 'lucide-react';
import { FileUpload, type PrivateUploadData } from '@/components/comman/ui';
import { CURRICULA, LICENSE_LABEL } from '@/constants/learning';

// Seller product-form fields that make a listing findable by teachers and
// parents: exam board, age range, a free sample, extra files and
// classroom/school licenses. Shared by Add Product and Edit Product.

const inp = 'w-full px-3 py-[9px] text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10';
const lbl = 'block text-[12.5px] font-semibold text-charcoal mb-1.5';

export interface LearningValue { curricula: string[]; ageMin: string; ageMax: string }
export const EMPTY_LEARNING: LearningValue = { curricula: [], ageMin: '', ageMax: '' };

export function learningPayload(v: LearningValue) {
  return {
    curricula: v.curricula,
    ageMin: v.ageMin === '' ? null : Number(v.ageMin),
    ageMax: v.ageMax === '' ? null : Number(v.ageMax),
  };
}

/** Problem with the age range, or null. */
export function learningError(v: LearningValue): string | null {
  const min = v.ageMin === '' ? null : Number(v.ageMin);
  const max = v.ageMax === '' ? null : Number(v.ageMax);
  if ((min != null && (!Number.isInteger(min) || min < 0 || min > 99)) || (max != null && (!Number.isInteger(max) || max < 0 || max > 99))) {
    return 'Ages must be whole numbers from 0 to 99.';
  }
  if (min != null && max != null && min > max) return 'The youngest age can’t be more than the oldest.';
  return null;
}

export function LearningFields({ value, onChange }: { value: LearningValue; onChange: (v: LearningValue) => void }) {
  const toggle = (c: string) => onChange({
    ...value,
    curricula: value.curricula.includes(c) ? value.curricula.filter(x => x !== c) : [...value.curricula, c],
  });
  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className={lbl}>Exam board / syllabus</span>
        <p className="text-[12px] text-slate -mt-1 mb-2">Pick every board this follows. Parents filter by this.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Exam boards">
          {CURRICULA.map(c => {
            const on = value.curricula.includes(c.value);
            return (
              <button
                key={c.value} type="button" aria-pressed={on} onClick={() => toggle(c.value)}
                className={clsx('px-3 py-[7px] rounded-full text-[12.5px] border cursor-pointer transition-colors', on ? 'border-brand-orange bg-brand-pale-orange text-brand-orange font-bold' : 'border-bone bg-white text-graphite hover:bg-cream')}
              >{c.label}</button>
            );
          })}
        </div>
      </div>
      <div>
        <span className={lbl}>Suitable ages</span>
        <div className="flex items-center gap-2 max-w-[320px]">
          <input id="lf-age-min" aria-label="Youngest age" type="number" min={0} max={99} inputMode="numeric" placeholder="From" value={value.ageMin} onChange={e => onChange({ ...value, ageMin: e.target.value })} className={inp} />
          <span className="text-slate text-[13px]">to</span>
          <input id="lf-age-max" aria-label="Oldest age" type="number" min={0} max={99} inputMode="numeric" placeholder="To" value={value.ageMax} onChange={e => onChange({ ...value, ageMax: e.target.value })} className={inp} />
          <span className="text-slate text-[13px] shrink-0">years</span>
        </div>
        <p className="text-[12px] text-slate mt-1.5">Leave one side empty for an open range, e.g. “from 10”.</p>
      </div>
    </div>
  );
}

// ── Extra licenses ───────────────────────────────────────────────────────────

export interface LicenseTierValue { license: 'single_classroom' | 'school' | 'commercial'; price: string; enabled: boolean }
export const EMPTY_TIERS: LicenseTierValue[] = [
  { license: 'single_classroom', price: '', enabled: false },
  { license: 'school', price: '', enabled: false },
];

export function tiersPayload(tiers: LicenseTierValue[]) {
  return tiers.filter(t => t.enabled && t.price !== '').map(t => ({ license: t.license, price: Number(t.price) }));
}

export function tiersError(tiers: LicenseTierValue[]): string | null {
  const bad = tiers.find(t => t.enabled && (t.price === '' || !(Number(t.price) >= 0)));
  return bad ? `Enter a price for the ${LICENSE_LABEL[bad.license].toLowerCase()} license.` : null;
}

export function LicenseTiersField({ baseLicense, tiers, onChange, currencySymbol }: {
  baseLicense: string; tiers: LicenseTierValue[]; onChange: (t: LicenseTierValue[]) => void; currencySymbol: string;
}) {
  const visible = tiers.filter(t => t.license !== baseLicense);
  const set = (license: string, patch: Partial<LicenseTierValue>) => onChange(tiers.map(t => (t.license === license ? { ...t, ...patch } : t)));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-slate">
        Your main price is for <b>{LICENSE_LABEL[baseLicense] ?? baseLicense}</b>. Schools and teachers can also buy a wider license at its own price.
      </p>
      {visible.map(t => (
        <div key={t.license} className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 min-w-[180px] cursor-pointer">
            <input
              type="checkbox" id={`lt-on-${t.license}`} checked={t.enabled}
              onChange={e => set(t.license, { enabled: e.target.checked })}
              className="w-4 h-4 accent-brand-orange"
            />
            <span className="text-[13px] font-semibold text-carbon">Offer {LICENSE_LABEL[t.license].toLowerCase()}</span>
          </label>
          {t.enabled && (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-slate">{currencySymbol}</span>
              <input
                id={`lt-${t.license}`} aria-label={`${LICENSE_LABEL[t.license]} price`} type="number" min={0} inputMode="decimal"
                value={t.price} onChange={e => set(t.license, { price: e.target.value })} placeholder="Price" className={clsx(inp, 'w-[140px]')}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Files buyers get (several) and the free sample ──────────────────────────

export function DeliverableFilesField({ files, onChange }: { files: PrivateUploadData[]; onChange: (f: PrivateUploadData[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {files.map((f, i) => (
        <div key={f.publicId} className="flex items-center gap-3 rounded-lg border border-bone px-3 py-2">
          <span className="flex-1 min-w-0 truncate text-[13px] text-carbon">{f.fileName}</span>
          <span className="text-[12px] text-slate shrink-0">{(f.fileSize / 1024 / 1024).toFixed(1)} MB</span>
          <button type="button" aria-label={`Remove ${f.fileName}`} onClick={() => onChange(files.filter((_, idx) => idx !== i))} className="size-8 rounded-lg flex items-center justify-center text-slate hover:text-error hover:bg-error-bg border-none bg-transparent cursor-pointer">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      {files.length < 10 && (
        <FileUpload
          key={files.length}
          value={null}
          onChange={v => { if (v) onChange([...files, v]); }}
          label={files.length ? 'Add another file' : 'Click to upload the file buyers receive'}
        />
      )}
      {files.length > 0 && <p className="text-[12px] text-slate inline-flex items-center gap-1"><Plus size={12} /> Up to 10 files — e.g. worksheet, answer key, slides.</p>}
    </div>
  );
}

export function SampleFileField({ value, onChange }: { value: PrivateUploadData | null; onChange: (v: PrivateUploadData | null) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] text-slate">A few pages or one worksheet anyone can download before buying. Listings with a sample sell better.</p>
      <FileUpload value={value} onChange={onChange} label="Upload a free sample (optional)" />
    </div>
  );
}
