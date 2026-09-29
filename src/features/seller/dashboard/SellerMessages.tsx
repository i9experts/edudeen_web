import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pin, PinOff, Bell, BellOff, Archive, ArchiveRestore, Ban, Flag, Trash2, Package } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { SellerPageHeader } from '@/components/layouts/SellerLayout';
import { useGetProfile } from '@/hooks/auth/useGetProfile';
import { useConversations, useSearchConversations } from '@/hooks/messaging/useConversations';
import { useConversation } from '@/hooks/messaging/useConversation';
import { useMessages } from '@/hooks/messaging/useMessages';
import { useModeration } from '@/hooks/messaging/useModeration';
import { usePresence } from '@/hooks/messaging/usePresence';
import { useRecentSearches } from '@/hooks/messaging/useRecentSearches';
import { apiUploadAttachment, type Conversation, type MessageType } from '@/api/services/messaging';
import { ChatList, ChatWindow, type ChatListEntry, type ChatListFilter } from '@/components/comman/messaging';
import type { ActionMenuItem } from '@/components/comman/ui';

const TYPE_PREVIEW: Partial<Record<MessageType, string>> = {
  voice: 'Voice note', image: 'Photo', video: 'Video', pdf: 'File', document: 'File', product_share: 'Product shared',
};

type FilterId = 'all' | 'unread' | 'pinned' | 'archived';

function toEntry(c: Conversation, online: Record<string, boolean>): ChatListEntry {
  return {
    id:          c._id,
    name:        c.buyer?.name ?? `Buyer #${c.buyerId?.slice(-6).toUpperCase() ?? '——'}`,
    image:       c.buyer?.profileImage,
    preview:     c.lastMessage ? (c.lastMessage.type === 'text' ? (c.lastMessage.text ?? '') : (TYPE_PREVIEW[c.lastMessage.type] ?? 'Message')) : 'No messages yet',
    previewType: c.lastMessage?.type,
    time:        c.lastMessage ? new Date(c.lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
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

  const [filter, setFilter] = useState<FilterId>('all');
  // "All" hides archived (matches WhatsApp/Telegram convention); "Archived" shows only those.
  const { conversations, loading: listLoading, error: listError, refetch: refetchList } =
    useConversations(storeId ? { storeId, isArchived: filter === 'archived' } : undefined);
  const { results: searchResults, search, loading: searching } = useSearchConversations();
  const { recent, commit, clear } = useRecentSearches(`seller-inbox:${storeId ?? ''}`);
  const [query, setQuery] = useState('');

  const isSearching = query.trim().length >= 2;
  const baseList = isSearching ? searchResults : conversations;
  const list = filter === 'unread' ? baseList.filter(c => c.sellerUnread > 0)
    : filter === 'pinned' ? baseList.filter(c => c.isPinned)
    : baseList;

  const unreadCount = conversations.filter(c => c.sellerUnread > 0).length;
  const pinnedCount = conversations.filter(c => c.isPinned).length;
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

  const [activeId, setActiveId] = useState<string | null>(null);
  const { conversation, pin, mute, archive, restore, remove } = useConversation(activeId);
  const {
    messages, loading: msgLoading, loadingMore, sending, send, retry, edit, remove: removeMessage, markSeen, hasMore, loadMore,
    otherOnline, otherTyping, sendTyping, error: msgError,
  } = useMessages(activeId);
  const { block, unblock, report } = useModeration();

  const [blockedBuyerId, setBlockedBuyerId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const active = conversation ?? list.find(c => c._id === activeId) ?? null;

  // Mark the latest incoming message as seen once the thread is open.
  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.senderId !== profile?._id) {
      // Don't rely solely on the 'conversation:update' socket echo to clear
      // this conversation's unread badge — refetch directly so it's correct
      // even if that event was missed (e.g. a socket reconnect gap).
      void markSeen(last._id).then(refetchList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, messages.length]);

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
    void block({ targetId: active.buyerId, targetRole: 'user', reason: 'Blocked from seller inbox' }).then(ok => {
      if (ok) setBlockedBuyerId(active.buyerId);
    });
  };
  const handleUnblock = () => {
    if (!blockedBuyerId) return;
    void unblock(blockedBuyerId).then(ok => { if (ok) setBlockedBuyerId(null); });
  };
  const handleReport = () => {
    if (!active) return;
    void report({ targetType: 'conversation', targetId: active._id, reason: 'inappropriate', details: 'Reported from seller inbox' });
  };
  const handleDelete = async () => {
    if (!activeId) return;
    await remove();
    setActiveId(null);
    refetchList();
  };

  const menuItems: ActionMenuItem[] = active ? [
    { label: active.isPinned ? 'Unpin conversation' : 'Pin conversation', icon: active.isPinned ? <PinOff size={14} /> : <Pin size={14} />, onClick: () => void pin(!active.isPinned) },
    { label: active.isMuted  ? 'Unmute notifications' : 'Mute notifications', icon: active.isMuted ? <Bell size={14} /> : <BellOff size={14} />, onClick: () => void mute(!active.isMuted) },
    { label: active.isArchived ? 'Restore chat' : 'Archive chat', icon: active.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />, onClick: () => void (active.isArchived ? restore() : archive()) },
    blockedBuyerId === active.buyerId
      ? { label: 'Unblock buyer', icon: <Ban size={14} />, onClick: handleUnblock }
      : { label: 'Block buyer',   icon: <Ban size={14} />, onClick: handleBlock },
    { label: 'Report conversation', icon: <Flag size={14} />, onClick: handleReport },
    { label: 'Delete chat', icon: <Trash2 size={14} />, onClick: () => void handleDelete(), danger: true },
  ] : [];

  return (
    <>
      <SellerPageHeader
        title="Messages"
        subtitle="Respond to buyer questions and support requests."
        actions={
          <span className="px-3 py-1 bg-[#fdecea] rounded-[6px] text-xs font-semibold text-[#c0392b]">
            {conversations.reduce((n, c) => n + c.sellerUnread, 0)} Unread
          </span>
        }
      />

      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 124px)' }}>
        <div className={activeId ? 'hidden md:flex md:w-auto md:shrink-0' : 'flex w-full md:w-auto md:shrink-0'}>
          <ChatList
            title="Chats"
            entries={list.map(c => toEntry(c, online))}
            activeId={activeId}
            onSelect={setActiveId}
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
          onBack={() => setActiveId(null)}
          shortcuts={storeId ? [{ icon: <Package size={17} />, label: 'View Orders', onClick: () => navigate(`/store/${storeId}/orders`) }] : []}
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
      </div>
    </>
  );
}
