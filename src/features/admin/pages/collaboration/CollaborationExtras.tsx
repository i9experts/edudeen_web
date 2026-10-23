import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import QRCode from 'qrcode';
import { ShieldCheck } from 'lucide-react';
import { Button, Input, Modal } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { useAdminAccess, loadAdminAccess } from '@/hooks/admin/useAdminAccess';
import { StaffNotes } from '@/features/admin/components/StaffNotes';
import {
  apiSignOutMe, apiStaffApprovals, apiDecideApproval, apiStaffSettings, apiSaveStaffSettings, apiMy2faSetup, apiMy2faEnable, apiMy2faDisable,
  type ApprovalRow, type StaffSafetySettings, type WorkHours,
} from '@/api/services/staff';

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const err = (e: unknown, fb: string) => (e instanceof Error ? e.message : fb);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Optional limits on where / when a staff member can use the panel. */
export function RestrictionFields({ ips, setIps, hours, setHours }: { ips: string; setIps: (v: string) => void; hours: WorkHours | null; setHours: (h: WorkHours | null) => void }) {
  const on = !!hours;
  const w = hours ?? { days: [1, 2, 3, 4, 5], from: '09:00', to: '18:00', tz: 'Asia/Karachi' };
  const toggleDay = (d: number) => setHours({ ...w, days: w.days.includes(d) ? w.days.filter(x => x !== d) : [...w.days, d].sort() });
  return (
    <fieldset className="border border-bone rounded-lg px-3 py-3 m-0 flex flex-col gap-3">
      <legend className="text-[11.5px] font-bold uppercase tracking-wider text-slate px-1">Extra safety (optional)</legend>
      <label className="text-[12.5px] font-semibold text-charcoal">Only allow these IP addresses
        <textarea rows={2} value={ips} onChange={e => setIps(e.target.value)} placeholder="One per line or comma-separated, e.g. 203.0.113.7 or 203.0.113.0/24 — empty = anywhere"
          className="mt-1 w-full border border-bone rounded-lg px-3 py-2 text-[13px] font-normal font-mono" />
      </label>
      <div>
        <label className="flex items-center gap-2 text-[12.5px] font-semibold text-charcoal cursor-pointer">
          <input type="checkbox" className="accent-brand-orange" checked={on} onChange={e => setHours(e.target.checked ? w : null)} /> Only allow during working hours
        </label>
        {on && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex gap-1 flex-wrap">{DAYS.map((d, i) => (
              <button key={d} type="button" aria-pressed={w.days.includes(i)} onClick={() => toggleDay(i)} className={clsx('rounded-full px-3 py-1 text-[12px] font-semibold border cursor-pointer', w.days.includes(i) ? 'bg-carbon text-white border-carbon' : 'bg-white text-carbon border-bone')}>{d}</button>
            ))}</div>
            <div className="grid grid-cols-3 gap-2">
              <Input label="From" type="time" value={w.from} onChange={e => setHours({ ...w, from: e.target.value })} />
              <Input label="To" type="time" value={w.to} onChange={e => setHours({ ...w, to: e.target.value })} />
              <Input label="Timezone" value={w.tz ?? 'Asia/Karachi'} onChange={e => setHours({ ...w, tz: e.target.value })} />
            </div>
          </div>
        )}
      </div>
    </fieldset>
  );
}
export const parseIps = (s: string) => s.split(/[\n,\s]+/).map(x => x.trim()).filter(Boolean);

// ── Approvals ─────────────────────────────────────────────────────────────────
const TONE: Record<string, string> = { pending: 'bg-amber-50 text-amber-700', approved: 'bg-green-50 text-success', rejected: 'bg-red-50 text-error', used: 'bg-[#eef1f2] text-slate', expired: 'bg-[#eef1f2] text-slate' };
export function ApprovalsTab() {
  const toast = useToast();
  const { me, can } = useAdminAccess();
  const [rows, setRows] = useState<ApprovalRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => { apiStaffApprovals().then(r => setRows(r.data)).catch(e => { toast.error(err(e, 'Could not load approvals.')); setRows([]); }); }, [toast]);
  useEffect(load, [load]);
  const [rejecting, setRejecting] = useState<ApprovalRow | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const decide = async (a: ApprovalRow, approve: boolean, note = '') => {
    if (busy) return;
    setBusy(a._id);
    try { await apiDecideApproval(a._id, approve, note); toast.success(approve ? `Approved — ${a.requestedByName} can now repeat the action (valid 24 h)` : 'Rejected'); setRejecting(null); setRejectNote(''); load(); }
    catch (e) { toast.error(err(e, 'Could not save the decision.')); } finally { setBusy(null); }
  };
  const decider = can('approvals.decide');
  return (
    <section>
      <p className="text-[13px] text-slate mt-0 mb-3 max-w-[75ch]">Sensitive money actions done by staff (payouts, refunds, payment proofs) do not run straight away. They wait here for a second person. After approval the requester repeats the same action once within 24 hours.</p>
      <div className="grid gap-2">
        {(rows ?? []).map(a => (
          <article key={a._id} className="bg-white border border-bone rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <p className="text-[14px] font-bold text-carbon m-0">{a.label}</p>
              <p className="text-[12px] text-slate m-0 mt-0.5">By {a.requestedByName} · {fmt(a.createdAt)} · <span className="font-mono">{a.path.replace('/api/', '')}</span></p>
              {a.decidedByName && <p className="text-[12px] text-slate m-0">{a.status === 'rejected' ? 'Rejected' : 'Decided'} by {a.decidedByName} · {fmt(a.decidedAt)}{a.decisionNote && ` — ${a.decisionNote}`}</p>}
            </div>
            <span className={clsx('rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold capitalize', TONE[a.status])}>{a.status}</span>
            {a.status === 'pending' && decider && a.requestedById !== me?._id && (
              <div className="flex gap-1.5"><Button size="xs" variant="primary" loading={busy === a._id} onClick={() => decide(a, true)}>Approve</Button><Button size="xs" variant="ghost" disabled={busy === a._id} onClick={() => { setRejectNote(''); setRejecting(a); }}>Reject</Button></div>
            )}
            {a.status === 'pending' && a.requestedById === me?._id && <span className="text-[12px] text-slate">Waiting for another person</span>}
          </article>
        ))}
        {rows && rows.length === 0 && <p className="text-[13px] text-slate">Nothing waiting.</p>}
      </div>
      {rejecting && (
        <Modal mobileSheet title="Reject this request?" onClose={() => { if (!busy) setRejecting(null); }}
          footer={<><Button variant="ghost" onClick={() => setRejecting(null)} disabled={!!busy}>Cancel</Button><Button variant="danger" loading={busy === rejecting._id} onClick={() => decide(rejecting, false, rejectNote.trim())}>Reject</Button></>}>
          <p className="text-[13px] text-slate mt-0 mb-3">{rejecting.label} — requested by {rejecting.requestedByName}</p>
          <Input label="Reason (optional)" value={rejectNote} onChange={e => setRejectNote(e.target.value)} maxLength={300} />
        </Modal>
      )}
    </section>
  );
}

// ── Security: own two-step sign-in + owner safety settings ────────────────────
export function SecurityTab() {
  const toast = useToast();
  const { me, isOwner } = useAdminAccess();
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<StaffSafetySettings | null>(null);

  useEffect(() => { if (isOwner) apiStaffSettings().then(r => setSettings(r.data)).catch(() => {}); }, [isOwner]);

  const start = async () => {
    setBusy(true);
    try { const r = await apiMy2faSetup(); setSetup({ secret: r.data.secret, qr: await QRCode.toDataURL(r.data.otpauthUrl, { margin: 1, width: 176 }) }); }
    catch (e) { toast.error(err(e, 'Could not start the setup.')); } finally { setBusy(false); }
  };
  const enable = async () => {
    setBusy(true);
    try { const r = await apiMy2faEnable(code); setRecovery(r.data.recoveryCodes); setSetup(null); setCode(''); loadAdminAccess(true); }
    catch (e) { toast.error(err(e, 'That code did not work.')); } finally { setBusy(false); }
  };
  const [disabling, setDisabling] = useState(false);
  const [offCode, setOffCode] = useState('');
  const disable = async () => {
    const c = offCode.trim();
    if (!c || busy) return;
    setBusy(true);
    try { await apiMy2faDisable(c); toast.success('Two-step sign-in is off'); setDisabling(false); setOffCode(''); loadAdminAccess(true); }
    catch (e) { toast.error(err(e, 'Could not turn it off.')); } finally { setBusy(false); }
  };
  const [limits, setLimits] = useState({ usd: '', pkr: '' });
  useEffect(() => { if (settings) setLimits({ usd: String(settings.approvalThresholdUSD || ''), pkr: String(settings.approvalThresholdPKR || '') }); }, [settings?.approvalThresholdUSD, settings?.approvalThresholdPKR]); // eslint-disable-line react-hooks/exhaustive-deps
  const signOutMe = async () => { if (!window.confirm('Sign out of every device, including this one?')) return; try { await apiSignOutMe(); window.location.href = '/admin/login'; } catch (e) { toast.error(err(e, 'Could not sign out.')); } };
  const saveSettings = async (patch: Partial<Pick<StaffSafetySettings, 'approvalsEnabled' | 'approvalKinds' | 'approvalThresholdUSD' | 'approvalThresholdPKR'>>) => {
    try { setSettings((await apiSaveStaffSettings(patch)).data); toast.success('Saved'); } catch (e) { toast.error(err(e, 'Could not save.')); }
  };

  return (
    <section className="grid gap-5 max-w-[760px]">
      <div className="bg-white border border-bone rounded-xl px-5 py-4">
        <p className="text-[14px] font-bold text-carbon m-0 flex items-center gap-2"><ShieldCheck size={16} className={me?.totpEnabled ? 'text-success' : 'text-slate'} /> Two-step sign-in (authenticator app)</p>
        <p className="text-[13px] text-slate mt-1 mb-3">{me?.totpEnabled ? 'On. You are asked for a 6-digit code every time you sign in.' : 'Off. Turn it on so a stolen password alone cannot open the admin panel.'}{!isOwner && ' Staff accounts always keep it on.'}</p>
        {!me?.totpEnabled && !setup && !recovery && <Button size="sm" variant="primary" loading={busy} onClick={start}>Turn on</Button>}
        {me?.totpEnabled && isOwner && <Button size="sm" variant="outline" onClick={() => { setOffCode(''); setDisabling(true); }}>Turn off</Button>}
        {setup && (
          <div className="flex flex-col gap-3 max-w-[320px]">
            <img src={setup.qr} alt="Authenticator QR code" width={176} height={176} className="rounded-lg border border-bone" />
            <p className="text-[12px] text-slate m-0">Scan with Google Authenticator, Authy or 1Password. Or enter this key: <code className="font-mono break-all">{setup.secret}</code></p>
            <Input label="6-digit code" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && enable()} />
            <Button size="sm" variant="primary" loading={busy} onClick={enable} disabled={code.trim().length < 6}>Confirm and turn on</Button>
          </div>
        )}
        {recovery && (
          <div>
            <p className="text-[13px] text-charcoal m-0 mb-2">Save these one-time recovery codes now — they will not be shown again.</p>
            <ul className="grid grid-cols-2 gap-2 list-none p-0 m-0 font-mono text-[13px] max-w-[320px]">{recovery.map(r => <li key={r} className="bg-cream border border-bone rounded-lg px-3 py-2 text-center">{r}</li>)}</ul>
          </div>
        )}
      </div>

      <div className="bg-white border border-bone rounded-xl px-5 py-4">
        <p className="text-[14px] font-bold text-carbon m-0">Signed in on other devices?</p>
        <p className="text-[13px] text-slate mt-1 mb-3">Ends every open session of your account (a lost laptop, a shared computer). You will sign in again here.</p>
        <Button size="sm" variant="outline" onClick={signOutMe}>Sign out everywhere</Button>
      </div>

      {isOwner && settings && (
        <div className="bg-white border border-bone rounded-xl px-5 py-4">
          <p className="text-[14px] font-bold text-carbon m-0">Two-person approval</p>
          <p className="text-[13px] text-slate mt-1 mb-3">When staff do one of these, someone else must approve it first. You, the owner, are never held up.</p>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-carbon cursor-pointer mb-2">
            <input type="checkbox" className="accent-brand-orange" checked={settings.approvalsEnabled} onChange={e => saveSettings({ approvalsEnabled: e.target.checked })} /> Require approval
          </label>
          <div className="flex gap-3 flex-wrap mb-3 ps-6">
            <div className="w-[190px]"><Input label="No approval below (USD)" type="number" min={0} value={limits.usd} placeholder="0 = always ask" onChange={e => setLimits({ ...limits, usd: e.target.value })} onBlur={() => saveSettings({ approvalThresholdUSD: Number(limits.usd) || 0 })} disabled={!settings.approvalsEnabled} /></div>
            <div className="w-[190px]"><Input label="No approval below (PKR)" type="number" min={0} value={limits.pkr} placeholder="0 = always ask" onChange={e => setLimits({ ...limits, pkr: e.target.value })} onBlur={() => saveSettings({ approvalThresholdPKR: Number(limits.pkr) || 0 })} disabled={!settings.approvalsEnabled} /></div>
            <p className="text-[12px] text-slate m-0 self-end max-w-[40ch]">Small payouts and payment proofs under these amounts go through. Refunds always wait.</p>
          </div>
          <div className="grid gap-1.5 ps-6">
            {settings.available.map(k => (
              <label key={k.key} className={clsx('flex items-center gap-2 text-[13px]', !settings.approvalsEnabled && 'opacity-50')}>
                <input type="checkbox" className="accent-brand-orange" disabled={!settings.approvalsEnabled} checked={settings.approvalKinds.includes(k.key)}
                  onChange={e => saveSettings({ approvalKinds: e.target.checked ? [...settings.approvalKinds, k.key] : settings.approvalKinds.filter(x => x !== k.key) })} /> {k.label}
              </label>
            ))}
          </div>
        </div>
      )}
      {disabling && (
        <Modal mobileSheet title="Turn off two-step sign-in?" onClose={() => { if (!busy) setDisabling(false); }}
          footer={<><Button variant="ghost" onClick={() => setDisabling(false)} disabled={busy}>Cancel</Button><Button variant="danger" loading={busy} onClick={disable} disabled={offCode.trim().length < 6}>Turn off</Button></>}>
          <Input label="Current 6-digit code" inputMode="numeric" autoComplete="one-time-code" value={offCode} onChange={e => setOffCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && disable()} />
        </Modal>
      )}
    </section>
  );
}

// ── Notes lookup ──────────────────────────────────────────────────────────────
export function NotesTab() {
  const [type, setType] = useState<'user' | 'seller' | 'store' | 'order' | 'listing'>('user');
  const [id, setId] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="max-w-[640px]">
      <p className="text-[13px] text-slate mt-0 mb-3">Private notes the team keeps about a buyer, seller, store, order or listing. They also show inside each user's detail window. Paste the record's ID to open its notes.</p>
      <div className="flex gap-2 flex-wrap mb-4">
        <select value={type} onChange={e => { setType(e.target.value as typeof type); setOpen(null); }} className="border border-bone rounded-lg px-3 py-2 text-[13px] bg-white">
          {['user', 'seller', 'store', 'order', 'listing'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={id} onChange={e => setId(e.target.value)} onKeyDown={e => e.key === 'Enter' && id.trim() && setOpen(id.trim())} placeholder="Record ID" className="flex-1 min-w-[200px] border border-bone rounded-lg px-3 py-2 text-[13px] font-mono" />
        <Button size="sm" variant="primary" disabled={!id.trim()} onClick={() => setOpen(id.trim())}>Open notes</Button>
      </div>
      {open && <StaffNotes key={`${type}:${open}`} entityType={type} entityId={open} />}
    </section>
  );
}
