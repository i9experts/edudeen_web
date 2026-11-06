import { Link } from 'react-router-dom';
import { DollarSign, Wallet, ShoppingCart, Gift, RotateCcw, Users, XCircle } from 'lucide-react';
import { MetricCard, Table, type TableColumn } from '@/components/comman/ui';
import { LineChart, BarChart } from '@/components/comman/charts';
import { useSellerAnalyticsOverview, useSellerAnalyticsRevenueOverTime, useSellerAnalyticsOrdersOverTime } from '@/hooks/seller/useSellerAnalytics';
import type { SellerAnalyticsParams } from '@/api/services/analytics/analytics';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { ChartCardSkeleton } from '@/components/comman/analytics/AnalyticsSkeletons';
import { formatNumber, formatPercent, formatBucketLabel, formatDate } from '@/components/comman/analytics/format';
import { formatMoney, formatMoneyCompact } from '@/utils/currency';

const TZ = 'Asia/Karachi';

interface ComparisonRow { metric: string; current: string; previous: string }

/** Badge for one card when compare is on: % change vs the previous period (lowerIsBetter flips the colour for refunds/cancellations). */
function delta(cur: number, prev: number, lowerIsBetter = false): { trend: string; trendUp: boolean } {
  if (prev === 0) return cur === 0 ? { trend: '0%', trendUp: true } : { trend: 'New', trendUp: !lowerIsBetter };
  const pct = ((cur - prev) / prev) * 100;
  return { trend: formatPercent(pct, { signed: true }), trendUp: lowerIsBetter ? pct <= 0 : pct >= 0 };
}

const INFO = {
  booked: 'Orders placed in this period, excluding cancelled orders and free claims. Unpaid cash-on-delivery orders are counted here.',
  collected: 'Money from paid orders only, minus refunds on them. Excludes cancelled orders and free claims; unpaid cash-on-delivery orders are not counted until paid.',
  orders: 'Orders in this period, excluding cancelled orders and free claims.',
  claims: 'Free products that buyers availed. Not counted as orders, customers or in the average order value.',
  aov: 'Order value (booked) divided by the number of orders, with cancelled orders and free claims excluded.',
  repeat: 'Share of this period\'s buyers who placed 2 or more orders in it. Free claims are excluded.',
  newCust: 'Buyers whose first order with your store falls inside this period. Cancelled orders and free claims are excluded.',
  returning: 'Buyers in this period who already ordered from your store before it. Free claims are excluded.',
  refunds: 'Refunds issued on orders in this period (cancelled orders and free claims excluded).',
  cancelled: 'Orders in this period that were cancelled.',
};

interface Props {
  params: SellerAnalyticsParams;
  compareToPreviousPeriod: boolean;
  currency?: string | null;
  /** For the "nothing yet" links; omitted in the cross-store view. */
  storeId?: string | null;
}

export function SellerOverviewTab({ params, compareToPreviousPeriod, currency, storeId }: Props) {
  // One params object feeds all three queries, so a range change refetches KPIs + both charts together.
  const overview = useSellerAnalyticsOverview(params);
  const revenue = useSellerAnalyticsRevenueOverTime(params);
  const orders = useSellerAnalyticsOrdersOverTime(params);

  const error = overview.error || revenue.error || orders.error;
  if (error) {
    return <AnalyticsErrorState message={error} onRetry={() => { void overview.refetch(); void revenue.refetch(); void orders.refetch(); }} />;
  }

  const d = overview.data;
  const loading = overview.loading || revenue.loading || orders.loading || !d;

  if (loading || !d) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 10 }).map((_, i) => <MetricCard key={i} label="" value="" loading />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCardSkeleton height={220} />
          <ChartCardSkeleton height={220} />
        </div>
      </div>
    );
  }

  const noActivity = d.totalOrders === 0 && d.freeClaims === 0 && d.cancelledOrders === 0;
  if (noActivity) {
    return (
      <div className="flex flex-col items-center text-center gap-2 py-12 px-6 bg-white border border-bone rounded-[10px]">
        <ShoppingCart size={26} className="text-slate" aria-hidden />
        <p className="text-[15px] font-bold text-carbon">No orders in this period</p>
        <p className="text-[13px] text-slate max-w-[420px]">Try a longer date range, or bring in more buyers by adding products and running a sale.</p>
        {storeId && (
          <div className="flex flex-wrap justify-center gap-4 mt-2 text-[13px] font-semibold">
            <Link to={`/store/${storeId}/products`} className="text-brand-royal hover:underline">Go to Products</Link>
            <Link to={`/store/${storeId}/marketing`} className="text-brand-royal hover:underline">Go to Marketing</Link>
          </div>
        )}
      </div>
    );
  }

  const p = compareToPreviousPeriod ? d.previousPeriod : undefined; // deltas exist only when compare is on
  const trendWord = d.repeatBuyerTrend ? d.repeatBuyerTrend.charAt(0).toUpperCase() + d.repeatBuyerTrend.slice(1) : undefined;
  const m = (v: number) => formatMoneyCompact(v, currency);

  const metrics = [
    { label: 'Order value (booked)', info: INFO.booked, value: m(d.bookedValue), icon: <DollarSign size={16} />, ...(p ? delta(d.bookedValue, p.bookedValue) : {}) },
    { label: 'Collected (paid)', info: INFO.collected, value: m(d.collected), icon: <Wallet size={16} />, ...(p ? delta(d.collected, p.collected) : {}) },
    { label: 'Total Orders', info: INFO.orders, value: formatNumber(d.totalOrders), icon: <ShoppingCart size={16} />, ...(p ? delta(d.totalOrders, p.totalOrders) : {}) },
    { label: 'Free claims', info: INFO.claims, value: formatNumber(d.freeClaims), icon: <Gift size={16} />, ...(p ? delta(d.freeClaims, p.freeClaims) : {}) },
    { label: 'Avg. Order Value', info: INFO.aov, value: m(d.avgOrderValue), icon: <DollarSign size={16} />, ...(p ? delta(d.avgOrderValue, p.avgOrderValue) : {}) },
    {
      label: 'Repeat Buyers', info: INFO.repeat, value: formatPercent(d.repeatBuyerPercent), icon: <Users size={16} />, sub: 'Of this period\'s buyers',
      ...(p && trendWord ? { trend: trendWord, trendUp: d.repeatBuyerTrend !== 'declining' } : {}),
    },
    { label: 'New Customers', info: INFO.newCust, value: formatNumber(d.newCustomersCount), icon: <Users size={16} />, ...(p ? delta(d.newCustomersCount, p.newCustomersCount) : {}) },
    { label: 'Returning Customers', info: INFO.returning, value: formatNumber(d.returningCustomersCount), icon: <Users size={16} />, ...(p ? delta(d.returningCustomersCount, p.returningCustomersCount) : {}) },
    { label: 'Refunds', info: INFO.refunds, value: m(d.totalRefunds), icon: <RotateCcw size={16} />, sub: `${formatPercent(d.refundRatePercent)} of order value`, ...(p ? delta(d.totalRefunds, p.totalRefunds, true) : {}) },
    { label: 'Cancelled Orders', info: INFO.cancelled, value: formatNumber(d.cancelledOrders), icon: <XCircle size={16} />, ...(p ? delta(d.cancelledOrders, p.cancelledOrders, true) : {}) },
  ];

  const comparisonColumns: TableColumn<ComparisonRow>[] = [
    { key: 'metric', header: 'Metric' },
    { key: 'previous', header: 'Previous Period', align: 'right' },
    { key: 'current', header: 'Current Period', align: 'right' },
  ];

  const comparisonRows: ComparisonRow[] = p ? [
    { metric: 'Order value (booked)', current: m(d.bookedValue), previous: m(p.bookedValue) },
    { metric: 'Collected (paid)', current: m(d.collected), previous: m(p.collected) },
    { metric: 'Total Orders', current: formatNumber(d.totalOrders), previous: formatNumber(p.totalOrders) },
    { metric: 'Free claims', current: formatNumber(d.freeClaims), previous: formatNumber(p.freeClaims) },
    { metric: 'Avg. Order Value', current: m(d.avgOrderValue), previous: m(p.avgOrderValue) },
    { metric: 'Repeat Buyers', current: formatPercent(d.repeatBuyerPercent), previous: formatPercent(p.repeatBuyerPercent) },
    { metric: 'New Customers', current: formatNumber(d.newCustomersCount), previous: formatNumber(p.newCustomersCount) },
    { metric: 'Returning Customers', current: formatNumber(d.returningCustomersCount), previous: formatNumber(p.returningCustomersCount) },
    { metric: 'Refunds', current: m(d.totalRefunds), previous: m(p.totalRefunds) },
    { metric: 'Cancelled Orders', current: formatNumber(d.cancelledOrders), previous: formatNumber(p.cancelledOrders) },
  ] : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(x => <MetricCard key={x.label} {...x} />)}
      </div>

      {p && (
        <div className="bg-white border border-bone rounded-[10px]">
          <div className="px-5 pt-4 pb-3">
            <p className="text-[14px] font-bold text-charcoal">Period Comparison</p>
            <p className="text-[12px] text-slate">
              {formatDate(p.period.from, TZ)} – {formatDate(p.period.to, TZ)} vs. {formatDate(d.period.from, TZ)} – {formatDate(d.period.to, TZ)}
            </p>
          </div>
          <Table columns={comparisonColumns} data={comparisonRows} keyExtractor={r => r.metric} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChart
          title="Revenue Over Time"
          subtitle="Order value (booked) vs. net of refunds"
          data={(revenue.data?.series ?? []).map(pt => ({
            label: formatBucketLabel(pt.date, revenue.data!.granularity, TZ),
            gross: pt.grossRevenue,
            net: pt.netRevenue,
          }))}
          lines={[
            { dataKey: 'gross', label: 'Order value (booked)', color: '#8C8A82' },
            { dataKey: 'net', label: 'Net of refunds', color: '#174771' },
          ]}
          yTickFormatter={v => formatMoneyCompact(v, currency)}
          tooltipFormatter={v => formatMoney(v, currency)}
        />

        <BarChart
          title="Orders Over Time"
          allowDecimals={false}
          subtitle="Orders, excluding cancelled and free claims"
          data={(orders.data?.series ?? []).map(pt => ({
            label: formatBucketLabel(pt.date, orders.data!.granularity, TZ),
            orders: pt.orderCount,
          }))}
          dataKey="orders"
          color="#174771"
        />
      </div>
    </div>
  );
}
