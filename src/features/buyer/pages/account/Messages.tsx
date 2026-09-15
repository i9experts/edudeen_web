import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { Ban, Flag, Trash2 } from 'lucide-react';
import { useGetProfile } from '@/hooks/auth/useGetProfile';
import { useConversations, useSearchConversations } from '@/hooks/messaging/useConversations';
import { useMessages } from '@/hooks/messaging/useMessages';
import { useModeration } from '@/hooks/messaging/useModeration';
import { usePresence } from '@/hooks/messaging/usePresence';
import { useRecentSearches } from '@/hooks/messaging/useRecentSearches';
import { apiUploadAttachment, apiDeleteConversation, type Conversation, type MessageType } from '@/api/services/messaging';
import { ChatList, ChatWindow, type ChatListEntry, type ChatListFilter } from '@/components/comman/messaging';
import { Card, PageHeader, type ActionMenuItem } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';

const TYPE_PREVIEW: Partial<Record<MessageType, string>> = {
  voice: 'Voice note', image: 'Photo', video: 'Video', pdf: 'File', document: 'File', product_share: 'Product shared',
};

// NOTE: buyer role has no archive/pin/mute — those messaging actions are
// seller-only per the API. Buyer can start/search/delete conversations,
// send/edit/delete messages, and block/report a seller.
function toBuyerEntry(c: Conversation, online: Record<string, boolean>): ChatListEntry {
  return {
    id:          c._id,
    name:        c.store?.name ?? `Seller #${c.sellerId?.slice(-6).toUpperCase() ?? '——'}`,
    image:       c.store?.logo,
    preview:     c.lastMessage ? (c.lastMessage.type === 'text' ? (c.lastMessage.text ?? '') : (TYPE_PREVIEW[c.lastMessage.type] ?? 'Message')) : 'No messages yet',
    previewType: c.lastMessage?.type,
    time:        c.lastMessage ? new Date(c.lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    unread:      c.buyerUnread,
    online:      online[c.sellerId],
    verified:    c.store?.badges?.includes('verified'),
  };
}

export function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConversationId = searchParams.get('conversation');

  const toast = useToast();
  const { profile } = useGetProfile();
  const { conversations, loading: listLoading, error: listError, refetch: refetchList } = useConversations();
  const { results: searchResults, search, loading: searching } = useSearchConversations();
  const { recent, commit, clear } = useRecentSearches('buyer-inbox');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>(() => (searchParams.get('filter') === 'unread' ? 'unread' : 'all'));

  const isSearching = query.trim().length >= 2;
  const baseList = isSearching ? searchResults : conversations;
  const list = filter === 'unread' ? baseList.filter(c => c.buyerUnread > 0) : baseList;
  const unreadCount = conversations.filter(c => c.buyerUnread > 0).length;

  const filters: ChatListFilter[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread', count: unreadCount },
  ];

  const sellerIds = useMemo(() => conversations.map(c => c.sellerId), [conversations]);
  const online = usePresence(sellerIds);

  const [activeId, setActiveId] = useState<string | null>(initialConversationId ?? null);
  const active = list.find(c => c._id === activeId) ?? conversations.find(c => c._id === activeId) ?? null;

  useEffect(() => {
    if (initialConversationId) setActiveId(initialConversationId);
  }, [initialConversationId]);

  // Keep the open conversation + filter tab reflected in the URL so a
  // refresh/share/back-button reproduces the same view — same convention
  // used across the other buyer pages.
  useEffect(() => {
    const next = new URLSearchParams();
    if (activeId) next.set('conversation', activeId);
    if (filter === 'unread') next.set('filter', filter);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, filter]);

  const {
    messages, loading: msgLoading, loadingMore, sending, send, retry, edit, remove, markSeen, hasMore, loadMore,
    otherOnline, otherTyping, sendTyping, error: msgError,
  } = useMessages(activeId);
  const { block, unblock, report } = useModeration();

  const [uploading, setUploading] = useState(false);
  const [blockedSellerId, setBlockedSellerId] = useState<string | null>(null);

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

  const handleSearch = (v: string) => {
    setQuery(v);
    if (v.trim().length >= 2) search(v.trim());
  };

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
    void block({ targetId: active.sellerId, targetRole: 'seller', reason: 'Blocked from buyer inbox' }).then(ok => {
      if (ok) { setBlockedSellerId(active.sellerId); toast.success('Seller blocked'); }
      else toast.error('Failed to block seller');
    });
  };
  const handleUnblock = () => {
    if (!blockedSellerId) return;
    void unblock(blockedSellerId).then(ok => {
      if (ok) { setBlockedSellerId(null); toast.success('Seller unblocked'); }
      else toast.error('Failed to unblock seller');
    });
  };
  const handleReport = () => {
    if (!active) return;
    void report({ targetType: 'conversation', targetId: active._id, reason: 'inappropriate', details: 'Reported from buyer inbox' }).then(ok => {
      toast[ok ? 'success' : 'error'](ok ? 'Conversation reported' : 'Failed to report conversation');
    });
  };
  const handleDelete = async () => {
    if (!active) return;
    try {
      await apiDeleteConversation(active._id);
      setActiveId(null);
      refetchList();
      toast.success('Chat deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete chat');
    }
  };

  const menuItems: ActionMenuItem[] = active ? [
    blockedSellerId === active.sellerId
      ? { label: 'Unblock seller', icon: <Ban size={14} />, onClick: handleUnblock }
      : { label: 'Block seller',   icon: <Ban size={14} />, onClick: handleBlock },
    { label: 'Report conversation', icon: <Flag size={14} />, onClick: handleReport },
    { label: 'Delete chat', icon: <Trash2 size={14} />, onClick: () => void handleDelete(), danger: true },
  ] : [];

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Desktop only — on mobile, AccountLayout's own top bar already shows
         "Messages" with a back arrow, and ChatList below has its own title
         too, so this would be a third repeat of the same word on one screen. */}
      <div className="hidden lg:block">
        <PageHeader eyebrow="Account" title="Messages" description="Chat with sellers about your orders and questions." />
      </div>
      <Card padding="none" className="flex-1 min-h-0 min-h-[560px] -mx-4 rounded-none border-x-0 lg:mx-0 lg:rounded-xl lg:border-x">
        <div className="flex overflow-hidden h-full">
          {/* This wrapper had no width of its own — a plain flex item with
             no flex-grow shrinks to content, so ChatList's `w-full` below
             was resolving against an undefined/shrunk parent instead of
             the actual screen width. `w-full` here (mobile) fixes that;
             `md:w-auto md:shrink-0` lets ChatList's own fixed/resizable
             width (`md:w-[var(--list-w)]`) take over at the two-pane
             breakpoint instead of stretching further than that. */}
          <div className={clsx(activeId ? 'hidden md:flex' : 'flex', 'w-full md:w-auto md:shrink-0')}>
            <ChatList
              title="Messages"
              entries={list.map(c => toBuyerEntry(c, online))}
              activeId={activeId}
              onSelect={setActiveId}
              query={query}
              onQueryChange={handleSearch}
              loading={isSearching ? searching : listLoading}
              error={listError}
              filters={filters}
              activeFilter={filter}
              onFilterChange={id => setFilter(id as 'all' | 'unread')}
              recentSearches={recent}
              onSelectRecentSearch={q => { setQuery(q); handleSearch(q); }}
              onClearRecentSearches={clear}
              onCommitSearch={commit}
              resizeStorageKey="edudeen:buyer-inbox-width"
            />
          </div>

          <ChatWindow
            open={!!active}
            headerName={active ? (active.store?.name ?? `Seller #${active.sellerId?.slice(-6).toUpperCase() ?? '——'}`) : ''}
            headerImage={active?.store?.logo}
            headerVerified={active?.store?.badges?.includes('verified')}
            menuItems={menuItems}
            onBack={() => setActiveId(null)}
            messages={messages}
            msgLoading={msgLoading}
            loadingMore={loadingMore}
            currentUserId={profile?._id}
            otherPartyId={active?.sellerId ?? ''}
            hasMore={hasMore}
            onLoadMore={loadMore}
            sending={sending}
            uploading={uploading}
            onSend={payload => void send(payload)}
            onUpload={file => void handleUpload(file)}
            onEditMessage={(id, text) => void edit(id, text)}
            onDeleteMessage={id => void remove(id)}
            onRetry={(m, payload) => m._tempId && retry(m._tempId, payload)}
            otherOnline={otherOnline}
            otherTyping={otherTyping}
            onTyping={sendTyping}
            conversationId={activeId}
            storeId={active?.storeId}
            error={msgError}
          />
        </div>
      </Card>
    </div>
  );
}
