import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getStorePagePath } from '@/utils/storefrontUrl';
import { useCartContext } from '@/contexts/CartContext';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { TokenStorage } from '@/api/services/auth';
import { useShippingZones } from '@/hooks/shipping/useShippingZones';
import { shippingZoneLabel, zonesForAddress, type ShippingZone } from '@/api/services/shipping';

// Offered only while no shipping zones exist at all, so a physical order can
// still be placed (free shipping) before an admin sets up delivery prices.
const STANDARD_DELIVERY: ShippingZone = {
  _id: '__standard', country: 'Pakistan', province: null, city: null, shippingPrice: 0,
  estimatedDeliveryTime: '3-7 days', status: 'active', isDelete: false, createdAt: '', updatedAt: '',
};
const zoneTitle = (z: ShippingZone) => (z._id === STANDARD_DELIVERY._id ? 'Standard delivery' : shippingZoneLabel(z));
// Zone prices are always PKR, whatever currency the checkout is in.
const zonePrice = (z: ShippingZone) => (z.shippingPrice > 0 ? `Rs ${z.shippingPrice.toLocaleString()}` : 'Free');
import { apiGetMyAddresses, type Address, type AddressPayload } from '@/api/services/address';
import { apiCreateCheckout, apiApplyCoupon, apiRemoveCoupon, apiApplyGiftCard, apiRemoveGiftCard, type Checkout, type CheckoutSummary, type SubscriptionSavingsHint } from '@/api/services/checkout';
import { apiPlaceCodOrder, apiInitiatePayment, apiGetPaymentStatus } from '@/api/services/payment';
import {
  apiGetManualPaymentBankDetails, apiSubmitManualPayment,
  type ManualPaymentBankDetails, type ManualPaymentOrderSummary,
} from '@/api/services/manualPayment';
import { apiGetCurrentRates } from '@/api/services/exchangeRate';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox, BuyerNavbar, Breadcrumb, Input } from '@/components/comman/ui';
import { StripeCardPayment, isStripeConfigured } from '@/features/buyer/components/StripeCardPayment';
import { AddressForm, EMPTY_ADDRESS_FORM, addressFromProfile, saveNewAddress } from '@/features/buyer/components/AddressForm';
import { useGetProfile } from '@/hooks/auth/useGetProfile';
import {
  MapPin, Truck, CreditCard, CheckCircle2,
  ChevronRight, AlertCircle, PackageCheck,
  Banknote, ShieldCheck, ArrowDownCircle, Download, Clock, Loader2,
  SplitSquareHorizontal, Landmark, UploadCloud,
} from 'lucide-react';
import { clsx } from 'clsx';
import { currencySymbol } from '@/utils/currency';

// ── Step badge ────────────────────────────────────────────────────────────────
function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={clsx(
      'w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 transition-colors',
      done ? 'bg-success text-white' :
        active ? 'bg-brand-orange text-white' :
          'bg-bone text-slate',
    )}>
      {done ? <CheckCircle2 size={14} /> : n}
    </div>
  );
}

// ── Card payment slot — shows the real Stripe form once configured, a clear
// "coming soon" notice otherwise. Never a dead-end silent button. ─────────────
function CardPaymentSlot({
  checkoutReady, clientSecret, initiating, initiateError, polling, amount, currency, onConfirmed,
}: {
  checkoutReady:  boolean;
  clientSecret:   string | null;
  initiating:     boolean;
  initiateError:  string;
  polling:        boolean;
  amount:         number;
  currency:       string;
  onConfirmed:    () => void;
}) {
  if (!isStripeConfigured()) {
    return (
      <div className="flex items-start gap-2 text-[12px] text-charcoal bg-cream border border-bone rounded-[8px] px-3 py-3">
        <Clock size={14} className="mt-[1px] flex-shrink-0 text-slate" />
        <div>
          <p className="font-semibold text-carbon mb-[2px]">Card payment isn't available yet</p>
          <p className="text-slate">Online card payment is still being set up. Please choose another payment method above, or come back later — your cart will be saved.</p>
        </div>
      </div>
    );
  }

  if (polling) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Loader2 size={22} className="animate-spin text-brand-orange" />
        <p className="text-[13px] font-medium text-carbon">Confirming your payment…</p>
        <p className="text-[11px] text-slate">This only takes a moment.</p>
      </div>
    );
  }

  if (!checkoutReady || initiating) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonBox height={44} rounded="8px" />
        <SkeletonBox height={48} rounded="12px" />
      </div>
    );
  }

  if (initiateError) {
    return (
      <div className="flex items-start gap-2 text-[12px] text-error bg-error-bg border border-error-border rounded-[8px] px-3 py-2">
        <AlertCircle size={13} className="mt-[1px] flex-shrink-0" />
        {initiateError}
      </div>
    );
  }

  if (!clientSecret) return null;

  return <StripeCardPayment clientSecret={clientSecret} amount={amount} currency={currency} onConfirmed={onConfirmed} />;
}

// ── Shown when a cart with digital items has no payment method that can
// complete it right now. Digital downloads are delivered instantly, so they
// must be paid up front (card, or bank transfer when enabled) — never cash
// on delivery. Physical items can still be bought on their own. ─────────────
function DigitalPaymentNotice({
  physicalCount, onPhysicalOnly, onBack,
}: {
  physicalCount:  number;
  onPhysicalOnly: () => void;
  onBack:         () => void;
}) {
  return (
    <div className="flex flex-col gap-3 text-[12px] text-charcoal bg-cream border border-bone rounded-[10px] px-4 py-4">
      <div className="flex items-start gap-2">
        <Download size={14} className="mt-[1px] flex-shrink-0 text-[#3851d1]" />
        <div>
          <p className="font-semibold text-carbon mb-[2px]">Digital downloads need online payment</p>
          <p className="text-slate leading-[1.6]">
            Because digital resources are delivered instantly, they can only be paid for online by card
            {' '}— they can't be paid with cash on delivery. Online card payment isn't available on Edudeen just yet,
            so these items will stay safely in your cart until it is.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {physicalCount > 0 && (
          <Button variant="primary" size="sm" onClick={onPhysicalOnly} className="gap-1">
            Check out {physicalCount} physical item{physicalCount !== 1 ? 's' : ''} now <ChevronRight size={14} />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onBack}>Back to Cart</Button>
      </div>
    </div>
  );
}

// ── Manual Bank Transfer slot — Pakistan track. Fetches the admin-configured
// bank details, shows the PKR amount to transfer, and submits the buyer's
// proof (order is created + proof recorded in one call, `paymentStatus:
// 'pending_verification'` until an admin reviews it). ───────────────────────
function ManualBankTransferSlot({
  checkoutId, amount, currency, fxSnapshots, onSubmitted,
}: {
  checkoutId:  string;
  /** Total in the checkout's own currency. */
  amount:      number;
  currency:    string;
  fxSnapshots?: Checkout['fxSnapshots'];
  onSubmitted: (orders: ManualPaymentOrderSummary[], amountPKR: number) => void;
}) {
  // PKR/USD rate — exactly what the backend charges with
  // (PaymentService.manualBankTransferPayment): the checkout's own frozen
  // FX snapshot first, else the current FX Settings rate (the same
  // /exchange-rate/current source CurrencyPreferenceContext uses). Never the
  // legacy ManualPaymentConfig.usdToPkrRate, which the backend no longer uses.
  const snapshotRate = fxSnapshots?.find(s => s.currency === 'PKR')?.ratePerUSD ?? null;
  const [liveRate, setLiveRate] = useState<number | null>(null);
  useEffect(() => {
    if (currency === 'PKR' || snapshotRate) return;
    let cancelled = false;
    apiGetCurrentRates()
      .then(res => { if (!cancelled) setLiveRate(res.data?.PKR?.ratePerUSD ?? null); })
      .catch(() => { /* fall back to showing the checkout-currency amount only */ });
    return () => { cancelled = true; };
  }, [currency, snapshotRate]);
  const usdToPkr = currency === 'PKR' ? 1 : (snapshotRate ?? liveRate);
  // Only USD and PKR checkouts exist today (SUPPORTED_CURRENCIES).
  const amountPKR = currency === 'PKR' ? amount : usdToPkr ? Math.round(amount * usdToPkr * 100) / 100 : null;
  const [bankDetails, setBankDetails]   = useState<ManualPaymentBankDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [detailsError, setDetailsError] = useState('');
  const [file, setFile]                 = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [senderName, setSenderName]     = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  // Unique per mount, not per checkout — a fixed key would let one
  // interrupted submit permanently block every retry via the backend's
  // IdempotencyInterceptor ("already being processed" forever).
  const [idempotencyKey] = useState(() => `manual-pay-${checkoutId}-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;
    apiGetManualPaymentBankDetails()
      .then(res => { if (!cancelled) setBankDetails(res.data); })
      .catch(err => { if (!cancelled) setDetailsError(err instanceof Error ? err.message : 'Bank transfer is not available right now.'); })
      .finally(() => { if (!cancelled) setLoadingDetails(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit() {
    if (!file) { setError('Please upload a screenshot or photo of your transfer receipt.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await apiSubmitManualPayment(
        checkoutId, file,
        { transactionReference: transactionReference || undefined, senderName: senderName || undefined },
        idempotencyKey,
      );
      onSubmitted(res.data.orders, res.data.proof.amountPKR);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit payment proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingDetails) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonBox height={140} rounded="10px" />
        <SkeletonBox height={44} rounded="8px" />
      </div>
    );
  }

  if (detailsError || !bankDetails) {
    return (
      <div className="flex items-start gap-2 text-[12px] text-error bg-error-bg border border-error-border rounded-[8px] px-3 py-2">
        <AlertCircle size={13} className="mt-[1px] flex-shrink-0" />
        {detailsError || 'Bank transfer is not available right now.'}
      </div>
    );
  }

  const rows: [string, string | null][] = [
    ['Bank', bankDetails.bankName],
    ['Account Title', bankDetails.accountTitle],
    ['Account Number', bankDetails.accountNumber],
    ['IBAN', bankDetails.iban],
    ['JazzCash', bankDetails.jazzcashNumber],
    ['Easypaisa', bankDetails.easypaisaNumber],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[10px] border border-bone bg-cream px-4 py-3 flex flex-col gap-2">
        <div className="flex justify-between items-baseline">
          <span className="text-[12px] text-slate">Amount to transfer</span>
          <span className="text-[18px] font-bold text-brand-deep-orange">
            {amountPKR != null
              ? `PKR ${amountPKR.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : `${currencySymbol(currency)}${amount.toFixed(2)}`}
          </span>
        </div>
        {currency !== 'PKR' && (
          <p className="text-[10.5px] text-slate">
            {amountPKR != null && usdToPkr
              ? <>≈ {currencySymbol(currency)}{amount.toFixed(2)} at PKR {usdToPkr.toLocaleString(undefined, { maximumFractionDigits: 2 })}/USD</>
              : 'The exact PKR amount is confirmed when you submit your proof.'}
          </p>
        )}
        <div className="h-px bg-bone my-1" />
        {rows.filter(([, v]) => v).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 text-[12px]">
            <span className="text-slate flex-shrink-0">{label}</span>
            <span className="font-medium text-carbon text-right font-mono">{value}</span>
          </div>
        ))}
        {bankDetails.instructions && <p className="text-[11px] text-slate mt-1">{bankDetails.instructions}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Payment proof (screenshot or receipt photo)</label>
          <label className="flex items-center gap-2 border border-dashed border-bone rounded-[8px] px-3 py-3 cursor-pointer hover:border-brand-orange/50 transition-colors">
            <UploadCloud size={16} className="text-slate flex-shrink-0" />
            <span className="text-[12px] text-slate truncate">{file ? file.name : 'Choose an image…'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <Input label="Transaction reference (optional)" value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} placeholder="TXN123456789" />
        <Input label="Sender name (optional, if different from your account)" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-[12px] text-error bg-error-bg border border-error-border rounded-[8px] px-3 py-2">
          <AlertCircle size={13} className="mt-[1px] flex-shrink-0" />
          {error}
        </div>
      )}

      <Button
        variant="primary" size="lg" fullWidth
        loading={submitting}
        icon={!submitting && <PackageCheck size={16} />}
        onClick={handleSubmit}
        className="gap-2 justify-center"
      >
        {submitting ? 'Submitting…' : "I've Made the Transfer"}
      </Button>
    </div>
  );
}

// ── Payment method labels ─────────────────────────────────────────────────────
const PAYMENT_LABELS: Record<string, { label: string; desc: string; Icon: React.ElementType }> = {
  stripe:           { label: 'Credit / Debit Card',  desc: 'Secure payment via Stripe',       Icon: CreditCard },
  cash_on_delivery: { label: 'Cash on Delivery',     desc: 'Pay when your order arrives',     Icon: Banknote   },
  // Mixed carts only — desc is overridden with the real digital/physical
  // amounts wherever this is rendered (see the payment-method list below).
  split:            { label: 'Card + Cash on Delivery', desc: 'Pay for digital items now, physical items on delivery', Icon: SplitSquareHorizontal },
  manual_bank_transfer: { label: 'Bank Transfer', desc: 'Transfer to our account and upload your receipt', Icon: Landmark },
};

// ── Shared payment-method radio list — used by both the digital single-step
// flow and the physical flow's step 3 (their surrounding layout differs, but
// the list of options and how a method is selected is identical). ──────────
function PaymentMethodOptions({
  methods, selectedMethod, onSelect, summary, currency,
}: {
  methods:        string[];
  selectedMethod: string | null;
  onSelect:       (m: string) => void;
  summary:        CheckoutSummary | null;
  currency:       string | undefined;
}) {
  return (
    <div className="flex flex-col gap-3">
      {methods.map(method => {
        const meta = PAYMENT_LABELS[method] ?? { label: method, desc: '', Icon: CreditCard };
        const { label, Icon } = meta;
        const desc = method === 'split' && summary?.digitalSubtotal != null && summary?.physicalSubtotal != null
          ? `Pay ${currencySymbol(currency)} ${summary.digitalSubtotal.toFixed(2)} now, ${currencySymbol(currency)} ${summary.physicalSubtotal.toFixed(2)} on delivery`
          : meta.desc;
        const unavailable = (method === 'stripe' || method === 'split') && !isStripeConfigured();
        return (
          <label
            key={method}
            className={clsx(
              'flex gap-3 p-4 rounded-[10px] border transition-colors',
              unavailable
                ? 'cursor-not-allowed opacity-60 border-bone bg-cream'
                : selectedMethod === method
                  ? 'cursor-pointer border-brand-orange bg-brand-pale-orange'
                  : 'cursor-pointer border-bone bg-cream hover:border-[#c5c4bc]',
            )}
          >
            <input
              type="radio" name="payment"
              className="mt-[3px] accent-brand-orange flex-shrink-0 disabled:cursor-not-allowed"
              checked={selectedMethod === method}
              disabled={unavailable}
              onChange={() => onSelect(method)}
            />
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 rounded-[8px] bg-bone flex items-center justify-center flex-shrink-0">
                <Icon size={17} className="text-graphite" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-carbon">{label}</p>
                  {unavailable && (
                    <span className="text-[10px] font-semibold px-2 py-[1px] rounded-full bg-bone text-slate">
                      Not available yet
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate">{desc}</p>
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function CheckoutPage() {
  usePageTitle('Checkout');
  const navigate  = useNavigate();
  const authGate  = useAuthGate();

  // The one point in the buyer flow that actually requires login — browsing
  // and Add to Cart both work as a guest (see CartContext's guest cart). A
  // modal sign-in gate (same mechanism already used for wishlist/follow)
  // instead of a full-page redirect to /login — the checkout page never
  // unmounts, so once the modal resolves the cart (already merged onto the
  // real account via CartContext's 'edudeen:auth-login' listener) is right
  // there waiting, no bounce back-and-forth needed.
  const [, setAuthTick] = useState(0);
  useEffect(() => {
    const onLogin = () => setAuthTick(t => t + 1);
    window.addEventListener('edudeen:auth-login', onLogin);
    return () => window.removeEventListener('edudeen:auth-login', onLogin);
  }, []);
  const loggedIn = TokenStorage.isLoggedIn();
  useEffect(() => {
    if (!loggedIn) authGate.requireAuth(() => {}, 'Sign in to complete your purchase.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  // Every hook below still runs regardless of login state (CartContext
  // already supports a guest cart) — the actual "not signed in" branch is
  // rendered further down, after every hook in this component has been
  // called, never before (an early return up here would make React call a
  // different number of hooks on the next render the instant login succeeds
  // and this same component instance re-renders instead of navigating away).
  const { cart, loading: cartLoading, clearCart, refetch: refetchCart } = useCartContext();

  // Checkout is one store at a time. On the main marketplace site the cart
  // can span several stores — `?store=` picks which one this checkout is
  // for (the cart page links each store's own checkout); a single-store
  // cart (or a storefront) needs no param.
  const [searchParams] = useSearchParams();
  const checkoutStoreId = searchParams.get('store') ?? cart?.storeId ?? undefined;
  const needsStorePick = !checkoutStoreId && (cart?.stores?.length ?? 0) > 1;

  // One unified checkout for the chosen store's cart, mixed physical+digital
  // included (Amazon/Alibaba/Shopify/Daraz all check out a mixed cart as one
  // order — splitting it into two separate checkouts was the old behavior
  // here and it under-charged the displayed total while still billing the
  // full cart server-side, since the backend was never told to filter by type).
  // `?only=physical` — the buyer chose to check out just the physical items
  // (e.g. no online payment rail is available yet for the digital ones).
  // Digital items stay in the cart; the backend removes only what was bought.
  const physicalOnly = searchParams.get('only') === 'physical';
  const cartItems  = (cart?.items ?? [])
    .filter(i => !checkoutStoreId || !i.storeId || i.storeId === checkoutStoreId)
    .filter(i => !physicalOnly || i.type !== 'digital');
  const checkoutCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const hasDigital = cartItems.some(i => i.type === 'digital');
  // Fully-digital carts skip address/shipping entirely; a mixed cart still
  // needs both, for its physical items — so this only means "skip the
  // shipping steps", not "no digital items in this order".
  const isDigital  = cartItems.length > 0 && cartItems.every(i => i.type === 'digital');

  // Step: 1 = address, 2 = shipping, 3 = payment method (selection only), 4 = review & confirm
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Address dropdown open state
  const [addrDropOpen, setAddrDropOpen] = useState(false);
  const addrDropRef = useRef<HTMLDivElement>(null);
  const shippingDropRef = useRef<HTMLDivElement>(null);

  // Address
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrLoading, setAddrLoading] = useState(true);
  // Sign-up name/phone/address, used to pre-fill a first delivery address.
  // Re-read after an in-place sign-in (the cache held null while signed out).
  const { profile, loading: profileLoading, refetch: refetchProfile } = useGetProfile();
  useEffect(() => {
    if (loggedIn && !profile && !profileLoading) refetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);
  const [selectedAddr, setSelectedAddr] = useState<Address | null>(null);

  // Shipping
  const { zones, loading: zonesLoading } = useShippingZones();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [shippingDropOpen, setShippingDropOpen] = useState(false);

  // Close either dropdown on an outside click or Escape — matches the
  // click-outside/Escape convention every other dropdown in this app follows.
  useEffect(() => {
    if (!addrDropOpen && !shippingDropOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setAddrDropOpen(false); setShippingDropOpen(false); }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (addrDropOpen && addrDropRef.current && !addrDropRef.current.contains(e.target as Node)) setAddrDropOpen(false);
      if (shippingDropOpen && shippingDropRef.current && !shippingDropRef.current.contains(e.target as Node)) setShippingDropOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addrDropOpen, shippingDropOpen]);

  // Checkout creation (step 2 → 3)
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [allowedMethods, setAllowedMethods] = useState<string[]>([]);
  const [savingsHints, setSavingsHints] = useState<SubscriptionSavingsHint[]>([]);

  // Payment
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [placing,     setPlacing]     = useState(false);
  const [placeError,  setPlaceError]  = useState('');

  // Manual bank transfer — set once the buyer submits their proof; short-
  // circuits the whole page to a confirmation screen instead of reusing
  // /order-success, since that page expects a richer PlacedOrder shape than
  // this flow's response provides (order created + proof recorded in one
  // call, no per-item/address breakdown returned).
  const [manualPaymentResult, setManualPaymentResult] = useState<{ orders: ManualPaymentOrderSummary[]; amountPKR: number } | null>(null);

  // Card payment (Stripe) — clientSecret drives the embedded PaymentElement form;
  // pollingStatus drives the "confirming your payment…" state after the buyer submits.
  const [clientSecret,        setClientSecret]        = useState<string | null>(null);
  // Which mode the current clientSecret's PaymentIntent was created for — lets
  // the initiate-payment effect below tell "buyer switched stripe↔split" apart
  // from "nothing changed", since 'full' and 'split' charge different amounts.
  const [clientSecretMode,    setClientSecretMode]    = useState<'full' | 'split' | null>(null);
  // The amount actually being charged right now (from the initiate-payment
  // response) — not the same as `total` once 'split' only charges the
  // digital portion, so the "Pay $X" button must reflect this, not `total`.
  const [chargeAmount,        setChargeAmount]        = useState<number | null>(null);
  const [initiatingPayment,   setInitiatingPayment]   = useState(false);
  const [initiatePaymentErr,  setInitiatePaymentErr]  = useState('');
  const [pollingStatus,       setPollingStatus]       = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Coupon
  const [couponInput,   setCouponInput]   = useState('');
  const [couponBusy,    setCouponBusy]    = useState(false);
  const [couponError,   setCouponError]   = useState('');
  // Explicit "it worked, here's how much" confirmation — shown once right
  // after a successful apply, matching how Amazon/Shopify confirm a promo
  // code rather than just letting a summary line quietly appear.
  const [couponSuccessMsg, setCouponSuccessMsg] = useState('');

  // Gift card — kept in its own checkout slot alongside a coupon (see
  // Checkout.giftCardCode), so this is a fully separate apply/remove flow.
  const [giftCardInput,   setGiftCardInput]   = useState('');
  const [giftCardBusy,    setGiftCardBusy]    = useState(false);
  const [giftCardError,   setGiftCardError]   = useState('');
  const [giftCardSuccessMsg, setGiftCardSuccessMsg] = useState('');

  // Cash on Delivery can't cover a digital item — it's delivered instantly, long
  // before any cash changes hands, so a buyer could take the download and then
  // refuse the COD payment at the door. Any digital item in the order (mixed
  // or pure-digital) forces card payment for the whole order instead.
  const effectiveMethods = hasDigital
    ? allowedMethods.filter(m => m !== 'cash_on_delivery')
    : allowedMethods;

  // Methods the buyer can actually complete right now (card/split need Stripe
  // configured). If a cart with digital items has none, it's not a dead end:
  // explain why and offer to check out the physical items on their own.
  const usableMethods = effectiveMethods.filter(m => !((m === 'stripe' || m === 'split') && !isStripeConfigured()));
  const digitalPaymentBlocked = hasDigital && !!checkout && usableMethods.length === 0;
  const physicalItemCount = cartItems.filter(i => i.type !== 'digital').length;

  // With only one real choice (a pure-digital cart only ever gets 'stripe'),
  // select it automatically instead of making the buyer pick a "radio group"
  // with one item in it. A mixed cart gets both 'stripe' and 'split' — that's
  // a real choice, so it's left for the buyer to pick via the radio list.
  // Same for "only one method is actually usable" (e.g. card isn't set up
  // yet but bank transfer is) — pick the one that can complete the order.
  useEffect(() => {
    if (effectiveMethods.length === 1) setSelectedMethod(effectiveMethods[0]);
    else if (usableMethods.length === 1) setSelectedMethod(usableMethods[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMethods.length, usableMethods.length]);

  // Fetch addresses (physical only) — skipped entirely while the sign-in
  // gate is up (see `loggedIn` above): both of these hit authenticated
  // endpoints, and firing them as a guest would 401 straight into the axios
  // client's own global "session expired" redirect, defeating the in-place
  // modal gate below. Re-fires once `loggedIn` flips true.
  useEffect(() => {
    if (!loggedIn) return;
    if (isDigital) { setAddrLoading(false); return; }
    let cancelled = false;
    apiGetMyAddresses()
      .then(res => {
        if (cancelled) return;
        setAddresses(res.data ?? []);
        const def = res.data?.find(a => a.isDefault) ?? res.data?.[0] ?? null;
        setSelectedAddr(def);
      })
      .catch(() => { })
      .finally(() => { if (!cancelled) setAddrLoading(false); });
    return () => { cancelled = true; };
  }, [isDigital, loggedIn]);

  // Digital: auto-create checkout (no address/shipping needed) and jump to payment
  useEffect(() => {
    if (!loggedIn || !isDigital || checkout || !checkoutStoreId) return;
    let cancelled = false;
    setCreatingCheckout(true);
    setCheckoutError('');
    apiCreateCheckout({ storeId: checkoutStoreId })
      .then(res => {
        if (cancelled) return;
        setCheckout(res.data.checkout);
        setSummary(res.data.summary);
        setSavingsHints(res.data.subscriptionSavingsHints ?? []);
        // Digital carts: card, or manual bank transfer when an admin has it
        // enabled (the backend accepts it for digital items — it's a
        // Stripe-equivalent pay-up-front rail, see
        // PaymentService.manualBankTransferPayment). Never COD.
        setAllowedMethods((res.data.allowedPaymentMethods ?? []).filter(m => m === 'stripe' || m === 'manual_bank_transfer'));
        setStep(3);
      })
      .catch(err => {
        if (!cancelled) setCheckoutError(err instanceof Error ? err.message : 'Failed to initialize checkout.');
      })
      .finally(() => { if (!cancelled) setCreatingCheckout(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDigital, loggedIn, checkoutStoreId]);

  // Card ('stripe') or split ('split') selected → get a Stripe clientSecret
  // for this checkout so the PaymentElement can mount. Re-fetches if the
  // buyer switches between 'stripe' and 'split' after one was already
  // initiated, since those charge different amounts (full vs. digital-only).
  // For the physical/mixed flow this only fires once the buyer reaches the
  // Review step (step 4) — picking a method in step 3 no longer immediately
  // starts payment. The digital-only flow has no step 4 at all (single-step
  // checkout), so it keeps firing as soon as 'stripe' is selected there.
  useEffect(() => {
    const mode: 'full' | 'split' | null =
      selectedMethod === 'split' ? 'split' : selectedMethod === 'stripe' ? 'full' : null;
    if (!mode || !checkout || !isStripeConfigured()) return;
    if (!isDigital && step !== 4) return;
    if (clientSecret && clientSecretMode === mode) return;
    let cancelled = false;
    setInitiatingPayment(true);
    setInitiatePaymentErr('');
    apiInitiatePayment({ checkoutId: checkout._id, paymentMode: mode })
      .then(res => {
        if (cancelled) return;
        setClientSecret(res.data.clientSecret);
        setChargeAmount(res.data.amount);
        setClientSecretMode(mode);
      })
      .catch(err => {
        if (!cancelled) setInitiatePaymentErr(err instanceof Error ? err.message : 'Failed to start card payment.');
      })
      .finally(() => { if (!cancelled) setInitiatingPayment(false); });
    return () => { cancelled = true; };
  }, [selectedMethod, checkout, clientSecret, clientSecretMode, isDigital, step]);

  // After an order is placed: a physical-only checkout must NOT wipe the
  // store's cart (its digital items are still waiting there) — the backend
  // already removed exactly the checked-out items, so just re-sync.
  const finishCheckoutCart = async () => {
    if (physicalOnly) await refetchCart();
    else await clearCart(checkoutStoreId);
  };

  // Restart this checkout for the cart's physical items only — address and
  // shipping picks are kept, a fresh (physical-only) checkout is created when
  // the buyer continues from the shipping step.
  const switchToPhysicalOnly = () => {
    const next = new URLSearchParams(searchParams);
    next.set('only', 'physical');
    if (checkoutStoreId) next.set('store', checkoutStoreId);
    setCheckout(null);
    setSummary(null);
    setAllowedMethods([]);
    setSelectedMethod(null);
    setClientSecret(null);
    setClientSecretMode(null);
    setChargeAmount(null);
    setInitiatePaymentErr('');
    setPlaceError('');
    setStep(selectedAddr ? 2 : 1);
    navigate(`/checkout?${next.toString()}`, { replace: true });
  };

  // Stop any in-flight poll on unmount (e.g. buyer navigates away mid-confirmation).
  useEffect(() => () => { if (pollTimer.current) clearTimeout(pollTimer.current); }, []);

  // Stripe confirmed the PaymentIntent client-side — the order itself is created
  // server-side (webhook, or this poll acting as a fallback for local dev / slow
  // webhook delivery). Poll until the order shows up, then hand off to Order Success.
  const handleStripeConfirmed = () => {
    if (!checkout) return;
    setPollingStatus(true);
    setPlaceError('');
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      try {
        const res = await apiGetPaymentStatus(checkout._id);
        if (stopped) return;
        if (res.data.status === 'completed') {
          setPollingStatus(false);
          await finishCheckoutCart();
          navigate('/order-success', { state: { orders: res.data.orders } });
          return;
        }
        if (res.data.status === 'failed') {
          setPollingStatus(false);
          setPlaceError('Payment could not be confirmed. Please try again.');
          return;
        }
      } catch {
        // transient — keep polling, a real failure will surface via the timeout below
      }
      if (!stopped) pollTimer.current = setTimeout(poll, 1500);
    };
    poll();
    // Stop waiting after ~30s so the buyer isn't stuck on a spinner forever —
    // the payment likely succeeded (Stripe already confirmed it), it just means
    // order finalization is taking unusually long; direct them to their orders.
    setTimeout(() => {
      if (!stopped) {
        stopped = true;
        if (pollTimer.current) clearTimeout(pollTimer.current);
        setPollingStatus(false);
        setPlaceError('Your payment was received and is being confirmed — check My Orders in a moment.');
      }
    }, 30_000);
  };

  // Shipping options for the chosen address: its city's zone, its province's,
  // then country-wide ones. (This used to crash on a zone with no city or
  // province, and offered other cities' zones when none matched.) While an
  // admin hasn't set up any zones yet, standard delivery keeps checkout open.
  const noZonesConfigured = !zonesLoading && zones.length === 0;
  const matchingZones = noZonesConfigured
    ? [STANDARD_DELIVERY]
    : selectedAddr ? zonesForAddress(zones, { city: selectedAddr.city, state: selectedAddr.state }) : [];

  const selectedZone = matchingZones.find(z => z._id === selectedZoneId) ?? null;

  // Only one way to ship there → pick it, one less click for the buyer.
  useEffect(() => {
    if (step === 2 && !selectedZoneId && matchingZones.length === 1) setSelectedZoneId(matchingZones[0]._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedZoneId, matchingZones.length, matchingZones[0]?._id]);

  // The whole cart checks out together — one order, no more splitting by type.
  const orderSubtotal = checkout
    ? checkout.items.reduce((s, i) => s + i.totalPrice, 0)
    : cartItems.reduce((s, i) => s + (i.itemTotal ?? (i.unitPrice ?? i.price ?? 0) * i.quantity), 0);

  const shipping = summary?.shippingFee ?? selectedZone?.shippingPrice ?? 0;
  const tax      = summary?.taxAmount ?? 0;
  const couponDiscount = checkout?.couponDiscountUSD ?? 0;
  const giftCardDiscount = checkout?.giftCardDiscountUSD ?? 0;
  const total    = Math.max(0, orderSubtotal + (isDigital ? 0 : shipping) + tax - couponDiscount - giftCardDiscount);

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function handleApplyCoupon() {
    if (!checkout || !couponInput.trim()) return;
    setCouponBusy(true);
    setCouponError('');
    setCouponSuccessMsg('');
    try {
      const res = await apiApplyCoupon({ checkoutId: checkout._id, code: couponInput.trim() });
      setCheckout(c => c && { ...c, couponCode: res.data.couponCode, couponDiscountUSD: res.data.couponDiscountUSD, totalAmount: res.data.totalAmount });
      setCouponSuccessMsg(`Coupon applied — you saved ${currencySymbol(checkout.currency)}${res.data.couponDiscountUSD.toFixed(2)}.`);
      setCouponInput('');
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Failed to apply coupon.');
    } finally {
      setCouponBusy(false);
    }
  }

  async function handleRemoveCoupon() {
    if (!checkout) return;
    setCouponBusy(true);
    setCouponError('');
    setCouponSuccessMsg('');
    try {
      const res = await apiRemoveCoupon(checkout._id);
      // Removing a coupon also reverts an independently-applied gift card
      // server-side if one is layered on top (see CheckoutService.removeCoupon)
      // — reflect that here too rather than leaving a stale discount showing.
      setCheckout(c => c && { ...c, couponCode: null, couponDiscountUSD: 0, giftCardCode: null, giftCardDiscountUSD: 0, totalAmount: res.data.totalAmount });
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Failed to remove coupon.');
    } finally {
      setCouponBusy(false);
    }
  }

  async function handleApplyGiftCard() {
    if (!checkout || !giftCardInput.trim()) return;
    setGiftCardBusy(true);
    setGiftCardError('');
    setGiftCardSuccessMsg('');
    try {
      const res = await apiApplyGiftCard({ checkoutId: checkout._id, code: giftCardInput.trim() });
      setCheckout(c => c && { ...c, giftCardCode: res.data.giftCardCode, giftCardDiscountUSD: res.data.giftCardDiscountUSD, totalAmount: res.data.totalAmount });
      setGiftCardSuccessMsg(`Gift card applied — ${currencySymbol(checkout.currency)}${res.data.giftCardDiscountUSD.toFixed(2)} used. ${currencySymbol(checkout.currency)}${res.data.remainingBalance.toFixed(2)} remains on the card.`);
      setGiftCardInput('');
    } catch (err) {
      setGiftCardError(err instanceof Error ? err.message : 'Failed to apply gift card.');
    } finally {
      setGiftCardBusy(false);
    }
  }

  async function handleRemoveGiftCard() {
    if (!checkout) return;
    setGiftCardBusy(true);
    setGiftCardError('');
    setGiftCardSuccessMsg('');
    try {
      const res = await apiRemoveGiftCard(checkout._id);
      setCheckout(c => c && { ...c, giftCardCode: null, giftCardDiscountUSD: 0, couponCode: null, couponDiscountUSD: 0, totalAmount: res.data.totalAmount });
    } catch (err) {
      setGiftCardError(err instanceof Error ? err.message : 'Failed to remove gift card.');
    } finally {
      setGiftCardBusy(false);
    }
  }

  const selectAddress = (addr: Address) => {
    setSelectedAddr(addr);
    setSelectedZoneId(null);
    setAddrDropOpen(false);
  };

  // Adding an address right here instead of sending the buyer away from their
  // cart. The first one starts from the address given at sign-up.
  const [addingAddr, setAddingAddr] = useState(false);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrSaveError, setAddrSaveError] = useState('');
  const handleAddAddress = async (form: AddressPayload) => {
    setAddrSaving(true);
    setAddrSaveError('');
    try {
      const saved = await saveNewAddress(form);
      setAddresses(prev => [...(saved.isDefault ? prev.map(a => ({ ...a, isDefault: false })) : prev), saved]);
      selectAddress(saved);
      setAddingAddr(false);
    } catch (err) {
      setAddrSaveError(err instanceof Error ? err.message : 'Failed to save address.');
    } finally {
      setAddrSaving(false);
    }
  };

  const handleContinueToShipping = () => {
    if (selectedAddr) setStep(2);
  };

  const handleContinueToPayment = async () => {
    if (!selectedAddr || !selectedZoneId) return;
    setCreatingCheckout(true);
    setCheckoutError('');
    try {
      const res = await apiCreateCheckout({
        addressId: selectedAddr._id,
        ...(selectedZoneId !== STANDARD_DELIVERY._id && { shippingZoneId: selectedZoneId }),
        storeId: checkoutStoreId,
        ...(physicalOnly && {
          items: cartItems.map(i => ({ productId: i.productId, variantId: i.productVariantId })),
        }),
      });
      setCheckout(res.data.checkout);
      setSummary(res.data.summary);
      setSavingsHints(res.data.subscriptionSavingsHints ?? []);
      // Temporary: for physical/mixed checkout, Stripe only works on a USD
      // checkout (see PaymentService.confirmCardPayment) — a PKR checkout
      // has no working card rail yet, so Cash on Delivery is kept as the
      // fallback that actually completes an order right now. Manual bank
      // transfer is offered whenever the backend lists it (admin-enabled);
      // split (card + COD) stays hidden for now.
      setAllowedMethods((res.data.allowedPaymentMethods ?? []).filter(m => m === 'stripe' || m === 'cash_on_delivery' || m === 'manual_bank_transfer'));
      setStep(3);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Failed to create checkout. Please try again.');
    } finally {
      setCreatingCheckout(false);
    }
  };

  // Cash on Delivery only — card payment is handled by StripeCardPayment +
  // handleStripeConfirmed instead, since it has its own form/submit button.
  const handlePlaceOrder = async () => {
    if (!checkout || selectedMethod !== 'cash_on_delivery') return;
    setPlacing(true);
    setPlaceError('');
    try {
      const res = await apiPlaceCodOrder({ checkoutId: checkout._id });
      await finishCheckoutCart();
      navigate('/order-success', { state: { orders: res.data.orders } });
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const handleManualPaymentSubmitted = async (orders: ManualPaymentOrderSummary[], amountPKR: number) => {
    await finishCheckoutCart();
    setManualPaymentResult({ orders, amountPKR });
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <BuyerNavbar variant="minimal" contextLabel="Checkout" hideCommerce />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <p className="text-[14px] text-slate max-w-[320px]">Sign in to complete your purchase — your cart will be right here waiting.</p>
          <Button onClick={() => authGate.requireAuth(() => {}, 'Sign in to complete your purchase.')}>Sign In</Button>
          <button onClick={() => navigate('/cart')} className="text-[12.5px] text-slate hover:text-charcoal transition-colors bg-transparent border-none cursor-pointer">
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  if (needsStorePick && cart?.stores) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <BuyerNavbar variant="minimal" contextLabel="Checkout" hideCommerce />
        <div className="max-w-[560px] w-full mx-auto px-4 py-12">
          <h1 className="text-[20px] font-bold text-carbon mb-1">Which store are you checking out?</h1>
          <p className="text-[13px] text-slate mb-6">Your cart has items from {cart.stores.length} stores. Each store ships and bills separately, so check out one at a time.</p>
          <div className="bg-white border border-bone rounded-[10px] divide-y divide-bone">
            {cart.stores.map(s => (
              <button
                key={s.storeId}
                onClick={() => navigate(`/checkout?store=${encodeURIComponent(s.storeId)}`)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left bg-transparent border-none cursor-pointer hover:bg-fog transition-colors"
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-carbon truncate">{s.store.name}</span>
                  <span className="block text-[12px] text-slate">{s.totalItems} item{s.totalItems === 1 ? '' : 's'}</span>
                </span>
                <ChevronRight size={16} className="text-slate shrink-0" />
              </button>
            ))}
          </div>
          <button onClick={() => navigate('/cart')} className="mt-5 text-[12.5px] text-slate hover:text-charcoal transition-colors bg-transparent border-none cursor-pointer">
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  if (manualPaymentResult) {
    return (
      <div className="min-h-screen bg-cream">
        <BuyerNavbar/>
        <div className="max-w-[560px] mx-auto px-4 py-14 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fff4dc] flex items-center justify-center mx-auto mb-5">
            <Clock size={26} className="text-[#b36200]" />
          </div>
          <h1 className="text-[20px] font-bold text-carbon mb-2">We're verifying your payment</h1>
          <p className="text-[13px] text-slate mb-6">
            Your order has been placed and your transfer proof of <span className="font-semibold text-carbon">PKR {manualPaymentResult.amountPKR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> was received.
            We'll notify you as soon as it's confirmed — usually within a few hours.
          </p>
          <div className="bg-white border border-bone rounded-[10px] divide-y divide-bone text-left mb-8">
            {manualPaymentResult.orders.map(o => (
              <div key={o.orderId} className="flex justify-between items-center px-4 py-3 text-[13px]">
                <span className="font-mono font-semibold text-brand-deep-orange">{o.orderNumber}</span>
                <span className="text-slate">{currencySymbol(o.currency)}{o.totalAmount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <Button variant="primary" size="lg" onClick={() => navigate('/account/orders')} className="gap-2">
            View My Orders <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <BuyerNavbar/>

      <div className="max-w-[960px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <Breadcrumb className="mb-4" items={[
          { label: 'Home', path: '/' },
          { label: 'Cart', path: '/cart' },
          { label: 'Checkout' },
        ]} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

          {/* ── Left panel ─────────────────────────────────────────────── */}
          {isDigital ? (
            /* ── Digital: single-step payment ──────────────────────────── */
            <div className="bg-white rounded-xl border border-bone overflow-hidden">

              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-bone flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-[2px]">
                    <h1 className="text-[20px] font-bold text-carbon leading-tight">Checkout</h1>
                    <span className="flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-semibold bg-[#eef0ff] text-[#3851d1]">
                      <Download size={9} /> Digital Delivery
                    </span>
                  </div>
                  <p className="text-[12px] text-slate mt-[2px]">
                    {cartLoading ? 'Loading…' : `${checkoutCount} item${checkoutCount !== 1 ? 's' : ''} in this order`}
                  </p>
                </div>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#eef0ff] text-[#3851d1]">
                  Instant Delivery
                </span>
              </div>

              {/* Body */}
              <div className="p-5">
                {creatingCheckout ? (
                  <div className="flex flex-col gap-4">
                    <SkeletonBox height={40} rounded="8px" />
                    <SkeletonBox height={14} width="70%" rounded="4px" />
                    <SkeletonBox height={48} rounded="12px" />
                  </div>
                ) : checkoutError ? (
                  <div className="flex items-start gap-2 text-[12px] text-error bg-error-bg border border-error-border rounded-[8px] px-3 py-2">
                    <AlertCircle size={13} className="mt-[1px] flex-shrink-0" />
                    {checkoutError}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 bg-[#eef0ff] border border-[#c7ceff] rounded-[8px] px-3 py-2 mb-5">
                      <Download size={13} className="text-[#3851d1] shrink-0" />
                      <p className="text-[12px] text-[#3851d1] font-medium">
                        Digital products are delivered instantly after payment — no shipping required.
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate mb-5">
                      <ShieldCheck size={12} className="text-success" />
                      Your payment info is secure and encrypted
                    </div>

                    {placeError && (
                      <div className="flex items-start gap-2 text-[12px] text-error bg-error-bg border border-error-border rounded-[8px] px-3 py-2 mb-4">
                        <AlertCircle size={13} className="mt-[1px] flex-shrink-0" />
                        {placeError}
                      </div>
                    )}

                    {/* A pure-digital cart usually only ever gets 'stripe' (auto-selected,
                        see the effect above) — but if an admin has enabled manual bank
                        transfer, there's a real choice to make here. */}
                    {effectiveMethods.length > 1 && (
                      <div className="mb-4">
                        <PaymentMethodOptions
                          methods={effectiveMethods}
                          selectedMethod={selectedMethod}
                          onSelect={setSelectedMethod}
                          summary={summary}
                          currency={checkout?.currency}
                        />
                      </div>
                    )}

                    {selectedMethod === 'manual_bank_transfer' ? (
                      checkout && (
                        <ManualBankTransferSlot
                          checkoutId={checkout._id}
                          amount={total}
                          currency={checkout.currency}
                          fxSnapshots={checkout.fxSnapshots}
                          onSubmitted={handleManualPaymentSubmitted}
                        />
                      )
                    ) : digitalPaymentBlocked ? (
                      <DigitalPaymentNotice physicalCount={physicalItemCount} onPhysicalOnly={switchToPhysicalOnly} onBack={() => navigate('/cart')} />
                    ) : (
                      <CardPaymentSlot
                        checkoutReady={!!checkout}
                        clientSecret={clientSecret}
                        initiating={initiatingPayment}
                        initiateError={initiatePaymentErr}
                        polling={pollingStatus}
                        amount={chargeAmount ?? total}
                        currency={checkout?.currency ?? 'USD'}
                        onConfirmed={handleStripeConfirmed}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            /* ── Physical: 3-step flow ──────────────────────────────────── */
            <div className="bg-white rounded-xl border border-bone overflow-hidden">

            {/* ── Card Header ───────────────────────────────────────────── */}
            <div className="px-6 pt-5 pb-4 border-b border-bone">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-[20px] font-bold text-carbon leading-tight">Checkout</h1>
                  <p className="text-[12px] text-slate mt-[2px]">
                    {cartLoading ? 'Loading…' : `${checkoutCount} item${checkoutCount !== 1 ? 's' : ''} in this order`}
                  </p>
                </div>
                <span className={clsx(
                  'text-[11px] font-semibold px-3 py-1 rounded-full',
                  step === 4 ? 'bg-[#e3f4ea] text-[#1e7a3c]' : 'bg-brand-pale-orange text-brand-orange',
                )}>
                  Step {step} of 4
                </span>
              </div>

              {physicalOnly && (
                <div className="flex items-start gap-2 bg-[#eef0ff] border border-[#c7ceff] rounded-[8px] px-3 py-2 mb-4">
                  <Download size={13} className="text-[#3851d1] shrink-0 mt-[1px]" />
                  <p className="text-[12px] text-[#3851d1] font-medium">
                    Checking out physical items only — your digital items stay in your cart.
                  </p>
                </div>
              )}

              {/* Progress bar */}
              <div className="relative flex justify-between items-start w-full">
                {/* background line */}
                <div className="absolute top-3 left-0 right-0 h-[2px] bg-bone rounded-full" />
                {/* filled line */}
                <div
                  className="absolute top-3 left-0 h-[2px] bg-success rounded-full transition-all duration-300"
                  style={{ width: step === 1 ? '0%' : step === 2 ? '33%' : step === 3 ? '66%' : '100%' }}
                />
                {([
                  { n: 1, label: 'Address' },
                  { n: 2, label: 'Shipping' },
                  { n: 3, label: 'Payment' },
                  { n: 4, label: 'Review' },
                ] as const).map(({ n, label }) => (
                  <div key={n} className="relative z-10 flex flex-col items-center gap-[6px]">
                    <div className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200',
                      step > n ? 'bg-success text-white' :
                        step === n ? 'bg-brand-orange text-white ring-4 ring-brand-pale-orange' :
                          'bg-bone text-slate',
                    )}>
                      {step > n ? <CheckCircle2 size={12} /> : n}
                    </div>
                    <span className={clsx(
                      'text-[10px] font-semibold whitespace-nowrap',
                      step === n ? 'text-brand-orange' : step > n ? 'text-[#1e7a3c]' : 'text-slate',
                    )}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Address */}
            <div>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-bone">
                <StepBadge n={1} active={step === 1} done={step > 1} />
                <MapPin size={16} className="text-brand-orange" />
                <span className="font-semibold text-[14px] text-carbon">Delivery Address</span>
                {step > 1 && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setStep(1)}
                    className="ml-auto text-[12px] text-brand-orange font-medium cursor-pointer"
                  >
                    <ArrowDownCircle size={14} className="inline align-middle mr-1" />Change Address
                  </Button>

                )}
              </div>

              {step === 1 && (
                <div className="p-5">
                  {addrLoading ? (
                    <div className="flex flex-col gap-4">
                      <SkeletonBox height={54} rounded="10px" />
                      <SkeletonBox height={32} width={180} rounded="8px" />
                    </div>
                  ) : addresses.length === 0 || addingAddr ? (
                    <div className="flex flex-col gap-3">
                      <AddressForm
                        key={addresses.length === 0 ? `first-${profile?._id ?? ''}` : 'another'}
                        initial={addresses.length === 0
                          ? addressFromProfile(profile)
                          : { ...EMPTY_ADDRESS_FORM, recipientName: profile?.name ?? '', phoneNumber: profile?.phone ?? '' }}
                        note={addresses.length === 0
                          ? (profile?.address
                            ? 'We filled this in from the address you gave when you signed up. Check it and add anything missing.'
                            : 'Add the address your order should be delivered to.')
                          : undefined}
                        submitLabel="Save & deliver here"
                        onSave={handleAddAddress}
                        onCancel={addresses.length > 0 ? () => { setAddingAddr(false); setAddrSaveError(''); } : undefined}
                        cancelLabel="Cancel"
                        saving={addrSaving}
                      />
                      {addrSaveError && (
                        <div role="alert" className="flex items-start gap-2 text-[13px] text-error">
                          <AlertCircle size={14} className="mt-[2px] flex-shrink-0" />
                          {addrSaveError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {/* Dropdown trigger */}
                      <div className="relative" ref={addrDropRef}>
                        <button
                          type="button"
                          onClick={() => setAddrDropOpen(o => !o)}
                          className={clsx(
                            'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[10px] border bg-cream text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                            addrDropOpen ? 'border-brand-orange ring-2 ring-brand-pale-orange' : 'border-bone hover:border-[#c5c4bc]',
                          )}
                        >
                          {selectedAddr ? (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-[2px]">
                                <span className="text-[13px] font-semibold text-carbon">{selectedAddr.recipientName}</span>
                                <span className="text-[11px] text-slate bg-bone rounded-full px-2 py-[1px]">{selectedAddr.label}</span>
                                {selectedAddr.isDefault && (
                                  <span className="text-[11px] text-brand-orange bg-brand-pale-orange rounded-full px-2 py-[1px] font-medium">Default</span>
                                )}
                              </div>
                              <p className="text-[12px] text-slate truncate">
                                {selectedAddr.addressLine1}, {selectedAddr.city}, {selectedAddr.state} {selectedAddr.zipCode}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[13px] text-slate">Select a delivery address…</span>
                          )}
                          <ChevronRight size={15} className={clsx('flex-shrink-0 text-slate transition-transform', addrDropOpen && 'rotate-90')} />
                        </button>

                        {/* Dropdown list */}
                        {addrDropOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-bone rounded-[10px] z-20 overflow-hidden">
                            {addresses.map((addr, i) => (
                              <button
                                key={addr._id}
                                type="button"
                                onClick={() => selectAddress(addr)}
                                className={clsx(
                                  'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                                  i > 0 && 'border-t border-bone',
                                  selectedAddr?._id === addr._id
                                    ? 'bg-brand-pale-orange'
                                    : 'hover:bg-cream',
                                )}
                              >
                                <div className={clsx(
                                  'mt-[2px] w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                                  selectedAddr?._id === addr._id ? 'border-brand-orange' : 'border-[#c5c4bc]',
                                )}>
                                  {selectedAddr?._id === addr._id && (
                                    <div className="w-2 h-2 rounded-full bg-brand-orange" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-[2px]">
                                    <span className="text-[13px] font-semibold text-carbon">{addr.recipientName}</span>
                                    <span className="text-[11px] text-slate bg-bone rounded-full px-2 py-[1px]">{addr.label}</span>
                                    {addr.isDefault && (
                                      <span className="text-[11px] text-brand-orange bg-brand-pale-orange rounded-full px-2 py-[1px] font-medium">Default</span>
                                    )}
                                  </div>
                                  <p className="text-[12px] text-slate">{addr.phoneNumber}</p>
                                  <p className="text-[12px] text-carbon mt-[1px]">
                                    {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}, {addr.city}, {addr.state} {addr.zipCode}
                                  </p>
                                </div>
                              </button>
                            ))}
                            <div className="border-t border-bone px-4 py-2">
                              <button
                                type="button"
                                onClick={() => { setAddrDropOpen(false); setAddingAddr(true); }}
                                className="text-[12px] text-brand-orange font-medium cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                              >
                                + Add new address
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <Button
                          variant="primary" size="sm"
                          disabled={!selectedAddr}
                          onClick={handleContinueToShipping}
                          className="gap-1"
                        >
                          Continue to Shipping <ChevronRight size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step > 1 && selectedAddr && (
                <div className="px-5 py-3 text-[13px] text-carbon">
                  <span className="font-medium">{selectedAddr.recipientName}</span>
                  {' — '}
                  {selectedAddr.addressLine1}, {selectedAddr.city}, {selectedAddr.state}
                </div>
              )}
            </div>

            <div className="h-px bg-bone" />

            {/* Step 2: Shipping */}
            <div className={clsx('transition-opacity', step < 2 && 'opacity-50 pointer-events-none')}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-bone">
                <StepBadge n={2} active={step === 2} done={step > 2} />
                <Truck size={16} className="text-brand-orange" />
                <span className="font-semibold text-[14px] text-carbon">Shipping Method</span>
                {step > 2 && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setStep(2)}
                    className="ml-auto text-[12px] text-brand-orange font-medium cursor-pointer"
                  >
                    <ArrowDownCircle size={14} className="inline align-middle mr-1" />Change Shipping Method

                  </Button>
                )}
              </div>

              {step === 2 && (
                <div className="p-5">
                  {zonesLoading ? (
                    <div className="flex flex-col gap-4">
                      <SkeletonBox height={54} rounded="10px" />
                      <SkeletonBox height={32} width={180} rounded="8px" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {matchingZones.length === 0 && (
                        <div role="alert" className="flex items-start gap-2 text-[12.5px] text-charcoal bg-cream border border-bone rounded-[8px] px-3 py-3">
                          <AlertCircle size={14} className="mt-[1px] flex-shrink-0 text-brand-orange" />
                          <div>
                            <p className="font-semibold text-carbon">We don't deliver to {selectedAddr?.city || 'this address'} yet</p>
                            <p className="text-slate mt-[2px]">
                              Try another address, or contact support@edudeen.com.{' '}
                              <button type="button" onClick={() => setStep(1)} className="text-brand-orange font-semibold bg-transparent border-0 p-0 cursor-pointer">
                                Change address
                              </button>
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Dropdown trigger */}
                      <div className="relative" ref={shippingDropRef}>
                        <button
                          type="button"
                          onClick={() => setShippingDropOpen(o => !o)}
                          className={clsx(
                            'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[10px] border bg-cream text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                            shippingDropOpen ? 'border-brand-orange ring-2 ring-brand-pale-orange' : 'border-bone hover:border-[#c5c4bc]',
                          )}
                        >
                          {selectedZone ? (
                            <div className="flex-1 min-w-0 flex items-center justify-between">
                              <div>
                                <p className="text-[13px] font-semibold text-carbon">
                                  {zoneTitle(selectedZone)}
                                </p>
                                <p className="text-[12px] text-slate mt-[1px]">
                                  Estimated delivery: {selectedZone.estimatedDeliveryTime}
                                </p>
                              </div>
                              <span className="text-[13px] font-bold text-carbon ml-4 flex-shrink-0">
                                {zonePrice(selectedZone)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[13px] text-slate">Select a shipping method…</span>
                          )}
                          <ChevronRight size={15} className={clsx('flex-shrink-0 text-slate transition-transform ml-2', shippingDropOpen && 'rotate-90')} />
                        </button>

                        {/* Dropdown list */}
                        {shippingDropOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-bone rounded-[10px] z-20 overflow-hidden">
                            {matchingZones.length === 0 ? (
                              <div className="px-4 py-4 text-[13px] text-slate text-center">
                                We don't deliver to {selectedAddr?.city || 'this address'} yet.
                              </div>
                            ) : matchingZones.map((zone, i) => (
                              <button
                                key={zone._id}
                                type="button"
                                onClick={() => { setSelectedZoneId(zone._id); setShippingDropOpen(false); }}
                                className={clsx(
                                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange',
                                  i > 0 && 'border-t border-bone',
                                  selectedZoneId === zone._id ? 'bg-brand-pale-orange' : 'hover:bg-cream',
                                )}
                              >
                                <div className={clsx(
                                  'mt-[1px] w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                                  selectedZoneId === zone._id ? 'border-brand-orange' : 'border-[#c5c4bc]',
                                )}>
                                  {selectedZoneId === zone._id && (
                                    <div className="w-2 h-2 rounded-full bg-brand-orange" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-semibold text-carbon">
                                    {zoneTitle(zone)}
                                  </p>
                                  <p className="text-[12px] text-slate mt-[1px]">
                                    Estimated delivery: {zone.estimatedDeliveryTime}
                                  </p>
                                </div>
                                <span className="text-[13px] font-bold text-carbon flex-shrink-0">
                                  {zonePrice(zone)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {checkoutError && (
                        <div className="flex items-start gap-2 text-[12px] text-error bg-error-bg border border-error-border rounded-[8px] px-3 py-2">
                          <AlertCircle size={13} className="mt-[1px] flex-shrink-0" />
                          {checkoutError}
                        </div>
                      )}

                      <div>
                        <Button
                          variant="primary" size="sm"
                          disabled={!selectedZoneId}
                          loading={creatingCheckout}
                          iconRight={!creatingCheckout && <ChevronRight size={14} />}
                          onClick={handleContinueToPayment}
                          className="gap-1"
                        >
                          {creatingCheckout ? 'Creating checkout…' : 'Continue to Payment Method'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step > 2 && selectedZone && (
                <div className="px-5 py-3 text-[13px] text-carbon">
                  <span className="font-medium">{zoneTitle(selectedZone)}</span>
                  {' — '}
                  {zonePrice(selectedZone)} · {selectedZone.estimatedDeliveryTime}
                </div>
              )}
            </div>

            <div className="h-px bg-bone" />

            {/* Step 3: Payment Method (selection only — payment itself happens after Review) */}
            <div className={clsx('transition-opacity', step < 3 && 'opacity-50 pointer-events-none')}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-bone">
                <StepBadge n={3} active={step === 3} done={step > 3} />
                <CreditCard size={16} className="text-brand-orange" />
                <span className="font-semibold text-[14px] text-carbon">Payment Method</span>
                {step > 3 && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setStep(3)}
                    className="ml-auto text-[12px] text-brand-orange font-medium cursor-pointer"
                  >
                    <ArrowDownCircle size={14} className="inline align-middle mr-1" />Change Payment Method
                  </Button>
                )}
              </div>

              {step === 3 && (
                <div className="p-5">
                  {digitalPaymentBlocked && (
                    <div className="mb-4">
                      <DigitalPaymentNotice physicalCount={physicalItemCount} onPhysicalOnly={switchToPhysicalOnly} onBack={() => navigate('/cart')} />
                    </div>
                  )}
                  {effectiveMethods.length === 0 && !digitalPaymentBlocked && (
                    <div className="flex items-start gap-2 text-[12px] text-error bg-error-bg border border-error-border rounded-[8px] px-3 py-3 mb-4">
                      <AlertCircle size={13} className="mt-[1px] flex-shrink-0" />
                      No payment method is available for this order right now. Please try again shortly or contact support.
                    </div>
                  )}
                  <div className={clsx('mb-4', digitalPaymentBlocked && 'hidden')}>
                    <PaymentMethodOptions
                      methods={effectiveMethods}
                      selectedMethod={selectedMethod}
                      onSelect={setSelectedMethod}
                      summary={summary}
                      currency={checkout?.currency}
                    />
                  </div>

                  <div className={clsx(digitalPaymentBlocked && 'hidden')}>
                    <Button
                      variant="primary" size="sm"
                      disabled={!selectedMethod || digitalPaymentBlocked}
                      onClick={() => setStep(4)}
                      className="gap-1"
                    >
                      Continue to Review <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              )}

              {step > 3 && selectedMethod && (
                <div className="px-5 py-3 text-[13px] text-carbon">
                  <span className="font-medium">{PAYMENT_LABELS[selectedMethod]?.label ?? selectedMethod}</span>
                  {selectedMethod === 'split' && summary?.digitalSubtotal != null && summary?.physicalSubtotal != null ? (
                    <> {' — '}{currencySymbol(checkout?.currency)} {summary.digitalSubtotal.toFixed(2)} now, {currencySymbol(checkout?.currency)} {summary.physicalSubtotal.toFixed(2)} on delivery</>
                  ) : (
                    <> {' — '}{currencySymbol(checkout?.currency)} {(chargeAmount ?? total).toFixed(2)}</>
                  )}
                </div>
              )}
            </div>

            <div className="h-px bg-bone" />

            {/* Step 4: Review & Confirm */}
            <div className={clsx('transition-opacity', step < 4 && 'opacity-50 pointer-events-none')}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-bone">
                <StepBadge n={4} active={step === 4} done={false} />
                <PackageCheck size={16} className="text-brand-orange" />
                <span className="font-semibold text-[14px] text-carbon">Review &amp; Confirm</span>
              </div>

              {step === 4 && (
                <div className="p-5">
                  {/* Recap — everything the buyer picked in steps 1-3, one place */}
                  <div className="rounded-[10px] border border-bone bg-cream px-4 py-3 mb-4 flex flex-col gap-2.5">
                    <div className="flex justify-between gap-3 text-[12.5px]">
                      <span className="text-slate flex-shrink-0">Deliver to</span>
                      <span className="font-medium text-carbon text-right">
                        {selectedAddr?.recipientName} — {selectedAddr?.addressLine1}, {selectedAddr?.city}, {selectedAddr?.state}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 text-[12.5px]">
                      <span className="text-slate flex-shrink-0">Shipping</span>
                      <span className="font-medium text-carbon text-right">
                        {selectedZone ? `${selectedZone.city}, ${selectedZone.province} · ${currencySymbol(checkout?.currency)} ${selectedZone.shippingPrice.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 text-[12.5px]">
                      <span className="text-slate flex-shrink-0">Payment</span>
                      <span className="font-medium text-carbon text-right">
                        {!selectedMethod ? '—' : selectedMethod === 'split' && summary?.digitalSubtotal != null && summary?.physicalSubtotal != null
                          ? `${PAYMENT_LABELS.split.label} · ${currencySymbol(checkout?.currency)} ${summary.digitalSubtotal.toFixed(2)} now, ${currencySymbol(checkout?.currency)} ${summary.physicalSubtotal.toFixed(2)} on delivery`
                          : `${PAYMENT_LABELS[selectedMethod]?.label ?? selectedMethod} · ${currencySymbol(checkout?.currency)} ${(chargeAmount ?? total).toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate mb-4">
                    <ShieldCheck size={12} className="text-success" />
                    Your payment info is secure and encrypted
                  </div>

                  {placeError && (
                    <div className="flex items-start gap-2 text-[12px] text-error bg-error-bg border border-error-border rounded-[8px] px-3 py-2 mb-4">
                      <AlertCircle size={13} className="mt-[1px] flex-shrink-0" />
                      {placeError}
                    </div>
                  )}

                  {selectedMethod === 'stripe' || selectedMethod === 'split' ? (
                    <CardPaymentSlot
                      checkoutReady={!!checkout}
                      clientSecret={clientSecret}
                      initiating={initiatingPayment}
                      initiateError={initiatePaymentErr}
                      polling={pollingStatus}
                      amount={chargeAmount ?? total}
                      currency={checkout?.currency ?? 'USD'}
                      onConfirmed={handleStripeConfirmed}
                    />
                  ) : selectedMethod === 'manual_bank_transfer' ? (
                    checkout && (
                      <ManualBankTransferSlot
                        checkoutId={checkout._id}
                        amount={total}
                        currency={checkout.currency}
                        fxSnapshots={checkout.fxSnapshots}
                        onSubmitted={handleManualPaymentSubmitted}
                      />
                    )
                  ) : (
                    <Button
                      variant="primary" size="lg"
                      disabled={!selectedMethod}
                      loading={placing}
                      icon={!placing && <PackageCheck size={16} />}
                      onClick={handlePlaceOrder}
                      className="gap-2 w-full justify-center"
                    >
                      {placing ? 'Placing Order…' : 'Confirm & Pay'}
                    </Button>
                  )}
                </div>
              )}
            </div>

          </div>
          )} {/* end isDigital ? ... : ... */}

          {/* ── Right: Order Summary ──────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-bone p-6 lg:sticky top-20">
            <p className="text-[15px] font-bold text-carbon mb-[18px]">Order Summary</p>

            {/* Items — the whole cart, one order */}
            <div className="flex flex-col gap-2 mb-5">
              {(() => { const cur = currencySymbol(checkout?.currency); return checkout
                ? checkout.items.map(item => (
                  <div key={item.variantId} className="flex justify-between text-[12px]">
                    <span className="text-carbon truncate max-w-[150px]">
                      {item.name}
                      <span className="text-slate ml-1">×{item.quantity}</span>
                    </span>
                    <span className="font-medium text-carbon flex-shrink-0">
                      {cur} {item.totalPrice.toLocaleString()}
                    </span>
                  </div>
                ))
                : !cartLoading && cartItems.map(item => {
                  const price = item.unitPrice ?? item.price ?? 0;
                  const ttl   = item.itemTotal ?? price * item.quantity;
                  return (
                    <div key={item.productVariantId} className="flex justify-between text-[12px]">
                      <span className="text-carbon truncate max-w-[150px]">
                        {item.name}
                        <span className="text-slate ml-1">×{item.quantity}</span>
                      </span>
                      <span className="font-medium text-carbon flex-shrink-0">
                        {cur} {ttl.toLocaleString()}
                      </span>
                    </div>
                  );
                })
              })()}
            </div>

            <div className="h-px bg-bone mb-4" />

            <div className="flex flex-col gap-3 mb-5">
              <div className="flex justify-between text-[13px]">
                <span className="text-slate">Subtotal</span>
                <span className="font-semibold text-carbon">{currencySymbol(checkout?.currency)} {orderSubtotal.toLocaleString()}</span>
              </div>
              {!isDigital && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate">Shipping</span>
                  {selectedZone || summary
                    ? <span className="font-semibold text-carbon">{currencySymbol(checkout?.currency)} {shipping.toLocaleString()}</span>
                    : <span className="text-slate font-medium">Select method</span>
                  }
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-slate">Tax</span>
                  <span className="font-semibold text-carbon">{currencySymbol(checkout?.currency)} {tax.toLocaleString()}</span>
                </div>
              )}
              {!!summary?.subscriberSavingsUSD && summary.subscriberSavingsUSD > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-success">Member savings</span>
                  <span className="font-semibold text-success">-{currencySymbol(checkout?.currency)}{summary.subscriberSavingsUSD.toFixed(2)}</span>
                </div>
              )}
              {/* Already baked into each item's totalPrice at checkout-creation
                  time (same as member savings above) — shown here purely as a
                  breakdown line, not subtracted again in the total below.
                  Despite the "USD" field-name suffix (a naming holdover from
                  before PKR support), this is already denominated in the
                  checkout's own currency — see CheckoutService.applyCoupon's
                  "checkout's own display currency" comment for the coupon
                  case, and the parallel per-item-native-currency math for
                  the campaign case below. */}
              {!!summary?.campaignDiscountUSD && summary.campaignDiscountUSD > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-success">Sale discount</span>
                  <span className="font-semibold text-success">-{currencySymbol(checkout?.currency)}{summary.campaignDiscountUSD.toFixed(2)}</span>
                </div>
              )}
              {/* Same "already baked in" convention as the sale discount above —
                  a seller's own automatic (no-code) discount, applied server-side
                  at checkout creation, not subtracted again in the total below. */}
              {!!summary?.autoDiscountUSD && summary.autoDiscountUSD > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-success">Discount</span>
                  <span className="font-semibold text-success">-{currencySymbol(checkout?.currency)}{summary.autoDiscountUSD.toFixed(2)}</span>
                </div>
              )}
              {/* The backend rejects a coupon outright (see CheckoutService.applyCoupon)
                  if it would compute to zero real savings — e.g. every eligible
                  item is already on an active sale — so `checkout.couponCode`
                  being set here always means a genuine, nonzero discount. */}
              {!!checkout?.couponCode && (
                <div className="flex justify-between text-[13px]">
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 size={12} /> Coupon ({checkout.couponCode})
                  </span>
                  <span className="font-semibold text-success">-{currencySymbol(checkout?.currency)}{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              {!!checkout?.giftCardCode && (
                <div className="flex justify-between text-[13px]">
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 size={12} /> Gift card ({checkout.giftCardCode})
                  </span>
                  <span className="font-semibold text-success">-{currencySymbol(checkout?.currency)}{giftCardDiscount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {checkout && (
              <div className="mb-4">
                {checkout.couponCode ? (
                  <button
                    onClick={handleRemoveCoupon}
                    disabled={couponBusy}
                    className="text-[12px] font-medium text-error bg-transparent border-none cursor-pointer p-2 -m-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
                  >
                    Remove coupon
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Coupon or reward code"
                      className="flex-1 min-w-0 px-3 min-h-11 text-[12.5px] border border-bone rounded-lg outline-none text-charcoal bg-white focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponBusy || !couponInput.trim()}
                      className="px-4 min-h-11 bg-white border border-bone rounded-lg text-[12.5px] font-semibold text-graphite cursor-pointer hover:bg-cream disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                    >
                      {couponBusy ? 'Applying…' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && <p className="text-[11px] text-error mt-1.5">{couponError}</p>}
                {couponSuccessMsg && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-success mt-1.5">
                    <CheckCircle2 size={12} /> {couponSuccessMsg}
                  </p>
                )}
              </div>
            )}

            {checkout && (
              <div className="mb-4">
                {checkout.giftCardCode ? (
                  <button
                    onClick={handleRemoveGiftCard}
                    disabled={giftCardBusy}
                    className="text-[12px] font-medium text-error bg-transparent border-none cursor-pointer p-2 -m-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
                  >
                    Remove gift card
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={giftCardInput}
                      onChange={e => setGiftCardInput(e.target.value.toUpperCase())}
                      placeholder="Gift card code"
                      className="flex-1 min-w-0 px-3 min-h-11 text-[12.5px] border border-bone rounded-lg outline-none text-charcoal bg-white focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
                    />
                    <button
                      onClick={handleApplyGiftCard}
                      disabled={giftCardBusy || !giftCardInput.trim()}
                      className="px-4 min-h-11 bg-white border border-bone rounded-lg text-[12.5px] font-semibold text-graphite cursor-pointer hover:bg-cream disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                    >
                      {giftCardBusy ? 'Applying…' : 'Apply'}
                    </button>
                  </div>
                )}
                {giftCardError && <p className="text-[11px] text-error mt-1.5">{giftCardError}</p>}
                {giftCardSuccessMsg && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-success mt-1.5">
                    <CheckCircle2 size={12} /> {giftCardSuccessMsg}
                  </p>
                )}
              </div>
            )}

            <div className="h-px bg-bone mb-4" />

            <div className="flex justify-between text-[16px] font-bold">
              <span className="text-carbon">Total</span>
              <span className="text-carbon">{currencySymbol(checkout?.currency)} {total.toLocaleString()}</span>
            </div>

            {checkout && (
              <p className="text-[11px] text-slate mt-2 text-right">
                Checkout ID: {checkout._id.slice(-8).toUpperCase()}
              </p>
            )}

            {savingsHints.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {savingsHints.map(hint => (
                  <button
                    key={hint.storeId}
                    onClick={() => hint.storeSlug && (navigate(getStorePagePath(hint.storeSlug)))}
                    className="w-full text-left px-3.5 py-3 rounded-lg bg-brand-pale-orange border border-brand-orange/20 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                  >
                    <p className="text-[12.5px] font-semibold text-brand-deep-orange">
                      You could save ${hint.potentialSavingsUSD.toFixed(2)} on this order
                    </p>
                    <p className="text-[11px] text-brand-orange/80 mt-0.5">
                      Join {hint.storeName}'s {hint.planName} membership before checking out →
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
