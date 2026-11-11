import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Pin, PinOff, Bell, BellOff, Archive, ArchiveRestore, Ban, Flag, Trash2, Package } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { StorePageHeader } from '@/components/layouts/StoreLayout';
import { useGetProfile } from '@/hooks/auth/useGetProfile';
import { useConversations, useSearchConversations } from '@/hooks/messaging/useConversations';
import { useConversation } from '@/hooks/messaging/useConversation';
import { useMessages } from '@/hooks/messaging/useMessages';
import { useModeration } from '@/hooks/messaging/useModeration';
import { usePresence } from '@/hooks/messaging/usePresence';
import { useRecentSearches } from '@/hooks/messaging/useRecentSearches';
import { apiUploadAttachment, type Conversation, type MessageType } from '@/api/services/messaging';
import { ChatList, ChatWindow, type ChatListEntry, type ChatListFilter } from '@/components/comman/messaging';
import { Modal, Button, Select, Textarea, type ActionMenuItem } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { chatListTime } from '@/utils/localeTime';
import { setSharedUnreadMessages } from '@/hooks/store/useStoreDashboardSummary';
import { useStoreWorkspace } from '@/components/layouts/StoreWorkspaceContext';
import { BuyerDetailsBody, ChatContextCard, useBuyerContext } from './BuyerDetails';

const TYPE_PREVIEW: Partial<Record<MessageType, string>> = {
  voice: 'Voice note', image: 'Photo', video: 'Video', pdf: 'File', document: 'File', product_share: 'Product shared',
};

// Mirrors the backend ReportDto `reason` enum (messaging/dto/report.dto.ts).
const REPORT_REASONS = [
  { value: 'spam',                  label: 'Spam' },
  { value: 'harassment',            label: 'Harassment' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'fraud',                 label: 'Fraud or scam' },
  { value: 'other',                 label: 'Other' },
] as const;

type FilterId = 'all' | 'unread' | 'pinned' | 'archived';

// A seller cannot start a chat with a buyer (only from the Students page), so no "start a conversation" hint here.
const EMPTY_TEXT: Record<FilterId, { title: string; description: string }> = {
  all:      { title: 'No conversations yet',        description: 'Buyer messages will show up here.' },
  unread:   { title: "You've read all your messages", description: '' },
  pinned:   { title: 'No pinned chats',             description: '' },
  archived: { title: 'No archived chats',           description: '' },
};

function toEntry(c: Conversation, online: Record<string, boolean>): ChatListEntry {
  return {
    id:          c._id,
    name:        c.buyer?.name ?? `Buyer #${c.buyerId?.slice(-6).toUpperCase() ?? '——'}`,
    image:       c.buyer?.profileImage,
    preview:     c.lastMessage ? (c.lastMessage.type === 'text' ? (c.lastMessage.text ?? '') : (TYPE_PREVIEW[c.lastMessage.type] ?? 'Message')) : 'No messages yet',
    previewType: c.lastMessage?.type,
    time:        c.lastMessage ? chatListTime(c.lastMessage.sentAt) : '',
    unread:      c.sellerUnread,
    pinned:      c.isPinned,
    muted:       c.isMuted,
    archived:    c.isArchived,
    online:      online[c.buyerId],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SellerMessages() {
  usePageTitle('Messages');
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { profile } = useGetProfile();
  const workspace = useStoreWorkspace();

  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  // `?filter=unread` lets Store Health link straight to the chats waiting for a reply.
  const [filter, setFilter] = useState<FilterId>(() => (searchParams.get('filter') === 'unread' ? 'unread' : 'all'));
  // "All" hides archived (matches WhatsApp/Telegram convention); "Archived" shows only those.
  // ONE definition of "unread": a non-archived chat with sellerUnread > 0. The Unread tab count and the sidebar badge
  // (server count, same rule) both follow it. The archived list is only shown on the Archived tab.
  const inbox = useConversations(storeId ? { storeId, isArchived: false, limit: 50 } : undefined);
  const archivedInbox = useConversations(storeId ? { storeId, isArchived: true, limit: 50 } : undefined);
  const { conversations, loading: listLoading, error: listError } = filter === 'archived' ? archivedInbox : inbox;
  const unreadCount = inbox.conversations.filter(c => c.sellerUnread > 0).length;
  const { results: searchResults, search, loading: searching } = useSearchConversations();
  const { recent, commit, clear } = useRecentSearches(`seller-inbox:${storeId ?? ''}`);
  const [query, setQuery] = useState('');

  const isSearching = query.trim().length >= 2;
  const baseList = isSearching ? searchResults : conversations;
  const list = filter === 'unread' ? baseList.filter(c => c.sellerUnread > 0)
    : filter === 'pinned' ? baseList.filter(c => c.isPinned)
    : baseList;

  const pinnedCount = inbox.conversations.filter(c => c.isPinned).length;
  const filters: ChatListFilter[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'pinned', label: 'Pinned', count: pinnedCount },
    { id: 'archived', label: 'Archived' },
  ];

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const id = setTimeout(() => search(trimmed, storeId), 300);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, storeId]);

  const buyerIds = useMemo(() => conversations.map(c => c.buyerId), [conversations]);
  const online = usePresence(buyerIds);

  // The open chat lives in the URL: `?c=<id>` (`?conv=<id>` from the Customers/Students panels is the same state).
  // Refresh / Back return to the same chat; a bad id is ignored.
  const rawId = searchParams.get('c') ?? searchParams.get('conv');
  const activeId = rawId && /^[a-f0-9]{24}$/i.test(rawId) ? rawId : null;
  const selectChat = useCallback((id: string) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('c', id); n.delete('conv'); return n; });
  }, [setSearchParams]);
  const closeChat = useCallback(() => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete('c'); n.delete('conv'); return n; }, { replace: true });
  }, [setSearchParams]);
  const { conversation, loading: convLoading, error: convError, pin, mute, archive, restore, remove } = useConversation(activeId);
  // Unknown / not-yours id: quietly drop it and show the list.
  useEffect(() => {
    if (activeId && !convLoading && convError && !conversation) closeChat();
  }, [activeId, convLoading, convError, conversation, closeChat]);
  const {
    messages, loading: msgLoading, loadingMore, sending, send, retry, edit, remove: removeMessage, markSeen, hasMore, loadMore,
    otherOnline, otherTyping, sendTyping, error: msgError,
  } = useMessages(activeId);
  const { block, unblock, report, loading: modLoading, error: modError } = useModeration();

  // Block state comes from the conversation itself (backend mirrors blocks
  // into `blockedBySeller`); this map only holds changes made in this session.
  const [blockOverrides, setBlockOverrides] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [reportOpen, setReportOpen]       = useState(false);
  const [reportReason, setReportReason]   = useState<string>(REPORT_REASONS[0].value);
  const [reportDetails, setReportDetails] = useState('');
  const [reportDone, setReportDone]       = useState(false);

  const active = conversation ?? list.find(c => c._id === activeId) ?? null;

  // Buyer details: product/order the buyer asked about + this store's orders from them. Desktop = collapsible side
  // panel (open by default only on very wide screens so the chat keeps its width), phones = bottom sheet.
  const buyerCtx = useBuyerContext(activeId);
  const [detailsOpen, setDetailsOpen] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1536px)').matches);
  const [isLg, setIsLg] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return;
    const on = () => setIsLg(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const buyerName = active ? (active.buyer?.name ?? `Buyer #${active.buyerId?.slice(-6).toUpperCase() ?? '——'}`) : '';
  const activeBlocked = active
    ? (blockOverrides[active.buyerId] ?? !!active.blockedBySeller)
    : false;

  // Opening a chat marks everything incoming as read - once per latest incoming message (one open = one call).
  // The list row, the Unread tab and the sidebar badge drop at once (absolute values, so the socket echo cannot
  // double-count); on failure they are put back and a toast says so.
  const markedRef = useRef('');
  useEffect(() => {
    if (!activeId || !storeId || msgLoading || !profile?._id) return;
    // Only messages of THIS chat: right after switching chats the list can still hold the previous chat's messages,
    // and the API answers 400 "Message does not belong to this conversation" (so the unread count never cleared).
    const incoming = [...messages].reverse().find(m => !m._tempId && m.conversationId === activeId && m.senderId !== profile._id);
    if (!incoming) return;
    const key = `${activeId}:${incoming._id}`;
    if (markedRef.current === key) return;
    markedRef.current = key;
    const before = inbox.conversations.find(c => c._id === activeId)?.sellerUnread ?? 0;
    if (before > 0) {
      inbox.patch(activeId, { sellerUnread: 0 });
      setSharedUnreadMessages(storeId, n => n - 1, false);
    }
    markSeen(incoming._id).then(
      () => { setSharedUnreadMessages(storeId, n => n, true); },   // quiet re-read: the server stays the final word
      () => {
        markedRef.current = '';
        if (before > 0) { inbox.patch(activeId, { sellerUnread: before }); setSharedUnreadMessages(storeId, n => n + 1, true); }
        toast.error('Could not mark this chat as read.');
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, messages, msgLoading, profile?._id]);

  const handleSearch = (v: string) => setQuery(v);

  const handleUpload = async (file: File) => {
    if (!activeId) return;
    setUploading(true);
    try {
      const attachment = await apiUploadAttachment(activeId, file);
      const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'voice' : file.type === 'application/pdf' ? 'pdf' : 'document';
      await send({ type: kind, attachments: [attachment] });
    } finally {
      setUploading(false);
    }
  };

  const handleBlock = () => {
    if (!active) return;
    const buyerId = active.buyerId;
    void block({ targetId: buyerId, targetRole: 'user', reason: 'Blocked from seller inbox' }).then(ok => {
      if (ok) setBlockOverrides(prev => ({ ...prev, [buyerId]: true }));
    });
  };
  const handleUnblock = () => {
    if (!active) return;
    const buyerId = active.buyerId;
    void unblock(buyerId).then(ok => { if (ok) setBlockOverrides(prev => ({ ...prev, [buyerId]: false })); });
  };
  const openReport = () => {
    setReportReason(REPORT_REASONS[0].value);
    setReportDetails('');
    setReportDone(false);
    setReportOpen(true);
  };
  const submitReport = () => {
    if (!active) return;
    void report({
      targetType: 'conversation', targetId: active._id, reason: reportReason,
      details: reportDetails.trim() || 'Reported from seller inbox',
    }).then(ok => { if (ok) setReportDone(true); });
  };
  const handleDelete = async () => {
    if (!activeId) return;
    await remove();
    closeChat();
    void inbox.refetch(true);
    void archivedInbox.refetch(true);
  };

  const menuItems: ActionMenuItem[] = active ? [
    { label: active.isPinned ? 'Unpin conversation' : 'Pin conversation', icon: active.isPinned ? <PinOff size={14} /> : <Pin size={14} />, onClick: () => void pin(!active.isPinned) },
    { label: active.isMuted  ? 'Unmute notifications' : 'Mute notifications', icon: active.isMuted ? <Bell size={14} /> : <BellOff size={14} />, onClick: () => void mute(!active.isMuted) },
    { label: active.isArchived ? 'Restore chat' : 'Archive chat', icon: active.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />, onClick: () => void (active.isArchived ? restore() : archive()) },
    activeBlocked
      ? { label: 'Unblock buyer', icon: <Ban size={14} />, onClick: handleUnblock }
      : { label: 'Block buyer',   icon: <Ban size={14} />, onClick: handleBlock },
    { label: 'Report conversation', icon: <Flag size={14} />, onClick: openReport },
    { label: 'Delete chat', icon: <Trash2 size={14} />, onClick: () => void handleDelete(), danger: true },
  ] : [];

  return (
    <>
      <StorePageHeader
        title="Messages"
        subtitle="Respond to buyer questions and support requests."
      />

      <div className="relative flex overflow-hidden" style={{ height: 'calc(100vh - 124px)' }}>
        <div className={activeId ? 'hidden md:flex md:w-auto md:shrink-0' : 'flex w-full md:w-auto md:shrink-0'}>
          <ChatList
            title="Chats"
            entries={list.map(c => toEntry(c, online))}
            activeId={activeId}
            onSelect={selectChat}
            emptyTitle={EMPTY_TEXT[filter].title}
            emptyDescription={EMPTY_TEXT[filter].description}
            query={query}
            onQueryChange={handleSearch}
            loading={isSearching ? searching : listLoading}
            error={listError}
            filters={filters}
            activeFilter={filter}
            onFilterChange={id => setFilter(id as FilterId)}
            recentSearches={recent}
            onSelectRecentSearch={q => { setQuery(q); }}
            onClearRecentSearches={clear}
            onCommitSearch={commit}
            resizeStorageKey="edudeen:seller-inbox-width"
          />
        </div>

        <ChatWindow
          open={!!active}
          headerName={active ? (active.buyer?.name ?? `Buyer #${active.buyerId?.slice(-6).toUpperCase() ?? '——'}`) : ''}
          headerImage={active?.buyer?.profileImage}
          subtitleOverride={active ? (active.isArchived ? 'Archived' : active.isMuted ? 'Muted' : undefined) : undefined}
          menuItems={menuItems}
          onBack={closeChat}
          shortcuts={storeId && active ? [{ icon: <Package size={17} />, label: 'View Orders', onClick: () => navigate(`/store/${storeId}/orders?tab=all&buyer=${active.buyerId}`) }] : []}
          contextCard={storeId ? <ChatContextCard ctx={buyerCtx.data} storeId={storeId} /> : undefined}
          quickReplies={storeId && active ? { storeId, buyerName: active.buyer?.name ?? '', storeName: workspace.store?.name ?? '' } : undefined}
          onDetailsClick={() => setDetailsOpen(o => !o)}
          detailsActive={detailsOpen}
          messages={messages}
          msgLoading={msgLoading}
          loadingMore={loadingMore}
          currentUserId={profile?._id}
          otherPartyId={active?.buyerId ?? ''}
          hasMore={hasMore}
          onLoadMore={loadMore}
          sending={sending}
          uploading={uploading}
          onSend={payload => void send(payload)}
          onUpload={file => void handleUpload(file)}
          onEditMessage={(id, text) => void edit(id, text)}
          onDeleteMessage={id => void removeMessage(id)}
          onRetry={(m, payload) => m._tempId && retry(m._tempId, payload)}
          otherOnline={otherOnline}
          otherTyping={otherTyping}
          onTyping={sendTyping}
          conversationId={activeId}
          storeId={storeId}
          error={msgError}
        />

        {/* Desktop: side panel (overlay below 2xl so the chat never drops under ~560px, inline at 2xl+). */}
        {active && storeId && detailsOpen && (
          <aside aria-label="Buyer details" className="hidden lg:block absolute end-0 top-0 bottom-0 z-10 w-[300px] overflow-y-auto border-s border-[#eeece4] bg-white p-4 shadow-lg 2xl:static 2xl:shadow-none 2xl:shrink-0">
            <BuyerDetailsBody state={buyerCtx} storeId={storeId} buyerName={buyerName} />
          </aside>
        )}
      </div>

      {/* Phones/tablets: bottom sheet */}
      {active && storeId && detailsOpen && !isLg && (
        <Modal title="Buyer details" onClose={() => setDetailsOpen(false)} width={420} mobileSheet>
          <BuyerDetailsBody state={buyerCtx} storeId={storeId} buyerName={buyerName} />
        </Modal>
      )}

      {reportOpen && (
        <Modal
          title="Report conversation"
          onClose={() => setReportOpen(false)}
          width={440}
          mobileSheet
          footer={reportDone ? (
            <Button variant="primary" size="sm" onClick={() => setReportOpen(false)}>Done</Button>
          ) : (
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setReportOpen(false)} disabled={modLoading}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={submitReport} loading={modLoading}>Submit report</Button>
            </div>
          )}
        >
          {reportDone ? (
            <p className="text-[13px] text-carbon">Thanks — the Edudeen team will review this conversation.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <Select label="Reason" value={reportReason} onChange={e => setReportReason(e.target.value)}>
                {REPORT_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
              <Textarea
                label="Details (optional)"
                value={reportDetails}
                maxLength={500}
                onChange={e => setReportDetails(e.target.value)}
                placeholder="What happened?"
              />
              {modError && <p role="alert" className="text-[12.5px] text-error font-medium">{modError}</p>}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
