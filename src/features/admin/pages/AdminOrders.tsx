import { safeHttpUrl } from '@/utils/safeRedirect';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { StaffNotes } from '@/features/admin/components/StaffNotes';
import { ExportCsvButton } from '@/features/admin/components/ExportCsvButton';
import { useSearchParams } from 'react-router-dom';
import { ShoppingBag, RefreshCw, ExternalLink, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Table, StatusBadge, Button, Modal, Input, SkeletonBox, SearchInput, FilterDropdown, CopyIconButton, DuplicateChip, type TableColumn } from '@/components/comman/ui';
import { DateField } from '@/components/comman/ui/DateField';
import { AdminStudioHeader, ADMIN_GUTTER } from '@/features/admin/components/studio';
import { BulkDecisionModal } from '@/features/admin/components/BulkDecisionModal';
import { useBulkRunner } from '@/hooks/admin/useBulkRunner';
import {
  apiAdminListOrders, apiAdminGetOrder,
  type AdminOrderRow, type AdminOrderDetail, type AdminSellerOrder, type AdminOrdersQuery, type AdminOrderStatus, type AdminPaymentStatus, type AdminPaymentType,
} from '@/api/services/adminOrders';
import { apiMarkOrderPaid, apiAdminCancelOrder, apiUpdateOrderStatus } from '@/api/services/orders';
import { currencySymbol } from '@/utils/currency';
import { getStorePagePath } from '@/utils/storefrontUrl';

const PER_PAGE = 20;

const ORDER_STATUS: { value: AdminOrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'partially_shipped', label: 'Partly shipped' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const PAYMENT_STATUS: { value: AdminPaymentStatus; label: string }[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'pending_verification', label: 'Awaiting bank-transfer check' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];
const PAYMENT_TYPE: { value: AdminPaymentType; label: string }[] = [
  { value: 'stripe', label: 'Card' },
  { value: 'cash_on_delivery', label: 'Cash on delivery' },
  { value: 'manual_bank_transfer', label: 'Bank transfer' },
];
const PAYMENT_TYPE_LABEL = Object.fromEntries(PAYMENT_TYPE.map(p => [p.value, p.label])) as Record<string, string>;

const money = (n: number | undefined, currency: string) => `${currencySymbol(currency)} ${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: currency === 'PKR' ? 0 : 2 })}`;
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// Only packages Edudeen itself fulfils (fulfillmentMode 'platform') may have their shipping
// status moved by an admin — mirrors orders.service.ts's updateSellerOrderStatus restriction.
const isAdminManaged = (so: AdminSellerOrder) =>
  so.fulfillmentType === 'physical' && so.fulfillmentMode === 'platform' && so.status !== 'cancelled' && so.status !== 'completed';

function OrderDetailModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [shippingPkg, setShippingPkg] = useState<string | null>(null);
  const [trackingDraft, setTrackingDraft] = useState({ carrier: '', trackingNumber: '', trackingUrl: '' });

  const load = useCallback(() => {
    apiAdminGetOrder(id).then(res => setOrder(res.data)).catch(err => setError(err instanceof Error ? err.message : 'Could not load this order.'));
  }, [id]);
  useEffect(load, [load]);

  // Cash on Delivery from several sellers: every seller package is paid in cash on its own.
  const multiPackageCod = !!order && order.paymentType === 'cash_on_delivery' && order.sellerOrders.filter(s => s.fulfillmentType !== 'digital' && s.status !== 'cancelled').length > 1;
  async function markPaid(storeId?: string) {
    setMarking(true);
    try { await apiMarkOrderPaid(id, storeId); setConfirmPaid(false); load(); onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not mark as paid.'); }
    finally { setMarking(false); }
  }

  const canCancelOrder = !!order && order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed';
  async function confirmCancelOrder() {
    if (cancelReason.trim().length < 5) { setError('Give a short reason (at least 5 characters).'); return; }
    setCancelBusy(true); setError('');
    try { await apiAdminCancelOrder(id, cancelReason.trim()); setCancelling(false); load(); onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not cancel this order.'); }
    finally { setCancelBusy(false); }
  }

  async function changePackageStatus(so: AdminSellerOrder, status: 'processing' | 'delivered' | 'completed') {
    setStatusBusy(so.id); setError('');
    try { await apiUpdateOrderStatus({ orderId: id, storeId: so.storeId, status }); load(); onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update status.'); }
    finally { setStatusBusy(null); }
  }

  async function shipPackage(so: AdminSellerOrder) {
    if (!trackingDraft.trackingNumber.trim()) { setError('Enter a tracking number to mark this package shipped.'); return; }
    setStatusBusy(so.id); setError('');
    try {
      await apiUpdateOrderStatus({
        orderId: id, storeId: so.storeId, status: 'shipped',
        tracking: { carrier: trackingDraft.carrier.trim(), trackingNumber: trackingDraft.trackingNumber.trim(), trackingUrl: trackingDraft.trackingUrl.trim() },
      });
      setShippingPkg(null); load(); onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not mark this package shipped.'); }
    finally { setStatusBusy(null); }
  }

  const discounts = order ? [
    ['Coupon' + (order.couponCode ? ` (${order.couponCode})` : ''), order.couponDiscountTotal],
    ['Gift card', order.giftCardDiscountTotal],
    ['Sale campaign', order.campaignDiscountTotal],
    ['Store discount', order.autoDiscountTotal],
    ['Member price', order.subscriberDiscountTotal],
  ].filter(([, v]) => (v as number) > 0) as [string, number][] : [];
  const canMarkPaid = order && !order.isPaid && order.orderStatus !== 'cancelled' && order.paymentType !== 'stripe' && !multiPackageCod;

  return (
    <Modal title={order ? `Order ${order.orderNumber}` : 'Order'} onClose={onClose} width={760} mobileSheet
      footer={<>
        {!cancelling && canMarkPaid && !confirmPaid && <Button variant="outline" icon={<CheckCircle2 size={14} />} onClick={() => setConfirmPaid(true)}>Mark as paid</Button>}
        {confirmPaid && <>
          <span className="text-[12.5px] text-charcoal mr-auto">Cash or transfer received for the full amount?</span>
          <Button variant="ghost" onClick={() => setConfirmPaid(false)} disabled={marking}>No</Button>
          <Button variant="primary" onClick={() => void markPaid()} loading={marking}>Yes, mark paid</Button>
        </>}
        {!cancelling && !confirmPaid && canCancelOrder && (
          <Button variant="outline" icon={<XCircle size={14} />} onClick={() => { setCancelling(true); setCancelReason(''); setError(''); }}>Cancel order</Button>
        )}
        {!confirmPaid && !cancelling && <Button variant="ghost" onClick={onClose}>Close</Button>}
      </>}
    >
      {error && <p role="alert" className="text-[13px] text-error mb-3">{error}</p>}
      {!order ? (!error && <div className="flex flex-col gap-3"><SkeletonBox height={90} rounded="10px" /><SkeletonBox height={160} rounded="10px" /></div>) : (
        <div className="flex flex-col gap-4 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.orderStatus} size="sm" />
            <StatusBadge status={order.paymentStatus} size="sm" />
            <span className="text-slate">{PAYMENT_TYPE_LABEL[order.paymentType] ?? order.paymentType} · placed {when(order.createdAt)}{order.paidAt ? ` · paid ${when(order.paidAt)}` : ''}</span>
            <span className="ml-auto inline-flex items-center gap-1 font-mono text-[12px] text-slate">{order.id.slice(-8)} <CopyIconButton value={order.id} title="Copy order id" size={12} /></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-bone px-3 py-2">
              <p className="text-[12px] uppercase tracking-[0.06em] text-slate font-semibold mb-1">Buyer</p>
              {order.buyer ? <>
                <p className="font-semibold text-carbon">{order.buyer.name}</p>
                <p className="text-slate break-all">{order.buyer.email}{order.buyer.phone ? ` · ${order.buyer.phone}` : ''}</p>
              </> : <p className="text-slate">Account deleted</p>}
            </div>
            <div className="rounded-lg border border-bone px-3 py-2">
              <p className="text-[12px] uppercase tracking-[0.06em] text-slate font-semibold mb-1">Ship to</p>
              {order.shippingAddress ? (
                <p className="text-charcoal">
                  {order.shippingAddress.recipientName}{order.shippingAddress.phoneNumber ? ` · ${order.shippingAddress.phoneNumber}` : ''}<br />
                  {[order.shippingAddress.addressLine1, order.shippingAddress.addressLine2, order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.zipCode].filter(Boolean).join(', ')}
                </p>
              ) : <p className="text-slate">Digital order — nothing to ship</p>}
              {!!order.addressWarnings?.length && (
                <ul className="mt-1.5 flex flex-col gap-0.5">
                  {order.addressWarnings.map(w => (
                    <li key={w.code} className="text-[11.5px] text-warning">⚠ {w.text}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {cancelling && (
            <section className="rounded-lg border border-error/30 bg-error/5 px-3 py-3 flex flex-col gap-2">
              <p className="font-semibold text-carbon">Cancel this order?</p>
              <p className="text-[12px] text-slate">Every store's remaining items are cancelled and the buyer refunded where applicable. This can't be undone.</p>
              <Input label="Reason (shown to the buyer)" value={cancelReason} onChange={e => setCancelReason(e.target.value)} maxLength={200} />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setCancelling(false)} disabled={cancelBusy}>Keep order</Button>
                <Button variant="danger" size="sm" onClick={() => void confirmCancelOrder()} loading={cancelBusy} disabled={cancelBusy}>Yes, cancel order</Button>
              </div>
            </section>
          )}

          {order.sellerOrders.map(so => (
            <div key={so.id} className="rounded-lg border border-bone overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 bg-cream px-3 py-2">
                <a href={so.storeSlug ? getStorePagePath(so.storeSlug) : undefined} target="_blank" rel="noreferrer" className="font-semibold text-carbon inline-flex items-center gap-1">
                  {so.storeName}{so.storeSlug && <ExternalLink size={11} />}
                </a>
                <StatusBadge status={so.status} size="sm" />
                <span className="text-slate capitalize">{so.fulfillmentType}</span>
                <DuplicateChip other={so.possibleDuplicate} />
                {order.paymentType === 'cash_on_delivery' && so.fulfillmentType === 'physical' && (
                  <span className="text-[12px] text-slate">
                    {`Collected by: ${(so.codCollector ?? so.fulfillmentMode) === 'platform' ? 'Edudeen courier' : 'Seller'}`}
                  </span>
                )}
                {multiPackageCod && so.status !== 'cancelled' && so.fulfillmentType !== 'digital' && (so.packageIsPaid
                  ? <span className="text-[12px] font-semibold text-success">Paid</span>
                  : <>
                      {(so.codAmount ?? 0) > 0 && <span className="text-[12px] text-slate">Cash due {money(so.codAmount, order.currency)}</span>}
                      <Button variant="outline" size="xs" onClick={() => void markPaid(so.storeId)} loading={marking} disabled={marking || order.orderStatus === 'cancelled'}>Mark package paid</Button>
                    </>)}
                {so.tracking?.trackingNumber && (
                  <span className="ml-auto inline-flex items-center gap-1 text-slate">
                    <Truck size={12} /> {so.tracking.carrier} {so.tracking.trackingNumber}
                    {safeHttpUrl(so.tracking.trackingUrl) && <a href={safeHttpUrl(so.tracking.trackingUrl)} target="_blank" rel="noreferrer" className="text-brand-orange">track</a>}
                  </span>
                )}
              </div>
              <ul className="divide-y divide-bone">
                {so.items.map((it, i) => (
                  <li key={`${it.productId}-${i}`} className="flex items-center gap-3 px-3 py-2">
                    {it.image ? <img src={it.image} alt="" className="w-10 h-10 rounded object-cover border border-bone shrink-0" /> : <span className="w-10 h-10 rounded bg-bone shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-carbon font-medium truncate">{it.name}</p>
                      <p className="text-[12px] text-slate">
                        {it.quantity} × {money(it.price, order.currency)} · {it.type}
                        {it.options?.length ? ` · ${it.options.map(o => `${o.name}: ${o.value}`).join(', ')}` : ''}
                        {it.returnStatus ? ` · return ${it.returnStatus}` : ''}
                        {it.refundedAmount ? ` · refunded ${money(it.refundedAmount, order.currency)}` : ''}
                      </p>
                    </div>
                    <span className="font-semibold text-carbon tabular-nums">{money(it.totalPrice, order.currency)}</span>
                  </li>
                ))}
              </ul>
              {so.cancelReason && <p className="px-3 py-2 text-[12px] text-error border-t border-bone">Cancelled: {so.cancelReason}</p>}
              {isAdminManaged(so) && (
                <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-bone bg-cream/40">
                  {shippingPkg === so.id ? (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Input label="Tracking number *" value={trackingDraft.trackingNumber} onChange={e => setTrackingDraft(d => ({ ...d, trackingNumber: e.target.value }))} placeholder="e.g. LE123456789PK" />
                        <Input label="Carrier" value={trackingDraft.carrier} onChange={e => setTrackingDraft(d => ({ ...d, carrier: e.target.value }))} placeholder="e.g. TCS, Leopards" />
                        <Input label="Tracking link" value={trackingDraft.trackingUrl} onChange={e => setTrackingDraft(d => ({ ...d, trackingUrl: e.target.value }))} placeholder="https://…" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="xs" onClick={() => setShippingPkg(null)} disabled={!!statusBusy}>Cancel</Button>
                        <Button variant="primary" size="xs" onClick={() => void shipPackage(so)} loading={statusBusy === so.id} disabled={!!statusBusy} icon={<Truck size={13} />}>Mark shipped</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-[11px] text-slate uppercase tracking-[0.06em] font-semibold mr-auto">Edudeen-fulfilled</span>
                      {so.status === 'pending' && (
                        <Button variant="outline" size="xs" onClick={() => void changePackageStatus(so, 'processing')} loading={statusBusy === so.id} disabled={!!statusBusy}>Mark processing</Button>
                      )}
                      {(so.status === 'pending' || so.status === 'processing') && (
                        <Button variant="outline" size="xs" onClick={() => { setShippingPkg(so.id); setTrackingDraft({ carrier: '', trackingNumber: '', trackingUrl: '' }); setError(''); }} disabled={!!statusBusy} icon={<Truck size={13} />}>Mark shipped</Button>
                      )}
                      {so.status === 'shipped' && (
                        <Button variant="outline" size="xs" onClick={() => void changePackageStatus(so, 'delivered')} loading={statusBusy === so.id} disabled={!!statusBusy}>Mark delivered</Button>
                      )}
                      {(so.status === 'shipped' || so.status === 'delivered') && (order.isPaid || so.packageIsPaid) && (
                        <Button variant="primary" size="xs" onClick={() => void changePackageStatus(so, 'completed')} loading={statusBusy === so.id} disabled={!!statusBusy} icon={<CheckCircle2 size={13} />}>Mark completed</Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          <dl className="ml-auto w-full sm:w-[320px] flex flex-col gap-1 tabular-nums">
            <div className="flex justify-between"><dt className="text-slate">Subtotal</dt><dd>{money(order.subtotal, order.currency)}</dd></div>
            {discounts.map(([label, v]) => <div key={label} className="flex justify-between"><dt className="text-slate">{label}</dt><dd className="text-success">−{money(v, order.currency)}</dd></div>)}
            <div className="flex justify-between"><dt className="text-slate">Shipping</dt><dd>{order.shippingFee ? money(order.shippingFee, order.currency) : 'Free'}</dd></div>
            {order.taxAmount > 0 && <div className="flex justify-between"><dt className="text-slate">Tax</dt><dd>{money(order.taxAmount, order.currency)}</dd></div>}
            <div className="flex justify-between border-t border-bone pt-1 mt-1 font-bold text-carbon"><dt>Total</dt><dd>{money(order.totalAmount, order.currency)}</dd></div>
          </dl>
          <StaffNotes entityType="order" entityId={id} className="pt-3 border-t border-bone" />
        </div>
      )}
    </Modal>
  );
}

export function AdminOrders() {
  usePageTitle('Orders');
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [paymentStatus, setPaymentStatus] = useState(params.get('payment') ?? '');
  const [paymentType, setPaymentType] = useState(params.get('method') ?? '');
  const [from, setFrom] = useState(params.get('from') ?? '');
  const [to, setTo] = useState(params.get('to') ?? '');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(params.get('order'));
  const [reload, setReload] = useState(0);

  // Bulk cancel / mark-paid: one request per order through the same single-order
  // API the row-detail modal uses, so every order passes the same gates.
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [bulkMode, setBulkMode] = useState<'cancel' | 'markPaid' | null>(null);
  const bulk = useBulkRunner<AdminOrderRow>(r => r.orderNumber);
  const cancelEligible = rows.filter(r => selected.has(r.id) && r.orderStatus !== 'cancelled' && r.orderStatus !== 'completed');
  // Single-store only — a multi-seller Cash on Delivery order pays off one package at a time (see "Mark package paid" in the detail modal).
  const markPaidEligible = rows.filter(r => selected.has(r.id) && r.paymentStatus === 'unpaid' && r.paymentType !== 'stripe' && r.stores.length === 1);

  async function runBulkDecision(reason: string) {
    const mode = bulkMode;
    if (!mode) return;
    const res = mode === 'cancel'
      ? await bulk.run(cancelEligible, r => apiAdminCancelOrder(r.id, reason), 'cancelled')
      : await bulk.run(markPaidEligible, r => apiMarkOrderPaid(r.id), 'marked paid');
    setBulkMode(null);
    setSelected(new Set());
    if (res) setReload(n => n + 1);
  }

  // Filters are kept in the URL so a view can be shared with a teammate.
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('q', search);
    if (status) next.set('status', status);
    if (paymentStatus) next.set('payment', paymentStatus);
    if (paymentType) next.set('method', paymentType);
    if (from) next.set('from', from);
    if (to) next.set('to', to);
    if (openId) next.set('order', openId);
    setParams(next, { replace: true });
  }, [search, status, paymentStatus, paymentType, from, to, openId, setParams]);

  const query: AdminOrdersQuery = useMemo(() => ({
    q: search || undefined,
    status: (status || undefined) as AdminOrderStatus | undefined,
    paymentStatus: (paymentStatus || undefined) as AdminPaymentStatus | undefined,
    paymentType: (paymentType || undefined) as AdminPaymentType | undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    limit: PER_PAGE,
  }), [search, status, paymentStatus, paymentType, from, to, page]);

  const quietRef = useRef(false);
  useLiveRefresh(['orders'], () => { quietRef.current = true; setReload(r => r + 1); });

  useEffect(() => {
    let alive = true;
    const quiet = quietRef.current;
    quietRef.current = false;
    if (!quiet) { setLoading(true); setError(''); }
    // Small delay so typing in the search box doesn't fire a request per key.
    const t = setTimeout(() => {
      apiAdminListOrders(query)
        .then(res => { if (alive) { setRows(res.data.items); setTotal(res.data.total); } })
        .catch(err => { if (alive && !quiet) setError(err instanceof Error ? err.message : 'Could not load orders.'); })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [query, reload]);

  // A selection only makes sense for the page of rows it was made on.
  const reset = (fn: () => void) => { fn(); setPage(1); setSelected(new Set()); };

  const columns: TableColumn<AdminOrderRow>[] = [
    { key: 'orderNumber', header: 'Order', render: r => <span className="text-[13px] font-semibold text-carbon whitespace-nowrap">{r.orderNumber}</span> },
    { key: 'createdAt', header: 'Placed', render: r => <span className="text-[12.5px] text-slate whitespace-nowrap">{when(r.createdAt)}</span> },
    { key: 'buyer', header: 'Buyer', render: r => r.buyer ? <div className="min-w-0"><p className="text-[13px] text-carbon truncate max-w-[180px]">{r.buyer.name}</p><p className="text-[12px] text-slate truncate max-w-[180px]">{r.buyer.email}</p></div> : <span className="text-slate">—</span> },
    { key: 'stores', header: 'Store', render: r => (
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-graphite truncate max-w-[160px] inline-block">{r.stores.map(s => s.name).join(', ')}</span>
        {r.stores.filter(s => s.possibleDuplicate).map(s => <DuplicateChip key={s.id} other={s.possibleDuplicate} />)}
      </div>
    ) },
    { key: 'itemCount', header: 'Items', align: 'right', render: r => <span className="text-[13px] tabular-nums">{r.itemCount}</span> },
    { key: 'totalAmount', header: 'Total', align: 'right', render: r => <span className="text-[13px] font-semibold text-charcoal tabular-nums whitespace-nowrap">{money(r.totalAmount, r.currency)}</span> },
    { key: 'payment', header: 'Payment', render: r => <div className="flex flex-col items-start gap-0.5"><StatusBadge status={r.paymentStatus} size="sm" /><span className="text-[12px] text-slate">{PAYMENT_TYPE_LABEL[r.paymentType] ?? r.paymentType}</span></div> },
    { key: 'orderStatus', header: 'Status', render: r => <StatusBadge status={r.orderStatus} size="sm" /> },
  ];

  const anyFilter = !!(search || status || paymentStatus || paymentType || from || to);

  return (
    <>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Commerce"
        title="Orders"
        subtitle="Every order on Edudeen. Search by order number, buyer name, email or phone."
        actions={<div className="flex items-center gap-2 flex-wrap justify-end">
          <ExportCsvButton kind="orders" params={{ status, paymentStatus, paymentType, from, to }} />
          <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={() => setReload(n => n + 1)}>Refresh</Button>
        </div>}
      />
      <div className={`${ADMIN_GUTTER} pt-6 pb-8 flex flex-col gap-4`}>
        {bulk.message && <div role="status" className="bg-info-bg border border-info/30 rounded-lg px-4 py-2.5 text-[12.5px] text-carbon">{bulk.message}</div>}
        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          <div className="flex items-center gap-[10px] px-5 py-[14px] border-b border-bone flex-wrap">
            <SearchInput value={search} onChange={v => reset(() => setSearch(v))} placeholder="Order no., buyer, email or phone" className="flex-1 min-w-[260px] max-w-[420px]" />
            <FilterDropdown placeholder="Any status" options={ORDER_STATUS} value={status} onChange={v => reset(() => setStatus(v))} />
            <FilterDropdown placeholder="Any payment" options={PAYMENT_STATUS} value={paymentStatus} onChange={v => reset(() => setPaymentStatus(v))} />
            <FilterDropdown placeholder="Any method" options={PAYMENT_TYPE} value={paymentType} onChange={v => reset(() => setPaymentType(v))} />
            <DateField id="orders-from" label="From" value={from} onChange={v => reset(() => setFrom(v))} />
            <DateField id="orders-to" label="To" value={to} onChange={v => reset(() => setTo(v))} />
            {anyFilter && (
              <button type="button" onClick={() => reset(() => { setSearch(''); setStatus(''); setPaymentStatus(''); setPaymentType(''); setFrom(''); setTo(''); })}
                className="text-[12.5px] font-semibold text-carbon underline underline-offset-4 bg-transparent border-none cursor-pointer">Clear</button>
            )}
          </div>

          {error ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[13px] text-error mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setReload(n => n + 1)}>Try again</Button>
            </div>
          ) : (
            <Table
              cardsBelow="lg"
              columns={columns}
              data={rows}
              keyExtractor={r => r.id}
              loading={loading}
              onRowClick={r => setOpenId(r.id)}
              selectable
              selectedKeys={selected}
              onSelectionChange={setSelected}
              bulkActions={() => (
                <>
                  <Button size="xs" variant="outline" icon={<CheckCircle2 size={11} />} loading={bulk.busy} onClick={() => setBulkMode('markPaid')} disabled={markPaidEligible.length === 0}>Mark paid ({markPaidEligible.length})</Button>
                  <Button size="xs" variant="outline" icon={<XCircle size={11} />} loading={bulk.busy} onClick={() => setBulkMode('cancel')} disabled={cancelEligible.length === 0}>Cancel ({cancelEligible.length})</Button>
                </>
              )}
              emptyState={{
                icon: <ShoppingBag size={28} className="text-slate/50" />,
                title: anyFilter ? 'No orders match these filters' : 'No orders yet',
                description: anyFilter ? 'Try a different search or clear the filters.' : 'Orders show up here as soon as buyers check out.',
              }}
              pagination={{ page, total, perPage: PER_PAGE, onChange: p => { setPage(p); setSelected(new Set()); }, label: 'orders' }}
            />
          )}
        </div>
      </div>

      {openId && <OrderDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={() => setReload(n => n + 1)} />}

      {bulkMode && (
        <BulkDecisionModal
          title={bulkMode === 'cancel'
            ? `Cancel ${cancelEligible.length} order${cancelEligible.length === 1 ? '' : 's'}?`
            : `Mark ${markPaidEligible.length} order${markPaidEligible.length === 1 ? '' : 's'} paid?`}
          message={bulkMode === 'cancel'
            ? "Each order is cancelled on its own, exactly like the single Cancel order action — items are refunded where the order was already paid. Orders already cancelled or completed were left out automatically."
            : 'Each order is marked paid on its own, exactly like the single Mark as paid action. Only single-store, non-card orders that are still unpaid were included — a multi-seller Cash on Delivery order needs its packages marked individually from the order detail.'}
          items={(bulkMode === 'cancel' ? cancelEligible : markPaidEligible).map(r => `${r.orderNumber} — ${money(r.totalAmount, r.currency)}`)}
          requireReason={bulkMode === 'cancel'}
          reasonLabel="Reason (shown to every buyer)"
          confirmLabel={bulkMode === 'cancel' ? 'Cancel all' : 'Mark all paid'}
          danger={bulkMode === 'cancel'}
          busy={bulk.busy}
          progress={bulk.progress}
          onConfirm={reason => { void runBulkDecision(reason); }}
          onClose={() => setBulkMode(null)}
        />
      )}
    </>
  );
}
