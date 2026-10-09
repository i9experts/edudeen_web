import type { Cart, CartItem } from '@/api/services/cart';

type Convert = (amount: number, fromCurrency?: string | null) => number;

export interface CartTotals {
  /** sum of the lines, in the display currency */
  subtotal: number;
  /** the running sale taken off the subtotal, in the display currency (0 when none) */
  campaignAmount: number;
  payable: number;
}

/**
 * One definition of "cart subtotal, sale discount, payable" used by the Cart page AND the checkout sidebar before the
 * checkout exists (steps 1-2), so the numbers cannot differ between them. Same rule the server applies at checkout:
 * a percentage sale takes that % off the subtotal; a fixed sale takes its amount (a value in the campaign's own
 * currency, USD unless stated) converted to the display currency, capped at the subtotal.
 */
export function computeCartTotals(items: CartItem[], campaign: Cart['campaignDiscount'] | null | undefined, convert: Convert): CartTotals {
  const subtotal = items.reduce((s, i) => {
    const unit = i.unitPrice ?? i.price ?? 0;
    const lineTotal = i.itemTotal ?? unit * i.quantity;
    return s + convert(lineTotal, i.currency);
  }, 0);
  const campaignAmount = !campaign || !campaign.discountType || campaign.discountValue == null ? 0
    : Math.min(subtotal, campaign.discountType === 'percentage'
      ? subtotal * (campaign.discountValue / 100)
      : convert(campaign.discountValue, campaign.valueCurrency ?? 'USD'));
  return { subtotal, campaignAmount, payable: Math.max(0, subtotal - campaignAmount) };
}
