import { useState, useEffect, useCallback } from 'react';
import { Landmark, RefreshCcw, AlertCircle, UploadCloud } from 'lucide-react';
import { clsx } from 'clsx';
import {
  apiGetMyManualPayments, apiReuploadManualPayment,
  type ManualPaymentProof, type ManualPaymentProofStatus,
} from '@/api/services/manualPayment';
import { Card, EmptyState, SkeletonBox, PageHeader, Modal, Button, StatusBadge } from '@/components/comman/ui';

const STATUS_LABEL: Record<ManualPaymentProofStatus, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// ── Re-upload modal — only reachable for a rejected proof ─────────────────────
function ReuploadModal({ proof, onClose, onDone }: { proof: ManualPaymentProof; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [transactionReference, setTransactionReference] = useState(proof.transactionReference ?? '');
  const [senderName, setSenderName] = useState(proof.senderName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!file) { setError('Please choose a new screenshot or receipt photo.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await apiReuploadManualPayment(proof._id, file, {
        transactionReference: transactionReference || undefined,
        senderName: senderName || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-upload proof.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Re-upload Payment Proof"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={submitting} onClick={submit}>Submit</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {proof.rejectionReason && (
          <p className="text-[12px] text-error bg-error-bg rounded-md px-3 py-2">
            Previously rejected: {proof.rejectionReason}
          </p>
        )}
        <label className="flex items-center gap-2 border border-dashed border-bone rounded-[8px] px-3 py-3 cursor-pointer hover:border-brand-orange/50 transition-colors">
          <UploadCloud size={16} className="text-slate flex-shrink-0" />
          <span className="text-[12px] text-slate truncate">{file ? file.name : 'Choose a new image…'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Transaction reference (optional)</label>
          <input value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} placeholder="TXN123456789"
            className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-charcoal mb-1.5">Sender name (optional)</label>
          <input value={senderName} onChange={(e) => setSenderName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-bone text-[13px] outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10" />
        </div>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function Payments() {
  const [proofs, setProofs] = useState<ManualPaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reuploading, setReuploading] = useState<ManualPaymentProof | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    return apiGetMyManualPayments()
      .then(res => setProofs(res.data ?? []))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load your bank transfer payments.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  if (loading) {
    return (
      <Card padding="none">
        <div className="hidden lg:block px-5 pt-5 pb-4 border-b border-bone">
          <PageHeader eyebrow="Account" title="Bank Transfer Payments" />
        </div>
        <div className="divide-y divide-[#f5f4ef]">
          {[1, 2].map(i => (
            <div key={i} className="px-5 py-[18px]"><SkeletonBox width="100%" height={60} rounded="10px" /></div>
          ))}
        </div>
      </Card>
    );
  }

  if (!loading && proofs.length === 0) {
    return (
      <Card padding="none">
        <div className="hidden lg:block px-5 pt-5 pb-4 border-b border-bone">
          <PageHeader eyebrow="Account" title="Bank Transfer Payments" />
        </div>
        <EmptyState
          icon={<Landmark size={28} className="text-brand-orange opacity-55" />}
          title="No bank transfer payments yet"
          description="If you pay by bank transfer at checkout, your submitted proofs and their verification status show up here."
          className="py-12"
        />
      </Card>
    );
  }

  return (
    <div>
      <Card padding="none">
        <div className="hidden lg:block px-5 pt-5 pb-4 border-b border-bone">
          <PageHeader eyebrow="Account" title="Bank Transfer Payments" description={`${proofs.length} submission${proofs.length !== 1 ? 's' : ''}`} />
        </div>
        {error && <p className="px-5 py-3 text-[12px] text-error">{error}</p>}
        <div className="divide-y divide-[#f5f4ef]">
          {proofs.map(p => (
            <div key={p._id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-[16px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[14px] text-carbon">PKR {p.amountPKR.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <StatusBadge status={STATUS_LABEL[p.status]} />
                </div>
                <p className="text-[12px] text-slate">Submitted {formatDate(p.createdAt)} · {p.orderIds.length} order{p.orderIds.length !== 1 ? 's' : ''}</p>
                {p.status === 'rejected' && p.rejectionReason && (
                  <p className={clsx('flex items-start gap-1 text-[12px] text-error mt-1.5')}>
                    <AlertCircle size={12} className="mt-[1px] flex-shrink-0" /> {p.rejectionReason}
                  </p>
                )}
              </div>
              {p.status === 'rejected' && (
                <Button variant="outline" size="sm" icon={<RefreshCcw size={13} />} onClick={() => setReuploading(p)} className="self-start sm:self-center shrink-0">
                  Re-upload Proof
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {reuploading && (
        <ReuploadModal
          proof={reuploading}
          onClose={() => setReuploading(null)}
          onDone={() => { setReuploading(null); refetch(); }}
        />
      )}
    </div>
  );
}
