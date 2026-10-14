import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Badge, Button } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import {
  apiAdminChatClose, apiAdminChatGet, apiAdminChatList, apiAdminChatReply, apiAdminChatStats,
  type AdminChatRow, type AdminChatThread, type ChatUserKind,
} from '@/api/services/adminChat';

const FILTERS = [['', 'All'], ['unread', 'Unread'], ['open', 'Open'], ['answered', 'Answered'], ['closed', 'Closed']] as const;
const CANNED = [
  'Thank you for contacting Edudeen. We are looking into this and will update you here shortly.',
  'You can find this in your account under Orders / My Library. Please tell us if it still does not work.',
  'Could you share your order number so we can check this for you?',
  'This has been resolved. Please let us know if you need anything else.',
];
const KIND_COLOR: Record<ChatUserKind, 'blue' | 'orange' | 'gray'> = { buyer: 'blue', seller: 'orange', guest: 'gray' };
const KIND_LABEL: Record<ChatUserKind, string> = { buyer: 'Buyer', seller: 'Seller', guest: 'Guest' };

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const errMsg = (e: unknown, d: string) => (e instanceof Error && e.message ? e.message : d);

function RoleBadge({ row }: { row: Pick<AdminChatRow, 'userKind' | 'storeName'> }) {
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <Badge color={KIND_COLOR[row.userKind]} size="sm">{KIND_LABEL[row.userKind]}</Badge>
      {row.userKind === 'seller' && row.storeName && <span className="text-[12px] text-slate">{row.storeName}</span>}
    </span>
  );
}

function Thread({ id, onChanged, onBack }: { id: string; onChanged: () => void; onBack: () => void }) {
  const [t, setT] = useState<AdminChatThread | null>(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // onChanged is a new inline function on every parent render: keep it in a ref so it can never re-trigger loading
  // (it used to: load -> onChanged -> parent re-render -> new onChanged -> load again, forever).
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  const load = useCallback(async () => {
    try { const r = await apiAdminChatGet(id); setT(r.data); setError(''); onChangedRef.current(); } catch (e) { setError(errMsg(e, 'Could not load this conversation.')); }
  }, [id]);
  useEffect(() => { setT(null); void load(); }, [load]);
  useEffect(() => { // new user messages while the thread is open
    const h = window.setInterval(() => { if (!document.hidden) void load(); }, 15000);
    return () => window.clearInterval(h);
  }, [load]);
  // Scroll ONLY the message list to the newest message. scrollIntoView() also scrolled every ancestor, which shifted the
  // whole inbox card sideways (the left column got cut off) whenever a conversation was opened.
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [t?.messages.length]);

  async function send() {
    const v = text.trim(); if (!v || busy) return;
    setBusy(true); setError('');
    try { const r = await apiAdminChatReply(id, v); setT(r.data); setText(''); onChanged(); } catch (e) { setError(errMsg(e, 'Could not send the reply.')); }
    finally { setBusy(false); }
  }
  async function close() {
    setBusy(true); setError('');
    try { await apiAdminChatClose(id); await load(); } catch (e) { setError(errMsg(e, 'Could not close the conversation.')); } finally { setBusy(false); }
  }

  if (!t) return <div className="p-6 text-[13px] text-slate">{error ? <span className="text-error">{error}</span> : 'Loading conversation…'}</div>;
  const closed = t.status === 'closed';
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-bone flex items-start gap-3">
        <button type="button" onClick={onBack} aria-label="Back to the list" className="lg:hidden mt-0.5 p-1 bg-transparent border-0 cursor-pointer text-slate"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-carbon truncate">{t.senderName} <span className="font-normal text-slate">#{t.shortCode}</span></p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5"><RoleBadge row={t} />
            {t.senderEmail && <span className="text-[12px] text-slate">{t.senderEmail}</span>}
            {t.senderPhone && <span className="text-[12px] text-slate">{t.senderPhone}</span>}
          </div>
          {t.userId && <Link to={t.userKind === 'seller' ? '/admin/users?role=seller' : '/admin/users?role=user'} className="text-[12px] text-brand-royal underline">Find the {t.userKind} account in Users</Link>}
        </div>
        {!closed && <Button variant="outline" size="sm" onClick={close} disabled={busy} icon={<CheckCircle2 size={14} />}>Mark closed</Button>}
      </div>
      <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3 flex flex-col gap-2 bg-cream/40" role="log" aria-label="Conversation">
        {t.messages.map(m => (
          <div key={m.id} className={clsx('max-w-[85%] rounded-2xl px-3 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words', m.from === 'admin' ? 'self-end bg-brand-royal text-white' : 'self-start bg-white border border-bone text-carbon')}>
            {m.text}
            <span className={clsx('block text-[11px] mt-1', m.from === 'admin' ? 'text-white/70' : 'text-slate')}>{m.from === 'admin' ? 'Edudeen team' : t.senderName} · {when(m.at)}</span>
          </div>
        ))}
      </div>
      {error && <p role="alert" className="px-4 py-1 text-[12.5px] text-error">{error}</p>}
      {closed ? (
        <p className="px-4 py-3 border-t border-bone text-[13px] text-slate">This conversation is closed. If the user writes again a new one opens.</p>
      ) : (
        <div className="border-t border-bone p-3 flex flex-col gap-2">
          <div className="flex gap-1.5 overflow-x-auto" aria-label="Canned replies">
            {CANNED.map(c => <button key={c} type="button" onClick={() => setText(c)} className="shrink-0 max-w-[220px] truncate text-[12px] rounded-full border border-bone bg-white px-3 py-1 cursor-pointer text-slate hover:border-brand-royal hover:text-brand-royal">{c}</button>)}
          </div>
          <div className="flex items-end gap-2">
            <textarea value={text} onChange={e => setText(e.target.value)} rows={2} maxLength={2000} aria-label="Your reply" placeholder="Type your reply (Enter to send, Shift+Enter for a new line)"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
              className="flex-1 min-w-0 rounded-lg border border-bone px-3 py-2 text-[13.5px] outline-none focus:border-brand-royal resize-none" />
            <Button onClick={send} loading={busy} disabled={!text.trim()} icon={<Send size={14} />}>Send</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminChatInbox({ embedded = false }: { embedded?: boolean } = {}) {
  usePageTitle('Chat inbox');
  const [params, setParams] = useSearchParams();
  const filter = params.get('filter') ?? '';
  const selected = params.get('id');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AdminChatRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ open: 0, answered: 0, closed: 0, unread: 0 });
  const [unavailable, setUnavailable] = useState(false);

  const refresh = useCallback(async () => {
    if (unavailable) { setLoading(false); return; }
    try {
      const [l, s] = await Promise.all([apiAdminChatList({ status: filter || undefined, q: q.trim() || undefined }), apiAdminChatStats()]);
      setRows(l.data.items); setTotal(l.data.total); setStats(s.data); setError('');
    } catch (e) {
      // 404 = the server is running an older API without the chat routes: say so once and stop polling.
      if ((e as { status?: number })?.status === 404) setUnavailable(true);
      setError(errMsg(e, 'Could not load the chat inbox.'));
    }
    finally { setLoading(false); }
  }, [filter, q, unavailable]);
  useEffect(() => { setLoading(true); const h = window.setTimeout(() => void refresh(), q ? 300 : 0); return () => window.clearTimeout(h); }, [refresh, q]);
  useEffect(() => { if (unavailable) return; const h = window.setInterval(() => { if (!document.hidden) void refresh(); }, 20000); return () => window.clearInterval(h); }, [refresh, unavailable]);

  const set = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) n.set(k, v); else n.delete(k); }
    setParams(n, { replace: true });
  };

  return (
    <div>
      {embedded
        ? <p className="px-4 sm:px-7 pt-4 -mb-2 text-[12.5px] text-slate">{`${stats.unread} unread · ${stats.open} open · ${stats.answered} answered · ${stats.closed} closed`}</p>
        : <AdminStudioHeader eyebrow="Edudeen team workspace · People" title="Chat inbox"
          subtitle={`${stats.unread} unread · ${stats.open} open · ${stats.answered} answered · ${stats.closed} closed`} />}
      <div className="px-4 sm:px-7 pt-5 pb-8">
        {unavailable ? (
          <div role="alert" className="bg-white border border-bone rounded-xl p-6 text-center">
            <p className="text-[14px] font-semibold text-carbon m-0 mb-1">The chat inbox is not available on this server yet</p>
            <p className="text-[13px] text-slate m-0">The API this site is connected to does not have the chat routes (404). Deploy the latest API, then reload this page. Nothing is lost - questions asked in the meantime are kept once it is updated.</p>
          </div>
        ) : (
        <div className="bg-white border border-bone rounded-xl overflow-hidden grid lg:grid-cols-[360px_minmax(0,1fr)] h-[calc(100dvh-230px)] min-h-[480px]">
          <div className={clsx('flex-col min-h-0 border-e border-bone', selected ? 'hidden lg:flex' : 'flex')}>
            <div className="p-3 border-b border-bone flex flex-col gap-2">
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, store or #code" aria-label="Search conversations"
                className="rounded-lg border border-bone px-3 py-2 text-[13px] outline-none focus:border-brand-royal" />
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter">
                {FILTERS.map(([k, label]) => (
                  <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => set({ filter: k || null })}
                    className={clsx('px-3 py-1 rounded-full text-[12.5px] font-semibold border cursor-pointer', filter === k ? 'bg-brand-royal text-white border-brand-royal' : 'bg-white text-slate border-bone')}>
                    {label}{k === 'unread' && stats.unread > 0 ? ` (${stats.unread})` : ''}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {error && <div className="p-4 text-[13px] text-error">{error} <button type="button" onClick={() => void refresh()} className="underline bg-transparent border-0 cursor-pointer text-error">Retry</button></div>}
              {!error && loading && rows.length === 0 && <p className="p-4 text-[13px] text-slate">Loading…</p>}
              {!error && !loading && rows.length === 0 && (
                <div className="p-8 text-center text-slate text-[13px]"><MessageCircle size={28} className="mx-auto mb-2" />No conversations here yet.</div>
              )}
              {rows.map(r => (
                <button key={r.id} type="button" onClick={() => set({ id: r.id })} aria-current={selected === r.id ? 'true' : undefined}
                  className={clsx('w-full text-start px-3 py-2.5 border-0 border-b border-bone cursor-pointer block', selected === r.id ? 'bg-brand-royal/10' : 'bg-white hover:bg-cream/60')}>
                  <div className="flex items-center gap-2">
                    <span className={clsx('text-[13.5px] truncate flex-1', r.unreadForAdmin ? 'font-bold text-carbon' : 'font-semibold text-carbon')}>{r.senderName}</span>
                    {r.unreadForAdmin > 0 && <span aria-label={`${r.unreadForAdmin} unread`} className="text-[11px] font-bold px-1.5 rounded-full bg-info text-white">{r.unreadForAdmin}</span>}
                  </div>
                  <div className="mt-0.5"><RoleBadge row={r} /></div>
                  <p className="text-[12.5px] text-slate truncate mt-1">{r.lastFrom === 'admin' ? 'You: ' : ''}{r.preview}</p>
                  <p className="text-[11.5px] text-slate/80 mt-0.5">#{r.shortCode} · {r.status} · {when(r.lastMessageAt)}</p>
                </button>
              ))}
              {total > rows.length && <p className="p-3 text-[12px] text-slate text-center">Showing the newest {rows.length} of {total}. Use search to narrow down.</p>}
            </div>
          </div>
          <div className={clsx('min-h-0', selected ? 'flex flex-col' : 'hidden lg:flex lg:flex-col')}>
            {selected ? <Thread id={selected} onChanged={() => void refresh()} onBack={() => set({ id: null })} />
              : <div className="m-auto p-8 text-center text-slate text-[13px]"><MessageCircle size={32} className="mx-auto mb-2" />Select a conversation to read and reply.</div>}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
