import { useEffect, useState } from 'react';
import { Video, FileText, AlignLeft, ListChecks, Award, PlayCircle, CalendarClock, Users, Lock, CheckCircle2, Infinity as InfinityIcon, GraduationCap } from 'lucide-react';
import { Modal } from '@/components/comman/ui';
import {
  apiGetCourseOutline, apiGetPreviewLesson, apiGetLiveSeats,
  type CourseOutline, type LessonContent, type LessonType, type LiveSeats,
} from '@/api/services/classroom';
import type { MarketplaceProduct } from '@/api/services/marketplace';
import { formatLocalWithZone, formatPkt } from '@/utils/pkTime';
import { PLATFORM_LABEL } from '@/utils/deliveryFormat';
import { LessonVideo } from './LessonVideo';

const ICON: Record<LessonType, typeof Video> = { video: Video, pdf: FileText, text: AlignLeft, quiz: ListChecks };
const TYPE_LABEL: Record<LessonType, string> = { video: 'Video', pdf: 'PDF', text: 'Reading', quiz: 'Quiz' };

const hours = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}` : `${m}m`);

export type LiveSaleState = 'ok' | 'cancelled' | 'ended' | 'closed' | 'full';
export interface LiveSale { state: LiveSaleState; message: string; seats: LiveSeats | null }

/** Can this live class still be bought? Drives the product-page button and the info card. */
export function useLiveSale(product: MarketplaceProduct | null | undefined): LiveSale {
  const [seats, setSeats] = useState<LiveSeats | null>(null);
  const [now] = useState(() => Date.now());
  const isLive = product?.deliveryFormat === 'live_class';
  const slug = product?.slug;
  useEffect(() => {
    if (!isLive || !slug) return;
    let alive = true;
    apiGetLiveSeats(slug).then(res => { if (alive) setSeats(res.data); }).catch(() => {});
    return () => { alive = false; };
  }, [isLive, slug]);
  const live = product?.liveSession;
  if (!isLive || !live) return { state: 'ok', message: '', seats };
  const status = seats?.status ?? live.status;
  const end = new Date(live.startsAt).getTime() + live.durationMinutes * 60000;
  const deadline = seats?.deadline ?? live.registrationDeadline ?? null;
  if (status === 'cancelled') return { state: 'cancelled', message: 'This class was cancelled', seats };
  if (end < now) return { state: 'ended', message: 'This class has ended', seats };
  if (seats?.registrationOpen === false || (deadline && new Date(deadline).getTime() < now)) return { state: 'closed', message: 'Registration is closed', seats };
  if (seats?.capacity && seats.left === 0) return { state: 'full', message: 'Class full', seats };
  return { state: 'ok', message: '', seats };
}

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

/** Date, time (buyer's timezone + Pakistan time), length, seats and sale state of a live class. */
function LiveClassInfo({ product, sale }: { product: MarketplaceProduct; sale: LiveSale }) {
  const live = product.liveSession;
  if (!live) return null;
  const start = new Date(live.startsAt);
  const end = new Date(start.getTime() + live.durationMinutes * 60000);
  const seats = sale.seats;
  const deadline = seats?.deadline ?? live.registrationDeadline ?? null;
  const badge = sale.state === 'cancelled' ? 'bg-red-50 text-error' : sale.state === 'ok' ? '' : 'bg-fog text-slate';
  return (
    <section className="bg-white rounded-2xl border-2 border-brand-royal/20 p-5 md:p-6 mb-6 flex flex-col md:flex-row md:items-center gap-4 min-w-0" aria-label="Live class">
      <div className="size-12 rounded-xl bg-brand-pale-orange text-brand-royal flex items-center justify-center shrink-0"><CalendarClock size={22} /></div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-royal m-0">Live class · {PLATFORM_LABEL[live.platform] ?? 'Online'}</p>
        <p className="text-[17px] font-bold text-carbon m-0 mt-0.5 break-words">
          {formatLocalWithZone(live.startsAt)} – {formatLocalWithZone(end.toISOString(), { withDate: false })}
        </p>
        <p className="text-[12.5px] text-slate m-0 mt-0.5">
          That is {formatPkt(live.startsAt)} in Pakistan · {hours(live.durationMinutes)}. You get reminders before the class and the joining link opens in My Library 30 minutes before the start{live.notes ? ` · ${live.notes}` : ''}
        </p>
        {deadline && sale.state === 'ok' && <p className="text-[12.5px] text-slate m-0 mt-0.5">Register before {formatLocalWithZone(deadline)}</p>}
        {sale.state === 'cancelled' && <p className="text-[12.5px] text-error m-0 mt-0.5">The seller cancelled this class. If you already paid, contact Edudeen support about a refund.</p>}
      </div>
      {sale.state !== 'ok' ? (
        <span className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${badge}`}>{sale.message}</span>
      ) : seats?.capacity ? (
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12.5px] font-semibold ${seats.left ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-error'}`}>
          <Users size={13} /> {seats.left ? `${seats.left} of ${seats.capacity} seats left` : 'Class full'}
        </span>
      ) : null}
    </section>
  );
}

/** Extra section on a product page for course and live-class listings. */
export function CourseOrLiveInfo({ product, sale }: { product: MarketplaceProduct; sale?: LiveSale }) {
  if (product.deliveryFormat === 'course') return <CourseContent product={product} />;
  if (product.deliveryFormat === 'live_class') return <LiveClassInfo product={product} sale={sale ?? { state: 'ok', message: '', seats: null }} />;
  return null;
}
