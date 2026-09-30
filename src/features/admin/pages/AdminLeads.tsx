import { useEffect, useMemo, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLeads, useLeadDetail, useLeadActions } from '@/hooks/admin/useAdminMarketplace';
import type { LeadRow, LeadVerificationStatus } from '@/api/services/marketplace/adminMarketplace';
import { Table, Button, Modal, SearchInput, FilterDropdown, Badge, StatusBadge, SkeletonBox } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import type { TableColumn } from '@/components/comman/ui';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatDate } from '@/components/comman/analytics/format';
import { Store, RefreshCw, Check, X, Eye, ExternalLink, Clock, AlertCircle } from 'lucide-react';

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
        {lead.categoryName && <p className="text-[11px] text-slate truncate max-w-[180px]">{lead.categoryName}</p>}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] text-slate uppercase tracking-[0.05em]">{label}</p>
      <p className="text-[12.5px] font-semibold text-carbon mt-[2px]">{value || '—'}</p>
    </div>
  );
}

const HISTORY_ACTION_LABEL: Record<string, string> = {
  submitted: 'Submitted for review',
  resubmitted: 'Resubmitted after rejection',
  under_review: 'Marked under review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const VERIFICATION_LEVEL_LABEL: Record<string, string> = {
  basic: 'Basic',
  business: 'Business',
  enhanced: 'Enhanced',
};

// The default queue (no filter selected) is pending/under_review only, same
// as the backend's default — "All Statuses" is an explicit admin choice to
// look outside the actionable queue, e.g. to review already-verified or
// rejected leads.
const VERIFICATION_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

// ── Lead detail — business info (country/business-type/level-aware), the
// same requirement checklist the seller sees (so admin never has to guess
// "why is this document required"), fresh signed document URLs, and the
// full submit/review history trail. Fetched lazily only when opened. ──
function LeadDetailModal({ leadId, onClose, onApprove, onReject, onMarkUnderReview, processingId }: {
  leadId: string;
  onClose: () => void;
  onApprove: (lead: { id: string; storeName: string }) => void;
  onReject: (lead: { id: string; storeName: string }) => void;
  onMarkUnderReview: (id: string) => void;
  processingId: string | null;
}) {
  const { data, loading, error, refetch } = useLeadDetail(leadId);
  useEffect(() => { refetch(); }, [refetch]);

  const reviewable = data?.verificationStatus === 'pending' || data?.verificationStatus === 'under_review';

  return (
    <Modal mobileSheet title="Review Application" onClose={onClose} width={640}>
      {loading && (
        <div className="flex flex-col gap-3">
          <SkeletonBox height={20} width="60%" />
          <SkeletonBox height={80} />
          <SkeletonBox height={120} />
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
                <p className="text-[11.5px] text-slate">{data.categoryName ?? 'No category'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={data.verificationStatus} />
              <Badge color="gray">{VERIFICATION_LEVEL_LABEL[data.verificationLevel] ?? data.verificationLevel} verification</Badge>
            </div>
          </div>

          {!data.canApprove && (
            <div className="bg-warning-bg border border-warning/30 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <AlertCircle size={14} className="text-warning shrink-0" />
              <span className="text-[12.5px] text-warning">
                Incomplete — {data.missingFields.length} field(s) and {data.missingDocuments.length} document(s) still missing. Cannot be approved until complete.
              </span>
            </div>
          )}

          <div>
            <p className="text-[12px] font-bold text-carbon mb-2">Seller Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cream rounded-lg p-3">
              <DetailRow label="Name" value={data.seller.name} />
              <DetailRow label="Email" value={data.seller.email} />
              <DetailRow label="Phone" value={data.seller.phone} />
              <DetailRow label="Address" value={data.seller.address} />
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold text-carbon mb-2">Business Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cream rounded-lg p-3">
              <DetailRow label="Country" value={data.country} />
              <DetailRow label="Business Type" value={data.businessType} />
              <DetailRow label="Legal Business Name" value={data.legalBusinessName} />
              <DetailRow label="Registration Number" value={data.registrationNumber} />
              <DetailRow label="Tax ID / NTN" value={data.taxId} />
              <DetailRow label="ID Document Type" value={data.idDocumentType} />
              <DetailRow label="Business Address" value={data.businessAddress} />
              <DetailRow label="Authorized Contact" value={data.authorizedContact?.name} />
              <DetailRow label="Contact Email / Phone" value={[data.authorizedContact?.email, data.authorizedContact?.phone].filter(Boolean).join(' · ')} />
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold text-carbon mb-2">
              Documents — {VERIFICATION_LEVEL_LABEL[data.verificationLevel] ?? data.verificationLevel} verification requires {data.documents.filter(d => d.required).length}
            </p>
            <div className="flex flex-col gap-2">
              {data.documents.map(doc => (
                <div key={doc.type} className="flex items-center justify-between gap-3 bg-cream rounded-lg px-3 py-2.5">
                  <div className="min-w-0 flex items-center gap-2">
                    <p className="text-[12.5px] font-semibold text-carbon capitalize">{doc.type.replace(/_/g, ' ')}</p>
                    <Badge color={doc.required ? 'orange' : 'gray'}>{doc.required ? 'Required' : 'Optional'}</Badge>
                    {doc.state !== 'uploaded' && <span className="text-[11px] text-slate">— not uploaded</span>}
                    {doc.fileName && <p className="text-[11px] text-slate truncate">{doc.fileName}</p>}
                  </div>
                  {doc.viewUrl && (
                    <a href={doc.viewUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-orange hover:underline">
                      View <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {data.rejectionReason && (
            <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5">
              <p className="text-[11px] font-semibold text-error mb-[2px]">Last rejection reason</p>
              <p className="text-[12.5px] text-error">{data.rejectionReason}</p>
            </div>
          )}

          {data.history.length > 0 && (
            <div>
              <p className="text-[12px] font-bold text-carbon mb-2">History</p>
              <div className="flex flex-col gap-2">
                {data.history.slice().reverse().map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Clock size={12} className="text-slate mt-[3px] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[12px] text-charcoal">
                        <span className="font-semibold">{HISTORY_ACTION_LABEL[h.action] ?? h.action}</span>
                        {' — '}<span className="text-slate">{formatDate(h.at)} by {h.actorRole}</span>
                      </p>
                      {h.note && <p className="text-[11.5px] text-slate mt-[1px]">{h.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-bone">
            {data.verificationStatus === 'pending' && (
              <Button variant="ghost" size="sm" onClick={() => onMarkUnderReview(data.id)} loading={processingId === data.id}>
                Mark Under Review
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" size="sm" icon={<X size={13} />} onClick={() => onReject({ id: data.id, storeName: data.storeName })} disabled={!reviewable || processingId === data.id}>
              Reject
            </Button>
            <Button variant="primary" size="sm" icon={<Check size={13} />} onClick={() => onApprove({ id: data.id, storeName: data.storeName })} disabled={!reviewable || !data.canApprove} loading={processingId === data.id}>
              Approve
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function AdminLeads() {
  usePageTitle('Seller Applications');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const query = useMemo(
    () => ({
      search: search || undefined,
      verificationStatus: (statusFilter || undefined) as LeadVerificationStatus | 'all' | undefined,
      page, limit: 10,
    }),
    [search, statusFilter, page],
  );

  const { data, loading, error, refetch } = useLeads(query);
  const { markUnderReview, approve, reject, processingId, error: actionError } = useLeadActions();

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

  async function handleMarkUnderReview(id: string) {
    const ok = await markUnderReview(id);
    if (ok) refetch();
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
          <p className="text-[11px] text-slate truncate max-w-[200px]">{lead.seller.email}</p>
        </div>
      ),
    },
    {
      key: 'country', header: 'Country',
      render: lead => <span className="text-[12px] text-charcoal font-medium">{lead.country}</span>,
    },
    {
      key: 'businessType', header: 'Business Type',
      render: lead => lead.businessType
        ? <Badge color="orange" className="capitalize">{lead.businessType}</Badge>
        : <span className="text-slate">—</span>,
    },
    {
      key: 'verificationLevel', header: 'Level',
      render: lead => lead.verificationLevel
        ? <Badge color="gray">{VERIFICATION_LEVEL_LABEL[lead.verificationLevel] ?? lead.verificationLevel}</Badge>
        : <span className="text-slate">—</span>,
    },
    {
      key: 'verificationStatus', header: 'Verification',
      render: lead => <StatusBadge status={lead.verificationStatus} size="sm" />,
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
        title="Seller Applications"
        subtitle="New stores submitted through onboarding — review business verification and approve or reject before they go live."
        actions={<Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={refetch}>Refresh</Button>}
      />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      {actionError && <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{actionError}</div>}

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        <div className="flex items-center gap-[10px] px-5 py-[14px] border-b border-bone flex-wrap">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by store name…" className="flex-1 max-w-[300px]" />
          <FilterDropdown
            placeholder="Review Queue"
            options={VERIFICATION_STATUS_OPTIONS}
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
            emptyState={{ icon: <Store size={28} className="text-slate/50" />, title: 'No pending leads', description: 'Every submitted store has been reviewed.' }}
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
          onMarkUnderReview={handleMarkUnderReview}
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
            Reject "<strong>{rejecting.storeName}</strong>"? The seller will be notified with your reason and can correct the details and resubmit.
          </p>
          <label htmlFor="lead-reject-reason" className="block text-[12px] font-medium text-charcoal mb-[6px]">Reason <span className="text-brand-orange">*</span> <span className="text-slate font-normal">(shown to the seller, min. 10 characters)</span></label>
          <textarea
            id="lead-reject-reason"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Business registration document is illegible — please re-upload a clearer scan"
            className="w-full px-3 py-[10px] rounded-lg border border-bone text-[13px] text-charcoal outline-none bg-white resize-y transition-[border-color,box-shadow] duration-150 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
          />
          {reasonTooShort && <p className="text-[11px] text-error mt-1">Please provide a bit more detail (at least 10 characters).</p>}
        </Modal>
      )}
      </div>
    </>
  );
}
