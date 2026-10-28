import type { Cart, CartItem } from '@/api/services/cart';

type Convert = (amount: number, fromCurrency?: string | null) => number;

export interface CartTotals {
  /** sum of the lines, in the display currency */
  subtotal: number;
  /** the running sale taken off the subtotal, in the display currency (0 when none; NEGATIVE = added back because the
   *  sale price replaced a deeper seller sale) */
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
  const lineOf = (i: CartItem) => {
    const unit = i.unitPrice ?? i.price ?? 0;
    return convert(i.itemTotal ?? unit * i.quantity, i.currency);
  };
  const subtotal = items.reduce((s, i) => s + lineOf(i), 0);
  // Per-product participation: the sale covers only lines the API flagged `onCampaign` (an older API that does not
  // send the flag at all means the whole cart, as before).
  const flagged = items.some((i) => i.onCampaign !== undefined);
  const eligibleSubtotal = flagged ? items.reduce((s, i) => (i.onCampaign ? s + lineOf(i) : s), 0) : subtotal;
  // The server already priced every line (incl. a seller's own sale being suspended): trust its figure when present.
  const campaignAmount = campaign && typeof campaign.adjust === 'number' ? convert(campaign.adjust, campaign.currency)
    : !campaign || !campaign.discountType || campaign.discountValue == null ? 0
    : Math.min(eligibleSubtotal, campaign.discountType === 'percentage'
      ? eligibleSubtotal * (campaign.discountValue / 100)
      : convert(campaign.discountValue, campaign.valueCurrency ?? 'USD'));
  return { subtotal, campaignAmount, payable: Math.max(0, subtotal - campaignAmount) };
}
