import { LineChart } from '@/components/comman/charts';
import { useAdminFinanceRevenueOverTime, useAdminFinanceCommissionOverTime } from '@/hooks/admin/useAdminFinance';
import type { AdminFinanceParams } from '@/api/services/finance/adminFinance';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatBucketLabel } from '@/components/comman/analytics/format';
import { currencySymbol } from '@/utils/currency';

export function FinanceRevenueTab({ params }: { params: AdminFinanceParams }) {
  const revenue = useAdminFinanceRevenueOverTime(params);
  const commission = useAdminFinanceCommissionOverTime(params);

  // Both series are broken down per settlement currency — a chart can't
  // correctly show a "$" prefix and a "Rs" prefix on the same line, so one
  // chart is rendered per currency actually present in the data.
  const revenueCurrencies = [...new Set((revenue.data?.series ?? []).flatMap((p) => p.byCurrency.map((c) => c.currency)))];
  const commissionCurrencies = [...new Set((commission.data?.series ?? []).flatMap((p) => p.byCurrency.map((c) => c.currency)))];

  return (
    <div className="flex flex-col gap-4">
      {revenue.loading ? (
        <ChartCardSkeleton height={280} />
      ) : revenue.error ? (
        <AnalyticsErrorState message={revenue.error} onRetry={revenue.refetch} />
      ) : (
        revenueCurrencies.map((currency) => (
          <LineChart
            key={currency}
            title={`Platform Revenue Over Time (${currency})`}
            subtitle="Gross vs. net, from the finance ledger (sale/refund transactions)"
            height={280}
            data={(revenue.data?.series ?? []).map((p) => {
              const row = p.byCurrency.find((c) => c.currency === currency);
              return {
                label: formatBucketLabel(p.date, revenue.data!.granularity),
                gross: row?.grossRevenue ?? 0,
                net: row?.netRevenue ?? 0,
              };
            })}
            lines={[
              { dataKey: 'gross', label: 'Gross Revenue', color: '#8C8A82' },
              { dataKey: 'net', label: 'Net Revenue', color: '#174771' },
            ]}
            valuePrefix={currencySymbol(currency)}
          />
        ))
      )}

      {commission.loading ? (
        <ChartCardSkeleton />
      ) : commission.error ? (
        <AnalyticsErrorState message={commission.error} onRetry={commission.refetch} />
      ) : (
        commissionCurrencies.map((currency) => (
          <LineChart
            key={currency}
            title={`Commission & Processing Fees (${currency})`}
            subtitle="What the platform earns per sale, over time"
            data={(commission.data?.series ?? []).map((p) => {
              const row = p.byCurrency.find((c) => c.currency === currency);
              return {
                label: formatBucketLabel(p.date, commission.data!.granularity),
                commission: row?.commission ?? 0,
                processingFees: row?.processingFees ?? 0,
              };
            })}
            lines={[
              { dataKey: 'commission', label: 'Platform Commission', color: '#174771' },
              { dataKey: 'processingFees', label: 'Processing Fees', color: '#2156A8' },
            ]}
            valuePrefix={currencySymbol(currency)}
          />
        ))
      )}
    </div>
  );
}
