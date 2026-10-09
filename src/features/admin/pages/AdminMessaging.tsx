import { useId, useRef, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { X, MessageSquare, Flag, Paperclip, Inbox, FlagOff } from 'lucide-react';
import { useAdminConversationDetail } from '@/hooks/messaging/useAdminMessaging';
import { useAdminConversationRows, useAdminReportRows } from '@/hooks/admin/useAdminMessaging';
import { useMessages } from '@/hooks/messaging/useMessages';
import {
  apiAdminUpdateMessagingReport,
  type ReportStatus, type TargetType, type AdminConversationRow, type AdminReportRow,
} from '@/api/services/messaging';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Textarea } from '@/components/comman/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { useFocusTrap } from '@/components/comman/ui/useFocusTrap';
import { Table, type TableColumn } from '@/components/comman/ui/Table';
import { AdminStudioHeader } from '@/features/admin/components/studio';

type MainTab = 'conversations' | 'reports';

function fmt(iso?: string) { return iso ? new Date(iso).toLocaleString() : '—'; }

// ── Conversation detail drawer (read-only thread view) ─────────────────────────
function ConversationDrawer({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const { messages, loading } = useMessages(conversationId);
  const { conversation } = useAdminConversationDetail(conversationId);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(panelRef, onClose);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="dialog-overlay-enter absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="drawer-enter-right relative w-[420px] max-w-[92vw] h-full bg-white border-l border-bone flex flex-col outline-none"
      >
        <div className="px-5 py-4 border-b border-bone flex items-center justify-between shrink-0">
          <div>
            <p id={titleId} className="text-[14px] font-bold text-charcoal">{conversation?.buyer?.name ?? 'Conversation'} · {conversation?.store?.name ?? conversationId.slice(-6).toUpperCase()}</p>
            {conversation?.buyer?.email && <p className="text-[12px] text-slate">{conversation.buyer.email}</p>}
          </div>
          <button onClick={onClose} aria-label="Close conversation" className="w-7 h-7 flex items-center justify-center rounded-full bg-bone border-none cursor-pointer outline-none transition-colors duration-150 hover:bg-slate/20 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50">
            <X size={13} className="text-charcoal" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-bone rounded-[9px] px-3 py-[10px] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <SkeletonBox height={10} width={90} />
                    <SkeletonBox height={9} width={50} />
                  </div>
                  <SkeletonBox height={13} width={i % 2 === 0 ? '80%' : '60%'} />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <p className="text-[13px] text-slate text-center pt-8">No messages in this conversation.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map(m => (
                <div key={m._id} className="border border-bone rounded-[9px] px-3 py-[10px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-slate uppercase">
                      {m.senderRole} · {(m.senderId === conversation?.buyerId ? conversation?.buyer?.name : m.senderId === conversation?.sellerId ? conversation?.store?.name : null) ?? m.senderId.slice(-6)}
                    </span>
                    <span className="text-[12px] text-slate">{fmt(m.createdAt)}</span>
                  </div>
                  {m.type === 'text' && <p className="text-[13px] text-charcoal">{m.text}</p>}
                  {m.type === 'product_share' && (
                    <p className="text-[13px] text-charcoal">Shared product: {m.productShare?.title ?? `#${m.productShare?.productId}`}{m.productShare?.price != null && ` — $${m.productShare.price}`}</p>
                  )}
                  {(m.type === 'image' || m.type === 'document' || m.type === 'video') && m.attachments?.map(a => (
                    <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="text-[13px] text-brand-orange underline flex items-center gap-1">
                      <Paperclip size={11} /> {a.fileName}
                    </a>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Conversations tab ────────────────────────────────────────────────────────
type ConversationFilters = { storeId: string; buyerId: string; sellerId: string; isArchived: string };
const EMPTY_FILTERS: ConversationFilters = { storeId: '', buyerId: '', sellerId: '', isArchived: '' };
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

/** A resolved name with the id fragment underneath, so admins can still copy/filter by id. */
function NameCell({ name, id, sub }: { name?: string | null; id?: string; sub?: string | null }) {
  return (
    <div className="min-w-0 max-w-[200px]">
      <p className="text-graphite truncate" title={name ?? undefined}>{name ?? (id ? 'Unknown' : '—')}</p>
      {(sub || id) && <p className="text-[12px] text-slate truncate" title={id}>{sub ?? `…${id?.slice(-8)}`}</p>}
    </div>
  );
}

function ConversationsPanel() {
  // Filters are edited as a draft and applied on "Apply" (or Enter) — a
  // half-typed id would otherwise fire a request on every keystroke.
  const [draft, setDraft] = useState<ConversationFilters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<ConversationFilters>(EMPTY_FILTERS);
  const [filterError, setFilterError] = useState('');
  const { conversations, loading, error } = useAdminConversationRows({
    storeId:    filters.storeId  || undefined,
    buyerId:    filters.buyerId  || undefined,
    sellerId:   filters.sellerId || undefined,
    isArchived: filters.isArchived === '' ? undefined : filters.isArchived === 'true',
  });
  const [viewingId, setViewingId] = useState<string | null>(null);

  function applyFilters() {
    const trimmed = { ...draft, storeId: draft.storeId.trim(), buyerId: draft.buyerId.trim(), sellerId: draft.sellerId.trim() };
    const bad = (['storeId', 'buyerId', 'sellerId'] as const).find(k => trimmed[k] && !OBJECT_ID_RE.test(trimmed[k]));
    if (bad) { setFilterError(`${bad === 'storeId' ? 'Store' : bad === 'buyerId' ? 'Buyer' : 'Seller'} ID must be a full 24-character ID.`); return; }
    setFilterError('');
    setDraft(trimmed);
    setFilters(trimmed);
  }

  function clearFilters() { setFilterError(''); setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); }

  const dirty = JSON.stringify(draft) !== JSON.stringify(filters);
  const anyFilter = Object.values(filters).some(Boolean);
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') applyFilters(); };

  const columns: TableColumn<AdminConversationRow>[] = [
    { key: '_id', header: 'Conversation', render: c => <span className="font-bold text-brand-deep-orange whitespace-nowrap">{c._id.slice(-8).toUpperCase()}</span> },
    { key: 'storeId', header: 'Store', render: c => <NameCell name={c.storeName} id={c.storeId} /> },
    { key: 'buyerId', header: 'Buyer', render: c => <NameCell name={c.buyerName} id={c.buyerId} sub={c.buyerEmail} /> },
    { key: 'sellerId', header: 'Seller', render: c => <NameCell name={c.sellerName} id={c.sellerId} /> },
    {
      key: 'isArchived', header: 'Status',
      render: c => (
        <span className="px-[10px] py-[3px] rounded-[5px] text-[12px] font-semibold"
          style={{ background: c.isArchived ? '#EDF2F4' : '#EAF7EF', color: c.isArchived ? '#486071' : '#1E7A3C' }}>
          {c.isArchived ? 'Archived' : 'Active'}
        </span>
      ),
    },
    { key: 'updatedAt', header: 'Updated', render: c => <span className="text-slate whitespace-nowrap">{fmt(c.updatedAt)}</span> },
    {
      key: 'actions', header: '',
      render: c => (
        <button onClick={() => setViewingId(c._id)} className="px-[10px] py-1 rounded-[6px] text-[12px] font-medium text-white border-none cursor-pointer bg-info flex items-center gap-1 outline-none transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50">
          <MessageSquare size={11} /> View
        </button>
      ),
    },
  ];

  return (
    <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
      <div className="px-5 py-[14px] border-b border-bone flex gap-[10px] items-center flex-wrap">
        <input placeholder="Store ID"  value={draft.storeId}  onKeyDown={onEnter} onChange={e => setDraft(f => ({ ...f, storeId: e.target.value }))}  className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none w-[160px] transition-colors duration-150 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10" />
        <input placeholder="Buyer ID"  value={draft.buyerId}  onKeyDown={onEnter} onChange={e => setDraft(f => ({ ...f, buyerId: e.target.value }))}  className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none w-[160px] transition-colors duration-150 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10" />
        <input placeholder="Seller ID" value={draft.sellerId} onKeyDown={onEnter} onChange={e => setDraft(f => ({ ...f, sellerId: e.target.value }))} className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none w-[160px] transition-colors duration-150 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10" />
        <select value={draft.isArchived} onChange={e => setDraft(f => ({ ...f, isArchived: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
          <option value="">All statuses</option>
          <option value="false">Active</option>
          <option value="true">Archived</option>
        </select>
        <button onClick={applyFilters} disabled={loading}
          className="px-3 py-2 rounded-lg border border-bone text-[13px] cursor-pointer outline-none transition-colors duration-150 hover:bg-bone disabled:opacity-60 disabled:cursor-wait focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50"
          style={{ background: dirty ? '#FFF4DC' : 'var(--color-cream, #FAF7F2)' }}>
          Apply
        </button>
        {(anyFilter || dirty) && (
          <button onClick={clearFilters} className="px-2 py-2 text-[12.5px] text-slate bg-transparent border-none cursor-pointer hover:text-charcoal">Clear</button>
        )}
        {filterError && <p className="basis-full text-[12px] text-error m-0">{filterError}</p>}
      </div>

      {error ? (
        <p className="px-4 py-6 text-center text-[13px] text-error">{error}</p>
      ) : (
        <Table
          columns={columns}
          data={conversations}
          keyExtractor={c => c._id}
          loading={loading}
          emptyState={{ icon: <Inbox size={28} className="text-slate" />, title: 'No conversations found', description: 'Try adjusting the filters above.' }}
        />
      )}

      {viewingId && <ConversationDrawer conversationId={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
}

// ── Reports tab ───────────────────────────────────────────────────────────────
const STATUS_OPTS: (ReportStatus | '')[] = ['', 'pending', 'reviewed', 'resolved'];
const TARGET_OPTS:  (TargetType  | '')[] = ['', 'user', 'message', 'conversation'];

// Resolve modal — optional admin notes are stored on the report.
function ResolveReportModal({ report, onClose, onDone }: { report: AdminReportRow; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState(report.adminNotes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await apiAdminUpdateMessagingReport(report._id, { status: 'resolved', adminNotes: notes.trim() || undefined });
      toast.success('Report resolved');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve report.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal mobileSheet
      title="Resolve Report"
      onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button onClick={submit} loading={busy}>Resolve</Button>
      </>}
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-charcoal leading-[1.6]">
          Close this <strong>{report.targetType}</strong> report ({report.reason}{report.details ? ` — ${report.details}` : ''})?
          Resolving records the outcome; take any action on the account separately (e.g. suspend from Users).
        </p>
        <Textarea label="Admin notes (optional)" rows={3} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was found / done…" />
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

function ReportsPanel() {
  const [status,     setStatus]     = useState<ReportStatus | ''>('');
  const [targetType, setTargetType] = useState<TargetType | ''>('');
  const [page, setPage] = useState(1);
  const { reports, loading, error, refetch } = useAdminReportRows({
    status:     status || undefined,
    targetType: targetType || undefined,
    page, limit: 30,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [resolving, setResolving] = useState<AdminReportRow | null>(null);
  const [viewingConv, setViewingConv] = useState<string | null>(null);
  const toast = useToast();

  async function markReviewed(r: AdminReportRow) {
    setBusyId(r._id);
    setActionError('');
    try {
      await apiAdminUpdateMessagingReport(r._id, { status: 'reviewed' });
      toast.success('Report marked as reviewed');
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update report.');
    } finally {
      setBusyId(null);
    }
  }

  const columns: TableColumn<AdminReportRow>[] = [
    { key: '_id', header: 'Report', render: r => <span className="font-bold text-brand-deep-orange whitespace-nowrap flex items-center gap-1"><Flag size={11} /> {r._id.slice(-8).toUpperCase()}</span> },
    { key: 'targetType', header: 'Type', render: r => <span className="text-graphite capitalize whitespace-nowrap">{r.targetType}</span> },
    {
      key: 'targetId', header: 'Target',
      render: r => r.targetType === 'user'
        ? <NameCell name={r.targetName} id={r.targetId} />
        : r.targetType === 'conversation'
          ? <button onClick={() => setViewingConv(r.targetId)} className="text-brand-orange underline bg-transparent border-none p-0 cursor-pointer text-[13px] whitespace-nowrap">Open …{r.targetId.slice(-6)}</button>
          : <span className="text-graphite whitespace-nowrap">Message …{r.targetId.slice(-6)}</span>,
    },
    { key: 'reporterId', header: 'Reporter', render: r => <NameCell name={r.reporterName} id={r.reporterId} sub={r.reporterRole} /> },
    { key: 'reason', header: 'Reason', render: r => <span className="text-graphite max-w-[220px] truncate block" title={r.adminNotes ? `Notes: ${r.adminNotes}` : undefined}>{r.reason}{r.details ? ` — ${r.details}` : ''}</span> },
    {
      key: 'status', header: 'Status',
      render: r => (
        <span className="px-[10px] py-[3px] rounded-[5px] text-[12px] font-semibold"
          style={{
            background: r.status === 'pending' ? '#FFF4DC' : r.status === 'reviewed' ? '#EAF3FB' : '#EAF7EF',
            color:      r.status === 'pending' ? '#B36200' : r.status === 'reviewed' ? '#2156A8' : '#1E7A3C',
          }}>
          {r.status}
        </span>
      ),
    },
    { key: 'createdAt', header: 'Created', render: r => <span className="text-slate whitespace-nowrap">{fmt(r.createdAt)}</span> },
    {
      key: 'actions', header: '',
      render: r => r.status === 'resolved' ? null : (
        <div className="flex gap-[6px]">
          {r.status === 'pending' && (
            <Button size="xs" variant="outline" loading={busyId === r._id} disabled={!!busyId} onClick={() => markReviewed(r)}>Mark reviewed</Button>
          )}
          <Button size="xs" variant="secondary" disabled={busyId === r._id} onClick={() => { setActionError(''); setResolving(r); }}>Resolve</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
      {actionError && <div className="mx-5 mt-4 bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{actionError}</div>}
      {resolving && <ResolveReportModal report={resolving} onClose={() => setResolving(null)} onDone={() => { setResolving(null); refetch(); }} />}
      {viewingConv && <ConversationDrawer conversationId={viewingConv} onClose={() => setViewingConv(null)} />}
      <div className="px-5 py-[14px] border-b border-bone flex gap-[10px] items-center flex-wrap">
        <select value={status} onChange={e => { setStatus(e.target.value as ReportStatus | ''); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
          {STATUS_OPTS.map(o => <option key={o} value={o}>{o ? o[0].toUpperCase() + o.slice(1) : 'All Statuses'}</option>)}
        </select>
        <select value={targetType} onChange={e => { setTargetType(e.target.value as TargetType | ''); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
          {TARGET_OPTS.map(o => <option key={o} value={o}>{o ? o[0].toUpperCase() + o.slice(1) : 'All Types'}</option>)}
        </select>
      </div>

      {error ? (
        <p className="px-4 py-6 text-center text-[13px] text-error">{error}</p>
      ) : (
        <Table
          columns={columns}
          data={reports}
          keyExtractor={r => r._id}
          loading={loading}
          emptyState={{ icon: <FlagOff size={28} className="text-slate" />, title: 'No reports found', description: 'Try adjusting the filters above.' }}
        />
      )}

      <div className="px-5 py-3 border-t border-bone flex items-center justify-end gap-2">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-3 py-[6px] rounded-lg border border-bone text-[12px] bg-white cursor-pointer outline-none transition-colors duration-150 hover:enabled:bg-cream disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50">Prev</button>
        <span className="text-[12px] text-slate">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={reports.length < 30}
          className="px-3 py-[6px] rounded-lg border border-bone text-[12px] bg-white cursor-pointer outline-none transition-colors duration-150 hover:enabled:bg-cream disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50">Next</button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function AdminMessaging() {
  usePageTitle('Messaging');
  const [tab, setTab] = useState<MainTab>('conversations');

  return (
    <div>
      <AdminStudioHeader eyebrow="Edudeen team workspace · People" title="Messaging" subtitle="Oversee buyer–seller conversations and moderation reports." />

      <div className="px-4 sm:px-7 pt-5 pb-8 flex flex-col gap-5">
        <div className="flex gap-2">
          {(['conversations', 'reports'] as MainTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-[8px] rounded-lg text-[13px] font-semibold border cursor-pointer capitalize outline-none transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50"
              style={{
                background: tab === t ? '#EAF2F8' : '#fff',
                color:      tab === t ? '#0F3354' : '#486071',
                borderColor: tab === t ? '#174771' : 'var(--color-bone, #E1E7EA)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'conversations' ? <ConversationsPanel /> : <ReportsPanel />}
      </div>
    </div>
  );
}
