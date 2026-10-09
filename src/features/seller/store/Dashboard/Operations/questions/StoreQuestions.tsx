import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircleQuestion, EyeOff, Eye } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Card, Button, Textarea, SkeletonBox, EmptyState } from '@/components/comman/ui';
import { TabBar } from '@/components/comman/ui/TabBar';
import { useToast } from '@/contexts/ToastContext';
import { apiGetSellerQuestions, apiAnswerQuestion, apiSetQuestionHidden, type SellerQuestion } from '@/api/services/classroom';

const FILTERS = [
  { id: 'unanswered', label: 'Needs an answer' },
  { id: 'answered', label: 'Answered' },
  { id: 'hidden', label: 'Hidden' },
];

function QuestionCard({ q, storeId, onChange }: { q: SellerQuestion; storeId: string; onChange: (q: SellerQuestion | null) => void }) {
  const toast = useToast();
  const [draft, setDraft] = useState(q.answer ?? '');
  const [editing, setEditing] = useState(!q.answer);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const res = await apiAnswerQuestion(storeId, q._id, draft.trim());
      toast.success('Answer published on the product page');
      setEditing(false);
      onChange({ ...q, answer: res.data.answer, answeredAt: res.data.answeredAt, hidden: false });
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setBusy(false); }
  };

  const toggleHidden = async () => {
    try { await apiSetQuestionHidden(storeId, q._id, !q.hidden); onChange({ ...q, hidden: !q.hidden }); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not update.'); }
  };

  return (
    <Card padding="none">
      <div className="px-4 md:px-5 py-3 border-b border-bone flex items-center gap-3">
        {q.productImage ? <img src={q.productImage} alt="" className="w-9 h-9 rounded-md object-cover border border-bone" /> : <span className="w-9 h-9 rounded-md bg-bone" />}
        <div className="min-w-0 flex-1">
          {q.productSlug
            ? <Link to={`/product/${q.productSlug}#questions`} target="_blank" className="text-[13px] font-semibold text-carbon no-underline hover:text-brand-orange truncate block">{q.productName}</Link>
            : <span className="text-[13px] font-semibold text-carbon">{q.productName}</span>}
          <p className="text-[12px] text-slate">{q.askerName || 'A buyer'} · {new Date(q.createdAt).toLocaleDateString()}</p>
        </div>
        <Button variant="ghost" size="xs" onClick={toggleHidden}>{q.hidden ? <><Eye size={12} /> Show</> : <><EyeOff size={12} /> Hide</>}</Button>
      </div>
      <div className="px-4 md:px-5 py-3 flex flex-col gap-2">
        <p className="text-[13.5px] text-carbon font-medium">{q.question}</p>
        {editing ? (
          <>
            <Textarea rows={3} maxLength={1500} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Your answer is shown publicly on the product page." aria-label="Answer" />
            <div className="flex gap-2 justify-end">
              {q.answer && <Button variant="ghost" size="sm" onClick={() => { setDraft(q.answer ?? ''); setEditing(false); }}>Cancel</Button>}
              <Button variant="primary" size="sm" loading={busy} disabled={draft.trim().length < 2} onClick={save}>Publish answer</Button>
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-cream px-3 py-2">
            <p className="text-[13px] text-graphite whitespace-pre-line">{q.answer}</p>
            <button type="button" onClick={() => setEditing(true)} className="mt-1 bg-transparent border-none p-0 text-[12px] font-semibold text-brand-orange cursor-pointer">Edit answer</button>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Store → Questions: answer buyers' pre-purchase questions. */
export function StoreQuestions() {
  usePageTitle('Questions');
  const { storeId } = useStoreWorkspace();
  const [filter, setFilter] = useState('unanswered');
  const [rows, setRows] = useState<SellerQuestion[] | null>(null);
  const [unanswered, setUnanswered] = useState(0);

  useEffect(() => {
    setRows(null);
    apiGetSellerQuestions(storeId, filter)
      .then(res => { setRows(res.data.questions); setUnanswered(res.data.unanswered); })
      .catch(() => setRows([]));
  }, [storeId, filter]);

  return (
    <>
      <StorePageHeader title="Questions" subtitle="Buyers ask before they buy — a quick, clear answer often turns into a sale." />
      <div className="px-4 lg:px-7 pb-8 pt-5 flex flex-col gap-4 max-w-[900px]">
        <TabBar
          tabs={FILTERS.map(f => ({ id: f.id, label: f.id === 'unanswered' && unanswered ? `${f.label} (${unanswered})` : f.label }))}
          active={filter}
          onChange={setFilter}
        />
        {rows === null ? (
          <SkeletonBox height={140} rounded="12px" />
        ) : rows.length === 0 ? (
          <Card><EmptyState icon={<MessageCircleQuestion size={22} />} title={filter === 'unanswered' ? 'All caught up' : 'Nothing here'} description={filter === 'unanswered' ? 'New questions from buyers will show up here and in your notifications.' : undefined} /></Card>
        ) : rows.map(q => (
          <QuestionCard key={q._id} q={q} storeId={storeId} onChange={next => {
            setRows(prev => (prev ?? []).map(x => x._id === q._id ? next! : x));
            if (filter === 'unanswered' && next?.answer) setUnanswered(n => Math.max(0, n - 1));
          }} />
        ))}
      </div>
    </>
  );
}
