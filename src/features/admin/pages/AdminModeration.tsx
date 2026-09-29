import { useMemo, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useModerationStats, useModerationQueue, useModerationActions } from '@/hooks/admin/useAdminModeration';
import type { ModerationReportRow, ModerationTargetType, RiskLevel } from '@/api/services/moderation/adminModeration';
import { Table, Badge, Button, Modal, SkeletonBox, SearchInput, FilterDropdown, MetricCard } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import type { TableColumn } from '@/components/comman/ui';
import type { BadgeColor } from '@/types';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatDate } from '@/components/comman/analytics/format';
import { AlertCircle, AlertTriangle, Info, SearchX, Eye, Check, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const RISK: Record<RiskLevel, { label: string; color: BadgeColor; Icon: LucideIcon }> = {
  high:   { label: 'High',   color: 'red',    Icon: AlertCircle },
  medium: { label: 'Medium', color: 'yellow', Icon: AlertTriangle },
  low:    { label: 'Low',    color: 'gray',   Icon: Info },
};

const TYPE_COLOR: Record<ModerationTargetType, BadgeColor> = { listing: 'blue', seller: 'orange', review: 'gray' };
const TYPE_LABEL: Record<ModerationTargetType, string> = { listing: 'Listing', seller: 'Seller', review: 'Review' };

const TYPE_OPTIONS = [
  { value: 'listing', label: 'Listing' },
  { value: 'seller', label: 'Seller' },
  { value: 'review', label: 'Review' },
];
const RISK_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const r = RISK[risk];
  return <Badge color={r.color} size="sm"><r.Icon size={10} /> {r.label}</Badge>;
}

// ── Report detail modal ───────────────────────────────────────────────────────
function ReportDetailModal({ report, onClose, onApproved }: { report: ModerationReportRow; onClose: () => void; onApproved: () => void }) {
  const { approve, processingId, error } = useModerationActions();

  async function handleApprove() {
    const ok = await approve(report._id);
    if (ok) onApproved();
  }

  return (
    <Modal mobileSheet
      title="Report Details"
      onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="secondary" onClick={handleApprove} loading={processingId === report._id}>Approve — No Action</Button>
      </>}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge color={TYPE_COLOR[report.targetType]} size="sm">{TYPE_LABEL[report.targetType]}</Badge>
          <RiskBadge risk={report.riskLevel} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-charcoal">{report.itemLabel}</p>
          {report.sellerName && <p className="text-[12px] text-slate">Seller: {report.sellerName}</p>}
        </div>
        <div>
          <p className="text-[11px] font-medium text-graphite mb-1">Reason</p>
          <p className="text-[13px] text-charcoal">{report.reason}</p>
        </div>
        {report.details && (
          <div>
            <p className="text-[11px] font-medium text-graphite mb-1">Details</p>
            <p className="text-[13px] text-charcoal leading-[1.6]">{report.details}</p>
          </div>
        )}
        <p className="text-[11px] text-slate">Reported {formatDate(report.createdAt)}</p>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

export function AdminModeration() {
  usePageTitle('Moderation');
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useModerationStats();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      search: search || undefined,
      targetType: (typeFilter || undefined) as ModerationTargetType | undefined,
      riskLevel: (riskFilter || undefined) as RiskLevel | undefined,
      page,
      limit: 10,
    }),
    [search, typeFilter, riskFilter, page],
  );

  const { data, loading, error, refetch } = useModerationQueue(query);
  const { approve, remove, processingId, error: actionError } = useModerationActions();

  const [viewing, setViewing] = useState<ModerationReportRow | null>(null);
  const [removing, setRemoving] = useState<ModerationReportRow | null>(null);

  function refreshAll() { refetchStats(); refetch(); }

  async function handleApprove(report: ModerationReportRow) {
    const ok = await approve(report._id);
    if (ok) refreshAll();
  }

  async function handleRemove() {
    if (!removing) return;
    const ok = await remove(removing._id);
    if (ok) { setRemoving(null); refreshAll(); }
  }

  const columns: TableColumn<ModerationReportRow>[] = [
    { key: 'targetType', header: 'Type', render: (r) => <Badge color={TYPE_COLOR[r.targetType]} size="sm">{TYPE_LABEL[r.targetType]}</Badge> },
    { key: 'itemLabel', header: 'Item', render: (r) => <p className="text-[13px] font-medium text-charcoal max-w-[180px] truncate m-0">{r.itemLabel}</p> },
    { key: 'sellerName', header: 'Seller', render: (r) => <span className="text-[13px] text-graphite whitespace-nowrap">{r.sellerName ?? '—'}</span> },
    { key: 'reason', header: 'Reason', render: (r) => <span className="text-[13px] text-graphite max-w-[200px] block truncate">{r.reason}</span> },
    { key: 'riskLevel', header: 'Risk', render: (r) => <RiskBadge risk={r.riskLevel} /> },
    { key: 'createdAt', header: 'Reported', render: (r) => <span className="text-[13px] text-slate whitespace-nowrap">{formatDate(r.createdAt)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-[6px]">
          <Button size="xs" variant="outline" icon={<Eye size={11} />} onClick={() => setViewing(r)}>Review</Button>
          <Button size="xs" variant="secondary" icon={<Check size={11} />} loading={processingId === r._id} onClick={() => handleApprove(r)}>Approve</Button>
          <Button size="xs" variant="danger" icon={<Trash2 size={11} />} disabled={processingId === r._id} onClick={() => setRemoving(r)}>Remove</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminStudioHeader eyebrow="Edudeen team workspace · People" title="Content Moderation" subtitle="Review flagged listings, sellers, and reports." />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      {actionError && <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{actionError}</div>}

      {statsError ? (
        <AnalyticsErrorState message={statsError} onRetry={refetchStats} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {statsLoading && !stats ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} height={92} rounded="10px" />)
          ) : stats ? (
            <>
              <MetricCard label="Queue Total" value={String(stats.queueTotal)} sub="Items to review" />
              <MetricCard label="Urgent" value={String(stats.urgent)} sub="High-risk flags" />
              <MetricCard label="Approved Today" value={String(stats.approvedToday)} />
              <MetricCard label="Avg Review Time" value={`${stats.avgReviewMinutes} min`} />
            </>
          ) : null}
        </div>
      )}

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        <div className="px-5 py-[14px] border-b border-bone flex gap-[10px] items-center flex-wrap">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search flagged items…" className="flex-1 max-w-[280px]" />
          <FilterDropdown placeholder="All Types" options={TYPE_OPTIONS} value={typeFilter} onChange={(v) => { setTypeFilter(v); setPage(1); }} />
          <FilterDropdown placeholder="All Priority" options={RISK_OPTIONS} value={riskFilter} onChange={(v) => { setRiskFilter(v); setPage(1); }} />
        </div>

        {error ? (
          <div className="p-5"><AnalyticsErrorState message={error} onRetry={refetch} /></div>
        ) : (
          <Table
            columns={columns}
            data={data?.items ?? []}
            keyExtractor={(r) => r._id}
            loading={loading}
            emptyState={{ icon: <SearchX size={28} className="text-slate/50" />, title: 'No flagged items match your filters', description: 'Try adjusting your search or clearing the type/priority filters.' }}
            pagination={{ page, total: data?.total ?? 0, perPage: 10, onChange: setPage, label: 'reports' }}
          />
        )}
      </div>

      {viewing && (
        <ReportDetailModal
          report={viewing}
          onClose={() => setViewing(null)}
          onApproved={() => { setViewing(null); refreshAll(); }}
        />
      )}

      {removing && (
        <Modal mobileSheet
          title="Remove Flagged Item"
          onClose={() => setRemoving(null)}
          footer={<>
            <Button variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleRemove} loading={processingId === removing._id}>
              {removing.targetType === 'seller' ? 'Suspend Seller' : 'Remove Listing'}
            </Button>
          </>}
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            {removing.targetType === 'seller'
              ? <>Suspend "<strong>{removing.itemLabel}</strong>"? Their account will be immediately blocked from the platform.</>
              : <>Remove "<strong>{removing.itemLabel}</strong>" from the marketplace? It will be delisted immediately.</>}
          </p>
        </Modal>
      )}
      </div>
    </>
  );
}
