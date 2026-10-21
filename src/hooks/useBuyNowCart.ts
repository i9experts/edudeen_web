import { useEffect, useState } from 'react';
import { apiGetBuyNowCart, type Cart, type CartItem } from '@/api/services/cart';

export interface BuyNowSelection { productId: string; variantId: string; quantity: number }

interface State { key: string; cart: Cart | null; error: string }

/**
 * The cart-shaped view of a Buy Now purchase (checkout page). The server prices the single line with the
 * same rules as a real cart (live price, sale, Premium) but nothing is stored, so the buyer's actual cart
 * is never read, added to or cleared. `enabled` is false while signed out (the endpoint needs a session).
 */
export function useBuyNowCart(sel: BuyNowSelection | null, enabled: boolean) {
  const key = sel && enabled ? `${sel.productId}:${sel.variantId}:${sel.quantity}` : '';
  const [state, setState] = useState<State>({ key: '', cart: null, error: '' });

  useEffect(() => {
    if (!key || !sel) return;
    let cancelled = false;
    apiGetBuyNowCart(sel.productId, sel.variantId, sel.quantity)
      .then(res => {
        if (cancelled) return;
        const sc = (res.data ?? [])[0];
        if (!sc) { setState({ key, cart: null, error: 'This item is no longer available.' }); return; }
        const items: CartItem[] = (sc.items ?? []).map(i => ({ ...i, storeId: sc.storeId, storeName: sc.store?.name }));
        setState({
          key,
          error: '',
          cart: {
            userId: sc.userId, storeId: sc.storeId, items,
            totalItems: items.reduce((s, i) => s + i.quantity, 0),
            totalPrice: items.reduce((s, i) => s + (i.itemTotal ?? 0), 0),
            stores: [sc], campaignDiscount: sc.campaignDiscount,
          },
        });
      })
      .catch(err => { if (!cancelled) setState({ key, cart: null, error: err instanceof Error ? err.message : 'Could not load this item.' }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const ready = state.key === key;
  return { cart: ready ? state.cart : null, loading: !!key && !ready, error: ready ? state.error : '' };
}
