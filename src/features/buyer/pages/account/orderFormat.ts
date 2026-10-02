import type { OrderDetail } from '@/api/services/orders';
import { currencySymbol } from '@/utils/currency';

export const money = (n: number | undefined, currency: string) =>
  `${currencySymbol(currency)} ${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: currency === 'PKR' ? 0 : 2 })}`;

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
