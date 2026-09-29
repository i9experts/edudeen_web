import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, Users, UserCheck, DollarSign, UserPlus, Percent,
  Shield, Store, Bell, Tag, ArrowRight, BarChart3, ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  apiAdminAnalyticsOverview, apiAdminAnalyticsTopCategories,
  type AdminOverviewData, type TopCategoryRow,
} from '@/api/services/analytics/adminAnalytics';
import type { ModerationReportRow } from '@/api/services/moderation/adminModeration';
import type { LeadRow } from '@/api/services/marketplace/adminMarketplace';
import { useModerationQueue, useModerationStats } from '@/hooks/admin/useAdminModeration';
import { useLeads } from '@/hooks/admin/useAdminMarketplace';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatCurrency, formatDate, formatNumber, formatPercent } from '@/components/comman/analytics/format';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { MetricCard } from '@/components/comman/ui/MetricCard';
import { EmptyState } from '@/components/comman/ui/EmptyState';
import { Badge, StatusBadge } from '@/components/comman/ui/Badge';
import { Button } from '@/components/comman/ui/Button';
import { Table, type TableColumn } from '@/components/comman/ui/Table';
import { AdminStudioHeader, ADMIN_GUTTER, StudioPanel, StudioInfoGrid, textLinkClass } from '../components/studio';

// Pure navigation shortcuts to the real queue/alert/moderation pages — no new
// data fetched here, just quicker access to where that data already lives.
interface QuickLink { Icon: LucideIcon; label: string; desc: string; path: string }
const QUICK_LINKS: QuickLink[] = [
  { Icon: Shield,  label: 'Moderation queue', desc: 'Review flagged listings & reports', path: '/admin/moderation'    },
  { Icon: Store,   label: 'Marketplace',      desc: 'Manage listings platform-wide',     path: '/admin/marketplace'   },
  { Icon: Users,   label: 'Users & sellers',  desc: 'Accounts, suspensions, roles',      path: '/admin/users'         },
  { Icon: Bell,    label: 'Announcements',    desc: 'Platform-wide banners & alerts',    path: '/admin/announcements' },
];

const REVIEW_CRITERIA = [
  { title: 'Educational value',   body: 'Age suitability, accurate content and clear learning outcomes.' },
  { title: 'Islamic suitability', body: 'Appropriate content and a qualified review where religious claims are made.' },
  { title: 'Creator ownership',   body: 'Original work or documented permission for included content.' },
];

const REPORT_STATUS: Record<ModerationReportRow['status'], { label: string; color: 'yellow' | 'blue' | 'green' }> = {
  pending:  { label: 'Pending review', color: 'yellow' },
  reviewed: { label: 'Reviewed',       color: 'blue' },
  resolved: { label: 'Resolved',       color: 'green' },
};

const RISK_COLOR: Record<ModerationReportRow['riskLevel'], 'red' | 'yellow' | 'gray'> = { high: 'red', medium: 'yellow', low: 'gray' };

const TARGET_LABEL: Record<ModerationReportRow['targetType'], string> = { listing: 'Listing', seller: 'Seller', review: 'Review' };

function InlineSectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 rounded-lg bg-error-bg text-[13px] text-error">
      <span className="flex items-center gap-2"><AlertCircle size={15} className="shrink-0" />{message}</span>
      <button type="button" onClick={onRetry} className={textLinkClass}>Try again</button>
    </div>
  );
}

// A fixed-range glance dashboard — a few key numbers, no filter/export chrome.
// The full filterable/exportable, tab-by-tab report lives at `/admin/analytics`
// (`AdminAnalytics.tsx`) — deliberately a separate page, not this one.
export function AdminOverview() {
  usePageTitle('Team workspace');
  const navigate = useNavigate();
  const [overview, setOverview]   = useState<AdminOverviewData | null>(null);
  const [categories, setCategories] = useState<TopCategoryRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Review work — each section loads (and fails) independently of the KPIs.
  const modStats = useModerationStats();
  const modQueue = useModerationQueue({ page: 1, limit: 5 });
  const leads    = useLeads({ page: 1, limit: 5 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      apiAdminAnalyticsOverview({ range: '30d' }),
      apiAdminAnalyticsTopCategories({ range: '30d', limit: 5 }),
    ])
      .then(([overviewRes, categoriesRes]) => {
        if (cancelled) return;
        setOverview(overviewRes.data);
        setCategories(categoriesRes.data ?? []);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load platform overview.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const metrics = overview ? [
    { label: 'GMV (30 days)',             value: formatCurrency(overview.totalGMV),                trend: overview.totalRevenueChangePercent != null ? formatPercent(overview.totalRevenueChangePercent, { signed: true }) : undefined, trendUp: (overview.totalRevenueChangePercent ?? 0) >= 0, sub: undefined, icon: <DollarSign size={16} /> },
    { label: 'Edudeen commission (30 days)', value: formatCurrency(overview.platformCommission),   trend: undefined, trendUp: true, sub: `${formatCurrency(overview.platformEarnings)} total platform earnings`, icon: <Percent size={16} /> },
    { label: 'Seller accounts',           value: formatNumber(overview.totalSellers),             trend: undefined, trendUp: true, sub: undefined, icon: <Users size={16} /> },
    { label: 'Sellers active this month', value: formatNumber(overview.sellersActiveThisMonth),   trend: overview.sellersActiveThisMonthChange ? formatPercent(overview.sellersActiveThisMonthChange, { signed: true }) : undefined, trendUp: (overview.sellersActiveThisMonthChange ?? 0) >= 0, sub: undefined, icon: <UserCheck size={16} /> },
    { label: 'Total stores',              value: formatNumber(overview.totalStores),              trend: undefined, trendUp: true, sub: undefined, icon: <Store size={16} /> },
    { label: 'Active stores',             value: formatNumber(overview.activeStores),             trend: undefined, trendUp: true, sub: undefined, icon: <Store size={16} /> },
    { label: 'New users',                 value: formatNumber(overview.newUsers),                 trend: undefined, trendUp: true, sub: `${formatNumber(overview.totalCustomers)} total customers`, icon: <UserPlus size={16} /> },
  ] : [];

  const maxCategoryRevenue = Math.max(1, ...categories.map(c => c.revenue));

  const queueColumns: TableColumn<ModerationReportRow>[] = [
    { key: 'item', header: 'Resource', render: r => (
      <span className="inline-flex flex-col items-end sm:items-start">
        <span className="text-carbon">{r.itemLabel}</span>
        <span className="text-[11.5px] text-slate">{TARGET_LABEL[r.targetType]} · {r.reason}</span>
      </span>
    ) },
    { key: 'creator', header: 'Creator', render: r => r.sellerName ?? '—' },
    { key: 'risk', header: 'Risk', render: r => <Badge color={RISK_COLOR[r.riskLevel]} size="sm">{r.riskLevel.charAt(0).toUpperCase() + r.riskLevel.slice(1)}</Badge> },
    { key: 'status', header: 'Status', render: r => <Badge color={REPORT_STATUS[r.status]?.color ?? 'gray'} size="sm">{REPORT_STATUS[r.status]?.label ?? r.status}</Badge> },
    { key: 'action', header: 'Action', render: () => (
      <button type="button" onClick={() => navigate('/admin/moderation')} className={textLinkClass}>Review submission</button>
    ) },
  ];

  const leadColumns: TableColumn<LeadRow>[] = [
    { key: 'store', header: 'Store', render: l => <span className="text-carbon">{l.storeName}</span> },
    { key: 'category', header: 'Category', render: l => l.categoryName ?? '—' },
    { key: 'submitted', header: 'Submitted', render: l => formatDate(l.submittedAt) },
    { key: 'status', header: 'Status', render: l => <StatusBadge status={l.verificationStatus} size="sm" /> },
    { key: 'action', header: 'Action', render: () => (
      <button type="button" onClick={() => navigate('/admin/leads')} className={textLinkClass}>Review application</button>
    ) },
  ];

  const tableFrame = '-mx-5 sm:mx-0 border-y sm:border border-bone sm:rounded-lg overflow-hidden';

  return (
    <>
      <AdminStudioHeader
        title="Care for the marketplace."
        subtitle="Keep useful learning and responsible publishing at the centre."
        actions={
          <Button variant="outline" size="sm" icon={<BarChart3 size={13} />} onClick={() => navigate('/admin/analytics')}>
            Full analytics
          </Button>
        }
      />
      <div className={`${ADMIN_GUTTER} pt-7 sm:pt-9 pb-8 flex flex-col gap-5 sm:gap-6`}>

      {/* ── Review metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
        {modStats.loading ? (
          Array.from({ length: 3 }).map((_, i) => <MetricCard key={i} label="" value="" loading />)
        ) : modStats.data ? (
          <>
            <MetricCard label="Awaiting review" value={formatNumber(modStats.data.queueTotal)} sub={modStats.data.avgReviewMinutes ? `~${formatNumber(modStats.data.avgReviewMinutes)} min average review` : undefined} />
            <MetricCard label="Approved today" value={formatNumber(modStats.data.approvedToday)} />
            <MetricCard label="Urgent flags" value={formatNumber(modStats.data.urgent)} sub="High-risk reports" />
          </>
        ) : (
          <div className="sm:col-span-3">
            <InlineSectionError message={modStats.error || 'Review stats are unavailable.'} onRetry={modStats.refetch} />
          </div>
        )}
      </div>

      {/* ── Content review queue ── */}
      <StudioPanel
        id="overview-review-queue"
        title="Content review queue"
        description="The newest reports waiting on the team. Open one to approve it or remove the flagged item."
        actions={<button type="button" onClick={() => navigate('/admin/moderation')} className={textLinkClass}>Open full queue <ArrowRight size={13} /></button>}
        bodyClassName={modQueue.error ? undefined : tableFrame}
      >
        {modQueue.error ? (
          <InlineSectionError message={modQueue.error} onRetry={modQueue.refetch} />
        ) : (
          <Table
            columns={queueColumns}
            data={modQueue.data?.items ?? []}
            keyExtractor={r => r._id}
            loading={modQueue.loading}
            loadingRows={3}
            emptyState={{ icon: <ShieldCheck size={28} className="text-slate/50" />, title: 'Nothing waiting for review', description: 'New reports on listings, sellers and reviews will appear here.' }}
          />
        )}
      </StudioPanel>

      {/* ── What a review should establish ── */}
      <StudioPanel id="overview-review-criteria" title="What a review should establish">
        <StudioInfoGrid items={REVIEW_CRITERIA} />
      </StudioPanel>

      {/* ── Seller applications (leads) ── */}
      <StudioPanel
        id="overview-leads"
        title="Seller applications"
        description="New stores waiting for verification before they can publish on Edudeen."
        actions={<button type="button" onClick={() => navigate('/admin/leads')} className={textLinkClass}>All applications <ArrowRight size={13} /></button>}
        bodyClassName={leads.error ? undefined : tableFrame}
      >
        {leads.error ? (
          <InlineSectionError message={leads.error} onRetry={leads.refetch} />
        ) : (
          <Table
            columns={leadColumns}
            data={leads.data?.items ?? []}
            keyExtractor={l => l.id}
            loading={leads.loading}
            loadingRows={3}
            emptyState={{ icon: <UserPlus size={28} className="text-slate/50" />, title: 'No applications waiting', description: 'Stores submitted for verification will appear here.' }}
          />
        )}
      </StudioPanel>

      {/* ── Marketplace metrics (30 days) ── */}
      <section aria-labelledby="overview-metrics-title" className="flex flex-col gap-4">
        <div>
          <h2 id="overview-metrics-title" className="font-serif font-normal text-[21px] sm:text-[25px] text-carbon leading-[1.2]">Marketplace, last 30 days</h2>
          <p className="text-[13px] sm:text-[14px] text-slate mt-1">Sales, sellers and customers across the Edudeen platform.</p>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-error-bg border border-error/10 text-[12.5px]">
            <span className="flex size-8 items-center justify-center rounded-full bg-error/10 text-error shrink-0">
              <AlertCircle size={15} />
            </span>
            <div>
              <p className="font-semibold text-error">Couldn't load the platform overview</p>
              <p className="text-error/80">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <MetricCard key={i} label="" value="" loading />)
          ) : metrics.map((m) => (
            <MetricCard key={m.label} label={m.label} value={m.value} trend={m.trend} trendUp={m.trendUp} sub={m.sub} icon={m.icon} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 sm:gap-6">

        {/* ── Top Categories ── */}
        <StudioPanel id="overview-categories" title="Top categories by revenue" description="Last 30 days.">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} className="h-6 w-full" />)}
            </div>
          ) : categories.length === 0 ? (
            <EmptyState
              icon={<Tag size={24} className="text-slate/50" />}
              title="No category revenue yet"
              description="Once orders start coming in across the marketplace, the top-earning categories will show up here."
              className="py-10"
            />
          ) : (
            <ul className="flex flex-col gap-[16px]">
              {categories.map((cat) => {
                const pct = Math.round((cat.revenue / maxCategoryRevenue) * 100);
                return (
                  <li key={cat.categoryId}>
                    <div className="flex justify-between items-center mb-[6px] gap-3">
                      <span className="text-[13px] text-carbon truncate">{cat.name}</span>
                      <span className="text-[13px] font-semibold text-carbon shrink-0">{formatCurrency(cat.revenue)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-cream overflow-hidden" role="presentation">
                      <div
                        className="h-full rounded-full bg-brand-orange transition-[width] duration-500 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </StudioPanel>

        {/* ── Quick access — shortcuts to moderation/marketplace/users/announcements ── */}
        <StudioPanel id="overview-quick" title="Quick access">
          <ul className="flex flex-col divide-y divide-bone -my-2">
            {QUICK_LINKS.map(({ Icon, label, desc, path }) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => navigate(path)}
                  className="group flex items-center gap-3 py-3 w-full bg-transparent border-0 cursor-pointer text-left rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
                >
                  <span className="size-9 rounded-[10px] bg-brand-pale-orange text-brand-orange flex items-center justify-center shrink-0">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-carbon group-hover:text-brand-orange">{label}</span>
                    <span className="block text-[12.5px] text-slate truncate">{desc}</span>
                  </span>
                  <ArrowRight size={15} className="text-slate shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </li>
            ))}
          </ul>
        </StudioPanel>
      </div>
      </div>
    </>
  );
}
