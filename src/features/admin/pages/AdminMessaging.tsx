import { useId, useRef, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { X, MessageSquare, Flag, Paperclip, Inbox, FlagOff } from 'lucide-react';
import { useAdminConversations, useAdminReports, useAdminConversationDetail } from '@/hooks/messaging/useAdminMessaging';
import { useMessages } from '@/hooks/messaging/useMessages';
import type { ReportStatus, TargetType, Conversation, Report } from '@/api/services/messaging';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { useFocusTrap } from '@/components/comman/ui/useFocusTrap';
import { Table, type TableColumn } from '@/components/comman/ui/Table';
import { AdminPageHeader } from '@/components/comman/ui/AdminPageHeader';

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
            {conversation?.buyer?.email && <p className="text-[11px] text-slate">{conversation.buyer.email}</p>}
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
                    <span className="text-[11px] font-semibold text-slate uppercase">{m.senderRole} · {m.senderId.slice(-6)}</span>
                    <span className="text-[10px] text-slate">{fmt(m.createdAt)}</span>
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
function ConversationsPanel() {
  const [filters, setFilters] = useState<{ storeId: string; buyerId: string; sellerId: string; isArchived: string }>({
    storeId: '', buyerId: '', sellerId: '', isArchived: '',
  });
  const { conversations, loading, error, refetch } = useAdminConversations({
    storeId:    filters.storeId  || undefined,
    buyerId:    filters.buyerId  || undefined,
    sellerId:   filters.sellerId || undefined,
    isArchived: filters.isArchived === '' ? undefined : filters.isArchived === 'true',
  });
  const [viewingId, setViewingId] = useState<string | null>(null);

  const columns: TableColumn<Conversation>[] = [
    { key: '_id', header: 'Conversation', render: c => <span className="font-bold text-brand-deep-orange whitespace-nowrap">{c._id.slice(-8).toUpperCase()}</span> },
    { key: 'storeId', header: 'Store', render: c => <span className="text-graphite whitespace-nowrap">{c.storeId?.slice(-8) ?? '—'}</span> },
    { key: 'buyerId', header: 'Buyer', render: c => <span className="text-graphite whitespace-nowrap">{c.buyerId?.slice(-8) ?? '—'}</span> },
    { key: 'sellerId', header: 'Seller', render: c => <span className="text-graphite whitespace-nowrap">{c.sellerId?.slice(-8) ?? '—'}</span> },
    {
      key: 'isArchived', header: 'Status',
      render: c => (
        <span className="px-[10px] py-[3px] rounded-[5px] text-[11px] font-semibold"
          style={{ background: c.isArchived ? '#F0EEE6' : '#EAF7EF', color: c.isArchived ? '#5A5852' : '#1E7A3C' }}>
          {c.isArchived ? 'Archived' : 'Active'}
        </span>
      ),
    },
    { key: 'updatedAt', header: 'Updated', render: c => <span className="text-slate whitespace-nowrap">{fmt(c.updatedAt)}</span> },
    {
      key: 'actions', header: '',
      render: c => (
        <button onClick={() => setViewingId(c._id)} className="px-[10px] py-1 rounded-[6px] text-[11px] font-medium text-white border-none cursor-pointer bg-info flex items-center gap-1 outline-none transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50">
          <MessageSquare size={11} /> View
        </button>
      ),
    },
  ];

  return (
    <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
      <div className="px-5 py-[14px] border-b border-bone flex gap-[10px] items-center flex-wrap">
        <input placeholder="Store ID"  value={filters.storeId}  onChange={e => setFilters(f => ({ ...f, storeId: e.target.value }))}  className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none w-[160px] transition-colors duration-150 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10" />
        <input placeholder="Buyer ID"  value={filters.buyerId}  onChange={e => setFilters(f => ({ ...f, buyerId: e.target.value }))}  className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none w-[160px] transition-colors duration-150 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10" />
        <input placeholder="Seller ID" value={filters.sellerId} onChange={e => setFilters(f => ({ ...f, sellerId: e.target.value }))} className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none w-[160px] transition-colors duration-150 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10" />
        <select value={filters.isArchived} onChange={e => setFilters(f => ({ ...f, isArchived: e.target.value }))}
          className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
          <option value="">All statuses</option>
          <option value="false">Active</option>
          <option value="true">Archived</option>
        </select>
        <button onClick={refetch} className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-cream cursor-pointer outline-none transition-colors duration-150 hover:bg-bone focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50">Apply</button>
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

function ReportsPanel() {
  const [status,     setStatus]     = useState<ReportStatus | ''>('');
  const [targetType, setTargetType] = useState<TargetType | ''>('');
  const [page, setPage] = useState(1);
  const { reports, loading, error } = useAdminReports({
    status:     status || undefined,
    targetType: targetType || undefined,
    page, limit: 30,
  });

  const columns: TableColumn<Report>[] = [
    { key: '_id', header: 'Report', render: r => <span className="font-bold text-brand-deep-orange whitespace-nowrap flex items-center gap-1"><Flag size={11} /> {r._id.slice(-8).toUpperCase()}</span> },
    { key: 'targetType', header: 'Type', render: r => <span className="text-graphite capitalize whitespace-nowrap">{r.targetType}</span> },
    { key: 'targetId', header: 'Target', render: r => <span className="text-graphite whitespace-nowrap">{r.targetId.slice(-8)}</span> },
    { key: 'reporterId', header: 'Reporter', render: r => <span className="text-graphite whitespace-nowrap">{r.reporterId?.slice(-8) ?? '—'}</span> },
    { key: 'reason', header: 'Reason', render: r => <span className="text-graphite max-w-[220px] truncate block">{r.reason}{r.details ? ` — ${r.details}` : ''}</span> },
    {
      key: 'status', header: 'Status',
      render: r => (
        <span className="px-[10px] py-[3px] rounded-[5px] text-[11px] font-semibold"
          style={{
            background: r.status === 'pending' ? '#FFF4DC' : r.status === 'reviewed' ? '#EAF3FB' : '#EAF7EF',
            color:      r.status === 'pending' ? '#B36200' : r.status === 'reviewed' ? '#2156A8' : '#1E7A3C',
          }}>
          {r.status}
        </span>
      ),
    },
    { key: 'createdAt', header: 'Created', render: r => <span className="text-slate whitespace-nowrap">{fmt(r.createdAt)}</span> },
  ];

  return (
    <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
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
      <AdminPageHeader title="Messaging" subtitle="Oversee buyer–seller conversations and moderation reports." />

      <div className="px-4 sm:px-7 pt-5 pb-8 flex flex-col gap-5">
        <div className="flex gap-2">
          {(['conversations', 'reports'] as MainTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-[8px] rounded-lg text-[13px] font-semibold border cursor-pointer capitalize outline-none transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50"
              style={{
                background: tab === t ? '#EAF2F8' : '#fff',
                color:      tab === t ? '#0F3354' : '#4A4945',
                borderColor: tab === t ? '#174771' : 'var(--color-bone, #E8E6DC)',
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
