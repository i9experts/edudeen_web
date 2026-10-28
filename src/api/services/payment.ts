import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CodPaymentPayload {
  checkoutId: string;
}

export interface OrderDeliveryAddress {
  recipientName: string;
  phoneNumber:   string;
  addressLine1:  string;
  addressLine2:  string | null;
  city:          string;
  state:         string;
  zipCode:       string;
}

export interface OrderItem {
  name:         string;
  image:        string | null;
  sku:          string;
  productId?:   string;
  quantity:     number;
  price:        number;
  totalPrice:   number;
  type:         string;
  downloadUrl?: string;
}

export interface OrderSummary {
  subtotal: number;
  shipping: number;
  total:    number;
}

export interface PlacedOrder {
  orderId:         string;
  orderNumber:     string;
  orderDate:       string;
  paymentDate:     string | null;
  paymentMethod:   string;
  isPaid:          boolean;
  orderStatus:     string;
  /** The currency this order was actually placed/charged in — permanent,
   *  never re-derived from the buyer's current display preference. */
  currency:        string;
  deliveryAddress: OrderDeliveryAddress;
  /** Zone delivery estimate text snapshotted at checkout (e.g. '2-3 days'); absent for digital orders. */
  shippingEstimate?: string | null;
  items:           OrderItem[];
  summary:         OrderSummary;
}

interface CodPaymentResponse {
  success: boolean;
  message: string;
  data: {
    orders: PlacedOrder[];
  };
}

export interface InitiatePaymentResponse {
  success: boolean;
  message: string;
  data: {
    clientSecret:    string;
    paymentIntentId: string;
    amount:          number;
    currency:        string;
  };
}

export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface PaymentStatusResponse {
  success: boolean;
  data: {
    status: PaymentStatus;
    orders: PlacedOrder[];
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

// Idempotency-Key: one placement per checkout can only ever happen once, so the key is stable
// per (action, checkout). A timed-out request that is retried (or a double tap that slips past
// the UI guard) is then answered from the stored result instead of running twice. The server
// never caches failures, so a genuine retry after an error still works.
const SESSION_ID = (() => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* fall through */ }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
})();

// Card / hosted attempts: the server caches the initiate response (a clientSecret) for 24 h and the
// intent is cancelled once the checkout is placed another way, so those keys also carry a
// page-load id — a later visit can never be handed a stale clientSecret or gateway redirect.
const keyFor = (action: string, checkoutId: string, extra = '') =>
  `${action}:${checkoutId}${extra ? `:${extra}` : ''}`.slice(0, 200);

export function apiPlaceCodOrder(payload: CodPaymentPayload) {
  return client.post<never, CodPaymentResponse>(ENDPOINTS.PAYMENT.COD, payload, {
    headers: { 'Idempotency-Key': keyFor('cod', payload.checkoutId) },
  });
}

/** POST /api/payment/free-checkout — confirms an order whose grand total is exactly 0 (no payment). */
export function apiPlaceFreeOrder(payload: CodPaymentPayload) {
  return client.post<never, CodPaymentResponse>(ENDPOINTS.PAYMENT.FREE_CHECKOUT, payload, {
    headers: { 'Idempotency-Key': keyFor('free', payload.checkoutId) },
  });
}

/** POST /api/payment/initiate-payment — creates (or reuses) a Stripe PaymentIntent
 *  for a checkout. Returns a clientSecret for Stripe Elements/PaymentElement.
 *  `paymentMode: 'split'` (mixed carts only) charges just the digital-items
 *  subtotal now, leaving the physical items to be settled via COD. Omit or
 *  pass 'full' to charge the whole checkout, same as before this existed. */
export function apiInitiatePayment(payload: { checkoutId: string; paymentMode?: 'full' | 'split' }, amountHint?: number) {
  // amountHint (checkout total) keeps a coupon / gift-card / gift-wrap change from replaying a cached intent for the old amount.
  const key = keyFor('init', payload.checkoutId, `${payload.paymentMode ?? 'full'}:${amountHint ?? ''}:${SESSION_ID}`);
  return client.post<never, InitiatePaymentResponse>(ENDPOINTS.PAYMENT.INITIATE_PAYMENT, payload, {
    headers: { 'Idempotency-Key': key },
  });
}

/** GET /api/payment/status — poll after stripe.confirmPayment() resolves client-side.
 *  Actively re-checks Stripe and finalizes the order if the webhook hasn't landed yet. */
export function apiGetPaymentStatus(checkoutId: string) {
  return client.get<never, PaymentStatusResponse>(`${ENDPOINTS.PAYMENT.STATUS}?checkoutId=${checkoutId}`);
}

export type HostedProvider = 'jazzcash' | 'easypaisa';
export const HOSTED_PROVIDERS: HostedProvider[] = ['jazzcash', 'easypaisa'];
export const isHostedProvider = (m: string | null | undefined): m is HostedProvider => !!m && (HOSTED_PROVIDERS as string[]).includes(m);

export interface HostedRedirect {
  method: 'GET' | 'POST';
  url: string;
  fields: Record<string, string>;
  txnRef: string;
  amount: number;
  currency: string;
}

/** POST /api/payment/pk/:provider/initiate: the browser then submits `fields` to `url` (the gateway's hosted page). */
export function apiStartPkPayment(provider: HostedProvider, checkoutId: string) {
  const key = keyFor(`pk-${provider}`, checkoutId, SESSION_ID);
  return client.post<never, { success: boolean; data: HostedRedirect }>(`/api/payment/pk/${provider}/initiate`, { checkoutId }, {
    headers: { 'Idempotency-Key': key },
  });
}
