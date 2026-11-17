import { formatPrice } from '@/utils/formatPrice';
import type { CartItem } from '@/api/services/cart';
import type { PublicPaymentMethods } from '@/api/services/publicPlatformConfig';

/** Items counted BY QUANTITY (a line of 3 is 3 items). One rule for the cart text, the notice and the checkout button. */
export function sumQuantity(items: Pick<CartItem, 'quantity' | 'type'>[], type?: 'physical' | 'digital'): number {
  return items.reduce((s, i) => (!type || i.type === type ? s + (i.quantity || 0) : s), 0);
}

export const itemsLabel = (n: number): string => `${n} item${n === 1 ? '' : 's'}`;

/** One shipping label for the cart summary, checkout Step 1 and the order summary: a known fee is an amount or "Free"; an unknown one is never "Free". */
export function shippingFeeLabel(fee: number | null | undefined, currency?: string | null): string {
  if (fee == null || !Number.isFinite(fee)) return 'Calculated at checkout';
  return fee > 0 ? formatPrice(fee, currency ?? undefined) : 'Free';
}

/**
 * Can the buyer pay online (card or bank transfer / wallet) right now? Mirrors the checkout's own rule: card only counts when the
 * web has a Stripe key (isStripeConfigured), the other methods come from the server's public list. `null` = not known yet.
 */
export function hasUsableOnlinePayment(methods: PublicPaymentMethods | undefined | null, stripeReady: boolean): boolean | null {
  if (!methods) return null;
  return (!!methods.card && stripeReady) || !!methods.bankTransfer || !!methods.jazzcash || !!methods.easypaisa;
}
