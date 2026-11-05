import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, ShoppingBag, ExternalLink, Plus,
} from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { PlatformSalesCard } from './PlatformSalesCard';
import { AreaChart } from '@/components/comman/charts';
import { MetricCard, SkeletonBox, Button } from '@/components/comman/ui';
import type { SellerTodaySummaryData } from '@/api/services/analytics/analytics';
import type { InventoryProduct } from '@/api/services/product';
import { useStoreDashboardSummary } from '@/hooks/store/useStoreDashboardSummary';
import { SetupChecklistCard } from './SetupChecklistCard';
import { ActionRequiredCard } from './ActionRequiredCard';
import { WeeklyDigestCard } from './Analytic/ai/components/WeeklyDigestCard';
import { statusLabel } from '@/constants/statusLabels';
import { getStorefrontUrl } from '@/utils/storefrontUrl';
import { formatNumber, formatBucketLabel } from '@/components/comman/analytics/format';
import { formatMoneyCompact, formatMoney, currencySymbol } from '@/utils/currency';
import {
  StudioPanel, StudioTextLink, StudioPill, StudioTable,
} from '@/features/seller/components/studio/Studio';

// ── Today Snapshot ────────────────────────────────────────────────────────────
function TodaySnapshot({ today, currency }: { today: SellerTodaySummaryData; currency?: string | null }) {
  const up = today.revenueChangePercent >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;

  return (
    <section aria-label="Today" className="dash-section-enter bg-white border border-bone rounded-xl px-5 sm:px-[27px] py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
      <p className="text-[12px] font-bold text-brand-royal uppercase tracking-[0.15em] shrink-0 flex items-center gap-[7px]">
        <span className="size-[6px] rounded-full bg-success pos-live-pulse" />
        Today
      </p>

      <div className="flex items-center gap-2">
        <span className="text-[13px] text-slate">Revenue</span>
        <span className="font-serif text-[18px] text-carbon">{formatMoneyCompact(today.revenue, currency)}</span>
        {/* No change badge when there is nothing to compare (no revenue today, or no usable previous day). */}
        {today.revenue > 0 && Number.isFinite(today.revenueChangePercent) && today.revenueChangePercent !== 0 && (
          <span className={`inline-flex items-center gap-0.5 text-[12px] font-semibold px-[7px] py-[2px] rounded-full ${up ? 'text-success bg-success-bg' : 'text-error bg-error-bg'}`}>
            <TrendIcon size={11} />
            {Math.abs(today.revenueChangePercent).toFixed(0)}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[13px] text-slate">Orders</span>
        <span className="font-serif text-[18px] text-carbon">{formatNumber(today.ordersCount)}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[13px] text-slate">Avg. Order Value</span>
        <span className="font-serif text-[18px] text-carbon">
          {today.ordersCount > 0 ? formatMoneyCompact(today.avgOrderValue, currency) : '—'}
        </span>
      </div>

      {(today.freeClaims ?? 0) > 0 && (
        <span className="text-[12px] text-slate">
          {formatNumber(today.freeClaims ?? 0)} free {today.freeClaims === 1 ? 'claim' : 'claims'}
        </span>
      )}

      <span className="text-[12px] text-slate ml-auto shrink-0">vs. this time yesterday</span>
    </section>
  );
}

// ── Product shelf — the latest products with price, status and actions ──────
const STATUS_PILL: Record<string, { tone: 'green' | 'amber' | 'gray' | 'blue'; label: string }> = {
  active:    { tone: 'green', label: 'Published' },
  draft:     { tone: 'gray',  label: 'Draft' },
  scheduled: { tone: 'blue',  label: 'Scheduled' },
  pending:   { tone: 'amber', label: 'Pending review' },
  pending_review: { tone: 'amber', label: 'Pending review' },
  archived:  { tone: 'gray',  label: 'Archived' },
};

function ProductShelf({ products, total, currency, storeId }: {
  products: InventoryProduct[]; total: number; currency?: string | null; storeId: string;
}) {
  const navigate = useNavigate();
  const goAdd = () => navigate(`/store/${storeId}/products/add`);

  return (
    <StudioPanel
      title="Your product shelf"
      sub={total > 0 ? `${formatNumber(total)} product${total === 1 ? '' : 's'} in your catalog` : undefined}
      action={total > 0 ? <StudioTextLink onClick={() => navigate(`/store/${storeId}/products`)}>View all products</StudioTextLink> : undefined}
    >
      {products.length === 0 ? (
        <div className="rounded-xl bg-cream border border-bone px-6 py-10 text-center">
          <p className="font-serif text-[20px] text-carbon mb-1.5">Your shelf is empty — for now.</p>
          <p className="text-[13.5px] text-slate mb-5 max-w-[440px] mx-auto">
            Add a physical item or a digital download. It takes a few minutes.
          </p>
          <Button onClick={goAdd} icon={<Plus size={15} />}>Add your first product</Button>
        </div>
      ) : (
        <StudioTable
          caption="Latest products"
          head={[
            { label: 'Product' },
            { label: 'Type', className: 'hidden md:table-cell' },
            { label: 'Price' },
            { label: 'Status' },
            { label: 'Action' },
          ]}
        >
          {products.map(p => {
            const pill = STATUS_PILL[p.status] ?? { tone: 'gray' as const, label: statusLabel(p.status) };
            const kind = p.type === 'digital' ? 'Digital' : 'Physical';
            return (
              <tr key={p.productId}>
                <td>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-lg bg-cream border border-bone overflow-hidden shrink-0 flex items-center justify-center">
                      {p.image
                        ? <img src={p.image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        : <ShoppingBag size={14} className="text-slate" />}
                    </div>
                    <span className="truncate max-w-[280px]">{p.name}</span>
                  </div>
                </td>
                <td className="hidden md:table-cell text-slate">{kind}</td>
                <td className="whitespace-nowrap">{p.price > 0 ? formatMoney(p.price, currency) : 'Free'}</td>
                <td><StudioPill tone={pill.tone}>{pill.label}</StudioPill></td>
                <td>
                  <div className="flex items-center gap-4">
                    <StudioTextLink ariaLabel={`Preview ${p.name}`} onClick={() => navigate(`/store/${storeId}/products/detail/${p.productId}`)}>Preview</StudioTextLink>
                    <StudioTextLink ariaLabel={`Edit ${p.name}`} onClick={() => navigate(`/store/${storeId}/products/edit/${p.productId}`)}>Edit</StudioTextLink>
                  </div>
                </td>
              </tr>
            );
          })}
        </StudioTable>
      )}
    </StudioPanel>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function DashSkeleton() {
  return (
    <div className="px-4 md:px-8 py-8 flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
      <div>
        <SkeletonBox height={12} width={220} rounded="4px" className="mb-3" />
        <SkeletonBox height={34} width="50%" rounded="6px" className="mb-2" />
        <SkeletonBox height={14} width="35%" rounded="4px" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-xl border border-bone p-6">
            <SkeletonBox width={110} height={12} rounded="4px" className="mb-4" />
            <SkeletonBox width={96} height={28} rounded="4px" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-bone p-7">
        <SkeletonBox width={220} height={22} rounded="4px" className="mb-5" />
        {[0,1,2].map(i => <SkeletonBox key={i} width="100%" height={40} rounded="4px" className="mb-2" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <SkeletonBox width="100%" height={320} rounded="12px" />
        <SkeletonBox width="100%" height={320} rounded="12px" />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StoreDashboard() {
  const navigate = useNavigate();
  const { store, storeId, loading } = useStoreWorkspace();
  const { data: metrics, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useStoreDashboardSummary(storeId);

  const chartData = (metrics?.revenueSeries ?? []).map(p => ({
    month: formatBucketLabel(p.date, 'month'),
    revenue: p.grossRevenue,
  }));
  const revenueSparkline = (metrics?.revenueSeries ?? []).map(p => p.grossRevenue);
  const totalCustomers = metrics ? metrics.overview.newCustomersCount + metrics.overview.returningCustomersCount : 0;
  const isLive = store?.status === 'active';

  return (
    <div>
      <StorePageHeader title="Dashboard" />

      {loading || metricsLoading ? <DashSkeleton /> : (
        <div className="px-4 md:px-8 py-8 flex flex-col gap-6">

          {/* Compact store row */}
          <div className="dash-section-enter flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-bone bg-white px-4 py-3">
            <p className="font-serif text-[20px] text-carbon m-0 truncate max-w-full min-w-0">{store?.name ?? 'Your store'}</p>
            <StudioPill tone={isLive ? 'green' : 'gray'}>{isLive ? 'Live' : (store?.status ?? '—')}</StudioPill>
            <div className="flex items-center gap-2 ms-auto max-sm:w-full max-sm:ms-0">
              {store?.slug && (
                <a
                  href={getStorefrontUrl(store.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-[6px] px-4 py-2 rounded-xl bg-white border border-bone text-brand-royal text-[14px] font-bold no-underline hover:bg-cream transition-colors max-sm:flex-1 max-sm:justify-center"
                >
                  <ExternalLink size={14} />
                  View live store
                </a>
              )}
              <Button size="md" className="!text-[14px] !font-bold max-sm:flex-1 max-sm:justify-center" onClick={() => navigate(`/store/${storeId}/products/add`)} icon={<Plus size={15} />}>
                New product
              </Button>
            </div>
          </div>

          {metricsError && (
            <div role="alert" className="dash-section-enter flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-error-bg text-error text-[13px] border border-error/10">
              <span>{metricsError}</span>
              <button onClick={refetchMetrics} className="font-semibold underline bg-transparent border-none cursor-pointer text-error shrink-0">
                Try again
              </button>
            </div>
          )}

          {/* Action required: counts from the shared summary (same data feeds the sidebar badges) */}
          <ActionRequiredCard storeId={storeId} />

          {/* Admin sale campaigns — join right from the dashboard */}
          <PlatformSalesCard storeId={storeId} />

          {/* Opt-in weekly AI digest (hidden when AI is off) */}
          <WeeklyDigestCard storeId={storeId} />

          {/* Setup checklist (real data; hidden once complete) */}
          <SetupChecklistCard checklist={metrics?.checklist} profile={metrics?.profile} storeId={storeId} />

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            <MetricCard
              label="Order value (30 days)" value={formatMoneyCompact(metrics?.overview.totalRevenue ?? 0, store?.baseCurrency)}
              sub={metrics?.overview.totalRevenue ? 'Last 30 days' : 'No sales yet'}
              sparkline={revenueSparkline}
              to={`/store/${storeId}/orders`}
            />
            <MetricCard
              label="Orders (30 days)" value={formatNumber(metrics?.overview.totalOrders ?? 0)}
              sub={metrics?.overview.totalOrders ? `${formatNumber(metrics.overview.cancelledOrders)} cancelled` : 'No orders yet'}
              to={`/store/${storeId}/orders`}
            />
            <MetricCard
              label="Active products" value={formatNumber(metrics?.activeProducts ?? 0)}
              sub={metrics?.totalProducts
                ? (metrics.totalProducts > metrics.activeProducts ? `${formatNumber(metrics.totalProducts - metrics.activeProducts)} not published` : 'All published')
                : 'Add your first product'}
              to={`/store/${storeId}/products`}
            />
            <MetricCard
              label="Customers (30 days)" value={formatNumber(totalCustomers)}
              sub={totalCustomers ? `${formatNumber(metrics?.overview.newCustomersCount ?? 0)} new` : 'No customers yet'}
              to={`/store/${storeId}/customer/list`}
            />
          </div>

          {metrics?.today && <TodaySnapshot today={metrics.today} currency={store?.baseCurrency} />}

          {/* Product shelf */}
          <ProductShelf
            products={(metrics?.shelf ?? []) as InventoryProduct[]}
            total={metrics?.totalProducts ?? 0}
            currency={store?.baseCurrency}
            storeId={storeId}
          />

          {/* Revenue chart */}
          <AreaChart
            data={chartData}
            dataKey="revenue"
            xKey="month"
            title="Revenue Overview"
            subtitle="Monthly revenue trend"
            height={300}
            valuePrefix={currencySymbol(store?.baseCurrency)}
            yTickFormatter={v => v >= 1000 ? `${currencySymbol(store?.baseCurrency)}${(v / 1000).toFixed(0)}k` : `${currencySymbol(store?.baseCurrency)}${v}`}
          />

        </div>
      )}
    </div>
  );
}
