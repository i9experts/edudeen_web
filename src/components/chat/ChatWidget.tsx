import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, RotateCcw, Send, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/contexts/languageCtx';
import { useAdminEdit } from '@/contexts/adminEditCtx';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { useCompare } from '@/utils/compareStore';
import { TokenStorage } from '@/api/services/auth';
import { apiChatbotMessage, type ChatAudience } from '@/api/services/chatbot';
import { CHIP_COUNT, DEFAULT_CHATBOT, type ChatQA } from './chatbotDefaults';

/**
 * Edudeen Help: floating chat bubble (bottom end) with 5 suggested questions per audience.
 * Chips are answered instantly from the loaded content (no network); typed text goes to POST /api/chatbot/message
 * (greetings, FAQ matcher, existing AI help-bot, fallback). Conversation + open state live in sessionStorage.
 */
const STORE_KEY = 'edudeen.chat.v1';
const NUDGE_KEY = 'edudeen.chat.nudged';
const SELLER_PATH = /^\/(store|seller|become-a-seller|onboarding)(\/|$)/;
const LIFT_PATH = /^\/(cart|checkout|product\/)/; // pages with a sticky bottom action bar on phones
const CURATED = ['en', 'ur', 'ur-latn'];

interface Msg { id: number; role: 'user' | 'bot'; text: string; quick?: { id: string; label: string }[]; actions?: { label: string; to: string }[] }
interface Saved { audience: ChatAudience; open: boolean; msgs: Msg[]; typedLang: string | null; noticeShown: boolean; unread: boolean }

function load(): Saved | null {
  try { const raw = sessionStorage.getItem(STORE_KEY); return raw ? (JSON.parse(raw) as Saved) : null; } catch { return null; }
}
function save(s: Saved) {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ ...s, msgs: s.msgs.slice(-30) })); } catch { /* storage blocked */ }
}
const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

function useIsMobile() {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false));
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

/** Tiny markdown subset: **bold**, [label](/internal or https://), line breaks. */
function RichText({ text, onNavigate }: { text: string; onNavigate: () => void }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => {
        const parts: ReactNode[] = [];
        let last = 0; let k = 0;
        for (const m of line.matchAll(/\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g)) {
          if (m.index! > last) parts.push(line.slice(last, m.index));
          if (m[1] !== undefined) parts.push(<strong key={k++}>{m[1]}</strong>);
          else if (m[3].startsWith('/')) parts.push(<Link key={k++} to={m[3]} onClick={onNavigate} className="underline font-semibold text-brand-royal">{m[2]}</Link>);
          else if (/^https:\/\//i.test(m[3])) parts.push(<a key={k++} href={m[3]} target="_blank" rel="noopener noreferrer" className="underline font-semibold text-brand-royal">{m[2]}</a>);
          else parts.push(m[2]);
          last = m.index! + m[0].length;
        }
        if (last < line.length) parts.push(line.slice(last));
        return <p key={li} className={li ? 'mt-1.5' : undefined}>{parts}</p>;
      })}
    </>
  );
}

export default function ChatWidget() {
  const { pathname } = useLocation();
  const { lang: siteLang, t } = useLanguage();
  const { editing, isAdmin } = useAdminEdit();
  const { items: compareItems } = useCompare();
  const { config } = usePublicPlatformConfig();
  const isMobile = useIsMobile();

  const audience: ChatAudience = SELLER_PATH.test(pathname) || TokenStorage.getRole() === 'seller' ? 'seller' : 'buyer';
  const cfg = config?.chatbot ?? DEFAULT_CHATBOT;
  const list: ChatQA[] = useMemo(() => (audience === 'seller' ? cfg.sellerQuestions : cfg.buyerQuestions) ?? [], [audience, cfg]);

  const initial = useMemo(() => { const s = load(); return s && s.audience === audience ? s : null; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState(initial?.open ?? false);
  const [msgs, setMsgs] = useState<Msg[]>(initial?.msgs ?? []);
  const [typedLang, setTypedLang] = useState<string | null>(initial?.typedLang ?? null);
  const [noticeShown, setNoticeShown] = useState(initial?.noticeShown ?? false);
  const [unread, setUnread] = useState(initial ? initial.unread : true);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [lift, setLift] = useState(0);
  const [panelOpenTick, setPanelOpenTick] = useState(0);
  const idRef = useRef(initial?.msgs.reduce((n, m) => Math.max(n, m.id), 0) ?? 0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  // The language chips/answers use: what the visitor last typed in (if curated), else the site language.
  const effLang = typedLang && CURATED.includes(typedLang) ? typedLang : siteLang;
  const chipLabel = useCallback((qa: ChatQA) => (effLang === 'ur' ? qa.qUr || qa.q : effLang === 'ur-latn' ? qa.qRu || qa.q : qa.q), [effLang]);
  const answerOf = useCallback((qa: ChatQA) => (effLang === 'ur' ? qa.aUr || qa.a : effLang === 'ur-latn' ? qa.aRu || qa.a : qa.a), [effLang]);
  const defaultChips = useMemo(() => list.slice(0, CHIP_COUNT).map(qa => ({ id: qa.id, label: chipLabel(qa) })), [list, chipLabel]);
  const welcome = effLang === 'ur' ? cfg.welcomeTextUr : cfg.welcomeText;

  const nextId = () => ++idRef.current;
  const push = useCallback((m: Omit<Msg, 'id'>) => setMsgs(p => [...p, { ...m, id: nextId() }]), []);

  // persistence
  useEffect(() => { save({ audience, open, msgs, typedLang, noticeShown, unread }); }, [audience, open, msgs, typedLang, noticeShown, unread]);
  // audience changed (guest -> seller pages, login): start a fresh conversation for the new set of questions
  const lastAudience = useRef(audience);
  useEffect(() => {
    if (lastAudience.current !== audience) { lastAudience.current = audience; setMsgs([]); setTypedLang(null); }
  }, [audience]);

  // scroll to newest
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end', behavior: reducedMotion() ? 'auto' : 'smooth' }); }, [msgs, busy, open]);
  // focus the input on open
  useEffect(() => { if (open && !isMobile) inputRef.current?.focus(); }, [open, isMobile]);

  // one-time welcome nudge (first visit only, never after the bubble was opened)
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(NUDGE_KEY) === '1'; } catch { /* ignore */ }
    if (seen || open) return;
    const show = window.setTimeout(() => setNudge(true), 6000);
    return () => window.clearTimeout(show);
  }, [open]);
  useEffect(() => {
    if (!nudge) return;
    const hide = window.setTimeout(() => dismissNudge(), 14000);
    return () => window.clearTimeout(hide);
  }, [nudge]);  
  function dismissNudge() { setNudge(false); try { localStorage.setItem(NUDGE_KEY, '1'); } catch { /* ignore */ } }

  // things the bubble must not sit on: PWA install prompt, admin edit toolbar
  useEffect(() => {
    const id = window.setInterval(() => {
      const install = !!document.querySelector('[aria-label="Install Edudeen"]');
      setLift(install ? 96 : 0);
      if (editing) setPanelOpenTick(n => n + 1);
    }, 1200);
    return () => window.clearInterval(id);
  }, [editing]);
  void panelOpenTick;
  const adminPanelOpen = (() => { if (!editing) return false; try { return localStorage.getItem('adminEditPanel') !== 'closed'; } catch { return true; } })();

  const openChat = () => {
    setOpen(true); setUnread(false); dismissNudge();
    setMsgs(p => (p.length ? p : [{ id: nextId(), role: 'bot', text: welcome, quick: undefined }]));
  };
  const closeChat = () => { setOpen(false); window.setTimeout(() => launcherRef.current?.focus(), 0); };
  const restart = () => { setMsgs([{ id: nextId(), role: 'bot', text: welcome }]); setTypedLang(null); };

  async function botReply(build: () => Omit<Msg, 'id'> | Promise<Omit<Msg, 'id'>>) {
    setBusy(true);
    const started = Date.now();
    try {
      const m = await build();
      const wait = reducedMotion() ? 0 : Math.max(0, 380 - (Date.now() - started));
      if (wait) await new Promise(r => window.setTimeout(r, wait));
      if (alive.current) push(m);
    } finally { if (alive.current) setBusy(false); }
  }

  const contactAction = { label: effLang === 'ur' ? 'سپورٹ سے رابطہ کریں' : effLang === 'ur-latn' ? 'Support se rabta karein' : 'Contact support', to: '/contact-us' };

  async function sendText(raw: string) {
    const text = raw.trim().slice(0, 400);
    if (!text || busy) return;
    setInput('');
    push({ role: 'user', text });
    await botReply(async () => {
      try {
        const res = await apiChatbotMessage({ audience, text, lang: siteLang === 'ur' ? 'ur' : 'en', langNoticeShown: noticeShown });
        const d = res.data;
        if (d.lang) setTypedLang(d.lang);
        if (d.notice) setNoticeShown(true);
        return { role: 'bot', text: d.reply, quick: d.quickReplies?.length ? d.quickReplies : undefined, actions: d.actions?.length ? d.actions : undefined };
      } catch {
        // API down / throttled: still useful - offer the built-in questions and the contact page.
        return { role: 'bot', text: effLang === 'ur' ? cfg.fallbackTextUr : cfg.fallbackText, quick: defaultChips, actions: [contactAction] };
      }
    });
  }

  function tapChip(c: { id: string; label: string }) {
    if (busy) return;
    const qa = list.find(q => q.id === c.id);
    if (!qa) { void sendText(c.label); return; }
    push({ role: 'user', text: c.label });
    void botReply(() => ({ role: 'bot', text: answerOf(qa), quick: defaultChips.filter(x => x.id !== qa.id) }));
  }

  if (cfg.enabled === false) return null;
  if (editing && adminPanelOpen && isMobile) return null; // the admin editor's bottom sheet owns the screen

  // ---- geometry -------------------------------------------------------------------------------------------------
  const navH = isMobile ? 76 : 24; // phones: above the 64px bottom nav
  const needsLift = isMobile && (LIFT_PATH.test(pathname) || compareItems.length > 0);
  const adminOffset = !isMobile && editing && adminPanelOpen ? 360 : 0;
  const bottomPx = navH + (needsLift ? 84 : 0) + lift;
  const posStyle = { bottom: `calc(${bottomPx}px + env(safe-area-inset-bottom, 0px))`, insetInlineEnd: 16 + adminOffset } as const;
  // an admin on the public site has the Edit-mode pill in this corner - sit above it
  const adminLift = isAdmin && !(editing && adminPanelOpen) ? 52 : 0;
  const bubbleStyle = { ...posStyle, bottom: `calc(${bottomPx + adminLift}px + env(safe-area-inset-bottom, 0px))` };

  const last = msgs[msgs.length - 1];
  const showChipsFor = last && last.role === 'bot' && !busy ? (last.quick ?? defaultChips) : null;

  return (
    <div translate="no" className="print:hidden">
      {!open && (
        <>
          {nudge && (
            <div role="status" style={{ ...bubbleStyle, bottom: `calc(${bottomPx + adminLift + 64}px + env(safe-area-inset-bottom, 0px))` }}
              className="fixed z-[45] max-w-[240px] rounded-2xl bg-white border border-bone shadow-lg ps-3.5 pe-2 py-2.5 text-[13px] text-carbon flex items-start gap-2">
              <button type="button" onClick={openChat} className="text-start bg-transparent border-0 p-0 cursor-pointer text-carbon text-[13px] leading-snug">
                {t('Need help? Tap to ask Edudeen Help.')}
              </button>
              <button type="button" onClick={dismissNudge} aria-label={t('Dismiss')} className="shrink-0 bg-transparent border-0 p-0.5 cursor-pointer text-slate"><X size={14} /></button>
            </div>
          )}
          <button
            ref={launcherRef} type="button" onClick={openChat} aria-label={t('Open Edudeen Help chat')} aria-haspopup="dialog"
            style={bubbleStyle}
            className={clsx('fixed z-[45] size-[52px] rounded-full bg-brand-royal text-white shadow-lg flex items-center justify-center border-0 cursor-pointer hover:opacity-90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/70 motion-safe:transition-[bottom,inset-inline-end] motion-safe:duration-200')}
          >
            <MessageCircle size={24} aria-hidden />
            {unread && <span aria-hidden className="absolute top-1 end-1 size-3 rounded-full bg-error ring-2 ring-white" />}
          </button>
        </>
      )}

      {open && (
        <section
          role="dialog" aria-label={t('Edudeen Help')}
          onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); closeChat(); } }}
          style={isMobile ? undefined : { bottom: 24, insetInlineEnd: 16 + adminOffset }}
          className={clsx(
            'fixed z-[70] flex flex-col bg-white text-carbon border border-bone shadow-2xl overflow-hidden',
            'max-md:inset-x-0 max-md:bottom-0 max-md:h-[82dvh] max-md:rounded-t-2xl',
            'md:w-[360px] md:h-[520px] md:max-h-[calc(100vh-2rem)] md:rounded-2xl',
          )}
        >
          <header className="shrink-0 flex items-center gap-3 px-4 py-3 bg-brand-royal text-white">
            <span className="relative size-9 rounded-full bg-white/15 flex items-center justify-center"><MessageCircle size={18} aria-hidden /><span aria-hidden className="absolute -bottom-0.5 -end-0.5 size-3 rounded-full bg-[#22c55e] ring-2 ring-brand-royal" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-tight">{t('Edudeen Help')}</p>
              <p className="text-[12px] text-white/80 leading-tight">{t('Online - replies instantly')}</p>
            </div>
            <button type="button" onClick={restart} aria-label={t('Start over')} className="p-1.5 rounded-full bg-transparent border-0 text-white/80 hover:text-white cursor-pointer"><RotateCcw size={16} /></button>
            <button type="button" onClick={closeChat} aria-label={t('Close chat')} className="p-1.5 rounded-full bg-transparent border-0 text-white hover:bg-white/15 cursor-pointer"><X size={18} /></button>
          </header>

          <div role="log" aria-live="polite" aria-relevant="additions" aria-label={t('Chat messages')} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 py-3 flex flex-col gap-2.5 bg-cream/40">
            {msgs.map(m => (
              <div key={m.id} className={m.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[92%]'}>
                <div dir="auto" className={clsx('text-[13.5px] leading-relaxed rounded-2xl px-3 py-2 break-words [overflow-wrap:anywhere]', m.role === 'user' ? 'bg-brand-royal text-white rounded-ee-sm' : 'bg-white border border-bone text-carbon rounded-es-sm')}>
                  {m.role === 'bot' ? <RichText text={m.text} onNavigate={() => { if (isMobile) closeChat(); }} /> : m.text}
                </div>
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.actions.map(a => (
                      <Link key={a.to} to={a.to} onClick={() => { if (isMobile) closeChat(); }} className="text-[12.5px] font-semibold rounded-full bg-brand-orange text-white px-3 py-1.5 no-underline">{a.label}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="self-start rounded-2xl bg-white border border-bone px-3 py-2.5 flex gap-1" role="status" aria-label={t('Typing')}>
                {[0, 1, 2].map(i => <span key={i} className="size-1.5 rounded-full bg-slate/60 motion-safe:animate-pulse" style={{ animationDelay: `${i * 160}ms` }} />)}
              </div>
            )}
            {showChipsFor && showChipsFor.length > 0 && (
              <div className="flex flex-col gap-1.5 items-start pt-0.5">
                {showChipsFor.map(c => (
                  <button key={c.id} type="button" onClick={() => tapChip(c)} dir="auto"
                    className="text-start text-[13px] leading-snug rounded-xl border border-brand-royal/30 bg-white text-brand-royal px-3 py-1.5 cursor-pointer hover:bg-brand-royal hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/60 transition-colors">
                    {c.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={e => { e.preventDefault(); void sendText(input); }} className="shrink-0 flex items-center gap-2 border-t border-bone bg-white p-3">
            <input
              ref={inputRef} value={input} onChange={e => setInput(e.target.value)} maxLength={400} dir="auto" enterKeyHint="send"
              placeholder={t('Type your question...')} aria-label={t('Your message')}
              className="flex-1 min-w-0 rounded-full border border-bone px-4 py-2 text-[14px] outline-none focus:border-brand-royal"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label={t('Send')} className="size-9 shrink-0 rounded-full bg-brand-royal text-white flex items-center justify-center border-0 cursor-pointer disabled:opacity-50 disabled:cursor-default rtl:-scale-x-100"><Send size={15} /></button>
          </form>
        </section>
      )}
    </div>
  );
}
