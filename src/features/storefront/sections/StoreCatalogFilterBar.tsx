import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Select } from '@/components/comman/ui/Input';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import type { StoreCatalogFacets } from '@/api/services/store';
import { useStorefront } from '../StorefrontContext';
import { sheetFilterCount, type CatalogFilters } from '../catalogFilters';

const round2 = (n: number) => Math.round(n * 100) / 100;

interface Props {
  filters: CatalogFilters;
  facets: StoreCatalogFacets | null;
  /** Patch merges into the filters; page goes back to 1 unless the patch sets it. */
  onChange: (patch: Partial<CatalogFilters>) => void;
}

interface FieldValues { cls: string; subject: string; minS: string; maxS: string }

function Fields({ v, set, facets, filters, error, onCommit, compact }: {
  v: FieldValues; set: (p: Partial<FieldValues>) => void; facets: StoreCatalogFacets | null;
  filters: CatalogFilters; error: string | null; onCommit?: (p: Partial<FieldValues>) => void; compact?: boolean;
}) {
  const { currency } = useCurrencyPreference();
  // The selected option stays visible even if the facet list no longer has it (old link).
  const classes = facets?.classes ?? [];
  const subjects = facets?.subjects ?? [];
  const priceHint = facets?.price ? `${Math.floor(facets.price.min)} – ${Math.ceil(facets.price.max)}` : undefined;
  const pick = (p: Partial<FieldValues>) => { set(p); onCommit?.(p); };
  return (
    <>
      {(classes.length > 0 || filters.cls) && (
        <Select aria-label="Class" className={compact ? 'h-9! text-[13px]!' : undefined} value={v.cls} onChange={e => pick({ cls: e.target.value })}>
          <option value="">All classes</option>
          {classes.map(c => <option key={c.value} value={c.value}>{c.label} ({c.count})</option>)}
          {filters.cls && !classes.some(c => c.value === filters.cls) && <option value={filters.cls}>{filters.cls}</option>}
        </Select>
      )}
      {(subjects.length > 0 || filters.subject) && (
        <Select aria-label="Subject" className={compact ? 'h-9! text-[13px]!' : undefined} value={v.subject} onChange={e => pick({ subject: e.target.value })}>
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.count})</option>)}
          {filters.subject && !subjects.some(s => s.id === filters.subject) && <option value={filters.subject}>{filters.subject}</option>}
        </Select>
      )}
      <fieldset className="w-full">
        <legend className={compact ? 'sr-only' : 'block text-[12px] font-medium text-charcoal mb-1.5'}>Price <span translate="no">({currency})</span></legend>
        <div className="flex items-center gap-2">
          <input type="number" inputMode="decimal" min={0} aria-label="Min price" placeholder={priceHint ? `Min ${priceHint.split(' – ')[0]}` : 'Min price'}
            value={v.minS} data-no-live-validate
            onChange={e => set({ minS: e.target.value })} onBlur={() => onCommit?.({})}
            onKeyDown={e => { if (e.key === 'Enter') onCommit?.({}); }}
            className={compact ? 'w-full h-9 px-3 rounded-lg border border-bone bg-white text-[13px]' : 'w-full h-10 px-3 rounded-lg border border-bone bg-white text-[13px]'} />
          <span aria-hidden className="text-slate">–</span>
          <input type="number" inputMode="decimal" min={0} aria-label="Max price" placeholder={priceHint ? `Max ${priceHint.split(' – ')[1]}` : 'Max price'}
            value={v.maxS} data-no-live-validate
            onChange={e => set({ maxS: e.target.value })} onBlur={() => onCommit?.({})}
            onKeyDown={e => { if (e.key === 'Enter') onCommit?.({}); }}
            className={compact ? 'w-full h-9 px-3 rounded-lg border border-bone bg-white text-[13px]' : 'w-full h-10 px-3 rounded-lg border border-bone bg-white text-[13px]'} />
        </div>
        {error && <p role="alert" className="text-[12px] text-error mt-1">{error}</p>}
      </fieldset>
    </>
  );
}

export function StoreCatalogFilterBar({ filters, facets, onChange }: Props) {
  const { store, cfg } = useStorefront();
  const { currency, convertBetween } = useCurrencyPreference();
  const base = store.baseCurrency;

  const toDisplay = (n: number | null) => (n == null ? '' : String(round2(currency === base ? n : convertBetween(n, base, currency))));
  const fromDisplay = (s: string): number | null => {
    if (s.trim() === '') return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) return null;
    return round2(currency === base ? n : convertBetween(n, currency, base));
  };

  const fromFilters = (): FieldValues => ({ cls: filters.cls, subject: filters.subject, minS: toDisplay(filters.min), maxS: toDisplay(filters.max) });
  const [inline, setInline] = useState<FieldValues>(fromFilters);
  const [draft, setDraft] = useState<FieldValues>(fromFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [qInput, setQInput] = useState(filters.q);

  // URL changed from outside (Back, Clear filters, a shared link) → show it.
  useEffect(() => { setInline(fromFilters()); }, [filters.cls, filters.subject, filters.min, filters.max, currency]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setQInput(filters.q); }, [filters.q]);

  // 300 ms debounce for the search box.
  useEffect(() => {
    if (qInput.trim() === filters.q.trim()) return;
    const t = setTimeout(() => onChange({ q: qInput.trim() }), 300);
    return () => clearTimeout(t);
  }, [qInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const priceError = (v: FieldValues) => {
    const a = fromDisplay(v.minS), b = fromDisplay(v.maxS);
    return a != null && b != null && a > b ? 'Min must not be above max' : null;
  };
  const commit = (v: FieldValues) => {
    if (priceError(v)) return;
    onChange({ cls: v.cls, subject: v.subject, min: fromDisplay(v.minS), max: fromDisplay(v.maxS) });
  };
  const inlineErr = priceError(inline);
  const count = sheetFilterCount(filters);

  return (
    <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:gap-2">
      <div className="flex items-center gap-2 md:flex-1 md:min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search size={15} aria-hidden className="absolute start-3 top-1/2 -translate-y-1/2 text-slate pointer-events-none" />
          <input type="search" value={qInput} onChange={e => setQInput(e.target.value)} maxLength={100}
            aria-label="Search this store" placeholder="Search in this store" data-no-live-validate
            className="w-full h-9 ps-9 pe-8 rounded-lg border border-bone bg-white text-[13px]" />
          {qInput && (
            <button type="button" aria-label="Clear search" onClick={() => { setQInput(''); onChange({ q: '' }); }}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-slate bg-transparent border-none cursor-pointer"><X size={14} /></button>
          )}
        </div>
        <button type="button" onClick={() => { setDraft(fromFilters()); setSheetOpen(true); }}
          aria-label={count ? `Filters (${count} applied)` : 'Filters'}
          className="md:hidden relative shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-bone bg-white text-[13px] font-semibold cursor-pointer"
          style={{ color: cfg.textColor }}>
          <SlidersHorizontal size={15} aria-hidden /> Filters
          {count > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[12px] leading-[18px] text-white text-center" style={{ background: cfg.primaryColor }}>{count}</span>}
        </button>
      </div>

      <div className="hidden md:grid md:grid-cols-[150px_170px_210px] gap-2 items-start shrink-0">
        <Fields compact v={inline} set={p => setInline(s => ({ ...s, ...p }))} facets={facets} filters={filters} error={inlineErr}
          onCommit={p => commit({ ...inline, ...p })} />
      </div>

      {sheetOpen && (
        <Modal title="Filters" onClose={() => setSheetOpen(false)} mobileSheet width={420}
          footer={
            <div className="flex gap-2 w-full">
              <Button variant="secondary" className="flex-1" onClick={() => { commit({ cls: '', subject: '', minS: '', maxS: '' }); setSheetOpen(false); }}>Clear filters</Button>
              <Button variant="primary" className="flex-1" disabled={!!priceError(draft)} onClick={() => { commit(draft); setSheetOpen(false); }}>Apply</Button>
            </div>
          }>
          <div className="flex flex-col gap-4">
            <Fields v={draft} set={p => setDraft(s => ({ ...s, ...p }))} facets={facets} filters={filters} error={priceError(draft)} />
          </div>
        </Modal>
      )}
    </div>
  );
}
