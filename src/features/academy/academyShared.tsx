import { Fragment, type ReactNode } from 'react';
import { CheckCircle2, Eye, GraduationCap } from 'lucide-react';
import { academyCategoryLabel, type AcademyCategory, type AcademyCourseCard } from '@/api/services/academy';
import { CATEGORY_STYLE, formatDay, formatViews } from './academyUtils';

/** Cover image, or a tinted panel with the category icon when the admin hasn't uploaded one. */
export function CourseCover({ title, coverImage, category, className = '' }: { title: string; coverImage: string | null; category: AcademyCategory; className?: string }) {
  const style = CATEGORY_STYLE[category] ?? CATEGORY_STYLE.getting_started;
  return (
    <div className={`relative aspect-[16/9] overflow-hidden ${coverImage ? 'bg-cream' : style.bg} ${className}`}>
      {coverImage ? (
        <img src={coverImage} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-between gap-3 px-5">
          <p className="font-serif text-[18px] sm:text-[20px] leading-[1.2] text-carbon line-clamp-3">{title}</p>
          <style.Icon size={44} strokeWidth={1.4} className="text-brand-orange/70 shrink-0" />
        </div>
      )}
    </div>
  );
}

export function CourseCard({ course, onOpen }: { course: AcademyCourseCard; onOpen: () => void }) {
  const pct = course.lessonCount ? Math.round((course.completedCount / course.lessonCount) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left bg-white border border-bone rounded-xl overflow-hidden flex flex-col hover:border-border-hover hover:shadow-sm transition cursor-pointer"
    >
      <CourseCover title={course.title} coverImage={course.coverImage} category={course.category} />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <span className="self-start text-[11.5px] font-medium text-graphite bg-mist rounded-md px-2 py-0.5">{academyCategoryLabel(course.category)}</span>
        <p className="text-[15px] font-semibold text-carbon leading-[1.3] line-clamp-2 group-hover:text-brand-orange">{course.title}</p>
        {course.summary && <p className="text-[12.5px] text-slate leading-[1.5] line-clamp-2">{course.summary}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2 text-[12px] text-slate">
          <span className="inline-flex items-center gap-1"><Eye size={13} /> {formatViews(course.viewCount)}</span>
          <span>{formatDay(course.publishedAt)}</span>
        </div>
        {course.completed ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-success"><CheckCircle2 size={13} /> Completed</span>
        ) : course.completedCount > 0 ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-bone overflow-hidden"><div className="h-full bg-brand-orange" style={{ width: `${pct}%` }} /></div>
            <span className="text-[11.5px] text-slate">{pct}%</span>
          </div>
        ) : (
          <span className="text-[12px] text-slate inline-flex items-center gap-1">
            <GraduationCap size={13} /> {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}{course.totalMinutes ? ` · ${course.totalMinutes} min` : ''}
          </span>
        )}
      </div>
    </button>
  );
}

/**
 * Lesson text: plain text with light markdown ("## " headings, "- " bullets, "1. " steps, **bold**).
 * Rendered as React elements, never as HTML, so nothing in the text can run as code.
 */
export function LessonBody({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => { if (para.length) { blocks.push(<p key={blocks.length} className="text-[14px] text-charcoal leading-[1.7]">{inline(para.join(' '))}</p>); para = []; } };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((it, i) => <li key={i}>{inline(it)}</li>);
    blocks.push(list.ordered
      ? <ol key={blocks.length} className="list-decimal pl-5 flex flex-col gap-1 text-[14px] text-charcoal leading-[1.6]">{items}</ol>
      : <ul key={blocks.length} className="list-disc pl-5 flex flex-col gap-1 text-[14px] text-charcoal leading-[1.6]">{items}</ul>);
    list = null;
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const step = /^\d+[.)]\s+(.*)$/.exec(line);
    if (!line) { flushPara(); flushList(); continue; }
    if (line.startsWith('## ') || line.startsWith('# ')) {
      flushPara(); flushList();
      blocks.push(<h3 key={blocks.length} className="font-serif text-[18px] text-carbon mt-2">{line.replace(/^#+\s+/, '')}</h3>);
    } else if (bullet || step) {
      flushPara();
      const ordered = !!step;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ?? step)![1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara(); flushList();
  return <div className="flex flex-col gap-3">{blocks}</div>;
}

function inline(s: string): ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') && p.length > 4
    ? <strong key={i} className="font-semibold text-carbon">{p.slice(2, -2)}</strong>
    : <Fragment key={i}>{p}</Fragment>));
}
