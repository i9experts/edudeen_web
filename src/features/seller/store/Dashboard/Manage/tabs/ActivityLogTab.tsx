import { useCallback, useEffect, useState } from 'react';
import { useActivityLogLive } from '@/hooks/useActivityLogLive';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { TokenStorage } from '@/api/services/auth';
import {
  apiGetActivityLog, apiGetActivityStats, apiExportActivityLog,
  type ActivityLogEntry, type ActivityCategory, type ActivityLogStats,
} from '@/api/services/activityLog';
import { timeAgo } from '@/utils/timeAgo';
import { ChevronLeft, ChevronRight, Activity as ActivityIcon, Download } from 'lucide-react';
import { EmptyState, SkeletonBox } from '@/components/comman/ui';

type FilterCategory = 'all' | ActivityCategory;
const PAGE_SIZE = 10;

const FILTER_CATEGORIES: { id: FilterCategory; label: string }[] = [
  { id: 'all',        label: 'All Events' },
  { id: 'products',   label: 'Products'   },
  { id: 'orders',     label: 'Orders'     },
  { id: 'finance',    label: 'Finance'    },
  { id: 'marketing',  label: 'Marketing'  },
  { id: 'customers',  label: 'Customers'  },
  { id: 'settings',   label: 'Settings'   },
  { id: 'security',   label: 'Security'   },
];

const categoryStyle: Record<string, { bg: string; color: string }> = {
  products:  { bg: '#EEF2FF', color: '#4F46E5' },
  orders:    { bg: '#EAF0FB', color: '#2156A8' },
  marketing: { bg: '#FFF4DC', color: '#B36200' },
  customers: { bg: '#E3F4EA', color: '#1E7A3C' },
  finance:   { bg: '#FFF3E0', color: '#D97706' },
  settings:  { bg: '#F0EEE6', color: '#5A5852' },
  security:  { bg: '#FDECEA', color: '#C0392B' },
};

function actionTitle(action: string) {
  const s = action.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

export function ActivityLogTab() {
  const { storeId, store } = useStoreWorkspace();
  const me = TokenStorage.getUser<{ id: string; name: string; role: string }>();

  const [category, setCategory] = useState<FilterCategory>('all');
  const [dateRange, setDateRange] = useState('last7');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!storeId) return;
    apiGetActivityStats(storeId).then(res => setStats(res.data)).catch(() => {});
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setLoading(true);

    const from = dateRange === 'last7' ? daysAgo(7) : dateRange === 'last30' ? daysAgo(30) : dateRange === 'last90' ? daysAgo(90) : undefined;

    apiGetActivityLog(storeId, {
      page, limit: PAGE_SIZE,
      category: category === 'all' ? undefined : category,
      search: search || undefined,
      from,
    })
      .then(res => { if (!cancelled) { setLogs(res.data?.logs ?? []); setTotal(res.data?.pagination?.total ?? 0); } })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load activity.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [storeId, category, dateRange, search, page]);

  const onLiveEvent = useCallback((entry: ActivityLogEntry) => {
    if (page !== 1) return;
    if (category !== 'all' && entry.category !== category) return;
    setLogs(prev => [entry, ...prev].slice(0, PAGE_SIZE));
    setTotal(t => t + 1);
  }, [page, category]);

  const live = useActivityLogLive(storeId, onLiveEvent);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const metrics = stats ? [
    { label: 'Total Events',        value: stats.totalEvents.toLocaleString(),      sub: 'Last 90 days' },
    // No staff accounts exist yet (no RBAC), so there's no 'Staff Actions' card.
    { label: 'Security Alerts',     value: String(stats.securityAlerts),            sub: stats.securityAlerts === 0 ? 'No threats' : 'Review recommended' },
    { label: 'Last Login',          value: stats.lastLogin ? timeAgo(stats.lastLogin.at) : '—', sub: stats.lastLogin?.actorName ?? '' },
  ] : [];

  return (
    <div className="flex flex-col gap-5">

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-slate">Full audit trail of your store's changes and security events.</p>
        <button
          onClick={() => { apiExportActivityLog(storeId, store?.name ?? 'store').catch(() => {}); }}
          className="flex items-center gap-1.5 px-4 py-[7px] bg-white border border-bone rounded-lg text-xs font-medium text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
        >
          <Download size={12} />
          Export Log
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-white border border-bone rounded-[10px] px-5 py-4">
            <p className="text-[11px] font-medium text-slate uppercase tracking-[0.06em] mb-1">{m.label}</p>
            <p className="text-[28px] font-bold text-carbon leading-[1.15]">{m.value}</p>
            {m.sub && <p className="text-xs text-slate mt-1">{m.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">

        {/* LEFT: Filters */}
        <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
          <div className="px-4 py-3 border-b border-bone">
            <p className="text-[13px] font-semibold text-carbon">Filter by Type</p>
          </div>
          {FILTER_CATEGORIES.map(cat => {
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.id); setPage(1); }}
                className="w-full flex items-center px-4 py-[10px] border-b border-[#f0eee6] cursor-pointer border-none text-left transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-orange/50"
                style={{ background: isActive ? '#EAF2F8' : 'transparent', borderLeft: isActive ? '3px solid #174771' : '3px solid transparent' }}
              >
                <span className="text-[13px]" style={{ fontWeight: isActive ? 600 : 400, color: isActive ? '#0F3354' : '#4A4945' }}>
                  {cat.label}
                </span>
              </button>
            );
          })}

          <div className="px-4 py-[14px]">
            <p className="text-xs font-semibold text-graphite mb-2">Date Range</p>
            <select
              value={dateRange}
              onChange={e => { setDateRange(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg bg-white text-charcoal outline-none cursor-pointer transition-colors duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50"
            >
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="last90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* RIGHT: Feed */}
        <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
          <div className="flex items-center gap-[10px] px-4 py-3 border-b border-bone">
            <div className="flex-1 flex items-center gap-1.5 border border-bone rounded-lg px-3 bg-white transition-colors duration-150 focus-within:ring-2 focus-within:ring-brand-orange/40 focus-within:border-brand-orange/50">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8C8A82" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                placeholder="Search activity..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="border-none outline-none text-[13px] py-2 w-full text-charcoal bg-transparent"
              />
            </div>
            <div className="flex items-center gap-[5px] shrink-0">
              <span className="w-2 h-2 rounded-full" style={{ background: live ? '#2D8A4E' : '#C0BDB5' }} />
              <span className="text-[11px] font-medium" style={{ color: live ? '#2D8A4E' : '#8C8A82' }}>{live ? 'Live' : 'Connecting…'}</span>
            </div>
          </div>

          {loading ? (
            <div className="p-4 flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <SkeletonBox width={30} height={30} rounded="999px" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <SkeletonBox width="30%" height={12} />
                    <SkeletonBox width="55%" height={11} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-error">{error}</div>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<ActivityIcon size={28} className="text-brand-orange opacity-55" />}
              title="No activity in this range yet"
              description="Actions taken by you and your team will show up here."
            />
          ) : (
            logs.map((item, i) => {
              const isMe = !!me && item.actorId === me.id;
              const actorName = isMe ? me!.name : (item.actorName ?? 'Team member');
              const actorRole = (isMe ? me!.role : item.actorRole ?? '') ;
              const roleLabel = actorRole ? actorRole.charAt(0).toUpperCase() + actorRole.slice(1) : '';
              const cs = item.isSecurityAlert ? { bg: '#FDECEA', color: '#C0392B' } : (categoryStyle[item.category] ?? { bg: '#F0EEE6', color: '#5A5852' });
              const catLabel = item.isSecurityAlert ? 'Security Alert' : item.category.charAt(0).toUpperCase() + item.category.slice(1);
              return (
                <div key={item._id} className="px-4 py-[14px] transition-colors duration-150 hover:bg-cream" style={{ borderBottom: i < logs.length - 1 ? '1px solid #F0EEE6' : 'none' }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-[30px] h-[30px] rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 bg-[#f0eee6] text-[#5a5852]">
                      {initialsOf(actorName)}
                    </div>
                    <span className="text-[13px] font-semibold text-carbon">{actorName}</span>
                    {roleLabel && <span className="px-[7px] py-[2px] rounded-[20px] text-[10px] font-semibold bg-[#eaf0fb] text-[#2156a8]">{roleLabel}</span>}
                    <span className="px-[7px] py-[2px] rounded-[20px] text-[10px] font-semibold" style={{ background: cs.bg, color: cs.color }}>{catLabel}</span>
                    <span className="ml-auto text-[11px] text-slate shrink-0">{timeAgo(item.createdAt)}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-carbon pl-[38px] mb-0.5">{actionTitle(item.action)}</p>
                  {item.description && <p className="text-xs text-slate pl-[38px] mb-0.5">{item.description}</p>}
                  {item.ip && <p className="text-[11px] text-dark-text pl-[38px]">IP: {item.ip}</p>}
                </div>
              );
            })
          )}

          <div className="px-4 py-3 flex items-center justify-between border-t border-bone">
            <span className="text-xs text-slate">Showing {logs.length} of {total.toLocaleString()} events</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="w-7 h-7 rounded-[6px] border border-bone flex items-center justify-center cursor-pointer transition-colors duration-150 hover:bg-cream disabled:opacity-30 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-slate">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="w-7 h-7 rounded-[6px] border border-bone flex items-center justify-center cursor-pointer transition-colors duration-150 hover:bg-cream disabled:opacity-30 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
