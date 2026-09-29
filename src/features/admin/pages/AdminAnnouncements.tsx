import { useMemo, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAdminAnnouncements, useAnnouncementActions } from '@/hooks/admin/useAdminAnnouncements';
import type { Announcement, AnnouncementAudience, AnnouncementStatus } from '@/api/services/announcements/adminAnnouncements';
import { Button, Modal, Input, Textarea, Select, Table, StatusBadge, Badge, FilterDropdown, SearchInput } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import type { TableColumn } from '@/components/comman/ui';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatDate } from '@/components/comman/analytics/format';
import { Megaphone, Trash2, Pencil, Send, CalendarClock, ArrowDownToLine } from 'lucide-react';

const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = { all: 'All Users', sellers: 'Sellers Only', buyers: 'Buyers Only' };
const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'sellers', label: 'Sellers Only' },
  { value: 'buyers', label: 'Buyers Only' },
];
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
];

// ── Create form ───────────────────────────────────────────────────────────────
function CreateAnnouncementCard({ onCreated }: { onCreated: () => void }) {
  const { createAnnouncement, submitting, error } = useAnnouncementActions();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('all');
  const [validationError, setValidationError] = useState('');

  async function submit(status: 'draft' | 'published') {
    if (!title.trim() || !message.trim()) { setValidationError('Title and message are required.'); return; }
    setValidationError('');
    const ok = await createAnnouncement({ title: title.trim(), message: message.trim(), audience, status });
    if (ok) { setTitle(''); setMessage(''); setAudience('all'); onCreated(); }
  }

  return (
    <div className="bg-white border border-bone rounded-xl px-[22px] py-5">
      <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] mb-[18px]">Create Announcement</p>
      <div className="flex flex-col gap-4">
        <Input label="Title" placeholder="Announcement title…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Message" rows={4} placeholder="Write your announcement message here…" value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="max-w-[260px]">
          <Select label="Audience" value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
            {AUDIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        {(validationError || error) && <p className="text-[12px] text-error">{validationError || error}</p>}
        <div className="flex gap-[10px]">
          <Button onClick={() => submit('published')} loading={submitting}>Publish Now</Button>
          <Button variant="outline" onClick={() => submit('draft')} loading={submitting}>Save as Draft</Button>
        </div>
      </div>
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function EditAnnouncementModal({ announcement, onClose, onSaved }: { announcement: Announcement; onClose: () => void; onSaved: () => void }) {
  const { updateAnnouncement, submitting, error } = useAnnouncementActions();
  const [title, setTitle] = useState(announcement.title);
  const [message, setMessage] = useState(announcement.message);
  const [audience, setAudience] = useState<AnnouncementAudience>(announcement.audience);
  const [validationError, setValidationError] = useState('');

  async function submit() {
    if (!title.trim() || !message.trim()) { setValidationError('Title and message are required.'); return; }
    setValidationError('');
    const ok = await updateAnnouncement(announcement._id, { title: title.trim(), message: message.trim(), audience });
    if (ok) onSaved();
  }

  return (
    <Modal mobileSheet
      title="Edit Announcement"
      width={520}
      onClose={onClose}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={submitting}>Save Changes</Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        <Select label="Audience" value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
          {AUDIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        {(validationError || error) && <p className="text-[12px] text-error">{validationError || error}</p>}
      </div>
    </Modal>
  );
}

// ── Schedule modal ────────────────────────────────────────────────────────────
function ScheduleModal({ announcement, onClose, onSaved }: { announcement: Announcement; onClose: () => void; onSaved: () => void }) {
  const { setStatus, submitting, error } = useAnnouncementActions();
  const [scheduledAt, setScheduledAt] = useState('');
  const [validationError, setValidationError] = useState('');

  async function submit() {
    if (!scheduledAt) { setValidationError('Pick a date and time to schedule this announcement.'); return; }
    setValidationError('');
    const ok = await setStatus(announcement._id, 'scheduled', new Date(scheduledAt).toISOString());
    if (ok) onSaved();
  }

  return (
    <Modal mobileSheet
      title="Schedule Announcement"
      onClose={onClose}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={submitting}>Schedule</Button>
      </>}
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-charcoal">Schedule "<strong>{announcement.title}</strong>" to publish automatically at:</p>
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} error={validationError || undefined} />
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AdminAnnouncements() {
  usePageTitle('Announcements');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('');
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      search: search || undefined,
      status: (statusFilter || undefined) as AnnouncementStatus | undefined,
      audience: (audienceFilter || undefined) as AnnouncementAudience | undefined,
      page,
      limit: 10,
    }),
    [search, statusFilter, audienceFilter, page],
  );

  const { data, loading, error, refetch } = useAdminAnnouncements(query);
  const { setStatus, deleteAnnouncement, submitting: actionSubmitting, error: actionError } = useAnnouncementActions();

  const [editing, setEditing] = useState<Announcement | null>(null);
  const [scheduling, setScheduling] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  async function handlePublish(a: Announcement) {
    const ok = await setStatus(a._id, 'published');
    if (ok) refetch();
  }

  async function handleUnpublish(a: Announcement) {
    const ok = await setStatus(a._id, 'draft');
    if (ok) refetch();
  }

  async function handleDelete() {
    if (!deleting) return;
    const ok = await deleteAnnouncement(deleting._id);
    if (ok) { setDeleting(null); refetch(); }
  }

  const columns: TableColumn<Announcement>[] = [
    {
      key: 'title',
      header: 'Announcement',
      render: (a) => (
        <div className="max-w-[420px]">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-[13px] font-semibold text-charcoal">{a.title}</p>
            <StatusBadge status={a.status} size="sm" />
            <Badge size="sm">{AUDIENCE_LABEL[a.audience]}</Badge>
          </div>
          <p className="text-[12px] text-slate leading-[1.5] line-clamp-2">{a.message}</p>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (a) => (
        <span className="text-[12px] text-slate whitespace-nowrap">
          {a.status === 'scheduled' && a.scheduledAt ? `Scheduled ${formatDate(a.scheduledAt)}` : formatDate(a.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (a) => (
        <div className="flex items-center gap-[10px] flex-wrap">
          {a.status !== 'published' && (
            <button onClick={() => handlePublish(a)} disabled={actionSubmitting} className="text-[12px] font-medium text-success bg-transparent border-none cursor-pointer flex items-center gap-1 disabled:opacity-50">
              <Send size={11} /> Publish
            </button>
          )}
          {a.status === 'draft' && (
            <button onClick={() => setScheduling(a)} className="text-[12px] font-medium text-info bg-transparent border-none cursor-pointer flex items-center gap-1">
              <CalendarClock size={11} /> Schedule
            </button>
          )}
          {a.status === 'published' && (
            <button onClick={() => handleUnpublish(a)} disabled={actionSubmitting} className="text-[12px] font-medium text-slate bg-transparent border-none cursor-pointer flex items-center gap-1 disabled:opacity-50">
              <ArrowDownToLine size={11} /> Unpublish
            </button>
          )}
          <button onClick={() => setEditing(a)} className="text-[12px] font-medium text-info bg-transparent border-none cursor-pointer flex items-center gap-1">
            <Pencil size={11} /> Edit
          </button>
          <button onClick={() => setDeleting(a)} className="text-[12px] font-medium text-error bg-transparent border-none cursor-pointer flex items-center gap-1">
            <Trash2 size={11} /> Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminStudioHeader eyebrow="Edudeen team workspace · Content" title="Announcements" subtitle="Broadcast platform-wide messages to users and sellers." />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      <CreateAnnouncementCard onCreated={refetch} />

      {actionError && (
        <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{actionError}</div>
      )}

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        <div className="px-5 py-[14px] border-b border-bone flex items-center gap-[10px] flex-wrap">
          <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] flex-1">All Announcements</p>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search announcements…" className="max-w-[240px]" />
          <FilterDropdown placeholder="All Statuses" options={STATUS_OPTIONS} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} />
          <FilterDropdown placeholder="All Audiences" options={AUDIENCE_OPTIONS} value={audienceFilter} onChange={(v) => { setAudienceFilter(v); setPage(1); }} />
        </div>

        {error ? (
          <div className="p-5"><AnalyticsErrorState message={error} onRetry={refetch} /></div>
        ) : (
          <Table
            columns={columns}
            data={data?.items ?? []}
            keyExtractor={(a) => a._id}
            loading={loading}
            emptyState={{ icon: <Megaphone size={28} className="text-slate/50" />, title: 'No announcements yet', description: 'Create your first announcement above to broadcast a message to users or sellers.' }}
            pagination={{ page, total: data?.total ?? 0, perPage: 10, onChange: setPage, label: 'announcements' }}
          />
        )}
      </div>

      {editing && <EditAnnouncementModal announcement={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refetch(); }} />}
      {scheduling && <ScheduleModal announcement={scheduling} onClose={() => setScheduling(null)} onSaved={() => { setScheduling(null); refetch(); }} />}

      {deleting && (
        <Modal mobileSheet
          title="Delete Announcement"
          onClose={() => setDeleting(null)}
          footer={<>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={actionSubmitting}>Delete Announcement</Button>
          </>}
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Delete "<strong>{deleting.title}</strong>"? This cannot be undone.
          </p>
          {actionError && <p className="text-[12px] text-error mt-2">{actionError}</p>}
        </Modal>
      )}
      </div>
    </>
  );
}
