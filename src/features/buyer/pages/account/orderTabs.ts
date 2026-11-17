import type { OrderStatus, OrderSummary } from '@/api/services/orders';

/** Tabs on /account/orders. `availed` = free/digital claims (no payment, never "pending"). */
export type OrderTab = 'all' | OrderStatus | 'availed';

export const ORDER_TABS: { key: OrderTab; label: string }[] = [
  { key: 'all',        label: 'All'        },
  { key: 'pending',    label: 'Pending'    },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped',    label: 'Shipped'    },
  { key: 'delivered',  label: 'Delivered'  },
  { key: 'completed',  label: 'Completed'  },
  { key: 'availed',    label: 'Availed'    },
  { key: 'cancelled',  label: 'Cancelled'  },
];

/**
 * THE one place that decides which tab an order belongs to. The tab filter and the tab counts both use it,
 * so a count always equals the list length. Display mapping only — status values are not changed.
 */
export function orderTab(o: Pick<OrderSummary, 'orderStatus' | 'isFreeClaim'>): Exclude<OrderTab, 'all'> {
  if (o.isFreeClaim && o.orderStatus !== 'cancelled') return 'availed';
  if ((o.orderStatus as string) === 'partially_shipped') return 'shipped';
  return o.orderStatus;
}

/** Short reference shown on the row (last 4 characters of the order number), e.g. "#6633". */
export const shortOrderId = (orderNumber: string) => `#${String(orderNumber ?? '').slice(-4)}`;

const STALE_COD_DAYS = 7;

/** Cash-on-delivery order still pending after 7 days: show a hint only (no automatic action). */
export function isStaleCod(o: Pick<OrderSummary, 'orderStatus' | 'paymentType' | 'isFreeClaim' | 'createdAt'>): boolean {
  if (o.isFreeClaim || o.orderStatus !== 'pending' || o.paymentType !== 'cash_on_delivery') return false;
  const t = new Date(o.createdAt).getTime();
  return Number.isFinite(t) && Date.now() - t > STALE_COD_DAYS * 24 * 60 * 60 * 1000;
}
