import type { OrderDetail } from '@/api/services/orders';
import { formatPrice } from '@/utils/formatPrice';

export const money = (n: number | undefined, currency: string) =>
  formatPrice(n ?? 0, currency);

/** Discount lines that actually apply, for the totals box and the invoice. */
export function discountLines(o: OrderDetail): [string, number][] {
  return ([
    [`Coupon${o.couponCode ? ` (${o.couponCode})` : ''}`, o.couponDiscountTotal ?? 0],
    ['Gift card', o.giftCardDiscountTotal ?? 0],
    ['Sale discount', o.campaignDiscountTotal ?? 0],
    ['Store / bundle discount', o.autoDiscountTotal ?? 0],
    ['Member price', o.subscriberDiscountTotal ?? 0],
  ] as [string, number][]).filter(([, v]) => v > 0);
}
