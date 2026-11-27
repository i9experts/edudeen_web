import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Circle, Eye, FileDown, GraduationCap } from 'lucide-react';
import { Button, EmptyState, InlineError, ProgressBar, SkeletonBox } from '@/components/comman/ui';
import { usePageTitle } from '@/hooks/usePageTitle';
import { externalVideoEmbed } from '@/utils/externalVideo';
import { academyCategoryLabel, apiAcademyCompleteLesson, apiAcademyCourse, type AcademyCourse, type AcademyLesson, type AcademyProgress } from '@/api/services/academy';
import { CourseCover, LessonBody } from './academyShared';
import { LESSON_ICON, formatDay, formatViews } from './academyUtils';

function LessonVideo({ url, title }: { url: string; title: string }) {
  const embed = externalVideoEmbed(url);
  if (embed) {
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-carbon">
        <iframe
          src={embed.embedUrl}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  if (/^https:\/\//i.test(url) && /\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return <video src={url} controls preload="metadata" className="w-full rounded-xl bg-carbon aspect-video" />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-info underline">Open the video</a>
  );
}

export default function SellerAcademyCourse() {
  const { slug = '' } = useParams();
  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [progress, setProgress] = useState<AcademyProgress>({ completedLessonIds: [], completedAt: null });
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  usePageTitle(course?.title ?? 'Edudeen Academy');

  useEffect(() => {
    let cancelled = false;
    apiAcademyCourse(slug)
      .then(res => {
        if (cancelled) return;
        setCourse(res.data.course);
        setProgress(res.data.progress);
        const done = new Set(res.data.progress.completedLessonIds);
        const next = res.data.course.lessons.find(l => l._id && !done.has(l._id)) ?? res.data.course.lessons[0];
        setActiveId(next?._id ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if ((err as { status?: number })?.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : 'Could not load this course.');
      });
    return () => { cancelled = true; };
  }, [slug]);

  const lessons = course?.lessons ?? [];
  const index = Math.max(0, lessons.findIndex(l => l._id === activeId));
  const lesson: AcademyLesson | undefined = lessons[index];
  const done = useMemo(() => new Set(progress.completedLessonIds), [progress]);
  const pct = lessons.length ? Math.round((lessons.filter(l => l._id && done.has(l._id)).length / lessons.length) * 100) : 0;

  async function markComplete() {
    if (!course || !lesson?._id) return;
    setSaving(true);
    try {
      const res = await apiAcademyCompleteLesson(course._id, lesson._id);
      setProgress(res.data);
      const nextLesson = lessons[index + 1];
      if (nextLesson?._id) { setActiveId(nextLesson._id); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your progress.');
    } finally {
      setSaving(false);
    }
  }

  const back = (
    <Link to=".." relative="path" className="inline-flex items-center gap-1.5 text-[13px] text-slate hover:text-brand-orange no-underline">
      <ArrowLeft size={14} /> All courses
    </Link>
  );

  if (notFound) {
    return (
      <div className="px-4 md:px-8 pt-6 pb-10">
        {back}
        <EmptyState icon={<GraduationCap size={28} className="text-brand-orange" />} title="Course not available" description="It may have been unpublished or isn't offered in your country." />
      </div>
    );
  }
  if (!course) {
    return (
      <div className="px-4 md:px-8 pt-6 pb-10 flex flex-col gap-4 max-w-[1200px]">
        {back}
        {error ? <InlineError message={error} /> : <><SkeletonBox className="h-[220px] rounded-xl" /><SkeletonBox className="h-[300px] rounded-xl" /></>}
      </div>
    );
  }

  const isDone = !!lesson?._id && done.has(lesson._id);

  return (
    <div className="px-4 md:px-8 pt-6 pb-10 max-w-[1200px] flex flex-col gap-5">
      {back}
      <div className="bg-white border border-bone rounded-xl overflow-hidden md:flex">
        <CourseCover title={course.title} coverImage={course.coverImage} category={course.category} className="md:w-[340px] shrink-0" />
        <div className="p-5 flex flex-col gap-2 flex-1 min-w-0">
          <span className="self-start text-[11.5px] font-medium text-graphite bg-mist rounded-md px-2 py-0.5">{academyCategoryLabel(course.category)}</span>
          <h1 className="font-serif text-[22px] sm:text-[26px] leading-[1.2] text-carbon">{course.title}</h1>
          {course.summary && <p className="text-[13.5px] text-slate leading-[1.6]">{course.summary}</p>}
          <div className="flex items-center gap-4 text-[12px] text-slate">
            <span className="inline-flex items-center gap-1"><Eye size={13} /> {formatViews(course.viewCount)} views</span>
            {course.publishedAt && <span>{formatDay(course.publishedAt)}</span>}
          </div>
          <div className="mt-auto pt-2 max-w-[360px]">
            <ProgressBar value={pct} label={progress.completedAt ? 'Course completed' : 'Your progress'} showValue color={progress.completedAt ? 'green' : 'orange'} />
          </div>
        </div>
      </div>

      {error && <InlineError message={error} />}

      <div className="grid gap-5 lg:grid-cols-[300px_1fr] items-start">
        <nav aria-label="Lessons" className="bg-white border border-bone rounded-xl p-2 lg:sticky lg:top-4 order-2 lg:order-1">
          <p className="px-3 pt-2 pb-1 text-[11.5px] font-semibold uppercase tracking-wide text-slate">Lessons</p>
          <ol className="flex flex-col">
            {lessons.map((l, i) => {
              const active = l._id === lesson?._id;
              const complete = !!l._id && done.has(l._id);
              const Icon = LESSON_ICON[l.type];
              return (
                <li key={l._id ?? i}>
                  <button
                    type="button"
                    onClick={() => setActiveId(l._id ?? null)}
                    aria-current={active ? 'step' : undefined}
                    className={`w-full text-left flex items-start gap-2.5 rounded-lg px-3 py-2.5 cursor-pointer border-none ${active ? 'bg-brand-pale-orange' : 'bg-transparent hover:bg-fog'}`}
                  >
                    {complete ? <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" /> : <Circle size={16} className="text-bone shrink-0 mt-0.5" />}
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[13px] leading-[1.4] ${active ? 'font-semibold text-carbon' : 'text-charcoal'}`}>{i + 1}. {l.title}</span>
                      <span className="flex items-center gap-1 text-[11.5px] text-slate mt-0.5">
                        <Icon size={11} /> {l.type === 'video' ? 'Video' : l.type === 'pdf' ? 'PDF' : 'Reading'}{l.durationMinutes ? ` · ${l.durationMinutes} min` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <article className="bg-white border border-bone rounded-xl p-5 sm:p-6 flex flex-col gap-4 order-1 lg:order-2 min-w-0">
          {lesson ? (
            <>
              <div>
                <p className="text-[12px] text-slate">Lesson {index + 1} of {lessons.length}</p>
                <h2 className="font-serif text-[20px] sm:text-[22px] text-carbon leading-[1.25]">{lesson.title}</h2>
              </div>
              {lesson.type === 'video' && lesson.videoUrl && <LessonVideo url={lesson.videoUrl} title={lesson.title} />}
              {lesson.body && <LessonBody text={lesson.body} />}
              {lesson.fileUrl && (
                <a href={lesson.fileUrl} target="_blank" rel="noopener noreferrer" className="self-start inline-flex items-center gap-2 rounded-lg border border-bone px-3.5 py-2 text-[13px] font-medium text-charcoal no-underline hover:border-border-hover">
                  <FileDown size={15} /> {lesson.type === 'pdf' ? 'Open the PDF' : 'Download the file'}
                </a>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bone pt-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={index === 0} onClick={() => setActiveId(lessons[index - 1]?._id ?? null)}><ChevronLeft size={14} /> Previous</Button>
                  <Button variant="outline" size="sm" disabled={index >= lessons.length - 1} onClick={() => setActiveId(lessons[index + 1]?._id ?? null)}>Next <ChevronRight size={14} /></Button>
                </div>
                {isDone ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-success"><CheckCircle2 size={15} /> Completed</span>
                ) : (
                  <Button onClick={markComplete} loading={saving}>Mark as complete</Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-[13px] text-slate">This course has no lessons yet.</p>
          )}
        </article>
      </div>
    </div>
  );
}
