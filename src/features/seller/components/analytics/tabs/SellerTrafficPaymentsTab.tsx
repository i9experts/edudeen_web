import { Table, type TableColumn } from '@/components/comman/ui';
import { CreditCard } from 'lucide-react';
import { DonutChart } from '@/components/comman/charts';
import { useSellerAnalyticsTrafficSources, useSellerAnalyticsPaymentMethods } from '@/hooks/seller/useSellerAnalytics';
import type { SellerAnalyticsParams, PaymentMethodRow } from '@/api/services/analytics/analytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatMoneyCompact } from '@/utils/currency';

const SOURCE_LABELS: Record<string, string> = {
  marketplace_search: 'Marketplace Search',
  direct_link: 'Direct Link',
  social_media: 'Social Media',
  email: 'Email',
  other: 'Other',
};

export function SellerTrafficPaymentsTab({ params, currency }: { params: SellerAnalyticsParams; currency?: string | null }) {
  const traffic = useSellerAnalyticsTrafficSources(params);
  const payments = useSellerAnalyticsPaymentMethods(params);

  const methodColumns: TableColumn<PaymentMethodRow>[] = [
    { key: 'label', header: 'Method' },
    { key: 'orderCount', header: 'Orders', align: 'right' },
    { key: 'revenue', header: 'Revenue', align: 'right', render: r => formatMoneyCompact(r.revenue, currency) },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {traffic.loading ? (
        <ChartCardSkeleton height={220} />
      ) : traffic.error ? (
        <AnalyticsErrorState message={traffic.error} onRetry={traffic.refetch} />
      ) : (
        <DonutChart
          title="Traffic Sources"
          subtitle="Orders by attribution source"
          centerLabel="Orders"
          data={(traffic.data?.breakdown ?? []).map(b => ({ label: SOURCE_LABELS[b.source] ?? b.source, value: b.count }))}
        />
      )}

      <div className="flex flex-col gap-4">
        {payments.loading ? (
          <ChartCardSkeleton height={200} />
        ) : payments.error ? (
          <AnalyticsErrorState message={payments.error} onRetry={payments.refetch} />
        ) : (
          <DonutChart
            title="Revenue by Payment Method"
            data={(payments.data ?? []).map(m => ({ label: m.label, value: m.revenue }))}
          />
        )}

        <div className="bg-white border border-bone rounded-[10px]">
          <div className="px-5 pt-4 pb-3">
            <p className="text-[14px] font-bold text-charcoal">Payment Method Breakdown</p>
          </div>
          <Table
            columns={methodColumns}
            data={payments.data ?? []}
            keyExtractor={r => r.paymentType}
            loading={payments.loading}
            emptyState={{ icon: <CreditCard size={28} className="text-slate/50" />, title: 'No payment data yet', description: 'Payment methods used by your buyers appear here after your first paid order.' }}
          />
        </div>
      </div>
    </div>
  );
}
