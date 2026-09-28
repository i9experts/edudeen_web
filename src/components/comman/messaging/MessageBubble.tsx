import { useRef, useState, useEffect, memo } from 'react';
import { clsx } from 'clsx';
import {
  Check, CheckCheck, Clock, AlertCircle, FileText, Video as VideoIcon, Play, Pause,
  Reply as ReplyIcon, ChevronDown, Pencil, Trash2, X as XIcon, ShoppingBag,
} from 'lucide-react';
import type { Message } from '@/api/services/messaging';
import type { OptimisticMessage } from '@/hooks/messaging/useMessages';
import { ChatAvatar } from './ChatAvatar';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';

interface MessageBubbleProps {
  message:          OptimisticMessage;
  own:              boolean;
  isLastInGroup:    boolean;
  seenByOther:      boolean;
  avatarName?:      string;
  avatarImage?:     string | null;
  showAvatar:       boolean;
  editing:          boolean;
  editText:         string;
  onEditTextChange: (v: string) => void;
  onStartEdit?:     (m: Message) => void;
  onCancelEdit?:    () => void;
  onSaveEdit?:      () => void;
  onDelete?:        (id: string) => void;
  onReply?:         (m: Message) => void;
  onRetry?:         (message: OptimisticMessage) => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Voice note player ─────────────────────────────────────────────────────────
function VoiceNoteBubble({ url, own }: { url: string; own: boolean }) {
  const audioRef  = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying]   = useState(false);
  const [current, setCurrent]   = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? a.pause() : a.play();
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-[10px] min-w-[180px]">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        preload="metadata"
        className="hidden"
      />
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-none cursor-pointer',
          own ? 'bg-white/25 text-white hover:bg-white/35' : 'bg-brand-pale-orange text-brand-orange hover:opacity-80',
        )}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="translate-x-[1px]" />}
      </button>
      <div className="flex-1 flex flex-col gap-[5px] min-w-[100px]">
        <div className={clsx('h-[3px] rounded-full relative cursor-pointer')}
          style={{ background: own ? 'rgba(255,255,255,0.25)' : '#E8E6DC' }}
          onClick={e => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            if (audioRef.current) audioRef.current.currentTime = ratio * (audioRef.current.duration || 0);
          }}
        >
          <div
            className={clsx('h-full rounded-full transition-[width]')}
            style={{ width: `${pct}%`, background: own ? 'white' : '#174771' }}
          />
        </div>
        <span className={clsx('text-[10px] tabular-nums', own ? 'text-white/70' : 'text-slate')}>
          {playing || current > 0 ? fmt(current) : fmt(duration || 0)}
        </span>
      </div>
    </div>
  );
}

// ── Context menu (WhatsApp-style ▾ button) ─────────────────────────────────────
interface BubbleMenuProps {
  own:         boolean;
  canEdit:     boolean;
  onReply:     () => void;
  onEdit?:     () => void;
  onDelete?:   () => void;
}

function BubbleMenu({ own, canEdit, onReply, onEdit, onDelete }: BubbleMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Message options"
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx(
          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 w-[18px] h-[18px] rounded-full flex items-center justify-center border-none cursor-pointer outline-none',
          own ? 'bg-black/15 text-white hover:bg-black/25' : 'bg-black/8 text-charcoal hover:bg-black/15',
        )}
        title="Message options"
      >
        <ChevronDown size={11} />
      </button>

      {open && (
        <div role="menu" className={clsx(
          'absolute top-[22px] z-30 bg-white border border-bone rounded-[10px] py-[5px] min-w-[138px]',
          own ? 'right-0' : 'left-0',
        )}>
          <button
            role="menuitem"
            onClick={() => { onReply(); setOpen(false); }}
            className="w-full flex items-center gap-[9px] px-[13px] py-[9px] text-[13px] text-charcoal hover:bg-[#f7f6f1] cursor-pointer bg-transparent border-none text-left"
          >
            <ReplyIcon size={13} className="text-slate shrink-0" /> Reply
          </button>
          {canEdit && onEdit && (
            <button
              role="menuitem"
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full flex items-center gap-[9px] px-[13px] py-[9px] text-[13px] text-charcoal hover:bg-[#f7f6f1] cursor-pointer bg-transparent border-none text-left"
            >
              <Pencil size={13} className="text-slate shrink-0" /> Edit
            </button>
          )}
          {onDelete && (
            <>
              <div className="border-t border-[#f3f2ec] mx-[8px] my-[3px]" />
              <button
                role="menuitem"
                onClick={() => { onDelete(); setOpen(false); }}
                className="w-full flex items-center gap-[9px] px-[13px] py-[9px] text-[13px] text-red-500 hover:bg-red-50 cursor-pointer bg-transparent border-none text-left"
              >
                <Trash2 size={13} className="shrink-0" /> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal
      title="Delete message?"
      onClose={onCancel}
      width={280}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button variant="danger" size="sm" onClick={onConfirm} className="flex-1">Delete</Button>
        </>
      }
    >
      <p className="text-[13px] text-slate">This message will be deleted for everyone.</p>
    </Modal>
  );
}

// ── Main bubble ───────────────────────────────────────────────────────────────
// Memoized: composer keystrokes re-render ChatWindow/MessageThread constantly,
// but individual bubbles only need to re-render when their own props change.
export const MessageBubble = memo(function MessageBubble({
  message, own, isLastInGroup, seenByOther, avatarName, avatarImage, showAvatar,
  editing, editText, onEditTextChange, onStartEdit, onCancelEdit, onSaveEdit, onDelete, onReply, onRetry,
}: MessageBubbleProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const bubbleRadius = own
    ? isLastInGroup ? 'rounded-[18px] rounded-br-[4px]' : 'rounded-[18px]'
    : isLastInGroup ? 'rounded-[18px] rounded-bl-[4px]' : 'rounded-[18px]';

  const isAudioAttachment = (message.type === 'voice') ||
    (message.type === 'document' && message.attachments?.[0]?.mimeType?.startsWith('audio/')) ||
    message.attachments?.some(a => a.mimeType?.startsWith('audio/') || a.fileName?.startsWith('voice-note-'));

  if (message.isDeleted) {
    return (
      <div className={clsx('flex w-full mb-[2px]', own ? 'justify-end' : 'justify-start')}>
        <div className="px-4 py-2 text-[13px] italic text-slate bg-[#f0eee6] rounded-[18px] border border-bone">
          This message was deleted
        </div>
      </div>
    );
  }

  return (
    <>
      {confirmDelete && (
        <DeleteModal
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { onDelete!(message._id); setConfirmDelete(false); }}
        />
      )}

      <div
        className={clsx(
          'group flex w-full items-end gap-[6px] mb-[2px] transition-all duration-300 ease-out starting:opacity-0 starting:translate-y-1',
          own ? 'justify-end' : 'justify-start',
          message._pending && 'opacity-60',
        )}
        style={{ contentVisibility: 'auto', containIntrinsicSize: '0 44px' } as React.CSSProperties}
      >
        {/* Left avatar gutter */}
        {!own && (
          <div className="w-7 shrink-0 self-end">
            {showAvatar && <ChatAvatar name={avatarName ?? '?'} image={avatarImage} size={26} />}
          </div>
        )}

        <div className={clsx('flex items-end gap-[4px]', own ? 'flex-row-reverse' : 'flex-row')}>

          {/* Bubble column */}
          <div className={clsx('flex flex-col max-w-[78vw] sm:max-w-[400px]', own ? 'items-end' : 'items-start')}>
            {editing ? (
              // ── Inline edit — matches bubble color ──────────────────────────
              <div className={clsx('px-[14px] py-[10px]', bubbleRadius, own ? 'bg-brand-orange' : 'bg-white border border-[#eeece4]')}>
                <textarea
                  value={editText}
                  onChange={e => onEditTextChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit?.(); }
                    if (e.key === 'Escape') onCancelEdit?.();
                  }}
                  autoFocus
                  rows={Math.max(1, (editText.match(/\n/g)?.length ?? 0) + 1)}
                  className={clsx(
                    'w-full min-w-[180px] resize-none bg-transparent border-none outline-none text-[14px] leading-[1.45]',
                    own ? 'text-white placeholder-white/50' : 'text-charcoal',
                  )}
                />
                <div className={clsx('flex items-center justify-end gap-[6px] mt-[6px]', own ? 'text-white/70' : 'text-slate')}>
                  <span className="text-[10px]">Enter to save</span>
                  <button
                    onClick={onCancelEdit}
                    aria-label="Cancel edit"
                    className={clsx('w-6 h-6 rounded-full flex items-center justify-center border-none cursor-pointer', own ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-bone text-charcoal hover:bg-bone')}
                  >
                    <XIcon size={11} />
                  </button>
                  <button
                    onClick={onSaveEdit}
                    aria-label="Save edit"
                    className={clsx('w-6 h-6 rounded-full flex items-center justify-center border-none cursor-pointer', own ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-brand-pale-orange text-brand-orange hover:opacity-80')}
                  >
                    <Check size={11} />
                  </button>
                </div>
              </div>
            ) : (
              // ── Normal bubble ──────────────────────────────────────────────
              <div
                className={clsx(
                  'relative px-[14px] py-[9px]',
                  bubbleRadius,
                  own ? 'bg-brand-orange text-white' : 'bg-white text-charcoal border border-[#eeece4]',
                  message._failed && 'ring-2 ring-error/50',
                )}
              >
                {/* ▾ menu trigger — top corner, shows on hover */}
                {!message._pending && !message._failed && (
                  <div className={clsx('absolute top-[5px] z-10', own ? 'left-[5px]' : 'right-[5px]')}>
                    <BubbleMenu
                      own={own}
                      canEdit={own && message.type === 'text'}
                      onReply={() => onReply?.(message)}
                      onEdit={onStartEdit ? () => onStartEdit(message) : undefined}
                      onDelete={onDelete ? () => setConfirmDelete(true) : undefined}
                    />
                  </div>
                )}

                {/* Reply-to preview */}
                {message.replyTo && (
                  <div className={clsx(
                    'mb-[6px] px-[10px] py-[6px] rounded-[8px] border-l-[3px] text-[12px] opacity-80',
                    own ? 'bg-white/15 border-white' : 'bg-cream border-brand-orange',
                  )}>
                    <p className="line-clamp-2 leading-snug">{message.replyTo.text ?? `[${message.replyTo.type}]`}</p>
                  </div>
                )}

                {/* Text */}
                {message.type === 'text' && (
                  <p className={clsx('text-[14px] leading-[1.45] whitespace-pre-wrap break-words', own ? 'pl-[18px]' : 'pr-[18px]')}>
                    {message.text}
                    {message.isEdited && <span className={clsx('text-[10px] ml-1', own ? 'text-white/60' : 'text-slate')}>(edited)</span>}
                  </p>
                )}

                {/* Product share */}
                {message.type === 'product_share' && (
                  <div className="flex items-center gap-[10px] min-w-[180px]">
                    {message.productShare?.image ? (
                      <img loading="lazy" decoding="async" src={message.productShare.image} alt="" className="w-11 h-11 rounded-[10px] object-cover shrink-0" />
                    ) : (
                      <div className={clsx('w-11 h-11 rounded-[10px] shrink-0 flex items-center justify-center', own ? 'bg-white/15' : 'bg-cream')}>
                        <ShoppingBag size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">{message.productShare?.title ?? `Product #${message.productShare?.productId.slice(-6)}`}</p>
                      {message.productShare?.price != null && (
                        <p className={clsx('text-[12px]', own ? 'text-white/85' : 'text-slate')}>${message.productShare.price}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Image */}
                {message.type === 'image' && (
                  <div className="flex flex-col gap-1">
                    {(message.attachments ?? []).filter(Boolean).map(a => (
                      <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
                        <img loading="lazy" decoding="async" src={a.thumbnailUrl ?? a.url} alt={a.fileName ?? ''} className="rounded-[12px] max-w-[240px] max-h-[240px] object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Voice note */}
                {isAudioAttachment && (
                  <div className="flex flex-col gap-1">
                    {(message.attachments ?? []).filter(Boolean).map(a => (
                      <VoiceNoteBubble key={a.url} url={a.url} own={own} />
                    ))}
                  </div>
                )}

                {/* PDF / Document / Video — generic file card */}
                {!isAudioAttachment && (message.type === 'pdf' || message.type === 'document' || message.type === 'video') && (
                  <div className="flex flex-col gap-1.5">
                    {(message.attachments ?? []).filter(Boolean).map(a => (
                      <a
                        key={a.url} href={a.url} target="_blank" rel="noreferrer"
                        className={clsx(
                          'flex items-center gap-[10px] px-2 py-1.5 rounded-[10px] transition-colors min-w-[170px]',
                          own ? 'hover:bg-white/10' : 'hover:bg-cream',
                        )}
                      >
                        <div className={clsx('w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0', own ? 'bg-white/15' : 'bg-cream')}>
                          {message.type === 'video' ? <VideoIcon size={15} /> : <FileText size={15} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium truncate max-w-[180px]">{a.fileName ?? 'File'}</p>
                          {a.fileSize != null && (
                            <p className={clsx('text-[10.5px]', own ? 'text-white/70' : 'text-slate')}>{formatFileSize(a.fileSize)}</p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Time + status */}
            <div className={clsx('flex items-center gap-[4px] mt-[3px] px-1', own ? 'flex-row' : 'flex-row-reverse')}>
              {message._failed ? (
                <button
                  onClick={() => onRetry?.(message)}
                  className="flex items-center gap-[3px] text-[10.5px] text-error bg-transparent border-none cursor-pointer p-0"
                >
                  <AlertCircle size={12} /> Tap to retry
                </button>
              ) : (
                <>
                  <span className="text-[10.5px] text-slate">{time}</span>
                  {own && (
                    message._pending
                      ? <Clock size={12} className="text-slate" />
                      : seenByOther
                        ? <CheckCheck size={13} className="text-[#4fa8e8]" />
                        : <Check size={13} className="text-slate" />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
