import { useEffect, useState } from 'react';
import { addressLines } from '@/utils/address';
import { Truck, CheckCheck, RefreshCw, Printer } from 'lucide-react';
import { Modal, Button, Badge, StatusBadge, Input, SkeletonBox } from '@/components/comman/ui';
import { apiMarkOrderPaid, apiSellerCancelOrder, apiUpdateOrderStatus } from '@/api/services/orders';
import { apiGetSellerOrderDetail, type SellerOrder, type SellerOrderDetail } from '@/api/services/product';
import { formatPrice } from '@/utils/formatPrice';
import { CodRiskBadge } from '@/components/ai/CodRiskBadge';
import { CourierBooking } from './CourierBooking';
import { OrderIdCopy } from './OrderIdCopy';
import { ShipFields, EMPTY_SHIP_FORM, nextShipForm } from './ShipFields';
import { buildTrackingPayload, carrierChoiceFor, OTHER_CARRIER, shipFormErrors, trackingLine, type ShipForm } from '@/utils/carriers';

export type SellerOrderStatus = 'processing' | 'shipped' | 'delivered' | 'completed';

// ── What the backend will actually allow (orders.service.ts) ──────────────────
// markPaid: seller may only confirm Cash-on-Delivery (card = automatic,
// bank transfer = admin proof review). updateSellerOrderStatus: forward-only
// processing → shipped → delivered → completed, never on a cancelled order,
// "shipped" needs tracking, "completed" needs the order to be paid.
export const canMarkPaid = (o: SellerOrder) =>
  !o.isPaid && o.paymentType === 'cash_on_delivery' && !edudeenCollects(o) && (o.status === 'shipped' || o.status === 'delivered');

/** COD cash of this package goes to Edudeen (its courier delivers), so only Edudeen confirms it. */
export const edudeenCollects = (o: { codCollector?: string | null; fulfillmentMode?: string | null }) =>
  (o.codCollector ?? o.fulfillmentMode) === 'platform';

export const EDUDEEN_COD_NOTE = "Cash collected by Edudeen's courier - you are credited after Edudeen receives it";

export const needsShipping = (o: SellerOrder) => o.type === 'physical' || o.type === 'mixed';

const isClosed = (o: SellerOrder) => o.status === 'completed' || o.status === 'cancelled';

export const canShip = (o: SellerOrder) =>
  !isClosed(o) && needsShipping(o) && (o.status === 'pending' || o.status === 'processing');

export const canComplete = (o: SellerOrder) =>
  !isClosed(o) && o.isPaid && (!needsShipping(o) || o.status === 'shipped' || o.status === 'delivered');

/** Seller can cancel a package that has not shipped (not when Edudeen fulfils it). Cancels count in Store Health. */
export const canCancel = (o: SellerOrder) =>
  needsShipping(o) && (o.status === 'pending' || o.status === 'processing') && (o.fulfillmentMode ?? 'seller') !== 'platform';

export const canProcess =(o: SellerOrder) => o.status === 'pending';

export const paymentLabel = (t: string | null | undefined) =>
  !t ? '—' : t === 'cash_on_delivery' ? 'Cash on delivery' : t === 'stripe' ? 'Card' : t.replace(/_/g, ' ');

interface Props {
  order:     SellerOrder;
  storeId:   string;
  onClose:   () => void;
  /** Called with the fields that changed after a successful action. */
  onUpdated: (orderId: string, patch: Partial<SellerOrder>) => void;
  /** Opens another order (the possible-duplicate link). */
  onOpenOrder?: (orderId: string, orderNumber: string) => void;
}

const RETURN_LABEL: Record<string, string> = { requested: 'Return requested', approved: 'Return approved', rejected: 'Return declined' };

/** Advisory checks (duplicate, address) + return flags. Hidden silently if the detail failed; skeleton while loading. */
function OrderChecks({ detail, loading, failed, onOpenOrder }: {
  detail: SellerOrderDetail | null; loading: boolean; failed: boolean;
  onOpenOrder?: (orderId: string, orderNumber: string) => void;
}) {
  if (failed) return null;
  if (loading) return <SkeletonBox height={44} rounded="8px" />;
  if (!detail) return null;
  const dup = detail.warnings?.possibleDuplicate ?? null;
  const addr = detail.warnings?.address ?? [];
  const returned = detail.items.filter(i => i.returnStatus && i.returnStatus !== 'none');
  if (!dup && addr.length === 0 && returned.length === 0) return null;
  return (
    <section role="note" className="rounded-lg border border-warning/30 bg-warning-bg/40 px-3 py-2 flex flex-col gap-2">
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-warning">Check before you ship</p>
      {dup && (
        <p className="text-[13px] text-carbon">
          Possible duplicate: same buyer ordered the same products within 24 hours.{' '}
          {onOpenOrder && (
            <button type="button" onClick={() => onOpenOrder(dup.orderId, dup.orderNumber)} className="font-semibold text-brand-royal underline cursor-pointer bg-transparent border-none p-0">
              View order {dup.orderNumber}
            </button>
          )}
        </p>
      )}
      {addr.length > 0 && (
        <ul className="list-disc ps-4 text-[13px] text-carbon">
          {addr.map(w => <li key={w.code}>{w.text}</li>)}
        </ul>
      )}
      {returned.length > 0 && (
        <ul className="text-[13px] text-carbon">
          {returned.map((i, k) => (
            <li key={`${i.productId}-${k}`}>
              <span className="font-semibold">{RETURN_LABEL[i.returnStatus as string] ?? 'Return'}</span>: {i.name}
              {i.returnReason ? ` — ${i.returnReason}` : ''}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-bone last:border-b-0">
      <span className="text-[12px] text-slate shrink-0">{label}</span>
      <span className="text-[13px] text-carbon text-right min-w-0 break-words">{children}</span>
    </div>
  );
}

export function OrderDetailModal({ order, storeId, onClose, onUpdated, onOpenOrder }: Props) {
  const [busy, setBusy]   = useState<string | null>(null);
  const [error, setError] = useState('');
  const [shipForm, setShipForm]             = useState<ShipForm>(EMPTY_SHIP_FORM);
  const [shipErrors, setShipErrors]         = useState<Partial<Record<keyof ShipForm, string>>>({});
  const [urlTouched, setUrlTouched]         = useState(false);
  const editShip = (patch: Partial<ShipForm>) => {
    if ('url' in patch) setUrlTouched(true);
    setShipForm(prev => nextShipForm(prev, patch, 'url' in patch ? true : urlTouched));
    setShipErrors({});
  };
  const [cancelling, setCancelling]         = useState(false);
  const [cancelReason, setCancelReason]     = useState('');
  const [printOpen, setPrintOpen]           = useState(false);

  const money = (n: number) => formatPrice(n, order.currency ?? undefined);

  // Full item list + shipping address come from the seller-scoped detail endpoint.
  const [detail, setDetail]               = useState<SellerOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError]     = useState('');
  const [detailKey, setDetailKey]         = useState(0);
  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    apiGetSellerOrderDetail(storeId, order.orderId)
      .then(res => { if (!cancelled) setDetail(res.data); })
      .catch((err: unknown) => { if (!cancelled) setDetailError(err instanceof Error ? err.message : 'Failed to load order details.'); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, order.orderId, detailKey]);

  const run = (key: string, fn: () => Promise<unknown>, patch: Partial<SellerOrder>) => {
    if (busy) return;
    setBusy(key);
    setError('');
    fn()
      .then(() => { onUpdated(order.orderId, patch); setDetailKey(k => k + 1); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Action failed.'))
      .finally(() => setBusy(null));
  };

  const changeStatus = (status: SellerOrderStatus) =>
    run(status, () => apiUpdateOrderStatus({ orderId: order.orderId, storeId, status }), { status });

  const ship = () => {
    const errs = shipFormErrors(shipForm);
    if (Object.keys(errs).length) { setShipErrors(errs); return; }
    run('shipped', () => apiUpdateOrderStatus({
      orderId: order.orderId, storeId, status: 'shipped',
      tracking: buildTrackingPayload(shipForm),
    }), { status: 'shipped' });
  };

  const markPaid = () =>
    // Marks only THIS store's package paid (the API needs storeId for multi-seller Cash on Delivery orders).
    run('paid', () => apiMarkOrderPaid(order.orderId, storeId), { isPaid: true });

  const confirmCancel = () => {
    if (cancelReason.trim().length < 5) { setError('Give the buyer a short reason (at least 5 characters).'); return; }
    run('cancel', () => apiSellerCancelOrder(order.orderId, storeId, cancelReason.trim()), { status: 'cancelled' });
  };

  const typeLabel = order.type === 'digital'
    ? 'Digital'
    : order.type === 'mixed' ? 'Physical + digital' : 'Physical';

  return (
    <Modal title={`Order ${order.orderNumber}`} onClose={onClose} width={520} mobileSheet>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 -mb-2 min-w-0">
          <span className="text-[12px] text-slate shrink-0">Order ID</span>
          <OrderIdCopy orderNumber={order.orderNumber} full />
        </div>
        <OrderChecks detail={detail} loading={detailLoading} failed={!!detailError} onOpenOrder={onOpenOrder} />

        <section>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Buyer</p>
          <Row label="Name">{order.customer.name}</Row>
          <Row label="Email">{order.customer.email || '—'}</Row>
          {detail?.customer.phone && <Row label="Phone">{detail.customer.phone}</Row>}
        </section>

        <section>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Order</p>
          <Row label="Placed">{new Date(order.date).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</Row>
          <Row label="Type"><Badge color={order.type === 'digital' ? 'blue' : 'orange'}>{typeLabel}</Badge></Row>
          <Row label="Status"><StatusBadge status={order.status} /></Row>
          {detail?.amounts && !detail.amounts.pricesHidden ? (
            <>
              <Row label="Items subtotal">{money(detail.amounts.itemsSubtotal ?? 0)}</Row>
              <Row label="Delivery charge">{(detail.amounts.deliveryCharge ?? 0) > 0 ? money(detail.amounts.deliveryCharge as number) : 'Free / none'}</Row>
              <Row label="Buyer pays"><span className="font-bold">{money(detail.amounts.buyerPays ?? 0)}</span></Row>
              {detail.amounts.earnings && (
                <Row label="Your earnings">
                  <span className="font-bold">{formatPrice(detail.amounts.earnings.amount, detail.amounts.earnings.currency)}</span>
                  <span className="block text-slate">After Edudeen&apos;s platform fee</span>
                </Row>
              )}
            </>
          ) : detail?.amounts?.pricesHidden ? (
            <Row label="Prices"><span className="text-slate">Hidden for gift orders and free claims</span></Row>
          ) : (
            <Row label="Your subtotal"><span className="font-bold">{money(order.amount)}</span></Row>
          )}
        </section>

        {(detail?.giftWrap || detail?.giftMessage) && (
          <section>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Gift</p>
            {detail?.giftWrap && <Row label="Gift wrap">Requested</Row>}
            {detail?.giftMessage && <Row label="Message"><span className="whitespace-pre-line">{detail.giftMessage}</span></Row>}
          </section>
        )}

        <section>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Payment</p>
          <Row label="Method"><span className="capitalize">{paymentLabel(order.paymentType)}</span></Row>
          <Row label="Status">
            {order.isPaid
              ? <span className="font-semibold text-success">Paid</span>
              : <span className="font-semibold text-[#b36200]">Unpaid</span>}
          </Row>
          {!order.isPaid && order.paymentType === 'cash_on_delivery' && !edudeenCollects(order) && (detail?.codAmount ?? order.codAmount ?? 0) > 0 && (
            <Row label="Cash to collect"><span className="font-bold">{money((detail?.codAmount ?? order.codAmount) as number)}</span></Row>
          )}
          {!order.isPaid && order.paymentType === 'cash_on_delivery' && edudeenCollects(order) && (
            <p className="text-[12px] text-slate mt-2">{EDUDEEN_COD_NOTE}</p>
          )}
          {order.paymentType === 'cash_on_delivery' && <CodRiskBadge storeId={storeId} orderId={order.orderId} />}
          {!order.isPaid && order.paymentType !== 'cash_on_delivery' && (
            <p className="text-[12px] text-slate mt-2">
              {order.paymentType === 'stripe'
                ? 'Card payments are confirmed automatically once the charge succeeds.'
                : 'Bank transfers are confirmed by the Edudeen team after reviewing the buyer’s payment proof.'}
            </p>
          )}
        </section>

        {detail?.status === 'cancelled' && detail.cancelReason && (
          <section role="note" className="rounded-lg border border-error/30 bg-error/5 px-3 py-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-error mb-1">Cancelled by buyer</p>
            <p className="text-[13px] text-carbon break-words">{detail.cancelReason}</p>
          </section>
        )}

        <section>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Items</p>
          {detailLoading ? (
            <div className="flex flex-col gap-2 py-1">
              <SkeletonBox height={40} rounded="8px" />
              <SkeletonBox height={40} rounded="8px" />
            </div>
          ) : detailError ? (
            <div className="flex items-center justify-between gap-3 py-2">
              <p role="alert" className="text-[12.5px] text-error">{detailError}</p>
              <Button variant="outline" size="xs" onClick={() => setDetailKey(k => k + 1)}>Retry</Button>
            </div>
          ) : !detail || detail.items.length === 0 ? (
            <p className="text-[12.5px] text-slate py-2">{order.product || 'No items.'}</p>
          ) : (
            <ul className="flex flex-col">
              {detail.items.map((it, i) => {
                const extras = [
                  it.licenseType ? `${it.licenseType.replace(/_/g, ' ')} license` : null,
                  ...it.options.map(o => `${o.name}: ${o.value}`),
                  it.sku ? `SKU ${it.sku}` : null,
                ].filter(Boolean);
                return (
                  <li key={`${it.productId}-${it.variantId ?? i}`} className="flex items-start justify-between gap-4 py-2 border-b border-bone last:border-b-0">
                    <div className="min-w-0">
                      <p className="text-[13px] text-carbon font-medium break-words">{it.name}</p>
                      {extras.length > 0 && <p className="text-[12px] text-slate">{extras.join(' · ')}</p>}
                      {it.status === 'cancelled' && it.cancelReason && it.cancelReason !== detail.cancelReason && (
                        <p className="text-[12px] text-error">Cancelled: {it.cancelReason}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-semibold text-carbon">{money(it.totalPrice)}</p>
                      <p className="text-[12px] text-slate">{it.quantity} × {money(it.price)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {needsShipping(order) && !detailLoading && !detailError && (
          <section>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Shipping address</p>
            {detail?.shippingAddress ? (
              <div className="text-[13px] text-carbon leading-[1.5] py-1">
                <p className="font-semibold">{detail.shippingAddress.recipientName}</p>
                <p>{addressLines(detail.shippingAddress).street}</p>
                {addressLines(detail.shippingAddress).region && <p>{addressLines(detail.shippingAddress).region}</p>}
                <p className="text-slate">{detail.shippingAddress.phoneNumber}</p>
              </div>
            ) : (
              <p className="text-[12.5px] text-slate py-1">No shipping address on this order — contact the buyer through Messages.</p>
            )}
            {trackingLine(detail?.tracking) && (
              <Row label="Tracking">
                {detail?.tracking?.trackingNumber && detail.tracking.trackingUrl && /^https?:\/\//i.test(detail.tracking.trackingUrl)
                  ? <a href={detail.tracking.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-brand-orange underline">{trackingLine(detail.tracking)}</a>
                  : trackingLine(detail?.tracking)}
                {detail?.tracking?.note ? <span className="block text-slate">{detail.tracking.note}</span> : null}
              </Row>
            )}
          </section>
        )}

        {canShip(order) && (
          <section>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-2">Ship this order</p>
            <div className="flex flex-col gap-2.5">
              <CourierBooking
                orderId={order.orderId}
                storeId={storeId}
                existing={detail?.shipment}
                quoted={detail?.shippingCourier}
                onBooked={s => {
                  const choice = carrierChoiceFor(s.carrier);
                  setUrlTouched(true);
                  setShipErrors({});
                  setShipForm({ ...EMPTY_SHIP_FORM, carrier: choice, otherName: choice === OTHER_CARRIER ? s.carrier : '', number: s.trackingNumber, url: s.trackingUrl ?? '' });
                }}
              />
              <ShipFields form={shipForm} errors={shipErrors} onChange={editShip} />
              {/* Booked/stored tracking info the buyer will see */}
              <Button variant="primary" size="sm" onClick={ship} loading={busy === 'shipped'} disabled={!!busy} icon={<Truck size={13} />}>
                Mark as shipped
              </Button>
            </div>
          </section>
        )}

        {(detail?.trackingEvents?.length ?? 0) > 0 && (
          <section>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1">Courier updates</p>
            <ul className="flex flex-col">
              {[...(detail?.trackingEvents ?? [])].reverse().map((ev, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-1.5 border-b border-bone last:border-b-0 text-[12.5px]">
                  <span className="text-carbon">{ev.description || ev.status}{ev.location ? ` · ${ev.location}` : ''}</span>
                  <span className="text-slate shrink-0">{ev.at ? new Date(ev.at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {error && <p role="alert" className="text-[12.5px] text-error font-medium">{error}</p>}

        {cancelling && canCancel(order) && (
          <section className="rounded-xl border border-bone p-3 flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-carbon">Cancel this order?</p>
            <p className="text-[12px] text-slate">The buyer is told and refunded. Cancellations by the seller count in your Store Health.</p>
            <Input label="Reason for the buyer" value={cancelReason} onChange={e => setCancelReason(e.target.value)} maxLength={200} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setCancelling(false); setError(''); }} disabled={!!busy}>Keep order</Button>
              <Button variant="danger" size="sm" onClick={confirmCancel} loading={busy === 'cancel'} disabled={!!busy}>Yes, cancel order</Button>
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-2 justify-end">
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setPrintOpen(o => !o)} icon={<Printer size={13} />} aria-haspopup="menu" aria-expanded={printOpen}>
              Print
            </Button>
            {printOpen && (
              <div role="menu" className="absolute bottom-full mb-1 end-0 z-10 min-w-[160px] rounded-lg border border-bone bg-white shadow-lg py-1">
                {([['slip', 'Packing slip'], ['invoice', 'Invoice']] as const).map(([mode, label]) => (
                  <button
                    key={mode} type="button" role="menuitem"
                    className="block w-full text-start px-3 py-2 min-h-[44px] text-[13px] text-carbon bg-transparent border-0 cursor-pointer hover:bg-cream"
                    onClick={() => { setPrintOpen(false); window.open(`/store/${storeId}/orders/print?ids=${order.orderId}&mode=${mode}`, '_blank', 'noopener'); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {canCancel(order) && !cancelling && (
            <Button variant="outline" size="sm" onClick={() => setCancelling(true)} disabled={!!busy}>Cancel order</Button>
          )}
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
