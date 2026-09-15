import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, Users, UserCheck, DollarSign, UserPlus,
  Shield, Store, Bell, Tag, ArrowRight, LayoutGrid,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  apiAdminAnalyticsOverview, apiAdminAnalyticsTopCategories,
  type AdminOverviewData, type TopCategoryRow,
} from '@/api/services/analytics/adminAnalytics';
import { formatCurrency, formatNumber, formatPercent } from '@/components/comman/analytics/format';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { MetricCard } from '@/components/comman/ui/MetricCard';
import { EmptyState } from '@/components/comman/ui/EmptyState';
import { AdminPageHeader } from '@/components/comman/ui/AdminPageHeader';

// Pure navigation shortcuts to the real queue/alert/moderation pages — no new
// data fetched here, just quicker access to where that data already lives.
interface QuickLink { Icon: LucideIcon; label: string; desc: string; path: string; gradient: string; iconColor: string }
const QUICK_LINKS: QuickLink[] = [
  { Icon: Shield,  label: 'Moderation Queue', desc: 'Review flagged listings & reports', path: '/admin/moderation',   gradient: 'from-[#fbe9e7] to-[#fbdfdc]', iconColor: '#B3261E' },
  { Icon: Store,   label: 'Marketplace',      desc: 'Manage listings platform-wide',     path: '/admin/marketplace',  gradient: 'from-brand-pale-orange to-brand-pale-orange', iconColor: '#D97757' },
  { Icon: Users,   label: 'Users & Sellers',  desc: 'Accounts, suspensions, roles',      path: '/admin/users',        gradient: 'from-[#eaf0fb] to-[#dcebfa]', iconColor: '#2156A8' },
  { Icon: Bell,    label: 'Announcements',    desc: 'Platform-wide banners & alerts',    path: '/admin/announcements', gradient: 'from-[#f3e8ff] to-[#ede0fe]', iconColor: '#A855F7' },
];

// A fixed-range glance dashboard — a few key numbers, no filter/export chrome.
// The full filterable/exportable, tab-by-tab report lives at `/admin/analytics`
// (`AdminAnalytics.tsx`) — deliberately a separate page, not this one.
export function AdminOverview() {
  const navigate = useNavigate();
  const [overview, setOverview]   = useState<AdminOverviewData | null>(null);
  const [categories, setCategories] = useState<TopCategoryRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

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
    { label: 'Seller Accounts',        value: formatNumber(overview.totalSellers),             trend: undefined, trendUp: true, sub: undefined, icon: <Users size={16} />, color: '#8B5CF6' },
    { label: 'Sellers Active This Month', value: formatNumber(overview.sellersActiveThisMonth), trend: overview.sellersActiveThisMonthChange ? formatPercent(overview.sellersActiveThisMonthChange, { signed: true }) : undefined, trendUp: (overview.sellersActiveThisMonthChange ?? 0) >= 0, sub: undefined, icon: <UserCheck size={16} />, color: '#22C55E' },
    { label: 'Total Stores',           value: formatNumber(overview.totalStores),              trend: undefined, trendUp: true, sub: undefined, icon: <Store size={16} />, color: '#0D9488' },
    { label: 'Active Stores',          value: formatNumber(overview.activeStores),             trend: undefined, trendUp: true, sub: undefined, icon: <Store size={16} />, color: '#0EA5E9' },
    { label: 'GMV (30 days)',          value: formatCurrency(overview.totalGMV),                trend: overview.totalRevenueChangePercent != null ? formatPercent(overview.totalRevenueChangePercent, { signed: true }) : undefined, trendUp: (overview.totalRevenueChangePercent ?? 0) >= 0, sub: undefined, icon: <DollarSign size={16} />, color: '#D97757' },
    { label: 'New Users',              value: formatNumber(overview.newUsers),                  trend: undefined, trendUp: true, sub: `${formatNumber(overview.totalCustomers)} total customers`, icon: <UserPlus size={16} />, color: '#0EA5E9' },
  ] : [];

  const maxCategoryRevenue = Math.max(1, ...categories.map(c => c.revenue));

  return (
    <>
      <AdminPageHeader title="Platform Overview" subtitle="Last 30 days across the Edudeen platform." icon={<LayoutGrid size={17} />} />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      {error && (
        <div className="dash-section-enter flex items-center gap-3 px-4 py-3 rounded-xl bg-error-bg border border-error/10 text-[12.5px]">
          <span className="flex size-8 items-center justify-center rounded-full bg-error/10 text-error shrink-0">
            <AlertCircle size={15} />
          </span>
          <div>
            <p className="font-semibold text-error">Couldn't load the platform overview</p>
            <p className="text-error/80">{error}</p>
          </div>
        </div>
      )}

      {/* ── Metrics Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <MetricCard key={i} label="" value="" loading />)
        ) : metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} trend={m.trend} trendUp={m.trendUp} sub={m.sub} icon={m.icon} color={m.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">

        {/* ── Top Categories ── */}
        <div className="bg-white border border-bone rounded-2xl transition-colors duration-200 hover:border-brand-orange/25 px-5 py-4">
          <p className="text-[14px] font-bold text-charcoal mb-4">
            Top Categories by Revenue (30 days)
          </p>
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
            <div className="flex flex-col gap-[14px]">
              {categories.map((cat) => (
                <div key={cat.categoryId}>
                  <div className="flex justify-between items-center mb-[5px]">
                    <span className="text-[12px] text-graphite">{cat.name}</span>
                    <span className="text-[12px] font-semibold text-charcoal">{formatCurrency(cat.revenue)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-cream overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-orange to-brand-deep-orange transition-[width] duration-500 ease-out"
                      style={{ width: `${Math.round((cat.revenue / maxCategoryRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick access — shortcuts to moderation/marketplace/users/announcements ── */}
        <div className="bg-white border border-bone rounded-2xl transition-colors duration-200 hover:border-brand-orange/25 px-5 py-4">
          <p className="text-[14px] font-bold text-charcoal mb-4">Quick Access</p>
          <div className="flex flex-col gap-2">
            {QUICK_LINKS.map(({ Icon, label, desc, path, gradient, iconColor }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className={`group flex items-center gap-3 px-3 py-[10px] rounded-xl border border-bone bg-gradient-to-br ${gradient} cursor-pointer transition-all duration-200 hover:-translate-y-px hover:border-brand-orange/30 text-left w-full`}
              >
                <div
                  className="size-9 rounded-[10px] bg-white/70 border border-white/60 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                  style={{ color: iconColor }}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-charcoal">{label}</p>
                  <p className="text-[11px] text-slate truncate">{desc}</p>
                </div>
                <ArrowRight size={14} className="text-slate/50 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
