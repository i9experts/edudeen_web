import { apiAddToCart } from '@/api/services/cart';
import type { OrderLineItem } from '@/api/services/orders';

export interface ReorderResult { added: number; skipped: string[] }
export type ReorderGroup = { storeId: string; items?: OrderLineItem[] };

/** True when every non-cancelled line already carries its variantId (list rows from the newer API), so no extra fetch is needed. */
export const hasVariantIds = (groups: ReorderGroup[]) =>
  groups.every(g => (g.items ?? []).every(i => i.status === 'cancelled' || !!i.variantId));

/** Buy again: adds each line of an order to the cart (existing add-to-cart). A line that cannot be added (e.g. out of stock) is skipped and reported by name. */
export async function reorderItems(groups: ReorderGroup[]): Promise<ReorderResult> {
  let added = 0;
  const skipped: string[] = [];
  for (const so of groups) {
    for (const it of so.items ?? []) {
      if (it.status === 'cancelled') continue;
      if (!it.productId || !it.variantId) { skipped.push(it.name); continue; }
      try {
        await apiAddToCart(it.productId, it.variantId, so.storeId, it.quantity ?? 1);
        added += 1;
      } catch {
        skipped.push(it.name);
      }
    }
  }
  return { added, skipped };
}
