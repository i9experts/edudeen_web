import { useMemo, useState } from 'react';
import { MessageCircle, Eye, Trash2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminContact } from '@/hooks/admin/useAdminContact';
import { apiUpdateContactStatus, apiDeleteContactSubmission, type ContactSubmission, type ContactSubmissionStatus } from '@/api/services/contact';
import { Button, Modal, StatusBadge, ActionMenu, Table, type TableColumn } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';

const STATUS_LABEL: Record<ContactSubmissionStatus, string> = {
  new: 'New', read: 'Read', resolved: 'Resolved',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// ── Detail modal ─────────────────────────────────────────────────────────────
function DetailModal({ submission, onClose }: { submission: ContactSubmission; onClose: () => void }) {
  return (
    <Modal mobileSheet title={submission.topic} width={520} onClose={onClose} footer={<Button variant="outline" onClick={onClose}>Close</Button>}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-charcoal">{submission.name}</p>
            <p className="text-[12px] text-slate">{submission.email}</p>
          </div>
          <StatusBadge status={STATUS_LABEL[submission.status]} />
        </div>
        <p className="text-[12px] text-slate">{formatDate(submission.createdAt)}</p>
        <p className="text-[13px] text-charcoal leading-[1.6] whitespace-pre-wrap">{submission.message}</p>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminContactMessages() {
  usePageTitle('Contact Messages');
  const { submissions, stats, loading, error, refetch } = useAdminContact();
  const [statusFilter, setStatusFilter] = useState('');
  const [viewing, setViewing] = useState<ContactSubmission | null>(null);
  const [deleting, setDeleting] = useState<ContactSubmission | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const filtered = useMemo(
    () => statusFilter ? submissions.filter(s => s.status === statusFilter) : submissions,
    [submissions, statusFilter],
  );

  async function handleStatusChange(submission: ContactSubmission, status: ContactSubmissionStatus) {
    setActionError('');
    try {
      await apiUpdateContactStatus(submission._id, status);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  }

  function openDetail(submission: ContactSubmission) {
    setViewing(submission);
    if (submission.status === 'new') handleStatusChange(submission, 'read');
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setActionError('');
    try {
      await apiDeleteContactSubmission(deleting._id);
      setDeleting(null);
      refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete submission.');
    } finally {
      setDeleteBusy(false);
    }
  }

  const columns: TableColumn<ContactSubmission>[] = [
    {
      key: 'name', header: 'From',
      render: s => (
        <div className="max-w-[180px]">
          <p className="font-semibold truncate">{s.name}</p>
          <p className="text-[12px] text-slate truncate">{s.email}</p>
        </div>
      ),
    },
    { key: 'topic', header: 'Topic', render: s => <span className="text-graphite max-w-[160px] truncate block">{s.topic}</span> },
    { key: 'message', header: 'Message', render: s => <span className="text-slate max-w-[280px] truncate block">{s.message}</span> },
    { key: 'createdAt', header: 'Received', render: s => <span className="text-slate whitespace-nowrap">{formatDate(s.createdAt)}</span> },
    { key: 'status', header: 'Status', render: s => <StatusBadge status={STATUS_LABEL[s.status]} /> },
    {
      key: 'actions', header: 'Actions',
      render: s => (
        <div onClick={e => e.stopPropagation()}>
          <ActionMenu
            align="right"
            items={[
              { label: 'View', icon: <Eye size={13} />, onClick: () => openDetail(s) },
              ...(s.status !== 'resolved' ? [{ label: 'Mark Resolved', icon: <MessageCircle size={13} />, onClick: () => handleStatusChange(s, 'resolved' as ContactSubmissionStatus) }] : []),
              { label: 'Delete', icon: <Trash2 size={13} />, danger: true, onClick: () => { setDeleting(s); setActionError(''); } },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminStudioHeader eyebrow="Edudeen team workspace · People"
        title="Contact Messages"
        subtitle={`${stats.new} new · ${stats.read} read · ${stats.resolved} resolved`}
      />

      <div className="px-4 sm:px-7 pt-5 pb-8 flex flex-col gap-4">
        {actionError && (
          <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">
            {actionError}
          </div>
        )}
        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          <div className="px-5 py-[14px] border-b border-bone flex items-center gap-[10px] flex-wrap">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-bone text-[13px] bg-white outline-none cursor-pointer transition-colors duration-150 hover:border-slate/40 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10">
              <option value="">All Statuses</option>
              {(['new', 'read', 'resolved'] as const).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>

          {error ? (
            <p className="px-4 py-6 text-center text-[13px] text-error">{error}</p>
          ) : (
            <Table
              columns={columns}
              data={filtered}
              keyExtractor={s => s._id}
              loading={loading}
              onRowClick={openDetail}
              emptyState={{ icon: <MessageCircle size={28} className="text-slate" />, title: 'No contact messages found' }}
            />
          )}
        </div>
      </div>

      {viewing && <DetailModal submission={viewing} onClose={() => setViewing(null)} />}

      {deleting && (
        <Modal mobileSheet
          title="Delete Submission"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleteBusy}>Delete</Button>
            </>
          }
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Delete the message from "<strong>{deleting.name}</strong>"? This cannot be undone.
          </p>
          {actionError && <p className="text-[12px] text-error mt-2">{actionError}</p>}
        </Modal>
      )}
    </div>
  );
}
