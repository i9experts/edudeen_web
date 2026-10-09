import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, ShoppingBag, Package,
  CheckCircle, Clock, Globe, Copy, ExternalLink,
  ArrowRight, Settings, Sparkles, BarChart2,
  Megaphone, Plus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { PlatformSalesCard } from './PlatformSalesCard';
import { AreaChart } from '@/components/comman/charts';
import { MetricCard, SkeletonBox, Button, PageHeader } from '@/components/comman/ui';
import type { SellerOverviewData, RevenuePoint, SellerTodaySummaryData } from '@/api/services/analytics/analytics';
import type { InventoryProduct } from '@/api/services/product';
import { apiStoreDashboardSummary, type OnboardingChecklist } from '@/api/services/storeDashboard';
import { OnboardingChecklistCard } from './OnboardingChecklistCard';
import { WeeklyDigestCard } from './Analytic/ai/components/WeeklyDigestCard';
import { getStorefrontUrl } from '@/utils/storefrontUrl';
import { formatNumber, formatBucketLabel } from '@/components/comman/analytics/format';
import { formatMoneyCompact, formatMoney, currencySymbol } from '@/utils/currency';
import {
  StudioPanel, StudioTextLink, StudioWorkflow, StudioPill, StudioTable,
} from '@/features/seller/components/studio/Studio';

interface StoreMetrics {
  overview:      SellerOverviewData;
  revenueSeries: RevenuePoint[];
  totalProducts: number;
  /** Published (status=active) products only — drafts excluded. */
  activeProducts: number;
  shelf:         InventoryProduct[];
  today:         SellerTodaySummaryData;
  checklist:     OnboardingChecklist;
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
    // One aggregate call (was five parallel requests).
    apiStoreDashboardSummary(storeId)
      .then(res => {
        if (cancelled) return;
        const d = res.data;
        setMetrics({
          overview: d.overview,
          revenueSeries: d.revenueSeries,
          totalProducts: d.totalProducts,
          activeProducts: d.activeProducts,
          shelf: d.shelf as InventoryProduct[],
          today: d.today,
          checklist: d.checklist,
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

// ── Store Info Card ───────────────────────────────────────────────────────────
function StoreInfoCard() {
  const navigate = useNavigate();
  const { store, storeId } = useStoreWorkspace();
  const [copied, setCopied] = useState(false);

  const statusColor = store?.status === 'active' ? '#2D8A4E' : '#64727B';
  const StatusIcon  = store?.status === 'active' ? CheckCircle : Clock;
  const planStyle   = planStyles[store?.plan ?? ''] ?? { bg: '#EDF2F4', color: '#486071' };
  const typeStyle   = typeStyles[store?.sellerType ?? ''] ?? { bg: '#EDF2F4', color: '#486071' };

  const handleCopy = () => {
    if (store?.slug) {
      navigator.clipboard.writeText(getStorefrontUrl(store.slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <section aria-label="Store details" className="bg-white rounded-xl border border-bone flex flex-col h-full">

      {/* Logo + name + badges */}
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-bone">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-[10px] bg-brand-pale-orange border border-bone flex items-center justify-center overflow-hidden shrink-0">
            {store?.logo
              ? <img loading="lazy" decoding="async" src={store.logo} alt={store?.name} className="w-full h-full object-cover" />
              : <Globe size={18} className="text-brand-orange" />}
          </div>
          <div className="min-w-0">
            <p className="font-serif text-[18px] text-carbon truncate">
              {store?.name ?? '—'}
            </p>
            <p className="text-[12px] text-slate mt-[2px]">Store workspace</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-[6px]">
          <span
            className="inline-flex items-center gap-1 text-[12px] font-medium px-[9px] py-[3px] rounded-full capitalize"
            style={{ background: statusColor + '18', color: statusColor }}
          >
            <StatusIcon size={10} />
            {store?.status === 'active' ? 'Live' : (store?.status ?? '—')}
          </span>
          <span
            className="text-[12px] font-medium px-[9px] py-[3px] rounded-full capitalize"
            style={planStyle}
          >
            {store?.plan ?? '—'} plan
          </span>
          <span
            className="text-[12px] font-medium px-[9px] py-[3px] rounded-full capitalize"
            style={typeStyle}
          >
            {store?.sellerType ?? '—'}
          </span>
        </div>
      </div>

      {/* URL + Product Types */}
      <div className="px-5 sm:px-6 py-4 border-b border-bone flex flex-col gap-3">
        <div>
          <p className="text-[12px] font-bold text-brand-royal uppercase tracking-[0.14em] mb-1.5">Store URL</p>
          <div className="flex items-center gap-2 bg-cream rounded-lg px-[10px] py-[8px] border border-bone">
            <span className="flex-1 text-[13px] font-medium text-charcoal overflow-hidden text-ellipsis whitespace-nowrap">
              {store?.slug ? getStorefrontUrl(store.slug).replace(/^https?:\/\//, '') : '…'}
            </span>
            <button
              onClick={handleCopy}
              className="shrink-0 border-0 bg-transparent p-0 cursor-pointer transition-transform active:scale-90"
              title="Copy URL"
              aria-label="Copy store URL"
            >
              <Copy size={13} className={copied ? 'text-success' : 'text-slate'} />
            </button>
          </div>
          {copied && <p className="text-[12px] text-success mt-1 font-medium" role="status">Copied!</p>}
        </div>

        {(store?.productTypes?.length ?? 0) > 0 && (
          <div>
            <p className="text-[12px] font-bold text-brand-royal uppercase tracking-[0.14em] mb-1.5">
              Product Types
            </p>
            <div className="flex flex-wrap gap-1">
              {store!.productTypes!.map(pt => (
                <span
                  key={pt}
                  className="text-[12px] font-medium text-charcoal bg-mist px-[9px] py-[3px] rounded-full capitalize"
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
          className="flex items-center gap-2.5 px-[10px] py-[9px] rounded-lg text-[13px] font-medium text-charcoal bg-transparent border-0 cursor-pointer text-left transition-colors duration-150 hover:bg-cream w-full"
        >
          <Settings size={14} className="text-slate shrink-0" />
          Store Settings
          <ArrowRight size={12} className="text-slate ml-auto" />
        </button>
        {store?.slug && (
          <a
            href={getStorefrontUrl(store.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-[10px] py-[9px] rounded-lg text-[13px] font-medium text-charcoal no-underline transition-colors duration-150 hover:bg-cream"
          >
            <ExternalLink size={14} className="text-slate shrink-0" />
            View Live Store
            <ExternalLink size={11} className="text-slate ml-auto" />
          </a>
        )}
      </div>
    </section>
  );
}

// ── Quick Actions Row ─────────────────────────────────────────────────────────
interface QuickAction { Icon: LucideIcon; label: string; path: string }

function QuickActionsRow({ storeId }: { storeId: string }) {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    { Icon: ShoppingBag,   label: 'Add Product', path: 'products/add' },
    { Icon: Package,       label: 'View Orders', path: 'orders'       },
    { Icon: BarChart2,     label: 'Analytics',   path: 'analytics'    },
    { Icon: Megaphone,     label: 'Marketing',   path: 'marketing'    },
    { Icon: Sparkles,      label: 'AI Studio',   path: 'ai/studio'    },
  ];

  return (
    <StudioPanel title="Quick actions">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map(({ Icon, label, path }) => (
          <button
            key={label}
            onClick={() => navigate(`/store/${storeId}/${path}`)}
            className="group flex flex-col items-center gap-2 py-4 px-2 rounded-xl border border-bone bg-white cursor-pointer transition-colors duration-150 hover:bg-cream hover:border-border-hover w-full"
          >
            <div className="w-9 h-9 rounded-[10px] bg-brand-pale-orange text-brand-orange flex items-center justify-center">
              <Icon size={16} />
            </div>
            <span className="text-[12.5px] font-bold text-carbon text-center leading-[1.3]">{label}</span>
          </button>
        ))}
      </div>
    </StudioPanel>
  );
}

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
        <span className="font-serif text-[18px] text-carbon">{formatMoneyCompact(today.avgOrderValue, currency)}</span>
      </div>

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
            Add a physical item, a digital download or an educational resource. It takes a few minutes.
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
            const pill = STATUS_PILL[p.status] ?? { tone: 'gray' as const, label: p.status };
            const kind = p.type === 'digital' ? (p.productType === 'educational' ? 'Educational' : 'Digital') : 'Physical';
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

const WORKFLOW = [
  { tag: 'Learning',     title: 'Start with an outcome', body: 'Make the age, learning goal and classroom or home use clear in your title and description.' },
  { tag: 'Presentation', title: 'Show what is inside',   body: 'Give families and teachers useful images, a preview and a clear description of what they get.' },
  { tag: 'Trust',        title: 'Prepare for review',    body: 'Check accuracy, Islamic suitability and your rights to share every element before publishing.' },
];

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
  const { metrics, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useStoreDashboardMetrics(storeId);

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

          {/* Studio intro */}
          <PageHeader
            className="dash-section-enter mb-2"
            eyebrow={`Edudeen creator studio · ${store?.name ?? 'Your store'}`}
            title="A home for your ideas."
            description="Create thoughtfully. Share confidently. Grow with purpose."
            actions={
              <>
                <StudioPill tone={isLive ? 'green' : 'gray'}>{isLive ? 'Live' : (store?.status ?? '—')}</StudioPill>
                {store?.slug && (
                  <a
                    href={getStorefrontUrl(store.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-[6px] px-[18px] py-[10px] rounded-lg bg-white border border-bone text-brand-orange text-[14px] font-bold no-underline hover:bg-cream transition-colors"
                  >
                    <ExternalLink size={14} />
                    View live store
                  </a>
                )}
                <Button size="md" className="!text-[14px] !font-bold" onClick={() => navigate(`/store/${storeId}/products/add`)} icon={<Plus size={15} />}>
                  New product
                </Button>
              </>
            }
          />

          {metricsError && (
            <div role="alert" className="dash-section-enter flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-error-bg text-error text-[13px] border border-error/10">
              <span>{metricsError}</span>
              <button onClick={refetchMetrics} className="font-semibold underline bg-transparent border-none cursor-pointer text-error shrink-0">
                Try again
              </button>
            </div>
          )}

          {/* Admin sale campaigns — join right from the dashboard */}
          <PlatformSalesCard storeId={storeId} />

          {/* Opt-in weekly AI digest (hidden when AI is off) */}
          <WeeklyDigestCard storeId={storeId} />

          {/* Setup checklist (real data; hidden once complete) */}
          {metrics?.checklist && <OnboardingChecklistCard checklist={metrics.checklist} storeId={storeId} />}

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MetricCard
              label="Revenue (30 days)" value={formatMoneyCompact(metrics?.overview.totalRevenue ?? 0, store?.baseCurrency)}
              sub={metrics?.overview.totalRevenue ? 'Last 30 days' : 'No sales yet'}
              sparkline={revenueSparkline}
            />
            <MetricCard
              label="Orders (30 days)" value={formatNumber(metrics?.overview.totalOrders ?? 0)}
              sub={metrics?.overview.totalOrders ? `${formatNumber(metrics.overview.cancelledOrders)} cancelled` : 'No orders yet'}
            />
            <MetricCard
              label="Active products" value={formatNumber(metrics?.activeProducts ?? 0)}
              sub={metrics?.totalProducts
                ? (metrics.totalProducts > metrics.activeProducts ? `${formatNumber(metrics.totalProducts - metrics.activeProducts)} not published` : 'All published')
                : 'Add your first product'}
            />
            <MetricCard
              label="Customers (30 days)" value={formatNumber(totalCustomers)}
              sub={totalCustomers ? `${formatNumber(metrics?.overview.newCustomersCount ?? 0)} new` : 'No customers yet'}
            />
          </div>

          {metrics?.today && <TodaySnapshot today={metrics.today} currency={store?.baseCurrency} />}

          {/* Product shelf */}
          <ProductShelf
            products={metrics?.shelf ?? []}
            total={metrics?.totalProducts ?? 0}
            currency={store?.baseCurrency}
            storeId={storeId}
          />

          {/* Workflow guidance */}
          <StudioPanel title="Make your next product ready to share.">
            <StudioWorkflow steps={WORKFLOW} />
          </StudioPanel>

          {/* Revenue Chart + Store Info */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
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
            <StoreInfoCard />
          </div>

          {/* Quick Actions — desktop only; on mobile the bottom nav and the
             Settings menu already cover every one of these destinations. */}
          <div className="hidden lg:block">
            <QuickActionsRow storeId={storeId} />
          </div>

        </div>
      )}
    </div>
  );
}
