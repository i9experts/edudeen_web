import { useEffect, useState } from 'react';
import { MessageCircleQuestion, Trash2, Clock } from 'lucide-react';
import { Button, Textarea } from '@/components/comman/ui';
import { useAuthGate } from '@/contexts/AuthGateContext';
import { useToast } from '@/contexts/ToastContext';
import { apiGetProductQuestions, apiAskQuestion, apiDeleteQuestion, type ProductQuestion } from '@/api/services/classroom';

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/**
 * Public Q&A on a listing. Answers are written by the seller and help the
 * next teacher decide without messaging; your own unanswered questions show
 * only to you, marked as waiting.
 */
export function ProductQuestions({ productId, onCount }: { productId: string; onCount?: (n: number) => void }) {
  const { requireAuth } = useAuthGate();
  const toast = useToast();
  const [items, setItems] = useState<ProductQuestion[] | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => apiGetProductQuestions(productId)
    .then(res => { setItems(res.data ?? []); onCount?.((res.data ?? []).filter(q => q.answer).length); })
    .catch(() => setItems([]));
  useEffect(() => { void load(); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const ask = () => requireAuth(async () => {
    if (text.trim().length < 8) { toast.error('Write your question in a sentence or two.'); return; }
    setBusy(true);
    try {
      const res = await apiAskQuestion(productId, text.trim());
      toast.success(res.message ?? 'Question sent');
      setText('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send your question.');
    } finally {
      setBusy(false);
    }
  }, 'Sign in to ask the seller a question.');

  const remove = async (id: string) => {
    try { await apiDeleteQuestion(id); setItems(prev => (prev ?? []).filter(q => q._id !== id)); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not delete.'); }
  };

  return (
    <div id="questions" className="flex flex-col gap-5">
      <div className="rounded-xl border border-bone bg-cream/60 p-4">
        <p className="text-[13px] font-semibold text-carbon mb-2">Have a question before you buy?</p>
        <Textarea
          rows={2} maxLength={500} value={text} onChange={e => setText(e.target.value)}
          placeholder="e.g. Does this follow the Punjab board syllabus? Is the answer key included?"
          aria-label="Your question"
        />
        <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
          <p className="text-[11.5px] text-slate">The seller's answer is shown here for everyone.</p>
          <Button variant="primary" size="sm" loading={busy} disabled={!text.trim()} onClick={ask}>Ask the seller</Button>
        </div>
      </div>

      {items === null ? (
        <p className="text-[13px] text-slate">Loading questions…</p>
      ) : items.length === 0 ? (
        <p className="flex items-center gap-2 text-[13px] text-slate"><MessageCircleQuestion size={15} /> No questions yet — be the first to ask.</p>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col divide-y divide-bone">
          {items.map(q => (
            <li key={q._id} className="py-3 first:pt-0">
              <p className="text-[13.5px] font-semibold text-carbon"><span className="text-brand-orange me-1">Q:</span>{q.question}</p>
              {q.answer ? (
                <p className="text-[13px] text-graphite mt-1 whitespace-pre-line"><span className="font-semibold text-carbon me-1">A:</span>{q.answer}</p>
              ) : (
                <p className="inline-flex items-center gap-1 text-[12px] text-amber-700 mt-1"><Clock size={12} /> Waiting for the seller's answer</p>
              )}
              <p className="text-[11px] text-slate mt-1 flex items-center gap-2">
                {q.isMine ? 'You' : q.askerName} · {when(q.createdAt)}{q.answeredAt ? ` · answered ${when(q.answeredAt)}` : ''}
                {q.isMine && !q.answer && (
                  <button type="button" onClick={() => remove(q._id)} className="inline-flex items-center gap-1 bg-transparent border-none p-0 text-slate hover:text-error cursor-pointer text-[11px]">
                    <Trash2 size={11} /> Delete
                  </button>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
