import { useEffect, useState } from 'react';
import { Video, FileText, AlignLeft, ListChecks, Award, PlayCircle, CalendarClock, Users, Lock } from 'lucide-react';
import { Modal } from '@/components/comman/ui';
import {
  apiGetCourseOutline, apiGetPreviewLesson, apiGetLiveSeats,
  type CourseOutline, type LessonContent, type LessonType,
} from '@/api/services/classroom';
import type { MarketplaceProduct } from '@/api/services/marketplace';

const ICON: Record<LessonType, typeof Video> = { video: Video, pdf: FileText, text: AlignLeft, quiz: ListChecks };
const PLATFORM: Record<string, string> = { zoom: 'Zoom', google_meet: 'Google Meet', teams: 'Microsoft Teams', other: 'Online' };

const hours = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);

/** Udemy-style "Course content" outline, with free-preview lessons playable in a dialog. */
function CourseContent({ product }: { product: MarketplaceProduct }) {
  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [preview, setPreview] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => { apiGetCourseOutline(product.slug).then(res => setOutline(res.data)).catch(() => {}); }, [product.slug]);
  if (!outline || !outline.lessons) return null;

  const play = async (id: string) => {
    setLoading(id);
    try { setPreview((await apiGetPreviewLesson(product.slug, id)).data); } catch { /* not previewable */ }
    finally { setLoading(null); }
  };

  return (
    <section className="bg-white rounded-2xl border border-bone p-5 md:p-6 mb-6" aria-label="Course content">
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <h2 className="text-[17px] font-bold text-carbon m-0">Course content</h2>
        <p className="text-[12.5px] text-slate m-0">{outline.sections.length} sections · {outline.lessons} lessons{outline.minutes ? ` · ${hours(outline.minutes)}` : ''}</p>
        {outline.certificateEnabled && <span className="ms-auto inline-flex items-center gap-1 text-[12px] font-semibold text-brand-royal"><Award size={14} className="text-brand-gold" /> Certificate on completion</span>}
      </div>
      <div className="flex flex-col divide-y divide-bone border border-bone rounded-xl overflow-hidden">
        {outline.sections.map((s, i) => (
          <details key={s._id} open={i === 0} className="group">
            <summary className="list-none cursor-pointer bg-cream/60 px-4 py-3 flex items-center gap-2 text-[13.5px] font-semibold text-carbon">
              <span className="flex-1">{s.title}</span>
              <span className="text-[12px] font-normal text-slate">{s.lessons.length} lessons</span>
            </summary>
            <ul className="list-none p-0 m-0">
              {s.lessons.map(l => {
                const Icon = ICON[l.type];
                return (
                  <li key={l._id} className="flex items-center gap-2 px-4 py-2 text-[13px] text-charcoal">
                    <Icon size={14} className="text-slate shrink-0" />
                    <span className="flex-1 min-w-0 truncate">{l.title}</span>
                    {l.isPreview ? (
                      <button type="button" onClick={() => play(l._id)} className="inline-flex items-center gap-1 bg-transparent border-none p-0 text-brand-orange text-[12.5px] font-semibold cursor-pointer">
                        <PlayCircle size={13} /> {loading === l._id ? 'Loading…' : 'Preview'}
                      </button>
                    ) : <Lock size={12} className="text-bone" aria-label="Unlocks after purchase" />}
                    {l.durationMinutes ? <span className="text-[12px] text-slate w-10 text-end">{l.durationMinutes}m</span> : null}
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
      {preview && (
        <Modal title={preview.title} onClose={() => setPreview(null)} width={760} mobileSheet>
          <div className="p-4">
            {preview.type === 'video' && preview.file && <video src={preview.file.url} controls autoPlay controlsList="nodownload" className="w-full rounded-lg bg-black aspect-video" />}
            {preview.type === 'pdf' && preview.file && <iframe src={preview.file.url} title={preview.title} className="w-full h-[65vh] rounded-lg border border-bone" />}
            {preview.text && <p className="text-[14px] text-charcoal whitespace-pre-line mt-3">{preview.text}</p>}
          </div>
        </Modal>
      )}
    </section>
  );
}

/** Date, time, length and seats of a live class. */
function LiveClassInfo({ product }: { product: MarketplaceProduct }) {
  const [seats, setSeats] = useState<{ capacity: number | null; left: number | null } | null>(null);
  const [now] = useState(() => Date.now());
  useEffect(() => { apiGetLiveSeats(product.slug).then(res => setSeats(res.data)).catch(() => {}); }, [product.slug]);
  const live = product.liveSession;
  if (!live) return null;
  const start = new Date(live.startsAt);
  const end = new Date(start.getTime() + live.durationMinutes * 60000);
  const ended = end.getTime() < now;
  return (
    <section className="bg-white rounded-2xl border-2 border-brand-royal/20 p-5 md:p-6 mb-6 flex flex-col md:flex-row md:items-center gap-4" aria-label="Live class">
      <div className="size-12 rounded-xl bg-brand-pale-orange text-brand-royal flex items-center justify-center shrink-0"><CalendarClock size={22} /></div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-royal m-0">Live class · {PLATFORM[live.platform] ?? 'Online'}</p>
        <p className="text-[17px] font-bold text-carbon m-0 mt-0.5">
          {start.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}, {start.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })} – {end.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}
        </p>
        <p className="text-[12.5px] text-slate m-0 mt-0.5">{hours(live.durationMinutes)} · the joining link appears in My Library after you buy{live.notes ? ` · ${live.notes}` : ''}</p>
      </div>
      {ended ? (
        <span className="rounded-full bg-fog text-slate px-3 py-1 text-[12.5px] font-semibold">This class has ended</span>
      ) : seats?.capacity ? (
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12.5px] font-semibold ${seats.left ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-error'}`}>
          <Users size={13} /> {seats.left ? `${seats.left} of ${seats.capacity} seats left` : 'Class full'}
        </span>
      ) : null}
    </section>
  );
}

/** Extra section on a product page for course and live-class listings. */
export function CourseOrLiveInfo({ product }: { product: MarketplaceProduct }) {
  if (product.deliveryFormat === 'course') return <CourseContent product={product} />;
  if (product.deliveryFormat === 'live_class') return <LiveClassInfo product={product} />;
  return null;
}
