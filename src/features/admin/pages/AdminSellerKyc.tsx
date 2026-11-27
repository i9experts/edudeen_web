import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Inbox, RefreshCw, ShieldCheck } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AdminPageHeader } from '@/components/comman/ui/AdminPageHeader';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Textarea } from '@/components/comman/ui/Input';
import { SearchInput } from '@/components/comman/ui/SearchInput';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { useToast } from '@/contexts/ToastContext';
import { useBusyAction } from '@/hooks/useBusyAction';
import {
  apiAdminDecideKyc, apiAdminGetKyc, apiAdminListKyc, KYC_DOC_LABEL, kycIdTypeLabel,
  type AdminKycDetail, type AdminKycRow, type KycStatus,
} from '@/api/services/kyc';

const FILTERS: { key: KycStatus; label: string }[] = [
  { key: 'pending', label: 'To review' }, { key: 'approved', label: 'Approved' }, { key: 'rejected', label: 'Rejected' },
];
const STATUS_STYLE: Record<KycStatus, string> = {
  not_started: 'bg-cream text-slate', pending: 'bg-warning-bg text-warning',
  approved: 'bg-success-bg text-success', rejected: 'bg-error-bg text-error',
};
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return <div><dt className="text-slate text-[12px]">{k}</dt><dd className="m-0 text-carbon font-medium break-words">{v || '—'}</dd></div>;
}

function ReviewModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: (msg: string) => void }) {
  const [d, setD] = useState<AdminKycDetail | null>(null);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState<'reject' | 'revoke' | null>(null);
  const [reason, setReason] = useState('');
  const act = useBusyAction();

  useEffect(() => {
    apiAdminGetKyc(id).then(r => setD(r.data)).catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Could not load.'));
  }, [id]);

  const decide = async (decision: 'approve' | 'reject' | 'revoke') => {
    const r = await act.run(() => apiAdminDecideKyc(id, decision, decision === 'approve' ? undefined : reason.trim()));
    if (r) onDone(decision === 'approve' ? 'Seller verified. Payouts are unlocked.' : decision === 'revoke' ? 'Verification revoked. Payouts are on hold.' : 'Sent back to the seller with your reason.');
  };
  const tooShort = reason.trim().length < 10;

  const footer = d && (
    mode ? (
      <>
        <Button variant="outline" size="sm" onClick={() => setMode(null)} disabled={act.busy}>Back</Button>
        <Button variant="danger" size="sm" onClick={() => decide(mode)} disabled={act.busy || tooShort}>{mode === 'revoke' ? 'Revoke' : 'Reject'}</Button>
      </>
    ) : d.status === 'pending' ? (
      <>
        <Button variant="outline" size="sm" onClick={() => setMode('reject')} disabled={act.busy}>Reject</Button>
        <Button size="sm" icon={<ShieldCheck size={13} />} onClick={() => decide('approve')} disabled={act.busy}>{act.busy ? 'Saving…' : 'Approve'}</Button>
      </>
    ) : d.status === 'approved' ? (
      <Button variant="outline" size="sm" onClick={() => setMode('revoke')}>Revoke verification</Button>
    ) : undefined
  );

  return (
    <Modal title="Seller verification" onClose={onClose} width={720} footer={footer || undefined}>
      {err ? <p role="alert" className="m-0 text-[13px] text-error">{err}</p> : !d ? (
        <div className="flex flex-col gap-3" aria-busy="true"><SkeletonBox height={60} /><SkeletonBox height={160} /></div>
      ) : mode ? (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[13px] text-graphite">
            {mode === 'revoke'
              ? 'Revoking removes the Verified badge and puts payouts on hold. The seller can submit again.'
              : 'The seller sees this reason and can fix their details and submit again.'}
          </p>
          <Textarea label="Reason for the seller (at least 10 characters)" rows={3} maxLength={500} value={reason} onChange={e => { setReason(e.target.value); act.setError(''); }} />
          {act.error && <p role="alert" className="m-0 text-[12px] text-error">{act.error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-4 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_STYLE[d.status]}`}>{d.status.replace('_', ' ')}</span>
            <span className="text-slate">Submitted {day(d.submittedAt)}</span>
            {d.nameMismatchFlagged && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg text-warning px-2.5 py-0.5 text-[12px] font-semibold"><AlertTriangle size={12} /> Bank name differs from ID name</span>
            )}
          </div>
          {d.rejectionReason && <p className="m-0 text-[12px] text-error">Last reason: {d.rejectionReason}</p>}

          <section>
            <h3 className="m-0 mb-2 text-[13px] font-bold text-carbon">Seller account</h3>
            <dl className="m-0 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2">
              <Row k="Account name" v={d.seller?.name} />
              <Row k="Email" v={d.seller?.email} />
              <Row k="Joined" v={day(d.seller?.joinedAt ?? null)} />
            </dl>
            {d.stores.length > 0 && <p className="m-0 mt-2 text-[12px] text-slate">Stores: {d.stores.map(s => s.name).join(', ')}</p>}
          </section>

          <section>
            <h3 className="m-0 mb-2 text-[13px] font-bold text-carbon">Identity</h3>
            <dl className="m-0 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <Row k="Seller type" v={d.sellerType === 'company' ? 'Company' : 'Individual'} />
              <Row k="Full name (as on ID)" v={d.fullName} />
              <Row k="ID type" v={kycIdTypeLabel(d.idType)} />
              <Row k="ID / passport number" v={d.idNumber} />
              <Row k="National tax number" v={d.taxNumber} />
              {d.sellerType === 'company' && <><Row k="Legal business name" v={d.legalBusinessName} /><Row k="Registration number" v={d.registrationNumber} /></>}
              <Row k="Address" v={[d.address.line, d.address.city, d.address.state, d.address.country].filter(Boolean).join(', ')} />
              <Row k="Bank account holder" v={d.bankAccountHolder} />
              <Row k="Bank" v={d.bankName} />
            </dl>
          </section>

          <section>
            <h3 className="m-0 mb-2 text-[13px] font-bold text-carbon">Documents <span className="font-normal text-slate">(links expire in 10 minutes)</span></h3>
            <ul className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 gap-2">
              {d.documents.map(doc => (
                <li key={doc.type} className="border border-bone rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="flex-1 min-w-0"><span className="block font-medium text-carbon">{KYC_DOC_LABEL[doc.type]}</span><span className="block text-[12px] text-slate truncate">{doc.fileName}</span></span>
                  {doc.viewUrl && <a href={doc.viewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-royal">Open <ExternalLink size={12} /></a>}
                </li>
              ))}
            </ul>
          </section>

          {d.history.length > 0 && (
            <section>
              <h3 className="m-0 mb-2 text-[13px] font-bold text-carbon">History</h3>
              <ul className="m-0 p-0 list-none flex flex-col gap-1 text-[12px] text-graphite">
                {d.history.map((h, i) => <li key={i}>{day(h.at)} · {h.action}{h.note ? ` — ${h.note}` : ''}</li>)}
              </ul>
            </section>
          )}
          {act.error && <p role="alert" className="m-0 text-[12px] text-error">{act.error}</p>}
        </div>
      )}
    </Modal>
  );
}

/** Admin: review seller identity verification (KYC). Payouts are blocked until approved. */
export function AdminSellerKyc() {
  usePageTitle('Seller KYC');
  const toast = useToast();
  const [status, setStatus] = useState<KycStatus>('pending');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<AdminKycRow[] | null>(null);
  const [counts, setCounts] = useState<Partial<Record<KycStatus, number>>>({});
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    setError('');
    apiAdminListKyc({ status, search: search.trim() || undefined })
      .then(r => { setRows(r.data.items); setCounts(r.data.counts); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load verifications.'));
  }, [status, search]);
  useEffect(() => { const t = setTimeout(() => { setRows(null); load(); }, 250); return () => clearTimeout(t); }, [load]);

  return (
    <>
      <AdminPageHeader title="Seller KYC" subtitle="Identity checks. A seller can sell right away, but gets paid only after approval." icon={<ShieldCheck size={18} />} />
      <div className="px-4 sm:px-7 py-5">
        <section className="bg-white border border-bone rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-bone flex flex-wrap items-center gap-2">
            <div className="flex gap-1 flex-wrap">
              {FILTERS.map(f => (
                <button key={f.key} type="button" aria-pressed={status === f.key} onClick={() => setStatus(f.key)}
                  className={`min-h-[36px] px-3 rounded-full text-[12px] font-medium border cursor-pointer ${status === f.key ? 'bg-carbon text-white border-carbon' : 'bg-white text-graphite border-bone'}`}>
                  {f.label}{counts[f.key] ? ` (${counts[f.key]})` : ''}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[200px] max-w-[320px] ms-auto">
              <SearchInput value={search} onChange={setSearch} placeholder="Search name, business or email" />
            </div>
          </div>

          {error ? (
            <div role="alert" className="m-4 flex items-center gap-3 rounded-lg border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
              <span className="flex-1">{error}</span>
              <button type="button" onClick={load} className="inline-flex items-center gap-1 font-semibold underline bg-transparent border-none cursor-pointer text-error"><RefreshCw size={12} /> Retry</button>
            </div>
          ) : rows === null ? (
            <div className="p-4 flex flex-col gap-3" aria-busy="true">{[0, 1, 2].map(i => <SkeletonBox key={i} className="h-12 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-slate flex flex-col items-center gap-2"><Inbox size={22} /> Nothing here.</div>
          ) : (
            <ul className="m-0 p-0 list-none divide-y divide-bone">
              {rows.map(r => (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpen(r.id)} className="w-full text-start px-4 py-3 flex flex-wrap items-center gap-2 bg-transparent border-none cursor-pointer hover:bg-cream">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-carbon truncate">
                        {r.sellerType === 'company' && r.legalBusinessName ? r.legalBusinessName : r.fullName ?? r.sellerName ?? 'Seller'}
                        <span className="font-normal text-slate"> · {r.sellerType === 'company' ? 'Company' : 'Individual'}{r.country ? ` · ${r.country}` : ''}</span>
                      </span>
                      <span className="block text-[12px] text-slate truncate">{r.sellerEmail ?? ''} · submitted {day(r.submittedAt)}</span>
                    </span>
                    {r.nameMismatchFlagged && <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-warning"><AlertTriangle size={12} /> Name mismatch</span>}
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_STYLE[r.status]}`}>{r.status === 'pending' ? 'To review' : r.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {open && <ReviewModal id={open} onClose={() => setOpen(null)} onDone={msg => { toast.success(msg); setOpen(null); load(); }} />}
    </>
  );
}
