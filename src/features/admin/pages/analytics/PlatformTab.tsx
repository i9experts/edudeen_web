import { MetricCard } from '@/components/comman/ui';
import { LineChart } from '@/components/comman/charts';
import { useAdminAnalyticsPlatformMetrics } from '@/hooks/admin/useAdminAnalytics';
import type { BaseAnalyticsParams } from '@/api/services/analytics/adminAnalytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatBucketLabel, formatPercent } from '@/components/comman/analytics/format';

export function PlatformTab({ params }: { params: BaseAnalyticsParams }) {
  const platform = useAdminAnalyticsPlatformMetrics(params);

  if (platform.error) {
    return <AnalyticsErrorState message={platform.error} onRetry={platform.refetch} />;
  }

  const d = platform.data;
  const c = d?.conversionMetrics;

  return (
    <div className="flex flex-col gap-4">
      {platform.loading ? (
        <ChartCardSkeleton height={260} />
      ) : d ? (
        <LineChart
          title="Marketplace Growth"
          subtitle="New sellers, stores & products"
          height={260}
          data={(d.marketplaceGrowth ?? []).map(p => ({
            label: formatBucketLabel(p.date, d.granularity),
            newSellers: p.newSellers,
            newStores: p.newStores,
            newProducts: p.newProducts,
          }))}
          lines={[
            { dataKey: 'newSellers', label: 'New Sellers', color: '#174771' },
            { dataKey: 'newStores', label: 'New Stores', color: '#2156A8' },
            { dataKey: 'newProducts', label: 'New Products', color: '#2D8A4E' },
          ]}
        />
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard label="New Users in Period" value={c ? c.newUsersInPeriod.toLocaleString() : ''} loading={platform.loading} />
        <MetricCard label="New Users Who Ordered" value={c ? c.newUsersWhoOrdered.toLocaleString() : ''} loading={platform.loading} />
        <MetricCard label="Signup → Order Conversion" value={c ? formatPercent(c.signupToOrderConversionPercent) : ''} loading={platform.loading} />
      </div>

      {c?.note && (
        <p className="text-[11px] text-slate bg-cream border border-bone rounded-lg px-3 py-2">{c.note}</p>
      )}
    </div>
  );
}
