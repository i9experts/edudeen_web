// Client-side cart for a logged-out shopper — lets Add to Cart work without
// requiring login (only Checkout does). Merged into the real server cart the
// moment the guest logs in (see CartContext's 'edudeen:auth-login' listener),
// then cleared — this storage is never the source of truth once a session exists.
const GUEST_CART_KEY = 'edudeen_guest_cart';

export interface GuestCartItem {
  productId:        string;
  productVariantId: string;
  quantity:         number;
  type?:             'physical' | 'digital';
}

export function getGuestCartItems(): GuestCartItem[] {
  try { return JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? '[]'); }
  catch { return []; }
}

function saveGuestCartItems(items: GuestCartItem[]): void {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function addGuestCartItem(productId: string, productVariantId: string, type?: 'physical' | 'digital'): GuestCartItem[] {
  const items = getGuestCartItems();
  const existing = items.find(i => i.productVariantId === productVariantId);
  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({ productId, productVariantId, quantity: 1, type });
  }
  saveGuestCartItems(items);
  return items;
}

export function updateGuestCartQty(productVariantId: string, action: 'increase' | 'decrease'): GuestCartItem[] {
  const items = getGuestCartItems().map(item => {
    if (item.productVariantId !== productVariantId) return item;
    const quantity = action === 'increase' ? item.quantity + 1 : Math.max(1, item.quantity - 1);
    return { ...item, quantity };
  });
  saveGuestCartItems(items);
  return items;
}

export function removeGuestCartItem(productVariantId: string): GuestCartItem[] {
  const items = getGuestCartItems().filter(i => i.productVariantId !== productVariantId);
  saveGuestCartItems(items);
  return items;
}

export function clearGuestCart(): void {
  localStorage.removeItem(GUEST_CART_KEY);
}
