import { useMemo, useState } from 'react';
import { Activity as ActivityIcon, Download, ShieldAlert } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminActivityLog } from '@/hooks/admin/useAdminActivityLog';
import {
  apiExportAdminActivityLog, ADMIN_ACTIVITY_CATEGORIES,
  type AdminActivityLogEntry, type AdminActivityCategory,
} from '@/api/services/activityLog';
import { Table, Badge, Button, SearchInput, FilterDropdown, type TableColumn } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import type { BadgeColor } from '@/types';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatDate } from '@/components/comman/analytics/format';

const PAGE_SIZE = 20;

// Cycled over a small palette — 16 categories, 6 colors, repeats by design
// rather than needing a bespoke color per category.
const CATEGORY_COLOR: Record<AdminActivityCategory, BadgeColor> = {
  products: 'blue', orders: 'blue', finance: 'orange', marketing: 'yellow',
  customers: 'green', settings: 'gray', security: 'red',
  loyalty: 'green', subscriptions: 'blue', platform_billing: 'orange',
  platform_plans: 'orange', seo: 'yellow', ai_studio: 'yellow',
  announcements: 'gray', moderation: 'red', promotions: 'green',
};

function categoryLabel(c: string) {
  return c.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function actionTitle(action: string) {
  const s = action.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CATEGORY_OPTIONS = ADMIN_ACTIVITY_CATEGORIES.map(c => ({ value: c, label: categoryLabel(c) }));
const DATE_RANGE_OPTIONS = [
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function AdminActivityLog() {
  usePageTitle('Activity Log');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dateRange, setDateRange] = useState('last30');
  const [securityOnly, setSecurityOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const from = dateRange === 'last7' ? daysAgo(7) : dateRange === 'last30' ? daysAgo(30) : dateRange === 'last90' ? daysAgo(90) : undefined;

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      category: (category || undefined) as AdminActivityCategory | undefined,
      isSecurityAlert: securityOnly || undefined,
      from,
    }),
    [page, search, category, securityOnly, from],
  );

  const { data, loading, error, refetch } = useAdminActivityLog(query);

  async function handleExport() {
    setExporting(true);
    setExportError('');
    try {
      await apiExportAdminActivityLog(query);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export activity log.');
    } finally {
      setExporting(false);
    }
  }

  const columns: TableColumn<AdminActivityLogEntry>[] = [
    { key: 'createdAt', header: 'Date', render: r => <span className="text-slate whitespace-nowrap">{formatDate(r.createdAt)}</span> },
    { key: 'storeId', header: 'Store', render: r => <span className="text-graphite whitespace-nowrap">{r.storeId === 'platform' ? 'Platform' : r.storeId}</span> },
    {
      key: 'category', header: 'Category',
      render: r => (
        <div className="flex items-center gap-1.5">
          <Badge color={r.isSecurityAlert ? 'red' : CATEGORY_COLOR[r.category] ?? 'gray'} size="sm">
            {r.isSecurityAlert && <ShieldAlert size={10} />} {r.isSecurityAlert ? 'Security Alert' : categoryLabel(r.category)}
          </Badge>
        </div>
      ),
    },
    {
      key: 'action', header: 'Action',
      render: r => (
        <div className="max-w-[220px]">
          <p className="font-medium text-charcoal truncate m-0">{actionTitle(r.action)}</p>
          {r.description && <p className="text-[11px] text-slate truncate m-0">{r.description}</p>}
        </div>
      ),
    },
    {
      key: 'actorName', header: 'Actor',
      render: r => (
        <div className="max-w-[160px]">
          <p className="text-graphite truncate m-0">{r.actorName ?? '—'}</p>
          {r.actorRole && <p className="text-[11px] text-slate m-0">{r.actorRole}</p>}
        </div>
      ),
    },
    { key: 'ip', header: 'IP', render: r => <span className="text-slate whitespace-nowrap">{r.ip ?? '—'}</span> },
  ];

  return (
    <>
      <AdminStudioHeader eyebrow="Edudeen team workspace · System"
        title="Activity Log"
        subtitle="Platform-wide audit trail — every seller store plus platform-level actions, in one place."
        actions={
          <Button variant="outline" size="sm" icon={<Download size={12} />} loading={exporting} onClick={handleExport}>
            Export CSV
          </Button>
        }
      />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">

      {exportError && <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{exportError}</div>}

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        <div className="px-5 py-[14px] border-b border-bone flex gap-[10px] items-center flex-wrap">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search action, actor, description…" className="flex-1 max-w-[280px]" />
          <FilterDropdown placeholder="All Categories" options={CATEGORY_OPTIONS} value={category} onChange={v => { setCategory(v); setPage(1); }} />
          <FilterDropdown options={DATE_RANGE_OPTIONS} value={dateRange} onChange={v => { setDateRange(v); setPage(1); }} />
          <label className="flex items-center gap-1.5 text-[13px] text-graphite cursor-pointer select-none px-1">
            <input
              type="checkbox"
              className="accent-brand-orange cursor-pointer"
              checked={securityOnly}
              onChange={e => { setSecurityOnly(e.target.checked); setPage(1); }}
            />
            Security alerts only
          </label>
        </div>

        {error ? (
          <div className="p-5"><AnalyticsErrorState message={error} onRetry={refetch} /></div>
        ) : (
          <Table
            columns={columns}
            data={data?.logs ?? []}
            keyExtractor={r => r._id}
            loading={loading}
            emptyState={{ icon: <ActivityIcon size={28} className="text-slate/50" />, title: 'No activity matches your filters', description: 'Try adjusting your search, category, or date range.' }}
            pagination={{ page, total: data?.pagination?.total ?? 0, perPage: PAGE_SIZE, onChange: setPage, label: 'events' }}
          />
        )}
      </div>
      </div>
    </>
  );
}
