import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { AxiosRequestConfig } from 'axios';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { Toggle } from '@/components/comman/ui/Toggle';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { apiCreateFaq, apiDeleteFaq, apiGetAllFaqs, apiToggleFaq, apiUpdateFaq, type Faq } from '@/api/services/faq';
import { useReauth } from '@/contexts/reauthCtx';
import { inlineEditConfig } from '@/api/services/reauth';

/** Inline editor for the public FAQ list. Every write asks for the admin password first. */
export default function FaqEditorModal({ onChanged, onClose }: { onChanged: () => void; onClose: () => void }) {
  const { confirm } = useReauth();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<Faq | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Faq | null>(null);

  const load = useCallback(async () => {
    setError('');
    try { setFaqs((await apiGetAllFaqs()).data ?? []); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load the FAQs.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const beforeWrite = useCallback(async (): Promise<AxiosRequestConfig | null> => {
    const token = await confirm();
    return token ? inlineEditConfig(token) : null;
  }, [confirm]);

  const run = async (id: string, fn: (cfg: AxiosRequestConfig) => Promise<unknown>) => {
    setError('');
    const cfg = await beforeWrite();
    if (!cfg) return; // password not confirmed - nothing changed
    setBusyId(id);
    try { await fn(cfg); await load(); onChanged(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save the change.'); }
    finally { setBusyId(null); }
  };

  return (
    <>
      <Modal mobileSheet width={640} title="Edit FAQs" onClose={onClose}
        footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button onClick={() => setForm('new')}><Plus size={14} className="inline align-middle me-1" />Add FAQ</Button></>}>
        <p className="text-[12px] text-slate mb-3">Every change asks for your password and goes live immediately. Hidden FAQs stay off the public page.</p>
        {error && <p className="text-[12px] text-error mb-2" role="alert">{error}</p>}
        {loading ? (
          <div className="flex flex-col gap-2"><SkeletonBox className="h-[56px] w-full" /><SkeletonBox className="h-[56px] w-full" /></div>
        ) : faqs.length === 0 ? (
          <p className="text-[13px] text-slate py-6 text-center">No FAQs yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {faqs.map(f => (
              <li key={f._id} className="flex items-center gap-3 rounded-xl border border-bone p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-carbon truncate">{f.question}</p>
                  <p className="text-[12px] text-slate truncate capitalize">{f.category} · order {f.order}</p>
                </div>
                <Toggle label={f.isActive ? 'Hide FAQ' : 'Show FAQ'} checked={f.isActive} disabled={busyId === f._id} onChange={() => void run(f._id, cfg => apiToggleFaq(f._id, cfg))} />
                <button type="button" aria-label="Edit FAQ" title="Edit" disabled={busyId === f._id} onClick={() => setForm(f)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-bone bg-white text-charcoal cursor-pointer hover:bg-fog disabled:opacity-40"><Pencil size={14} /></button>
                <button type="button" aria-label="Delete FAQ" title="Delete" disabled={busyId === f._id} onClick={() => setDeleting(f)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-bone bg-white text-charcoal cursor-pointer hover:bg-fog disabled:opacity-40"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {form && (
        <FaqForm faq={form === 'new' ? null : form} onClose={() => setForm(null)}
          onSave={async payload => {
            const cfg = await beforeWrite();
            if (!cfg) return false;
            if (form === 'new') await apiCreateFaq(payload, cfg); else await apiUpdateFaq(form._id, payload, cfg);
            await load(); onChanged();
            return true;
          }} />
      )}

      {deleting && (
        <Modal title="Delete this FAQ?" onClose={() => setDeleting(null)}
          footer={<><Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button onClick={() => { const f = deleting; setDeleting(null); void run(f._id, cfg => apiDeleteFaq(f._id, cfg)); }}>Delete</Button></>}>
          <p className="text-[13px] text-slate">"{deleting.question}" is removed for good. You will be asked for your password next.</p>
        </Modal>
      )}
    </>
  );
}

function FaqForm({ faq, onSave, onClose }: {
  faq: Faq | null; onClose: () => void;
  onSave: (p: { question: string; answer: string; category: string; order: number; isActive: boolean }) => Promise<boolean>;
}) {
  const [question, setQuestion] = useState(faq?.question ?? '');
  const [answer, setAnswer] = useState(faq?.answer ?? '');
  const [category, setCategory] = useState(faq?.category ?? 'general');
  const [order, setOrder] = useState(String(faq?.order ?? 0));
  const [isActive, setIsActive] = useState(faq?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!question.trim() || !answer.trim()) { setError('Question and answer are required.'); return; }
    setError(''); setSaving(true);
    try {
      const ok = await onSave({ question: question.trim(), answer: answer.trim(), category: category.trim() || 'general', order: Number(order) || 0, isActive });
      if (ok) onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save the FAQ.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal mobileSheet width={520} title={faq ? 'Edit FAQ' : 'Add FAQ'} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>{faq ? 'Save changes' : 'Add FAQ'}</Button></>}>
      <div className="flex flex-col gap-4">
        <Input label="Question" value={question} onChange={e => setQuestion(e.target.value)} />
        <Textarea label="Answer" rows={4} value={answer} onChange={e => setAnswer(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Category" value={category} onChange={e => setCategory(e.target.value)} />
          <Input label="Display order" type="number" min={0} value={order} onChange={e => setOrder(e.target.value)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-charcoal">Shown on the FAQ page</span>
          <Toggle label="FAQ active" checked={isActive} onChange={setIsActive} />
        </div>
        {error && <p className="text-[12px] text-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
