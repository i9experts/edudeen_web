import { useState } from 'react';
import { Modal, Button } from '@/components/comman/ui';
import { apiBulkPrice, type BulkPriceItem } from '@/api/services/product';
import { formatPrice } from '@/utils/formatPrice';

type Mode = 'set' | 'up' | 'down';

interface Props {
  ids: string[];
  currency?: string | null;
  onClose: () => void;
  /** Called after a successful apply (parent refreshes + toasts). */
  onApplied: (message: string) => void;
}

/** Change price for the selected products: set / +% / -%, with an old -> new preview before anything is saved. */
export function BulkPriceModal({ ids, currency, onClose, onApplied }: Props) {
  const [mode, setMode] = useState<Mode>('set');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ items: BulkPriceItem[]; canApply: boolean } | null>(null);

  const body = () => {
    const n = Number(text);
    if (!text.trim() || !Number.isFinite(n)) { setError('Enter a number.'); return null; }
    if (mode === 'set' && n < 0) { setError("Price can't be negative."); return null; }
    if (mode !== 'set' && !(n > 0)) { setError('Enter a percent above 0.'); return null; }
    if (mode === 'down' && n > 90) { setError('You can lower prices by at most 90%.'); return null; }
    if (mode === 'up' && n > 300) { setError('You can raise prices by at most 300%.'); return null; }
    return { ids, mode: mode === 'set' ? 'set' as const : 'percent' as const, value: mode === 'down' ? -n : n };
  };

  const runPreview = async () => {
    const b = body();
    if (!b) return;
    setBusy(true); setError('');
    try {
      const r = await apiBulkPrice({ ...b, dryRun: true });
      setPreview({ items: r.data.items, canApply: !!r.data.canApply });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Could not preview.'); }
    finally { setBusy(false); }
  };

  const apply = async () => {
    const b = body();
    if (!b || busy) return;
    setBusy(true); setError('');
    try {
      const r = await apiBulkPrice(b);
      onApplied(r.message || 'Prices updated.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not change prices. Nothing was changed.');
      setPreview(null);
    } finally { setBusy(false); }
  };

  const fmt = (n: number | null) => (n === null ? '—' : n === 0 ? 'Free' : formatPrice(n, currency));
  const failed = preview?.items.filter(i => !i.ok).length ?? 0;
  const changed = preview?.items.filter(i => i.ok && !i.unchanged).length ?? 0;

  return (
    <Modal
      title={`Change price - ${ids.length} product${ids.length !== 1 ? 's' : ''}`}
      mobileSheet
      width={560}
      onClose={() => { if (!busy) onClose(); }}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          {preview
            ? <>
                <Button variant="outline" onClick={() => setPreview(null)} disabled={busy}>Back</Button>
                <Button onClick={apply} loading={busy} disabled={!preview.canApply}>Apply to {changed} product{changed !== 1 ? 's' : ''}</Button>
              </>
            : <Button onClick={runPreview} loading={busy}>Preview</Button>}
        </>
      }
    >
      {!preview ? (
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-slate m-0">Works on products with a single price. The change goes live at once for products that are already live. Nothing is saved until you check the preview and apply.</p>
          <div role="radiogroup" aria-label="How to change" className="flex flex-wrap gap-2">
            {([['set', 'Set price to'], ['up', 'Increase by %'], ['down', 'Decrease by %']] as [Mode, string][]).map(([k, label]) => (
              <button
                key={k} type="button" role="radio" aria-checked={mode === k}
                onClick={() => { setMode(k); setError(''); }}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold cursor-pointer ${mode === k ? 'bg-carbon text-white border-carbon' : 'bg-white text-charcoal border-bone hover:bg-cream'}`}
              >{label}</button>
            ))}
          </div>
          <label htmlFor="bulk-price-value" className="text-[12px] font-semibold text-charcoal">{mode === 'set' ? `New price${currency ? ` (${currency})` : ''}` : 'Percent'}</label>
          <input
            id="bulk-price-value" type="number" min={0} step="any" inputMode="decimal" value={text}
            onChange={e => { setText(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void runPreview(); } }}
            placeholder={mode === 'set' ? 'e.g. 500' : 'e.g. 10'}
            className="w-[180px] px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-white text-charcoal outline-none"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {failed > 0 && <p role="alert" className="text-[13px] text-error m-0">{failed} product{failed !== 1 ? 's' : ''} can't take this change, so nothing can be applied. Deselect them or change the value.</p>}
          {failed === 0 && changed === 0 && <p className="text-[13px] text-slate m-0">Nothing would change.</p>}
          <ul className="list-none p-0 m-0 flex flex-col gap-2 max-h-[320px] overflow-auto">
            {preview.items.map(i => (
              <li key={i.id} className={`text-[12.5px] rounded-lg border px-3 py-2 ${i.ok ? 'border-bone bg-white' : 'border-error/40 bg-error/5'}`}>
                <span className="font-semibold text-charcoal block truncate">{i.name}</span>
                {i.ok
                  ? <span className="text-slate">{i.unchanged ? `${fmt(i.from)} (no change)` : <>{fmt(i.from)} <span aria-hidden>→</span><span className="sr-only"> to </span> <b className="text-charcoal">{fmt(i.to)}</b></>}</span>
                  : <span className="text-error">{i.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p role="alert" className="text-[12px] text-error mt-3 mb-0">{error}</p>}
    </Modal>
  );
}
