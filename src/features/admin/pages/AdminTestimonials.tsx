import { useState } from 'react';
import { Plus, Pencil, Trash2, Quote } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminTestimonials } from '@/hooks/admin/useAdminTestimonials';
import {
  apiCreateTestimonial, apiUpdateTestimonial, apiToggleTestimonial, apiDeleteTestimonial,
  type AdminTestimonial,
} from '@/api/services/testimonials';
import { Button } from '@/components/comman/ui/Button';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { Modal } from '@/components/comman/ui/Modal';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { Toggle } from '@/components/comman/ui/Toggle';
import { Table, type TableColumn } from '@/components/comman/ui/Table';
import { StarRating } from '@/components/comman/ui/StarRating';

// ── Form modal ────────────────────────────────────────────────────────────────
function TestimonialFormModal({ testimonial, onClose, onSaved }: { testimonial: AdminTestimonial | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!testimonial;
  const [sellerName, setSellerName] = useState(testimonial?.sellerName ?? '');
  const [storeName, setStoreName]   = useState(testimonial?.storeName ?? '');
  const [rating, setRating]         = useState(testimonial?.rating ?? 5);
  const [text, setText]             = useState(testimonial?.text ?? '');
  const [order, setOrder]           = useState(String(testimonial?.order ?? 0));
  const [isVerifiedSeller, setIsVerifiedSeller] = useState(testimonial?.isVerifiedSeller ?? true);
  const [isActive, setIsActive]     = useState(testimonial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function submit() {
    if (!sellerName.trim() || !text.trim()) { setError('Seller name and quote are required.'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        sellerName, text, rating,
        storeName: storeName.trim() || undefined,
        order: Number(order) || 0,
        isVerifiedSeller, isActive,
      };
      if (isEdit) await apiUpdateTestimonial(testimonial._id, payload);
      else await apiCreateTestimonial(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save testimonial.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal mobileSheet
      title={isEdit ? 'Edit Testimonial' : 'Add Testimonial'}
      width={520}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{isEdit ? 'Save Changes' : 'Add Testimonial'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Seller Name" placeholder="Amina Raza" value={sellerName} onChange={e => setSellerName(e.target.value)} />
          <Input label="Store Name (optional)" placeholder="Amina Books" value={storeName} onChange={e => setStoreName(e.target.value)} />
        </div>
        <div>
          <p className="text-[12.5px] font-medium text-charcoal mb-1.5">Rating</p>
          <StarRating value={rating} onChange={setRating} size={20} />
        </div>
        <Textarea label="Quote" rows={4} placeholder="Edudeen made it so easy to launch my store…" value={text} onChange={e => setText(e.target.value)} />
        <Input label="Display Order" type="number" min={0} value={order} onChange={e => setOrder(e.target.value)} />
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-charcoal">Verified Seller badge</span>
          <Toggle checked={isVerifiedSeller} onChange={setIsVerifiedSeller} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-charcoal">Published (visible on homepage)</span>
          <Toggle checked={isActive} onChange={setIsActive} />
        </div>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminTestimonials() {
  usePageTitle('Testimonials');
  const { testimonials, stats, loading, error, refetch } = useAdminTestimonials();
  const [editing, setEditing] = useState<AdminTestimonial | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminTestimonial | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function handleToggle(testimonial: AdminTestimonial) {
    setActionError('');
    try {
      await apiToggleTestimonial(testimonial._id);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to toggle testimonial.');
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setActionError('');
    try {
      await apiDeleteTestimonial(deleting._id);
      setDeleting(null);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete testimonial.');
    } finally {
      setDeleteBusy(false);
    }
  }

  const columns: TableColumn<AdminTestimonial>[] = [
    {
      key: 'text', header: 'Testimonial',
      render: t => (
        <div className="max-w-[360px]">
          <p className="font-semibold truncate">{t.sellerName}{t.storeName ? ` · ${t.storeName}` : ''}</p>
          <p className="text-[12px] text-slate truncate">{t.text}</p>
        </div>
      ),
    },
    { key: 'rating', header: 'Rating', render: t => <StarRating value={t.rating} size={12} /> },
    { key: 'order', header: 'Order', render: t => <span className="text-slate whitespace-nowrap">{t.order}</span> },
    {
      key: 'status', header: 'Status',
      render: t => (
        <button onClick={() => handleToggle(t)} className="px-[10px] py-[3px] rounded-[5px] text-[12px] font-semibold border-none cursor-pointer outline-none transition-[filter] duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-brand-orange/50"
          style={{ background: t.isActive ? '#EAF7EF' : '#EDF2F4', color: t.isActive ? '#1E7A3C' : '#486071' }}>
          {t.isActive ? 'Published' : 'Hidden'}
        </button>
      ),
    },
    {
      key: 'actions', header: 'Actions',
      render: t => (
        <div className="flex gap-[6px]">
          <Button size="xs" variant="outline" icon={<Pencil size={11} />} onClick={() => setEditing(t)}>Edit</Button>
          <Button size="xs" variant="danger" icon={<Trash2 size={11} />} onClick={() => { setDeleting(t); setActionError(''); }}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Content"
        title="Testimonials"
        subtitle={`Seller reviews of Edudeen shown on the homepage — ${stats.active} published · ${stats.inactive} hidden`}
        actions={<Button icon={<Plus size={14} />} onClick={() => setEditing('new')} className="shrink-0">Add Testimonial</Button>}
      />

      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-4">
        {actionError && (
          <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">
            {actionError}
          </div>
        )}
        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          {error ? (
            <p className="px-4 py-6 text-center text-[13px] text-error">{error}</p>
          ) : (
            <Table
              columns={columns}
              data={testimonials}
              keyExtractor={t => t._id}
              loading={loading}
              emptyState={{ icon: <Quote size={28} className="text-slate" />, title: 'No testimonials yet' }}
            />
          )}
        </div>
      </div>

      {editing && (
        <TestimonialFormModal
          testimonial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
        />
      )}

      {deleting && (
        <Modal mobileSheet
          title="Delete Testimonial"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleteBusy}>Delete Testimonial</Button>
            </>
          }
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Delete the testimonial from "<strong>{deleting.sellerName}</strong>"? This cannot be undone.
          </p>
          {actionError && <p className="text-[12px] text-error mt-2">{actionError}</p>}
        </Modal>
      )}
    </div>
  );
}
