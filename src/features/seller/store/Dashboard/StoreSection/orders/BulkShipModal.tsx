import { useMemo, useState } from 'react';
import { Truck } from 'lucide-react';
import { Modal, Button, Input } from '@/components/comman/ui';
import { apiUpdateOrderStatus } from '@/api/services/orders';
import type { SellerOrder } from '@/api/services/product';
import { runBulk, bulkSummary } from '@/utils/bulkRun';
import {
  CARRIERS, OTHER_CARRIER, isSelfCarrier, trackingUrlFor, buildTrackingPayload, type ShipForm,
} from '@/utils/carriers';
import { canShip } from './OrderDetailModal';

/** Why an order cannot be shipped from the bulk screen (null = can). Same rules the single-order API enforces. */
export function bulkShipSkipReason(o: SellerOrder): string | null {
  if (o.fulfillmentMode === 'platform') return 'Edudeen ships this order';
  if (o.type === 'digital') return 'Digital order: nothing to ship';
  if (o.status === 'cancelled') return 'Cancelled';
  if (o.status === 'shipped' || o.status === 'delivered' || o.status === 'completed') return `Already ${o.status}`;
  if (!canShip(o)) return 'Cannot be shipped right now';
  return null;
}

const selectCls = 'w-full min-h-[44px] px-3 rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border';

export function BulkShipModal({ orders, storeId, onClose, onShipped }: {
  orders: SellerOrder[];
  storeId: string;
  onClose: () => void;
  /** Ids that were really marked shipped. */
  onShipped: (orderIds: string[]) => void;
}) {
  const { eligible, skipped } = useMemo(() => {
    const e: SellerOrder[] = []; const s: { o: SellerOrder; why: string }[] = [];
    for (const o of orders) { const why = bulkShipSkipReason(o); if (why) s.push({ o, why }); else e.push(o); }
    return { eligible: e, skipped: s };
  }, [orders]);

  const [carrier, setCarrier] = useState('');
  const [otherName, setOtherName] = useState('');
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [expected, setExpected] = useState('');
  const [note, setNote] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<[number, number]>([0, 0]);
  const [result, setResult] = useState<{ summary: string; failed: { o: SellerOrder; message: string }[]; ok: number } | null>(null);

  const self = isSelfCarrier(carrier);
  const carrierName = (carrier === OTHER_CARRIER ? otherName : carrier).trim();
  const carrierError = !carrier ? 'Choose a carrier.' : !carrierName ? 'Type the carrier name.' : carrierName.length > 60 ? 'Carrier name is too long (max 60).' : '';
  const numberError = (id: string) => {
    if (self) return '';
    const n = (numbers[id] ?? '').trim();
    return !n ? 'Required' : n.length > 60 ? 'Max 60 characters' : '';
  };
  const hasErrors = !!carrierError || (!self && eligible.some(o => numberError(o.orderId)));

  const start = async () => {
    setShowErrors(true);
    if (hasErrors || eligible.length === 0 || running) return;
    setRunning(true); setProgress([0, eligible.length]);
    const res = await runBulk(eligible, o => {
      const num = (numbers[o.orderId] ?? '').trim();
      const form: ShipForm = { carrier, otherName, number: num, url: trackingUrlFor(carrier, num), expected, note };
      // The SAME update-status API as the single order screen: one order at a time.
      return apiUpdateOrderStatus({ orderId: o.orderId, storeId, status: 'shipped', tracking: buildTrackingPayload(form) });
    }, { onProgress: (d, t) => setProgress([d, t]) });
    setRunning(false);
    if (res.ok.length) onShipped(res.ok.map(o => o.orderId));
    setResult({
      summary: bulkSummary(res, o => o.orderNumber, 'shipped'),
      failed: res.failed.map(f => ({ o: f.item, message: f.message })),
      ok: res.ok.length,
    });
  };

  return (
    <Modal title={`Mark ${orders.length} order${orders.length === 1 ? '' : 's'} as shipped`} onClose={running ? () => {} : onClose} width={560} mobileSheet>
      <div className="flex flex-col gap-4">
        {result ? (
          <>
            <p role="status" className="text-[13px] text-carbon">{result.summary}</p>
            {result.failed.length > 0 && (
              <ul className="text-[12.5px] text-error list-disc ps-4">
                {result.failed.map(f => <li key={f.o.orderId}>{f.o.orderNumber}: {f.message}</li>)}
              </ul>
            )}
            <Button variant="primary" size="sm" onClick={onClose}>Done</Button>
          </>
        ) : (
          <>
            {skipped.length > 0 && (
              <section role="note" className="rounded-lg border border-warning/30 bg-warning-bg/40 px-3 py-2">
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-warning mb-1">Skipped ({skipped.length})</p>
                <ul className="text-[12.5px] text-carbon">
                  {skipped.map(s => <li key={s.o.orderId}><span className="font-semibold">{s.o.orderNumber}</span>: {s.why}</li>)}
                </ul>
              </section>
            )}

            {eligible.length === 0 ? (
              <p className="text-[13px] text-slate">None of the selected orders can be shipped.</p>
            ) : (
              <>
                <div>
                  <label htmlFor="bulk-carrier" className="text-[12px] font-semibold text-charcoal block mb-1.5">One carrier for all {eligible.length} orders *</label>
                  <select id="bulk-carrier" className={selectCls} value={carrier} onChange={e => setCarrier(e.target.value)} aria-invalid={showErrors && !!carrierError} disabled={running}>
                    <option value="" disabled>Choose…</option>
                    {CARRIERS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  {showErrors && carrierError && !(carrier === OTHER_CARRIER) && <p role="alert" className="text-[12px] text-error mt-1">{carrierError}</p>}
                </div>
                {carrier === OTHER_CARRIER && (
                  <Input label="Carrier name *" value={otherName} maxLength={60} onChange={e => setOtherName(e.target.value)} error={showErrors ? carrierError : undefined} disabled={running} />
                )}

                {carrier && self && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="bulk-expected" className="text-[12px] font-semibold text-charcoal block mb-1.5">Expected delivery date (optional)</label>
                      <input id="bulk-expected" type="date" min={new Date().toISOString().slice(0, 10)} value={expected} onChange={e => setExpected(e.target.value)} className={selectCls} disabled={running} />
                    </div>
                    <Input label="Note for buyers (optional)" value={note} maxLength={300} onChange={e => setNote(e.target.value)} disabled={running} />
                  </div>
                )}

                {carrier && !self && (
                  <ul className="flex flex-col gap-2">
                    {eligible.map(o => (
                      <li key={o.orderId} className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-1.5 sm:gap-3 sm:items-start">
                        <span className="text-[12.5px] font-semibold text-carbon sm:pt-3 break-all">{o.orderNumber}</span>
                        <Input
                          aria-label={`Tracking number for ${o.orderNumber}`}
                          placeholder="Tracking number *"
                          value={numbers[o.orderId] ?? ''}
                          maxLength={60}
                          onChange={e => setNumbers(p => ({ ...p, [o.orderId]: e.target.value }))}
                          error={showErrors ? numberError(o.orderId) || undefined : undefined}
                          disabled={running}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                {running && <p role="status" className="text-[12.5px] text-slate">Shipping {progress[0]} of {progress[1]}…</p>}
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" className="min-h-[44px]" onClick={start} loading={running} disabled={running} icon={<Truck size={13} />}>
                    Mark {eligible.length} shipped
                  </Button>
                  <Button variant="outline" size="sm" className="min-h-[44px]" onClick={onClose} disabled={running}>Cancel</Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
