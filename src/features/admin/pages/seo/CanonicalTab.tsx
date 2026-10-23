import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '@/components/comman/ui/Card';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { ConfirmActionModal } from '@/components/comman/ui/ConfirmActionModal';
import { useBusyAction } from '@/hooks/useBusyAction';
import { Input } from '@/components/comman/ui/Input';
import { Field } from '@/components/comman/ui/Field';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { CanonicalRulesTable, type CanonicalRuleRowData } from '@/components/comman/seo';
import { useSeoCanonicalRules, useSeoCanonicalRuleMutations } from '@/hooks/admin/seo/useSeoCanonical';

export function CanonicalTab() {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useSeoCanonicalRules({ page, limit: 20 });
  const { createRule, updateRule, deleteRule, submitting } = useSeoCanonicalRuleMutations();
  const [editing, setEditing] = useState<CanonicalRuleRowData | 'new' | null>(null);
  const [pathPattern, setPathPattern] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [deleting, setDeleting] = useState<CanonicalRuleRowData | null>(null);
  const delAction = useBusyAction();

  if (error) return <AnalyticsErrorState message={error} onRetry={refetch} />;

  const openNew = () => { setPathPattern(''); setCanonicalUrl(''); setEditing('new'); };
  const openEdit = (row: CanonicalRuleRowData) => { setPathPattern(row.pathPattern); setCanonicalUrl(row.canonicalUrl); setEditing(row); };

  const handleSave = async () => {
    const ok = editing === 'new'
      ? await createRule({ pathPattern, canonicalUrl })
      : await updateRule((editing as CanonicalRuleRowData)._id, { pathPattern, canonicalUrl });
    if (ok) { setEditing(null); refetch(); }
  };

  const handleDeleteConfirm = () => {
    if (!deleting) return;
    void delAction.run(async () => { if (await deleteRule(deleting._id)) { setDeleting(null); refetch(); } });
  };

  const handleToggle = async (row: CanonicalRuleRowData, next: boolean) => {
    if (await updateRule(row._id, { isActive: next })) refetch();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[15px] font-bold text-carbon">Platform Canonical Rules</p>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={openNew}>New Rule</Button>
      </div>

      <Card padding="none">
        <CanonicalRulesTable
          data={data?.items ?? []}
          loading={loading}
          pagination={data ? {
            page: data.pagination.page,
            total: data.pagination.total,
            perPage: data.pagination.limit,
            onChange: setPage,
            label: 'rules',
          } : undefined}
          onEdit={openEdit}
          onDelete={setDeleting}
          onToggleActive={handleToggle}
        />
        {!loading && (data?.items ?? []).length === 0 && (
          <div className="px-5 py-10 text-center text-[12px] text-slate">No platform-level canonical rules configured yet.</div>
        )}
      </Card>

      {deleting && (
        <ConfirmActionModal
          title="Delete canonical rule?"
          message="Pages matching this rule go back to their default canonical URL."
          details={[{ label: 'Path', value: deleting.pathPattern }, { label: 'Canonical URL', value: deleting.canonicalUrl }]}
          confirmLabel="Delete rule"
          danger
          busy={delAction.busy}
          error={delAction.error}
          onConfirm={handleDeleteConfirm}
          onClose={() => { if (!delAction.busy) { setDeleting(null); delAction.setError(''); } }}
        />
      )}
      {editing && (
        <Modal
          title={editing === 'new' ? 'New Canonical Rule' : 'Edit Canonical Rule'}
          onClose={() => setEditing(null)}
          mobileSheet
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={submitting} onClick={handleSave}>Save</Button>
            </>
          }
        >
          <Field label="Path Pattern" className="mb-3">
            <Input value={pathPattern} onChange={e => setPathPattern(e.target.value)} placeholder="/product/:slug" />
          </Field>
          <Field label="Canonical URL">
            <Input value={canonicalUrl} onChange={e => setCanonicalUrl(e.target.value)} placeholder="https://edudeen.com/product/tajweed-quran" />
          </Field>
        </Modal>
      )}
    </div>
  );
}
