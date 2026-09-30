import client from '../client';
import { ENDPOINTS } from '../endpoints';
import { getCheckoutAttributionFields } from '@/utils/promotionAttribution';
import type { VariantOption } from './product';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CheckoutItem {
  productId:    string;
  variantId:    string;
  sellerId:     string;
  sellerName?:  string | null;
  sellerVerified?: boolean;
  storeId:      string;
  type:         string;
  name:         string;
  image:        string | null;
  sku:          string;
  options:      VariantOption[];
  licenseType:  string | null;
  quantity:     number;
  price:        number;
  totalPrice:   number;
  originalPrice?:          number | null;
  subscriberDiscountUSD?:  number;
  couponDiscountUSD?:      number;
  campaignId?:             string | null;
  campaignDiscountUSD?:    number;
}

export interface Checkout {
  _id:               string;
  userId:            string;
  addressId:         string;
  currency:          string;
  items:             CheckoutItem[];
  shippingZoneId:    string | null;
  paymentType:       string | null;
  paymentMethodId:   string | null;
  subtotal:          number;
  shippingFee:       number;
  taxAmount:         number;
  subscriberSavingsUSD?: number;
  couponCode?:       string | null;
  couponDiscountUSD?: number;
  giftCardCode?:       string | null;
  giftCardDiscountUSD?: number;
  campaignDiscountTotalUSD?: number;
  totalAmount:       number;
  /** FX rates frozen onto this checkout at creation (units per 1 USD) — the
   *  same snapshot the backend charges with. */
  fxSnapshots?:      { currency: string; ratePerUSD: number; effectiveFrom?: string; source?: string }[];
  status:            string;
  expiredAt:         string;
  isDelete:          boolean;
  createdAt:         string;
  updatedAt:         string;
}

export interface CheckoutSummary {
  subtotal:    number;
  shippingFee: number;
  taxAmount:   number;
  totalAmount: number;
  subscriberSavingsUSD?: number;
  campaignDiscountUSD?: number;
  autoDiscountUSD?: number;
  /** Only meaningful for a mixed physical+digital cart — see `allowedPaymentMethods`'s 'split' option. */
  digitalSubtotal?:  number;
  physicalSubtotal?: number;
}

export interface AppliedCampaign {
  campaignId: string;
  name:       string;
  storeId:    string;
  discountUSD: number;
}

export interface ApplyCouponPayload { checkoutId: string; code: string }

export interface ApplyCouponData {
  checkoutId: string;
  couponCode: string;
  couponDiscountUSD: number;
  totalAmount: number;
  digitalSubtotal?:  number;
  physicalSubtotal?: number;
}

interface ApplyCouponResponse { success: boolean; message: string; data: ApplyCouponData }

export interface RemoveCouponData {
  checkoutId: string;
  totalAmount: number;
  digitalSubtotal?:  number;
  physicalSubtotal?: number;
}
interface RemoveCouponResponse { success: boolean; message: string; data: RemoveCouponData }

export interface ApplyGiftCardPayload { checkoutId: string; code: string }

export interface ApplyGiftCardData {
  checkoutId: string;
  giftCardCode: string;
  giftCardDiscountUSD: number;
  remainingBalance: number;
  totalAmount: number;
  digitalSubtotal?:  number;
  physicalSubtotal?: number;
}

interface ApplyGiftCardResponse { success: boolean; message: string; data: ApplyGiftCardData }

export interface RemoveGiftCardData {
  checkoutId: string;
  totalAmount: number;
  digitalSubtotal?:  number;
  physicalSubtotal?: number;
}
interface RemoveGiftCardResponse { success: boolean; message: string; data: RemoveGiftCardData }

export interface SubscriptionSavingsHint {
  storeId: string; storeName: string; storeSlug: string; planId: string; planName: string; potentialSavingsUSD: number;
}

export interface CreateCheckoutPayload {
  addressId?:      string;
  shippingZoneId?: string;
  // Cart is now store-scoped — required so the backend knows which of the
  // buyer's (possibly several, one-per-store) carts to check out from.
  storeId?:        string;
  // Optional subset of the store's cart to check out (backend falls back to
  // the whole cart when omitted) — used for "check out physical items only".
  items?:          { productId: string; variantId: string }[];
}

// Same key CurrencyPreferenceContext writes to — read directly here rather
// than threading the value through every apiCreateCheckout call site.
// Server-validated regardless (see CheckoutService.resolveCheckoutCurrency);
// omitting/tampering with this just falls back to the buyer's saved account
// preference or the platform default, it's never trusted blindly.
const CURRENCY_STORAGE_KEY = 'edudeen_currency_preference';
function getCurrencyPreference(): string | undefined {
  const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
  return saved === 'PKR' || saved === 'USD' ? saved : undefined;
}

interface CreateCheckoutResponse {
  success: boolean;
  message: string;
  data: {
    checkout:               Checkout;
    allowedPaymentMethods:  string[];
    summary:                CheckoutSummary;
    subscriptionSavingsHints: SubscriptionSavingsHint[];
    appliedCampaigns:       AppliedCampaign[];
  };
}

export interface AddShippingPayload {
  checkoutId:    string;
  shippingZoneId: string;
}

export interface AddShippingData {
  checkoutId:    string;
  shippingZoneId: string;
  shippingFee:   number;
  subtotal:      number;
  totalAmount:   number;
  digitalSubtotal?:  number;
  physicalSubtotal?: number;
}

interface AddShippingResponse {
  success: boolean;
  message: string;
  data:    AddShippingData;
}

interface DeleteCheckoutResponse {
  success: boolean;
  message: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export function apiCreateCheckout(payload: CreateCheckoutPayload) {
  // Forwards a click-attribution token (if the buyer arrived via a promoted
  // banner within the last 48h) so promotion analytics can attribute the
  // resulting order — every checkout-creation call site benefits automatically.
  // Also forwards the buyer's currency preference the same way, so every
  // call site gets multi-currency checkout without individually wiring it.
  return client.post<never, CreateCheckoutResponse>(ENDPOINTS.CHECKOUT.CREATE, {
    ...payload,
    ...getCheckoutAttributionFields(),
    currencyPreference: getCurrencyPreference(),
  });
}

export function apiAddShippingToCheckout(payload: AddShippingPayload) {
  return client.post<never, AddShippingResponse>(
    ENDPOINTS.CHECKOUT.ADD_SHIPPING_ZONE_IN_CHECKOUT,
    payload,
  );
}

export function apiDeleteCheckout(checkoutId: string) {
  return client.delete<never, DeleteCheckoutResponse>(
    `${ENDPOINTS.CHECKOUT.DELETE_CHECKOUT}/${checkoutId}`,
  );
}

export function apiApplyCoupon(payload: ApplyCouponPayload) {
  return client.post<never, ApplyCouponResponse>(ENDPOINTS.CHECKOUT.APPLY_COUPON, payload);
}

export function apiRemoveCoupon(checkoutId: string) {
  return client.delete<never, RemoveCouponResponse>(ENDPOINTS.CHECKOUT.REMOVE_COUPON(checkoutId));
}

export function apiApplyGiftCard(payload: ApplyGiftCardPayload) {
  return client.post<never, ApplyGiftCardResponse>(ENDPOINTS.CHECKOUT.APPLY_GIFT_CARD, payload);
}

export function apiRemoveGiftCard(checkoutId: string) {
  return client.delete<never, RemoveGiftCardResponse>(ENDPOINTS.CHECKOUT.REMOVE_GIFT_CARD(checkoutId));
}
