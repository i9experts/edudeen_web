import { MetricCard } from '@/components/comman/ui';
import { LineChart, DonutChart } from '@/components/comman/charts';
import { useSellerAnalyticsRevenueOverTime, useSellerAnalyticsRevenueBreakdown } from '@/hooks/seller/useSellerAnalytics';
import type { SellerAnalyticsParams } from '@/api/services/analytics/analytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatBucketLabel } from '@/components/comman/analytics/format';
import { formatMoneyCompact, currencySymbol } from '@/utils/currency';

export function SellerRevenueTab({ params, currency }: { params: SellerAnalyticsParams; currency?: string | null }) {
  const revenue = useSellerAnalyticsRevenueOverTime(params);
  const breakdown = useSellerAnalyticsRevenueBreakdown(params);

  return (
    <div className="flex flex-col gap-4">
      {revenue.loading ? (
        <ChartCardSkeleton height={280} />
      ) : revenue.error ? (
        <AnalyticsErrorState message={revenue.error} onRetry={revenue.refetch} />
      ) : (
        <LineChart
          title="Revenue Over Time"
          subtitle="Gross vs. net revenue"
          height={280}
          data={(revenue.data?.series ?? []).map(p => ({
            label: formatBucketLabel(p.date, revenue.data!.granularity),
            gross: p.grossRevenue,
            net: p.netRevenue,
          }))}
          lines={[
            { dataKey: 'gross', label: 'Gross Revenue', color: '#8C8A82' },
            { dataKey: 'net', label: 'Net Revenue', color: '#174771' },
          ]}
          valuePrefix={currencySymbol(currency)}
        />
      )}

      {breakdown.loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCardSkeleton height={200} />
          <ChartCardSkeleton height={200} />
        </div>
      ) : breakdown.error ? (
        <AnalyticsErrorState message={breakdown.error} onRetry={breakdown.refetch} />
      ) : breakdown.data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DonutChart
            title="Revenue Composition"
            subtitle="One-time orders vs. recurring subscriptions"
            centerLabel="Revenue"
            data={[
              { label: 'One-Time Orders', value: breakdown.data.oneTimeOrderRevenue },
              { label: 'Subscriptions', value: breakdown.data.recurringSubscriptionRevenue },
            ]}
          />
          <div className="grid grid-cols-1 gap-3">
            <MetricCard label="One-Time Order Revenue" value={formatMoneyCompact(breakdown.data.oneTimeOrderRevenue, currency)} />
            <MetricCard label="Recurring Subscription Revenue" value={formatMoneyCompact(breakdown.data.recurringSubscriptionRevenue, currency)} />
            <MetricCard label="Total Revenue" value={formatMoneyCompact(breakdown.data.totalRevenue, currency)} />
          </div>
        </div>
      ) : null}

      {breakdown.data?.note && (
        <p className="text-[11px] text-slate bg-cream border border-bone rounded-lg px-3 py-2">{breakdown.data.note}</p>
      )}
    </div>
  );
}
