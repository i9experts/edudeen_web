import { useState } from 'react';
import { Modal, Button, Input } from '@/components/comman/ui';
import { apiBulkAdjustStock, type InventoryProduct, type StockAdjustMode, type StockAdjustResult } from '@/api/services/product';
import { useBusyAction } from '@/hooks/useBusyAction';

export const MAX_STOCK = 100_000;

/** Same rule as the inline stock cell: physical, one variant, counted (not unlimited). */
export function stockEditable(p: InventoryProduct): boolean {
  return p.type !== 'digital' && typeof p.stock === 'number' && !!p.defaultVariantId && (p.variantCount ?? 1) === 1;
}

/** Why a selected product will be skipped by a stock action (client-side preview of the server rule). */
export function stockSkipReason(p: InventoryProduct): string | null {
  if (p.type === 'digital') return 'digital';
  if (typeof p.stock !== 'number') return 'unlimited stock';
  if ((p.variantCount ?? 1) > 1) return 'several variants';
  if (!p.defaultVariantId) return 'no stock record';
  return null;
}

const CODE_LABEL: Record<string, string> = {
  digital: 'digital', unlimited: 'unlimited stock', variants: 'several variants',
  range: 'out of range', unchanged: 'already that amount', changed: 'changed meanwhile',
};

/** "8 updated, 2 skipped (digital, unlimited stock)" */
export function summariseStockResult(r: StockAdjustResult): string {
  const parts = [`${r.updated.length} updated`];
  if (r.skipped.length) {
    const why = [...new Set(r.skipped.map(s => CODE_LABEL[s.code] ?? s.code))];
    parts.push(`${r.skipped.length} skipped (${why.join(', ')})`);
  }
  return parts.join(', ');
}

const MODES: { value: StockAdjustMode; label: string }[] = [
  { value: 'set', label: 'Set to' },
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
];

interface Props {
  storeId: string;
  rows: InventoryProduct[];
  initialMode?: StockAdjustMode;
  onClose: () => void;
  onDone: (result: StockAdjustResult) => void;
}

/** Set / add / subtract stock for the selected products. The button states the exact count (that is the confirmation). */
export function InventoryBulkStockModal({ storeId, rows, initialMode = 'set', onClose, onDone }: Props) {
  const [mode, setMode] = useState<StockAdjustMode>(initialMode);
  const [text, setText] = useState('');
  const { run, busy, error, setError } = useBusyAction();

  const eligible = rows.filter(p => stockSkipReason(p) === null);
  const skipped = rows.filter(p => stockSkipReason(p) !== null);
  const skipNote = [...new Set(skipped.map(p => stockSkipReason(p)))].join(', ');
  const valid = /^\d{1,6}$/.test(text.trim()) && Number(text.trim()) <= MAX_STOCK;

  const apply = async () => {
    if (!valid || eligible.length === 0) { setError(`Enter a whole number from 0 to ${MAX_STOCK.toLocaleString()}.`); return; }
    const r = await run(() => apiBulkAdjustStock(storeId, rows.map(p => p.productId), mode, Number(text.trim())));
    if (r) onDone(r.data);
  };

  return (
    <Modal
      mobileSheet
      title={`Change stock for ${rows.length} product${rows.length === 1 ? '' : 's'}`}
      onClose={() => { if (!busy) onClose(); }}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={apply} loading={busy} disabled={busy || !valid || eligible.length === 0}>
            {`Update ${eligible.length} product${eligible.length === 1 ? '' : 's'}`}
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="How to change stock" className="flex gap-2 mb-3">
        {MODES.map(m => (
          <button
            key={m.value} type="button" role="radio" aria-checked={mode === m.value}
            onClick={() => { setMode(m.value); setError(''); }}
            className={`flex-1 min-h-[44px] rounded-lg border text-[13px] font-semibold cursor-pointer ${mode === m.value ? 'border-brand-orange bg-brand-pale-orange/60 text-carbon' : 'border-bone bg-white text-slate hover:bg-cream'}`}
          >{m.label}</button>
        ))}
      </div>
      <Input
        label="Units"
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_STOCK}
        step={1}
        value={text}
        onChange={e => { setText(e.target.value); setError(''); }}
        placeholder="e.g. 20"
        autoFocus
      />
      <p className="text-[12px] text-slate mt-2 mb-0">
        Whole numbers only. Stock never goes below 0 or above {MAX_STOCK.toLocaleString()}; a product that would is skipped, not changed.
      </p>
      {skipped.length > 0 && (
        <p role="note" className="text-[12px] text-graphite bg-cream border border-bone rounded-lg px-3 py-2 mt-3 mb-0">
          {skipped.length} selected product{skipped.length === 1 ? ' has' : 's have'} no stock to change and will be skipped ({skipNote}).
        </p>
      )}
      {eligible.length === 0 && (
        <p role="alert" className="text-[12px] text-error mt-3 mb-0">None of the selected products can have their stock changed here.</p>
      )}
      {error && <p role="alert" className="text-[12px] text-error mt-3 mb-0">{error}</p>}
    </Modal>
  );
}
