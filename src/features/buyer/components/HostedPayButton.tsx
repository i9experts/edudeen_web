import { useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/comman/ui/Button';
import { apiStartPkPayment, type HostedProvider, type HostedRedirect } from '@/api/services/payment';

/** Builds and submits a form so the browser lands on the gateway's hosted payment page. */
function followRedirect(r: HostedRedirect) {
  const form = document.createElement('form');
  form.method = r.method;
  form.action = r.url;
  for (const [name, value] of Object.entries(r.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

/** "Pay with JazzCash / Easypaisa": starts the payment server-side and hands the buyer to the gateway. */
export function HostedPayButton({ provider, checkoutId, label }: { provider: HostedProvider; checkoutId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await apiStartPkPayment(provider, checkoutId);
      followRedirect(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the payment. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div>
      {error && (
        <div role="alert" className="flex items-start gap-2 text-[12px] text-error bg-error-bg border border-error-border rounded-[8px] px-3 py-2 mb-3">
          <AlertCircle size={13} className="mt-[1px] shrink-0" />
          {error}
        </div>
      )}
      <Button variant="primary" size="lg" loading={busy} icon={!busy && <ExternalLink size={16} />} onClick={start} className="gap-2 w-full justify-center">
        {busy ? 'Redirecting…' : `Pay with ${label}`}
      </Button>
      <p className="text-[11.5px] text-slate mt-2 text-center">You will be taken to {label} to complete the payment securely.</p>
    </div>
  );
}
