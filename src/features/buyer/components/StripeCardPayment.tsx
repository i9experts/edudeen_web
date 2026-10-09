import { useState, type FormEvent } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/comman/ui/Button';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { currencySymbol } from '@/utils/currency';

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

// Loaded once and reused — loadStripe() is expensive and Stripe's own docs
// warn against calling it more than once per publishable key.
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!PUBLISHABLE_KEY) return null;
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}

/** Gates every card-payment UI path — until a real key is set this always
 *  returns false, and callers fall back to a "coming soon" state instead of
 *  rendering a broken form. Set VITE_STRIPE_PUBLISHABLE_KEY to go live. */
export function isStripeConfigured() {
  return !!PUBLISHABLE_KEY;
}

interface StripeCardPaymentProps {
  clientSecret: string;
  amount:       number;
  currency:     string;
  /** Called once Stripe confirms the PaymentIntent client-side — the parent
   *  should then poll apiGetPaymentStatus(checkoutId) until the order is finalized. */
  onConfirmed:  () => void;
}

function PaymentForm({ amount, currency, onConfirmed }: Omit<StripeCardPaymentProps, 'clientSecret'>) {
  const stripe   = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please check your details and try again.');
      setSubmitting(false);
      return;
    }
    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      onConfirmed();
      return;
    }
    setError('Payment did not complete. Please try again.');
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-error-bg px-[14px] py-[10px] text-[13px] text-error">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button variant="primary" size="lg" fullWidth type="submit" loading={submitting} disabled={!stripe || !elements}>
        Pay {currencySymbol(currency)}{amount.toLocaleString()}
      </Button>

      <p className="flex items-center justify-center gap-[6px] text-[12px] text-slate">
        <ShieldCheck size={12} className="text-success shrink-0" /> Payments are encrypted and secured by Stripe
      </p>
    </form>
  );
}

/** Real Stripe Elements card form — renders nothing if VITE_STRIPE_PUBLISHABLE_KEY
 *  isn't set. Callers should check isStripeConfigured() first and show a
 *  "coming soon" state instead of mounting this. */
export function StripeCardPayment({ clientSecret, amount, currency, onConfirmed }: StripeCardPaymentProps) {
  const promise = getStripe();
  if (!promise) return null;

  return (
    <Elements
      stripe={promise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#174771',
            colorText: '#2C2A28',
            colorDanger: '#C13030',
            fontFamily: 'Arial, Helvetica, system-ui, sans-serif',
            borderRadius: '8px',
            fontSizeBase: '13px',
          },
        },
      }}
    >
      <PaymentForm amount={amount} currency={currency} onConfirmed={onConfirmed} />
    </Elements>
  );
}
