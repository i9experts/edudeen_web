import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Message } from '@/api/services/messaging';
import type { OptimisticMessage } from '@/hooks/messaging/useMessages';
import { groupMessages } from './groupMessages';
import { DateDivider } from './DateDivider';
import { MessageBubble } from './MessageBubble';
import { ChatAvatar } from './ChatAvatar';

interface MessageThreadProps {
  messages:      OptimisticMessage[];
  loading:       boolean;
  loadingMore?:  boolean;
  currentUserId?: string;
  otherPartyId:  string;
  otherPartyName: string;
  otherPartyImage?: string | null;
  otherTyping?:  boolean;
  hasMore:       boolean;
  onLoadMore:    () => void;
  editingId:     string | null;
  editText:      string;
  onEditTextChange: (v: string) => void;
  onStartEdit:   (m: Message) => void;
  onCancelEdit:  () => void;
  onSaveEdit:    () => void;
  onDelete:      (id: string) => void;
  onReply:       (m: Message) => void;
  onRetry:       (m: OptimisticMessage) => void;
}

function TypingBubble({ name, image }: { name: string; image?: string | null }) {
  return (
    <div className="flex items-end gap-[6px] mb-[6px] transition-all duration-300 ease-out starting:opacity-0 starting:translate-y-1">
      <div className="w-7 shrink-0 self-end"><ChatAvatar name={name} image={image} size={26} /></div>
      <div className="bg-white border border-[#eeece4] rounded-[18px] rounded-es-[4px] px-[16px] py-[12px]">
        <span className="inline-flex items-center gap-[3px]" aria-label={`${name} is typing`}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-[6px] h-[6px] rounded-full bg-slate/60 animate-bounce"
              style={{ animationDelay: `${i * 120}ms`, animationDuration: '900ms' }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

// The scrollable message area: date dividers + grouped bubbles, exactly
// the reading order Instagram/WhatsApp threads use. Sticks to the bottom
// on new messages unless the reader has scrolled up into history.
export function MessageThread({
  messages, loading, loadingMore, currentUserId, otherPartyId, otherPartyName, otherPartyImage, otherTyping,
  hasMore, onLoadMore, editingId, editText, onEditTextChange, onStartEdit, onCancelEdit, onSaveEdit, onDelete, onReply, onRetry,
}: MessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const prevLength = useRef(0);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  // Track whether the reader is near the bottom so a history-scroll doesn't
  // get yanked back down, but a genuinely new message does auto-scroll.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distanceFromBottom < 80;
    setShowJumpToLatest(distanceFromBottom > 240);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const grew = messages.length > prevLength.current;
    prevLength.current = messages.length;
    if (grew && stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  // Jump to bottom the moment a thread is opened.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && !loading) {
      el.scrollTop = el.scrollHeight;
      stickToBottom.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherPartyId, loading]);

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col justify-end gap-[10px]">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className="h-[38px] rounded-[18px] bg-bone animate-pulse" style={{ width: `${120 + (i * 37) % 140}px` }} />
          </div>
        ))}
      </div>
    );
  }
  if (messages.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-[13px] text-slate">No messages yet — say hello 👋</div>;
  }

  const sections = groupMessages(messages);

  return (
    <div className="relative flex-1 min-h-0">
      <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto px-4 py-3">
        {hasMore && (
          <div className="flex justify-center mb-3">
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-[6px] px-3 py-[6px] rounded-full border border-bone bg-white text-[11.5px] text-slate cursor-pointer hover:bg-cream disabled:opacity-60"
            >
              {loadingMore && <Loader2 size={11} className="animate-spin" />}
              {loadingMore ? 'Loading…' : 'Load older messages'}
            </button>
          </div>
        )}

        {sections.map(section => (
          <div key={section.dateLabel}>
            <DateDivider label={section.dateLabel} />
            {section.groups.map((group, gi) => {
              const own = group.senderId === currentUserId;
              return (
                <div key={gi} className="flex flex-col gap-[2px] mb-[6px]">
                  {group.messages.map((m, mi) => {
                    const isLast = mi === group.messages.length - 1;
                    return (
                      <MessageBubble
                        key={m._id}
                        message={m}
                        own={own}
                        isLastInGroup={isLast}
                        seenByOther={(m.seenBy ?? []).some(s => s.userId === otherPartyId)}
                        showAvatar={!own && isLast}
                        avatarName={otherPartyName}
                        avatarImage={otherPartyImage}
                        editing={editingId === m._id}
                        editText={editText}
                        onEditTextChange={onEditTextChange}
                        onStartEdit={own ? onStartEdit : undefined}
                        onCancelEdit={onCancelEdit}
                        onSaveEdit={onSaveEdit}
                        onDelete={own ? onDelete : undefined}
                        onReply={onReply}
                        onRetry={onRetry}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}

        {otherTyping && <TypingBubble name={otherPartyName} image={otherPartyImage} />}
      </div>

      {showJumpToLatest && (
        <button
          onClick={jumpToLatest}
          aria-label="Jump to latest message"
          className="absolute bottom-3 end-3 w-9 h-9 rounded-full bg-white border border-bone flex items-center justify-center cursor-pointer text-charcoal hover:bg-cream transition-colors"
        >
          ↓
        </button>
      )}
    </div>
  );
}
