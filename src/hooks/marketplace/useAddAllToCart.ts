import { useState } from 'react';
import { useCartContext } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import type { MarketplaceProduct } from '@/api/services/marketplace';

/**
 * Adds each product's default option to the cart in one go — used by bundles
 * and teacher lists. Items that can't be added (sold out, removed) are skipped
 * and the toast says how many made it.
 */
export function useAddAllToCart() {
  const { addToCart } = useCartContext();
  const toast = useToast();
  const [adding, setAdding] = useState(false);

  const addAll = async (products: MarketplaceProduct[], doneMessage?: string) => {
    setAdding(true);
    let ok = 0;
    for (const product of products) {
      const v = (product.variants ?? []).find(x => x.isDefault) ?? product.variants?.[0];
      if (!v) continue;
      try { await addToCart(product._id, v._id, product.type === 'physical' ? 'physical' : 'digital'); ok += 1; } catch { /* skip unavailable */ }
    }
    setAdding(false);
    if (!ok) toast.error('Nothing could be added — these items may be unavailable.');
    else toast.success(doneMessage && ok === products.length ? doneMessage : `Added ${ok} of ${products.length} to your cart`);
    return ok;
  };

  return { addAll, adding };
}
