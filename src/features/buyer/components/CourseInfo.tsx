import { useEffect, useState } from 'react';
import { Video, FileText, AlignLeft, ListChecks, Award, PlayCircle, Lock, CheckCircle2, Infinity as InfinityIcon, GraduationCap } from 'lucide-react';
import { Modal } from '@/components/comman/ui';
import {
  apiGetCourseOutline, apiGetPreviewLesson,
  type CourseOutline, type LessonContent, type LessonType,
} from '@/api/services/classroom';
import type { MarketplaceProduct } from '@/api/services/marketplace';
import { LessonVideo } from './LessonVideo';

const ICON: Record<LessonType, typeof Video> = { video: Video, pdf: FileText, text: AlignLeft, quiz: ListChecks };
const TYPE_LABEL: Record<LessonType, string> = { video: 'Video', pdf: 'PDF', text: 'Reading', quiz: 'Quiz' };

const hours = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);

/** Udemy-style course page: instructor, outcomes, curriculum with free-preview lessons, certificate and access terms. */
function CourseContent({ product }: { product: MarketplaceProduct }) {
  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [preview, setPreview] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [previewErr, setPreviewErr] = useState('');

  useEffect(() => { apiGetCourseOutline(product.slug).then(res => setOutline(res.data)).catch(() => {}); }, [product.slug]);
  if (!outline || !outline.lessons) return null;

  const play = async (id: string) => {
    setLoading(id); setPreviewErr('');
    try { setPreview((await apiGetPreviewLesson(product.slug, id)).data); } catch { setPreviewErr('This preview is not available right now.'); }
    finally { setLoading(null); }
  };
  const outcomes = (outline.outcomes ?? []).filter(Boolean);
  const instructor = outline.instructor?.name?.trim() ? outline.instructor : null;
  const days = outline.accessDays ?? null;

  return (
    <section className="bg-white rounded-2xl border border-bone p-5 md:p-6 mb-6 min-w-0" aria-label="Course content">
      {outcomes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[17px] font-bold text-carbon m-0 mb-3">What you will learn</h2>
          <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {outcomes.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-[13.5px] text-charcoal">
                <CheckCircle2 size={15} className="text-success shrink-0 mt-[2px]" /><span className="min-w-0 break-words">{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap mb-4">
        <h2 className="text-[17px] font-bold text-carbon m-0">Course content</h2>
        <p className="text-[12.5px] text-slate m-0">{outline.sections.length} sections · {outline.lessons} lessons{outline.minutes ? ` · ${hours(outline.minutes)}` : ''}</p>
      </div>
      <div className="flex flex-col divide-y divide-bone border border-bone rounded-xl overflow-hidden">
        {outline.sections.map((s, i) => (
          <details key={s._id} open={i === 0} className="group">
            <summary className="list-none cursor-pointer bg-cream/60 px-4 py-3 flex items-center gap-2 text-[13.5px] font-semibold text-carbon">
              <span className="flex-1 min-w-0 break-words">{s.title}</span>
              <span className="text-[12px] font-normal text-slate shrink-0">{s.lessons.length} lessons</span>
            </summary>
            <ul className="list-none p-0 m-0">
              {s.lessons.map(l => {
                const Icon = ICON[l.type];
                return (
                  <li key={l._id} className="flex items-center gap-2 px-4 py-2 text-[13px] text-charcoal">
                    <Icon size={14} className="text-slate shrink-0" aria-label={TYPE_LABEL[l.type]} />
                    <span className="flex-1 min-w-0 truncate">{l.title}</span>
                    {l.isPreview ? (
                      <button type="button" onClick={() => play(l._id)} className="inline-flex items-center gap-1 bg-transparent border-none p-0 text-brand-orange text-[12.5px] font-semibold cursor-pointer shrink-0">
                        <PlayCircle size={13} /> {loading === l._id ? 'Loading…' : 'Free preview'}
                      </button>
                    ) : <Lock size={12} className="text-slate/50 shrink-0" aria-label="Unlocks after purchase" />}
                    {l.durationMinutes ? <span className="text-[12px] text-slate w-10 text-end shrink-0">{l.durationMinutes}m</span> : null}
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
      {previewErr && <p role="alert" className="text-[12.5px] text-error mt-2 mb-0">{previewErr}</p>}

      <ul className="list-none p-0 m-0 mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px] text-charcoal">
        <li className="flex items-center gap-2 rounded-lg bg-cream/60 px-3 py-2.5">
          <InfinityIcon size={16} className="text-brand-royal shrink-0" />
          {days ? `${days} days of access after you enrol` : 'Lifetime access'}
        </li>
        <li className="flex items-center gap-2 rounded-lg bg-cream/60 px-3 py-2.5">
          <Award size={16} className="text-brand-gold shrink-0" />
          {outline.certificateEnabled ? 'Certificate of completion (verifiable)' : 'No certificate with this course'}
        </li>
      </ul>

      {instructor && (
        <div className="mt-5 flex items-start gap-3 border-t border-bone pt-4">
          <div className="size-10 rounded-full bg-brand-pale-orange text-brand-royal flex items-center justify-center shrink-0"><GraduationCap size={18} /></div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate m-0">Your instructor</p>
            <p className="text-[15px] font-bold text-carbon m-0">{instructor.name}</p>
            {instructor.bio && <p className="text-[13px] text-charcoal m-0 mt-1 whitespace-pre-line break-words">{instructor.bio}</p>}
          </div>
        </div>
      )}

      {preview && (
        <Modal title={preview.title} onClose={() => setPreview(null)} width={760} mobileSheet>
          <div className="p-4">
            {preview.type === 'video' && (
              <LessonVideo file={preview.file} videoUrl={preview.videoUrl ?? (preview.kind === 'external' ? preview.url : null)} title={preview.title} autoPlay />
            )}
            {preview.type === 'video' && !preview.file && !preview.videoUrl && preview.kind !== 'external' && preview.url && (
              <video src={preview.url} controls autoPlay controlsList="nodownload" className="w-full rounded-lg bg-black aspect-video" />
            )}
            {preview.type === 'pdf' && preview.file && <iframe src={preview.file.url} title={preview.title} className="w-full h-[65vh] rounded-lg border border-bone" />}
            {preview.text && <p className="text-[14px] text-charcoal whitespace-pre-line mt-3">{preview.text}</p>}
          </div>
        </Modal>
      )}
    </section>
  );
}

/** Extra section on a product page for course listings. */
export function CourseInfo({ product }: { product: MarketplaceProduct }) {
  if (product.deliveryFormat === 'course') return <CourseContent product={product} />;
  return null;
}
