import { useState } from 'react';
import { Plus, Pencil, Trash2, FileStack } from 'lucide-react';
import { Card } from '@/components/comman/ui/Card';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Input, Select } from '@/components/comman/ui/Input';
import { Field } from '@/components/comman/ui/Field';
import { Badge } from '@/components/comman/ui/Badge';
import { Table, type TableColumn } from '@/components/comman/ui/Table';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { useSeoLandingPages, useSeoLandingPageMutations } from '@/hooks/admin/seo/useSeoLandingPages';
import type { LandingPageRow } from '@/api/services/seo/admin/landingPages.service';

export function LandingPagesTab() {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useSeoLandingPages({ page, limit: 20 });
  const { createLandingPage, updateLandingPage, deleteLandingPage, submitting } = useSeoLandingPageMutations();

  const [editing, setEditing] = useState<LandingPageRow | 'new' | null>(null);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [deleting, setDeleting] = useState<LandingPageRow | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const openNew = () => { setSlug(''); setTitle(''); setStatus('draft'); setEditing('new'); };
  const openEdit = (row: LandingPageRow) => { setSlug(row.slug); setTitle(row.title); setStatus(row.status as 'draft' | 'published'); setEditing(row); };

  const handleSave = async () => {
    const ok = editing === 'new'
      ? await createLandingPage({ slug, title, status })
      : await updateLandingPage((editing as LandingPageRow)._id, { title, status });
    if (ok) { setEditing(null); refetch(); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      if (await deleteLandingPage(deleting._id)) { setDeleting(null); refetch(); }
    } finally {
      setDeletingBusy(false);
    }
  };

  const columns: TableColumn<LandingPageRow>[] = [
    { key: 'title', header: 'Title', render: r => <span className="font-medium">{r.title}</span> },
    { key: 'slug', header: 'Slug', render: r => <span className="font-mono text-[12px] text-slate">/{r.slug}</span> },
    { key: 'status', header: 'Status', render: r => <Badge color={r.status === 'published' ? 'green' : 'gray'}>{r.status}</Badge> },
    {
      key: 'actions', header: '', align: 'right',
      render: r => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(r)} className="p-1.5 rounded-md hover:bg-cream text-slate hover:text-carbon cursor-pointer border-0 bg-transparent" aria-label="Edit landing page">
            <Pencil size={13} />
          </button>
          <button onClick={() => setDeleting(r)} className="p-1.5 rounded-md hover:bg-error-bg text-slate hover:text-error cursor-pointer border-0 bg-transparent" aria-label="Delete landing page">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={openNew}>New Landing Page</Button>
      </div>

      <Card padding="none">
        {error ? (
          <div className="p-5"><AnalyticsErrorState message={error} onRetry={refetch} /></div>
        ) : (
          <Table
            columns={columns}
            data={data?.items ?? []}
            keyExtractor={r => r._id}
            loading={loading}
            emptyState={{
              icon: <FileStack size={28} className="text-slate/50" />,
              title: 'No landing pages yet',
              description: 'Create your first SEO landing page to start driving organic traffic.',
              action: { label: 'New Landing Page', icon: <Plus size={13} />, onClick: openNew },
            }}
            pagination={data ? {
              page: data.pagination.page,
              total: data.pagination.total,
              perPage: data.pagination.limit,
              onChange: setPage,
              label: 'pages',
            } : undefined}
          />
        )}
      </Card>

      {editing && (
        <Modal
          title={editing === 'new' ? 'New Landing Page' : 'Edit Landing Page'}
          onClose={() => setEditing(null)}
          mobileSheet
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={submitting} onClick={handleSave}>Save</Button>
            </>
          }
        >
          <Field label="Slug" hint={editing !== 'new' ? 'Slug cannot be changed after creation.' : undefined} className="mb-3">
            <Input value={slug} disabled={editing !== 'new'} onChange={e => setSlug(e.target.value)} placeholder="back-to-school-2026" />
          </Field>
          <Field label="Title" className="mb-3">
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value as 'draft' | 'published')}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Field>
        </Modal>
      )}

      {deleting && (
        <Modal
          title="Delete Landing Page"
          onClose={() => setDeleting(null)}
          mobileSheet
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" size="sm" loading={deletingBusy} onClick={handleDeleteConfirm}>Delete</Button>
            </>
          }
        >
          <p className="text-[13px] text-charcoal">
            Delete landing page <span className="font-semibold text-carbon">"{deleting.title}"</span>? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
