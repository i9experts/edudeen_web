import client from '../client';
import { ENDPOINTS } from '../endpoints';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  productId:        string;
  productVariantId: string;
  name:             string;
  image?:           string[];
  images?:          string[];
  unitPrice?:       number;
  price?:           number;
  /** Display-only snapshot of the owning store's currency at add-to-cart
   *  time — the authoritative conversion only happens at checkout creation. */
  currency?:        string | null;
  quantity:         number;
  itemTotal?:       number;
  type?:            'physical' | 'digital';
  /** Set on the main marketplace site, where one view spans several stores' carts. */
  storeId?:         string;
  storeName?:       string;
}

export interface CartStoreInfo {
  storeId:  string;
  name:     string;
  slug:     string;
  logo:     string | null;
  isActive: boolean;
}

/** One store's cart, as returned by `GET /api/cart/my-carts`. */
export interface StoreCart {
  userId:     string;
  storeId:    string;
  items:      CartItem[];
  totalItems: number;
  totalPrice: number;
  campaignDiscount?: Cart['campaignDiscount'];
  store:      CartStoreInfo;
}

export interface Cart {
  _id?:       string;
  userId:     string;
  storeId?:   string;
  items:      CartItem[];
  totalItems: number;
  totalPrice: number;
  status?:    string;
  /** The store's running sale, applied at checkout — shown in the cart so the price doesn't change at the last step. */
  campaignDiscount?:  { name: string; discountType: 'percentage' | 'fixed' | null; discountValue: number | null; currency: string | null } | null;
  /** Main-site only: the per-store carts this merged view was built from.
   *  Checkout is always one store at a time. */
  stores?:    StoreCart[];
}

interface CartResponse   { message: string; data: Cart }
interface MyCartsResponse { message: string; data: StoreCart[] }
interface ItemResponse   { message: string; data: CartItem | CartItem[] }
interface ClearResponse  { message: string; data: [] }

// ── API ───────────────────────────────────────────────────────────────────────

// A logged-in buyer's cart is scoped per store (each store's subdomain is
// its own isolated shopping session) — every call now carries the storeId
// of the store currently being shopped on.

// `storeId` omitted (main marketplace site) → the server files the item
// under the product's own store.
export function apiAddToCart(productId: string, productVariantId: string, storeId?: string) {
  return client.post<never, CartResponse>(ENDPOINTS.CART.ADD, { productId, productVariantId, ...(storeId ? { storeId } : {}) });
}

export function apiGetCart(storeId: string) {
  return client.get<never, CartResponse>(ENDPOINTS.CART.GET, { params: { storeId } });
}

export function apiGetMyCarts() {
  return client.get<never, MyCartsResponse>(ENDPOINTS.CART.MY_CARTS);
}

export function apiUpdateCartQuantity(
  productId: string,
  productVariantId: string,
  action: 'increase' | 'decrease',
  storeId: string,
) {
  return client.post<never, ItemResponse>(ENDPOINTS.CART.UPDATE_QUANTITY, {
    productId, productVariantId, action, storeId,
  });
}

export function apiRemoveCartItem(productId: string, productVariantId: string, storeId: string) {
  return client.post<never, ItemResponse>(ENDPOINTS.CART.REMOVE_ITEM, {
    productId, productVariantId, storeId,
  });
}

export function apiClearCart(cartId: string, storeId: string) {
  return client.post<never, ClearResponse>(ENDPOINTS.CART.CLEAR, { cartId, storeId });
}
