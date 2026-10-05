import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package, Download, Truck, CheckCircle2, Clock, XCircle,
  ChevronDown, MapPin, Box, ShoppingBag,
  RotateCcw, Ban, Undo2, Star,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Card, EmptyState, Modal, Textarea, Button, SkeletonBox, PageHeader } from '@/components/comman/ui';
import {
  apiGetMyOrders, apiCancelOrder, apiRequestReturn,
  type OrderSummary, type OrderStatus, type OrderLineItem,
} from '@/api/services/orders';
import { DigitalFileDownloads } from '@/features/buyer/components/DigitalFileDownloads';
import { currencySymbol } from '@/utils/currency';
import { useToast } from '@/contexts/ToastContext';
import { buildOrderProgress, OrderProgressTrack } from './account/orderProgress';

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: typeof Clock; bg: string; text: string; border: string }> = {
  pending:    { label: 'Pending',    icon: Clock,        bg: '#FFF4DC', text: '#B36200', border: '#FDDFA0' },
  processing: { label: 'Processing', icon: RotateCcw,    bg: '#EEF0FF', text: '#3851D1', border: '#C7CEFF' },
  shipped:    { label: 'Shipped',    icon: Truck,        bg: '#E8F5FF', text: '#1A65A8', border: '#B3D8F7' },
  delivered:  { label: 'Delivered',  icon: CheckCircle2, bg: '#E3F4EA', text: '#1A6B35', border: '#A3D9B5' },
  completed:  { label: 'Completed',  icon: CheckCircle2, bg: '#E3F4EA', text: '#1A6B35', border: '#A3D9B5' },
  cancelled:  { label: 'Cancelled',  icon: XCircle,      bg: '#FFF0F0', text: '#C0392B', border: '#F5BCBC' },
};

const FILTER_TABS: { key: 'all' | OrderStatus; label: string }[] = [
  { key: 'all',        label: 'All'        },
  { key: 'pending',    label: 'Pending'    },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped',    label: 'Shipped'    },
  { key: 'delivered',  label: 'Delivered'  },
  { key: 'completed',  label: 'Completed'  },
  { key: 'cancelled',  label: 'Cancelled'  },
];

// The order-level enum also has 'partially_shipped' (not in the OrderStatus
// union) — fall back to a real label instead of crashing on an unknown key.
const PARTIALLY_SHIPPED = { label: 'Partially shipped', icon: Truck, bg: '#E8F5FF', text: '#1A65A8', border: '#B3D8F7' };

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg  = STATUS_CONFIG[status]
    ?? ((status as string) === 'partially_shipped'
      ? PARTIALLY_SHIPPED
      : { ...STATUS_CONFIG.pending, label: String(status).replace(/_/g, ' ') });
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-[5px] px-2.5 py-[4px] rounded-full text-[10px] font-bold border"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <Icon size={9} />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cancel / Return reason modal
// ─────────────────────────────────────────────────────────────────────────────
function ReasonModal({
  title, confirmLabel, onClose, onSubmit,
}: {
  title: string;
  confirmLabel: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const submit = async () => {
    if (!reason.trim()) { setError('Please provide a reason.'); return; }
    setError('');
    setSaving(true);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{confirmLabel}</Button>
        </>
      }
    >
      <Textarea
        label="Reason"
        rows={4}
        placeholder="Tell us why…"
        value={reason}
        onChange={e => setReason(e.target.value)}
      />
      {error && <p className="text-[12px] text-error mt-2">{error}</p>}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderTimeline
// ─────────────────────────────────────────────────────────────────────────────
// Real statuses only: unpaid orders show "Awaiting payment" (never
// "Confirmed"), and shipped/delivered come from the seller orders with their
// real shippedAt/deliveredAt timestamps — see account/orderProgress.tsx.
function OrderTimeline({ order }: { order: OrderSummary }) {
  const steps = buildOrderProgress({
    orderStatus:   order.orderStatus,
    isPaid:        order.isPaid,
    paymentType:   order.paymentType,
    paymentStatus: order.paymentStatus,
    createdAt:     order.createdAt,
    paidAt:        order.paidAt ?? null,
    stores:        order.stores,
  });
  if (!steps) return null;
  return <OrderProgressTrack steps={steps} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderItemRow
// ─────────────────────────────────────────────────────────────────────────────
const REVIEWABLE_STATUSES = ['delivered', 'completed'];

function OrderItemRow({ item, orderId, orderStatus, currency }: { item: OrderLineItem; orderId: string; orderStatus: OrderStatus; currency: string }) {
  const isDigital = item.type === 'digital';
  // Backend only accepts a verified review once the item is delivered/completed
  // (RatingService.checkVerifiedPurchase).
  const canReview = !!item.productId && item.status !== 'cancelled'
    && (REVIEWABLE_STATUSES.includes(item.status) || REVIEWABLE_STATUSES.includes(orderStatus));
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-bone last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className={clsx(
          'w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0',
          isDigital ? 'bg-[#eef0ff]' : 'bg-brand-pale-orange',
        )}>
          {isDigital ? <Download size={13} className="text-[#3851d1]" /> : <Package size={13} className="text-brand-orange" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-[2px]">
            <p className="text-[12px] font-semibold text-charcoal truncate">{item.name}</p>
            {isDigital && (
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-[1px] rounded-full bg-[#eef0ff] text-[#3851d1]">Digital</span>
            )}
            {item.status === 'cancelled' && (
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-[1px] rounded-full bg-[#fff0f0] text-error">Cancelled</span>
            )}
            {item.returnStatus && item.returnStatus !== 'none' && (
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-[1px] rounded-full bg-[#fff4dc] text-[#b36200] capitalize">
                Return {item.returnStatus.replace('_', ' ')}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate">SKU: {item.sku} · Qty: {item.quantity}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <p className="text-[12px] font-bold text-charcoal">{currencySymbol(currency)} {item.totalPrice.toLocaleString()}</p>
        {isDigital && item.productId && (
          <DigitalFileDownloads orderId={orderId} productId={item.productId} />
        )}
        {canReview && (
          <Link
            to={`/product/${item.productId}#write-review`}
            className="flex items-center gap-[5px] text-[11px] font-semibold text-brand-orange hover:underline"
          >
            <Star size={11} /> Write a review
          </Link>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FilterTabs
// ─────────────────────────────────────────────────────────────────────────────
function FilterTabs({
  active, counts, onChange,
}: {
  active: 'all' | OrderStatus;
  counts: Record<string, number>;
  onChange: (v: 'all' | OrderStatus) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap px-3 md:px-5 py-3 border-b border-bone">
      {FILTER_TABS.map(tab => {
        const count    = tab.key === 'all' ? counts.all : (counts[tab.key] ?? 0);
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={clsx(
              'flex items-center gap-1 px-3 py-[5px] rounded-[7px] text-[11px] font-semibold border cursor-pointer transition-all',
              isActive
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-white text-slate border-bone',
            )}
          >
            {tab.label}
            {count > 0 && (
              <span className={clsx(
                'min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center',
                isActive ? 'bg-white/25 text-white' : 'bg-bone text-charcoal',
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderCard
// ─────────────────────────────────────────────────────────────────────────────
function OrderCard({ order, onChanged }: { order: OrderSummary; onChanged: () => void }) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState<'cancel' | 'return' | null>(null);

  const items = (order.stores ?? []).flatMap(s => s.items ?? []);
  const allDigital = items.every(i => i.type === 'digital');
  const hasDigital = items.some(i => i.type === 'digital');

  const canCancel = ['pending', 'processing'].includes(order.orderStatus)
    && items.some(i => i.status !== 'cancelled');
  const canReturn = ['delivered', 'completed'].includes(order.orderStatus)
    && items.some(i => i.type === 'physical' && i.status !== 'cancelled' && (!i.returnStatus || i.returnStatus === 'none'));

  const addr = order.shippingAddress as Record<string, string> | undefined;

  return (
    <div className="border border-bone rounded-[12px] overflow-hidden bg-white">

      {/* Header — click to expand */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-start px-4 md:px-5 py-4 flex items-center gap-3 flex-wrap cursor-pointer bg-transparent border-none"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-[4px]">
            <span className="text-[13px] font-bold text-brand-deep-orange font-mono">{order.orderNumber}</span>
            <StatusBadge status={order.orderStatus} />
            {order.isPaid
              ? <span className="px-2 py-[3px] rounded-full text-[9px] font-bold bg-[#e3f4ea] text-[#1a6b35] border border-[#a3d9b5]">Paid</span>
              : <span className="px-2 py-[3px] rounded-full text-[9px] font-bold bg-[#fff0f0] text-error border border-[#f5bcbc]">Unpaid</span>
            }
            {hasDigital && (
              <span className="px-2 py-[3px] rounded-full text-[9px] font-bold bg-[#eef0ff] text-[#3851d1] border border-[#c7ceff]">Digital</span>
            )}
          </div>
          <p className="text-[11px] text-slate">
            {new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' · '}{items.length} item{items.length !== 1 ? 's' : ''}
            {' · '}{order.paymentType.replace(/_/g, ' ')}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-end">
            <p className="text-[10px] text-slate mb-[1px]">Total</p>
            <p className="text-[14px] font-bold text-carbon">{currencySymbol(order.currency)} {order.totalAmount.toLocaleString()}</p>
          </div>
          <div className={clsx(
            'w-7 h-7 rounded-full flex items-center justify-center bg-cream border border-bone transition-transform',
            expanded && 'rotate-180',
          )}>
            <ChevronDown size={13} className="text-slate" />
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-bone">

          {/* Items */}
          <div className="px-4 md:px-5 pt-4 pb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Box size={11} className="text-slate" />
              <p className="text-[10px] font-bold text-slate uppercase tracking-[0.07em]">Items ({items.length})</p>
            </div>
            {items.map((item, i) => (
              <OrderItemRow key={item.itemId ?? i} item={item} orderId={order.orderId} orderStatus={order.orderStatus} currency={order.currency} />
            ))}
          </div>

          {/* Delivery address */}
          {!allDigital && addr && (
            <div className="px-4 md:px-5 pb-4 pt-3 border-t border-bone">
              <div className="flex items-center gap-1.5 mb-3">
                <MapPin size={11} className="text-slate" />
                <p className="text-[10px] font-bold text-slate uppercase tracking-[0.07em]">Delivery Address</p>
              </div>
              <div className="bg-cream rounded-[9px] px-3 md:px-4 py-3">
                <p className="text-[12px] font-semibold text-charcoal">{addr.recipientName}</p>
                <p className="text-[11px] text-slate mt-[2px]">{addr.phoneNumber}</p>
                <p className="text-[11px] text-charcoal mt-[2px]">
                  {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                </p>
                <p className="text-[11px] text-charcoal">
                  {addr.city}, {addr.state} {addr.zipCode}
                </p>
              </div>
            </div>
          )}

          {/* Timeline */}
          {!allDigital && order.orderStatus !== 'cancelled' && (
            <div className="px-4 md:px-5 pb-4 pt-3 border-t border-bone">
              <p className="text-[10px] font-bold text-slate uppercase tracking-[0.07em] mb-4">Order Progress</p>
              <OrderTimeline order={order} />
            </div>
          )}

          {/* Shipment tracking — one entry per store that has shipped */}
          {order.stores?.some(s => s.tracking?.trackingNumber) && (
            <div className="px-4 md:px-5 pb-4 pt-3 border-t border-bone">
              <div className="flex items-center gap-1.5 mb-3">
                <Truck size={11} className="text-slate" />
                <p className="text-[10px] font-bold text-slate uppercase tracking-[0.07em]">Tracking</p>
              </div>
              <div className="flex flex-col gap-2">
                {order.stores.filter(s => s.tracking?.trackingNumber).map(s => (
                  <div key={s.storeId} className="bg-cream rounded-[9px] px-3 md:px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-charcoal">{s.tracking!.carrier || 'Courier'}</p>
                      <p className="text-[11px] text-slate font-mono break-all">{s.tracking!.trackingNumber}</p>
                    </div>
                    {s.tracking!.trackingUrl && /^https?:\/\//i.test(s.tracking!.trackingUrl) && (
                      <a
                        href={s.tracking!.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] font-semibold text-brand-orange hover:underline shrink-0"
                      >
                        Track package
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price summary */}
          <div className="px-4 md:px-5 py-3 bg-cream border-t border-bone flex flex-col gap-[6px]">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate">Subtotal</span>
              <span className="font-medium text-charcoal">{currencySymbol(order.currency)} {order.subtotal.toLocaleString()}</span>
            </div>
            {!allDigital && (
              <div className="flex justify-between text-[11px]">
                <span className="text-slate">Shipping</span>
                <span className="font-medium text-charcoal">
                  {order.shippingFee === 0 ? 'Free' : `${currencySymbol(order.currency)} ${order.shippingFee.toLocaleString()}`}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[13px] font-bold pt-2 border-t border-bone">
              <span className="text-charcoal">Total</span>
              <span className="text-carbon">{currencySymbol(order.currency)} {order.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-4 md:px-5 py-3 border-t border-bone flex items-center gap-2 justify-end flex-wrap">
              <Link
                to={`/account/orders/${order.orderId}`}
                className="me-auto flex items-center gap-[6px] px-3 py-[7px] rounded-[8px] text-[12px] font-semibold border border-bone bg-white text-charcoal no-underline"
              >
                Order details &amp; invoice
              </Link>
              {canReturn && (
                <button
                  onClick={() => setModal('return')}
                  className="flex items-center gap-[6px] px-3 py-[7px] rounded-[8px] text-[12px] font-semibold border border-bone bg-white text-charcoal cursor-pointer"
                >
                  <Undo2 size={12} /> Request Return
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => setModal('cancel')}
                  className="flex items-center gap-[6px] px-3 py-[7px] rounded-[8px] text-[12px] font-semibold border border-[#f5bcbc] bg-[#fff0f0] text-error cursor-pointer"
                >
                  <Ban size={12} /> Cancel Order
                </button>
              )}
          </div>
        </div>
      )}

      {modal === 'cancel' && (
        <ReasonModal
          title="Cancel Order"
          confirmLabel="Cancel Order"
          onClose={() => setModal(null)}
          onSubmit={async reason => {
            await apiCancelOrder(order.orderId, { reason });
            toast.success('Order cancelled');
            onChanged();
          }}
        />
      )}
      {modal === 'return' && (
        <ReasonModal
          title="Request Return"
          confirmLabel="Submit Request"
          onClose={() => setModal(null)}
          onSubmit={async reason => {
            await apiRequestReturn(order.orderId, { reason });
            toast.success('Return request submitted');
            onChanged();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrdersTab  — routed at /account/orders
// ─────────────────────────────────────────────────────────────────────────────
const ORDERS_PAGE_SIZE = 50;

export function OrdersTab() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<'all' | OrderStatus>(
    () => (searchParams.get('status') as OrderStatus | null) ?? 'all',
  );

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (activeFilter === 'all') next.delete('status');
    else next.set('status', activeFilter);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);
  const [orders, setOrders]   = useState<OrderSummary[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]     = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => { setPage(1); setRefreshKey(k => k + 1); }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGetMyOrders({ page: 1, limit: ORDERS_PAGE_SIZE })
      .then(res => {
        if (cancelled) return;
        setOrders(res.data.orders ?? []);
        setTotalOrders(res.data.pagination?.total ?? (res.data.orders ?? []).length);
        setPage(1);
      })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load orders.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const loadMore = () => {
    setLoadingMore(true);
    apiGetMyOrders({ page: page + 1, limit: ORDERS_PAGE_SIZE })
      .then(res => {
        setOrders(prev => [...prev, ...(res.data.orders ?? [])]);
        setPage(p => p + 1);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load more orders.'))
      .finally(() => setLoadingMore(false));
  };

  const hasMore = orders.length < totalOrders;

  const filtered = activeFilter === 'all'
    ? orders
    : orders.filter(o => o.orderStatus === activeFilter);

  const counts = {
    all:        orders.length,
    pending:    orders.filter(o => o.orderStatus === 'pending').length,
    processing: orders.filter(o => o.orderStatus === 'processing').length,
    shipped:    orders.filter(o => o.orderStatus === 'shipped').length,
    delivered:  orders.filter(o => o.orderStatus === 'delivered').length,
    completed:  orders.filter(o => o.orderStatus === 'completed').length,
    cancelled:  orders.filter(o => o.orderStatus === 'cancelled').length,
  };

  return (
    <div>
    <Card padding="none">
      {/* Header — desktop only; mobile's AccountLayout top bar already shows "Orders". */}
      <div className="hidden lg:block px-5 pt-5 pb-4 border-b border-bone">
        <PageHeader
          eyebrow="Account"
          title="Orders"
          description={`${totalOrders} order${totalOrders !== 1 ? 's' : ''} placed`}
        />
      </div>

      {/* Filter tabs */}
      <FilterTabs active={activeFilter} counts={counts} onChange={setActiveFilter} />

      {/* Content */}
      {loading ? (
        <div className="p-5 flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <SkeletonBox key={i} height={78} rounded="12px" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-[13px] text-error text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch}>Try again</Button>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={28} className="text-brand-orange opacity-55" />}
          title="No orders yet"
          description="Your order history will appear here once you make your first purchase."
          action={{ label: 'Browse resources', onClick: () => navigate('/'), icon: <ShoppingBag size={14} /> }}
          className="py-12"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={28} className="text-brand-orange opacity-55" />}
          title={`No ${activeFilter} orders`}
          description="No orders match this filter."
          className="py-10"
        />
      ) : (
        <div className="p-5 flex flex-col gap-3">
          {filtered.map(order => (
            <OrderCard key={order.orderId} order={order} onChanged={refetch} />
          ))}
          {activeFilter === 'all' && hasMore && (
            <Button
              variant="outline" size="sm"
              className="self-center mt-2 rounded-full!"
              onClick={loadMore}
              loading={loadingMore}
            >
              {loadingMore ? 'Loading…' : `Load more orders (${totalOrders - orders.length} remaining)`}
            </Button>
          )}
        </div>
      )}
    </Card>
    </div>
  );
}
