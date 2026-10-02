import { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  CheckCircle2, MapPin, Package, ShoppingBag, Download,
  ArrowRight, Home, Truck, Box, BadgeCheck, Star, ClipboardList,
} from 'lucide-react';
import type { PlacedOrder, OrderItem, OrderDeliveryAddress } from '@/api/services/payment';
import { DigitalFileDownloads } from '@/features/buyer/components/DigitalFileDownloads';
import { clsx } from 'clsx';
import { Button } from '@/components/comman/ui/Button';
import { BuyerNavbar, Footer } from '@/components/comman/ui';
import { currencySymbol } from '@/utils/currency';

// ─────────────────────────────────────────────────────────────────────────────
// OrderItemRow
// ─────────────────────────────────────────────────────────────────────────────
function OrderItemRow({ item, orderId, currency, canReview }: { item: OrderItem; orderId: string; currency: string; canReview: boolean }) {
  const isDigital = item.type === 'digital';
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-bone last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className={clsx(
          'w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0',
          isDigital ? 'bg-[#eef0ff]' : 'bg-brand-pale-orange',
        )}>
          {isDigital
            ? <Download size={14} className="text-[#3851d1]" />
            : <Package  size={14} className="text-brand-orange" />
          }
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-[2px]">
            <p className="text-[13px] font-semibold text-charcoal leading-tight truncate">{item.name}</p>
            {isDigital && (
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-[1px] rounded-full bg-[#eef0ff] text-[#3851d1] uppercase tracking-wide">
                Digital
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate">
            SKU: {item.sku} · Qty: {item.quantity}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <p className="text-[13px] font-bold text-charcoal">{currencySymbol(currency)}{item.totalPrice.toLocaleString()}</p>
        {isDigital && item.productId && (
          <DigitalFileDownloads orderId={orderId} productId={item.productId} />
        )}
        {isDigital && canReview && item.productId && (
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
// OrderItemsSection
// ─────────────────────────────────────────────────────────────────────────────
function OrderItemsSection({ items, orderId, currency, canReview }: { items: OrderItem[]; orderId: string; currency: string; canReview: boolean }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <Box size={13} className="text-slate" />
        <h3 className="text-[11px] font-bold text-slate uppercase tracking-[0.07em]">
          Items ({items.length})
        </h3>
      </div>
      <div>
        {items.map((item, i) => (
          <OrderItemRow key={i} item={item} orderId={orderId} currency={currency} canReview={canReview} />
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AddressSection
// ─────────────────────────────────────────────────────────────────────────────
function AddressSection({ addr }: { addr: OrderDeliveryAddress }) {
  return (
    <section className="pt-4 mt-1 border-t border-bone">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={13} className="text-slate" />
        <h3 className="text-[11px] font-bold text-slate uppercase tracking-[0.07em]">Delivery Address</h3>
      </div>
      <div className="bg-cream rounded-[10px] px-4 py-3 flex flex-col gap-[3px]">
        <p className="text-[13px] font-semibold text-charcoal">{addr.recipientName}</p>
        <p className="text-[12px] text-slate">{addr.phoneNumber}</p>
        <p className="text-[12px] text-charcoal">
          {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
        </p>
        <p className="text-[12px] text-charcoal">{addr.city}, {addr.state} {addr.zipCode}</p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderTimeline — shows status flow for physical orders
// ─────────────────────────────────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { icon: BadgeCheck, label: 'Confirmed' },
  { icon: Box,        label: 'Processing' },
  { icon: Truck,      label: 'Shipped' },
  { icon: Home,       label: 'Delivered' },
];

function OrderTimeline({ currentStatus }: { currentStatus: string }) {
  const activeIdx = currentStatus === 'completed' ? 3
    : currentStatus === 'shipped'    ? 2
    : currentStatus === 'processing' ? 1
    : 0;

  return (
    <section className="pt-4 mt-1 border-t border-bone">
      <h3 className="text-[11px] font-bold text-slate uppercase tracking-[0.07em] mb-4">Order Progress</h3>
      <div className="relative flex items-start justify-between">
        {/* track line */}
        <div className="absolute top-[13px] start-[13px] end-[13px] h-[2px] bg-bone rounded-full" />
        <div
          className="absolute top-[13px] start-[13px] h-[2px] bg-success rounded-full transition-all duration-500"
          style={{ width: `${(activeIdx / (TIMELINE_STEPS.length - 1)) * 100}%` }}
        />
        {TIMELINE_STEPS.map(({ icon: Icon, label }, i) => {
          const done   = i < activeIdx;
          const active = i === activeIdx;
          return (
            <div key={label} className="relative z-10 flex flex-col items-center gap-[6px]">
              <div className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center transition-all',
                done   ? 'bg-success text-white'
                : active ? 'bg-brand-orange text-white ring-4 ring-brand-pale-orange'
                : 'bg-bone text-slate',
              )}>
                <Icon size={13} />
              </div>
              <span className={clsx(
                'text-[10px] font-semibold whitespace-nowrap',
                done ? 'text-success' : active ? 'text-brand-orange' : 'text-slate',
              )}>{label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OrderCard
// ─────────────────────────────────────────────────────────────────────────────
function OrderCard({ order }: { order: PlacedOrder }) {
  const allDigital = order.items.every(i => i.type === 'digital');

  return (
    <article className="bg-white rounded-[14px] border border-bone overflow-hidden">

      {/* Card header */}
      <header className="px-5 py-4 border-b border-bone flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.08em] mb-[3px]">Order</p>
          <p className="text-[16px] font-bold text-brand-deep-orange font-mono leading-none">
            {order.orderNumber}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx(
            'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide',
            order.orderStatus === 'completed' ? 'bg-[#e3f4ea] text-[#1a6b35]'
            : order.orderStatus === 'cancelled' ? 'bg-error-bg text-error'
            : 'bg-[#fff4dc] text-[#b36200]',
          )}>
            {order.orderStatus}
          </span>
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-bone text-slate capitalize">
            {order.paymentMethod.replace(/_/g, ' ')}
          </span>
          {order.isPaid && (
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#e3f4ea] text-[#1a6b35]">
              Paid
            </span>
          )}
        </div>
      </header>

      {/* Card body */}
      <div className="px-5 py-4 flex flex-col gap-0">
        {/* Reviews are only accepted once an item is delivered/completed
            (RatingService.checkVerifiedPurchase) — for a paid digital order
            that's as soon as the order is marked completed. */}
        <OrderItemsSection
          items={order.items} orderId={order.orderId} currency={order.currency}
          canReview={order.isPaid && order.orderStatus === 'completed'}
        />
        {!allDigital && order.deliveryAddress && <AddressSection addr={order.deliveryAddress} />}
        {!allDigital && <OrderTimeline currentStatus={order.orderStatus} />}
      </div>

      {/* Price footer — always the order's own real charged currency
          (never the buyer's current display preference, which may have
          changed since this order was placed). */}
      <footer className="px-5 py-4 bg-cream border-t border-bone">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[12px]">
            <span className="text-slate">Subtotal</span>
            <span className="font-medium text-charcoal">{currencySymbol(order.currency)}{order.summary.subtotal.toLocaleString()}</span>
          </div>
          {!allDigital && (
            <div className="flex justify-between text-[12px]">
              <span className="text-slate">Shipping</span>
              <span className="font-medium text-charcoal">
                {order.summary.shipping === 0 ? 'Free' : `${currencySymbol(order.currency)}${order.summary.shipping.toLocaleString()}`}
              </span>
            </div>
          )}
          <div className="flex justify-between text-[14px] font-bold pt-2 border-t border-bone">
            <span className="text-charcoal">Total</span>
            <span className="text-charcoal">{currencySymbol(order.currency)}{order.summary.total.toLocaleString()}</span>
          </div>
        </div>
      </footer>

    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SuccessHero
// ─────────────────────────────────────────────────────────────────────────────
function SuccessHero({ orders }: { orders: PlacedOrder[] }) {
  const firstDate   = orders[0]?.orderDate;
  const totalItems  = orders.reduce((s, o) => s + o.items.length, 0);
  const hasDigital  = orders.some(o => o.items.some(i => i.type === 'digital'));
  const hasPhysical = orders.some(o => o.items.some(i => i.type === 'physical'));

  return (
    <div className="bg-white rounded-[16px] border border-bone px-4 md:px-8 py-6 md:py-8 flex flex-col items-center text-center">

      {/* Icon */}
      <div className="relative mb-5">
        <div className="w-[72px] h-[72px] rounded-full bg-success-bg flex items-center justify-center">
          <CheckCircle2 size={38} className="text-success" />
        </div>
        <div className="absolute -top-1 -end-1 w-6 h-6 rounded-full bg-brand-orange flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">{orders.length}</span>
        </div>
      </div>

      {/* Text */}
      <h1 className="text-[24px] font-bold text-carbon leading-tight mb-2">
        Order Confirmed!
      </h1>
      <p className="text-[13px] text-slate leading-[1.7] max-w-[360px] mb-5">
        {hasPhysical && hasDigital
          ? "Your physical items will be shipped and digital products are ready to download."
          : hasDigital
          ? "Your digital products are ready — download them from the cards below."
          : "We'll notify you once your order is packed and on its way."
        }
      </p>

      {/* Meta chips */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {firstDate && (
          <div className="flex items-center gap-1.5 px-4 py-[7px] bg-cream rounded-[8px] border border-bone">
            <span className="text-[11px] text-slate">Placed</span>
            <span className="text-[11px] font-semibold text-charcoal">
              {new Date(firstDate).toLocaleDateString('en-PK', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              })}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-4 py-[7px] bg-cream rounded-[8px] border border-bone">
          <Package size={11} className="text-slate" />
          <span className="text-[11px] font-semibold text-charcoal">
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </span>
        </div>
        {hasDigital && (
          <div className="flex items-center gap-1.5 px-4 py-[7px] bg-[#eef0ff] rounded-[8px] border border-[#c7ceff]">
            <Download size={11} className="text-[#3851d1]" />
            <span className="text-[11px] font-semibold text-[#3851d1]">Ready to download</span>
          </div>
        )}
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SummaryPanel — sticky right sidebar
// ─────────────────────────────────────────────────────────────────────────────
function SummaryPanel({ orders, navigate }: { orders: PlacedOrder[]; navigate: (p: string) => void }) {
  const grandTotal = orders.reduce((s, o) => s + o.summary.total, 0);

  return (
    <aside className="bg-white rounded-[14px] border border-bone overflow-hidden lg:sticky top-[76px]">

      <div className="px-5 py-4 border-b border-bone">
        <p className="text-[13px] font-bold text-charcoal">Order Summary</p>
        <p className="text-[11px] text-slate mt-[2px]">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
      </div>

      <div className="px-5 py-4 flex flex-col gap-3 border-b border-bone">
        {orders.map(order => (
          <div key={order.orderId} className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-brand-deep-orange font-mono leading-tight">{order.orderNumber}</p>
              <p className="text-[10px] text-slate mt-[1px]">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
            </div>
            <p className="text-[12px] font-semibold text-charcoal shrink-0">{currencySymbol(order.currency)}{order.summary.total.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 flex justify-between items-center border-b border-bone">
        <span className="text-[13px] font-bold text-charcoal">Grand Total</span>
        <span className="text-[15px] font-bold text-carbon">{currencySymbol(orders[0]?.currency)}{grandTotal.toLocaleString()}</span>
      </div>

      <div className="px-5 py-4 flex flex-col gap-2">
        <Button
          variant="primary" fullWidth
          className="justify-center! px-4! py-[11px]! rounded-[10px]!"
          icon={<ShoppingBag size={14} />}
          onClick={() => navigate('/')}
        >
          Continue Shopping
        </Button>
        <Button
          variant="outline" fullWidth
          className="justify-center! px-4! py-[11px]! rounded-[10px]!"
          icon={<ClipboardList size={14} />}
          iconRight={<ArrowRight size={13} />}
          onClick={() => navigate('/account/orders')}
        >
          View My Orders
        </Button>
      </div>

    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
// The last successful order(s) are kept for this tab's session so a refresh
// (which drops router `location.state`) still shows the confirmation instead
// of bouncing the buyer to the homepage.
const LAST_ORDER_KEY = 'edudeen_last_order_success';

function readStoredOrders(): PlacedOrder[] {
  try {
    const raw = sessionStorage.getItem(LAST_ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as PlacedOrder[]) : [];
  } catch {
    return [];
  }
}

function storeOrders(orders: PlacedOrder[]) {
  try { sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(orders)); } catch { /* storage unavailable — refresh just won't restore */ }
}

export function OrderSuccessPage() {
  usePageTitle('Order Confirmed');
  const navigate = useNavigate();
  const location = useLocation();
  const stateOrders = (location.state as { orders?: PlacedOrder[] } | null)?.orders;
  const orders = useMemo<PlacedOrder[]>(
    () => (stateOrders && stateOrders.length > 0 ? stateOrders : readStoredOrders()),
    [stateOrders],
  );

  useEffect(() => {
    if (stateOrders && stateOrders.length > 0) storeOrders(stateOrders);
  }, [stateOrders]);

  useEffect(() => {
    if (orders.length === 0) navigate('/', { replace: true });
  }, [orders.length, navigate]);

  if (orders.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-cream">

      <BuyerNavbar variant="minimal" />

      {/* Content */}
      <div className="max-w-[1040px] mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

          {/* Left — hero + order cards */}
          <div className="flex flex-col gap-5">
            <SuccessHero orders={orders} />
            {orders.map(order => (
              <OrderCard key={order.orderId} order={order} />
            ))}
          </div>

          {/* Right — sticky summary */}
          <SummaryPanel orders={orders} navigate={navigate} />

        </div>
      </div>

      <Footer />
    </div>
  );
}
