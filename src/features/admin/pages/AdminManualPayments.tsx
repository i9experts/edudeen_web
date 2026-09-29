import { useState } from 'react';
import { Landmark, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminManualPayments, useApproveManualPayment, useRejectManualPayment } from '@/hooks/admin/useAdminManualPayments';
import type { AdminManualPaymentProof, ManualPaymentProofStatus } from '@/api/services/manualPayment';
import { Button, Modal, StatusBadge, Textarea, Table, type TableColumn } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';

const STATUS_LABEL: Record<ManualPaymentProofStatus, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
};

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

        {proof.reuploadCount > 0 && (
          <p className="text-[11px] text-warning bg-warning-bg rounded-md px-2 py-1">Re-uploaded {proof.reuploadCount} time{proof.reuploadCount !== 1 ? 's' : ''} after a prior rejection.</p>
        )}

        {proof.proofImageUrl && (
          <a href={proof.proofImageUrl} target="_blank" rel="noreferrer" className="block group relative rounded-[8px] overflow-hidden border border-bone">
            <img src={proof.proofImageUrl} alt="Payment proof" className="w-full max-h-[320px] object-contain bg-cream" />
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
  usePageTitle('Manual Payments');
  const [statusFilter, setStatusFilter] = useState<ManualPaymentProofStatus | ''>('pending');
  const { proofs, loading, error, refetch } = useAdminManualPayments(statusFilter || undefined);
  const [viewing, setViewing] = useState<AdminManualPaymentProof | null>(null);

  const columns: TableColumn<AdminManualPaymentProof>[] = [
    {
      key: 'buyer', header: 'Buyer',
      render: p => (
        <div className="max-w-[180px]">
          <p className="font-semibold truncate">{p.buyerName}</p>
          <p className="text-[11px] text-slate truncate">{p.buyerEmail}</p>
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
      render: p => <span className="font-mono max-w-[160px] truncate block">{p.transactionReference || '—'}</span>,
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
        title="Manual payments"
        subtitle="Bank-transfer payments (Pakistan track) awaiting proof verification."
      />

      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-4">
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
              onRowClick={setViewing}
              emptyState={{ icon: <Landmark size={28} className="text-slate" />, title: 'No manual payments found', description: 'Bank-transfer submissions will show up here for review.' }}
            />
          )}
        </div>
      </div>

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
