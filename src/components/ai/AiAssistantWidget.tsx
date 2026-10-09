import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Send, X } from 'lucide-react';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { aiErrorInfo, apiAssistantChat, type AiProductCard, type ChatTurn } from '@/api/services/aiFeatures';

const HIDDEN_PREFIXES = ['/store', '/admin', '/seller', '/onboarding', '/checkout', '/maintenance', '/login', '/register'];

interface Msg extends ChatTurn { products?: AiProductCard[] }

const money = (p: AiProductCard) => (p.price == null ? '' : `${p.currency === 'USD' ? '$' : 'Rs '}${p.price.toLocaleString()}`);

/** Floating shopping assistant. Only real catalogue products are shown (cards come from the API, never from the model's text). */
export function AiAssistantWidget() {
  const { pathname } = useLocation();
  // Only buyer pages load the assistant (and its feature check).
  if (HIDDEN_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return <AssistantInner />;
}

function AssistantInner() {
  const { enabled } = useAiFeatures();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs, busy, open]);

  if (!enabled('shopping_assistant')) return null;

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content }];
    setMsgs(next); setInput(''); setBusy(true); setError('');
    try {
      const res = await apiAssistantChat(next.map(({ role, content: c }) => ({ role, content: c })));
      setMsgs([...next, { role: 'assistant', content: res.data.reply || '…', products: res.data.products }]);
    } catch (e) {
      setError(aiErrorInfo(e).message);
    } finally { setBusy(false); }
  }

  return (
    <>
      {!open && (
        <button
          type="button" onClick={() => setOpen(true)} aria-label="Open shopping assistant"
          className="fixed z-40 bottom-24 md:bottom-6 end-4 flex items-center gap-2 rounded-full bg-brand-royal text-white shadow-lg px-4 py-3 text-[13px] font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/60"
        >
          <Sparkles size={16} /> Ask Edudeen
        </button>
      )}
      {open && (
        <div role="dialog" aria-label="Shopping assistant" className="fixed z-50 inset-x-3 bottom-3 md:inset-x-auto md:end-6 md:bottom-6 md:w-[380px] max-h-[80vh] flex flex-col rounded-2xl border border-bone bg-white shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-bone">
            <p className="text-[14px] font-semibold text-carbon flex items-center gap-2"><Sparkles size={15} className="text-brand-royal" /> Edudeen assistant</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-slate hover:text-carbon"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-[200px]">
            {msgs.length === 0 && (
              <div className="text-[13px] text-graphite">
                <p className="mb-2">Assalamu alaikum! Ask me to find resources, e.g.</p>
                <div className="flex flex-col gap-1.5">
                  {['Class 5 Urdu workbooks under Rs 1000', 'Quran learning for kids age 6', 'Where is my order?'].map(s => (
                    <button key={s} type="button" onClick={() => send(s)} className="text-start text-[12px] px-3 py-1.5 rounded-lg bg-cream border border-bone hover:border-brand-royal">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[95%]'}>
                <p dir="auto" translate="no" className={`text-[13px] leading-relaxed whitespace-pre-line rounded-2xl px-3 py-2 ${m.role === 'user' ? 'bg-brand-royal text-white' : 'bg-cream text-carbon'}`}>{m.content}</p>
                {m.products && m.products.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2">
                    {m.products.slice(0, 4).map(p => (
                      <Link key={p.id} to={p.url} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl border border-bone p-2 hover:border-brand-royal">
                        {p.image ? <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-cream shrink-0" />}
                        <span className="min-w-0">
                          <span className="block text-[12px] font-semibold text-carbon truncate" translate="no">{p.name}</span>
                          <span className="block text-[11px] text-slate">{money(p)}{p.ratingCount > 0 ? ` · ${p.rating}★ (${p.ratingCount})` : ''}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="text-[12px] text-slate">Thinking…</p>}
            {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={e => { e.preventDefault(); void send(input); }} className="flex items-center gap-2 border-t border-bone p-3">
            <input
              value={input} onChange={e => setInput(e.target.value)} maxLength={500} placeholder="Type your question…" aria-label="Message"
              className="flex-1 min-w-0 rounded-full border border-bone px-4 py-2 text-[13px] outline-none focus:border-brand-royal"
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="w-9 h-9 rounded-full bg-brand-royal text-white flex items-center justify-center disabled:opacity-50"><Send size={15} /></button>
          </form>
          <p className="px-4 pb-2 text-[10px] text-slate">AI can make mistakes. Check product details before buying.</p>
        </div>
      )}
    </>
  );
}
