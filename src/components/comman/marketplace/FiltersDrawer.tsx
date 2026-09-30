import { useEffect, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Check, SlidersHorizontal, Star, X } from 'lucide-react';
import type { CategoryNode } from '@/api/services/categories';

/** Sentinel for "no upper price limit". */
export const PRICE_NO_MAX = 1_000_000_000;

export interface MarketplaceFilters {
  priceRange: [number, number];
  type: string[];
  minRating: number | null;
  onSale: boolean;
}

export const EMPTY_FILTERS: MarketplaceFilters = { priceRange: [0, PRICE_NO_MAX], type: [], minRating: null, onSale: false };

const ITEM_TYPES = ['Physical', 'Digital', 'Educational'];

// Preset buckets in the marketplace's selling currency (PKR).
const PRICE_BUCKETS: { label: string; range: [number, number] }[] = [
  { label: 'Under Rs 500',        range: [0, 500] },
  { label: 'Rs 500 to Rs 1,000',  range: [500, 1000] },
  { label: 'Rs 1,000 to Rs 2,500', range: [1000, 2500] },
  { label: 'Over Rs 2,500',       range: [2500, PRICE_NO_MAX] },
];

const sameRange = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];

/** "Filters" pill that opens the drawer — shows how many filters are on. */
export function FiltersButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="inline-flex items-center gap-2 rounded-full bg-[#eef1f3] hover:bg-[#e3e8ec] px-5 py-[10px] text-[15px] font-semibold text-carbon border-none cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
    >
      <SlidersHorizontal size={17} strokeWidth={2.2} />
      Filters
      {count > 0 && (
        <span className="min-w-[20px] h-[20px] rounded-full bg-brand-orange text-white text-[11px] font-bold flex items-center justify-center px-[5px] leading-none">
          {count}
        </span>
      )}
    </button>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="border-0 p-0 m-0 mb-7">
      <legend className="text-[17px] font-bold text-carbon mb-2 p-0">{title}</legend>
      {hint && <p className="text-[14px] text-slate -mt-1 mb-3">{hint}</p>}
      <div className="flex flex-col gap-[2px]">{children}</div>
    </fieldset>
  );
}

export function RadioRow({ name, label, checked, onChange, trailing }: {
  name: string; label: ReactNode; checked: boolean; onChange: () => void; trailing?: ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 py-[7px] cursor-pointer text-[16px] text-carbon">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className={clsx(
          'size-[26px] shrink-0 rounded-full border-2 flex items-center justify-center transition-colors',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-orange',
          checked ? 'border-carbon' : 'border-[#8a959d]',
        )}
      >
        {checked && <span className="size-[12px] rounded-full bg-carbon" />}
      </span>
      <span className="flex-1">{label}</span>
      {trailing}
    </label>
  );
}

export function CheckRow({ label, checked, onChange }: { label: ReactNode; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-3 py-[7px] cursor-pointer text-[16px] text-carbon">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className={clsx(
          'size-[26px] shrink-0 rounded-[4px] border-2 flex items-center justify-center transition-colors',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-orange',
          checked ? 'bg-carbon border-carbon' : 'border-[#8a959d] bg-white',
        )}
      >
        {checked && <Check size={16} strokeWidth={3} className="text-white" />}
      </span>
      <span className="flex-1">{label}</span>
    </label>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={15} className={i <= n ? 'text-brand-gold fill-brand-gold' : 'text-bone fill-bone'} />
      ))}
      <span className="ml-1.5">&amp; up</span>
    </span>
  );
}

export function FiltersDrawer({
  open, onClose, filters, onChange, onClear, total,
  categories = [], selectedCategory = '', onCategoryChange = () => {},
  children, extraActiveCount = 0,
}: {
  open: boolean;
  onClose: () => void;
  filters: MarketplaceFilters;
  onChange: (next: MarketplaceFilters) => void;
  onClear: () => void;
  total: number;
  categories?: CategoryNode[];
  selectedCategory?: string;
  onCategoryChange?: (id: string) => void;
  /** Page-specific sections rendered above the shared ones. */
  children?: ReactNode;
  /** How many of those page-specific filters are on (enables "Clear all"). */
  extraActiveCount?: number;
}) {
  const bucketMatch = PRICE_BUCKETS.find(b => sameRange(b.range, filters.priceRange));
  const anyPrice = sameRange(filters.priceRange, EMPTY_FILTERS.priceRange);
  const [customOpen, setCustomOpen] = useState(!anyPrice && !bucketMatch);
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');

  // Keep the custom inputs in step with a range applied elsewhere (URL, chip removal).
  useEffect(() => {
    const isCustom = !anyPrice && !bucketMatch;
    setCustomOpen(isCustom);
    setLow(isCustom && filters.priceRange[0] > 0 ? String(filters.priceRange[0]) : '');
    setHigh(isCustom && filters.priceRange[1] < PRICE_NO_MAX ? String(filters.priceRange[1]) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.priceRange[0], filters.priceRange[1]]);

  // Esc closes; body behind stays put.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const setType = (t: string | null) => onChange({ ...filters, type: t ? [t] : [] });
  const selectedType = filters.type.length === 1 ? filters.type[0] : null;
  const applyCustom = () => {
    const lo = Math.max(0, Number(low) || 0);
    const hi = Number(high) > 0 ? Number(high) : PRICE_NO_MAX;
    onChange({ ...filters, priceRange: lo <= hi ? [lo, hi] : [hi, lo] });
  };

  const activeCount = (anyPrice ? 0 : 1) + filters.type.length + (filters.minRating ? 1 : 0) + (filters.onSale ? 1 : 0) + (selectedCategory ? 1 : 0) + extraActiveCount;

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-[59] bg-[#0c1b29]/60 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        aria-hidden={!open}
        className={clsx(
          'fixed top-0 left-0 h-full w-[min(510px,100vw)] z-[60] bg-white shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header — title + close button inside the panel. */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-bone px-7 sm:px-10 py-4">
          <h2 className="flex items-center gap-2 text-[19px] font-bold text-carbon m-0">
            <SlidersHorizontal size={18} strokeWidth={2.2} /> Filters
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="size-10 -mr-2 flex items-center justify-center rounded-full bg-transparent text-carbon border-none cursor-pointer hover:bg-[#eef1f3] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
          >
            <X size={24} strokeWidth={2.2} />
          </button>
        </div>

        <div className="brand-scrollbar flex-1 overflow-y-auto overscroll-contain px-7 sm:px-10 pt-6 pb-6">
          {children}

          <Section title="Special offers">
            <CheckRow label="On sale" checked={filters.onSale} onChange={() => onChange({ ...filters, onSale: !filters.onSale })} />
          </Section>

          <Section title="Item type">
            <RadioRow name="f-type" label="All items" checked={!selectedType} onChange={() => setType(null)} />
            {ITEM_TYPES.map(t => (
              <RadioRow key={t} name="f-type" label={t} checked={selectedType === t} onChange={() => setType(t)} />
            ))}
          </Section>

          <Section title="Price (Rs)" hint="Before delivery and other fees">
            <RadioRow
              name="f-price" label="Any price" checked={anyPrice && !customOpen}
              onChange={() => { setCustomOpen(false); onChange({ ...filters, priceRange: EMPTY_FILTERS.priceRange }); }}
            />
            {PRICE_BUCKETS.map(b => (
              <RadioRow
                key={b.label} name="f-price" label={b.label} checked={!customOpen && !!bucketMatch && sameRange(bucketMatch.range, b.range)}
                onChange={() => { setCustomOpen(false); onChange({ ...filters, priceRange: b.range }); }}
              />
            ))}
            <RadioRow name="f-price" label="Custom" checked={customOpen} onChange={() => setCustomOpen(true)} />
            {customOpen && (
              <form
                onSubmit={e => { e.preventDefault(); applyCustom(); }}
                className="flex items-center gap-3 pl-[38px] pt-2"
              >
                <input
                  type="number" min={0} inputMode="numeric" placeholder="Low" aria-label="Minimum price"
                  value={low} onChange={e => setLow(e.target.value)}
                  className="w-0 flex-1 min-w-0 rounded-lg border border-[#8a959d] px-4 py-3 text-[16px] text-carbon outline-none focus:border-carbon"
                />
                <span className="text-[16px] text-slate">to</span>
                <input
                  type="number" min={0} inputMode="numeric" placeholder="High" aria-label="Maximum price"
                  value={high} onChange={e => setHigh(e.target.value)}
                  className="w-0 flex-1 min-w-0 rounded-lg border border-[#8a959d] px-4 py-3 text-[16px] text-carbon outline-none focus:border-carbon"
                />
                <button
                  type="submit" aria-label="Apply price range"
                  className="size-12 shrink-0 rounded-full bg-[#eef1f3] hover:bg-[#e3e8ec] flex items-center justify-center border-none cursor-pointer"
                >
                  <Check size={20} strokeWidth={2.5} className="text-carbon" />
                </button>
              </form>
            )}
          </Section>

          <Section title="Customer rating">
            <RadioRow name="f-rating" label="Any rating" checked={!filters.minRating} onChange={() => onChange({ ...filters, minRating: null })} />
            {[4, 3].map(n => (
              <RadioRow key={n} name="f-rating" label={<Stars n={n} />} checked={filters.minRating === n} onChange={() => onChange({ ...filters, minRating: n })} />
            ))}
          </Section>

          {categories.length > 0 && (
            <Section title="Category">
              <RadioRow name="f-cat" label="All categories" checked={!selectedCategory} onChange={() => onCategoryChange('')} />
              {categories.map(c => (
                <RadioRow
                  key={c._id} name="f-cat" label={c.name} checked={selectedCategory === c._id}
                  onChange={() => onCategoryChange(c._id)}
                  trailing={typeof c.productCount === 'number' ? <span className="text-[14px] text-slate">{c.productCount}</span> : undefined}
                />
              ))}
            </Section>
          )}
        </div>

        <div className="shrink-0 border-t border-bone px-7 sm:px-10 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onClear}
            disabled={activeCount === 0}
            className="text-[15px] font-semibold text-carbon bg-transparent border-none px-2 py-3 cursor-pointer underline underline-offset-4 disabled:opacity-40 disabled:no-underline disabled:cursor-default"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-carbon hover:bg-charcoal text-white text-[15px] font-bold py-[13px] border-none cursor-pointer transition-colors"
          >
            Show {total.toLocaleString()} {total === 1 ? 'result' : 'results'}
          </button>
        </div>
      </div>
    </>
  );
}
