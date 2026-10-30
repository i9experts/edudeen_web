import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ChevronUp, ChevronDown, Video, FileText, AlignLeft, ListChecks, Loader2, Award, Eye, ArrowLeft, Users } from 'lucide-react';
import { isAllowedExternalVideo } from '@/utils/externalVideo';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Button, Card, Input, Textarea, Toggle, FileUpload, type PrivateUploadData } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { apiSetProductStatus } from '@/api/services/product';
import { CertificateDesigner, EMPTY_DESIGN, designFromConfig, configFromDesign, type CertDesign } from './CertificateDesigner';
import {
  apiGetCourseBuilder, apiSaveCourse,
  type CourseBuilderData, type CourseLessonInput, type CourseSectionInput, type LessonType,
} from '@/api/services/classroom';

const TYPES: { value: LessonType; label: string; Icon: typeof Video }[] = [
  { value: 'video', label: 'Video', Icon: Video },
  { value: 'pdf', label: 'PDF', Icon: FileText },
  { value: 'text', label: 'Text', Icon: AlignLeft },
  { value: 'quiz', label: 'Quiz', Icon: ListChecks },
];

const newLesson = (type: LessonType = 'video'): CourseLessonInput => ({
  title: '', type, file: null, videoUrl: null, text: '', durationMinutes: null, isPreview: false,
  quiz: type === 'quiz' ? { passPercent: 60, questions: [{ question: '', options: ['', ''], answerIndex: 0 }] } : null,
});

function move<T>(list: T[], i: number, d: -1 | 1) {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const toUpload = (f: CourseLessonInput['file']): PrivateUploadData | null =>
  f ? { publicId: f.url, fileName: f.name, fileSize: f.size ?? 0, mimeType: f.mimeType ?? '', resourceType: 'raw' } : null;

/** Video lesson source: upload an MP4, or paste a YouTube / Vimeo (incl. unlisted) link. */
function VideoSource({ lesson, onChange }: { lesson: CourseLessonInput; onChange: (l: CourseLessonInput) => void }) {
  const [mode, setMode] = useState<'upload' | 'link'>(lesson.videoUrl ? 'link' : 'upload');
  const url = lesson.videoUrl ?? '';
  const bad = mode === 'link' && url.trim() !== '' && !isAllowedExternalVideo(url);
  const pick = (m: 'upload' | 'link') => {
    setMode(m);
    onChange(m === 'link' ? { ...lesson, file: null } : { ...lesson, videoUrl: null });
  };
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Video source" className="inline-flex rounded-lg border border-bone overflow-hidden self-start">
        {([['upload', 'Upload MP4'], ['link', 'Paste YouTube / Vimeo link']] as const).map(([m, label]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => pick(m)}
            className={clsx('px-3 py-1.5 text-[12.5px] border-none cursor-pointer', mode === m ? 'bg-carbon text-white' : 'bg-white text-graphite hover:bg-cream')}>{label}</button>
        ))}
      </div>
      {mode === 'upload' ? (
        <FileUpload
          value={toUpload(lesson.file)} accept="video/mp4,video/*" label="Upload the video (MP4)"
          onChange={d => onChange({ ...lesson, videoUrl: null, file: d ? { url: d.publicId, name: d.fileName, size: d.fileSize, mimeType: d.mimeType } : null })}
        />
      ) : (
        <>
          <Input
            label="Video link" type="url" value={url} maxLength={300} placeholder="https://www.youtube.com/watch?v=…  or  https://vimeo.com/…"
            error={bad ? 'Use a https:// YouTube or Vimeo link (unlisted links work too).' : undefined}
            onChange={e => onChange({ ...lesson, file: null, videoUrl: e.target.value })}
          />
          <p className="text-[12px] text-slate m-0">Anyone with the link can still watch on YouTube/Vimeo, so use an unlisted video and Edudeen only shows it to enrolled students.</p>
        </>
      )}
    </div>
  );
}

function QuizEditor({ quiz, onChange }: { quiz: NonNullable<CourseLessonInput['quiz']>; onChange: (q: NonNullable<CourseLessonInput['quiz']>) => void }) {
  const setQ = (i: number, patch: Partial<(typeof quiz.questions)[number]>) =>
    onChange({ ...quiz, questions: quiz.questions.map((q, k) => k === i ? { ...q, ...patch } : q) });
  return (
    <div className="flex flex-col gap-3">
      <div className="w-[160px]"><Input label="Pass mark (%)" type="number" min={0} max={100} value={String(quiz.passPercent)} onChange={e => onChange({ ...quiz, passPercent: Number(e.target.value) || 0 })} /></div>
      {quiz.questions.map((q, i) => (
        <fieldset key={i} className="border border-bone rounded-lg p-3 flex flex-col gap-2">
          <legend className="text-[12px] font-semibold text-slate px-1">Question {i + 1}</legend>
          <Input aria-label={`Question ${i + 1}`} value={q.question} maxLength={500} onChange={e => setQ(i, { question: e.target.value })} placeholder="Type the question" />
          {q.options.map((o, k) => (
            <div key={k} className="flex items-center gap-2">
              <input type="radio" name={`ans-${i}-${quiz.questions.length}`} checked={q.answerIndex === k} onChange={() => setQ(i, { answerIndex: k })} aria-label={`Option ${k + 1} is correct`} className="accent-brand-orange" />
              <Input aria-label={`Option ${k + 1}`} value={o} maxLength={200} onChange={e => setQ(i, { options: q.options.map((x, m) => m === k ? e.target.value : x) })} placeholder={`Option ${k + 1}`} />
              {q.options.length > 2 && (
                <button type="button" aria-label="Remove option" onClick={() => setQ(i, { options: q.options.filter((_, m) => m !== k), answerIndex: q.answerIndex >= k && q.answerIndex > 0 ? q.answerIndex - 1 : q.answerIndex })} className="bg-transparent border-none cursor-pointer text-slate hover:text-error p-1"><Trash2 size={13} /></button>
              )}
            </div>
          ))}
          <div className="flex gap-3">
            {q.options.length < 6 && <button type="button" onClick={() => setQ(i, { options: [...q.options, ''] })} className="bg-transparent border-none p-0 text-[12px] font-semibold text-brand-orange cursor-pointer">+ Option</button>}
            {quiz.questions.length > 1 && <button type="button" onClick={() => onChange({ ...quiz, questions: quiz.questions.filter((_, k) => k !== i) })} className="bg-transparent border-none p-0 text-[12px] text-slate hover:text-error cursor-pointer ml-auto">Remove question</button>}
          </div>
        </fieldset>
      ))}
      {quiz.questions.length < 30 && (
        <Button variant="outline" size="sm" onClick={() => onChange({ ...quiz, questions: [...quiz.questions, { question: '', options: ['', ''], answerIndex: 0 }] })}><Plus size={13} /> Add question</Button>
      )}
      <p className="text-[12px] text-slate m-0">Select the radio button next to the correct answer.</p>
    </div>
  );
}

function LessonEditor({ lesson, index, count, onChange, onMove, onRemove }: {
  lesson: CourseLessonInput; index: number; count: number;
  onChange: (l: CourseLessonInput) => void; onMove: (d: -1 | 1) => void; onRemove: () => void;
}) {
  const set = <K extends keyof CourseLessonInput>(k: K, v: CourseLessonInput[K]) => onChange({ ...lesson, [k]: v });
  const setType = (type: LessonType) => onChange({ ...lesson, type, videoUrl: type === 'video' ? lesson.videoUrl : null, file: type === 'video' || type === 'pdf' ? lesson.file : null, quiz: type === 'quiz' ? lesson.quiz ?? newLesson('quiz').quiz : null, isPreview: type === 'quiz' ? false : lesson.isPreview });
  return (
    <div className="rounded-xl border border-bone bg-white p-3 md:p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] font-bold text-slate w-6">{index + 1}.</span>
        <div className="flex-1 min-w-[180px]"><Input aria-label="Lesson title" value={lesson.title} maxLength={150} onChange={e => set('title', e.target.value)} placeholder="Lesson title" /></div>
        <div role="radiogroup" aria-label="Lesson type" className="flex gap-1">
          {TYPES.map(t => (
            <button key={t.value} type="button" role="radio" aria-checked={lesson.type === t.value} onClick={() => setType(t.value)} title={t.label}
              className={clsx('inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-[12px] cursor-pointer', lesson.type === t.value ? 'border-brand-royal bg-brand-pale-orange/50 text-brand-royal font-semibold' : 'border-bone bg-white text-slate')}>
              <t.Icon size={13} /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex">
          <button type="button" aria-label="Move lesson up" disabled={index === 0} onClick={() => onMove(-1)} className="p-1 bg-transparent border-none cursor-pointer text-slate disabled:opacity-30"><ChevronUp size={15} /></button>
          <button type="button" aria-label="Move lesson down" disabled={index === count - 1} onClick={() => onMove(1)} className="p-1 bg-transparent border-none cursor-pointer text-slate disabled:opacity-30"><ChevronDown size={15} /></button>
          <button type="button" aria-label="Delete lesson" onClick={onRemove} className="p-1 bg-transparent border-none cursor-pointer text-slate hover:text-error"><Trash2 size={14} /></button>
        </div>
      </div>

      {lesson.type === 'video' && (
        <VideoSource lesson={lesson} onChange={onChange} />
      )}
      {lesson.type === 'pdf' && (
        <FileUpload
          value={toUpload(lesson.file)}
          accept="application/pdf"
          label="Upload the PDF"
          onChange={d => set('file', d ? { url: d.publicId, name: d.fileName, size: d.fileSize, mimeType: d.mimeType } : null)}
        />
      )}
      {lesson.type === 'text' && (
        <Textarea aria-label="Lesson text" rows={6} maxLength={20000} value={lesson.text} onChange={e => set('text', e.target.value)} placeholder="Write the lesson. Blank lines start new paragraphs." />
      )}
      {lesson.type !== 'text' && lesson.type !== 'quiz' && (
        <Textarea aria-label="Lesson notes" rows={2} maxLength={2000} value={lesson.text} onChange={e => set('text', e.target.value)} placeholder="Notes under the lesson (optional)" />
      )}
      {lesson.type === 'quiz' && lesson.quiz && <QuizEditor quiz={lesson.quiz} onChange={q => set('quiz', q)} />}

      <div className="flex items-center gap-4 flex-wrap">
        {lesson.type !== 'quiz' && (
          <div className="w-[150px]"><Input aria-label="Length in minutes" type="number" min={1} placeholder="Minutes" value={lesson.durationMinutes ?? ''} onChange={e => set('durationMinutes', e.target.value ? Number(e.target.value) : null)} /></div>
        )}
        {lesson.type !== 'quiz' && (
          <label className="inline-flex items-center gap-2 text-[12.5px] text-charcoal cursor-pointer">
            <Toggle label="Free preview lesson" size="sm" checked={lesson.isPreview} onChange={v => set('isPreview', v)} /> Free preview <span className="text-slate">(anyone can watch)</span>
          </label>
        )}
      </div>
    </div>
  );
}

/** Store → Products → Course builder: sections, lessons, quizzes and the certificate. */
export default function CourseBuilder() {
  const { productId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { storeId, store } = useStoreWorkspace();
  const [data, setData] = useState<CourseBuilderData | null>(null);
  const [sections, setSections] = useState<CourseSectionInput[]>([]);
  const [certificate, setCertificate] = useState(true);
  const [design, setDesign] = useState<CertDesign>(EMPTY_DESIGN);
  const [designDirty, setDesignDirty] = useState(false);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [instructor, setInstructor] = useState({ name: '', bio: '' });
  const [accessMode, setAccessMode] = useState<'lifetime' | 'days'>('lifetime');
  const [accessDays, setAccessDays] = useState('365');
  const [saving, setSaving] = useState<'save' | 'publish' | null>(null);
  const [dirty, setDirty] = useState(false);
  usePageTitle(data ? `Course: ${data.product.name}` : 'Course builder');

  useEffect(() => {
    apiGetCourseBuilder(storeId, productId)
      .then(res => {
        setData(res.data);
        setSections(res.data.sections.length ? res.data.sections : [{ title: 'Getting started', lessons: [newLesson('video')] }]);
        setCertificate(res.data.certificateEnabled);
        setDesign(designFromConfig(res.data.certificateConfig));
        setOutcomes(res.data.outcomes ?? []);
        setInstructor({ name: res.data.instructor?.name ?? '', bio: res.data.instructor?.bio ?? '' });
        if (res.data.accessDays) { setAccessMode('days'); setAccessDays(String(res.data.accessDays)); }
      })
      .catch(err => { toast.error(err instanceof Error ? err.message : 'Could not open the course.'); navigate(`/store/${storeId}/products`); });
  }, [storeId, productId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const edit = (next: CourseSectionInput[]) => { setSections(next); setDirty(true); };
  const setSection = (i: number, patch: Partial<CourseSectionInput>) => edit(sections.map((s, k) => k === i ? { ...s, ...patch } : s));
  const setLesson = (si: number, li: number, l: CourseLessonInput) => setSection(si, { lessons: sections[si].lessons.map((x, k) => k === li ? l : x) });

  const lessonCount = sections.reduce((n, s) => n + s.lessons.length, 0);
  const minutes = sections.reduce((n, s) => n + s.lessons.reduce((m, l) => m + (l.durationMinutes ?? 0), 0), 0);

  const daysNum = Number(accessDays);
  const daysBad = accessMode === 'days' && (!Number.isInteger(daysNum) || daysNum < 1 || daysNum > 3650);
  const badVideo = sections.some(s => s.lessons.some(l => l.type === 'video' && !!l.videoUrl?.trim() && !isAllowedExternalVideo(l.videoUrl)));

  const save = async (publish: boolean) => {
    if (badVideo) { toast.error('One of the video links is not a valid https YouTube or Vimeo link.'); return; }
    if (daysBad) { toast.error('Access days must be a whole number from 1 to 3650.'); return; }
    setSaving(publish ? 'publish' : 'save');
    try {
      const cleanOutcomes = outcomes.map(o => o.trim()).filter(Boolean);
      const res = await apiSaveCourse(storeId, productId, {
        sections: sections.map(s => ({ ...s, lessons: s.lessons.map(l => ({ ...l, videoUrl: l.type === 'video' && l.videoUrl?.trim() ? l.videoUrl.trim() : null })) })),
        certificateEnabled: certificate,
        // Only sent when the seller touched the design (null values clear a field).
        ...(designDirty ? { certificateConfig: configFromDesign(design) } : {}),
        outcomes: cleanOutcomes,
        instructor: instructor.name.trim() ? { name: instructor.name.trim(), bio: instructor.bio.trim() } : null,
        accessDays: accessMode === 'days' ? daysNum : null,
      });
      setSections(res.data.sections);
      setDirty(false);
      setDesignDirty(false);
      if (publish) {
        const pub = await apiSetProductStatus(productId, 'active');
        const next = (pub.data?.product as { status?: string } | undefined)?.status ?? 'pending_review';
        toast.success(next === 'active' ? 'Course is live' : 'Course submitted — it goes live after a quick review');
        setData(d => d ? { ...d, product: { ...d.product, status: next } } : d);
        navigate(next === 'active' && data?.product.slug ? `/product/${data.product.slug}` : `/store/${storeId}/products/detail/${productId}`);
      } else toast.success('Course saved');
    } catch (err) {
      // Network drops / 5xx can arrive as plain objects (no Error), so read the message from any shape.
      const e = err as { message?: unknown; response?: { data?: { message?: unknown } } } | string | null;
      const raw = typeof e === 'string' ? e : e?.response?.data?.message ?? e?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : typeof raw === 'string' ? raw : '';
      toast.error(msg || 'Could not save the course. Check your connection and try again.');
    }
    finally { setSaving(null); }
  };

  if (!data) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate" /></div>;
  const isDraft = ['draft', 'rejected', 'archived'].includes(data.product.status);

  return (
    <>
      <StorePageHeader
        title="Course builder"
        subtitle={`${data.product.name} · ${lessonCount} ${lessonCount === 1 ? 'lesson' : 'lessons'}${minutes ? ` · ${Math.round(minutes / 6) / 10} h` : ''}${data.learners ? ` · ${data.learners} learners` : ''}`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" size="sm" to={`/store/${storeId}/products/${productId}/course/students`}><Users size={13} /> Students</Button>
            <Button variant="outline" size="sm" loading={saving === 'save'} onClick={() => save(false)}>{dirty ? 'Save changes' : 'Saved'}</Button>
            {isDraft && <Button variant="primary" size="sm" loading={saving === 'publish'} disabled={!lessonCount} onClick={() => save(true)}>Save & publish</Button>}
          </div>
        }
      />
      <div className="px-4 lg:px-7 pb-10 pt-5 flex flex-col gap-4 max-w-[980px]">
        <div className="flex items-center gap-3 flex-wrap text-[12.5px]">
          <Link to={`/store/${storeId}/products/edit/${productId}`} className="inline-flex items-center gap-1 text-slate no-underline hover:text-brand-orange"><ArrowLeft size={13} /> Listing details (price, images)</Link>
          {data.product.status === 'active' && <a href={`/product/${data.product.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate no-underline hover:text-brand-orange"><Eye size={13} /> View on Edudeen</a>}
          <span className="ml-auto rounded-full bg-fog px-2 py-[2px] text-slate capitalize">{data.product.status.replace('_', ' ')}</span>
        </div>

        {sections.map((s, si) => (
          <Card key={s._id ?? `new-${si}`} padding="none">
            <div className="px-4 md:px-5 py-3 border-b border-bone flex items-center gap-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate shrink-0">Section {si + 1}</span>
              <div className="flex-1"><Input aria-label="Section title" value={s.title} maxLength={120} onChange={e => setSection(si, { title: e.target.value })} /></div>
              <button type="button" aria-label="Move section up" disabled={si === 0} onClick={() => edit(move(sections, si, -1))} className="p-1 bg-transparent border-none cursor-pointer text-slate disabled:opacity-30"><ChevronUp size={15} /></button>
              <button type="button" aria-label="Move section down" disabled={si === sections.length - 1} onClick={() => edit(move(sections, si, 1))} className="p-1 bg-transparent border-none cursor-pointer text-slate disabled:opacity-30"><ChevronDown size={15} /></button>
              <button type="button" aria-label="Delete section" onClick={() => { if (!s.lessons.length || window.confirm(`Delete "${s.title}" and its ${s.lessons.length} lessons?`)) edit(sections.filter((_, k) => k !== si)); }} className="p-1 bg-transparent border-none cursor-pointer text-slate hover:text-error"><Trash2 size={14} /></button>
            </div>
            <div className="p-3 md:p-4 flex flex-col gap-3 bg-cream/40">
              {s.lessons.map((l, li) => (
                <LessonEditor
                  key={l._id ?? `n-${si}-${li}`} lesson={l} index={li} count={s.lessons.length}
                  onChange={next => setLesson(si, li, next)}
                  onMove={d => setSection(si, { lessons: move(s.lessons, li, d) })}
                  onRemove={() => setSection(si, { lessons: s.lessons.filter((_, k) => k !== li) })}
                />
              ))}
              <div className="flex gap-2 flex-wrap">
                {TYPES.map(t => (
                  <Button key={t.value} variant="ghost" size="sm" onClick={() => setSection(si, { lessons: [...s.lessons, newLesson(t.value)] })}><Plus size={13} /> {t.label}</Button>
                ))}
              </div>
            </div>
          </Card>
        ))}
        <Button variant="outline" size="md" onClick={() => edit([...sections, { title: `Section ${sections.length + 1}`, lessons: [] }])}><Plus size={14} /> Add section</Button>

        <Card>
          <h2 className="text-[14px] font-bold text-carbon m-0 mb-1">About this course</h2>
          <p className="text-[12.5px] text-slate m-0 mb-3">Shown on the course page to help buyers decide.</p>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[13px] font-bold text-carbon m-0 mb-1.5">What students will learn <span className="font-normal text-slate">(up to 10)</span></p>
              <div className="flex flex-col gap-2">
                {outcomes.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1"><Input aria-label={`Outcome ${i + 1}`} value={o} maxLength={200} placeholder="e.g. Read the Quran with correct Tajweed" onChange={e => { setOutcomes(outcomes.map((x, k) => k === i ? e.target.value : x)); setDirty(true); }} /></div>
                    <button type="button" aria-label="Remove outcome" onClick={() => { setOutcomes(outcomes.filter((_, k) => k !== i)); setDirty(true); }} className="p-1 bg-transparent border-none cursor-pointer text-slate hover:text-error"><Trash2 size={14} /></button>
                  </div>
                ))}
                {outcomes.length < 10 && <Button variant="ghost" size="sm" className="self-start" onClick={() => { setOutcomes([...outcomes, '']); setDirty(true); }}><Plus size={13} /> Add outcome</Button>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Instructor name" value={instructor.name} maxLength={100} onChange={e => { setInstructor({ ...instructor, name: e.target.value }); setDirty(true); }} />
              <div className="md:col-span-2">
                <Textarea label="Instructor bio" rows={3} maxLength={1000} value={instructor.bio} onChange={e => { setInstructor({ ...instructor, bio: e.target.value }); setDirty(true); }} placeholder="Qualifications, experience, teaching style…" />
              </div>
            </div>
            <div>
              <p className="text-[13px] font-bold text-carbon m-0 mb-1.5">How long do students keep access?</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div role="radiogroup" aria-label="Access duration" className="inline-flex rounded-lg border border-bone overflow-hidden">
                  {([['lifetime', 'Lifetime'], ['days', 'Limited days']] as const).map(([m, label]) => (
                    <button key={m} type="button" role="radio" aria-checked={accessMode === m} onClick={() => { setAccessMode(m); setDirty(true); }}
                      className={clsx('px-3 py-1.5 text-[12.5px] border-none cursor-pointer', accessMode === m ? 'bg-carbon text-white' : 'bg-white text-graphite hover:bg-cream')}>{label}</button>
                  ))}
                </div>
                {accessMode === 'days' && (
                  <div className="w-[140px]"><Input aria-label="Access days" type="number" min={1} max={3650} value={accessDays} error={daysBad ? '1–3650 days' : undefined} onChange={e => { setAccessDays(e.target.value); setDirty(true); }} /></div>
                )}
              </div>
              <p className="text-[12px] text-slate m-0 mt-1.5">Counted from the day the student pays. Changing it later applies to new and existing students.</p>
            </div>
          </div>
        </Card>

        <Card>
          <label className="flex items-start gap-3 cursor-pointer">
            <Toggle label="Certificate of completion" checked={certificate} onChange={v => { setCertificate(v); setDirty(true); }} />
            <span>
              <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-carbon"><Award size={15} className="text-brand-gold" /> Certificate of completion</span>
              <span className="block text-[12.5px] text-slate mt-0.5">Learners who finish every lesson (and pass every quiz) get a certificate with a code anyone can verify on Edudeen.</span>
            </span>
          </label>
          {certificate && (
            <CertificateDesigner
              value={design}
              onChange={d => { setDesign(d); setDesignDirty(true); setDirty(true); }}
              courseTitle={data?.product.name ?? ''}
              instructorName={instructor.name.trim()}
              storeName={design.issuerName.trim()}
              storeLogo={store?.logo ?? null}
            />
          )}
        </Card>
      </div>
    </>
  );
}
