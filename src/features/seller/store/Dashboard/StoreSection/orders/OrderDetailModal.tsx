import { useState } from 'react';
import { Truck, CheckCheck, RefreshCw, Info } from 'lucide-react';
import { Modal, Button, Badge, StatusBadge, Input } from '@/components/comman/ui';
import { apiMarkOrderPaid, apiUpdateOrderStatus } from '@/api/services/orders';
import type { SellerOrder } from '@/api/services/product';
import { currencySymbol } from '@/utils/currency';

export type SellerOrderStatus = 'processing' | 'shipped' | 'delivered' | 'completed';

// ── What the backend will actually allow (orders.service.ts) ──────────────────
// markPaid: seller may only confirm Cash-on-Delivery (card = automatic,
// bank transfer = admin proof review). updateSellerOrderStatus: forward-only
// processing → shipped → delivered → completed, never on a cancelled order,
// "shipped" needs tracking, "completed" needs the order to be paid.
export const canMarkPaid = (o: SellerOrder) =>
  !o.isPaid && o.paymentType === 'cash_on_delivery' && o.status !== 'cancelled' && o.status !== 'completed';

export const needsShipping = (o: SellerOrder) => o.type === 'physical' || o.type === 'mixed';

const isClosed = (o: SellerOrder) => o.status === 'completed' || o.status === 'cancelled';

export const canShip = (o: SellerOrder) =>
  !isClosed(o) && needsShipping(o) && (o.status === 'pending' || o.status === 'processing');

export const canComplete = (o: SellerOrder) =>
  !isClosed(o) && o.isPaid && (!needsShipping(o) || o.status === 'shipped' || o.status === 'delivered');

export const canProcess = (o: SellerOrder) => o.status === 'pending';

export const paymentLabel = (t: string) =>
  t === 'cash_on_delivery' ? 'Cash on delivery' : t === 'stripe' ? 'Card' : t.replace(/_/g, ' ');

interface Props {
  order:     SellerOrder;
  storeId:   string;
  onClose:   () => void;
  /** Called with the fields that changed after a successful action. */
  onUpdated: (orderId: string, patch: Partial<SellerOrder>) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-bone last:border-b-0">
      <span className="text-[12px] text-slate shrink-0">{label}</span>
      <span className="text-[13px] text-carbon text-right min-w-0 break-words">{children}</span>
    </div>
  );
}

export function OrderDetailModal({ order, storeId, onClose, onUpdated }: Props) {
  const [busy, setBusy]   = useState<string | null>(null);
  const [error, setError] = useState('');
  const [carrier, setCarrier]               = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl]       = useState('');

  const sym = currencySymbol(order.currency ?? undefined);

  const run = (key: string, fn: () => Promise<unknown>, patch: Partial<SellerOrder>) => {
    if (busy) return;
    setBusy(key);
    setError('');
    fn()
      .then(() => onUpdated(order.orderId, patch))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Action failed.'))
      .finally(() => setBusy(null));
  };

  const changeStatus = (status: SellerOrderStatus) =>
    run(status, () => apiUpdateOrderStatus({ orderId: order.orderId, storeId, status }), { status });

  const ship = () => {
    if (!trackingNumber.trim()) { setError('Enter a tracking number to mark this order shipped.'); return; }
    run('shipped', () => apiUpdateOrderStatus({
      orderId: order.orderId, storeId, status: 'shipped',
      tracking: { carrier: carrier.trim(), trackingNumber: trackingNumber.trim(), trackingUrl: trackingUrl.trim() },
    }), { status: 'shipped' });
  };

  const markPaid = () =>
    // Backend markPaid also completes the order.
    run('paid', () => apiMarkOrderPaid(order.orderId), { isPaid: true, status: 'completed' });

  const typeLabel = order.type === 'digital'
    ? (order.productType === 'educational' ? 'Educational (digital)' : 'Digital')
    : order.type === 'mixed' ? 'Physical + digital' : 'Physical';

  return (
    <Modal title={`Order ${order.orderNumber}`} onClose={onClose} width={520} mobileSheet>
      <div className="flex flex-col gap-5">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Buyer</p>
          <Row label="Name">{order.customer.name}</Row>
          <Row label="Email">{order.customer.email || '—'}</Row>
        </section>

        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Order</p>
          <Row label="Placed">{new Date(order.date).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</Row>
          <Row label="Item">{order.product || '—'}</Row>
          <Row label="Type"><Badge color={order.type === 'digital' ? 'blue' : 'orange'}>{typeLabel}</Badge></Row>
          <Row label="Status"><StatusBadge status={order.status} /></Row>
          <Row label="Your subtotal"><span className="font-bold">{sym}{order.amount.toLocaleString()}</span></Row>
        </section>

        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Payment</p>
          <Row label="Method"><span className="capitalize">{paymentLabel(order.paymentType)}</span></Row>
          <Row label="Status">
            {order.isPaid
              ? <span className="font-semibold text-success">Paid</span>
              : <span className="font-semibold text-[#b36200]">Unpaid</span>}
          </Row>
          {!order.isPaid && order.paymentType !== 'cash_on_delivery' && (
            <p className="text-[12px] text-slate mt-2">
              {order.paymentType === 'stripe'
                ? 'Card payments are confirmed automatically once the charge succeeds.'
                : 'Bank transfers are confirmed by the Edudeen team after reviewing the buyer’s payment proof.'}
            </p>
          )}
        </section>

        <div className="flex items-start gap-2 text-[12px] text-slate bg-cream border border-bone rounded-lg px-3 py-2.5">
          <Info size={14} className="shrink-0 mt-[1px]" />
          <span>The full item list and the buyer’s shipping address aren’t available in the seller order view yet — contact the buyer through Messages if you need delivery details.</span>
        </div>

        {canShip(order) && (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate mb-2">Ship this order</p>
            <div className="flex flex-col gap-2.5">
              <Input label="Tracking number *" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="e.g. LE123456789PK" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input label="Carrier" value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="e.g. TCS, Leopards" />
                <Input label="Tracking link" value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} placeholder="https://…" />
              </div>
              <Button variant="primary" size="sm" onClick={ship} loading={busy === 'shipped'} disabled={!!busy} icon={<Truck size={13} />}>
                Mark as shipped
              </Button>
            </div>
          </section>
        )}

        {error && <p role="alert" className="text-[12.5px] text-error font-medium">{error}</p>}

        <div className="flex flex-wrap gap-2 justify-end">
          {canProcess(order) && (
            <Button variant="outline" size="sm" onClick={() => changeStatus('processing')} loading={busy === 'processing'} disabled={!!busy} icon={<RefreshCw size={13} />}>
              Mark processing
            </Button>
          )}
          {needsShipping(order) && order.status === 'shipped' && (
            <Button variant="outline" size="sm" onClick={() => changeStatus('delivered')} loading={busy === 'delivered'} disabled={!!busy} icon={<Truck size={13} />}>
              Mark delivered
            </Button>
          )}
          {canMarkPaid(order) && (
            <Button variant="outline" size="sm" onClick={markPaid} loading={busy === 'paid'} disabled={!!busy} icon={<CheckCheck size={13} />}>
              Cash collected — mark paid
            </Button>
          )}
          {canComplete(order) && (
            <Button variant="primary" size="sm" onClick={() => changeStatus('completed')} loading={busy === 'completed'} disabled={!!busy} icon={<CheckCheck size={13} />}>
              Mark completed
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
