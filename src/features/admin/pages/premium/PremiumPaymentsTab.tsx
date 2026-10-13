import { useState } from 'react';
import { Landmark, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { Badge, Button, FilterDropdown, Modal, Table, Textarea, type TableColumn } from '@/components/comman/ui';
import {
  apiAdminPremiumPayments, apiAdminPremiumProofUrl, apiAdminApprovePremiumPayment, apiAdminRejectPremiumPayment,
  type AdminPremiumPayment, type PremiumPaymentStatus,
} from '@/api/services/adminPremium';
import type { BadgeColor } from '@/types';
import { useLoad, money, fmtDateTime } from './useLoad';

const PAGE_SIZE = 20;
const STATUS_META: Record<PremiumPaymentStatus, { label: string; color: BadgeColor }> = {
  pending: { label: 'Pending review', color: 'yellow' },
  awaiting_proof: { label: 'Awaiting proof', color: 'gray' },
  approved: { label: 'Approved', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
  cancelled: { label: 'Cancelled', color: 'gray' },
};
const STATUS_OPTIONS = (Object.keys(STATUS_META) as PremiumPaymentStatus[]).map(s => ({ value: s, label: STATUS_META[s].label }));

function ReviewModal({ payment, onClose, onDone }: { payment: AdminPremiumPayment; onClose: () => void; onDone: () => void }) {
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofState, setProofState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const meta = STATUS_META[payment.status];
  const reasonOk = reason.trim().length >= 3;

  // Receipts are signed, short-lived links: fetch only when the admin asks.
  async function loadProof() {
    setProofState('loading');
    try {
      const r = await apiAdminPremiumProofUrl(payment._id);
      if (!r.data.url) throw new Error('No receipt was uploaded.');
      setProofUrl(r.data.url); setProofState('idle');
    } catch { setProofState('error'); }
  }

  async function act() {
    setBusy(true); setError('');
    try {
      if (mode === 'approve') await apiAdminApprovePremiumPayment(payment._id);
      else await apiAdminRejectPremiumPayment(payment._id, reason.trim());
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action failed.');
    } finally { setBusy(false); }
  }

  const footer = payment.status !== 'pending' ? <Button variant="outline" onClick={onClose}>Close</Button>
    : mode === 'reject' ? (<><Button variant="ghost" onClick={() => setMode('view')}>Back</Button><Button variant="danger" loading={busy} disabled={!reasonOk} onClick={act}>Confirm reject</Button></>)
    : mode === 'approve' ? (<><Button variant="ghost" onClick={() => setMode('view')}>Back</Button><Button variant="primary" icon={<CheckCircle2 size={14} />} loading={busy} onClick={act}>Confirm approve</Button></>)
    : (<><Button variant="outline" icon={<XCircle size={14} />} onClick={() => setMode('reject')}>Reject</Button><Button variant="primary" icon={<CheckCircle2 size={14} />} onClick={() => setMode('approve')}>Approve</Button></>);

  return (
    <Modal mobileSheet title="Premium payment review" width={560} onClose={onClose} footer={footer}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0"><p className="text-[13px] font-semibold text-charcoal truncate">{payment.buyerName}</p><p className="text-[12px] text-slate truncate">{payment.buyerEmail}</p></div>
          <Badge color={meta.color} dot>{meta.label}</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cream border border-bone rounded-[8px] px-3 py-3 text-[12.5px]">
          <div><span className="text-slate">Plan</span><p className="font-semibold text-carbon">{payment.planName} · {payment.interval}</p></div>
          <div><span className="text-slate">Amount</span><p className="font-semibold text-carbon">{money(payment.amountUSD)}{payment.amountPKR ? <span className="text-slate font-normal"> · PKR {payment.amountPKR.toLocaleString()}</span> : null}</p></div>
          <div><span className="text-slate">Transaction ref</span><p className="font-medium text-carbon font-mono break-all">{payment.transactionReference || '—'}</p></div>
          <div><span className="text-slate">Sender name</span><p className="font-medium text-carbon">{payment.senderName || '—'}</p></div>
          <div><span className="text-slate">Submitted</span><p className="font-medium text-carbon">{fmtDateTime(payment.createdAt)}</p></div>
        </div>
        {payment.reuploadCount > 0 && <p className="text-[12px] text-warning bg-warning-bg rounded-md px-2 py-1">Re-uploaded {payment.reuploadCount} time{payment.reuploadCount !== 1 ? 's' : ''} after a prior rejection.</p>}

        {payment.hasProof ? (
          proofUrl ? (
            <a href={proofUrl} target="_blank" rel="noreferrer" className="block group relative rounded-[8px] overflow-hidden border border-bone">
              <img src={proofUrl} alt="Payment receipt" className="w-full max-h-[320px] object-contain bg-cream" />
              <span className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><ExternalLink size={13} className="text-charcoal" /></span>
            </a>
          ) : (
            <div>
              <Button variant="outline" size="sm" loading={proofState === 'loading'} onClick={loadProof}>View receipt</Button>
              {proofState === 'error' && <p role="alert" className="text-[12px] text-error mt-1">Could not load the receipt. Try again.</p>}
            </div>
          )
        ) : <p className="text-[12px] text-slate">No receipt uploaded yet.</p>}

        {payment.status === 'rejected' && payment.rejectionReason && <p className="text-[12px] text-error bg-error-bg rounded-md px-2 py-1.5">Rejected: {payment.rejectionReason}</p>}
        {mode === 'reject' && <Textarea label="Rejection reason (shown to the buyer)" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Amount transferred does not match the plan price" error={reason && !reasonOk ? 'Give at least 3 characters.' : undefined} />}
        {mode === 'approve' && <p className="text-[12px] text-charcoal bg-cream border border-bone rounded-md px-2.5 py-2">This activates {payment.buyerName}'s Premium membership. Check the amount and reference match the bank transfer before approving.</p>}
        {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

export function PremiumPaymentsTab({ initialStatus }: { initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<AdminPremiumPayment | null>(null);
  const { data, loading, error, refetch } = useLoad(
    () => apiAdminPremiumPayments({ status: status || undefined, page, limit: PAGE_SIZE }).then(r => r.data),
    [status, page],
  );
  // The API returns oldest first; keep the queue order but float pending to the top of the page.
  const rows = [...(data?.payments ?? [])].sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'));

  const columns: TableColumn<AdminPremiumPayment>[] = [
    { key: 'buyer', header: 'Buyer', render: p => (<div className="max-w-[200px]"><p className="font-semibold truncate">{p.buyerName}</p><p className="text-[12px] text-slate truncate">{p.buyerEmail}</p></div>) },
    { key: 'plan', header: 'Plan', render: p => <span className="whitespace-nowrap">{p.planName} <span className="text-slate">· {p.interval}</span></span> },
    { key: 'amount', header: 'Amount', render: p => <span className="whitespace-nowrap">{money(p.amountUSD)}{p.amountPKR ? <span className="text-slate"> · PKR {p.amountPKR.toLocaleString()}</span> : null}</span> },
    { key: 'ref', header: 'Reference', render: p => <span className="font-mono max-w-[150px] truncate block">{p.transactionReference || '—'}</span> },
    { key: 'createdAt', header: 'Submitted', render: p => <span className="whitespace-nowrap">{fmtDateTime(p.createdAt)}</span> },
    { key: 'status', header: 'Status', render: p => <Badge color={STATUS_META[p.status].color} dot>{STATUS_META[p.status].label}</Badge> },
    { key: 'actions', header: '', align: 'right', render: p => <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setViewing(p); }}>{p.status === 'pending' ? 'Review' : 'View'}</Button> },
  ];

  return (
    <div className="bg-white border border-bone rounded-xl overflow-hidden">
      <div className="px-5 py-[14px] border-b border-bone flex items-center gap-[10px] flex-wrap">
        <FilterDropdown options={STATUS_OPTIONS} value={status} onChange={v => { setStatus(v); setPage(1); }} placeholder="All statuses" />
      </div>
      {error ? (
        <div className="px-4 py-6 text-center"><p className="text-[13px] text-error mb-2">{error}</p><Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button></div>
      ) : (
        <Table columns={columns} data={rows} keyExtractor={p => p._id} loading={loading} onRowClick={setViewing}
          pagination={{ page, total: data?.total ?? 0, perPage: PAGE_SIZE, onChange: setPage, label: 'payments' }}
          emptyState={{ icon: <Landmark size={28} className="text-slate" />, title: status === 'pending' ? 'No payments waiting for review' : 'No Premium payments found', description: 'Bank-transfer proofs for Premium show up here.' }} />
      )}
      {viewing && <ReviewModal payment={viewing} onClose={() => setViewing(null)} onDone={() => { setViewing(null); refetch(); }} />}
    </div>
  );
}
