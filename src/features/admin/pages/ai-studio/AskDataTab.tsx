import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Textarea, Button } from '@/components/comman/ui';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { aiErrorInfo, apiAskData } from '@/api/services/aiFeatures';

const EXAMPLES = ['How many orders did we get in the last 7 days, by payment type?', 'Which stores earned the most this month?', 'How many listings are waiting for review?', 'How much did AI cost us this month, per feature?'];

/** Ask in plain words; Claude can only call a fixed list of read-only reports (never a raw query). */
export function AskDataTab() {
  const { loading, available, enabled } = useAiFeatures();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [res, setRes] = useState<{ answer: string; sources: { tool: string; input: unknown }[] } | null>(null);

  async function ask() {
    setBusy(true); setError(''); setRes(null);
    try { setRes((await apiAskData(q)).data); } catch (e) { setError(aiErrorInfo(e).message); } finally { setBusy(false); }
  }

  if (loading) return <p className="text-xs text-slate">Loading…</p>;
  if (!enabled('ask_data')) {
    return <p className="text-sm text-slate bg-white border border-bone rounded-xl px-5 py-6">{available ? 'Ask-your-data is switched off in Platform Config.' : 'AI is not configured (set ANTHROPIC_API_KEY on the API).'}</p>;
  }

  return (
    <div className="bg-white border border-bone rounded-xl px-[22px] py-5 flex flex-col gap-3 max-w-[820px]">
      <p className="font-serif text-[19px] text-carbon">Ask your data</p>
      <p className="text-[12px] text-slate">Read-only reports: orders, top products and stores, listing status, signups, reviews, AI usage. Results may mix PKR and USD.</p>
      <Textarea rows={3} value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. Which stores earned the most in the last 30 days?" maxLength={500} />
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map(x => <button key={x} type="button" onClick={() => setQ(x)} className="text-[11px] px-2.5 py-1 rounded-full bg-cream border border-bone text-graphite hover:border-brand-royal">{x}</button>)}
      </div>
      <Button variant="primary" size="md" className="self-start" loading={busy} disabled={q.trim().length < 3} onClick={ask} icon={<Sparkles size={14} />}>Ask</Button>
      {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
      {res && (
        <div className="bg-cream border border-bone rounded-lg px-4 py-3">
          <p className="text-[13px] text-carbon whitespace-pre-line leading-relaxed">{res.answer}</p>
          {res.sources.length > 0 && <p className="text-[10.5px] text-slate mt-2">Reports used: {res.sources.map(s => s.tool).join(', ')}</p>}
        </div>
      )}
    </div>
  );
}
