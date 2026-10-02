import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingBag, RefreshCw, ExternalLink, Truck, CheckCircle2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Table, StatusBadge, Button, Modal, SkeletonBox, SearchInput, FilterDropdown, CopyIconButton, type TableColumn } from '@/components/comman/ui';
import { AdminStudioHeader, ADMIN_GUTTER } from '@/features/admin/components/studio';
import {
  apiAdminListOrders, apiAdminGetOrder,
  type AdminOrderRow, type AdminOrderDetail, type AdminOrdersQuery, type AdminOrderStatus, type AdminPaymentStatus, type AdminPaymentType,
} from '@/api/services/adminOrders';
import { apiMarkOrderPaid } from '@/api/services/orders';
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

function OrderDetailModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);
  const [confirmPaid, setConfirmPaid] = useState(false);

  const load = useCallback(() => {
    apiAdminGetOrder(id).then(res => setOrder(res.data)).catch(err => setError(err instanceof Error ? err.message : 'Could not load this order.'));
  }, [id]);
  useEffect(load, [load]);

  async function markPaid() {
    setMarking(true);
    try { await apiMarkOrderPaid(id); setConfirmPaid(false); load(); onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not mark as paid.'); }
    finally { setMarking(false); }
  }

  const discounts = order ? [
    ['Coupon' + (order.couponCode ? ` (${order.couponCode})` : ''), order.couponDiscountTotal],
    ['Gift card', order.giftCardDiscountTotal],
    ['Sale campaign', order.campaignDiscountTotal],
    ['Store discount', order.autoDiscountTotal],
    ['Member price', order.subscriberDiscountTotal],
  ].filter(([, v]) => (v as number) > 0) as [string, number][] : [];
  const canMarkPaid = order && !order.isPaid && order.orderStatus !== 'cancelled' && order.paymentType !== 'stripe';

  return (
    <Modal title={order ? `Order ${order.orderNumber}` : 'Order'} onClose={onClose} width={760} mobileSheet
      footer={<>
        {canMarkPaid && !confirmPaid && <Button variant="outline" icon={<CheckCircle2 size={14} />} onClick={() => setConfirmPaid(true)}>Mark as paid</Button>}
        {confirmPaid && <>
          <span className="text-[12.5px] text-charcoal mr-auto">Cash or transfer received for the full amount?</span>
          <Button variant="ghost" onClick={() => setConfirmPaid(false)} disabled={marking}>No</Button>
          <Button variant="primary" onClick={markPaid} loading={marking}>Yes, mark paid</Button>
        </>}
        {!confirmPaid && <Button variant="ghost" onClick={onClose}>Close</Button>}
      </>}
    >
      {error && <p role="alert" className="text-[13px] text-error mb-3">{error}</p>}
      {!order ? (!error && <div className="flex flex-col gap-3"><SkeletonBox height={90} rounded="10px" /><SkeletonBox height={160} rounded="10px" /></div>) : (
        <div className="flex flex-col gap-4 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.orderStatus} size="sm" />
            <StatusBadge status={order.paymentStatus} size="sm" />
            <span className="text-slate">{PAYMENT_TYPE_LABEL[order.paymentType] ?? order.paymentType} · placed {when(order.createdAt)}{order.paidAt ? ` · paid ${when(order.paidAt)}` : ''}</span>
            <span className="ml-auto inline-flex items-center gap-1 font-mono text-[11.5px] text-slate">{order.id.slice(-8)} <CopyIconButton value={order.id} title="Copy order id" size={12} /></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-bone px-3 py-2">
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-slate font-semibold mb-1">Buyer</p>
              {order.buyer ? <>
                <p className="font-semibold text-carbon">{order.buyer.name}</p>
                <p className="text-slate break-all">{order.buyer.email}{order.buyer.phone ? ` · ${order.buyer.phone}` : ''}</p>
              </> : <p className="text-slate">Account deleted</p>}
            </div>
            <div className="rounded-lg border border-bone px-3 py-2">
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-slate font-semibold mb-1">Ship to</p>
              {order.shippingAddress ? (
                <p className="text-charcoal">
                  {order.shippingAddress.recipientName}{order.shippingAddress.phoneNumber ? ` · ${order.shippingAddress.phoneNumber}` : ''}<br />
                  {[order.shippingAddress.addressLine1, order.shippingAddress.addressLine2, order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.zipCode].filter(Boolean).join(', ')}
                </p>
              ) : <p className="text-slate">Digital order — nothing to ship</p>}
            </div>
          </div>

          {order.sellerOrders.map(so => (
            <div key={so.id} className="rounded-lg border border-bone overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 bg-cream px-3 py-2">
                <a href={so.storeSlug ? getStorePagePath(so.storeSlug) : undefined} target="_blank" rel="noreferrer" className="font-semibold text-carbon inline-flex items-center gap-1">
                  {so.storeName}{so.storeSlug && <ExternalLink size={11} />}
                </a>
                <StatusBadge status={so.status} size="sm" />
                <span className="text-slate capitalize">{so.fulfillmentType}</span>
                {so.tracking?.trackingNumber && (
                  <span className="ml-auto inline-flex items-center gap-1 text-slate">
                    <Truck size={12} /> {so.tracking.carrier} {so.tracking.trackingNumber}
                    {so.tracking.trackingUrl && <a href={so.tracking.trackingUrl} target="_blank" rel="noreferrer" className="text-brand-orange">track</a>}
                  </span>
                )}
              </div>
              <ul className="divide-y divide-bone">
                {so.items.map((it, i) => (
                  <li key={`${it.productId}-${i}`} className="flex items-center gap-3 px-3 py-2">
                    {it.image ? <img src={it.image} alt="" className="w-10 h-10 rounded object-cover border border-bone shrink-0" /> : <span className="w-10 h-10 rounded bg-bone shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-carbon font-medium truncate">{it.name}</p>
                      <p className="text-[11.5px] text-slate">
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
            </div>
          ))}

          <dl className="ml-auto w-full sm:w-[320px] flex flex-col gap-1 tabular-nums">
            <div className="flex justify-between"><dt className="text-slate">Subtotal</dt><dd>{money(order.subtotal, order.currency)}</dd></div>
            {discounts.map(([label, v]) => <div key={label} className="flex justify-between"><dt className="text-slate">{label}</dt><dd className="text-success">−{money(v, order.currency)}</dd></div>)}
            <div className="flex justify-between"><dt className="text-slate">Shipping</dt><dd>{order.shippingFee ? money(order.shippingFee, order.currency) : 'Free'}</dd></div>
            {order.taxAmount > 0 && <div className="flex justify-between"><dt className="text-slate">Tax</dt><dd>{money(order.taxAmount, order.currency)}</dd></div>}
            <div className="flex justify-between border-t border-bone pt-1 mt-1 font-bold text-carbon"><dt>Total</dt><dd>{money(order.totalAmount, order.currency)}</dd></div>
          </dl>
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

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    // Small delay so typing in the search box doesn't fire a request per key.
    const t = setTimeout(() => {
      apiAdminListOrders(query)
        .then(res => { if (alive) { setRows(res.data.items); setTotal(res.data.total); } })
        .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load orders.'); })
        .finally(() => { if (alive) setLoading(false); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [query, reload]);

  const reset = (fn: () => void) => { fn(); setPage(1); };

  const columns: TableColumn<AdminOrderRow>[] = [
    { key: 'orderNumber', header: 'Order', render: r => <span className="text-[13px] font-semibold text-carbon whitespace-nowrap">{r.orderNumber}</span> },
    { key: 'createdAt', header: 'Placed', render: r => <span className="text-[12.5px] text-slate whitespace-nowrap">{when(r.createdAt)}</span> },
    { key: 'buyer', header: 'Buyer', render: r => r.buyer ? <div className="min-w-0"><p className="text-[13px] text-carbon truncate max-w-[180px]">{r.buyer.name}</p><p className="text-[11.5px] text-slate truncate max-w-[180px]">{r.buyer.email}</p></div> : <span className="text-slate">—</span> },
    { key: 'stores', header: 'Store', render: r => <span className="text-[13px] text-graphite truncate max-w-[160px] inline-block">{r.stores.map(s => s.name).join(', ')}</span> },
    { key: 'itemCount', header: 'Items', align: 'right', render: r => <span className="text-[13px] tabular-nums">{r.itemCount}</span> },
    { key: 'totalAmount', header: 'Total', align: 'right', render: r => <span className="text-[13px] font-semibold text-charcoal tabular-nums whitespace-nowrap">{money(r.totalAmount, r.currency)}</span> },
    { key: 'payment', header: 'Payment', render: r => <div className="flex flex-col items-start gap-0.5"><StatusBadge status={r.paymentStatus} size="sm" /><span className="text-[11px] text-slate">{PAYMENT_TYPE_LABEL[r.paymentType] ?? r.paymentType}</span></div> },
    { key: 'orderStatus', header: 'Status', render: r => <StatusBadge status={r.orderStatus} size="sm" /> },
  ];

  const anyFilter = !!(search || status || paymentStatus || paymentType || from || to);

  return (
    <>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Commerce"
        title="Orders"
        subtitle="Every order on Edudeen. Search by order number, buyer name, email or phone."
        actions={<Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={() => setReload(n => n + 1)}>Refresh</Button>}
      />
      <div className={`${ADMIN_GUTTER} pt-6 pb-8 flex flex-col gap-4`}>
        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          <div className="flex items-center gap-[10px] px-5 py-[14px] border-b border-bone flex-wrap">
            <SearchInput value={search} onChange={v => reset(() => setSearch(v))} placeholder="Order number, buyer name, email or phone…" className="flex-1 min-w-[220px] max-w-[340px]" />
            <FilterDropdown placeholder="Any status" options={ORDER_STATUS} value={status} onChange={v => reset(() => setStatus(v))} />
            <FilterDropdown placeholder="Any payment" options={PAYMENT_STATUS} value={paymentStatus} onChange={v => reset(() => setPaymentStatus(v))} />
            <FilterDropdown placeholder="Any method" options={PAYMENT_TYPE} value={paymentType} onChange={v => reset(() => setPaymentType(v))} />
            <label className="inline-flex items-center gap-1.5 text-[12.5px] text-slate">
              From <input id="orders-from" type="date" value={from} onChange={e => reset(() => setFrom(e.target.value))} className="rounded-lg border border-bone px-2 py-[6px] text-[12.5px] text-carbon bg-white" />
            </label>
            <label className="inline-flex items-center gap-1.5 text-[12.5px] text-slate">
              To <input id="orders-to" type="date" value={to} onChange={e => reset(() => setTo(e.target.value))} className="rounded-lg border border-bone px-2 py-[6px] text-[12.5px] text-carbon bg-white" />
            </label>
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
              columns={columns}
              data={rows}
              keyExtractor={r => r.id}
              loading={loading}
              onRowClick={r => setOpenId(r.id)}
              emptyState={{
                icon: <ShoppingBag size={28} className="text-slate/50" />,
                title: anyFilter ? 'No orders match these filters' : 'No orders yet',
                description: anyFilter ? 'Try a different search or clear the filters.' : 'Orders show up here as soon as buyers check out.',
              }}
              pagination={{ page, total, perPage: PER_PAGE, onChange: setPage, label: 'orders' }}
            />
          )}
        </div>
      </div>

      {openId && <OrderDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={() => setReload(n => n + 1)} />}
    </>
  );
}
