import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Check, X, Landmark, Loader2, ExternalLink } from 'lucide-react';
import { Button, Input, Modal, Textarea } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import {
  apiGetStorePaymentSettings, apiSaveStorePaymentSettings, apiGetSellerTransferProofs, apiGetSellerProofUrl,
  apiSellerApproveTransfer, apiSellerRejectTransfer,
  type StorePaymentSettings, type AdminManualPaymentProof,
} from '@/api/services/manualPayment';

const EMPTY: StorePaymentSettings = { bankName: null, accountTitle: null, accountNumber: null, iban: null, jazzcashNumber: null, easypaisaNumber: null, instructions: null };

/**
 * Sale money goes straight to the seller: buyers see THESE details at checkout,
 * pay them directly, and the seller confirms here once the money has arrived.
 * Edudeen never holds it, so nothing is paid out or charged commission on it.
 */
export function DirectPaymentsPanel({ storeId }: { storeId: string }) {
  const toast = useToast();
  const [form, setForm] = useState<StorePaymentSettings>(EMPTY);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [proofs, setProofs] = useState<AdminManualPaymentProof[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminManualPaymentProof | null>(null);
  const [reason, setReason] = useState('');

  const loadProofs = useCallback(() => {
    apiGetSellerTransferProofs(storeId, 'pending').then(r => setProofs(r.data.proofs ?? [])).catch(() => {});
  }, [storeId]);

  useEffect(() => {
    apiGetStorePaymentSettings(storeId)
      .then(r => { setForm({ ...EMPTY, ...(r.data.directPayment ?? {}) }); setEnabled(r.data.enabled); })
      .catch(() => {})
      .finally(() => setLoading(false));
    loadProofs();
  }, [storeId, loadProofs]);

  const set = (k: keyof StorePaymentSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await apiSaveStorePaymentSettings(storeId, form);
      setEnabled(r.data.enabled);
      toast.success(r.data.enabled ? 'Buyers can now pay you by bank transfer' : 'Add at least one account number to accept bank transfers');
      setOpen(false);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setSaving(false); }
  };

  const viewProof = async (p: AdminManualPaymentProof) => {
    try { const r = await apiGetSellerProofUrl(storeId, p._id); if (r.data.url) window.open(r.data.url, '_blank', 'noopener'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not open the proof.'); }
  };
  const approve = async (p: AdminManualPaymentProof) => {
    if (!window.confirm(`Confirm you received PKR ${p.amountPKR.toLocaleString()} in your account?`)) return;
    setBusy(p._id);
    try { await apiSellerApproveTransfer(storeId, p._id); toast.success('Payment confirmed — the order is now confirmed'); loadProofs(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not confirm.'); }
    finally { setBusy(null); }
  };
  const reject = async () => {
    if (!rejecting || !reason.trim()) return;
    setBusy(rejecting._id);
    try { await apiSellerRejectTransfer(storeId, rejecting._id, reason.trim()); toast.success('Buyer asked to re-upload'); setRejecting(null); setReason(''); loadProofs(); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not reject.'); }
    finally { setBusy(null); }
  };

  return (
    <section className="mx-4 md:mx-8 mt-4 bg-white border border-bone rounded-xl">
      <div className="px-4 md:px-5 py-3 flex items-center gap-3 flex-wrap">
        <Landmark size={16} className="text-brand-royal" />
        <div className="flex-1 min-w-[200px]">
          <p className="text-[14px] font-bold text-carbon m-0">Bank transfer — paid straight to you</p>
          <p className="text-[12px] text-slate m-0">
            {loading ? 'Loading…' : enabled ? 'On. Buyers send money to your own account and you confirm it below.' : 'Off. Add your account so buyers can pay you directly.'}
          </p>
        </div>
        <Button size="sm" variant={enabled ? 'outline' : 'primary'} onClick={() => setOpen(true)}>{enabled ? 'Edit account' : 'Set up'}</Button>
      </div>

      {proofs.length > 0 && (
        <ul className="list-none m-0 p-0 border-t border-bone divide-y divide-bone">
          {proofs.map(p => (
            <li key={p._id} className="px-4 md:px-5 py-3 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="text-[13px] font-semibold text-carbon m-0">PKR {p.amountPKR.toLocaleString()} from {p.buyerName}</p>
                <p className="text-[11.5px] text-slate m-0">
                  {p.senderName ? `Sender: ${p.senderName} · ` : ''}{p.transactionReference ? `Ref: ${p.transactionReference} · ` : ''}{new Date(p.createdAt).toLocaleString()}
                </p>
                {p.receiptCheck && p.receiptCheck.status !== 'skipped' && (
                  <p className={clsx('text-[11.5px] font-semibold m-0 mt-0.5', p.receiptCheck.status === 'match' ? 'text-success' : 'text-error')}>
                    {p.receiptCheck.status === 'match' ? '✓ ' : '⚠ '}{p.receiptCheck.note}
                  </p>
                )}
              </div>
              <Button size="xs" variant="ghost" icon={<ExternalLink size={12} />} onClick={() => viewProof(p)}>Receipt</Button>
              <Button size="xs" variant="primary" loading={busy === p._id} onClick={() => approve(p)}><Check size={12} /> Received</Button>
              <Button size="xs" variant="ghost" disabled={busy === p._id} onClick={() => setRejecting(p)}><X size={12} /> Not received</Button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Modal mobileSheet title="Where buyers pay you" onClose={() => setOpen(false)} footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving}>Save</Button>
        </>}>
          <div className="px-5 py-4 flex flex-col gap-3">
            <Input label="Bank name" value={form.bankName ?? ''} onChange={set('bankName')} />
            <Input label="Account title" value={form.accountTitle ?? ''} onChange={set('accountTitle')} />
            <Input label="Account number" value={form.accountNumber ?? ''} onChange={set('accountNumber')} />
            <Input label="IBAN" value={form.iban ?? ''} onChange={set('iban')} />
            <Input label="JazzCash number" value={form.jazzcashNumber ?? ''} onChange={set('jazzcashNumber')} />
            <Input label="Easypaisa number" value={form.easypaisaNumber ?? ''} onChange={set('easypaisaNumber')} />
            <Textarea label="Note for buyers (optional)" rows={2} maxLength={500} value={form.instructions ?? ''} onChange={set('instructions')} />
            <p className="text-[11.5px] text-slate m-0">Buyers see these details at checkout. Money goes directly to you — Edudeen never holds it.</p>
          </div>
        </Modal>
      )}

      {rejecting && (
        <Modal mobileSheet title="Payment not received" onClose={() => setRejecting(null)} footer={<>
          <Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="danger" onClick={reject} disabled={!reason.trim()} loading={busy === rejecting._id}>Send to buyer</Button>
        </>}>
          <div className="px-5 py-4"><Textarea label="Why? (the buyer sees this)" rows={3} maxLength={300} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Amount didn't arrive, or the receipt is unclear" /></div>
        </Modal>
      )}
      {loading && <Loader2 size={14} className="animate-spin m-3 text-slate" />}
    </section>
  );
}
