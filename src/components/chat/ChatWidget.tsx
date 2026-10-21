import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { localeTime } from '@/utils/localeTime';
import { Link, useLocation } from 'react-router-dom';
import { Bot, MessageCircle, RotateCcw, Send, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/contexts/languageCtx';
import { useAdminEdit } from '@/contexts/adminEditCtx';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { useCompare } from '@/utils/compareStore';
import { TokenStorage } from '@/api/services/auth';
import { EdudeenIcon } from '@/components/comman/ui/EdudeenLogo';
import { apiChatbotMessage, apiChatConversation, apiChatFollowUp, type ChatAudience, type ChatGuest, type ChatReplyData } from '@/api/services/chatbot';
import { CHIP_COUNT, DEFAULT_CHATBOT, type ChatQA } from './chatbotDefaults';

/**
 * Edudeen Help: floating chat bubble (bottom end) with 5 suggested questions per audience. The panel opens as a popover
 * directly above the bubble (caret pointing down at it). Chips are answered instantly from the loaded content (no network);
 * typed text goes to POST /api/chatbot/message (greetings, FAQ matcher). Anything else is escalated to the Edudeen team
 * (admin chat inbox); the admin's answer comes back by polling GET /api/chatbot/conversation.
 */
const STORE_KEY = 'edudeen.chat.v1';
const NUDGE_KEY = 'edudeen.chat.nudged';
const GUEST_KEY = 'edudeen.chat.guest';
const SELLER_PATH = /^\/(store|seller|become-a-seller|onboarding)(\/|$)/;
const LIFT_PATH = /^\/(cart|checkout|product\/)/; // pages with a sticky bottom action bar on phones
const CURATED = ['en', 'ur', 'ur-latn'];
const BUBBLE = 52; // bubble diameter
const GAP = 12; // space between bubble and panel (caret lives here)
const END_INSET = 16;
const POLL_OPEN = 8000;
const POLL_CLOSED = 60000;
const NAVY = 'linear-gradient(135deg,#152D43 0%,#174771 55%,#2b6a8f 100%)';

type Role = 'user' | 'bot' | 'admin';
interface Msg { id: number; role: Role; text: string; at: number; sid?: string; quick?: { id: string; label: string }[]; actions?: { label: string; to: string }[] }
interface Saved { audience: ChatAudience; open: boolean; msgs: Msg[]; typedLang: string | null; noticeShown: boolean; unread: boolean }
interface ConvState { id: string; shortCode: string; status: 'open' | 'answered' | 'closed' }
interface GuestInfo { token?: string; name?: string; email?: string; phone?: string }

type Dict = { sub: string; waiting: string; answered: string; closed: string; team: string; guestTitle: string; guestName: string; guestContact: string; guestSend: string; guestErr: string; footer: string; sendErr: string };
const S: Record<'en' | 'ur' | 'ur-latn', Dict> = {
  en: { sub: 'Usually replies in a few minutes', waiting: 'Waiting for the Edudeen team', answered: 'Answered', closed: 'Closed', team: 'Edudeen team', guestTitle: 'So we can reply to you', guestName: 'Your name', guestContact: 'Email or phone number', guestSend: 'Send my question', guestErr: 'Please add your name and a valid email or phone number.', footer: 'Replies from our team appear right here', sendErr: 'Could not send your message. Please try again.' },
  ur: { sub: 'عموماً چند منٹ میں جواب دیتے ہیں', waiting: 'ایڈودین ٹیم کا انتظار', answered: 'جواب مل گیا', closed: 'بند', team: 'ایڈودین ٹیم', guestTitle: 'تاکہ ہم آپ کو جواب دے سکیں', guestName: 'آپ کا نام', guestContact: 'ای میل یا فون نمبر', guestSend: 'میرا سوال بھیجیں', guestErr: 'براہ کرم اپنا نام اور درست ای میل یا فون نمبر لکھیں۔', footer: 'ہماری ٹیم کے جوابات یہیں نظر آئیں گے', sendErr: 'آپ کا پیغام نہیں بھیجا جا سکا۔ دوبارہ کوشش کریں۔' },
  'ur-latn': { sub: 'Aam tor par chand minute mein jawab', waiting: 'Edudeen team ka intezar', answered: 'Jawab mil gaya', closed: 'Band', team: 'Edudeen team', guestTitle: 'Taake hum aapko jawab de saken', guestName: 'Aapka naam', guestContact: 'Email ya phone number', guestSend: 'Mera sawal bhejein', guestErr: 'Apna naam aur durust email ya phone number likhein.', footer: 'Hamari team ke jawab yahin nazar ayenge', sendErr: 'Aapka paigham nahi bheja ja saka. Dobara koshish karein.' },
};

function load(): Saved | null {
  try { const raw = sessionStorage.getItem(STORE_KEY); return raw ? (JSON.parse(raw) as Saved) : null; } catch { return null; }
}
function save(s: Saved) {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ ...s, msgs: s.msgs.slice(-30) })); } catch { /* storage blocked */ }
}
function loadGuest(): GuestInfo { try { return JSON.parse(localStorage.getItem(GUEST_KEY) || '{}') as GuestInfo; } catch { return {}; } }
function saveGuest(g: GuestInfo) { try { localStorage.setItem(GUEST_KEY, JSON.stringify(g)); } catch { /* storage blocked */ } }
const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
const timeOf = (ms: number) => (ms ? localeTime(new Date(ms), { hour: '2-digit', minute: '2-digit' }) : '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,17}$/;

function useViewport() {
  const read = () => (typeof window !== 'undefined' ? { mobile: window.matchMedia('(max-width: 767px)').matches, h: window.innerHeight } : { mobile: false, h: 800 });
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  return v;
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
  const { pathname, search } = useLocation();
  const { lang: siteLang, t } = useLanguage();
  const { editing, isAdmin } = useAdminEdit();
  const { items: compareItems } = useCompare();
  const { config } = usePublicPlatformConfig();
  const { mobile: isMobile, h: viewH } = useViewport();

  const audience: ChatAudience = SELLER_PATH.test(pathname) || TokenStorage.getRole() === 'seller' ? 'seller' : 'buyer';
  const cfg = config?.chatbot ?? DEFAULT_CHATBOT;
  const list: ChatQA[] = useMemo(() => (audience === 'seller' ? cfg.sellerQuestions : cfg.buyerQuestions) ?? [], [audience, cfg]);

  const initial = useMemo(() => { const s = load(); return s && s.audience === audience ? s : null; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState(initial?.open ?? false);
  const [mounted, setMounted] = useState(initial?.open ?? false); // panel stays mounted while it animates closed
  const [shown, setShown] = useState(initial?.open ?? false);
  const [msgs, setMsgs] = useState<Msg[]>(() => (initial?.msgs ?? []).map(m => ({ ...m, at: m.at ?? 0 })));
  const [typedLang, setTypedLang] = useState<string | null>(initial?.typedLang ?? null);
  const [noticeShown, setNoticeShown] = useState(initial?.noticeShown ?? false);
  const [unread, setUnread] = useState(initial ? initial.unread : true);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [lift, setLift] = useState(0);
  const [avoid, setAvoid] = useState(0); // px of fixed/sticky bottom bar the bubble has to clear
  const [modalOpen, setModalOpen] = useState(false); // another dialog is open: the bubble steps out of its way
  const [panelOpenTick, setPanelOpenTick] = useState(0);
  const [conv, setConv] = useState<ConvState | null>(null);
  const [authTick, setAuthTick] = useState(0);
  const [guest, setGuest] = useState<GuestInfo>(loadGuest);
  const [needContact, setNeedContact] = useState<{ text: string; uid: number } | null>(null);
  const [gName, setGName] = useState('');
  const [gContact, setGContact] = useState('');
  const [gError, setGError] = useState('');
  const idRef = useRef(initial?.msgs.reduce((n, m) => Math.max(n, m.id), 0) ?? 0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const alive = useRef(true);
  const openRef = useRef(open);
  const convRef = useRef<ConvState | null>(null);
  const sinceRef = useRef<string | undefined>(undefined);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []); // re-arm: StrictMode mounts twice
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { convRef.current = conv; }, [conv]);

  const loggedIn = TokenStorage.isLoggedIn() && TokenStorage.getRole() !== 'admin';
  const canPoll = loggedIn || !!guest.token;

  // The language chips/answers use: what the visitor last typed in (if curated), else the site language.
  const effLang = typedLang && CURATED.includes(typedLang) ? typedLang : siteLang;
  const str: Dict = S[(effLang === 'ur' || effLang === 'ur-latn' ? effLang : 'en') as 'en' | 'ur' | 'ur-latn'];
  const rtl = effLang === 'ur' || siteLang === 'ur';
  const chipLabel = useCallback((qa: ChatQA) => (effLang === 'ur' ? qa.qUr || qa.q : effLang === 'ur-latn' ? qa.qRu || qa.q : qa.q), [effLang]);
  const answerOf = useCallback((qa: ChatQA) => (effLang === 'ur' ? qa.aUr || qa.a : effLang === 'ur-latn' ? qa.aRu || qa.a : qa.a), [effLang]);
  const defaultChips = useMemo(() => list.slice(0, CHIP_COUNT).map(qa => ({ id: qa.id, label: chipLabel(qa) })), [list, chipLabel]);
  const welcome = effLang === 'ur' ? cfg.welcomeTextUr : cfg.welcomeText;

  const nextId = () => ++idRef.current;
  const push = useCallback((m: Omit<Msg, 'id' | 'at'> & { at?: number }) => setMsgs(p => [...p, { ...m, id: ++idRef.current, at: m.at ?? Date.now() }]), []);

  // persistence
  useEffect(() => { save({ audience, open, msgs, typedLang, noticeShown, unread }); }, [audience, open, msgs, typedLang, noticeShown, unread]);
  // audience changed (guest -> seller pages): start fresh and reload any escalated thread
  const lastAudience = useRef(audience);
  useEffect(() => {
    if (lastAudience.current !== audience) { lastAudience.current = audience; setMsgs([]); setTypedLang(null); sinceRef.current = undefined; setAuthTick(n => n + 1); }
  }, [audience]);
  // login / logout: a different person must never see the previous conversation
  useEffect(() => {
    const reset = () => { setConv(null); convRef.current = null; sinceRef.current = undefined; setMsgs([]); setNeedContact(null); setAuthTick(n => n + 1); };
    window.addEventListener('edudeen:auth-login', reset); window.addEventListener('edudeen:auth-logout', reset);
    return () => { window.removeEventListener('edudeen:auth-login', reset); window.removeEventListener('edudeen:auth-logout', reset); };
  }, []);

  // ---- open / close with animation ------------------------------------------------------------------------------
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => setShown(true));
      return () => window.cancelAnimationFrame(id);
    }
    setShown(false);
    const id = window.setTimeout(() => setMounted(false), reducedMotion() ? 0 : 180);
    return () => window.clearTimeout(id);
  }, [open]);

  // scroll to newest
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end', behavior: reducedMotion() ? 'auto' : 'smooth' }); }, [msgs, busy, open, needContact]);
  // focus the input on open
  useEffect(() => { if (open && !isMobile) inputRef.current?.focus(); }, [open, isMobile]);

  // ---- escalated conversation: initial load + polling -------------------------------------------------------------
  const fetchConv = useCallback(async (markRead: boolean) => {
    const r = await apiChatConversation({ since: sinceRef.current, guestToken: loggedIn ? undefined : guest.token, markRead });
    if (!alive.current) return;
    const c = r.data.conversation;
    if (!c) { setConv(null); convRef.current = null; return; }
    if (!c.messages.length && r.data.serverTime) sinceRef.current = r.data.serverTime; // advance even when nothing is new
    const state: ConvState = { id: c.id, shortCode: c.shortCode, status: c.status };
    setConv(state); convRef.current = state;
    if (c.messages.length) {
      setMsgs(prev => {
        const next = prev.map(x => ({ ...x })); let changed = false;
        for (const m of c.messages) {
          if (m.from === 'bot' || next.some(x => x.sid === m.id)) continue;
          const mine = m.from === 'user' ? next.find(x => x.role === 'user' && !x.sid && x.text === m.text) : undefined;
          if (mine) { mine.sid = m.id; changed = true; continue; }
          next.push({ id: ++idRef.current, role: m.from === 'admin' ? 'admin' : 'user', text: m.text, at: new Date(m.at).getTime(), sid: m.id }); changed = true;
        }
        if (!changed) return prev;
        return next.map((m, i) => ({ m, i })).sort((a, b) => (a.m.at - b.m.at) || (a.i - b.i)).map(x => x.m);
      });
      sinceRef.current = c.messages[c.messages.length - 1].at;
      if (c.messages.some(m => m.from === 'admin') && !openRef.current && c.unreadForUser > 0) setUnread(true);
    }
    if (c.unreadForUser > 0 && !openRef.current) setUnread(true);
  }, [loggedIn, guest.token]);

  useEffect(() => { // once per identity: is there an escalated conversation to show?
    if (!canPoll || cfg.enabled === false) return;
    void fetchConv(openRef.current).catch(() => undefined);
  }, [canPoll, authTick, fetchConv, cfg.enabled]);

  const convLive = !!conv && conv.status !== 'closed';
  useEffect(() => { // keep polling only while a conversation is active; fast when the panel is open, slow otherwise
    if (!convLive || !open) return; // only while the panel is open (it refetches on open)
    let stop = false; let timer = 0; let delay = POLL_OPEN;
    const base = delay;
    const tick = async () => {
      if (stop) return;
      if (!document.hidden) {
        try { await fetchConv(open); delay = base; } catch { delay = Math.min(delay * 2, POLL_CLOSED); }
      }
      if (!stop) timer = window.setTimeout(tick, delay);
    };
    void tick();
    return () => { stop = true; window.clearTimeout(timer); };
  }, [convLive, open, fetchConv]);

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

  // hide the bubble (and nudge) while a page modal/bottom sheet is open so it never covers the sheet
  useEffect(() => {
    let raf = 0;
    const check = () => { raf = 0; setModalOpen(Array.from(document.querySelectorAll('[aria-modal="true"]')).some(el => {
      if (el.closest('[data-chat-root]')) return false;
      // a closed sheet can stay mounted off-screen / hidden (e.g. the mobile Filters drawer): only a dialog actually on screen counts
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight && cs.visibility !== 'hidden' && cs.display !== 'none';
    })); };
    const mo = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(check); });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal', 'class', 'style'] });
    check();
    return () => { mo.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // things the bubble must not sit on: PWA install prompt, admin edit toolbar
  useEffect(() => {
    // Any bottom bar that marks itself `data-chat-avoid` (sticky Save/Publish bars, bulk-action bars, the seller bottom nav)
    // pushes the bubble up so it never covers a button.
    const measureAvoid = () => {
      let need = 0;
      document.querySelectorAll<HTMLElement>('[data-chat-avoid]').forEach(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.height < 8 || cs.display === 'none' || cs.visibility === 'hidden') return;
        if (r.top >= window.innerHeight || r.bottom < window.innerHeight - 320) return; // not sitting at the bottom edge
        need = Math.max(need, window.innerHeight - r.top + 12);
      });
      setAvoid(prev => (Math.abs(prev - need) < 2 ? prev : Math.round(need)));
    };
    const tick = () => {
      const install = !!document.querySelector('[aria-label="Install Edudeen"]');
      setLift(install ? 96 : 0);
      measureAvoid();
      if (editing) setPanelOpenTick(n => n + 1);
    };
    const id = window.setInterval(tick, 500);
    const soon = window.setTimeout(tick, 250);
    window.addEventListener('resize', measureAvoid);
    window.addEventListener('scroll', measureAvoid, { passive: true, capture: true });
    return () => { window.clearInterval(id); window.clearTimeout(soon); window.removeEventListener('resize', measureAvoid); window.removeEventListener('scroll', measureAvoid, true); };
  }, [editing, pathname]);
  void panelOpenTick;
  const adminPanelOpen = (() => { if (!editing) return false; try { return localStorage.getItem('adminEditPanel') !== 'closed'; } catch { return true; } })();

  const openChat = useCallback(() => {
    setOpen(true); setUnread(false); dismissNudge();
    setMsgs(p => (p.length ? p : [{ id: ++idRef.current, role: 'bot', text: welcome, at: Date.now() }]));
  }, [welcome]);
  const closeChat = () => { setOpen(false); window.setTimeout(() => launcherRef.current?.focus(), 0); };
  const restart = () => { setMsgs([{ id: nextId(), role: 'bot', text: welcome, at: Date.now() }]); setTypedLang(null); sinceRef.current = undefined; setAuthTick(n => n + 1); };

  // notification links / emails open the chat with ?openChat=1
  useEffect(() => { if (new URLSearchParams(search).get('openChat') === '1') openChat(); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function botReply(build: () => Omit<Msg, 'id' | 'at'> | Promise<Omit<Msg, 'id' | 'at'>>) {
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
  const markSid = (uid: number, sid?: string) => { if (sid) setMsgs(p => p.map(m => (m.id === uid ? { ...m, sid } : m))); };

  /** Applies a /message answer: FAQ/greeting bubbles, escalation (conversation + guest token) or the guest-contact request. */
  function applyReply(d: ChatReplyData, uid: number, text: string): Omit<Msg, 'id' | 'at'> {
    if (d.lang) setTypedLang(d.lang);
    if (d.notice) setNoticeShown(true);
    if (d.source === 'needs_contact') { setNeedContact({ text, uid }); setGError(''); }
    if (d.source === 'escalated' && d.escalation) {
      const e = d.escalation;
      markSid(uid, e.messageId || undefined);
      const st: ConvState = { id: e.conversationId, shortCode: e.shortCode, status: 'open' };
      setConv(st); convRef.current = st;
      if (e.guestToken) { const g = { ...guest, token: e.guestToken }; setGuest(g); saveGuest(g); }
      setNeedContact(null);
    }
    return { role: 'bot', text: d.reply, quick: d.quickReplies?.length ? d.quickReplies : undefined, actions: d.actions?.length ? d.actions : undefined };
  }

  async function sendToServer(text: string, uid: number, guestInfo?: ChatGuest) {
    await botReply(async () => {
      try {
        const g = loggedIn ? undefined : guestInfo ?? (guest.name && (guest.email || guest.phone) ? { name: guest.name, email: guest.email, phone: guest.phone } : undefined);
        const res = await apiChatbotMessage({ audience, text, lang: siteLang === 'ur' ? 'ur' : 'en', langNoticeShown: noticeShown, guestToken: loggedIn ? undefined : guest.token, guest: g });
        return applyReply(res.data, uid, text);
      } catch {
        // API down / throttled: still useful - offer the built-in questions and the contact page.
        return { role: 'bot', text: effLang === 'ur' ? cfg.fallbackTextUr : cfg.fallbackText, quick: defaultChips, actions: [contactAction] };
      }
    });
  }

  async function sendText(raw: string) {
    const text = raw.trim().slice(0, 1000);
    if (!text || busy) return;
    setInput('');
    const uid = nextId();
    setMsgs(p => [...p, { id: uid, role: 'user', text, at: Date.now() }]);
    const active = convRef.current && convRef.current.status !== 'closed';
    if (active) { // follow-up inside the running conversation: no FAQ matching, the team sees it directly
      try {
        const r = await apiChatFollowUp({ text, guestToken: loggedIn ? undefined : guest.token });
        if (r.data?.source === 'rate_limited') { push({ role: 'bot', text: str.sendErr }); return; }
        markSid(uid, r.data?.messageId || undefined);
        setConv(c => (c ? { ...c, status: 'open' } : c));
      } catch (e) {
        const gone = (e as { response?: { status?: number } })?.response?.status === 404 || /No active conversation/i.test((e as Error)?.message ?? '');
        if (gone) { setConv(null); convRef.current = null; await sendToServer(text, uid); } else push({ role: 'bot', text: str.sendErr });
      }
      return;
    }
    await sendToServer(text, uid);
  }

  async function submitGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!needContact || busy) return;
    const name = gName.trim(); const c = gContact.trim();
    const email = EMAIL_RE.test(c) ? c : undefined; const phone = !email && PHONE_RE.test(c) ? c : undefined;
    if (name.length < 2 || (!email && !phone)) { setGError(str.guestErr); return; }
    const g = { ...guest, name, email, phone }; setGuest(g); saveGuest(g);
    const { text, uid } = needContact; setNeedContact(null); setGError('');
    await sendToServer(text, uid, { name, email, phone });
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
  const bottomPx = Math.max(navH + (needsLift ? 84 : 0) + lift, avoid ? avoid + lift : 0);
  // an admin on the public site has the Edit-mode pill in this corner - sit above it
  const adminLift = isAdmin && !(editing && adminPanelOpen) ? 52 : 0;
  const bubbleBottom = bottomPx + adminLift;
  const bubbleStyle = { bottom: `calc(${bubbleBottom}px + env(safe-area-inset-bottom, 0px))`, insetInlineEnd: END_INSET + adminOffset } as const;
  const panelBottom = bubbleBottom + BUBBLE + GAP; // the popover sits directly above the bubble
  // phones: a popover when it fits above the bubble, otherwise a full-width bottom sheet without the caret
  const sheet = isMobile && viewH - panelBottom < 380;
  const panelStyle: React.CSSProperties = sheet ? {} : {
    bottom: `calc(${panelBottom}px + env(safe-area-inset-bottom, 0px))`,
    insetInlineEnd: END_INSET + adminOffset,
    ...(isMobile ? { insetInlineStart: 8, width: 'auto' } : { width: 360 }),
    height: 520,
    maxHeight: `calc(100dvh - ${panelBottom}px - 12px - env(safe-area-inset-bottom, 0px))`,
    transformOrigin: rtl ? `${BUBBLE / 2 + END_INSET}px 100%` : `calc(100% - ${BUBBLE / 2 + END_INSET}px) 100%`,
  };
  const caretEnd = BUBBLE / 2 - 6; // caret centre over the bubble centre (panel end edge == bubble end edge)

  const last = msgs[msgs.length - 1];
  const showChipsFor = !busy ? (last && last.role === 'bot' && last.quick ? last.quick : defaultChips) : null;
  const statusChip = conv ? (conv.status === 'answered' ? { text: str.answered, dot: 'bg-[#22c55e]' } : conv.status === 'closed' ? { text: str.closed, dot: 'bg-white/50' } : { text: str.waiting, dot: 'bg-[#FFD666]' }) : null;
  const closeNav = () => { if (isMobile) closeChat(); };

  return (
    <div translate="no" data-chat-root className="print:hidden" style={modalOpen && !open ? { display: 'none' } : undefined}>
      {!open && nudge && (
        <div role="status" style={{ ...bubbleStyle, bottom: `calc(${bubbleBottom + 64}px + env(safe-area-inset-bottom, 0px))` }}
          className="fixed z-[45] max-w-[240px] rounded-2xl bg-white border border-bone shadow-lg ps-3.5 pe-2 py-2.5 text-[13px] text-carbon flex items-start gap-2">
          <button type="button" onClick={openChat} className="text-start bg-transparent border-0 p-0 cursor-pointer text-carbon text-[13px] leading-snug">
            {t('Need help? Tap to ask Edudeen Help.')}
          </button>
          <button type="button" onClick={dismissNudge} aria-label={t('Dismiss')} className="shrink-0 bg-transparent border-0 p-0.5 cursor-pointer text-slate"><X size={14} /></button>
        </div>
      )}

      {!(sheet && open) && <button
        ref={launcherRef} type="button" onClick={() => (open ? closeChat() : openChat())}
        aria-label={open ? t('Close chat') : t('Open Edudeen Help chat')} aria-haspopup="dialog" aria-expanded={open}
        style={{ ...bubbleStyle, background: NAVY }}
        className={clsx('fixed z-[71] size-[52px] rounded-full text-white shadow-[0_8px_22px_rgba(21,45,67,0.35)] flex items-center justify-center border-0 cursor-pointer',
          'hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(21,45,67,0.4)] active:translate-y-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD666] focus-visible:ring-offset-2',
          'motion-safe:transition-[bottom,inset-inline-end,transform,box-shadow] motion-safe:duration-200')}
      >
        {open ? <X size={22} aria-hidden /> : <MessageCircle size={24} aria-hidden />}
        {unread && !open && <span aria-hidden className="absolute top-1 end-1 size-3 rounded-full bg-error ring-2 ring-white" />}
      </button>}

      {mounted && (
        <div
          role="dialog" aria-label={t('Edudeen Help')}
          onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); closeChat(); } }}
          style={panelStyle}
          className={clsx(
            'fixed z-[70] flex flex-col',
            sheet && 'inset-x-0 bottom-0 h-[82dvh]',
            'motion-safe:transition-[opacity,transform] motion-safe:duration-[180ms] motion-safe:ease-out',
            shown ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 motion-safe:scale-90 motion-safe:translate-y-2 pointer-events-none',
          )}
        >
          <section className={clsx('flex flex-col flex-1 min-h-0 bg-white text-carbon border border-bone shadow-2xl overflow-hidden', sheet ? 'rounded-t-2xl' : 'rounded-2xl')}>
            <header className="shrink-0 flex items-center gap-3 ps-4 pe-2 py-3 text-white relative overflow-hidden" style={{ background: `radial-gradient(circle at 92% -10%, rgba(255,214,102,0.30), transparent 55%), ${NAVY}` }}>
              <span className="relative size-10 rounded-full bg-white flex items-center justify-center shrink-0 ring-2 ring-white/30">
                <EdudeenIcon size={22} />
                <span aria-hidden className="absolute -bottom-0.5 -end-0.5 size-3 rounded-full bg-[#22c55e] ring-2 ring-[#174771]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-tight">{t('Edudeen Help')}</p>
                {statusChip ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[12px] leading-tight" role="status">
                    <span aria-hidden className={clsx('size-1.5 rounded-full', statusChip.dot)} />{statusChip.text}
                  </p>
                ) : <p className="text-[12px] text-white/80 leading-tight mt-0.5">{str.sub}</p>}
              </div>
              <button type="button" onClick={restart} aria-label={t('Start over')} className="p-2 rounded-full bg-transparent border-0 text-white/80 hover:text-white hover:bg-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD666]"><RotateCcw size={16} /></button>
              <button type="button" onClick={closeChat} aria-label={t('Close chat')} className="p-2 rounded-full bg-transparent border-0 text-white hover:bg-white/15 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD666]"><X size={18} /></button>
            </header>

            <div role="log" aria-live="polite" aria-relevant="additions" aria-label={t('Chat messages')} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 py-3 flex flex-col gap-3 bg-cream/40">
              {msgs.map(m => (
                <div key={m.id} className={clsx('flex flex-col', m.role === 'user' ? 'self-end items-end max-w-[85%]' : 'self-start items-start max-w-[92%]')}>
                  {m.role === 'admin' && <span className="text-[12px] font-semibold text-[#8a6a00] mb-0.5 ps-1">{str.team}</span>}
                  <div className="flex items-end gap-1.5">
                    {m.role === 'bot' && <span aria-hidden className="size-5 shrink-0 rounded-full bg-[#EAF2F8] text-brand-orange flex items-center justify-center mb-0.5"><Bot size={12} /></span>}
                    <div dir="auto" className={clsx('text-[13.5px] leading-relaxed rounded-2xl px-3 py-2 break-words [overflow-wrap:anywhere]',
                      m.role === 'user' ? 'bg-brand-royal text-white rounded-ee-sm'
                        : m.role === 'admin' ? 'bg-[#FFF6D6] border border-[#F0DE9A] text-carbon rounded-es-sm'
                          : 'bg-white border border-bone text-carbon rounded-es-sm')}>
                      {m.role === 'user' ? m.text : <RichText text={m.text} onNavigate={closeNav} />}
                    </div>
                  </div>
                  {m.at > 0 && <span className="text-[12px] text-slate mt-0.5 px-1">{timeOf(m.at)}</span>}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.actions.map(a => (
                        <Link key={a.to} to={a.to} onClick={closeNav} className="text-[12.5px] font-semibold rounded-full bg-brand-orange text-white px-3 py-1.5 no-underline">{a.label}</Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {busy && (
                <div className="self-start flex items-end gap-1.5" role="status" aria-label={t('Typing')}>
                  <span aria-hidden className="size-5 shrink-0 rounded-full bg-[#EAF2F8] text-brand-orange flex items-center justify-center mb-0.5"><Bot size={12} /></span>
                  <div className="rounded-2xl rounded-es-sm bg-white border border-bone px-3 py-2.5 flex gap-1">
                    {[0, 1, 2].map(i => <span key={i} className="size-1.5 rounded-full bg-slate/60 motion-safe:animate-bounce" style={{ animationDelay: `${i * 140}ms` }} />)}
                  </div>
                </div>
              )}
              {needContact && (
                <form onSubmit={submitGuest} className="rounded-2xl border border-bone bg-white p-3 flex flex-col gap-2" aria-label={str.guestTitle}>
                  <p className="text-[13px] font-semibold text-carbon">{str.guestTitle}</p>
                  <input value={gName} onChange={e => setGName(e.target.value)} maxLength={80} dir="auto" autoComplete="name" placeholder={str.guestName} aria-label={str.guestName}
                    className="rounded-lg border border-bone px-3 py-2 text-[14px] outline-none focus:border-brand-royal" />
                  <input value={gContact} onChange={e => setGContact(e.target.value)} maxLength={200} dir="auto" autoComplete="email" placeholder={str.guestContact} aria-label={str.guestContact}
                    className="rounded-lg border border-bone px-3 py-2 text-[14px] outline-none focus:border-brand-royal" />
                  {gError && <p role="alert" className="text-[12.5px] text-error">{gError}</p>}
                  <button type="submit" disabled={busy} className="rounded-full bg-brand-orange text-white text-[13px] font-semibold px-4 py-2 border-0 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-royal">{str.guestSend}</button>
                </form>
              )}
              {showChipsFor && showChipsFor.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-start pt-0.5">
                  {showChipsFor.map(c => (
                    <button key={c.id} type="button" onClick={() => tapChip(c)} dir="auto"
                      className="text-start text-[13px] leading-snug rounded-full border border-brand-royal/30 bg-white text-brand-royal px-3.5 py-1.5 cursor-pointer hover:bg-brand-royal/10 hover:border-brand-royal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/60 transition-colors">
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <form onSubmit={e => { e.preventDefault(); void sendText(input); }} className="shrink-0 flex items-center gap-2 border-t border-bone bg-white p-3 pb-2">
              <input
                ref={inputRef} value={input} onChange={e => setInput(e.target.value)} maxLength={1000} dir="auto" enterKeyHint="send"
                placeholder={t('Type your question...')} aria-label={t('Your message')}
                className="flex-1 min-w-0 rounded-full border border-bone bg-cream/30 px-4 py-2 text-[14px] outline-none focus:border-brand-royal focus:bg-white focus-visible:ring-2 focus-visible:ring-brand-royal/30"
              />
              <button type="submit" disabled={busy || !input.trim()} aria-label={t('Send')} className="size-10 shrink-0 rounded-full text-white flex items-center justify-center border-0 cursor-pointer disabled:opacity-50 disabled:cursor-default rtl:-scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD666] focus-visible:ring-offset-1" style={{ background: NAVY }}><Send size={16} /></button>
            </form>
            <p className="shrink-0 text-center text-[12px] text-slate pb-2 -mt-0.5 px-3">{str.footer}</p>
          </section>
          {!sheet && (
            <span aria-hidden className="absolute -bottom-[6px] size-3 rotate-45 bg-white border-b border-r border-bone" style={{ insetInlineEnd: caretEnd }} />
          )}
        </div>
      )}
    </div>
  );
}
