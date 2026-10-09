import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, HelpCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminFaqs } from '@/hooks/admin/useAdminFaqs';
import { apiCreateFaq, apiUpdateFaq, apiToggleFaq, apiDeleteFaq, type Faq } from '@/api/services/faq';
import { Button } from '@/components/comman/ui/Button';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { Modal } from '@/components/comman/ui/Modal';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { Toggle } from '@/components/comman/ui/Toggle';
import { Table, type TableColumn } from '@/components/comman/ui/Table';

// ── Form modal ────────────────────────────────────────────────────────────────
function FaqFormModal({ faq, onClose, onSaved }: { faq: Faq | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!faq;
  const [question, setQuestion] = useState(faq?.question ?? '');
  const [answer, setAnswer]     = useState(faq?.answer ?? '');
  const [category, setCategory] = useState(faq?.category ?? 'general');
  const [order, setOrder]       = useState(String(faq?.order ?? 0));
  const [isActive, setIsActive] = useState(faq?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function submit() {
    if (!question.trim() || !answer.trim()) { setError('Question and answer are required.'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = { question, answer, category: category || 'general', order: Number(order) || 0, isActive };
      if (isEdit) await apiUpdateFaq(faq._id, payload);
      else await apiCreateFaq(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save FAQ.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal mobileSheet
      title={isEdit ? 'Edit FAQ' : 'Add FAQ'}
      width={520}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{isEdit ? 'Save Changes' : 'Add FAQ'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Question" placeholder="How do I reset my password?" value={question} onChange={e => setQuestion(e.target.value)} />
        <Textarea label="Answer" rows={4} placeholder="Explain the answer in detail…" value={answer} onChange={e => setAnswer(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Category" placeholder="general" value={category} onChange={e => setCategory(e.target.value)} />
          <Input label="Display Order" type="number" min={0} value={order} onChange={e => setOrder(e.target.value)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-charcoal">Active</span>
          <Toggle checked={isActive} onChange={setIsActive} />
        </div>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminFaqs() {
  usePageTitle('FAQs');
  const { faqs, stats, loading, error, refetch } = useAdminFaqs();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editing, setEditing] = useState<Faq | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Faq | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const categories = useMemo(() => Array.from(new Set(faqs.map(f => f.category))).sort(), [faqs]);
  const filtered = useMemo(
    () => categoryFilter ? faqs.filter(f => f.category === categoryFilter) : faqs,
    [faqs, categoryFilter],
  );

  async function handleToggle(faq: Faq) {
    setActionError('');
    try {
      await apiToggleFaq(faq._id);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to toggle FAQ.');
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setActionError('');
    try {
      await apiDeleteFaq(deleting._id);
      setDeleting(null);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete FAQ.');
    } finally {
      setDeleteBusy(false);
    }
  }

  const columns: TableColumn<Faq>[] = [
    {
      key: 'question', header: 'Question',
      render: f => (
        <div className="max-w-[360px]">
          <p className="font-semibold truncate">{f.question}</p>
          <p className="text-[12px] text-slate truncate">{f.answer}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: f => <span className="text-graphite capitalize whitespace-nowrap">{f.category}</span> },
    { key: 'order', header: 'Order', render: f => <span className="text-slate whitespace-nowrap">{f.order}</span> },
    {
      key: 'status', header: 'Status',
      render: f => (
        <button onClick={() => handleToggle(f)} className="px-[10px] py-[3px] rounded-[5px] text-[12px] font-semibold border-none cursor-pointer outline-none transition-[filter] duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50"
          style={{ background: f.isActive ? '#EAF7EF' : '#EDF2F4', color: f.isActive ? '#1E7A3C' : '#486071' }}>
          {f.isActive ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'actions', header: 'Actions',
      render: f => (
        <div className="flex gap-[6px]">
          <Button size="xs" variant="outline" icon={<Pencil size={11} />} onClick={() => setEditing(f)}>Edit</Button>
          <Button size="xs" variant="danger" icon={<Trash2 size={11} />} onClick={() => { setDeleting(f); setActionError(''); }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Content"
        title="FAQs"
        subtitle={`${stats.active} active · ${stats.inactive} inactive`}
        actions={<Button icon={<Plus size={14} />} onClick={() => setEditing('new')} className="shrink-0">Add FAQ</Button>}
      />

      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-4">
        {actionError && (
          <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">
            {actionError}
          </div>
        )}
        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          <div className="px-5 py-[14px] border-b border-bone flex items-center gap-[10px] flex-wrap">
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {error ? (
            <p className="px-4 py-6 text-center text-[13px] text-error">{error}</p>
          ) : (
            <Table
              columns={columns}
              data={filtered}
              keyExtractor={f => f._id}
              loading={loading}
              emptyState={{ icon: <HelpCircle size={28} className="text-slate" />, title: 'No FAQs found' }}
            />
          )}
        </div>
      </div>

      {editing && (
        <FaqFormModal
          faq={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
        />
      )}

      {deleting && (
        <Modal mobileSheet
          title="Delete FAQ"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleteBusy}>Delete FAQ</Button>
            </>
          }
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Delete "<strong>{deleting.question}</strong>"? This cannot be undone.
          </p>
          {actionError && <p className="text-[12px] text-error mt-2">{actionError}</p>}
        </Modal>
      )}
    </div>
  );
}
