import { useEffect, useState } from 'react';
import { Users, UserPlus, Ban } from 'lucide-react';
import { Badge, Button, FilterDropdown, Input, Modal, SearchInput, Select, Table, Textarea, type TableColumn } from '@/components/comman/ui';
import {
  apiAdminPremiumMembers, apiAdminPremiumPlans, apiAdminGrantPremium, apiAdminRevokePremium,
  type AdminPremiumMember,
} from '@/api/services/adminPremium';
import { useLoad, fmtDate } from './useLoad';

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' }, { value: 'expiring', label: 'Expiring in 3 days' }, { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' }, { value: 'pending', label: 'Pending' },
];
const SOURCE_OPTIONS = [
  { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'admin_grant', label: 'Admin grant' }, { value: 'stripe', label: 'Card' },
];
const SOURCE_LABEL: Record<string, string> = { bank_transfer: 'Bank transfer', admin_grant: 'Admin grant', stripe: 'Card' };

function statusBadge(m: AdminPremiumMember) {
  if (m.isLive) return <Badge color="green" dot>Active</Badge>;
  if (m.status === 'active') return <Badge color="gray" dot>Expired</Badge>;
  if (m.status === 'cancelled') return <Badge color="red" dot>Cancelled</Badge>;
  if (m.status === 'pending') return <Badge color="yellow" dot>Pending</Badge>;
  return <Badge color="gray" dot>{m.status.charAt(0).toUpperCase() + m.status.slice(1)}</Badge>;
}

function GrantModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { data: plans, loading, error: plansError } = useLoad(() => apiAdminPremiumPlans().then(r => r.data.filter(p => p.isActive)), []);
  const [who, setWho] = useState('');
  const [planId, setPlanId] = useState('');
  const [days, setDays] = useState('30');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => { if (plans?.length && !planId) setPlanId(plans[0]._id); }, [plans, planId]);

  const isId = /^[a-f0-9]{24}$/i.test(who.trim());
  const d = Number(days);
  const errors = {
    who: who.trim().length < 3 || (!isId && !who.includes('@')) ? 'Enter the buyer\'s email address or user id.' : '',
    plan: planId ? '' : 'Choose a plan.',
    days: Number.isInteger(d) && d >= 1 && d <= 3650 ? '' : 'Whole number of days from 1 to 3650.',
  };

  async function submit() {
    setTouched(true);
    if (errors.who || errors.plan || errors.days) return;
    setSaving(true); setError('');
    try {
      await apiAdminGrantPremium({ ...(isId ? { userId: who.trim() } : { email: who.trim() }), planId, days: d });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not grant Premium.');
    } finally { setSaving(false); }
  }

  return (
    <Modal mobileSheet title="Grant Premium" width={480} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} disabled={loading} onClick={submit}>Grant</Button></>}>
      <div className="flex flex-col gap-3">
        <Input label="Buyer email or user id" value={who} onChange={e => setWho(e.target.value)} error={touched ? errors.who : undefined} placeholder="buyer@example.com" />
        <Select label="Plan" value={planId} onChange={e => setPlanId(e.target.value)} error={touched ? errors.plan : undefined}>
          {loading && <option value="">Loading plans…</option>}
          {(plans ?? []).map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </Select>
        <Input label="Duration (days)" type="number" min={1} max={3650} value={days} onChange={e => setDays(e.target.value)} error={touched ? errors.days : undefined} />
        <p className="text-[12px] text-slate">Free of charge. If the buyer is already a member, the time is added on top.</p>
        {plansError && <p role="alert" className="text-[12px] text-error">{plansError}</p>}
        {!loading && plans && plans.length === 0 && <p className="text-[12px] text-error">Create an active plan first.</p>}
        {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

function RevokeModal({ member, onClose, onDone }: { member: AdminPremiumMember; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setSaving(true); setError('');
    try { await apiAdminRevokePremium(member.userId, reason.trim()); onDone(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not revoke Premium.'); }
    finally { setSaving(false); }
  }

  return (
    <Modal mobileSheet title="Revoke Premium" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" loading={saving} onClick={submit}>Revoke now</Button></>}>
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-charcoal leading-[1.6]">End Premium for <strong>{member.userName || member.userEmail}</strong> immediately? They are notified.</p>
        <Textarea label="Reason (sent to the buyer, optional)" rows={2} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
        {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

export function PremiumMembersTab({ initialStatus }: { initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [source, setSource] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState<AdminPremiumMember | null>(null);

  useEffect(() => { const t = setTimeout(() => { setDebouncedQ(q.trim()); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);

  const { data, loading, error, refetch } = useLoad(
    () => apiAdminPremiumMembers({ status: status || undefined, source: source || undefined, q: debouncedQ || undefined, page, limit: PAGE_SIZE }).then(r => r.data),
    [status, source, debouncedQ, page],
  );
  const members = data?.members ?? [];

  const columns: TableColumn<AdminPremiumMember>[] = [
    { key: 'member', header: 'Member', render: m => (<div className="max-w-[220px]"><p className="font-semibold truncate">{m.userName || '—'}</p><p className="text-[12px] text-slate truncate">{m.userEmail || m.userId}</p></div>) },
    { key: 'plan', header: 'Plan', render: m => <span className="whitespace-nowrap">{m.planName || '—'} <span className="text-slate">· {m.interval}</span></span> },
    { key: 'source', header: 'Source', render: m => <span className="text-graphite whitespace-nowrap">{SOURCE_LABEL[m.source] ?? m.source}</span> },
    { key: 'end', header: 'Valid until', render: m => <span className="whitespace-nowrap">{fmtDate(m.currentPeriodEnd)}{m.cancelAtPeriodEnd && m.isLive ? <span className="text-slate"> (won't renew)</span> : null}</span> },
    { key: 'status', header: 'Status', render: m => statusBadge(m) },
    { key: 'actions', header: '', align: 'right', render: m => m.isLive ? (
      <Button variant="ghost" size="sm" icon={<Ban size={13} />} onClick={e => { e.stopPropagation(); setRevoking(m); }}>Revoke</Button>
    ) : null },
  ];

  return (
    <div className="bg-white border border-bone rounded-xl overflow-hidden">
      <div className="px-5 py-[14px] border-b border-bone flex items-center gap-[10px] flex-wrap">
        <SearchInput value={q} onChange={setQ} placeholder="Search name or email" className="w-full sm:w-[240px]" />
        <FilterDropdown options={STATUS_OPTIONS} value={status} onChange={v => { setStatus(v); setPage(1); }} placeholder="All statuses" />
        <FilterDropdown options={SOURCE_OPTIONS} value={source} onChange={v => { setSource(v); setPage(1); }} placeholder="All sources" />
        <div className="ms-auto"><Button size="sm" icon={<UserPlus size={14} />} onClick={() => setGranting(true)}>Grant Premium</Button></div>
      </div>
      {error ? (
        <div className="px-4 py-6 text-center"><p className="text-[13px] text-error mb-2">{error}</p><Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button></div>
      ) : (
        <Table columns={columns} data={members} keyExtractor={m => m._id} loading={loading}
          pagination={{ page, total: data?.total ?? 0, perPage: PAGE_SIZE, onChange: setPage, label: 'members' }}
          emptyState={{ icon: <Users size={28} className="text-slate" />, title: 'No members found', description: 'Try a different filter, or grant Premium to a buyer.' }} />
      )}
      {granting && <GrantModal onClose={() => setGranting(false)} onDone={() => { setGranting(false); refetch(); }} />}
      {revoking && <RevokeModal member={revoking} onClose={() => setRevoking(null)} onDone={() => { setRevoking(null); refetch(); }} />}
    </div>
  );
}
