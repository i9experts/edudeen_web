import type { PublicStoreProduct } from '@/api/services/store';
import { variantPriceView } from '@/utils/saleMath';
import { isValidRailProduct } from '@/features/buyer/components/home/homeRules';

export interface StoreCardPrice {
  /** Amount the buyer pays now, in `currency` (the variant that Add to cart sends). */
  price:    number;
  was:      number | null;
  pct:      number;
  currency: string;
  /** False for bad data (price 0 with a strike price): the card is not shown. */
  valid:    boolean;
}

/** Storefront card price from the SAME variant the cart button adds, with the same fields the cart prices from. */
export function storeCardPrice(p: PublicStoreProduct, baseCurrency: string): StoreCardPrice {
  const list = p.variants ?? [];
  const v = list.find(x => x._id === p.variantId) ?? list.find(x => x.isDefault) ?? list[0];
  if (!v) {
    // Older API without variants[]: keep the flat cheapest price, no sale.
    return { price: p.defaultVariantPrice ?? 0, was: null, pct: 0, currency: baseCurrency, valid: true };
  }
  const view = variantPriceView(v);
  return { ...view, currency: v.currency || baseCurrency, valid: isValidRailProduct({ variants: [v] }) };
}
