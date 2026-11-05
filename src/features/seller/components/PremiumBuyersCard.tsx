import { MetricCard } from '@/components/comman/ui';
import { useStoreDashboardSummary } from '@/hooks/store/useStoreDashboardSummary';
import { formatNumber } from '@/components/comman/analytics/format';
import { formatMoneyCompact } from '@/utils/currency';

/** Edudeen Premium member orders (last 30 days). Moved from the dashboard KPI row to Analytics; hidden at 0. */
export function PremiumBuyersCard({ storeId }: { storeId: string }) {
  const { data } = useStoreDashboardSummary(storeId);
  const premium = data?.premium;
  if (!premium || premium.premiumOrders <= 0) return null;
  return (
    <div className="mb-5 max-w-md">
      <MetricCard
        label={`Premium buyers (${premium.windowDays} days)`}
        value={`${formatNumber(premium.premiumOrders)} order${premium.premiumOrders === 1 ? '' : 's'}`}
        sub={premium.byCurrency.map(c => `${formatMoneyCompact(c.premiumDiscountGiven, c.currency)} discount given${(c.platformFundedDiscount ?? 0) > 0 ? ` + ${formatMoneyCompact(c.platformFundedDiscount ?? 0, c.currency)} paid by Edudeen` : ''}`).join(' · ') || undefined}
        to={`/store/${storeId}/settings`}
      />
    </div>
  );
}
