import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowDownToLine, ArrowLeft, ArrowUp, GraduationCap, Pencil, Plus, Send, Trash2, Upload } from 'lucide-react';
import { Badge, Button, FilterDropdown, ImageUpload, Input, Modal, SearchInput, Select, StatusBadge, Table, Textarea, Toggle } from '@/components/comman/ui';
import type { TableColumn } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlParam } from '@/hooks/useUrlParam';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { apiUploadPublicFile } from '@/api/upload';
import {
  ACADEMY_CATEGORIES, academyCategoryLabel,
  apiAdminAcademyCreate, apiAdminAcademyDelete, apiAdminAcademyGet, apiAdminAcademyList, apiAdminAcademySetStatus, apiAdminAcademyUpdate,
  type AcademyCategory, type AcademyCourse, type AcademyLesson, type AcademyLessonType,
} from '@/api/services/academy';
import { ACADEMY_COUNTRY_CODES, countryName, formatDay, formatViews } from '@/features/academy/academyUtils';
import { externalVideoEmbed } from '@/utils/externalVideo';

const errMsg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const STATUS_OPTIONS = [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }];
const countriesLabel = (c: string[]) => (c.length ? c.map(countryName).join(', ') : 'All countries');

// ── List ──────────────────────────────────────────────────────────────────────
function AcademyList() {
  const navigate = useNavigate();
  const { can } = useAdminAccess();
  const canEdit = can('content.manage');
  const [search, setSearch] = useUrlParam('q');
  const [status, setStatus] = useUrlParam('status');
  const [items, setItems] = useState<AcademyCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<AcademyCourse | null>(null);

  const [tick, setTick] = useState(0);
  const load = useCallback(() => { setLoading(true); setTick(t => t + 1); }, []);
  useEffect(() => {
    let cancelled = false;
    apiAdminAcademyList({ status: status || undefined, search: search || undefined })
      .then(res => { if (!cancelled) { setItems(res.data ?? []); setError(''); } })
      .catch(e => { if (!cancelled) setError(errMsg(e, 'Could not load courses.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, search, tick]);

  async function changeStatus(c: AcademyCourse, next: 'draft' | 'published') {
    setBusy(true); setActionError('');
    try { await apiAdminAcademySetStatus(c._id, next); load(); }
    catch (e) { setActionError(errMsg(e, 'Could not change the status.')); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true); setActionError('');
    try { await apiAdminAcademyDelete(deleting._id); setDeleting(null); load(); }
    catch (e) { setActionError(errMsg(e, 'Could not delete the course.')); }
    finally { setBusy(false); }
  }

  const columns: TableColumn<AcademyCourse>[] = [
    {
      key: 'title', header: 'Course',
      render: c => (
        <div className="max-w-[420px]">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-[13px] font-semibold text-charcoal">{c.title}</p>
            <StatusBadge status={c.status} size="sm" />
            {c.isRecommended && <Badge size="sm">Recommended</Badge>}
          </div>
          <p className="text-[12px] text-slate">{academyCategoryLabel(c.category)} · {c.lessons.length} {c.lessons.length === 1 ? 'lesson' : 'lessons'}</p>
        </div>
      ),
    },
    { key: 'countries', header: 'Countries', render: c => <span className="text-[12px] text-slate">{countriesLabel(c.countries)}</span> },
    { key: 'views', header: 'Views', render: c => <span className="text-[12px] text-charcoal">{formatViews(c.viewCount)}</span> },
    { key: 'publishedAt', header: 'Published', render: c => <span className="text-[12px] text-slate whitespace-nowrap">{c.publishedAt ? formatDay(c.publishedAt) : '—'}</span> },
    {
      key: 'actions', header: 'Actions',
      render: c => canEdit ? (
        <div className="flex items-center gap-[10px] flex-wrap">
          {c.status === 'draft' ? (
            <button onClick={() => changeStatus(c, 'published')} disabled={busy} className="text-[12px] font-medium text-success bg-transparent border-none cursor-pointer flex items-center gap-1 disabled:opacity-50"><Send size={11} /> Publish</button>
          ) : (
            <button onClick={() => changeStatus(c, 'draft')} disabled={busy} className="text-[12px] font-medium text-slate bg-transparent border-none cursor-pointer flex items-center gap-1 disabled:opacity-50"><ArrowDownToLine size={11} /> Unpublish</button>
          )}
          <button onClick={() => navigate(c._id)} className="text-[12px] font-medium text-info bg-transparent border-none cursor-pointer flex items-center gap-1"><Pencil size={11} /> Edit</button>
          <button onClick={() => setDeleting(c)} className="text-[12px] font-medium text-error bg-transparent border-none cursor-pointer flex items-center gap-1"><Trash2 size={11} /> Delete</button>
        </div>
      ) : <button onClick={() => navigate(c._id)} className="text-[12px] font-medium text-info bg-transparent border-none cursor-pointer">View</button>,
    },
  ];

  return (
    <>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Content"
        title="Edudeen Academy"
        subtitle="Training courses for sellers. Published courses appear under Edudeen Academy in every seller's store dashboard."
        actions={canEdit ? <Button onClick={() => navigate('new')}><Plus size={14} /> New course</Button> : undefined}
      />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
        {actionError && <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{actionError}</div>}
        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          <div className="px-5 py-[14px] border-b border-bone flex items-center gap-[10px] flex-wrap">
            <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25] flex-1">Courses</p>
            <SearchInput value={search} onChange={setSearch} placeholder="Search courses…" className="max-w-[240px]" />
            <FilterDropdown placeholder="All statuses" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          </div>
          {error ? (
            <div className="p-5"><AnalyticsErrorState message={error} onRetry={load} /></div>
          ) : (
            <Table
              columns={columns}
              data={items}
              keyExtractor={c => c._id}
              loading={loading}
              emptyState={{ icon: <GraduationCap size={28} className="text-slate/50" />, title: 'No courses yet', description: 'Create the first training course for sellers.' }}
            />
          )}
        </div>
      </div>
      {deleting && (
        <Modal mobileSheet title="Delete course" onClose={() => setDeleting(null)} footer={<>
          <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" onClick={remove} loading={busy}>Delete course</Button>
        </>}>
          <p className="text-[13px] text-charcoal leading-[1.6]">Delete "<strong>{deleting.title}</strong>"? Sellers' progress on it is removed too. This cannot be undone.</p>
        </Modal>
      )}
    </>
  );
}

// ── Editor ────────────────────────────────────────────────────────────────────
const emptyLesson = (): AcademyLesson => ({ title: '', type: 'text', videoUrl: null, body: '', fileUrl: null, durationMinutes: null });

function LessonEditor({ lesson, index, total, onChange, onMove, onRemove, disabled }: {
  lesson: AcademyLesson; index: number; total: number; disabled: boolean;
  onChange: (l: AcademyLesson) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const set = (patch: Partial<AcademyLesson>) => onChange({ ...lesson, ...patch });
  const videoOk = !lesson.videoUrl || !!externalVideoEmbed(lesson.videoUrl) || /^https:\/\/.+\.(mp4|webm|mov)(\?|$)/i.test(lesson.videoUrl);

  function uploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true); setUploadError('');
    apiUploadPublicFile(file)
      .then(res => set({ fileUrl: res.data.url }))
      .catch(err => setUploadError(errMsg(err, 'Upload failed. Paste a link instead.')))
      .finally(() => setUploading(false));
  }

  return (
    <div className="border border-bone rounded-xl p-4 flex flex-col gap-3 bg-cream/40">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold text-slate">Lesson {index + 1}</span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Move up" disabled={disabled || index === 0} onClick={() => onMove(-1)} className="p-1.5 rounded-md bg-transparent border-none cursor-pointer text-slate hover:bg-fog disabled:opacity-40"><ArrowUp size={14} /></button>
          <button type="button" aria-label="Move down" disabled={disabled || index === total - 1} onClick={() => onMove(1)} className="p-1.5 rounded-md bg-transparent border-none cursor-pointer text-slate hover:bg-fog disabled:opacity-40"><ArrowDown size={14} /></button>
          <button type="button" aria-label="Remove lesson" disabled={disabled} onClick={onRemove} className="p-1.5 rounded-md bg-transparent border-none cursor-pointer text-error hover:bg-error-bg disabled:opacity-40"><Trash2 size={14} /></button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_120px]">
        <Input label="Title" value={lesson.title} disabled={disabled} onChange={e => set({ title: e.target.value })} />
        <Select label="Type" value={lesson.type} disabled={disabled} onChange={e => set({ type: e.target.value as AcademyLessonType })}>
          <option value="text">Reading</option>
          <option value="video">Video</option>
          <option value="pdf">PDF</option>
        </Select>
        <Input label="Minutes" type="number" min={0} max={600} value={lesson.durationMinutes ?? ''} disabled={disabled}
          onChange={e => set({ durationMinutes: e.target.value === '' ? null : Math.max(0, Math.trunc(Number(e.target.value))) })} />
      </div>
      {lesson.type === 'video' && (
        <Input label="Video link" placeholder="https://www.youtube.com/watch?v=…" value={lesson.videoUrl ?? ''} disabled={disabled}
          onChange={e => set({ videoUrl: e.target.value || null })}
          error={videoOk ? undefined : 'Use a YouTube or Vimeo link, or a direct https link to an .mp4 file.'} />
      )}
      {lesson.type === 'pdf' && (
        <div className="flex flex-col gap-2">
          <Input label="PDF link" placeholder="https://…" value={lesson.fileUrl ?? ''} disabled={disabled} onChange={e => set({ fileUrl: e.target.value || null })} />
          <label className={`self-start inline-flex items-center gap-1.5 text-[12.5px] font-medium text-info cursor-pointer ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
            <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload a PDF'}
            <input type="file" accept="application/pdf" className="hidden" onChange={uploadPdf} disabled={disabled || uploading} />
          </label>
          {uploadError && <p className="text-[12px] text-error">{uploadError}</p>}
        </div>
      )}
      <Textarea
        label={lesson.type === 'text' ? 'Lesson text' : 'Notes (optional)'}
        rows={lesson.type === 'text' ? 8 : 3}
        value={lesson.body}
        disabled={disabled}
        onChange={e => set({ body: e.target.value })}
        placeholder={'Plain text. Start a line with "## " for a heading, "- " for a bullet, "1. " for a step, **word** for bold.'}
      />
    </div>
  );
}

function AcademyEditor({ id }: { id: string }) {
  const navigate = useNavigate();
  const isNew = id === 'new';
  const { can } = useAdminAccess();
  const canEdit = can('content.manage');
  usePageTitle(isNew ? 'New course' : 'Edit course');
  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [category, setCategory] = useState<AcademyCategory>('getting_started');
  const [countries, setCountries] = useState<string[]>([]);
  const [language, setLanguage] = useState('');
  const [isRecommended, setIsRecommended] = useState(false);
  const [order, setOrder] = useState('0');
  const [lessons, setLessons] = useState<AcademyLesson[]>([emptyLesson()]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    apiAdminAcademyGet(id)
      .then(res => {
        if (cancelled) return;
        const c = res.data;
        setCourse(c); setTitle(c.title); setSummary(c.summary); setCoverImage(c.coverImage); setCategory(c.category);
        setCountries(c.countries); setLanguage(c.language ?? ''); setIsRecommended(c.isRecommended); setOrder(String(c.order ?? 0));
        setLessons(c.lessons.length ? c.lessons : [emptyLesson()]);
      })
      .catch(e => { if (!cancelled) setError(errMsg(e, 'Could not load the course.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, isNew]);

  const payload = useMemo(() => ({
    title: title.trim(), summary: summary.trim(), coverImage, category, countries,
    language: language.trim() || null, isRecommended, order: Number(order) || 0,
    lessons: lessons.filter(l => l.title.trim() || l.body.trim() || l.videoUrl || l.fileUrl).map(l => ({ ...l, title: l.title.trim() })),
  }), [title, summary, coverImage, category, countries, language, isRecommended, order, lessons]);

  async function save(publish?: boolean) {
    if (!payload.title) { setError('Give the course a title.'); return; }
    setSaving(true); setError(''); setSaved('');
    try {
      const res = isNew ? await apiAdminAcademyCreate(payload) : await apiAdminAcademyUpdate(id, payload);
      let c = res.data;
      if (publish && c.status !== 'published') c = (await apiAdminAcademySetStatus(c._id, 'published')).data;
      setCourse(c);
      setLessons(c.lessons.length ? c.lessons : [emptyLesson()]);
      setSaved(publish ? 'Saved and published.' : 'Saved.');
      if (isNew) navigate(`../${c._id}`, { relative: 'path', replace: true });
    } catch (e) {
      setError(errMsg(e, 'Could not save the course.'));
    } finally {
      setSaving(false);
    }
  }

  const toggleCountry = (code: string) => setCountries(cs => (cs.includes(code) ? cs.filter(c => c !== code) : [...cs, code]));
  const updateLesson = (i: number, l: AcademyLesson) => setLessons(ls => ls.map((x, j) => (j === i ? l : x)));
  const moveLesson = (i: number, dir: -1 | 1) => setLessons(ls => {
    const next = [...ls];
    const j = i + dir;
    if (j < 0 || j >= next.length) return ls;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const disabled = !canEdit || saving;

  return (
    <>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Edudeen Academy"
        title={isNew ? 'New course' : course?.title || 'Edit course'}
        subtitle={course ? `${course.status === 'published' ? 'Published' : 'Draft'} · ${formatViews(course.viewCount)} views` : 'Courses start as drafts. Sellers see them only after you publish.'}
        actions={<Button variant="outline" onClick={() => navigate('..', { relative: 'path' })}><ArrowLeft size={14} /> All courses</Button>}
      />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5 max-w-[960px]">
        {loading ? <p className="text-[13px] text-slate">Loading…</p> : (
          <>
            <div className="bg-white border border-bone rounded-xl px-[22px] py-5 flex flex-col gap-4">
              <p className="font-serif text-[19px] text-carbon">Course details</p>
              <Input label="Title" value={title} disabled={disabled} onChange={e => setTitle(e.target.value)} placeholder="e.g. Getting paid & identity verification" />
              <Textarea label="Summary" rows={2} value={summary} disabled={disabled} onChange={e => setSummary(e.target.value)} placeholder="One or two lines shown on the course card." />
              <div className="grid gap-4 sm:grid-cols-3">
                <Select label="Topic" value={category} disabled={disabled} onChange={e => setCategory(e.target.value as AcademyCategory)}>
                  {ACADEMY_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
                <Input label="Language (optional)" value={language} disabled={disabled} onChange={e => setLanguage(e.target.value)} placeholder="English, Urdu…" />
                <Input label="Sort order" type="number" value={order} disabled={disabled} onChange={e => setOrder(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked={isRecommended} onChange={setIsRecommended} disabled={disabled} label="Recommended" />
                <span className="text-[13px] text-charcoal">Recommended (shown first on the Recommended tab)</span>
              </div>
              <div>
                <p className="text-[12.5px] font-medium text-charcoal mb-1.5">Cover image <span className="text-slate font-normal">(wide, 16:9)</span></p>
                {canEdit ? (
                  <ImageUpload value={coverImage ? [coverImage] : []} onChange={urls => setCoverImage(urls[0] ?? null)} />
                ) : coverImage ? <img src={coverImage} alt="" className="w-[240px] rounded-lg" /> : <p className="text-[12px] text-slate">None</p>}
              </div>
              <div>
                <p className="text-[12.5px] font-medium text-charcoal mb-1">Countries</p>
                <p className="text-[12px] text-slate mb-2">{countries.length ? `Only sellers in: ${countriesLabel(countries)}` : 'Leave all unselected to show the course to sellers in every country.'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ACADEMY_COUNTRY_CODES.map(code => {
                    const on = countries.includes(code);
                    return (
                      <button key={code} type="button" disabled={disabled} aria-pressed={on} onClick={() => toggleCountry(code)}
                        className={`rounded-full border px-2.5 py-1 text-[12px] cursor-pointer disabled:cursor-default ${on ? 'bg-brand-orange text-white border-brand-orange' : 'bg-white text-charcoal border-bone hover:border-border-hover'}`}>
                        {countryName(code)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white border border-bone rounded-xl px-[22px] py-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-serif text-[19px] text-carbon">Lessons</p>
                {canEdit && <Button variant="outline" size="sm" disabled={saving} onClick={() => setLessons(ls => [...ls, emptyLesson()])}><Plus size={13} /> Add lesson</Button>}
              </div>
              {lessons.map((l, i) => (
                <LessonEditor key={l._id ?? `new-${i}`} lesson={l} index={i} total={lessons.length} disabled={disabled}
                  onChange={next => updateLesson(i, next)} onMove={dir => moveLesson(i, dir)} onRemove={() => setLessons(ls => ls.filter((_, j) => j !== i))} />
              ))}
              {!lessons.length && <p className="text-[13px] text-slate">No lessons yet.</p>}
            </div>

            {error && <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{error}</div>}
            {saved && !error && <p className="text-[13px] text-success">{saved}</p>}
            {canEdit && (
              <div className="flex gap-[10px] flex-wrap">
                <Button onClick={() => save(false)} loading={saving}>Save</Button>
                {course?.status !== 'published' && <Button variant="outline" onClick={() => save(true)} loading={saving}>Save & publish</Button>}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export function AdminAcademy() {
  const { courseId } = useParams();
  usePageTitle('Edudeen Academy');
  return courseId ? <AcademyEditor key={courseId} id={courseId} /> : <AcademyList />;
}
