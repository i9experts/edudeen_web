import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { clsx } from 'clsx';
import { Send, Loader2, X, Mic, MicOff } from 'lucide-react';
import type { Message } from '@/api/services/messaging';
import { EmojiPicker } from './EmojiPicker';
import { AttachmentMenu } from './AttachmentMenu';
import { QuickReplyList, QuickRepliesManager, useQuickReplies } from './QuickReplies';
import type { QuickReply } from '@/api/services/messaging';
import { applyQuickReplyVars, filterQuickReplies, slashQuery } from '@/utils/quickReplies';

interface MessageInputProps {
  value:          string;
  onChange:       (v: string) => void;
  onSend:         () => void;
  onFileSelect:   (file: File) => void;
  uploading:      boolean;
  sending:        boolean;
  replyTo?:       Message | null;
  onCancelReply?: () => void;
  onShareProduct?: () => void;
  /** Seller composer only (off by default, so the buyer composer is unchanged): quick replies + "/" shortcut. */
  quickReplies?:  { storeId: string; buyerName: string; storeName: string };
}

const MAX_TEXTAREA_H = 120;

// ── Voice recorder hook ───────────────────────────────────────────────────────
function useVoiceRecorder(onReady: (file: File) => void) {
  const [recording,  setRecording]  = useState(false);
  const [seconds,    setSeconds]    = useState(0);
  const mrRef    = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      mrRef.current    = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const mimeType = mr.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: mimeType });
        onReady(file);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(100);
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      // microphone permission denied — silently ignore
    }
  };

  const stop = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    mrRef.current?.stop();
    mrRef.current = null;
    setRecording(false);
    setSeconds(0);
  };

  const cancel = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mrRef.current) {
      mrRef.current.ondataavailable = null;
      mrRef.current.onstop = null;
      mrRef.current.stop();
      mrRef.current = null;
    }
    chunksRef.current = [];
    setRecording(false);
    setSeconds(0);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return { recording, seconds, formattedTime: fmt(seconds), start, stop, cancel };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function MessageInput({
  value, onChange, onSend, onFileSelect, uploading, sending, replyTo, onCancelReply, onShareProduct, quickReplies,
}: MessageInputProps) {
  const canSend = value.trim().length > 0 && !sending;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [justSent, setJustSent] = useState(false);

  // ── Quick replies (seller only; with no `quickReplies` prop nothing below runs or renders) ──
  const qr = useQuickReplies(quickReplies?.storeId);
  const [btnOpen, setBtnOpen] = useState(false);
  const [btnQuery, setBtnQuery] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const [qrIndex, setQrIndex] = useState(0);
  const [managing, setManaging] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const slash = quickReplies ? slashQuery(value) : null;
  const slashOpen = slash !== null && !dismissed;
  const listOpen = !!quickReplies && (btnOpen || slashOpen);
  const qrItems = filterQuickReplies(qr.replies, btnOpen ? btnQuery : (slash ?? ''));

  useEffect(() => { if (slash === null) setDismissed(false); }, [slash]);
  useEffect(() => { setQrIndex(0); }, [btnQuery, slash, btnOpen]);
  useEffect(() => { if (btnOpen) searchRef.current?.focus(); }, [btnOpen]);

  const closeList = () => { setBtnOpen(false); setBtnQuery(''); if (slashOpen) setDismissed(true); };
  // Inserts the text only (never sends); cursor goes to the end so the seller can edit.
  const pickReply = (r: QuickReply) => {
    const text = applyQuickReplyVars(r.body, { buyer_name: quickReplies?.buyerName, store_name: quickReplies?.storeName });
    onChange(text);
    setBtnOpen(false); setBtnQuery(''); setDismissed(true);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(text.length, text.length);
    });
  };
  // Arrow keys / Enter / Esc for the open list. Returns true when the key was used.
  const listKey = (e: React.KeyboardEvent): boolean => {
    if (!listOpen) return false;
    if (e.key === 'Escape') { e.preventDefault(); closeList(); textareaRef.current?.focus(); return true; }
    if (qrItems.length === 0) return false;
    if (e.key === 'ArrowDown') { e.preventDefault(); setQrIndex(i => (i + 1) % qrItems.length); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setQrIndex(i => (i - 1 + qrItems.length) % qrItems.length); return true; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pickReply(qrItems[Math.min(qrIndex, qrItems.length - 1)]); return true; }
    return false;
  };

  const { recording, formattedTime, start, stop, cancel } = useVoiceRecorder(file => {
    onFileSelect(file);
  });

  // Real auto-grow: measure content height and expand the textarea up to a
  // cap, then let it scroll internally — not a fixed single-row box.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_H)}px`;
  }, [value]);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (listKey(e)) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) handleSend(); }
    if (e.key === 'Escape' && replyTo) onCancelReply?.();
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend();
    setJustSent(true);
    setTimeout(() => setJustSent(false), 220);
  };

  // ── Voice recording active state ─────────────────────────────────────────
  if (recording) {
    return (
      <div className="border-t border-[#eeece4] bg-white px-4 py-[10px] shrink-0" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-3 bg-cream rounded-[22px] px-4 py-[11px]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-[13px] font-medium text-charcoal flex-1 tabular-nums">Recording {formattedTime}</span>
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel recording"
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate hover:bg-bone cursor-pointer bg-transparent border-none"
            title="Cancel"
          >
            <MicOff size={17} />
          </button>
          <button
            type="button"
            onClick={stop}
            aria-label="Send voice note"
            className="w-[42px] h-[42px] rounded-full bg-brand-orange text-white border-none flex items-center justify-center cursor-pointer hover:opacity-90 active:scale-95 transition-transform"
            title="Send voice note"
          >
            {uploading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-t border-[#eeece4] bg-white px-4 py-[10px] shrink-0" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
      {quickReplies && listOpen && (
        <div className="absolute inset-x-4 bottom-full">
          <QuickReplyList
            items={qrItems} loading={qr.loading} error={qr.error} loaded={qr.loaded} activeIndex={qrIndex}
            onPick={pickReply} onRetry={() => void qr.reload()} onHover={setQrIndex}
            onManage={() => { closeList(); setManaging(true); }}
            {...(btnOpen ? { searchValue: btnQuery, onSearch: setBtnQuery, searchRef, onKeyDown: listKey } : {})}
          />
        </div>
      )}
      {quickReplies && managing && (
        <QuickRepliesManager
          storeId={quickReplies.storeId} replies={qr.replies} loading={qr.loading} error={qr.error} loaded={qr.loaded}
          onReload={qr.reload} onClose={() => setManaging(false)}
        />
      )}
      {quickReplies && (
        <div className="mb-[6px]">
          <button
            type="button" aria-haspopup="dialog" aria-expanded={btnOpen}
            onClick={() => { setBtnOpen(o => !o); setBtnQuery(''); }}
            className="min-h-[44px] px-3 rounded-full border border-[#eeece4] bg-cream text-[12.5px] font-semibold text-charcoal cursor-pointer"
          >
            Quick replies
          </button>
        </div>
      )}
      {replyTo && (
        <div className="flex items-center gap-2 mb-[8px] px-3 py-[7px] bg-cream rounded-[10px] border-s-[3px] border-brand-orange transition-all duration-200 ease-out starting:opacity-0 starting:-translate-y-1">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-brand-deep-orange">Replying to</p>
            <p className="text-[12px] text-slate truncate">{replyTo.text ?? `[${replyTo.type}]`}</p>
          </div>
          <button onClick={onCancelReply} aria-label="Cancel reply" className="p-1 rounded-full hover:bg-bone cursor-pointer bg-transparent border-none text-slate shrink-0">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-[8px]">
        <div className="flex-1 flex items-end gap-[4px] bg-cream rounded-[22px] px-[6px] py-[4px] min-h-[42px]">
          <EmojiPicker onSelect={emoji => onChange(value + emoji)} />

          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            aria-label="Message"
            className="flex-1 resize-none bg-transparent border-none outline-none text-[14px] text-charcoal py-[9px] leading-[1.3] overflow-y-auto"
            style={{ maxHeight: MAX_TEXTAREA_H }}
          />

          <AttachmentMenu onFileSelected={onFileSelect} onShareProduct={onShareProduct} disabled={uploading} />
        </div>

        {canSend ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            aria-label="Send message"
            className={clsx(
              'w-[42px] h-[42px] shrink-0 rounded-full border-none flex items-center justify-center cursor-pointer bg-brand-orange text-white hover:opacity-90 transition-transform',
              justSent ? 'scale-90' : 'scale-100',
            )}
          >
            {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            aria-label="Record voice note"
            className={clsx(
              'w-[42px] h-[42px] shrink-0 rounded-full border-none flex items-center justify-center cursor-pointer transition-colors',
              'bg-bone text-slate hover:bg-brand-pale-orange hover:text-brand-orange',
            )}
            title="Record voice note"
          >
            <Mic size={17} />
          </button>
        )}
      </div>
    </div>
  );
}
