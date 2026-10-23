import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '@/components/comman/ui/Card';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { ConfirmActionModal } from '@/components/comman/ui/ConfirmActionModal';
import { useBusyAction } from '@/hooks/useBusyAction';
import { Input, Select } from '@/components/comman/ui/Input';
import { Field } from '@/components/comman/ui/Field';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { RedirectsTable, type RedirectRowData } from '@/components/comman/seo';
import { useSeoRedirects, useSeoRedirectMutations } from '@/hooks/admin/seo/useSeoRedirects';

export function RedirectsTab() {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useSeoRedirects({ page, limit: 20 });
  const { createRedirect, updateRedirect, deleteRedirect, submitting } = useSeoRedirectMutations();
  const [editing, setEditing] = useState<RedirectRowData | 'new' | null>(null);
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [statusCode, setStatusCode] = useState<301 | 302>(301);
  const [deleting, setDeleting] = useState<RedirectRowData | null>(null);
  const delAction = useBusyAction();

  if (error) return <AnalyticsErrorState message={error} onRetry={refetch} />;

  const openNew = () => { setSource(''); setDestination(''); setStatusCode(301); setEditing('new'); };
  const openEdit = (row: RedirectRowData) => {
    setSource(row.source); setDestination(row.destination); setStatusCode(row.statusCode as 301 | 302); setEditing(row);
  };

  const handleSave = async () => {
    const ok = editing === 'new'
      ? await createRedirect({ source, destination, statusCode })
      : await updateRedirect((editing as RedirectRowData)._id, { source, destination, statusCode });
    if (ok) { setEditing(null); refetch(); }
  };

  const handleDeleteConfirm = () => {
    if (!deleting) return;
    void delAction.run(async () => { if (await deleteRedirect(deleting._id)) { setDeleting(null); refetch(); } });
  };

  const handleToggle = async (row: RedirectRowData, next: boolean) => {
    if (await updateRedirect(row._id, { isActive: next })) refetch();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[15px] font-bold text-carbon">Platform Redirects</p>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={openNew}>New Redirect</Button>
      </div>

      <Card padding="none">
        <RedirectsTable
          data={data?.items ?? []}
          loading={loading}
          pagination={data ? {
            page: data.pagination.page,
            total: data.pagination.total,
            perPage: data.pagination.limit,
            onChange: setPage,
            label: 'redirects',
          } : undefined}
          onEdit={openEdit}
          onDelete={setDeleting}
          onToggleActive={handleToggle}
        />
        {!loading && (data?.items ?? []).length === 0 && (
          <div className="px-5 py-10 text-center text-[12px] text-slate">No platform-level redirects configured yet.</div>
        )}
      </Card>

      {deleting && (
        <ConfirmActionModal
          title="Delete redirect?"
          message="Visitors using the old path will no longer be sent to the new one."
          details={[{ label: 'From', value: deleting.source }, { label: 'To', value: deleting.destination }]}
          confirmLabel="Delete redirect"
          danger
          busy={delAction.busy}
          error={delAction.error}
          onConfirm={handleDeleteConfirm}
          onClose={() => { if (!delAction.busy) { setDeleting(null); delAction.setError(''); } }}
        />
      )}
      {editing && (
        <Modal
          title={editing === 'new' ? 'New Redirect' : 'Edit Redirect'}
          onClose={() => setEditing(null)}
          mobileSheet
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={submitting} onClick={handleSave}>Save</Button>
            </>
          }
        >
          <Field label="Source Path" className="mb-3">
            <Input value={source} onChange={e => setSource(e.target.value)} placeholder="/old-marketplace-path" />
          </Field>
          <Field label="Destination Path" className="mb-3">
            <Input value={destination} onChange={e => setDestination(e.target.value)} placeholder="/new-marketplace-path" />
          </Field>
          <Field label="Status Code">
            <Select value={statusCode} onChange={e => setStatusCode(Number(e.target.value) as 301 | 302)}>
              <option value={301}>301 — Permanent</option>
              <option value={302}>302 — Temporary</option>
            </Select>
          </Field>
        </Modal>
      )}
    </div>
  );
}
