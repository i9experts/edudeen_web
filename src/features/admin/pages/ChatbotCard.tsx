import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/comman/ui/Button';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { Toggle } from '@/components/comman/ui/Toggle';
import { apiGetChatbotAdmin, apiUpdateChatbot } from '@/api/services/chatbot';
import { usePublicPlatformConfig } from '@/hooks/usePublicPlatformConfig';
import { CHIP_COUNT, type ChatbotConfig, type ChatQA } from '@/components/chat/chatbotDefaults';

type ListKey = 'buyerQuestions' | 'sellerQuestions';
const MAX = 30;

/** Admin -> Platform Config -> Chatbot: the Edudeen Help widget's questions/answers (English, Urdu, Roman Urdu), on/off and AI use. */
export function ChatbotCard() {
  const { refresh } = usePublicPlatformConfig();
  const [cfg, setCfg] = useState<ChatbotConfig | null>(null);
  const [tab, setTab] = useState<ListKey>('buyerQuestions');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const fetchCfg = () => apiGetChatbotAdmin().then(r => setCfg(r.data)).catch(e => setLoadError(e instanceof Error ? e.message : 'Could not load the chatbot settings.'));
  const load = () => { setLoadError(''); void fetchCfg(); };
  useEffect(() => { void fetchCfg(); }, []);  

  if (loadError) return <div className="bg-white border border-bone rounded-xl px-[22px] py-5 text-[13px]"><p className="text-error mb-3">{loadError}</p><Button variant="secondary" size="sm" onClick={load}>Retry</Button></div>;
  if (!cfg) return <div className="bg-white border border-bone rounded-xl px-[22px] py-5 text-[13px] text-slate">Loading chatbot settings…</div>;

  const list = cfg[tab];
  const edit = (patch: Partial<ChatbotConfig>) => { setSaved(false); setCfg({ ...cfg, ...patch }); };
  const setItem = (i: number, patch: Partial<ChatQA>) => edit({ [tab]: list.map((q, idx) => (idx === i ? { ...q, ...patch } : q)) } as Partial<ChatbotConfig>);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d; if (j < 0 || j >= list.length) return;
    const next = [...list]; [next[i], next[j]] = [next[j], next[i]]; edit({ [tab]: next } as Partial<ChatbotConfig>);
  };
  const remove = (i: number) => edit({ [tab]: list.filter((_, idx) => idx !== i) } as Partial<ChatbotConfig>);
  const add = () => { if (list.length < MAX) edit({ [tab]: [...list, { id: `new${Date.now().toString(36)}`, q: '', a: '' }] } as Partial<ChatbotConfig>); };

  const save = async (body: Parameters<typeof apiUpdateChatbot>[0]) => {
    setError(''); setSaved(false); setBusy(true);
    try {
      const res = await apiUpdateChatbot(body);
      setCfg(res.data); setSaved(true); refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the chatbot settings.'); }
    finally { setBusy(false); }
  };
  const saveAll = () => {
    for (const key of ['buyerQuestions', 'sellerQuestions'] as ListKey[]) {
      const bad = cfg[key].findIndex(q => !q.q.trim() || !q.a.trim());
      if (bad >= 0) { setError(`${key === 'buyerQuestions' ? 'Buyer' : 'Seller'} question #${bad + 1}: the question and the English answer are required.`); setTab(key); return; }
    }
    void save({
      enabled: cfg.enabled, aiEnabled: cfg.aiEnabled, useAiFallback: cfg.useAiFallback, buyerQuestions: cfg.buyerQuestions, sellerQuestions: cfg.sellerQuestions,
      welcomeText: cfg.welcomeText, welcomeTextUr: cfg.welcomeTextUr, fallbackText: cfg.fallbackText, fallbackTextUr: cfg.fallbackTextUr,
    });
  };
  const resetList = () => { if (window.confirm('Reset this list to the built-in Edudeen questions? Your edits to it are lost.')) void save({ [tab]: null }); };

  return (
    <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
      <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] mb-1">Edudeen Help chatbot</p>
      <p className="text-[12.5px] text-slate mb-4">The chat bubble at the bottom corner of the site. The first {CHIP_COUNT} questions of each list are shown as tappable suggestions; any further ones are only used to answer typed questions. Links in answers: <code>[text](/path)</code>.</p>

      <div className="flex flex-wrap gap-x-8 gap-y-3 mb-5">
        <label className="flex items-center gap-3 text-[13px] text-carbon"><Toggle checked={cfg.enabled} onChange={v => edit({ enabled: v })} label="Show the chat bubble" /> Show the chat bubble</label>
        <label className="flex items-center gap-3 text-[13px] text-carbon"><Toggle checked={cfg.useAiFallback} onChange={v => edit({ useAiFallback: v })} label="AI fallback" /> AI fallback (let AI answer unmatched questions)</label>
        <label className="flex items-center gap-3 text-[13px] text-carbon"><Toggle checked={cfg.aiEnabled} onChange={v => edit({ aiEnabled: v })} label="Use AI to translate answers into other languages" /> Use AI to translate answers into other languages</label>
      </div>
      <p className="text-[12px] text-slate -mt-3 mb-5">By default a typed question that is not a greeting or one of the answers below is sent to the <a href="/admin/messages?tab=chat" className="underline text-brand-royal">Chat inbox</a> for your team to answer. Turn <strong>AI fallback</strong> on to let the AI answer those instead (it also needs the <strong>Help bot</strong> switch in AI settings).</p>

      <div role="tablist" aria-label="Chatbot audience" className="flex gap-2 mb-4">
        {([['buyerQuestions', 'Buyer questions'], ['sellerQuestions', 'Seller questions']] as [ListKey, string][]).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold border cursor-pointer ${tab === k ? 'bg-brand-royal text-white border-brand-royal' : 'bg-white text-slate border-bone'}`}>{label} ({cfg[k].length})</button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {list.length === 0 && <p className="text-[13px] text-slate">No questions yet. Add one, or reset to the built-in list.</p>}
        {list.map((qa, i) => (
          <details key={qa.id} open={!qa.q} className="rounded-lg border border-bone bg-cream/30 group">
            <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer list-none">
              <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 ${i < CHIP_COUNT ? 'bg-brand-royal text-white' : 'bg-bone text-slate'}`}>{i < CHIP_COUNT ? `Chip ${i + 1}` : 'Searchable'}</span>
              <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-carbon">{qa.q || 'New question'}</span>
              <span className="flex items-center gap-1" onClick={e => e.preventDefault()}>
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 bg-transparent border-0 cursor-pointer text-slate disabled:opacity-30"><ArrowUp size={14} /></button>
                <button type="button" aria-label="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="p-1 bg-transparent border-0 cursor-pointer text-slate disabled:opacity-30"><ArrowDown size={14} /></button>
                <button type="button" aria-label="Delete question" onClick={() => remove(i)} className="p-1 bg-transparent border-0 cursor-pointer text-error"><Trash2 size={14} /></button>
              </span>
            </summary>
            <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Question (English)" value={qa.q} maxLength={150} onChange={e => setItem(i, { q: e.target.value })} />
              <Input label="Question (Urdu)" dir="rtl" value={qa.qUr ?? ''} maxLength={150} onChange={e => setItem(i, { qUr: e.target.value })} />
              <Textarea label="Answer (English)" rows={5} value={qa.a} maxLength={1500} onChange={e => setItem(i, { a: e.target.value })} />
              <Textarea label="Answer (Urdu)" dir="rtl" rows={5} value={qa.aUr ?? ''} maxLength={1500} onChange={e => setItem(i, { aUr: e.target.value })} />
              <Input label="Question (Roman Urdu)" value={qa.qRu ?? ''} maxLength={150} onChange={e => setItem(i, { qRu: e.target.value })} />
              <span className="hidden sm:block" />
              <Textarea label="Answer (Roman Urdu)" rows={5} value={qa.aRu ?? ''} maxLength={1500} onChange={e => setItem(i, { aRu: e.target.value })} />
            </div>
          </details>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={add} disabled={list.length >= MAX}>Add question</Button>
        <Button variant="ghost" size="sm" onClick={resetList} disabled={busy}>Reset this list to defaults</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        <Textarea label="Welcome message (English)" rows={2} value={cfg.welcomeText} maxLength={600} onChange={e => edit({ welcomeText: e.target.value })} />
        <Textarea label="Welcome message (Urdu)" dir="rtl" rows={2} value={cfg.welcomeTextUr} maxLength={600} onChange={e => edit({ welcomeTextUr: e.target.value })} />
        <Textarea label="When no answer is found (English)" rows={3} value={cfg.fallbackText} maxLength={600} onChange={e => edit({ fallbackText: e.target.value })} />
        <Textarea label="When no answer is found (Urdu)" dir="rtl" rows={3} value={cfg.fallbackTextUr} maxLength={600} onChange={e => edit({ fallbackTextUr: e.target.value })} />
      </div>
      <p className="text-[12px] text-slate mt-2">Greetings (Assalamualaikum, hello, thanks, goodbye in many languages) are built in and answered automatically.</p>

      {error && <p role="alert" className="text-[13px] text-error mt-4">{error}</p>}
      {saved && <p role="status" className="text-[13px] text-success mt-4">Saved. The chat bubble now uses these answers.</p>}
      <div className="mt-4"><Button onClick={saveAll} loading={busy}>Save chatbot</Button></div>
    </div>
  );
}
