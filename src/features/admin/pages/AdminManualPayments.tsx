import { useUrlParam } from '@/hooks/useUrlParam';
import { safeHttpUrl } from '@/utils/safeRedirect';
import { useState } from 'react';
import { Landmark, CheckCircle2, XCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { apiAdminApproveManualPayment, apiAdminRejectManualPayment } from '@/api/services/manualPayment';
import { ExportCsvButton } from '@/features/admin/components/ExportCsvButton';
import { BulkDecisionModal } from '@/features/admin/components/BulkDecisionModal';
import { useBulkRunner } from '@/hooks/admin/useBulkRunner';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminManualPayments, useApproveManualPayment, useRejectManualPayment } from '@/hooks/admin/useAdminManualPayments';
import type { AdminManualPaymentProof, ManualPaymentProofStatus } from '@/api/services/manualPayment';
import { Button, Modal, StatusBadge, Textarea, Table, type TableColumn } from '@/components/comman/ui';
import { Link } from 'react-router-dom';
import { AdminStudioHeader } from '@/features/admin/components/studio';

const STATUS_LABEL: Record<ManualPaymentProofStatus, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
};

const DUP_LABEL = { same_image: 'Same screenshot used', same_reference: 'Same reference number used' } as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// ── Detail / review modal ─────────────────────────────────────────────────────
function ReviewModal({ proof, onClose, onDone }: { proof: AdminManualPaymentProof; onClose: () => void; onDone: () => void }) {
  const { approve, submitting: approving, error: approveError } = useApproveManualPayment();
  const { reject, submitting: rejecting, error: rejectError } = useRejectManualPayment();
  const [rejecting_, setRejecting] = useState(false);
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [reason, setReason] = useState('');

  async function handleApprove() {
    if (!(await approve(proof._id))) return;
    onDone();
  }

  async function handleReject() {
    if (!reason.trim()) return;
    if (!(await reject(proof._id, reason.trim()))) return;
    onDone();
  }

  return (
    <Modal mobileSheet
      title="Manual Payment Review"
      width={560}
      onClose={onClose}
      footer={
        proof.status === 'pending' ? (
          rejecting_ ? (
            <>
              <Button variant="ghost" onClick={() => setRejecting(false)}>Back</Button>
              <Button variant="danger" loading={rejecting} disabled={!reason.trim()} onClick={handleReject}>Confirm Reject</Button>
            </>
          ) : confirmingApprove ? (
            <>
              <Button variant="ghost" onClick={() => setConfirmingApprove(false)}>Back</Button>
              <Button variant="primary" icon={<CheckCircle2 size={14} />} loading={approving} onClick={handleApprove}>Confirm Approve</Button>
            </>
          ) : (
            <>
              <Button variant="outline" icon={<XCircle size={14} />} onClick={() => setRejecting(true)}>Reject</Button>
              <Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={() => setConfirmingApprove(true)}>Approve</Button>
            </>
          )
        ) : (
          <Button variant="outline" onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-charcoal">{proof.buyerName}</p>
            <p className="text-[12px] text-slate">{proof.buyerEmail}</p>
          </div>
          <StatusBadge status={STATUS_LABEL[proof.status]} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cream border border-bone rounded-[8px] px-3 py-3 text-[12.5px]">
          <div><span className="text-slate">Amount (USD)</span><p className="font-semibold text-carbon">${proof.amountUSD.toFixed(2)}</p></div>
          <div><span className="text-slate">Amount transferred (PKR)</span><p className="font-semibold text-carbon">PKR {proof.amountPKR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
          <div><span className="text-slate">Transaction ref</span><p className="font-medium text-carbon font-mono break-all">{proof.transactionReference || '—'}</p></div>
          <div><span className="text-slate">Sender name</span><p className="font-medium text-carbon">{proof.senderName || '—'}</p></div>
          <div><span className="text-slate">Orders</span><p className="font-medium text-carbon">{proof.orderIds.length}</p></div>
          <div><span className="text-slate">Submitted</span><p className="font-medium text-carbon">{formatDate(proof.createdAt)}</p></div>
        </div>

        {(proof.possibleDuplicates?.length ?? 0) > 0 && (
          <div role="alert" className="text-[12px] text-warning bg-warning-bg border border-warning/30 rounded-md px-2.5 py-2">
            <p className="font-semibold m-0 flex items-center gap-1"><AlertTriangle size={13} /> Possible duplicate - check before approving</p>
            <ul className="m-0 mt-1 ps-4 list-disc">
              {proof.possibleDuplicates!.map(d => <li key={d.proofId}>{DUP_LABEL[d.reason]} as another {d.status} proof (checkout …{d.checkoutId.slice(-6)}).</li>)}
            </ul>
            <p className="m-0 mt-1 text-slate">This is only a hint: nothing was rejected automatically.</p>
          </div>
        )}

        {proof.reuploadCount > 0 && (
          <p className="text-[12px] text-warning bg-warning-bg rounded-md px-2 py-1">Re-uploaded {proof.reuploadCount} time{proof.reuploadCount !== 1 ? 's' : ''} after a prior rejection.</p>
        )}

        {safeHttpUrl(proof.proofImageUrl) && (
          <a href={safeHttpUrl(proof.proofImageUrl)} target="_blank" rel="noreferrer" className="block group relative rounded-[8px] overflow-hidden border border-bone">
            <img src={safeHttpUrl(proof.proofImageUrl)} alt="Payment proof" className="w-full max-h-[320px] object-contain bg-cream" />
            <span className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink size={13} className="text-charcoal" />
            </span>
          </a>
        )}

        {proof.status === 'rejected' && proof.rejectionReason && (
          <p className="text-[12px] text-error bg-error-bg rounded-md px-2 py-1.5">Rejected: {proof.rejectionReason}</p>
        )}

        {rejecting_ && (
          <Textarea
            label="Rejection reason (shown to the buyer)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Amount transferred does not match the order total"
            rows={2}
          />
        )}

        {confirmingApprove && (
          <p className="text-[12px] text-charcoal bg-cream border border-bone rounded-md px-2.5 py-2">
            This marks the order{proof.orderIds.length !== 1 ? 's' : ''} as paid and credits the seller. Confirm the transfer amount and reference above match the buyer's actual bank transfer before approving.
          </p>
        )}

        {(approveError || rejectError) && <p className="text-[12px] text-error">{approveError || rejectError}</p>}
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminManualPayments() {
  usePageTitle('Payment proofs');
  const [statusParam, setStatusFilter] = useUrlParam('status', 'pending');
  const statusFilter = statusParam as ManualPaymentProofStatus | '';
  const { proofs, loading, error, refetch } = useAdminManualPayments(statusFilter || undefined);
  const [viewing, setViewing] = useState<AdminManualPaymentProof | null>(null);

  // Bulk approve / reject: one request per proof through the single-action API, so every proof passes the same gates.
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [bulkMode, setBulkMode] = useState<'approve' | 'reject' | null>(null);
  const bulk = useBulkRunner<AdminManualPaymentProof>(p => p.buyerName);
  const selectedProofs = proofs.filter(p => selected.has(p._id) && p.status === 'pending');

  async function runBulkDecision(reason: string) {
    const mode = bulkMode;
    const items = selectedProofs;
    if (!mode) return;
    const res = await bulk.run(items, p => mode === 'approve' ? apiAdminApproveManualPayment(p._id) : apiAdminRejectManualPayment(p._id, reason), mode === 'approve' ? 'approved' : 'rejected');
    setBulkMode(null);
    setSelected(new Set());
    if (res) refetch();
  }

  const columns: TableColumn<AdminManualPaymentProof>[] = [
    {
      key: 'buyer', header: 'Buyer',
      render: p => (
        <div className="max-w-[180px]">
          <p className="font-semibold truncate">{p.buyerName}</p>
          <p className="text-[12px] text-slate truncate">{p.buyerEmail}</p>
        </div>
      ),
    },
    {
      key: 'amount', header: 'Amount',
      render: p => (
        <span className="whitespace-nowrap">
          PKR {p.amountPKR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          <span className="text-slate"> · ${p.amountUSD.toFixed(2)}</span>
        </span>
      ),
    },
    {
      key: 'transactionReference', header: 'Reference',
      render: p => (
        <div className="max-w-[170px]">
          <span className="font-mono truncate block">{p.transactionReference || '—'}</span>
          {(p.possibleDuplicates?.length ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-warning" title="Another proof uses the same screenshot or reference number"><AlertTriangle size={11} /> Possible duplicate</span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt', header: 'Submitted',
      render: p => <span className="whitespace-nowrap">{formatDate(p.createdAt)}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: p => <StatusBadge status={STATUS_LABEL[p.status]} />,
    },
    {
      key: 'actions', header: '', align: 'right',
      render: p => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setViewing(p); }}>Review</Button>
      ),
    },
  ];

  return (
    <div>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Finance"
        title="Payment proofs"
        subtitle="Bank-transfer payments (Pakistan track) awaiting proof verification."
        actions={<div className="flex items-center gap-3 flex-wrap justify-end">
          <ExportCsvButton kind="proofs" params={{ status: statusFilter || undefined }} />
          <Link to="/admin/premium?tab=payments" className="text-[13px] font-semibold text-brand-orange no-underline">Premium payments &rarr;</Link>
        </div>}
      />

      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-4">
        {bulk.message && <div role="status" className="bg-info-bg border border-info/30 rounded-lg px-4 py-2.5 text-[12.5px] text-carbon">{bulk.message}</div>}
        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          <div className="px-5 py-[14px] border-b border-bone flex items-center gap-[10px] flex-wrap">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ManualPaymentProofStatus | '')}
              className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
              <option value="">All Statuses</option>
              {(['pending', 'approved', 'rejected'] as const).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>

          {error ? (
            <p className="px-4 py-6 text-center text-[13px] text-error">{error}</p>
          ) : (
            <Table
              columns={columns}
              data={proofs}
              keyExtractor={p => p._id}
              loading={loading}
              selectable
              selectedKeys={selected}
              onSelectionChange={setSelected}
              bulkActions={() => (
                <>
                  <Button size="xs" variant="primary" icon={<CheckCircle2 size={11} />} loading={bulk.busy} onClick={() => setBulkMode('approve')} disabled={selectedProofs.length === 0}>Approve selected</Button>
                  <Button size="xs" variant="outline" icon={<XCircle size={11} />} onClick={() => setBulkMode('reject')} disabled={bulk.busy || selectedProofs.length === 0}>Reject selected</Button>
                </>
              )}
              onRowClick={setViewing}
              emptyState={{ icon: <Landmark size={28} className="text-slate" />, title: 'No manual payments found', description: 'Bank-transfer submissions will show up here for review.' }}
            />
          )}
        </div>
      </div>

      {bulkMode && (
        <BulkDecisionModal
          title={bulkMode === 'approve' ? `Approve ${selectedProofs.length} payment proof${selectedProofs.length === 1 ? '' : 's'}?` : `Reject ${selectedProofs.length} payment proof${selectedProofs.length === 1 ? '' : 's'}?`}
          message={bulkMode === 'approve'
            ? 'Each approval marks the buyer\'s orders as paid and credits the seller. Only approve proofs whose amount and reference you have checked against the bank account.'
            : 'The buyers are told the proof was rejected, with your reason, and can upload a new one.'}
          items={selectedProofs.map(p => `${p.buyerName} - PKR ${p.amountPKR.toLocaleString(undefined, { maximumFractionDigits: 0 })}${(p.possibleDuplicates?.length ?? 0) > 0 ? ' (possible duplicate)' : ''}`)}
          requireReason={bulkMode === 'reject'}
          reasonLabel="Rejection reason (shown to every buyer)"
          confirmLabel={bulkMode === 'approve' ? 'Approve all' : 'Reject all'}
          danger={bulkMode === 'reject'}
          busy={bulk.busy}
          progress={bulk.progress}
          onConfirm={reason => { void runBulkDecision(reason); }}
          onClose={() => setBulkMode(null)}
        />
      )}

      {viewing && (
        <ReviewModal
          proof={viewing}
          onClose={() => setViewing(null)}
          onDone={() => { setViewing(null); refetch(); }}
        />
      )}
    </div>
  );
}
