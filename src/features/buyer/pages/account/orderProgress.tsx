import { clsx } from 'clsx';
import { BadgeCheck, Box, Truck, CheckCircle2, Clock, ClipboardCheck, type LucideIcon } from 'lucide-react';

// Real order progress, derived only from what the order actually records:
//   Placed → Paid / Confirmed (COD) / Awaiting payment → Processing → Shipped → Delivered
// The order-level `orderStatus` enum is pending | processing | partially_shipped
// | completed | cancelled — shipped/delivered live on each seller order, so
// those (and their shippedAt/deliveredAt timestamps) come from `stores`.

export interface ProgressStoreInput {
  status:       string;
  fulfillmentType?: string;
  items?:       { type?: string }[];
  shippedAt?:   string | null;
  deliveredAt?: string | null;
}

export interface ProgressInput {
  orderStatus:    string;
  isPaid:         boolean;
  paymentType?:   string | null;   // 'cash_on_delivery' | 'stripe' | 'manual_bank_transfer'
  paymentStatus?: string | null;   // 'unpaid' | 'pending_verification' | 'paid' | ...
  createdAt?:     string | null;
  paidAt?:        string | null;
  stores?:        ProgressStoreInput[];
}

export interface ProgressStep {
  key:   string;
  label: string;
  icon:  LucideIcon;
  date:  string | null;
  hint?: string;
  state: 'done' | 'active' | 'todo';
}

const FULFILMENT_RANK: Record<string, number> = {
  pending: 0, processing: 1, partially_shipped: 1, shipped: 2, delivered: 3, completed: 3,
};

function latest(dates: (string | null | undefined)[]): string | null {
  const valid = dates.filter((d): d is string => !!d && !Number.isNaN(new Date(d).getTime()));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
}

function isPhysicalStore(s: ProgressStoreInput) {
  if (s.fulfillmentType === 'digital') return false;
  if (s.items && s.items.length > 0 && s.items.every(i => i.type === 'digital')) return false;
  return true;
}

/** Returns `null` for a cancelled order (callers show a cancelled state instead). */
export function buildOrderProgress(o: ProgressInput): ProgressStep[] | null {
  if (o.orderStatus === 'cancelled') return null;

  const isCod = o.paymentType === 'cash_on_delivery';
  const paymentDone = o.isPaid || isCod;
  const paymentStep: ProgressStep = o.isPaid
    ? { key: 'payment', label: 'Paid', icon: BadgeCheck, date: o.paidAt ?? null, state: 'done' }
    : isCod
      ? { key: 'payment', label: 'Confirmed', icon: BadgeCheck, date: null, hint: 'Pay on delivery', state: 'done' }
      : o.paymentStatus === 'pending_verification'
        ? { key: 'payment', label: 'Verifying payment', icon: Clock, date: null, state: 'active' }
        : { key: 'payment', label: 'Awaiting payment', icon: Clock, date: null, state: 'active' };

  // Furthest point EVERY live physical seller order has reached.
  const live = (o.stores ?? []).filter(s => s.status !== 'cancelled' && isPhysicalStore(s));
  let rank: number;
  if (o.orderStatus === 'completed') rank = 3;
  else if (live.length > 0) rank = Math.min(...live.map(s => FULFILMENT_RANK[s.status] ?? 0));
  else rank = FULFILMENT_RANK[o.orderStatus] ?? 0;

  const shippedAt   = rank >= 2 ? latest(live.map(s => s.shippedAt)) : null;
  const deliveredAt = rank >= 3 ? latest(live.map(s => s.deliveredAt)) : null;

  const steps: ProgressStep[] = [
    { key: 'placed', label: 'Placed', icon: ClipboardCheck, date: o.createdAt ?? null, state: 'done' },
    paymentStep,
    { key: 'processing', label: 'Processing', icon: Box,          date: null,        state: 'todo' },
    { key: 'shipped',    label: 'Shipped',    icon: Truck,        date: shippedAt,   state: 'todo' },
    { key: 'delivered',  label: 'Delivered',  icon: CheckCircle2, date: deliveredAt, state: 'todo' },
  ];

  if (!paymentDone) return steps; // nothing ships before payment

  // Current fulfilment step: pending/processing → Processing, shipped → Shipped, delivered/completed → Delivered.
  const currentIdx = rank >= 3 ? 4 : rank === 2 ? 3 : 2;
  for (let i = 2; i < steps.length; i++) {
    if (i < currentIdx) steps[i].state = 'done';
    else if (i === currentIdx) steps[i].state = i === 4 ? 'done' : 'active';
  }
  return steps;
}

function fmt(d: string | null) {
  if (!d) return null;
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/** Horizontal step track — same visual language the order pages already used. */
export function OrderProgressTrack({ steps }: { steps: ProgressStep[] }) {
  const lastReached = steps.reduce((idx, s, i) => (s.state !== 'todo' ? i : idx), 0);
  return (
    <div className="relative flex items-start justify-between pt-1">
      <div className="absolute top-[13px] start-[13px] end-[13px] h-[2px] bg-bone rounded-full" />
      <div
        className="absolute top-[13px] start-[13px] h-[2px] bg-success rounded-full transition-all duration-500"
        style={{ width: `calc(${(lastReached / (steps.length - 1)) * 100}% - ${(lastReached / (steps.length - 1)) * 26}px)` }}
      />
      {steps.map(({ key, icon: Icon, label, date, hint, state }) => {
        const when = fmt(date);
        return (
          <div key={key} className="relative z-10 flex flex-col items-center gap-[6px] min-w-0">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center transition-all',
              state === 'done'   ? 'bg-success text-white'
              : state === 'active' ? 'bg-brand-orange text-white ring-4 ring-brand-pale-orange'
              : 'bg-bone text-slate',
            )}>
              <Icon size={13} />
            </div>
            <span className={clsx(
              'text-[10px] font-semibold whitespace-nowrap',
              state === 'done' ? 'text-success' : state === 'active' ? 'text-brand-orange' : 'text-slate',
            )}>{label}</span>
            {(when || hint) && (
              <span className="text-[9.5px] text-slate whitespace-nowrap -mt-[4px]">{when ?? hint}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
