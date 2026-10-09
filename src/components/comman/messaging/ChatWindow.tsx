import { useState } from 'react';
import { MessageCircle, Search, X, Store as StoreIcon } from 'lucide-react';
import type { ActionMenuItem } from '@/components/comman/ui';
import type { Message, SendMessagePayload } from '@/api/services/messaging';
import type { OptimisticMessage } from '@/hooks/messaging/useMessages';
import { useSearchMessages } from '@/hooks/messaging/useMessages';
import { useEdgeSwipeBack } from '@/hooks/useEdgeSwipeBack';
import { ChatHeader, type ChatHeaderShortcut } from './ChatHeader';
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import { ProductShareModal } from './ProductShareModal';

interface ChatWindowProps {
  open:            boolean;
  headerName:      string;
  headerImage?:    string | null;
  headerVerified?: boolean;
  /** Overrides the online/typing-derived subtitle (e.g. "Archived", "Muted"). */
  subtitleOverride?: string;
  menuItems:       ActionMenuItem[];
  onBack?:         () => void;
  shortcuts?:      ChatHeaderShortcut[];

  messages:        OptimisticMessage[];
  msgLoading:      boolean;
  currentUserId?:  string;
  otherPartyId:    string;
  hasMore:         boolean;
  loadingMore?:    boolean;
  onLoadMore:      () => void;

  sending:         boolean;
  uploading:       boolean;
  onSend:          (payload: SendMessagePayload) => void;
  onUpload:        (file: File) => void;
  onEditMessage:   (id: string, text: string) => void;
  onDeleteMessage: (id: string) => void;
  onRetry:         (message: OptimisticMessage, payload: SendMessagePayload) => void;

  otherOnline?:    boolean;
  otherTyping?:    boolean;
  onTyping?:       (isTyping: boolean) => void;
  conversationId?: string | null;
  /** Surfaces useMessages()'s error state — covers both REST failures (load/send)
   *  and the socket's `messaging:error` (e.g. no longer authorized for this
   *  conversation), which previously had no listener at all. */
  error?:          string;

  /** Present only when the conversation has a browsable store catalog — enables "Share Product". */
  storeId?:        string;
}

function payloadFromMessage(m: OptimisticMessage): SendMessagePayload | null {
  if (m.type === 'text') return { type: 'text', text: m.text ?? '', ...(m.replyTo ? { replyTo: m.replyTo } : {}) };
  if (m.type === 'product_share' && m.productShare) return { type: 'product_share', productShare: { productId: m.productShare.productId } };
  if (['image', 'video', 'pdf', 'document', 'voice'].includes(m.type) && (m.attachments?.length ?? 0)) {
    return { type: m.type as 'image' | 'video' | 'pdf' | 'document' | 'voice', attachments: m.attachments, ...(m.replyTo ? { replyTo: m.replyTo } : {}) };
  }
  return null;
}

// The full right-hand pane: header, message thread, composer — the piece
// every role's messaging page mounts once a conversation is selected.
// Reply/edit/compose state lives here since it's pure UI state that
// resets per-conversation and doesn't need to leak into the page.
export function ChatWindow({
  open, headerName, headerImage, headerVerified, subtitleOverride, menuItems, onBack, shortcuts,
  messages, msgLoading, currentUserId, otherPartyId, hasMore, loadingMore, onLoadMore,
  sending, uploading, onSend, onUpload, onEditMessage, onDeleteMessage, onRetry,
  otherOnline, otherTyping, onTyping, conversationId, storeId, error,
}: ChatWindowProps) {
  const [text,      setText]      = useState('');
  const [replyTo,   setReplyTo]   = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText,  setEditText]  = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showProductShare, setShowProductShare] = useState(false);
  const [sharingProduct, setSharingProduct] = useState(false);
  const [query, setQuery] = useState('');
  const { results, search, loading: searching } = useSearchMessages(conversationId ?? null);
  const swipeHandlers = useEdgeSwipeBack(onBack);

  if (!open) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center gap-3 bg-cream text-center px-8">
        <div className="w-16 h-16 rounded-full bg-brand-pale-orange flex items-center justify-center">
          <MessageCircle size={28} className="text-brand-orange" />
        </div>
        <div>
          <p className="text-[15px] font-bold text-charcoal">Your messages</p>
          <p className="text-[13px] text-slate mt-1">Select a conversation to start chatting.</p>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (!text.trim()) return;
    onSend({ type: 'text', text: text.trim(), ...(replyTo ? { replyTo: { messageId: replyTo._id, text: replyTo.text, type: replyTo.type, senderId: replyTo.senderId, senderRole: replyTo.senderRole } } : {}) });
    setText('');
    setReplyTo(null);
    onTyping?.(false);
  };

  const handleChangeText = (v: string) => {
    setText(v);
    onTyping?.(v.trim().length > 0);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return;
    onEditMessage(editingId, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  const handleRetry = (m: OptimisticMessage) => {
    const payload = payloadFromMessage(m);
    if (payload) onRetry(m, payload);
  };

  const handleShareProduct = (productId: string) => {
    setSharingProduct(true);
    onSend({ type: 'product_share', productShare: { productId } });
    setShowProductShare(false);
    setSharingProduct(false);
  };

  function handleSearchChange(v: string) {
    setQuery(v);
    if (v.trim().length >= 2) search(v.trim());
  }

  const headerShortcuts: ChatHeaderShortcut[] = [
    ...(storeId ? [{ icon: <StoreIcon size={17} />, label: 'View Store', onClick: () => window.open(`/store/${storeId}`, '_blank') }] : []),
    ...(shortcuts ?? []),
  ];

  return (
    <div
      className="flex-1 flex flex-col min-w-0 h-full transition-transform duration-200 ease-out"
      {...swipeHandlers}
    >
      <ChatHeader
        name={headerName}
        image={headerImage}
        online={otherOnline}
        typing={otherTyping}
        verified={headerVerified}
        subtitleOverride={subtitleOverride}
        menuItems={menuItems}
        onBack={onBack}
        onSearchClick={conversationId ? () => setShowSearch(s => !s) : undefined}
        searchActive={showSearch}
        shortcuts={headerShortcuts}
      />

      {showSearch && conversationId && (
        <div className="border-b border-[#eeece4] bg-white px-4 py-[10px] transition-all duration-200 ease-out starting:opacity-0 starting:-translate-y-1">
          <div className="flex items-center gap-2 bg-cream rounded-full px-3.5 py-2">
            <Search size={14} className="text-slate shrink-0" />
            <input autoFocus value={query} onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search messages…" aria-label="Search messages in this conversation"
              className="flex-1 bg-transparent border-none outline-none text-[13px] text-charcoal" />
            <button onClick={() => { setShowSearch(false); setQuery(''); }} aria-label="Close search" className="bg-transparent border-none cursor-pointer text-slate shrink-0">
              <X size={13} />
            </button>
          </div>
          {query.trim().length >= 2 && (
            <div className="mt-2 max-h-[200px] overflow-y-auto flex flex-col gap-1.5">
              {searching ? (
                <p className="text-[12px] text-slate px-1">Searching…</p>
              ) : results.length === 0 ? (
                <p className="text-[12px] text-slate px-1">No messages found.</p>
              ) : results.map(m => (
                <div key={m._id} className="text-[12.5px] text-graphite bg-cream rounded-lg px-3 py-2">
                  {m.text}
                  <span className="block text-[12px] text-slate mt-0.5">{new Date(m.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="border-b border-error-border bg-error-bg px-4 py-[9px] text-[12.5px] text-error">
          {error}
        </div>
      )}

      <MessageThread
        messages={messages}
        loading={msgLoading}
        loadingMore={loadingMore}
        currentUserId={currentUserId}
        otherPartyId={otherPartyId}
        otherPartyName={headerName}
        otherPartyImage={headerImage}
        otherTyping={otherTyping}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        editingId={editingId}
        editText={editText}
        onEditTextChange={setEditText}
        onStartEdit={m => { setEditingId(m._id); setEditText(m.text ?? ''); }}
        onCancelEdit={() => { setEditingId(null); setEditText(''); }}
        onSaveEdit={handleSaveEdit}
        onDelete={onDeleteMessage}
        onReply={setReplyTo}
        onRetry={handleRetry}
      />

      <MessageInput
        value={text}
        onChange={handleChangeText}
        onSend={handleSend}
        onFileSelect={onUpload}
        uploading={uploading}
        sending={sending}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onShareProduct={storeId ? () => setShowProductShare(true) : undefined}
      />

      {showProductShare && storeId && (
        <ProductShareModal
          storeId={storeId}
          onClose={() => setShowProductShare(false)}
          onShare={handleShareProduct}
          sharing={sharingProduct}
        />
      )}
    </div>
  );
}
