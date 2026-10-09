import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { BuyerNavbar } from '@/components/comman/ui';
import { Button } from '@/components/comman/ui/Button';
import { apiGetPaymentStatus } from '@/api/services/payment';
import { useCartContext } from '@/contexts/CartContext';

/** Where JazzCash / Easypaisa send the buyer back to (via our API callback). Polls the real payment status. */
export function PkPaymentReturnPage() {
  usePageTitle('Confirming payment');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refetch: refetchCart } = useCartContext();
  const checkoutId = params.get('checkoutId');
  const claimed = params.get('status');
  const [state, setState] = useState<'checking' | 'failed' | 'slow'>(claimed === 'invalid' || !checkoutId ? 'failed' : 'checking');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!checkoutId || claimed === 'invalid') return;
    let stopped = false;
    const started = Date.now();
    const poll = async () => {
      if (stopped) return;
      try {
        const res = await apiGetPaymentStatus(checkoutId);
        if (stopped) return;
        if (res.data.status === 'completed') {
          await refetchCart();
          navigate('/order-success', { state: { orders: res.data.orders }, replace: true });
          return;
        }
        if (res.data.status === 'failed') { setState('failed'); return; }
      } catch { /* transient: keep polling */ }
      if (Date.now() - started > 30_000) { setState('slow'); return; }
      timer.current = setTimeout(poll, 1500);
    };
    poll();
    return () => { stopped = true; if (timer.current) clearTimeout(timer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutId, claimed]);

  return (
    <div className="min-h-screen bg-cream">
      <BuyerNavbar />
      <main className="max-w-[560px] mx-auto px-4 py-16 text-center">
        {state === 'checking' && (
          <>
            <p className="font-serif text-[24px] text-carbon mb-2">Confirming your payment…</p>
            <p className="text-[14px] text-slate">Please do not close this page.</p>
          </>
        )}
        {state === 'slow' && (
          <>
            <p className="font-serif text-[24px] text-carbon mb-2">Still confirming</p>
            <p className="text-[14px] text-slate mb-5">If you completed the payment it will appear in My Orders shortly.</p>
            <Link to="/account/orders"><Button variant="primary">Go to my orders</Button></Link>
          </>
        )}
        {state === 'failed' && (
          <>
            <p className="font-serif text-[24px] text-carbon mb-2">Payment was not completed</p>
            <p className="text-[14px] text-slate mb-5">You have not been charged for this order. You can try again or choose another payment method.</p>
            <Link to="/checkout"><Button variant="primary">Back to checkout</Button></Link>
          </>
        )}
      </main>
    </div>
  );
}
