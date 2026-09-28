import { useState, type FormEvent } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/comman/ui/Button';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

// Loaded once and reused — same convention as StripeCardPayment.tsx.
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!PUBLISHABLE_KEY) return null;
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY);
  return stripePromise;
}

export function isStripeConfigured() {
  return !!PUBLISHABLE_KEY;
}

interface StripeCardSetupProps {
  clientSecret: string;
  /** Called once Stripe confirms the SetupIntent client-side, with the
   *  SetupIntent id — the parent still needs to call
   *  apiConfirmOnboardingPaymentMethod(setupIntentId) to have the backend
   *  verify it and flip Seller.hasPlatformPaymentMethod. */
  onConfirmed: (setupIntentId: string) => void;
}

function SetupForm({ onConfirmed }: Omit<StripeCardSetupProps, 'clientSecret'>) {
  const stripe   = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Card setup failed. Please check your details and try again.');
      setSubmitting(false);
      return;
    }
    if (setupIntent && setupIntent.status === 'succeeded') {
      onConfirmed(setupIntent.id);
      return;
    }
    setError('Card setup did not complete. Please try again.');
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
        Save Card &amp; Continue
      </Button>

      <p className="flex items-center justify-center gap-[6px] text-[11px] text-slate">
        <ShieldCheck size={12} className="text-success shrink-0" /> Your card is encrypted and secured by Stripe — you won't be charged today
      </p>
    </form>
  );
}

/** Real Stripe Elements card-setup form (SetupIntent, not a charge) — renders
 *  nothing if VITE_STRIPE_PUBLISHABLE_KEY isn't set. Callers should check
 *  isStripeConfigured() first and show a fallback state instead of mounting
 *  this. */
export function StripeCardSetup({ clientSecret, onConfirmed }: StripeCardSetupProps) {
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
      <SetupForm onConfirmed={onConfirmed} />
    </Elements>
  );
}
