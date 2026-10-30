import client from '../client';
import { ENDPOINTS } from '../endpoints';
import type { VariantOption } from './product';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WishlistVariant {
  _id:            string;
  productId:      string;
  sku:            string;
  options:        VariantOption[];
  price:          number;
  currency?:      'PKR' | 'USD' | null;
  stock:          number;
  images:         string[];
  compareAtPrice: number | null;
  shippingWeight: string | null;
  fileUrl?:       string | null;
  fileName?:      string | null;
  isDefault:      boolean;
  status:         string;
  isDelete:       boolean;
  createdAt:      string;
  updatedAt:      string;
}

export interface WishlistProduct {
  _id:              string;
  name:             string;
  sellerId:         string;
  slug:             string;
  description:      string;
  // Always present on the raw backend document (Product.productType/type are
  // both `required: true` in the schema) — the wishlist endpoints never
  // .select() the product, so these ride along already; they were just never
  // declared on this type, which is what let Wishlist.tsx hardcode 'physical'
  // below instead of reading the product's real type.
  productType?:     'physical' | 'digital';
  type?:            'physical' | 'digital';
  categoryId:       string;
  subCategoryId:    string | null;
  images:           string[];
  tags?:            string[];
  viewCount:        number;
  wishlistCount:    number;
  purchaseCount:    number;
  averageRating:    number;
  totalRatings:     number;
  ratingSum:        number;
  lastWishlistedAt: string | null;
  status:           string;
  isDelete:         boolean;
  createdAt:        string;
  updatedAt:        string;
}

export interface WishlistEntry {
  _id:              string;
  userId:           string;
  productId:        string;
  productVariantId: string;
  createdAt:        string;
  updatedAt:        string;
}

export interface WishlistListItem {
  product:  WishlistProduct;
  variants: WishlistVariant[];
}

// ── Response shapes ───────────────────────────────────────────────────────────

interface AddWishlistResponse {
  message: string;
  data: {
    wishlist: WishlistEntry;
    product:  WishlistProduct;
    variant:  WishlistVariant;
  };
}

interface GetWishlistResponse {
  message: string;
  data: WishlistListItem[];
}

interface GetWishlistItemResponse {
  message: string;
  data: {
    wishlist: WishlistEntry;
    product:  WishlistProduct;
    variant:  WishlistVariant;
  };
}

interface RemoveWishlistResponse {
  message: string;
  data: {
    removedWishlistId: string;
    productId:         string;
  };
}

interface ClearWishlistResponse { message: string }

// ── API ───────────────────────────────────────────────────────────────────────

export function apiAddToWishlist(productId: string, productVariantId: string) {
  return client.post<never, AddWishlistResponse>(ENDPOINTS.WISHLIST.ADD, {
    productId, productVariantId,
  });
}

export function apiGetWishlist() {
  return client.get<never, GetWishlistResponse>(ENDPOINTS.WISHLIST.GET);
}

export function apiGetWishlistItem(productId: string, productVariantId: string) {
  return client.get<never, GetWishlistItemResponse>(
    `${ENDPOINTS.WISHLIST.GET_ITEM}?productId=${productId}&productVariantId=${productVariantId}`,
  );
}

export function apiRemoveFromWishlist(wishlistId: string) {
  return client.post<never, RemoveWishlistResponse>(ENDPOINTS.WISHLIST.REMOVE, { wishlistId });
}

export function apiClearWishlist() {
  return client.post<never, ClearWishlistResponse>(ENDPOINTS.WISHLIST.CLEAR);
}
