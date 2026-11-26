import { useCallback, useEffect, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button, Modal, Input, Select, SkeletonBox, StatusBadge, ConfirmActionModal } from '@/components/comman/ui';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { useToast } from '@/contexts/ToastContext';
import { useBusyAction } from '@/hooks/useBusyAction';
import { getActAsSession } from '@/utils/authCookie';
import {
  apiListTeam, apiInviteMember, apiUpdateMember, apiSuspendMember, apiResumeMember, apiRemoveMember, apiResendInvite, apiTeamActivity,
  type TeamList, type TeamMember, type TeamActivityItem,
} from '@/api/services/storeTeam';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const msg = (e: any, fallback: string) => e?.response?.data?.message ?? e?.message ?? fallback;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function MemberModal({ storeId, data, editing, onClose, onSaved }: { storeId: string; data: TeamList; editing: TeamMember | null; onClose: () => void; onSaved: (note?: string) => void }) {
  const [email, setEmail] = useState(editing?.email ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [roleKey, setRoleKey] = useState(editing?.roleKey ?? 'manager');
  const [picked, setPicked] = useState<Set<string>>(() => new Set(editing?.permissions ?? data.roles.find(r => r.key === 'manager')?.permissions ?? []));
  const [end, setEnd] = useState(editing?.accessExpiresAt ? editing.accessExpiresAt.slice(0, 10) : '');
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState('');
  const { run, busy } = useBusyAction();
  const role = data.roles.find(r => r.key === roleKey);

  const pickRole = (key: string) => { setRoleKey(key); setPicked(new Set(data.roles.find(r => r.key === key)?.permissions ?? [])); };
  const toggle = (k: string) => setPicked(p => { const n = new Set(p); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  const emailError = !editing && !EMAIL_RE.test(email.trim()) ? 'Enter a valid e-mail address' : '';
  const endError = end && end < tomorrow ? 'Pick a date in the future' : '';

  async function submit() {
    setTouched(true); setServerError('');
    if (emailError || endError) return;
    const base = role?.permissions ?? [];
    const permissionsAdd = [...picked].filter(k => !base.includes(k));
    const permissionsRemove = base.filter(k => !picked.has(k));
    await run(async () => {
      try {
        const accessExpiresAt = end ? new Date(`${end}T23:59:59`).toISOString() : null;
        if (editing) { await apiUpdateMember(storeId, editing.id, { name, roleKey, permissionsAdd, permissionsRemove, accessExpiresAt }); onSaved(); }
        else {
          const r = await apiInviteMember(storeId, { email: email.trim(), name: name.trim() || undefined, roleKey, permissionsAdd, permissionsRemove, accessExpiresAt });
          onSaved(r.emailSent ? `Invitation sent to ${email.trim()}.` : 'Invitation created, but the e-mail could not be sent. Use Resend or ask them to check later.');
        }
      } catch (e) { setServerError(msg(e, 'Could not save. Try again.')); }
    });
  }

  return (
    <Modal mobileSheet title={editing ? 'Change access' : 'Invite a team member'} onClose={onClose} width={520}
      footer={<><Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button><Button variant="primary" onClick={submit} loading={busy}>{editing ? 'Save' : 'Send invitation'}</Button></>}>
      <div className="flex flex-col gap-4">
        {!editing && <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={120} error={touched ? emailError : ''} />}
        <Input label="Name (optional)" value={name} onChange={e => setName(e.target.value)} maxLength={80} />
        <div>
          <Select label="Role" value={roleKey} onChange={e => pickRole(e.target.value)}>
            {data.roles.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
          </Select>
          {role && <p className="mt-1 text-[12px] text-slate">{role.description}</p>}
        </div>
        <fieldset className="border border-bone rounded-lg px-3 py-2.5">
          <legend className="px-1 text-[12px] font-medium text-charcoal">What they can change</legend>
          <div className="flex flex-col gap-1.5">
            {data.permissions.map(p => (
              <label key={p.key} className="flex items-start gap-2 text-[12.5px] text-charcoal min-h-[28px]">
                <input type="checkbox" className="mt-[3px]" checked={picked.has(p.key)} onChange={() => toggle(p.key)} />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-slate">Earnings, payouts, plan and billing, team and account settings always stay with you.</p>
        </fieldset>
        <Input label="Access ends on (optional)" type="date" min={tomorrow} value={end} onChange={e => setEnd(e.target.value)} error={touched ? endError : ''} />
        {serverError && <div role="alert" className="bg-error-bg border border-error-border rounded-lg px-3 py-2 text-[12.5px] text-error">{serverError}</div>}
      </div>
    </Modal>
  );
}

type Confirm = { kind: 'remove' | 'suspend'; m: TeamMember } | null;

export function StoreTeamTab() {
  const { storeId } = useStoreWorkspace();
  const toast = useToast();
  const [data, setData] = useState<TeamList | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<TeamActivityItem[] | null>(null);
  const [activityError, setActivityError] = useState(false);
  const [modal, setModal] = useState<{ editing: TeamMember | null } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const { run, busy, error: confirmError, setError: setConfirmError } = useBusyAction();

  const load = useCallback(async () => {
    if (!storeId) return;
    setError('');
    try { setData(await apiListTeam(storeId)); } catch (e) { setError(msg(e, 'Could not load your team.')); } finally { setLoading(false); }
    setActivityError(false);
    apiTeamActivity(storeId).then(setActivity).catch(() => setActivityError(true));
  }, [storeId]);
  useEffect(() => { void load(); }, [load]);

  // The server refuses team changes from a member or admin session; say so instead of showing buttons that fail.
  if (getActAsSession()) {
    return <div className="rounded-xl border border-bone bg-white p-6 text-[13px] text-slate">Team access can only be managed by the store owner.</div>;
  }

  async function act(id: string, fn: () => Promise<unknown>, ok: string) {
    setRowBusy(id);
    try { await fn(); toast.success(ok); await load(); } catch (e) { toast.error(msg(e, 'Something went wrong. Try again.')); } finally { setRowBusy(null); }
  }

  const live = data?.members.length ?? 0;
  const full = !!data && live >= data.max;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-[20px] text-carbon font-normal">Team access</h2>
          <p className="text-[12.5px] text-slate">Give other people access to this store. They sign in with their own Edudeen account and never see your password.</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} disabled={!data || full} onClick={() => setModal({ editing: null })}>
          Invite member{data ? ` (${live}/${data.max})` : ''}
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3"><SkeletonBox height={64} /><SkeletonBox height={64} /></div>
      ) : error ? (
        <AnalyticsErrorState message={error} onRetry={load} />
      ) : data && data.members.length === 0 ? (
        <div className="rounded-xl border border-bone bg-white px-6 py-10 text-center">
          <Users size={28} className="mx-auto text-slate/60" aria-hidden="true" />
          <p className="mt-3 text-[14px] font-semibold text-carbon">No team members yet</p>
          <p className="mt-1 text-[12.5px] text-slate">Invite a manager, product editor, order handler or support person.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {data!.members.map(m => (
            <li key={m.id} className="rounded-xl border border-bone bg-white px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1 basis-[200px]">
                <p className="text-[13.5px] font-semibold text-carbon truncate">{m.name || m.email}</p>
                {m.name && <p className="text-[12px] text-slate truncate">{m.email}</p>}
                <p className="text-[12px] text-slate mt-0.5">
                  {m.roleName}{m.status === 'invited' && m.inviteExpiresAt ? ` · invite valid until ${day(m.inviteExpiresAt)}` : ''}{m.accessExpiresAt ? ` · access ends ${day(m.accessExpiresAt)}` : ''}
                </p>
              </div>
              <StatusBadge status={m.status === 'invited' ? 'pending' : m.status} size="sm" />
              <div className="flex flex-wrap items-center gap-1.5">
                {m.status !== 'invited' && <Button variant="ghost" size="xs" onClick={() => setModal({ editing: m })} disabled={rowBusy === m.id}>Change access</Button>}
                {m.status === 'invited' && <Button variant="ghost" size="xs" loading={rowBusy === m.id} onClick={() => act(m.id, async () => { const r = await apiResendInvite(storeId!, m.id); if (!r.emailSent) throw new Error('The e-mail could not be sent.'); }, 'Invitation sent again.')}>Resend</Button>}
                {m.status === 'active' && <Button variant="outline" size="xs" onClick={() => { setConfirmError(''); setConfirm({ kind: 'suspend', m }); }} disabled={rowBusy === m.id}>Suspend</Button>}
                {m.status === 'suspended' && <Button variant="outline" size="xs" loading={rowBusy === m.id} onClick={() => act(m.id, () => apiResumeMember(storeId!, m.id), 'Access restored.')}>Resume</Button>}
                <Button variant="outline" size="xs" onClick={() => { setConfirmError(''); setConfirm({ kind: 'remove', m }); }} disabled={rowBusy === m.id}>Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="team-activity">
        <h3 id="team-activity" className="font-serif text-[17px] text-carbon font-normal mb-2">Team activity</h3>
        {activityError ? <p className="text-[12.5px] text-slate">Could not load activity. <button type="button" className="underline" onClick={load}>Retry</button></p>
          : activity === null ? <SkeletonBox height={48} />
          : activity.length === 0 ? <p className="text-[12.5px] text-slate">Nothing yet. Changes your team makes appear here.</p>
          : (
            <ul className="rounded-xl border border-bone bg-white divide-y divide-bone">
              {activity.map(a => (
                <li key={a._id} className="px-4 py-2.5 text-[12.5px] text-charcoal flex flex-wrap justify-between gap-x-4">
                  <span className="min-w-0 break-words">{a.description || a.action}</span>
                  <span className="text-slate whitespace-nowrap">{new Date(a.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              ))}
            </ul>
          )}
      </section>

      {modal && data && storeId && (
        <MemberModal storeId={storeId} data={data} editing={modal.editing} onClose={() => setModal(null)} onSaved={note => { setModal(null); if (note) toast.success(note); void load(); }} />
      )}

      {confirm && storeId && (
        <ConfirmActionModal
          title={confirm.kind === 'remove' ? 'Remove from team?' : 'Suspend access?'}
          message={confirm.kind === 'remove' ? 'They lose access to this store right away. You can invite them again later.' : 'They are signed out of this store within about 30 seconds. You can resume access any time.'}
          details={[{ label: 'Person', value: confirm.m.name || confirm.m.email }, { label: 'Role', value: confirm.m.roleName }]}
          confirmLabel={confirm.kind === 'remove' ? 'Remove' : 'Suspend'}
          danger busy={busy} error={confirmError}
          onClose={() => setConfirm(null)}
          onConfirm={() => run(async () => {
            await (confirm.kind === 'remove' ? apiRemoveMember(storeId, confirm.m.id) : apiSuspendMember(storeId, confirm.m.id));
            toast.success(confirm.kind === 'remove' ? 'Removed from the team.' : 'Access suspended.');
            setConfirm(null); await load();
          })}
        />
      )}
    </div>
  );
}
