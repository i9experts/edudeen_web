import { useNavigate, Navigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, ShoppingBag } from 'lucide-react';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui';
import { useStorePlan } from '@/hooks/store/useStorePlan';
import { useHasBuyerAccount, useSwitchToBuyer } from '@/hooks/auth/useSellerAccount';

/** Shown after sign-in (and once per session in the workspace) when the store's plan has ended. */
export default function StorePlanExpired() {
  const navigate = useNavigate();
  const { storeId } = useStoreWorkspace();
  const { sub, loaded } = useStorePlan(storeId);
  const hasBuyer = useHasBuyerAccount();
  const { switchToBuyer, busy, error } = useSwitchToBuyer(navigate);

  if (!loaded) return <div className="p-6"><SkeletonBox className="h-64 w-full max-w-xl mx-auto" /></div>;
  if (sub?.status !== 'expired' && sub?.status !== 'past_due') return <Navigate to={`/store/${storeId}/dashboard`} replace />;
  const pastDue = sub?.status === 'past_due';

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <div className="rounded-2xl border border-error-border bg-white p-6 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-bg text-error">
          <AlertTriangle size={24} />
        </span>
        <h1 className="text-[20px] font-semibold text-ink">{pastDue ? 'Your plan payment failed' : 'Your plan has ended'}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate">
          {pastDue
            ? 'Your products are hidden from buyers until the payment goes through. Update your payment method or choose a plan and they go live again automatically.'
            : 'Your products are hidden from buyers for now. Choose a plan and the same products go live again automatically.'}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button variant="primary" icon={<CreditCard size={16} />} onClick={() => navigate(`/store/${storeId}/plan-billing`)}>
            Choose a plan
          </Button>
          {hasBuyer !== null && (
            <Button variant="secondary" icon={<ShoppingBag size={16} />} loading={busy} onClick={() => switchToBuyer(!hasBuyer)}>
              {hasBuyer ? 'Switch to buyer account' : 'Create buyer account'}
            </Button>
          )}
        </div>
        {error && <p role="alert" className="mt-3 text-[13px] text-error">{error}</p>}
      </div>
    </div>
  );
}
