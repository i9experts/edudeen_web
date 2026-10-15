import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLeads, useLeadDetail, useLeadActions } from '@/hooks/admin/useAdminMarketplace';
import type { LeadRow, LeadsQuery } from '@/api/services/marketplace/adminMarketplace';
import { Table, Button, Modal, SearchInput, FilterDropdown, StatusBadge, SkeletonBox } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import type { TableColumn } from '@/components/comman/ui';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatDate } from '@/components/comman/analytics/format';
import { Store, RefreshCw, Check, X, Eye } from 'lucide-react';

function StoreCell({ lead }: { lead: LeadRow }) {
  return (
    <div className="flex items-center gap-[10px]">
      <div className="w-8 h-8 rounded-lg bg-brand-pale-orange flex items-center justify-center shrink-0 overflow-hidden border border-[#edebe2]">
        {lead.logo
          ? <img loading="lazy" decoding="async" src={lead.logo} alt={lead.storeName} className="w-full h-full object-cover" />
          : <Store size={15} className="text-brand-orange" />}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-graphite truncate max-w-[180px]">{lead.storeName}</p>
        {lead.categoryName && <p className="text-[12px] text-slate truncate max-w-[180px]">{lead.categoryName}</p>}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[12px] text-slate uppercase tracking-[0.05em]">{label}</p>
      <p className="text-[12.5px] font-semibold text-carbon mt-[2px]">{value || '—'}</p>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All stores' },
  { value: 'pending', label: 'Waiting for approval' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'active', label: 'Live' },
];

// Lead detail — contact + store info only; fetched lazily when opened.
function LeadDetailModal({ leadId, onClose, onApprove, onReject, processingId }: {
  leadId: string;
  onClose: () => void;
  onApprove: (lead: { id: string; storeName: string }) => void;
  onReject: (lead: { id: string; storeName: string }) => void;
  processingId: string | null;
}) {
  const { data, loading, error, refetch } = useLeadDetail(leadId);
  useEffect(() => { refetch(); }, [refetch]);

  return (
    <Modal mobileSheet title="Review store" onClose={onClose} width={640}>
      {loading && (
        <div className="flex flex-col gap-3">
          <SkeletonBox height={20} width="60%" />
          <SkeletonBox height={80} />
        </div>
      )}
      {error && <AnalyticsErrorState message={error} onRetry={refetch} />}
      {!loading && !error && data && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-pale-orange flex items-center justify-center shrink-0 overflow-hidden border border-[#edebe2]">
                {data.logo
                  ? <img loading="lazy" decoding="async" src={data.logo} alt={data.storeName} className="w-full h-full object-cover" />
                  : <Store size={18} className="text-brand-orange" />}
              </div>
              <div>
                <p className="text-[15px] font-bold text-carbon">{data.storeName}</p>
                <p className="text-[12px] text-slate">{data.categoryName ?? 'No category'}</p>
              </div>
            </div>
            <StatusBadge status={data.storeStatus} />
          </div>

          <div>
            <p className="text-[12px] font-bold text-carbon mb-2">Seller Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cream rounded-lg p-3">
              <DetailRow label="Name" value={data.seller.name} />
              <DetailRow label="Email" value={data.seller.email} />
              <DetailRow label="Phone" value={data.seller.phone} />
              <DetailRow label="Address" value={data.seller.address} />
              <DetailRow label="Country" value={data.country} />
              <DetailRow label="Description" value={data.description} />
            </div>
          </div>

          {data.rejectionReason && (
            <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5">
              <p className="text-[12px] font-semibold text-error mb-[2px]">Last rejection reason</p>
              <p className="text-[12.5px] text-error">{data.rejectionReason}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-bone">
            <div className="flex-1" />
            <Button variant="outline" size="sm" icon={<X size={13} />} onClick={() => onReject({ id: data.id, storeName: data.storeName })} disabled={data.storeStatus !== 'pending' || processingId === data.id}>
              Reject
            </Button>
            <Button variant="primary" size="sm" icon={<Check size={13} />} onClick={() => onApprove({ id: data.id, storeName: data.storeName })} disabled={!data.canApprove} loading={processingId === data.id}>
              Approve
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AdminLeads() {
  usePageTitle('Store approvals');

  const [search, setSearch] = useState('');
  const [urlParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(urlParams.get('status') ?? '');
  const [page, setPage] = useState(1);
  useEffect(() => { setStatusFilter(urlParams.get('status') ?? ''); setPage(1); }, [urlParams]);
  const query = useMemo(
    () => ({
      search: search || undefined,
      status: (statusFilter || undefined) as LeadsQuery['status'],
      page, limit: 10,
    }),
    [search, statusFilter, page],
  );

  const { data, loading, error, refetch } = useLeads(query);
  const { approve, reject, processingId, error: actionError } = useLeadActions();

  const [viewingId, setViewingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ id: string; storeName: string } | null>(null);
  const [approving, setApproving] = useState<{ id: string; storeName: string } | null>(null);
  const [reason, setReason] = useState('');
  const reasonTooShort = reason.trim().length > 0 && reason.trim().length < 10;
  const canConfirmReject = reason.trim().length >= 10;

  // Approving activates the store on the live marketplace — same weight as
  // Reject, which already asks for a reason before submitting. This used to
  // fire on a single click with no confirmation at all.
  async function handleConfirmApprove() {
    if (!approving) return;
    const ok = await approve(approving.id);
    if (ok) { setApproving(null); refetch(); }
  }

  async function handleReject() {
    if (!rejecting || !canConfirmReject) return;
    const ok = await reject(rejecting.id, reason.trim());
    if (ok) { setRejecting(null); setReason(''); setViewingId(null); refetch(); }
  }

  const columns: TableColumn<LeadRow>[] = [
    { key: 'storeName', header: 'Store', render: lead => <StoreCell lead={lead} /> },
    {
      key: 'seller', header: 'Seller',
      render: lead => (
        <div className="min-w-0">
          <p className="text-[13px] text-graphite truncate max-w-[200px]">{lead.seller.name}</p>
          <p className="text-[12px] text-slate truncate max-w-[200px]">{lead.seller.email}</p>
        </div>
      ),
    },
    {
      key: 'country', header: 'Country',
      render: lead => <span className="text-[12px] text-charcoal font-medium">{lead.country}</span>,
    },
    {
      key: 'storeStatus', header: 'Status',
      render: lead => <StatusBadge status={lead.storeStatus} size="sm" />,
    },
    {
      key: 'submittedAt', header: 'Created',
      render: lead => <span className="text-[12px] text-slate whitespace-nowrap">{formatDate(lead.submittedAt)}</span>,
    },
    {
      key: 'actions', header: 'Actions', align: 'right',
      render: lead => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="xs" icon={<Eye size={12} />} onClick={() => setViewingId(lead.id)}>
            View
          </Button>
          <Button
            variant="outline" size="xs"
            icon={<X size={12} />}
            onClick={() => setRejecting({ id: lead.id, storeName: lead.storeName })}
            disabled={processingId === lead.id}
          >
            Reject
          </Button>
          <Button
            variant="primary" size="xs"
            icon={<Check size={12} />}
            onClick={() => setApproving({ id: lead.id, storeName: lead.storeName })}
            disabled={processingId === lead.id}
          >
            Approve
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminStudioHeader eyebrow="Edudeen team workspace · Commerce"
        title="Store approvals"
        subtitle="New stores go live automatically. This list only shows older stores that are still waiting for approval, or that were rejected."
        actions={<Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={refetch}>Refresh</Button>}
      />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      {actionError && <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{actionError}</div>}

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        <div className="flex items-center gap-[10px] px-5 py-[14px] border-b border-bone flex-wrap">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by store name…" className="flex-1 max-w-[300px]" />
          <FilterDropdown
            placeholder="Review Queue"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={v => { setStatusFilter(v); setPage(1); }}
          />
        </div>

        {error ? (
          <div className="p-5"><AnalyticsErrorState message={error} onRetry={refetch} /></div>
        ) : (
          <Table
            columns={columns}
            data={data?.items ?? []}
            keyExtractor={lead => lead.id}
            loading={loading}
            emptyState={{ icon: <Store size={28} className="text-slate/50" />, title: 'No stores waiting', description: 'Every store has been reviewed.' }}
            pagination={{ page, total: data?.total ?? 0, perPage: 10, onChange: setPage, label: 'leads' }}
          />
        )}
      </div>

      {viewingId && (
        <LeadDetailModal
          leadId={viewingId}
          onClose={() => setViewingId(null)}
          onApprove={lead => { setViewingId(null); setApproving(lead); }}
          onReject={lead => { setViewingId(null); setRejecting(lead); }}
          processingId={processingId}
        />
      )}

      {approving && (
        <Modal mobileSheet
          title="Approve this store?"
          onClose={() => setApproving(null)}
          footer={<>
            <Button variant="ghost" onClick={() => setApproving(null)} disabled={processingId === approving.id}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirmApprove} loading={processingId === approving.id}>Approve Store</Button>
          </>}
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Approve "<strong>{approving.storeName}</strong>"? This activates the store and makes it eligible for the marketplace — it becomes visible and purchasable right away.
          </p>
        </Modal>
      )}

      {rejecting && (
        <Modal mobileSheet
          title="Reject Application"
          onClose={() => { setRejecting(null); setReason(''); }}
          footer={<>
            <Button variant="ghost" onClick={() => { setRejecting(null); setReason(''); }}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} disabled={!canConfirmReject} loading={processingId === rejecting.id}>Reject Lead</Button>
          </>}
        >
          <p className="text-[13px] text-charcoal leading-[1.6] mb-3">
            Reject "<strong>{rejecting.storeName}</strong>"? The seller will be notified with your reason with your reason.
          </p>
          <label htmlFor="lead-reject-reason" className="block text-[12px] font-medium text-charcoal mb-[6px]">Reason <span className="text-brand-orange">*</span> <span className="text-slate font-normal">(shown to the seller, min. 10 characters)</span></label>
          <textarea
            id="lead-reject-reason"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. This store does not sell educational resources"
            className="w-full px-3 py-[10px] rounded-lg border border-bone text-[13px] text-charcoal outline-none bg-white resize-y transition-[border-color,box-shadow] duration-150 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
          />
          {reasonTooShort && <p className="text-[12px] text-error mt-1">Please provide a bit more detail (at least 10 characters).</p>}
        </Modal>
      )}
      </div>
    </>
  );
}
