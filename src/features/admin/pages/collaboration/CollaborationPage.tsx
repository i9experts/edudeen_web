import { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Plus, Copy, ShieldCheck, ShieldOff, Trash2, KeyRound } from 'lucide-react';
import { Button, Input, Textarea, Modal } from '@/components/comman/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useToast } from '@/contexts/ToastContext';
import { useAdminAccess, loadAdminAccess } from '@/hooks/admin/useAdminAccess';
import {
  apiStaffList, apiStaffRoles, apiStaffPermissions, apiInviteStaff, apiUpdateStaff, apiStaffAction, apiRemoveStaff, apiSaveStaffRole, apiDeleteStaffRole,
  apiStaffUnreadTasks, apiStaffMarkTasksSeen, apiApprovalCount, apiStaffTasks, apiCreateStaffTask, apiUpdateStaffTask, apiCommentStaffTask, apiDeleteStaffTask, apiStaffAudit,
  type StaffMember, type StaffRole, type PermissionDef, type StaffTask, type AuditRow, type InviteResult, type WorkHours,
} from '@/api/services/staff';
import { ApprovalsTab, SecurityTab, NotesTab, RestrictionFields, parseIps } from './CollaborationExtras';

const TABS = ['team', 'roles', 'tasks', 'approvals', 'notes', 'activity', 'security'] as const;
type Tab = (typeof TABS)[number];
const STATUS_TONE: Record<string, string> = { active: 'bg-green-50 text-success', invited: 'bg-amber-50 text-amber-700', suspended: 'bg-red-50 text-error' };
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const err = (e: unknown, fb: string) => (e instanceof Error ? e.message : fb);

/** Permission picker grouped like the catalog; sensitive actions are marked. */
function PermissionPicker({ catalog, value, onChange, disabledKeys = [] }: { catalog: PermissionDef[]; value: string[]; onChange: (v: string[]) => void; disabledKeys?: string[] }) {
  const groups = useMemo(() => [...new Set(catalog.map(p => p.group))].map(g => ({ g, items: catalog.filter(p => p.group === g) })), [catalog]);
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter(x => x !== k) : [...value, k]);
  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ g, items }) => (
        <fieldset key={g} className="border border-bone rounded-lg px-3 py-2 m-0">
          <legend className="text-[11.5px] font-bold uppercase tracking-wider text-slate px-1">{g}</legend>
          {items.map(p => (
            <label key={p.key} className={clsx('flex items-start gap-2 py-1 text-[13px]', disabledKeys.includes(p.key) ? 'opacity-50' : 'cursor-pointer')}>
              <input type="checkbox" className="mt-[3px] accent-brand-orange" checked={value.includes(p.key)} disabled={disabledKeys.includes(p.key)} onChange={() => toggle(p.key)} />
              <span>{p.label}{p.sensitive && <span className="ms-1.5 text-[10.5px] font-bold text-error">SENSITIVE</span>}</span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

// ── Team ──────────────────────────────────────────────────────────────────────
function TeamTab({ isOwner }: { isOwner: boolean }) {
  const toast = useToast();
  const [rows, setRows] = useState<StaffMember[] | null>(null);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [catalog, setCatalog] = useState<PermissionDef[]>([]);
  const [editing, setEditing] = useState<StaffMember | 'new' | null>(null);
  const [invite, setInvite] = useState<{ email: string; token: string; emailSent?: boolean } | null>(null);
  const load = useCallback(() => {
    Promise.all([apiStaffList(), apiStaffRoles(), apiStaffPermissions()]).then(([a, b, c]) => { setRows(a.data); setRoles(b.data); setCatalog(c.data); }).catch(e => { toast.error(err(e, 'Could not load the team.')); setRows([]); });
  }, [toast]);
  useEffect(load, [load]);
  const link = (t: string) => `${window.location.origin}/admin/accept-invite/${t}`;

  const act = async (m: StaffMember, action: 'suspend' | 'reactivate' | 'resend-invite' | 'reset-2fa') => {
    const warn = action === 'suspend' ? `Suspend ${m.name}? They are signed out immediately.` : action === 'reset-2fa' ? `Reset two-step sign-in for ${m.name}? They must set it up again from a new invite link.` : '';
    if (warn && !window.confirm(warn)) return;
    try {
      const r = await apiStaffAction(m._id, action);
      if (r.data.inviteToken) setInvite({ email: m.email, token: r.data.inviteToken, emailSent: r.data.emailSent });
      toast.success('Done'); load(); loadAdminAccess(true);
    } catch (e) { toast.error(err(e, 'Could not do that.')); }
  };
  const remove = async (m: StaffMember) => {
    if (!window.confirm(`Remove ${m.name} permanently? Their open tasks are marked blocked.`)) return;
    try { await apiRemoveStaff(m._id); toast.success('Removed'); load(); } catch (e) { toast.error(err(e, 'Could not remove.')); }
  };

  return (
    <section>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <p className="text-[13px] text-slate m-0">{rows ? `${rows.length} people with admin access` : 'Loading…'}</p>
        {isOwner && <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setEditing('new')}>Invite staff</Button>}
      </div>
      <div className="grid gap-2">
        {(rows ?? []).map(m => (
          <article key={m._id} className="bg-white border border-bone rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <p className="text-[14px] font-bold text-carbon m-0">{m.name} <span className="font-normal text-slate text-[12.5px]">· {m.email}</span></p>
              <p className="text-[12px] text-slate m-0 mt-0.5">
                {m.roleName}{m.accessExpiresAt && ` · access ends ${fmt(m.accessExpiresAt)}`} · last sign-in {fmt(m.lastLoginAt)}
                {((m.allowedIps?.length ?? 0) > 0 || m.workHours) && <span className="ms-1 text-brand-royal" title="This person has IP or working-hours limits"> · limited{(m.allowedIps?.length ?? 0) > 0 ? ` (${m.allowedIps.length} IP)` : '}{m.workHours ? ` (${m.workHours.from}–${m.workHours.to})` : '}</span>}
              </p>
            </div>
            <span className={clsx('rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold capitalize', m.isOwner ? 'bg-brand-pale-orange text-brand-orange' : STATUS_TONE[m.staffStatus])}>{m.isOwner ? 'Owner' : m.staffStatus}</span>
            {!m.isOwner && <span title={m.totpEnabled ? 'Two-step sign-in on' : 'Two-step not set up'} className={m.totpEnabled ? 'text-success' : 'text-amber-600'}>{m.totpEnabled ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}</span>}
            {isOwner && !m.isOwner && (
              <div className="flex gap-1.5 flex-wrap">
                <Button size="xs" variant="outline" onClick={() => setEditing(m)}>Access</Button>
                {m.staffStatus === 'invited' && <Button size="xs" variant="ghost" onClick={() => act(m, 'resend-invite')}>New invite link</Button>}
                {m.staffStatus === 'active' && <Button size="xs" variant="ghost" onClick={() => act(m, 'suspend')}>Suspend</Button>}
                {m.staffStatus === 'suspended' && <Button size="xs" variant="ghost" onClick={() => act(m, 'reactivate')}>Reactivate</Button>}
                <Button size="xs" variant="ghost" icon={<KeyRound size={12} />} onClick={() => act(m, 'reset-2fa')}>Reset 2FA</Button>
                <Button size="xs" variant="ghost" onClick={() => remove(m)} aria-label={`Remove ${m.name}`}><Trash2 size={13} /></Button>
              </div>
            )}
          </article>
        ))}
      </div>
      {editing && <StaffEditor member={editing === 'new' ? null : editing} roles={roles} catalog={catalog} onClose={() => setEditing(null)}
        onSaved={(res) => { setEditing(null); if (res) setInvite({ email: res.staff.email, token: res.inviteToken, emailSent: res.emailSent }); load(); loadAdminAccess(true); }} />}
      {invite && (
        <Modal title="Invitation link" onClose={() => setInvite(null)} footer={<Button variant="primary" onClick={() => setInvite(null)}>Done</Button>}>
          <div className="px-5 py-4 flex flex-col gap-3">
            <p className="text-[13px] text-charcoal m-0">{invite.emailSent ? <>We emailed this invitation to <b>{invite.email}</b>. You can also copy the link below.</> : <>The email could not be sent, so send this link to <b>{invite.email}</b> yourself.</>} It works once and expires in 48 hours. They choose a password and set up two-step sign-in.</p>
            <div className="flex gap-2"><input readOnly value={link(invite.token)} className="flex-1 min-w-0 border border-bone rounded-lg px-3 py-2 text-[12.5px]" onFocus={e => e.currentTarget.select()} />
              <Button size="sm" variant="outline" icon={<Copy size={13} />} onClick={() => { void navigator.clipboard?.writeText(link(invite.token)); toast.success('Link copied'); }}>Copy</Button></div>
            <p className="text-[12px] text-slate m-0">Treat the link like a password — anyone who opens it first can claim the account.</p>
          </div>
        </Modal>
      )}
    </section>
  );
}

function StaffEditor({ member, roles, catalog, onClose, onSaved }: { member: StaffMember | null; roles: StaffRole[]; catalog: PermissionDef[]; onClose: () => void; onSaved: (r?: InviteResult) => void }) {
  const toast = useToast();
  const [email, setEmail] = useState(member?.email ?? '');
  const [name, setName] = useState(member?.name ?? '');
  const [roleId, setRoleId] = useState(member?.staffRoleId ?? roles[0]?._id ?? '');
  const [extra, setExtra] = useState<string[]>(member?.permissionsAdd ?? []);
  const [removed, setRemoved] = useState<string[]>(member?.permissionsRemove ?? []);
  const [expires, setExpires] = useState(member?.accessExpiresAt ? member.accessExpiresAt.slice(0, 10) : '');
  const [ips, setIps] = useState((member?.allowedIps ?? []).join('\n'));
  const [hours, setHours] = useState<WorkHours | null>(member?.workHours ?? null);
  const [busy, setBusy] = useState(false);
  const role = roles.find(r => r._id === roleId);
  const base = role?.permissions ?? [];
  // The picker shows the final result: role rights + extras - removals.
  const effective = [...new Set([...base, ...extra])].filter(k => !removed.includes(k));
  const setEffective = (next: string[]) => {
    setExtra(next.filter(k => !base.includes(k)));
    setRemoved(base.filter(k => !next.includes(k)));
  };
  const save = async () => {
    setBusy(true);
    try {
      const body = { name, roleId, permissionsAdd: extra, permissionsRemove: removed, accessExpiresAt: expires ? new Date(`${expires}T23:59:59`).toISOString() : null, allowedIps: parseIps(ips), workHours: hours };
      if (member) { await apiUpdateStaff(member._id, body); toast.success('Access updated — it applies the next time they sign in'); onSaved(); }
      else { const r = await apiInviteStaff({ ...body, email }); onSaved(r.data); }
    } catch (e) { toast.error(err(e, 'Could not save.')); } finally { setBusy(false); }
  };
  return (
    <Modal title={member ? `Access for ${member.name}` : 'Invite staff'} onClose={onClose} width={560} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save} disabled={!roleId || (!member && !email)}>{member ? 'Save access' : 'Send invite'}</Button></>}>
      <div className="px-5 py-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
        {!member && <Input label="Work email" type="email" value={email} onChange={e => setEmail(e.target.value)} />}
        <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
        <label className="text-[12.5px] font-semibold text-charcoal">Role
          <select className="mt-1 w-full border border-bone rounded-lg px-3 py-2 text-[14px] bg-white" value={roleId} onChange={e => { setRoleId(e.target.value); setExtra([]); setRemoved([]); }}>
            {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
          {role && <span className="block text-[12px] font-normal text-slate mt-1">{role.description}</span>}
        </label>
        <Input label="Access ends on (optional)" type="date" value={expires} onChange={e => setExpires(e.target.value)} />
        <RestrictionFields ips={ips} setIps={setIps} hours={hours} setHours={setHours} />
        <div>
          <p className="text-[12.5px] font-semibold text-charcoal m-0 mb-1">What they can do <span className="font-normal text-slate">— start from the role, then tick or untick for this person</span></p>
          <PermissionPicker catalog={catalog} value={effective} onChange={setEffective} />
        </div>
      </div>
    </Modal>
  );
}

// ── Roles ─────────────────────────────────────────────────────────────────────
function RolesTab({ isOwner }: { isOwner: boolean }) {
  const toast = useToast();
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [catalog, setCatalog] = useState<PermissionDef[]>([]);
  const [editing, setEditing] = useState<StaffRole | 'new' | null>(null);
  const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const [perms, setPerms] = useState<string[]>([]);
  const load = useCallback(() => { Promise.all([apiStaffRoles(), apiStaffPermissions()]).then(([a, b]) => { setRoles(a.data); setCatalog(b.data); }).catch(e => toast.error(err(e, 'Could not load roles.'))); }, [toast]);
  useEffect(load, [load]);
  const open = (r: StaffRole | 'new') => { setEditing(r); setName(r === 'new' ? '' : r.name); setDesc(r === 'new' ? '' : r.description); setPerms(r === 'new' ? [] : r.permissions); };
  const save = async () => {
    try { await apiSaveStaffRole(editing === 'new' || !editing ? null : editing._id, { name, description: desc, permissions: perms }); toast.success('Role saved — people in it get the new rights at their next sign-in'); setEditing(null); load(); }
    catch (e) { toast.error(err(e, 'Could not save the role.')); }
  };
  const del = async (r: StaffRole) => { if (!window.confirm(`Delete the role "${r.name}"?`)) return; try { await apiDeleteStaffRole(r._id); load(); } catch (e) { toast.error(err(e, 'Could not delete.')); } };
  return (
    <section>
      <div className="flex items-center justify-between mb-3"><p className="text-[13px] text-slate m-0">A role is a ready-made set of rights you give to people with the same job.</p>
        {isOwner && <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => open('new')}>New role</Button>}</div>
      <div className="grid gap-2 md:grid-cols-2">
        {roles.map(r => (
          <article key={r._id} className="bg-white border border-bone rounded-xl px-4 py-3">
            <p className="text-[14px] font-bold text-carbon m-0">{r.name} {r.isSystem && <span className="text-[10.5px] font-semibold text-slate ms-1">BUILT-IN</span>}</p>
            <p className="text-[12.5px] text-slate m-0 mt-1">{r.description || '—'}</p>
            <p className="text-[12px] text-slate m-0 mt-1">{r.permissions.length} rights · {r.memberCount} {r.memberCount === 1 ? 'person' : 'people'}</p>
            {isOwner && <div className="flex gap-1.5 mt-2"><Button size="xs" variant="outline" onClick={() => open(r)}>Edit</Button>{!r.isSystem && <Button size="xs" variant="ghost" onClick={() => del(r)}>Delete</Button>}</div>}
          </article>
        ))}
      </div>
      {editing && (
        <Modal title={editing === 'new' ? 'New role' : `Edit ${editing.name}`} onClose={() => setEditing(null)} width={560} footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" onClick={save} disabled={!name.trim()}>Save role</Button></>}>
          <div className="px-5 py-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
            <Input label="Role name" value={name} onChange={e => setName(e.target.value)} />
            <Textarea label="What is this role for?" rows={2} value={desc} onChange={e => setDesc(e.target.value)} />
            <PermissionPicker catalog={catalog} value={perms} onChange={setPerms} />
          </div>
        </Modal>
      )}
    </section>
  );
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
const NEXT: Record<StaffTask['status'], StaffTask['status']> = { todo: 'doing', doing: 'done', blocked: 'doing', done: 'todo' };
const PRIO_TONE: Record<string, string> = { low: 'text-slate', normal: 'text-charcoal', high: 'text-amber-700', urgent: 'text-error' };

function TasksTab({ canAssign }: { canAssign: boolean }) {
  const toast = useToast();
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [tasks, setTasks] = useState<StaffTask[] | null>(null);
  const [people, setPeople] = useState<StaffMember[]>([]);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [f, setF] = useState({ title: '', description: '', assigneeId: '', priority: 'normal', dueAt: '', linkType: 'other', linkId: '' });
  const load = useCallback(() => { apiStaffTasks(scope).then(r => setTasks(r.data)).catch(e => { toast.error(err(e, 'Could not load tasks.')); setTasks([]); }); }, [scope, toast]);
  useEffect(load, [load]);
  useEffect(() => { void apiStaffMarkTasksSeen(); }, []); // opening the board clears the 'new' count
  useEffect(() => { if (canAssign) apiStaffList().then(r => setPeople(r.data.filter(p => p.staffStatus !== 'suspended' && p.staffStatus !== 'invited'))).catch(() => {}); }, [canAssign]);
  const create = async () => {
    try {
      await apiCreateStaffTask({ title: f.title, description: f.description, assigneeId: f.assigneeId, priority: f.priority, dueAt: f.dueAt ? new Date(f.dueAt).toISOString() : null, link: f.linkId ? { type: f.linkType, id: f.linkId } : null });
      toast.success('Task assigned'); setCreating(false); setF({ title: '', description: '', assigneeId: '', priority: 'normal', dueAt: '', linkType: 'other', linkId: '' }); load();
    } catch (e) { toast.error(err(e, 'Could not create the task.')); }
  };
  const move = async (t: StaffTask, status?: StaffTask['status']) => { try { await apiUpdateStaffTask(t._id, { status: status ?? NEXT[t.status] }); load(); } catch (e) { toast.error(err(e, 'Could not update.')); } };
  const send = async (t: StaffTask) => { if (!comment.trim()) return; try { await apiCommentStaffTask(t._id, comment); setComment(''); load(); } catch (e) { toast.error(err(e, 'Could not comment.')); } };
  const del = async (t: StaffTask) => { if (!window.confirm('Delete this task?')) return; try { await apiDeleteStaffTask(t._id); load(); } catch (e) { toast.error(err(e, 'Could not delete.')); } };
  const cols: StaffTask['status'][] = ['todo', 'doing', 'blocked', 'done'];
  return (
    <section>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {canAssign && (['mine', 'all'] as const).map(s => <button key={s} type="button" onClick={() => setScope(s)} aria-pressed={scope === s} className={clsx('rounded-full px-3 py-1 text-[12.5px] font-semibold border cursor-pointer', scope === s ? 'bg-carbon text-white border-carbon' : 'bg-white text-carbon border-bone')}>{s === 'mine' ? 'My tasks' : 'Everyone'}</button>)}
        <span className="flex-1" />
        {canAssign && <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setCreating(true)}>Assign a task</Button>}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cols.map(col => (
          <div key={col} className="bg-cream/60 border border-bone rounded-xl p-2.5 min-h-[120px]">
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-slate m-0 mb-2">{col === 'todo' ? 'To do' : col === 'doing' ? 'In progress' : col === 'blocked' ? 'Blocked' : 'Done'} · {(tasks ?? []).filter(t => t.status === col).length}</p>
            <div className="grid gap-2">
              {(tasks ?? []).filter(t => t.status === col).map(t => (
                <article key={t._id} className="bg-white border border-bone rounded-lg px-3 py-2.5">
                  <button type="button" onClick={() => setOpen(open === t._id ? null : t._id)} className="text-start bg-transparent border-none p-0 cursor-pointer w-full">
                    <p className="text-[13px] font-semibold text-carbon m-0">{t.title}</p>
                    <p className="text-[11.5px] text-slate m-0 mt-0.5"><span className={PRIO_TONE[t.priority]}>{t.priority}</span> · {t.assigneeName}{t.dueAt && ` · due ${fmt(t.dueAt)}`}{t.link && ` · ${t.link.type} ${t.link.label || t.link.id}`}</p>
                  </button>
                  <div className="flex gap-1.5 mt-2">
                    <Button size="xs" variant="outline" onClick={() => move(t)}>{t.status === 'done' ? 'Reopen' : t.status === 'doing' ? 'Mark done' : 'Start'}</Button>
                    {t.status !== 'blocked' && t.status !== 'done' && <Button size="xs" variant="ghost" onClick={() => move(t, 'blocked')}>Blocked</Button>}
                    {canAssign && <Button size="xs" variant="ghost" onClick={() => del(t)} aria-label="Delete task"><Trash2 size={12} /></Button>}
                  </div>
                  {open === t._id && (
                    <div className="mt-2 pt-2 border-t border-bone">
                      {t.description && <p className="text-[12.5px] text-charcoal m-0 mb-2 whitespace-pre-wrap">{t.description}</p>}
                      {t.comments.map(c => <p key={c._id} className="text-[12px] m-0 mb-1"><b>{c.authorName}</b> <span className="text-slate">{fmt(c.at)}</span><br />{c.text}</p>)}
                      <div className="flex gap-1.5 mt-1"><input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(t)} placeholder="Add a comment" className="flex-1 min-w-0 border border-bone rounded-lg px-2.5 py-1.5 text-[12.5px]" /><Button size="xs" variant="primary" onClick={() => send(t)}>Post</Button></div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
      {tasks && tasks.length === 0 && <p className="text-[13px] text-slate mt-3">No tasks yet{canAssign ? ' — assign the first one.' : '. Your manager can assign work to you here.'}</p>}
      {creating && (
        <Modal title="Assign a task" onClose={() => setCreating(false)} width={520} footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button><Button variant="primary" onClick={create} disabled={!f.title.trim() || !f.assigneeId}>Assign</Button></>}>
          <div className="px-5 py-4 flex flex-col gap-3">
            <Input label="What needs doing?" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} maxLength={140} />
            <Textarea label="Details (optional)" rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
            <label className="text-[12.5px] font-semibold text-charcoal">Assign to
              <select className="mt-1 w-full border border-bone rounded-lg px-3 py-2 text-[14px] bg-white" value={f.assigneeId} onChange={e => setF({ ...f, assigneeId: e.target.value })}>
                <option value="">Choose a person…</option>{people.map(p => <option key={p._id} value={p._id}>{p.name} — {p.roleName}</option>)}
              </select></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[12.5px] font-semibold text-charcoal">Priority<select className="mt-1 w-full border border-bone rounded-lg px-3 py-2 text-[14px] bg-white" value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>{['low', 'normal', 'high', 'urgent'].map(p => <option key={p}>{p}</option>)}</select></label>
              <Input label="Due" type="datetime-local" value={f.dueAt} onChange={e => setF({ ...f, dueAt: e.target.value })} />
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-3">
              <label className="text-[12.5px] font-semibold text-charcoal">Related to<select className="mt-1 w-full border border-bone rounded-lg px-3 py-2 text-[14px] bg-white" value={f.linkType} onChange={e => setF({ ...f, linkType: e.target.value })}>{['order', 'store', 'listing', 'user', 'chat', 'refund', 'payout', 'other'].map(p => <option key={p}>{p}</option>)}</select></label>
              <Input label="ID or reference (optional)" value={f.linkId} onChange={e => setF({ ...f, linkId: e.target.value })} />
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

// ── Activity ──────────────────────────────────────────────────────────────────
function ActivityTab() {
  const toast = useToast();
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  useEffect(() => { apiStaffAudit().then(r => setRows(r.data)).catch(e => { toast.error(err(e, 'Could not load activity.')); setRows([]); }); }, [toast]);
  return (
    <section>
      <p className="text-[13px] text-slate mt-0 mb-3">Every change a staff member makes is recorded here with their name, time and IP. Refused attempts are marked.</p>
      <div className="bg-white border border-bone rounded-xl overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse">
          <thead><tr className="text-start text-slate"><th className="text-start px-3 py-2">When</th><th className="text-start px-3 py-2">Who</th><th className="text-start px-3 py-2">Action</th><th className="text-start px-3 py-2">Result</th><th className="text-start px-3 py-2">IP</th></tr></thead>
          <tbody>
            {(rows ?? []).map(r => (
              <tr key={r._id} className="border-t border-bone">
                <td className="px-3 py-2 whitespace-nowrap">{fmt(r.at)}</td><td className="px-3 py-2">{r.name ?? r.adminId}</td>
                <td className="px-3 py-2 font-mono">{r.method} {r.path}</td>
                <td className={clsx('px-3 py-2 font-semibold', r.denied ? 'text-error' : r.status < 400 ? 'text-success' : 'text-amber-700')}>{r.denied ? `Refused (${r.denied})` : r.status}</td>
                <td className="px-3 py-2">{r.ip || '—'}</td>
              </tr>
            ))}
            {rows && rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate">No staff activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CollaborationPage() {
  usePageTitle('Collaboration');
  const { me, isOwner, can } = useAdminAccess();
  const [tab, setTab] = useState<Tab>('team');
  const canAssign = isOwner || can('tasks.assign');
const [counts, setCounts] = useState({ unread: 0, approvals: 0 });
  useEffect(() => {
    const poll = () => { void Promise.all([apiStaffUnreadTasks().catch(() => null), apiApprovalCount().catch(() => null)]).then(([u, a]) => setCounts({ unread: u?.data.count ?? 0, approvals: a?.data.pending ?? 0 })); };
    poll(); const id = window.setInterval(poll, 60_000); return () => window.clearInterval(id);
  }, [tab]);
  const label: Record<Tab, string> = {
    team: 'Team', roles: 'Roles & rights', tasks: counts.unread ? `Tasks (${counts.unread} new)` : 'Tasks', approvals: counts.approvals ? `Approvals (${counts.approvals})` : 'Approvals',
    notes: 'Notes', activity: 'Activity', security: 'Security',
  };
  return (
    <div className="px-4 md:px-8 py-6">
      <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-brand-royal m-0">Edudeen team workspace</p>
      <h1 className="font-serif font-normal text-[28px] text-carbon m-0 mb-1">Collaboration</h1>
      <p className="text-[13.5px] text-slate mt-0 mb-5 max-w-[70ch]">Invite staff, decide exactly what each person can do, hand out work and see who did what. {me && !isOwner && <>You are signed in as <b>{me.roleName}</b>.</>}</p>
      <div role="tablist" className="flex gap-1.5 mb-5 overflow-x-auto">
        {TABS.filter(t => t !== 'activity' || isOwner || can('activity.view')).map(t => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx('rounded-full px-4 py-1.5 text-[13px] font-semibold border cursor-pointer whitespace-nowrap', tab === t ? 'bg-carbon text-white border-carbon' : 'bg-white text-carbon border-bone hover:border-carbon')}>{label[t]}</button>
        ))}
      </div>
      {tab === 'team' && <TeamTab isOwner={isOwner} />}
      {tab === 'roles' && <RolesTab isOwner={isOwner} />}
      {tab === 'tasks' && <TasksTab canAssign={canAssign} />}
      {tab === 'approvals' && <ApprovalsTab />}
      {tab === 'notes' && <NotesTab />}
      {tab === 'activity' && <ActivityTab />}
      {tab === 'security' && <SecurityTab />}
    </div>
  );
}
