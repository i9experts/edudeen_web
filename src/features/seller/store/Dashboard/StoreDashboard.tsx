import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, ShoppingBag, Package, Users,
  CheckCircle, Clock, Globe, Copy, ExternalLink,
  ArrowRight, Settings, Sparkles, BarChart2,
  ClipboardList, Megaphone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { AreaChart } from '@/components/comman/charts';
import { MetricCard, SkeletonBox, Button, CoverImage } from '@/components/comman/ui';
import {
  apiSellerAnalyticsOverview, apiSellerAnalyticsRevenueOverTime, apiSellerAnalyticsToday,
  type SellerOverviewData, type RevenuePoint, type SellerTodaySummaryData,
} from '@/api/services/analytics/analytics';
import { apiGetStoreInventory } from '@/api/services/product';
import { getStorefrontUrl } from '@/utils/storefrontUrl';
import { formatNumber, formatBucketLabel } from '@/components/comman/analytics/format';
import { formatMoneyCompact, currencySymbol } from '@/utils/currency';

interface StoreMetrics {
  overview:      SellerOverviewData;
  revenueSeries: RevenuePoint[];
  totalProducts: number;
  today:         SellerTodaySummaryData;
}

function useStoreDashboardMetrics(storeId: string) {
  const [metrics, setMetrics] = useState<StoreMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const refetch = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      apiSellerAnalyticsOverview({ storeId, range: '30d' }),
      apiSellerAnalyticsRevenueOverTime({ storeId, range: '6m', granularity: 'month' }),
      apiGetStoreInventory(storeId, 1, 1),
      apiSellerAnalyticsToday(storeId),
    ])
      .then(([overviewRes, revenueRes, inventoryRes, todayRes]) => {
        if (cancelled) return;
        setMetrics({
          overview: overviewRes.data,
          revenueSeries: revenueRes.data.series,
          totalProducts: inventoryRes.data.stats.totalProducts,
          today: todayRes.data,
        });
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load store metrics.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeId, reloadKey]);

  return { metrics, loading, error, refetch };
}

// ── Badge style maps ───────────────────────────────────────────────────────────
const planStyles: Record<string, { bg: string; color: string }> = {
  starter:      { bg: '#EAF0FB', color: '#2156A8' },
  professional: { bg: '#EAF7EF', color: '#1E7A3C' },
  enterprise:   { bg: '#F5F0FF', color: '#7C3AED' },
};
const typeStyles: Record<string, { bg: string; color: string }> = {
  creator: { bg: '#FFF4E5', color: '#B36200' },
  seller:  { bg: '#EAF0FB', color: '#2156A8' },
  brand:   { bg: '#F5F0FF', color: '#7C3AED' },
};

// ── Store hero — logo, live/status badge, plan, quick actions, all real data
// already resolved by `useStoreWorkspace()` — replaces the plain page title. ──
function StoreHero({ store }: { store: ReturnType<typeof useStoreWorkspace>['store'] }) {
  const navigate = useNavigate();
  const isLive = store?.status === 'active';

  return (
    <CoverImage
      src={store?.coverImage}
      loading="eager"
      overlay
      overlayClassName="bg-gradient-to-br from-carbon/92 via-[#241f1b]/88 to-brand-deep-orange/75"
      fallbackClassName="bg-gradient-to-br from-carbon via-[#241f1b] to-brand-deep-orange"
      className="dash-section-enter rounded-2xl"
    >
      <div className="px-6 py-6 sm:px-7 sm:py-7 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }}
      />
      <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-brand-orange/25 blur-3xl" />

      <div className="relative flex items-center gap-4 flex-1 min-w-0">
        <div className="size-14 rounded-2xl bg-white/10 ring-2 ring-white/15 flex items-center justify-center shrink-0 overflow-hidden">
          {store?.logo
            ? <img loading="lazy" decoding="async" src={store.logo} alt={store.name} className="w-full h-full object-cover" />
            : <Globe size={24} className="text-white/80" />}
        </div>
        <div className="min-w-0">
          <p className="text-[20px] sm:text-[22px] font-bold text-white leading-tight truncate">
            {store?.name ?? '—'}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-[6px] rounded-full px-[10px] py-[4px] text-[12px] font-medium ${isLive ? 'bg-success/20 text-[#8fe3ac]' : 'bg-white/10 text-white/80'}`}>
              <span className={`size-[6px] rounded-full ${isLive ? 'bg-[#8fe3ac] pos-live-pulse' : 'bg-white/50'}`} />
              {isLive ? 'Live' : (store?.status ?? '—')}
            </span>
            {store?.plan && (
              <span className="inline-flex items-center rounded-full bg-white/10 px-[10px] py-[4px] text-[12px] font-medium text-white/85 capitalize">
                {store.plan} plan
              </span>
            )}
            {store?.slug && (
              <span className="hidden sm:inline-flex items-center rounded-full bg-white/10 px-[10px] py-[4px] text-[12px] font-medium text-white/60">
                /{store.slug}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-2 flex-wrap shrink-0">
        <Button
          variant="outline" size="sm"
          className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20"
          onClick={() => navigate(`/store/${store?._id ?? ''}/settings`)}
        >
          Settings
        </Button>
        {store?.slug && (
          <a
            href={getStorefrontUrl(store.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-[6px] px-[14px] py-[9px] rounded-lg bg-white text-brand-deep-orange text-[13px] font-bold no-underline transition-transform duration-150 hover:scale-[1.03]"
          >
            <ExternalLink size={14} />
            View Live Store
          </a>
        )}
      </div>
      </div>
    </CoverImage>
  );
}

// ── Store Info Card ───────────────────────────────────────────────────────────
function StoreInfoCard() {
  const navigate = useNavigate();
  const { store, storeId } = useStoreWorkspace();
  const [copied, setCopied] = useState(false);

  const statusColor = store?.status === 'active' ? '#22C55E' : '#8C8A82';
  const StatusIcon  = store?.status === 'active' ? CheckCircle : Clock;
  const planStyle   = planStyles[store?.plan ?? ''] ?? { bg: '#F0EEE6', color: '#5A5852' };
  const typeStyle   = typeStyles[store?.sellerType ?? ''] ?? { bg: '#F0EEE6', color: '#5A5852' };

  const handleCopy = () => {
    if (store?.slug) {
      navigator.clipboard.writeText(`/${store.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-bone hover:border-slate/30 transition-colors duration-200 flex flex-col h-full">

      {/* Logo + name + badges */}
      <div className="px-5 pt-5 pb-4 border-b border-[#f3f2ec]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-[10px] bg-brand-pale-orange border border-[#eae8de] flex items-center justify-center overflow-hidden shrink-0">
            {store?.logo
              ? <img loading="lazy" decoding="async" src={store.logo} alt={store?.name} className="w-full h-full object-cover" />
              : <Globe size={18} className="text-brand-orange" />}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-charcoal overflow-hidden text-ellipsis whitespace-nowrap">
              {store?.name ?? '—'}
            </p>
            <p className="text-[11px] text-slate mt-[2px]">Store Workspace</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-[6px]">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-[3px] rounded-full"
            style={{ background: statusColor + '18', color: statusColor }}
          >
            <StatusIcon size={9} />
            {store?.status ?? '—'}
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-[3px] rounded-full"
            style={planStyle}
          >
            {store?.plan ?? '—'} plan
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-[3px] rounded-full capitalize"
            style={typeStyle}
          >
            {store?.sellerType ?? '—'}
          </span>
        </div>
      </div>

      {/* URL + Product Types */}
      <div className="px-5 py-4 border-b border-[#f3f2ec] flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.06em] mb-1.5">Store URL</p>
          <div className="flex items-center gap-2 bg-[#f7f6f1] rounded-lg px-[10px] py-[8px] border border-[#edebd8]">
            <span className="flex-1 text-[12px] font-medium text-charcoal overflow-hidden text-ellipsis whitespace-nowrap">
              /{store?.slug ?? '…'}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 border-0 bg-transparent p-0 cursor-pointer transition-transform active:scale-90"
              title="Copy URL"
            >
              <Copy size={12} className={copied ? 'text-[#22c55e]' : 'text-slate'} />
            </button>
          </div>
          {copied && <p className="text-[10px] text-[#22c55e] mt-1 font-medium">Copied!</p>}
        </div>

        {(store?.productTypes?.length ?? 0) > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate uppercase tracking-[0.06em] mb-1.5">
              Product Types
            </p>
            <div className="flex flex-wrap gap-1">
              {store!.productTypes!.map(pt => (
                <span
                  key={pt}
                  className="text-[10px] font-medium text-charcoal bg-bone border border-bone px-[8px] py-[3px] rounded-[5px] capitalize"
                >
                  {pt.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action links */}
      <div className="px-3 py-3 mt-auto flex flex-col gap-0.5">
        <button
          onClick={() => navigate(`/store/${storeId}/settings`)}
          className="flex items-center gap-2.5 px-[10px] py-[9px] rounded-lg text-[12px] font-medium text-charcoal bg-transparent border-0 cursor-pointer text-left transition-colors duration-150 hover:bg-[#f7f6f1] w-full"
        >
          <Settings size={13} className="text-slate shrink-0" />
          Store Settings
          <ArrowRight size={11} className="text-dark-text ml-auto" />
        </button>
        {store?.slug && (
          <a
            href={getStorefrontUrl(store.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-[10px] py-[9px] rounded-lg text-[12px] font-medium text-charcoal no-underline transition-colors duration-150 hover:bg-[#f7f6f1]"
          >
            <ExternalLink size={13} className="text-slate shrink-0" />
            View Live Store
            <ExternalLink size={10} className="text-dark-text ml-auto" />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Quick Actions Row ─────────────────────────────────────────────────────────
interface QuickAction { Icon: LucideIcon; label: string; path: string; gradient: string; iconColor: string }

function QuickActionsRow({ storeId }: { storeId: string }) {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    { Icon: ShoppingBag,   label: 'Add Product', path: 'products/add', gradient: 'from-brand-pale-orange to-brand-pale-orange', iconColor: '#174771' },
    { Icon: Package,       label: 'View Orders', path: 'orders',        gradient: 'from-[#f3e8ff] to-[#ede0fe]',         iconColor: '#8B5CF6' },
    { Icon: BarChart2,     label: 'Analytics',   path: 'analytics',     gradient: 'from-info-bg to-[#dcebfa]',         iconColor: '#0EA5E9' },
    { Icon: ClipboardList, label: 'Inventory',   path: 'inventory',     gradient: 'from-[#eaf7ef] to-[#dff3e7]',         iconColor: '#22C55E' },
    { Icon: Megaphone,     label: 'Marketing',   path: 'marketing',     gradient: 'from-[#fff4e5] to-[#feebcf]',         iconColor: '#F59E0B' },
    { Icon: Sparkles,      label: 'AI Studio',   path: 'ai/studio',     gradient: 'from-cream to-bone',                  iconColor: '#A855F7' },
  ];

  return (
    <div className="bg-white border border-bone rounded-2xl hover:border-slate/30 transition-colors duration-200">
      <div className="px-5 pt-4 pb-3 border-b border-[#f3f2ec]">
        <p className="text-sm font-bold text-charcoal">Quick Actions</p>
      </div>
      <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map(({ Icon, label, path, gradient, iconColor }) => (
          <button
            key={label}
            onClick={() => navigate(`/store/${storeId}/${path}`)}
            className={`group flex flex-col items-center gap-2 py-4 px-2 rounded-[14px] border border-bone bg-gradient-to-br ${gradient} cursor-pointer transition-all duration-200 hover:-translate-y-[3px] hover:border-brand-orange/25 w-full`}
          >
            <div
              className="w-9 h-9 rounded-[10px] bg-white/70 border border-white/60 flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              style={{ color: iconColor }}
            >
              <Icon size={16} />
            </div>
            <span className="text-[11px] font-semibold text-charcoal text-center leading-[1.3]">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Today Snapshot ────────────────────────────────────────────────────────────
function TodaySnapshot({ today, currency }: { today: SellerTodaySummaryData; currency?: string | null }) {
  const up = today.revenueChangePercent >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;

  return (
    <div className="dash-section-enter bg-white border border-bone rounded-2xl hover:border-slate/30 transition-colors duration-200 px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
      <p className="text-[13px] font-bold text-charcoal shrink-0 flex items-center gap-[6px]">
        <span className="size-[6px] rounded-full bg-success pos-live-pulse" />
        Today
      </p>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate">Revenue</span>
        <span className="text-[14px] font-bold text-carbon">{formatMoneyCompact(today.revenue, currency)}</span>
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-[6px] py-[1px] rounded-full ${up ? 'text-success bg-success-bg' : 'text-error bg-error-bg'}`}>
          <TrendIcon size={11} />
          {Math.abs(today.revenueChangePercent).toFixed(0)}%
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate">Orders</span>
        <span className="text-[14px] font-bold text-carbon">{formatNumber(today.ordersCount)}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate">Avg. Order Value</span>
        <span className="text-[14px] font-bold text-carbon">{formatMoneyCompact(today.avgOrderValue, currency)}</span>
      </div>

      <span className="text-[10px] text-slate/70 ml-auto shrink-0">vs. this time yesterday</span>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function DashSkeleton() {
  return (
    <div className="px-7 py-6 flex flex-col gap-5">
      <SkeletonBox height={112} width="100%" rounded="16px" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-bone p-5">
            <SkeletonBox width={36} height={36} rounded="8px" className="mb-[14px]" />
            <SkeletonBox width={80} height={10} rounded="4px" className="mb-2" />
            <SkeletonBox width={96} height={24} rounded="4px" className="mb-1.5" />
            <SkeletonBox width={128} height={10} rounded="4px" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <div className="bg-white rounded-2xl border border-bone p-5 h-[320px]">
          <SkeletonBox width={144} height={14} rounded="4px" className="mb-2" />
          <SkeletonBox width={96} height={10} rounded="4px" className="mb-5" />
          <SkeletonBox width="100%" height={200} rounded="8px" />
        </div>
        <div className="bg-white rounded-2xl border border-bone h-[320px]">
          <div className="px-5 pt-5 pb-4 border-b border-[#f3f2ec] flex items-center gap-3">
            <SkeletonBox width={40} height={40} rounded="10px" className="shrink-0" />
            <div className="flex-1">
              <SkeletonBox width={96} height={14} rounded="4px" className="mb-1.5" />
              <SkeletonBox width={64} height={10} rounded="4px" />
            </div>
          </div>
          <div className="px-5 py-4 flex flex-col gap-2">
            {[0,1,2].map(i => <SkeletonBox key={i} width="100%" height={32} rounded="4px" />)}
          </div>
        </div>
      </div>
      <SkeletonBox width="100%" height={136} rounded="16px" />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StoreDashboard() {
  const { store, storeId, loading } = useStoreWorkspace();
  const { metrics, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useStoreDashboardMetrics(storeId);

  const chartData = (metrics?.revenueSeries ?? []).map(p => ({
    month: formatBucketLabel(p.date, 'month'),
    revenue: p.grossRevenue,
  }));
  const revenueSparkline = (metrics?.revenueSeries ?? []).map(p => p.grossRevenue);
  const totalCustomers = metrics ? metrics.overview.newCustomersCount + metrics.overview.returningCustomersCount : 0;

  return (
    <div>
      <StorePageHeader title="Dashboard" subtitle="" />

      {loading || metricsLoading ? <DashSkeleton /> : (
        <div className="px-4 lg:px-7 py-6 flex flex-col gap-5">

          <StoreHero store={store} />

          {metricsError && (
            <div className="dash-section-enter flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-error-bg text-error text-[12.5px] border border-error/10">
              <span>{metricsError}</span>
              <button onClick={refetchMetrics} className="font-semibold underline bg-transparent border-none cursor-pointer text-error shrink-0">
                Try again
              </button>
            </div>
          )}

          {metrics?.today && <TodaySnapshot today={metrics.today} currency={store?.baseCurrency} />}

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Revenue (30 days)" value={formatMoneyCompact(metrics?.overview.totalRevenue ?? 0, store?.baseCurrency)}
              sub={metrics?.overview.totalRevenue ? 'vs previous period' : 'No sales yet'} icon={<TrendingUp size={16} />} color="#174771"
              sparkline={revenueSparkline}
            />
            <MetricCard
              label="Orders (30 days)" value={formatNumber(metrics?.overview.totalOrders ?? 0)}
              sub={metrics?.overview.totalOrders ? `${formatNumber(metrics.overview.cancelledOrders)} cancelled` : 'No orders yet'} icon={<Package size={16} />} color="#8B5CF6"
            />
            <MetricCard
              label="Active Products" value={formatNumber(metrics?.totalProducts ?? 0)}
              sub={metrics?.totalProducts ? 'In your catalog' : 'Add your first product'} icon={<ShoppingBag size={16} />} color="#0EA5E9"
            />
            <MetricCard
              label="Customers (30 days)" value={formatNumber(totalCustomers)}
              sub={totalCustomers ? `${formatNumber(metrics?.overview.newCustomersCount ?? 0)} new` : 'No customers yet'} icon={<Users size={16} />} color="#22C55E"
            />
          </div>

          {/* Revenue Chart + Store Info */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
            <AreaChart
              data={chartData}
              dataKey="revenue"
              xKey="month"
              title="Revenue Overview"
              subtitle="Monthly revenue trend — last 6 months"
              height={300}
              valuePrefix={currencySymbol(store?.baseCurrency)}
              yTickFormatter={v => v >= 1000 ? `${currencySymbol(store?.baseCurrency)}${(v / 1000).toFixed(0)}k` : `${currencySymbol(store?.baseCurrency)}${v}`}
            />
            <StoreInfoCard />
          </div>

          {/* Quick Actions — desktop only; on mobile StoreNavMenu above (and
             the bottom-nav's Menu sheet, reachable from any page) already
             cover every one of these destinations (and more). */}
          <div className="hidden lg:block">
            <QuickActionsRow storeId={storeId} />
          </div>

        </div>
      )}
    </div>
  );
}
