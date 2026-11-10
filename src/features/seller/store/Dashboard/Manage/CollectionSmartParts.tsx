import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/comman/ui/Button';
import { CLASS_LEVELS, classIndex } from '@/constants/classLevels';
import {
  apiPreviewCollection, type CollectionPreview, type CollectionRules, type CollectionSort,
} from '@/api/services/collections';

export const SORT_LABELS: Record<CollectionSort, string> = {
  manual: 'Manual (my order / newest)',
  newest: 'Newest first',
  price_asc: 'Price: low to high',
  best_selling: 'Best selling',
  price_desc: 'Price: high to low',
  rating: 'Highest rated',
};

/** The editable (string) form of the smart rules — numbers stay text while typing. */
export interface SmartRulesForm {
  priceMin: string; priceMax: string; createdWithinDays: string; minRating: string;
  hasDiscount: boolean; bestSellersTopN: string; language: string; classFrom: string; classTo: string;
}

export const emptySmart = (r?: Partial<CollectionRules> | null): SmartRulesForm => ({
  priceMin: r?.priceMin != null ? String(r.priceMin) : '',
  priceMax: r?.priceMax != null ? String(r.priceMax) : '',
  createdWithinDays: r?.createdWithinDays != null ? String(r.createdWithinDays) : '',
  minRating: r?.minRating != null ? String(r.minRating) : '',
  hasDiscount: !!r?.hasDiscount,
  bestSellersTopN: r?.bestSellersTopN != null ? String(r.bestSellersTopN) : '',
  language: r?.language ?? '',
  classFrom: r?.classFrom ?? '',
  classTo: r?.classTo ?? '',
});

const toNum = (s: string): number | null => (s.trim() === '' ? null : Number(s));

/** Client-side mirror of the API rule checks (the API still re-checks everything). Returns one message per field. */
export function smartRuleErrors(f: SmartRulesForm): Partial<Record<keyof SmartRulesForm, string>> {
  const e: Partial<Record<keyof SmartRulesForm, string>> = {};
  const min = toNum(f.priceMin); const max = toNum(f.priceMax);
  if (min !== null && (!Number.isFinite(min) || min < 0)) e.priceMin = 'Enter 0 or more';
  if (max !== null && (!Number.isFinite(max) || max < 0)) e.priceMax = 'Enter 0 or more';
  if (!e.priceMin && !e.priceMax && min !== null && max !== null && min > max) e.priceMax = 'Maximum must not be below the minimum';
  const d = toNum(f.createdWithinDays);
  if (d !== null && (!Number.isInteger(d) || d < 1 || d > 365)) e.createdWithinDays = 'Whole number of days, 1 to 365';
  const r = toNum(f.minRating);
  if (r !== null && (!Number.isFinite(r) || r < 1 || r > 5)) e.minRating = 'Between 1 and 5';
  const n = toNum(f.bestSellersTopN);
  if (n !== null && (!Number.isInteger(n) || n < 1 || n > 100)) e.bestSellersTopN = 'Whole number from 1 to 100';
  if (f.classFrom && f.classTo && classIndex(f.classFrom) > classIndex(f.classTo)) e.classTo = '"To" must not be before "From"';
  return e;
}

/** Payload form of the smart rules: empty = null (clears the rule). */
export function smartToPayload(f: SmartRulesForm): Partial<CollectionRules> {
  return {
    priceMin: toNum(f.priceMin), priceMax: toNum(f.priceMax), createdWithinDays: toNum(f.createdWithinDays),
    minRating: toNum(f.minRating), hasDiscount: f.hasDiscount, bestSellersTopN: toNum(f.bestSellersTopN),
    language: f.language || null, classFrom: f.classFrom || null, classTo: f.classTo || null,
  };
}

const inputCls = 'w-full px-3 py-2 text-[13px] border rounded-lg outline-none text-charcoal bg-white focus:ring-2 focus:ring-brand-orange/40 min-w-0';
const lbl = 'text-[12px] font-medium text-charcoal block mb-1.5';

function Num({ id, label, value, onChange, error, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={lbl}>{label}</label>
      <input id={id} inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-err` : undefined}
        className={`${inputCls} ${error ? 'border-error' : 'border-bone'}`} />
      {error && <p id={`${id}-err`} role="alert" className="text-[12px] text-error mt-1">{error}</p>}
    </div>
  );
}

/** "Smart rules" for an automatic collection. Everything is optional and ANDed together. */
export function SmartRulesFields({ value, onChange, errors, currency }: {
  value: SmartRulesForm; onChange: (patch: Partial<SmartRulesForm>) => void;
  errors: Partial<Record<keyof SmartRulesForm, string>>; currency?: string;
}) {
  const classSelect = (id: string, key: 'classFrom' | 'classTo', label: string, error?: string) => (
    <div className="min-w-0">
      <label htmlFor={id} className={lbl}>{label}</label>
      <select id={id} value={value[key]} onChange={e => onChange({ [key]: e.target.value } as Partial<SmartRulesForm>)}
        aria-invalid={!!error || undefined} className={`${inputCls} ${error ? 'border-error' : 'border-bone'}`}>
        <option value="">Any</option>
        {CLASS_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      {error && <p role="alert" className="text-[12px] text-error mt-1">{error}</p>}
    </div>
  );
  return (
    <fieldset className="border border-bone rounded-lg p-3 min-w-0">
      <legend className="px-1 text-[12px] font-semibold text-charcoal">Smart rules (optional)</legend>
      <p className="text-[12px] text-slate mb-3">Products must match every rule you fill in.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Num id="coll-pmin" label={`Lowest price${currency ? ` (${currency})` : ''}`} value={value.priceMin} onChange={v => onChange({ priceMin: v })} error={errors.priceMin} placeholder="e.g. 200" />
        <Num id="coll-pmax" label={`Highest price${currency ? ` (${currency})` : ''}`} value={value.priceMax} onChange={v => onChange({ priceMax: v })} error={errors.priceMax} placeholder="e.g. 1500" />
        <Num id="coll-new" label="Added in the last (days)" value={value.createdWithinDays} onChange={v => onChange({ createdWithinDays: v })} error={errors.createdWithinDays} placeholder="e.g. 30" />
        <Num id="coll-rating" label="Rating at least (1–5)" value={value.minRating} onChange={v => onChange({ minRating: v })} error={errors.minRating} placeholder="e.g. 4" />
        <Num id="coll-top" label="Only my top best sellers (count)" value={value.bestSellersTopN} onChange={v => onChange({ bestSellersTopN: v })} error={errors.bestSellersTopN} placeholder="e.g. 10" />
        <div className="min-w-0">
          <label htmlFor="coll-lang" className={lbl}>Language</label>
          <select id="coll-lang" value={value.language} onChange={e => onChange({ language: e.target.value })} className={`${inputCls} border-bone`}>
            <option value="">Any</option>
            <option value="ur">Urdu</option><option value="en">English</option><option value="ar">Arabic</option><option value="mixed">Mixed</option>
          </select>
        </div>
        {classSelect('coll-cfrom', 'classFrom', 'Class from', errors.classFrom)}
        {classSelect('coll-cto', 'classTo', 'Class to', errors.classTo)}
      </div>
      <label className="mt-3 flex items-center gap-2 text-[13px] text-charcoal cursor-pointer">
        <input type="checkbox" checked={value.hasDiscount} onChange={e => onChange({ hasDiscount: e.target.checked })} className="accent-brand-orange" />
        Only products on discount (compare-at price above the price)
      </label>
    </fieldset>
  );
}

/** Debounced live preview. `body === null` = form invalid, nothing is asked. Stale answers are dropped. */
export function useCollectionPreview(storeId: string, body: Parameters<typeof apiPreviewCollection>[1] | null) {
  const [data, setData] = useState<CollectionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);
  const key = useMemo(() => (body ? JSON.stringify(body) : ''), [body]);
  const seq = useRef(0);

  useEffect(() => {
    if (!key) { setData(null); setLoading(false); setError(''); return; }
    const id = ++seq.current;
    const ctl = new AbortController();
    setLoading(true); setError('');
    const t = window.setTimeout(() => {
      apiPreviewCollection(storeId, JSON.parse(key), ctl.signal)
        .then(res => { if (id === seq.current) setData(res.data); })
        .catch(err => { if (id === seq.current && !ctl.signal.aborted) setError(err instanceof Error && err.message ? err.message : 'Could not load the preview.'); })
        .finally(() => { if (id === seq.current) setLoading(false); });
    }, 500);
    return () => { window.clearTimeout(t); ctl.abort(); };
  }, [storeId, key, nonce]);

  return { data, loading, error, retry: () => setNonce(n => n + 1), enabled: !!key };
}

export function CollectionPreviewPanel({ preview }: { preview: ReturnType<typeof useCollectionPreview> }) {
  const { data, loading, error, retry, enabled } = preview;
  return (
    <div className="rounded-lg border border-bone bg-cream/50 p-3" aria-live="polite">
      <p className="text-[12px] font-semibold text-charcoal mb-2">Preview</p>
      {!enabled ? (
        <p className="text-[12.5px] text-slate">Fix the highlighted fields to see which products match.</p>
      ) : error ? (
        <div role="alert" className="flex items-center gap-3 flex-wrap">
          <span className="text-[12.5px] text-error">{error}</span>
          <Button variant="secondary" size="xs" onClick={retry}>Retry</Button>
        </div>
      ) : !data ? (
        <p className="text-[12.5px] text-slate">{loading ? 'Checking…' : 'Nothing to preview yet.'}</p>
      ) : (
        <>
          <p className={`text-[13px] font-semibold ${data.count === 0 ? 'text-amber-700' : 'text-charcoal'} ${loading ? 'opacity-60' : ''}`}>
            {data.count === 0 ? '0 products match — buyers would see an empty tab' : `${data.count} ${data.count === 1 ? 'product matches' : 'products match'}`}
          </p>
          {data.products.length > 0 && (
            <ul className={`list-none p-0 m-0 mt-2 grid grid-cols-4 sm:grid-cols-8 gap-1.5 ${loading ? 'opacity-60' : ''}`}>
              {data.products.map(p => (
                <li key={p._id} title={p.name} className="aspect-square rounded-md border border-bone bg-white overflow-hidden flex items-center justify-center">
                  {p.image ? <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-cover" /> : <span className="text-[12px] text-slate px-1 text-center line-clamp-2">{p.name}</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
