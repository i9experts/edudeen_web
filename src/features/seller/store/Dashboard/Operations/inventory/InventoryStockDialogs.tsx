import { useEffect, useState } from 'react';
import { History, RefreshCw } from 'lucide-react';
import { Modal, Button, SkeletonBox, EmptyState } from '@/components/comman/ui';
import {
  apiGetStockHistory, apiSetLowStockThreshold,
  type InventoryProduct, type StockHistoryItem,
} from '@/api/services/product';
import { useBusyAction } from '@/hooks/useBusyAction';

const DEFAULT_LIMIT = 10;

function when(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Last 20 stock changes of one product. Full screen on phones. */
export function StockHistoryDrawer({ storeId, product, onClose }: { storeId: string; product: InventoryProduct; onClose: () => void }) {
  const [items, setItems] = useState<StockHistoryItem[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError('');
    apiGetStockHistory(storeId, product.productId)
      .then(r => { if (!cancelled) setItems(r.data.items ?? []); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load stock history.'); });
    return () => { cancelled = true; };
  }, [storeId, product.productId, attempt]);

  return (
    <Modal title={`Stock history: ${product.name}`} onClose={onClose} width={520} mobileSheet fullHeightMobile>
      {error ? (
        <div role="alert" className="flex items-center gap-3 rounded-[10px] border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setAttempt(a => a + 1)} className="inline-flex items-center gap-1 min-h-[44px] px-1 font-semibold underline cursor-pointer bg-transparent border-none text-error">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : items === null ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonBox key={i} height={38} rounded="8px" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<History size={30} className="text-brand-orange opacity-55" />} title="No stock changes yet" description="Changes you make here or in bulk will be listed. Sales are not included." />
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col divide-y divide-bone">
          {items.map(it => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="num m-0 text-[14px] font-semibold text-carbon">{it.old} <span aria-hidden="true">→</span><span className="sr-only"> to </span> {it.new}
                  <span className={`ms-2 text-[12px] font-medium ${it.new >= it.old ? 'text-green-700' : 'text-error'}`}>
                    {it.new >= it.old ? '+' : ''}{it.new - it.old}
                  </span>
                </p>
                <p className="m-0 text-[12px] text-slate">{when(it.createdAt)}</p>
              </div>
              <span className="shrink-0 rounded-full border border-bone px-2 py-0.5 text-[11px] text-slate">{it.source === 'bulk' ? 'Bulk' : 'Manual'}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 mb-0 text-[12px] text-slate">Showing the last 20 changes made by you. Stock sold through orders is not listed.</p>
    </Modal>
  );
}

/** Per-product "running low" line (whole number 0-1000; empty = default 10). */
export function LowStockLimitModal({ storeId, product, onClose, onSaved }: {
  storeId: string; product: InventoryProduct; onClose: () => void; onSaved: () => void;
}) {
  const current = product.lowStockThreshold ?? DEFAULT_LIMIT;
  const [value, setValue] = useState(String(current));
  const save = useBusyAction();
  const trimmed = value.trim();
  const valid = /^\d{1,4}$/.test(trimmed) && Number(trimmed) <= 1000;

  const run = async (threshold: number | null) => {
    const r = await save.run(() => apiSetLowStockThreshold(storeId, product.productId, threshold));
    if (r) { onSaved(); onClose(); }
  };

  return (
    <Modal
      title="Low-stock limit"
      onClose={onClose}
      width={400}
      mobileSheet
      footer={
        <>
          {product.hasCustomThreshold && (
            <Button variant="ghost" size="sm" disabled={save.busy} onClick={() => run(null)}>Use default ({DEFAULT_LIMIT})</Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={save.busy}>Cancel</Button>
          <Button size="sm" onClick={() => run(Number(trimmed))} disabled={!valid || save.busy}>{save.busy ? 'Saving…' : 'Save'}</Button>
        </>
      }
    >
      <p className="m-0 mb-3 text-[13px] text-slate">
        “{product.name}” counts as <strong>Low Stock</strong> when it has this many units or fewer. Use 0 to never show it as low.
      </p>
      <label className="flex flex-col gap-1 text-[13px] font-medium text-charcoal">
        Units (0 to 1000)
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={1000}
          step={1}
          autoFocus
          value={value}
          aria-invalid={!valid || undefined}
          onChange={e => { setValue(e.target.value); save.setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter' && valid && !save.busy) run(Number(trimmed)); }}
          className={`w-[120px] rounded-[8px] border px-3 py-2 text-[14px] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 ${valid ? 'border-bone' : 'border-error'}`}
        />
      </label>
      {!valid && <p role="alert" className="mt-1.5 mb-0 text-[12px] text-error">Enter a whole number from 0 to 1000.</p>}
      {save.error && <p role="alert" className="mt-2 mb-0 text-[12px] text-error">{save.error}</p>}
    </Modal>
  );
}
