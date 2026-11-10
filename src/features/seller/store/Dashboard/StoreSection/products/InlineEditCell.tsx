import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { Modal, Button } from '@/components/comman/ui';
import { validatePrices } from './priceRules';

const MAX_STOCK = 100_000;

/** Pure check for the stock box: whole number 0..100000 (no empty, NaN, negative or decimals). null = fine. */
export function stockInputError(raw: string): string | null {
  const t = raw.trim();
  if (!t) return 'Enter a stock number';
  const n = Number(t);
  if (!Number.isFinite(n)) return 'Stock must be a number';
  if (n < 0) return "Stock can't be negative";
  if (!Number.isInteger(n)) return 'Stock must be a whole number';
  if (n > MAX_STOCK) return `Stock can't be more than ${MAX_STOCK.toLocaleString('en-US')}`;
  return null;
}

interface Props {
  kind: 'price' | 'stock';
  /** Current value; price 0 = free. */
  value: number;
  /** Text shown when not editing (already formatted). */
  display: ReactNode;
  /** false = read-only cell; `lockedHint` says why and `onLockedClick` (usually: open Edit) is called on click. */
  editable: boolean;
  lockedHint?: string;
  onLockedClick?: () => void;
  currency?: string | null;
  /** Resolves when saved; throws with a seller-facing message otherwise. */
  onSave: (next: number) => Promise<void>;
  label: string;
}

const isPhone = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;

/**
 * Click-to-edit cell. Enter saves, Esc / clicking away cancels. On phones the box opens in a bottom sheet.
 * Only for single-variant products - the caller decides `editable`. The shared wheel -> blur handler in main.tsx
 * keeps scrolling from changing the number.
 */
export function InlineEditCell({ kind, value, display, editable, lockedHint, onLockedClick, currency, onSave, label }: Props) {
  const [open, setOpen] = useState<'inline' | 'sheet' | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open === 'inline') { inputRef.current?.focus(); inputRef.current?.select(); } }, [open]);

  const start = () => {
    setText(String(value));
    setError('');
    setOpen(isPhone() ? 'sheet' : 'inline');
  };
  const cancel = () => { if (!savingRef.current) { setOpen(null); setError(''); } };

  const validate = (): number | null => {
    if (kind === 'stock') {
      const e = stockInputError(text);
      if (e) { setError(e); return null; }
      return Number(text);
    }
    const c = validatePrices({ price: text, currency, free: value === 0 });
    if (c.price) { setError(c.price); return null; }
    return Number(text);
  };

  const save = async () => {
    if (savingRef.current) return;
    const n = validate();
    if (n === null) return;
    if (n === value) { setOpen(null); return; }
    savingRef.current = true; setSaving(true); setError('');
    try {
      await onSave(n);
      setOpen(null);
    } catch (err: unknown) {
      // Revert: close the box (the cell shows the old value again) - the caller already toasts the message.
      setOpen(null);
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally { savingRef.current = false; setSaving(false); }
  };

  if (!editable) {
    return onLockedClick ? (
      <button type="button" title={lockedHint} onClick={onLockedClick} className="bg-transparent border-0 p-0 cursor-pointer text-inherit font-inherit text-end hover:underline">{display}</button>
    ) : <span title={lockedHint}>{display}</span>;
  }

  const input = (
    <input
      ref={inputRef}
      type="number"
      inputMode={kind === 'stock' ? 'numeric' : 'decimal'}
      min={0}
      step={kind === 'stock' ? 1 : currency === 'PKR' ? 1 : 'any'}
      aria-label={label}
      aria-invalid={!!error}
      value={text}
      disabled={saving}
      onChange={e => { setText(e.target.value); setError(''); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); void save(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      }}
      onBlur={() => { if (open === 'inline') cancel(); }}
      className={`w-[104px] px-2 py-1 rounded-md text-[13px] border bg-white text-charcoal outline-none text-end ${error ? 'border-error' : 'border-brand-orange'}`}
    />
  );

  return (
    <>
      {open === 'inline' ? (
        <div className="inline-flex flex-col items-end gap-0.5">
          <span className="inline-flex items-center gap-1.5">
            {saving && <Loader2 size={13} className="animate-spin text-slate" aria-label="Saving" />}
            {input}
          </span>
          {error && <span role="alert" className="text-[11.5px] text-error max-w-[200px] text-end leading-snug">{error}</span>}
          {!error && <span className="text-[11px] text-slate">Enter = save · Esc = cancel</span>}
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          title={`Click to change ${label.toLowerCase()}`}
          aria-label={`Change ${label.toLowerCase()}`}
          className="group inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer text-inherit font-inherit rounded hover:bg-cream/70"
        >
          {display}
          <Pencil size={11} className="text-slate opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-60 shrink-0" aria-hidden />
        </button>
      )}
      {open === 'sheet' && (
        <Modal
          title={`Change ${label.toLowerCase()}`}
          mobileSheet
          onClose={cancel}
          footer={<><Button variant="ghost" onClick={cancel} disabled={saving}>Cancel</Button><Button onClick={() => void save()} loading={saving}>Save</Button></>}
        >
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-charcoal" htmlFor="inline-edit-sheet">{label}</label>
            <input
              id="inline-edit-sheet"
              type="number"
              inputMode={kind === 'stock' ? 'numeric' : 'decimal'}
              min={0}
              step={kind === 'stock' ? 1 : currency === 'PKR' ? 1 : 'any'}
              autoFocus
              value={text}
              disabled={saving}
              onChange={e => { setText(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void save(); } }}
              className={`w-full px-3 py-[10px] rounded-lg text-[15px] border bg-white text-charcoal outline-none ${error ? 'border-error' : 'border-bone'}`}
            />
            {error && <p role="alert" className="text-[12px] text-error m-0">{error}</p>}
          </div>
        </Modal>
      )}
    </>
  );
}
