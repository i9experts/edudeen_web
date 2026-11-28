import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, ExternalLink, FileText, Inbox, Plus, RefreshCw, Trash2, Upload, UserPlus } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AdminPageHeader } from '@/components/comman/ui/AdminPageHeader';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Input, Select, Textarea } from '@/components/comman/ui/Input';
import { SearchInput } from '@/components/comman/ui/SearchInput';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { useToast } from '@/contexts/ToastContext';
import { useBusyAction } from '@/hooks/useBusyAction';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { useManageAsSeller } from '@/hooks/admin/useManageAsSeller';
import { CreateStoreForSellerModal } from '@/features/admin/components/CreateStoreForSellerModal';
import {
  apiAssignStore, apiGetManagedStore, apiListManagedStores, apiManagedTeam, apiMouDocumentUrl, apiUnassignStore, apiUpdateManagedStore, apiUploadMouDocument,
  ASSIGNMENT_ROLE_LABEL, MOU_STATUS_LABEL,
  type AssignmentRole, type ManagedStoreDetail, type ManagedStoreRow, type MouStatus, type TeamMemberOption,
} from '@/api/services/managedStores';

type Filter = 'all' | 'managed' | 'self' | 'expiring_soon' | 'expired';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All stores' }, { key: 'managed', label: 'Managed (MOU)' }, { key: 'self', label: 'Self-managed' },
  { key: 'expiring_soon', label: 'MOU ending soon' }, { key: 'expired', label: 'MOU ended' },
];
const MOU_STYLE: Record<MouStatus, string> = {
  none: 'bg-cream text-slate', not_started: 'bg-info-bg text-info-text', active: 'bg-success-bg text-success-text',
  expiring_soon: 'bg-warning-bg text-warning-text', expired: 'bg-error-bg text-error',
};
const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const pct = (r: number | null | undefined) => (typeof r === 'number' ? `${Number((r * 100).toFixed(2))}%` : '—');
const toDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');

function TypeBadge({ type }: { type: ManagedStoreRow['managementType'] }) {
  return type === 'managed'
    ? <span className="rounded-full px-2 py-0.5 text-[11.5px] font-semibold bg-brand-pale-orange text-brand-orange">Managed</span>
    : <span className="rounded-full px-2 py-0.5 text-[11.5px] font-semibold bg-cream text-slate">Self</span>;
}

function StoreDetailModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<ManagedStoreDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [team, setTeam] = useState<TeamMemberOption[]>([]);
  const [type, setType] = useState<'self' | 'managed'>('self');
  const [ratePct, setRatePct] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [ship, setShip] = useState<'seller' | 'platform'>('seller');
  const [assignee, setAssignee] = useState('');
  const [role, setRole] = useState<AssignmentRole>('account_manager');
  const save = useBusyAction();
  const side = useBusyAction();
  const fileRef = useRef<HTMLInputElement>(null);
  const { start: operate, busyId, error: operateError } = useManageAsSeller();

  const apply = useCallback((s: ManagedStoreDetail) => {
    setD(s);
    setType(s.managementType);
    setRatePct(s.mou?.commissionRate != null ? String(Number((s.mou.commissionRate * 100).toFixed(2))) : '');
    setStart(toDateInput(s.mou?.startDate));
    setEnd(toDateInput(s.mou?.endDate));
    setNotes(s.mou?.notes ?? '');
    setShip(s.fulfillmentMode);
  }, []);

  useEffect(() => {
    apiGetManagedStore(id).then(r => apply(r.data)).catch((e: unknown) => setLoadError(e instanceof Error ? e.message : 'Could not load the store.'));
    apiManagedTeam().then(r => setTeam(r.data)).catch(() => setTeam([]));
  }, [id, apply]);

  const saveSettings = async () => {
    if (!d) return;
    const body: Parameters<typeof apiUpdateManagedStore>[1] = { managementType: type, fulfillmentMode: ship };
    if (type === 'managed') {
      const n = Number(ratePct);
      if (!Number.isFinite(n) || n < 20 || n > 65) { save.setError('Enter a commission between 20% and 65%.'); return; }
      if (!start) { save.setError('Enter the MOU start date.'); return; }
      if (end && end <= start) { save.setError('The end date must be after the start date.'); return; }
      Object.assign(body, { commissionRate: Math.round(n * 100) / 10000, startDate: start, endDate: end || null, notes: notes.trim() || null });
    }
    const r = await save.run(() => apiUpdateManagedStore(d.id, body));
    if (r) { apply(r.data); toast.success('Saved.'); onChanged(); }
  };

  const upload = async (file: File | undefined) => {
    if (!d || !file) return;
    const r = await side.run(() => apiUploadMouDocument(d.id, file));
    if (r) { apply(r.data); toast.success('Signed MOU uploaded.'); }
    if (fileRef.current) fileRef.current.value = '';
  };
  const viewDocument = async () => {
    if (!d) return;
    const tab = window.open('about:blank', '_blank');
    const r = await side.run(() => apiMouDocumentUrl(d.id));
    if (r?.data.url && tab) tab.location.href = r.data.url; else tab?.close();
  };
  const assign = async () => {
    if (!d || !assignee) return;
    const r = await side.run(() => apiAssignStore(d.id, assignee, role));
    if (r) { apply(r.data); setAssignee(''); onChanged(); }
  };
  const unassign = async (adminId: string) => {
    if (!d) return;
    const r = await side.run(() => apiUnassignStore(d.id, adminId));
    if (r) { apply(r.data); onChanged(); }
  };

  const available = team.filter(t => !d?.assignees.some(a => a.adminId === t.id));
  const saved = d && d.managementType === 'managed';

  return (
    <Modal title={d ? d.name : 'Store'} onClose={onClose} width={760} drawer>
      {loadError ? <p role="alert" className="m-0 text-[13px] text-error">{loadError}</p> : !d ? (
        <div className="flex flex-col gap-3" aria-busy="true"><SkeletonBox height={60} /><SkeletonBox height={200} /></div>
      ) : (
        <div className="flex flex-col gap-5 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={d.managementType} />
            {d.mou && <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${MOU_STYLE[d.mou.status]}`}>MOU: {MOU_STATUS_LABEL[d.mou.status]}</span>}
            <span className="text-slate">{d.seller?.name ?? 'Seller'} · {d.seller?.email ?? ''}{d.country ? ` · ${d.country}` : ''} · {d.status}</span>
            <span className="ms-auto flex gap-2">
              <a href={`/shop/${d.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-brand-royal no-underline"><ExternalLink size={12} /> Storefront</a>
            </span>
          </div>

          <section className="rounded-xl border border-bone p-4 flex flex-col gap-3">
            <h3 className="m-0 text-[14px] font-bold text-carbon">Management</h3>
            <div role="radiogroup" aria-label="Who runs this store" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([['self', 'Self-managed', 'The seller runs the store. Edudeen gives technical support only. Normal platform fees apply.'],
                 ['managed', 'Managed by Edudeen (MOU)', 'Your team lists products and runs orders. Edudeen takes the MOU commission on each item price instead of the normal fee.']] as const).map(([v, label, hint]) => (
                <button key={v} type="button" role="radio" aria-checked={type === v} onClick={() => { setType(v); save.setError(''); }}
                  className={`text-start rounded-lg border p-3 cursor-pointer ${type === v ? 'border-brand-orange bg-brand-pale-orange' : 'border-bone bg-white hover:border-border-hover'}`}>
                  <span className="block font-semibold text-carbon">{label}</span>
                  <span className="block text-[12px] text-slate mt-0.5">{hint}</span>
                </button>
              ))}
            </div>
            {type === 'managed' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input label="Commission (% of item price)" type="number" min={20} max={65} step="0.5" value={ratePct} onChange={e => setRatePct(e.target.value)} placeholder="20–65" />
                <Input label="MOU start date" type="date" value={start} onChange={e => setStart(e.target.value)} />
                <Input label="MOU end date (optional)" type="date" value={end} onChange={e => setEnd(e.target.value)} />
                <div className="sm:col-span-3"><Textarea label="Notes (internal)" rows={2} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} /></div>
              </div>
            )}
            <Select label="Who ships physical orders" value={ship} onChange={e => setShip(e.target.value as 'seller' | 'platform')}>
              <option value="seller">The seller packs and ships (your team can book couriers and add tracking)</option>
              <option value="platform">Edudeen ships (stock is with Edudeen)</option>
            </Select>
            <p className="m-0 text-[12px] text-slate">Changing who ships applies to new orders only. Shipping charges are never part of the commission.</p>
            {save.error && <p role="alert" className="m-0 text-[12px] text-error">{save.error}</p>}
            <div><Button size="sm" onClick={saveSettings} loading={save.busy}>Save</Button></div>
          </section>

          {saved && (
            <section className="rounded-xl border border-bone p-4 flex flex-col gap-2">
              <h3 className="m-0 text-[14px] font-bold text-carbon">Signed MOU</h3>
              <p className="m-0 text-slate">{d.mou?.hasDocument ? `${d.mou.documentName ?? 'Document'} · kept private` : 'No signed copy uploaded yet.'}</p>
              <div className="flex flex-wrap gap-2">
                <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={e => void upload(e.target.files?.[0])} />
                <Button size="sm" variant="outline" icon={<Upload size={13} />} onClick={() => fileRef.current?.click()} disabled={side.busy}>{d.mou?.hasDocument ? 'Replace' : 'Upload'} signed MOU</Button>
                {d.mou?.hasDocument && <Button size="sm" variant="outline" icon={<FileText size={13} />} onClick={viewDocument} disabled={side.busy}>View</Button>}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-bone p-4 flex flex-col gap-3">
            <h3 className="m-0 text-[14px] font-bold text-carbon">Team</h3>
            <p className="m-0 text-[12px] text-slate">Team members can open and run only the stores assigned to them. Everything they do is recorded under their name.</p>
            {d.assignees.length === 0 ? <p className="m-0 text-slate">Nobody assigned yet.</p> : (
              <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                {d.assignees.map(a => (
                  <li key={a.adminId} className="flex items-center gap-2 rounded-lg bg-cream px-3 py-2">
                    <span className="flex-1 min-w-0 truncate"><strong className="text-carbon">{a.name ?? a.email}</strong> <span className="text-slate">· {ASSIGNMENT_ROLE_LABEL[a.role]} · since {day(a.assignedAt)}</span></span>
                    <button type="button" aria-label={`Remove ${a.name ?? a.email}`} onClick={() => unassign(a.adminId)} disabled={side.busy} className="text-error bg-transparent border-none cursor-pointer p-1"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2 items-end">
              <Select label="Add team member" value={assignee} onChange={e => setAssignee(e.target.value)}>
                <option value="">Choose…</option>
                {available.map(t => <option key={t.id} value={t.id}>{t.name ?? t.email}{t.isStaff ? '' : ' (owner)'} · {t.assignedStores} store{t.assignedStores === 1 ? '' : 's'}</option>)}
              </Select>
              <Select label="Role" value={role} onChange={e => setRole(e.target.value as AssignmentRole)}>
                <option value="account_manager">Account manager</option>
                <option value="assistant">Assistant</option>
              </Select>
              <Button size="sm" icon={<UserPlus size={13} />} onClick={assign} disabled={!assignee || side.busy}>Assign</Button>
            </div>
            {side.error && <p role="alert" className="m-0 text-[12px] text-error">{side.error}</p>}
          </section>

          <section className="rounded-xl border border-bone p-4 flex flex-col gap-2">
            <h3 className="m-0 text-[14px] font-bold text-carbon">Run this store</h3>
            <p className="m-0 text-[12px] text-slate">Opens the seller dashboard in a new tab for 30 minutes. You confirm your password first. Payouts and account settings stay locked.</p>
            <div><Button size="sm" variant="outline" icon={<Building2 size={13} />} onClick={() => operate(d.id)} loading={busyId === d.id}>Operate store</Button></div>
            {operateError && <p role="alert" className="m-0 text-[12px] text-error">{operateError}</p>}
          </section>

          {d.history.length > 0 && (
            <section>
              <h3 className="m-0 mb-1.5 text-[13px] font-bold text-carbon">History</h3>
              <ul className="m-0 p-0 list-none flex flex-col gap-1 text-[12px] text-slate">
                {d.history.slice(0, 12).map((h, i) => <li key={i}>{day(h.at)} · {h.action.replace(/_/g, ' ')}{h.changes ? ` · ${Object.keys(h.changes).join(', ')}` : ''}</li>)}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Super admin: every store, managed (MOU) vs self-managed, with MOU, shipping mode and team assignments. */
export function AdminStores() {
  usePageTitle('Stores');
  const toast = useToast();
  const { can } = useAdminAccess();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<ManagedStoreRow[] | null>(null);
  const [counts, setCounts] = useState({ all: 0, managed: 0, expiring: 0, expired: 0 });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const open = params.get('store');
  const setOpen = (id: string | null) => setParams(p => { const n = new URLSearchParams(p); if (id) n.set('store', id); else n.delete('store'); return n; }, { replace: true });

  const load = useCallback(() => {
    setError('');
    const type = filter === 'managed' || filter === 'self' ? filter : filter === 'expiring_soon' || filter === 'expired' ? 'managed' : undefined;
    const mouStatus = filter === 'expiring_soon' || filter === 'expired' ? filter : undefined;
    apiListManagedStores({ type, mouStatus, q: search.trim() || undefined, limit: 200 })
      .then(r => { setRows(r.data.items); setCounts(r.data.counts); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load stores.'));
  }, [filter, search]);
  useEffect(() => { const t = setTimeout(() => { setRows(null); load(); }, 250); return () => clearTimeout(t); }, [load]);

  const canCreate = can('stores.manage');
  return (
    <>
      <AdminPageHeader
        title="Stores"
        subtitle="Self-managed sellers and the sellers your team runs under an MOU."
        icon={<Building2 size={18} />}
        actions={canCreate ? <Button size="sm" icon={<Plus size={13} />} onClick={() => setCreating(true)}>Add store for a seller</Button> : undefined}
      />
      <div className="px-4 sm:px-7 py-5">
        <section className="bg-white border border-bone rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-bone flex flex-wrap items-center gap-2">
            <div className="flex gap-1 flex-wrap">
              {FILTERS.map(f => (
                <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}
                  className={`min-h-[36px] px-3 rounded-full text-[12px] font-medium border cursor-pointer ${filter === f.key ? 'bg-carbon text-white border-carbon' : 'bg-white text-graphite border-bone'}`}>
                  {f.label}
                  {f.key === 'managed' && counts.managed ? ` (${counts.managed})` : ''}
                  {f.key === 'expiring_soon' && counts.expiring ? ` (${counts.expiring})` : ''}
                  {f.key === 'expired' && counts.expired ? ` (${counts.expired})` : ''}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[200px] max-w-[320px] ms-auto">
              <SearchInput value={search} onChange={setSearch} placeholder="Search store name" />
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
            <div className="px-4 py-10 text-center text-[13px] text-slate flex flex-col items-center gap-2"><Inbox size={22} /> No stores here.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="text-start text-[11.5px] uppercase tracking-wide text-slate bg-cream">
                    {['Store', 'Type', 'MOU', 'Ships', 'Team', 'Status'].map(h => <th key={h} className="text-start font-semibold px-4 py-2 whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} onClick={() => setOpen(r.id)} className="border-t border-bone cursor-pointer hover:bg-cream">
                      <td className="px-4 py-2.5 min-w-[200px]">
                        <button type="button" onClick={e => { e.stopPropagation(); setOpen(r.id); }} className="text-start bg-transparent border-none p-0 cursor-pointer">
                          <span className="block font-semibold text-carbon">{r.name}</span>
                          <span className="block text-[12px] text-slate">{r.seller?.name ?? r.seller?.email ?? '—'}{r.country ? ` · ${r.country}` : ''}</span>
                        </button>
                      </td>
                      <td className="px-4 py-2.5"><TypeBadge type={r.managementType} /></td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {r.managementType === 'managed' && r.mou ? (
                          <span className="flex flex-col"><span className="font-semibold text-carbon">{pct(r.mou.commissionRate)}</span><span className={`self-start mt-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${MOU_STYLE[r.mou.status]}`}>{MOU_STATUS_LABEL[r.mou.status]}{r.mou.endDate ? ` · ${day(r.mou.endDate)}` : ''}</span></span>
                        ) : <span className="text-slate">—</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-graphite">{r.fulfillmentMode === 'platform' ? 'Edudeen' : 'Seller'}</td>
                      <td className="px-4 py-2.5 text-graphite">{r.assignees.length ? r.assignees.map(a => a.name ?? a.email).join(', ') : <span className="text-slate">—</span>}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-graphite capitalize">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {open && <StoreDetailModal id={open} onClose={() => setOpen(null)} onChanged={load} />}
      {creating && (
        <CreateStoreForSellerModal
          onClose={() => setCreating(false)}
          onCreated={r => { setCreating(false); toast.success(`Store "${r.store.name}" created. Mark it as managed below if it runs under an MOU.`); load(); setOpen(r.store.id); }}
        />
      )}
    </>
  );
}
