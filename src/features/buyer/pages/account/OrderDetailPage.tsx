import { useEffect, useState } from 'react';
import { safeHttpUrl } from '@/utils/safeRedirect';
import { ProductCoverFallback } from '@/components/comman/marketplace/ProductCoverFallback';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Truck, Package, Download, MapPin, CreditCard, MessageSquare, RotateCcw, Ban } from 'lucide-react';
import { Card, SkeletonBox, Button, StatusBadge } from '@/components/comman/ui';
import { apiGetOrderById, apiCancelOrder, type OrderDetail, type OrderLineItem } from '@/api/services/orders';
import { apiStartConversation } from '@/api/services/messaging';
import { apiAddToCart } from '@/api/services/cart';
import { useToast } from '@/contexts/ToastContext';
import { ReasonModal } from '../MyOrdersPage';
import { getStorePagePath } from '@/utils/storefrontUrl';
import { money, discountLines } from './orderFormat';
import { LICENSE_LABEL } from '@/constants/learning';
import { DigitalFileDownloads } from '@/features/buyer/components/DigitalFileDownloads';
import { RefundRequestPanel } from '@/features/buyer/components/RefundRequestPanel';
import { OrderNextStep, OrderProgressTrack, buildOrderProgress } from './orderProgress';
import { formatAddressLine, formatPhone } from '@/utils/formatAddress';

const PAYMENT_LABEL: Record<string, string> = {
  stripe: 'Card', cash_on_delivery: 'Cash on delivery', manual_bank_transfer: 'Bank transfer',
};

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : null);

/** One store's part of the order, as a step-by-step timeline with dates. */
function Timeline({ order, so }: { order: OrderDetail; so: OrderDetail['sellerOrders'][number] }) {
  if (so.status === 'cancelled') return <p className="text-[12.5px] text-error">This part of the order was cancelled.</p>;
  // Same step config as the orders list (account/orderProgress), scoped to this store's part of the order.
  const steps = buildOrderProgress({
    orderStatus: order.orderStatus, isPaid: order.isPaid, paymentType: order.paymentType, paymentStatus: order.paymentStatus,
    createdAt: order.createdAt, paidAt: order.paidAt ?? null, stores: [so],
  });
  return steps ? <OrderProgressTrack steps={steps} /> : null;
}

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState<'contact' | 'again' | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    apiGetOrderById(orderId)
      .then(res => { if (alive) setOrder(res.data); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load this order.'); });
    return () => { alive = false; };
  }, [orderId, reloadKey]);

  const contactSeller = async (storeId: string) => {
    setBusy('contact');
    try {
      const conv = await apiStartConversation({ storeId });
      navigate(`/account/messages?conversation=${conv._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the conversation.');
    } finally { setBusy(null); }
  };

  const buyAgain = async () => {
    if (!order) return;
    setBusy('again');
    let added = 0;
    try {
      for (const so of order.sellerOrders) {
        for (const it of so.items as (OrderLineItem & { variantId?: string | null })[]) {
          if (!it.productId || !it.variantId) continue;
          await apiAddToCart(it.productId, it.variantId, so.storeId, it.quantity ?? 1);
          added += 1;
        }
      }
      if (added === 0) { toast.error('These items can no longer be added to your cart.'); return; }
      navigate('/cart');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the items to your cart.');
    } finally { setBusy(null); }
  };

  if (error) {
    return (
      <Card>
        <p className="text-[13px] text-error mb-3">{error}</p>
        <Button variant="outline" size="sm" to={'/account/orders'}>Back to orders</Button>
      </Card>
    );
  }
  if (!order) return <div className="flex flex-col gap-3"><SkeletonBox height={90} rounded="12px" /><SkeletonBox height={220} rounded="12px" /></div>;

  const addr = order.shippingAddress as Record<string, string> | null;
  const discounts = discountLines(order);
  const canCancel = ['pending', 'processing'].includes(order.orderStatus)
    && order.sellerOrders.some(so => (so.items ?? []).some(i => i.status !== 'cancelled'));
  const sellers = order.sellerOrders.filter(so => so.storeId);

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

      <div className="flex flex-wrap gap-2">
        {sellers.length === 1 && (
          <Button variant="outline" size="sm" icon={<MessageSquare size={13} />} loading={busy === 'contact'} onClick={() => void contactSeller(sellers[0].storeId)}>Contact seller</Button>
        )}
        <Button variant="outline" size="sm" icon={<RotateCcw size={13} />} loading={busy === 'again'} onClick={() => void buyAgain()}>Buy again</Button>
        {canCancel && <Button variant="danger" size="sm" icon={<Ban size={13} />} onClick={() => setCancelling(true)}>Cancel order</Button>}
      </div>

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
                {safeHttpUrl(so.tracking.trackingUrl) && <a href={safeHttpUrl(so.tracking.trackingUrl)} target="_blank" rel="noreferrer" className="text-brand-orange font-semibold ms-1">Track package</a>}
              </span>
            )}
          </div>
          <div className="px-4 md:px-5 py-4 border-b border-bone">
            <Timeline order={order} so={so} />
            <OrderNextStep input={{ orderStatus: so.status === 'cancelled' ? 'cancelled' : order.orderStatus, isPaid: order.isPaid, paymentType: order.paymentType, paymentStatus: order.paymentStatus, stores: [so], shippingEstimate: order.shippingEstimate ?? null }} />
            {Array.isArray((so as any).trackingEvents) && (so as any).trackingEvents.length > 0 && (
              <div className="mt-4 pt-3 border-t border-bone">
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1.5">Courier updates</p>
                <ul className="flex flex-col gap-1 list-none p-0 m-0">
                  {[...(so as any).trackingEvents].reverse().map((ev: any, i: number) => (
                    <li key={i} className="flex flex-wrap justify-between gap-x-3 text-[12.5px]">
                      <span className="text-carbon">{ev.description || ev.status}{ev.location ? ` · ${ev.location}` : ''}</span>
                      <span className="text-slate">{ev.at ? fmt(ev.at) : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <ul className="divide-y divide-[#f5f4ef] list-none p-0 m-0">
            {so.items.map((it: any, i: number) => (
              <li key={it._id ?? i} className="flex flex-wrap items-center gap-3 px-4 md:px-5 py-3">
                {it.image ? <img src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-bone shrink-0" /> : <ProductCoverFallback name={it.name} size="xs" className="w-12 h-12 rounded-lg shrink-0" />}
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${it.productId}`} className="text-[13px] font-semibold text-carbon no-underline hover:text-brand-orange truncate block">{it.name}</Link>
                  <p className="text-[12px] text-slate">
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
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-2"><MapPin size={12} /> Delivery address</p>
          {addr && Object.keys(addr).length ? (
            <p className="text-[13px] text-charcoal leading-relaxed">
              {addr.recipientName}{addr.phoneNumber ? ` · ${formatPhone(addr.phoneNumber)}` : ''}<br />
              {formatAddressLine(addr)}
            </p>
          ) : <p className="text-[13px] text-slate">Digital order — nothing to ship.</p>}
        </Card>
        <Card>
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-2"><CreditCard size={12} /> Payment</p>
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

      {cancelling && (
        <ReasonModal
          title="Cancel Order"
          confirmLabel="Cancel Order"
          onClose={() => setCancelling(false)}
          onSubmit={async reason => {
            await apiCancelOrder(order._id, { reason });
            toast.success('Order cancelled');
            setReloadKey(k => k + 1);
          }}
        />
      )}
    </div>
  );
}
