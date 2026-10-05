import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Truck, Package, Download, MapPin, CreditCard, CheckCircle2, Circle } from 'lucide-react';
import { clsx } from 'clsx';
import { Card, SkeletonBox, Button, StatusBadge } from '@/components/comman/ui';
import { apiGetOrderById, type OrderDetail } from '@/api/services/orders';
import { getStorePagePath } from '@/utils/storefrontUrl';
import { money, discountLines } from './orderFormat';
import { LICENSE_LABEL } from '@/constants/learning';
import { DigitalFileDownloads } from '@/features/buyer/components/DigitalFileDownloads';
import { RefundRequestPanel } from '@/features/buyer/components/RefundRequestPanel';

const PAYMENT_LABEL: Record<string, string> = {
  stripe: 'Card', cash_on_delivery: 'Cash on delivery', manual_bank_transfer: 'Bank transfer',
};

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : null);

/** One store's part of the order, as a step-by-step timeline with dates. */
function Timeline({ placedAt, paidAt, so }: { placedAt: string; paidAt?: string | null; so: OrderDetail['sellerOrders'][number] }) {
  const digital = so.fulfillmentType === 'digital';
  const steps = digital
    ? [
        { label: 'Order placed', at: placedAt, done: true },
        { label: 'Payment confirmed', at: paidAt, done: !!paidAt },
        { label: 'Ready to download', at: paidAt, done: !!paidAt },
      ]
    : [
        { label: 'Order placed', at: placedAt, done: true },
        { label: 'Being prepared', at: null, done: ['processing', 'shipped', 'delivered', 'completed'].includes(so.status) },
        { label: 'Shipped', at: so.shippedAt, done: ['shipped', 'delivered', 'completed'].includes(so.status) },
        { label: 'Delivered', at: so.deliveredAt, done: ['delivered', 'completed'].includes(so.status) },
      ];
  if (so.status === 'cancelled') return <p className="text-[12.5px] text-error">This part of the order was cancelled.</p>;
  return (
    <ol className="flex flex-col sm:flex-row gap-3 sm:gap-0 list-none p-0 m-0">
      {steps.map((s, i) => (
        <li key={s.label} className="flex sm:flex-col items-center sm:items-start gap-2 sm:flex-1 min-w-0">
          <div className="flex items-center w-auto sm:w-full">
            {s.done ? <CheckCircle2 size={18} className="text-success shrink-0" /> : <Circle size={18} className="text-bone shrink-0" />}
            {i < steps.length - 1 && <span className={clsx('hidden sm:block flex-1 h-[2px] mx-1', steps[i + 1].done ? 'bg-success' : 'bg-bone')} />}
          </div>
          <div className="min-w-0">
            <p className={clsx('text-[12.5px] font-semibold', s.done ? 'text-carbon' : 'text-slate')}>{s.label}</p>
            {s.done && s.at && <p className="text-[11px] text-slate">{fmt(s.at)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    apiGetOrderById(orderId)
      .then(res => { if (alive) setOrder(res.data); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load this order.'); });
    return () => { alive = false; };
  }, [orderId]);

  if (error) {
    return (
      <Card>
        <p className="text-[13px] text-error mb-3">{error}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/account/orders')}>Back to orders</Button>
      </Card>
    );
  }
  if (!order) return <div className="flex flex-col gap-3"><SkeletonBox height={90} rounded="12px" /><SkeletonBox height={220} rounded="12px" /></div>;

  const addr = order.shippingAddress as Record<string, string> | null;
  const discounts = discountLines(order);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/account/orders" className="inline-flex items-center gap-1 text-[13px] text-slate hover:text-brand-orange no-underline"><ArrowLeft size={14} /> Orders</Link>
        <h1 className="text-[20px] font-bold text-carbon font-mono">{order.orderNumber}</h1>
        <StatusBadge status={order.orderStatus} size="sm" />
        <StatusBadge status={order.paymentStatus} size="sm" />
        <Link to={`/account/orders/${order._id}/invoice`} target="_blank" className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-bone bg-white px-3 py-[7px] text-[12.5px] font-semibold text-carbon no-underline hover:border-brand-orange">
          <FileText size={13} /> Invoice
        </Link>
      </div>
      <p className="text-[12.5px] text-slate -mt-2">Placed {fmt(order.createdAt)} · {PAYMENT_LABEL[order.paymentType] ?? order.paymentType}</p>

      {order.sellerOrders.map((so, idx) => (
        <Card key={so._id ?? idx} padding="none">
          <div className="px-4 md:px-5 py-3 border-b border-bone flex items-center gap-2 flex-wrap">
            {so.fulfillmentType === 'digital' ? <Download size={14} className="text-brand-orange" /> : <Package size={14} className="text-brand-orange" />}
            {so.storeSlug ? (
              <Link to={getStorePagePath(so.storeSlug)} className="text-[13.5px] font-bold text-carbon no-underline hover:text-brand-orange">{so.storeName ?? so.sellerName ?? 'Store'}</Link>
            ) : <span className="text-[13.5px] font-bold text-carbon">{so.storeName ?? so.sellerName ?? 'Store'}</span>}
            <StatusBadge status={so.status} size="sm" />
            {so.tracking?.trackingNumber && (
              <span className="ms-auto inline-flex items-center gap-1 text-[12px] text-slate">
                <Truck size={12} /> {so.tracking.carrier} {so.tracking.trackingNumber}
                {so.tracking.trackingUrl && <a href={so.tracking.trackingUrl} target="_blank" rel="noreferrer" className="text-brand-orange font-semibold ms-1">Track package</a>}
              </span>
            )}
          </div>
          <div className="px-4 md:px-5 py-4 border-b border-bone">
            <Timeline placedAt={order.createdAt} paidAt={order.paidAt} so={so} />
          </div>
          <ul className="divide-y divide-[#f5f4ef] list-none p-0 m-0">
            {so.items.map((it: any, i: number) => (
              <li key={it._id ?? i} className="flex flex-wrap items-center gap-3 px-4 md:px-5 py-3">
                {it.image ? <img src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-bone shrink-0" /> : <span className="w-12 h-12 rounded-lg bg-bone shrink-0" />}
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${it.productId}`} className="text-[13px] font-semibold text-carbon no-underline hover:text-brand-orange truncate block">{it.name}</Link>
                  <p className="text-[11.5px] text-slate">
                    {it.quantity} × {money(it.price, order.currency)}
                    {it.licenseType ? ` · ${LICENSE_LABEL[it.licenseType] ?? it.licenseType}` : ''}
                    {(it.options ?? []).filter((o: any) => o.name !== 'License').map((o: any) => ` · ${o.name}: ${o.value}`).join('')}
                  </p>
                </div>
                <span className="text-[13px] font-semibold text-carbon tabular-nums">{money(it.totalPrice, order.currency)}</span>
                {it.type === 'digital' && order.isPaid && it.status !== 'cancelled' && (
                  <div className="w-full sm:w-auto"><DigitalFileDownloads orderId={order._id} productId={it.productId} /></div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate mb-2"><MapPin size={12} /> Delivery address</p>
          {addr && Object.keys(addr).length ? (
            <p className="text-[13px] text-charcoal leading-relaxed">
              {addr.recipientName}{addr.phoneNumber ? ` · ${addr.phoneNumber}` : ''}<br />
              {[addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.zipCode].filter(Boolean).join(', ')}
            </p>
          ) : <p className="text-[13px] text-slate">Digital order — nothing to ship.</p>}
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate mb-2"><CreditCard size={12} /> Payment</p>
          <dl className="flex flex-col gap-1 text-[13px] tabular-nums">
            <div className="flex justify-between"><dt className="text-slate">Subtotal</dt><dd>{money(order.subtotal, order.currency)}</dd></div>
            {discounts.map(([l, v]) => <div key={l} className="flex justify-between"><dt className="text-slate">{l}</dt><dd className="text-success">−{money(v, order.currency)}</dd></div>)}
            <div className="flex justify-between"><dt className="text-slate">Shipping</dt><dd>{order.shippingFee ? money(order.shippingFee, order.currency) : 'Free'}</dd></div>
            {order.taxAmount > 0 && <div className="flex justify-between"><dt className="text-slate">Tax</dt><dd>{money(order.taxAmount, order.currency)}</dd></div>}
            <div className="flex justify-between border-t border-bone pt-1 mt-1 font-bold text-carbon"><dt>Total</dt><dd>{money(order.totalAmount, order.currency)}</dd></div>
          </dl>
        </Card>
      </div>

      {/* Item-level refund requests (reviewed by the seller / Edudeen). */}
      <RefundRequestPanel order={order} />
    </div>
  );
}
