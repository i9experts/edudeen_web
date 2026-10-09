import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, Video, FileText, AlignLeft, ListChecks, Award, ChevronLeft, ChevronRight, Loader2, Menu, X } from 'lucide-react';
import { clsx } from 'clsx';
import { Button, ProgressBar } from '@/components/comman/ui';
import { EdudeenLogo } from '@/components/comman/ui/EdudeenLogo';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useToast } from '@/contexts/ToastContext';
import {
  apiGetLearnView, apiGetLesson, apiCompleteLesson, apiSubmitQuiz,
  type LearnView, type LessonContent, type LessonType, type QuizResult,
} from '@/api/services/classroom';

const ICON: Record<LessonType, typeof Video> = { video: Video, pdf: FileText, text: AlignLeft, quiz: ListChecks };

function Quiz({ lesson, onResult }: { lesson: LessonContent; onResult: (r: QuizResult) => void }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const { slug = '' } = useParams();
  const toast = useToast();
  const qs = lesson.quiz?.questions ?? [];

  const submit = async () => {
    setBusy(true);
    try {
      const res = await apiSubmitQuiz(slug, lesson._id, answers);
      setResult(res.data);
      onResult(res.data);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not submit.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-slate m-0">Pass mark: {lesson.quiz?.passPercent}%</p>
      {qs.map((q, i) => (
        <fieldset key={i} className="border border-bone rounded-xl p-4 m-0">
          <legend className="text-[14px] font-semibold text-carbon px-1">{i + 1}. {q.question}</legend>
          <div className="flex flex-col gap-2 mt-1">
            {q.options.map((o, k) => {
              const chosen = answers[i] === k;
              const right = result && result.answers[i] === k;
              const wrong = result && chosen && result.answers[i] !== k;
              return (
                <label key={k} className={clsx('flex items-center gap-2 rounded-lg border px-3 py-2 text-[13.5px] cursor-pointer',
                  right ? 'border-success bg-green-50' : wrong ? 'border-error bg-red-50' : chosen ? 'border-brand-royal bg-brand-pale-orange/40' : 'border-bone bg-white')}>
                  <input type="radio" name={`q${i}`} checked={chosen} disabled={!!result?.passed} onChange={() => { setResult(null); setAnswers(a => { const n = [...a]; n[i] = k; return n; }); }} className="accent-brand-royal" />
                  {o}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      {result && (
        <p role="status" className={clsx('text-[14px] font-semibold m-0', result.passed ? 'text-success' : 'text-error')}>
          {result.correct}/{result.total} correct ({result.percent}%) — {result.passed ? 'passed!' : `you need ${result.passPercent}%. Change your answers and try again.`}
        </p>
      )}
      {!result?.passed && (
        <Button variant="primary" size="md" loading={busy} disabled={answers.filter(a => a !== undefined).length < qs.length} onClick={submit} className="self-start">Submit answers</Button>
      )}
    </div>
  );
}

/** `/course/:slug` — the learner's course player: outline, lesson viewer, progress and certificate. */
export function CoursePlayerPage() {
  const { slug = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [view, setView] = useState<LearnView | null>(null);
  const [error, setError] = useState('');
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [marking, setMarking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  usePageTitle(view?.product.name ?? 'Course');

  useEffect(() => {
    apiGetLearnView(slug).then(res => setView(res.data)).catch(err => setError(err instanceof Error ? err.message : 'Could not open this course.'));
  }, [slug]);

  const flat = useMemo(() => (view?.sections ?? []).flatMap(s => s.lessons), [view]);
  const done = new Set(view?.progress.completedLessonIds ?? []);
  const currentId = params.get('lesson') ?? view?.progress.lastLessonId ?? flat.find(l => !done.has(l._id))?._id ?? flat[0]?._id ?? null;
  const idx = flat.findIndex(l => l._id === currentId);

  const open = useCallback((id: string) => { setParams({ lesson: id }, { replace: false }); setMenuOpen(false); }, [setParams]);

  useEffect(() => {
    if (!currentId || !view) return;
    let alive = true;
    apiGetLesson(slug, currentId)
      .then(res => { if (alive) setLesson(res.data); })
      .catch(err => toast.error(err instanceof Error ? err.message : 'Could not load the lesson.'));
    return () => { alive = false; };
  }, [slug, currentId, view?.product._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyProgress = (p: { completedLessonIds: string[]; completedAt: string | null; certificateCode: string | null } | null) => {
    if (!p) return;
    setView(v => v ? { ...v, progress: { ...v.progress, ...p } } : v);
    if (p.completedAt && !view?.progress.completedAt) toast.success(p.certificateCode ? 'Course complete — your certificate is ready!' : 'Course complete!');
  };

  const markDone = async () => {
    if (!lesson) return;
    setMarking(true);
    try {
      const res = await apiCompleteLesson(slug, lesson._id);
      applyProgress(res.data);
      if (idx >= 0 && idx < flat.length - 1) open(flat[idx + 1]._id);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save progress.'); }
    finally { setMarking(false); }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center bg-cream">
        <p className="text-[15px] text-carbon font-semibold">{error}</p>
        <Button variant="primary" size="md" onClick={() => navigate(`/product/${slug}`)}>Go to the course page</Button>
      </div>
    );
  }
  if (!view) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate" /></div>;

  const pct = flat.length ? Math.round((done.size / flat.length) * 100) : 0;
  const isDone = lesson ? done.has(lesson._id) : false;
  // The shown lesson lags the URL until the new one arrives.
  const loadingLesson = !lesson || lesson._id !== currentId;

  const outline = (
    <nav aria-label="Course content" className="flex flex-col gap-4">
      {view.sections.map((s, si) => (
        <div key={s._id}>
          <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate mb-1.5">Section {si + 1} · {s.title}</p>
          <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
            {s.lessons.map(l => {
              const Icon = ICON[l.type];
              const active = l._id === currentId;
              return (
                <li key={l._id}>
                  <button type="button" onClick={() => open(l._id)} aria-current={active ? 'true' : undefined}
                    className={clsx('w-full flex items-center gap-2 rounded-lg px-2 py-2 text-start text-[13px] border-none cursor-pointer', active ? 'bg-brand-pale-orange text-carbon font-semibold' : 'bg-transparent text-charcoal hover:bg-fog')}>
                    {done.has(l._id) ? <CheckCircle2 size={15} className="text-success shrink-0" /> : <Circle size={15} className="text-bone shrink-0" />}
                    <Icon size={13} className="text-slate shrink-0" />
                    <span className="flex-1 min-w-0 truncate">{l.title}</span>
                    {l.durationMinutes ? <span className="text-[12px] text-slate">{l.durationMinutes}m</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-30 bg-carbon text-white px-4 md:px-6 h-[56px] flex items-center gap-3">
        <Link to="/" className="shrink-0" aria-label="Edudeen home"><EdudeenLogo size={22} /></Link>
        <span className="hidden sm:block w-px h-5 bg-white/20" />
        <Link to={`/product/${view.product.slug}`} className="text-[13.5px] font-semibold text-white no-underline truncate">{view.product.name}</Link>
        <div className="ms-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 w-[200px]"><ProgressBar value={pct} className="flex-1" /><span className="text-[12px] tabular-nums">{pct}%</span></div>
          {view.progress.certificateCode && (
            <Link to={`/certificates/${view.progress.certificateCode}`} className="inline-flex items-center gap-1 rounded-lg bg-brand-gold text-carbon px-3 py-1.5 text-[12.5px] font-bold no-underline"><Award size={14} /> Certificate</Link>
          )}
          <button type="button" className="lg:hidden bg-transparent border-none text-white cursor-pointer p-1" aria-label={menuOpen ? 'Close lessons' : 'Show lessons'} onClick={() => setMenuOpen(o => !o)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px]">
        <main className="min-w-0 px-4 md:px-8 py-6 max-w-[960px] w-full mx-auto">
          {view.progress.completedAt && (
            <div className="mb-5 rounded-xl bg-green-50 border border-success/30 px-4 py-3 flex items-center gap-3 flex-wrap">
              <Award size={20} className="text-success" />
              <p className="m-0 text-[13.5px] text-carbon flex-1">You've finished this course{view.progress.certificateCode ? ' — well done!' : '.'}</p>
              {view.progress.certificateCode && <Link to={`/certificates/${view.progress.certificateCode}`} className="text-[13px] font-semibold text-success">View certificate</Link>}
            </div>
          )}
          {loadingLesson || !lesson ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate" /></div>
          ) : (
            <article className="flex flex-col gap-4">
              <h1 className="text-[22px] md:text-[26px] font-bold text-carbon m-0">{lesson.title}</h1>
              {lesson.type === 'video' && lesson.file && (
                <video key={lesson._id} src={lesson.file.url} controls controlsList="nodownload" className="w-full rounded-xl bg-black aspect-video" />
              )}
              {lesson.type === 'pdf' && lesson.file && (
                <div className="flex flex-col gap-2">
                  <iframe key={lesson._id} src={lesson.file.url} title={lesson.title} className="w-full h-[70vh] rounded-xl border border-bone" />
                  <a href={lesson.file.url} target="_blank" rel="noreferrer" className="text-[12.5px] text-brand-orange self-start">Open the PDF in a new tab</a>
                </div>
              )}
              {lesson.type === 'quiz' ? (
                <Quiz key={lesson._id} lesson={lesson} onResult={r => applyProgress(r.progress)} />
              ) : lesson.text ? (
                <div className="text-[15px] leading-[1.75] text-charcoal whitespace-pre-line">{lesson.text}</div>
              ) : null}

              <div className="flex items-center gap-2 flex-wrap border-t border-bone pt-4 mt-2">
                <Button variant="ghost" size="sm" disabled={idx <= 0} onClick={() => idx > 0 && open(flat[idx - 1]._id)}><ChevronLeft size={14} /> Previous</Button>
                {lesson.type !== 'quiz' && (
                  isDone
                    ? <span className="inline-flex items-center gap-1 text-[13px] text-success font-semibold"><CheckCircle2 size={15} /> Completed</span>
                    : <Button variant="primary" size="sm" loading={marking} onClick={markDone}>Mark complete{idx < flat.length - 1 ? ' & next' : ''}</Button>
                )}
                <Button variant="ghost" size="sm" className="ms-auto" disabled={idx < 0 || idx >= flat.length - 1} onClick={() => open(flat[idx + 1]._id)}>Next <ChevronRight size={14} /></Button>
              </div>
            </article>
          )}
        </main>
        <aside className={clsx('border-s border-bone bg-cream/40 px-4 py-5 lg:block lg:sticky lg:top-[56px] lg:h-[calc(100vh-56px)] lg:overflow-y-auto', menuOpen ? 'block fixed inset-x-0 top-[56px] bottom-0 z-20 overflow-y-auto bg-white' : 'hidden')}>
          <div className="md:hidden flex items-center gap-2 mb-4"><ProgressBar value={pct} className="flex-1" /><span className="text-[12px] tabular-nums">{pct}%</span></div>
          <p className="text-[12.5px] text-slate mb-3">{done.size} of {flat.length} lessons done{view.product.storeName ? ` · by ${view.product.storeName}` : ''}</p>
          {outline}
        </aside>
      </div>
    </div>
  );
}
