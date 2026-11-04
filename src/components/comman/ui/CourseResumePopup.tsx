import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PlayCircle, X } from 'lucide-react';
import { apiGetMyCourses, type MyCourse } from '@/api/services/classroom';
import { isBuyerSession } from '@/hooks/auth/useIsBuyer';
import { ProgressBar } from '@/components/comman/ui';

const SNOOZE_KEY = 'edudeen_course_resume_snooze';
const SNOOZE_MS = 30 * 60_000;
// The reminder only appears on the home page and in My Courses (the library); nowhere else.
const SHOW_ON = /^\/?$|^\/account\/downloads\/?$/;

// Dismissals are stored per course: { [productId]: snoozed-until timestamp }.
const readSnoozed = (): Record<string, number> => {
  try {
    const v = JSON.parse(sessionStorage.getItem(SNOOZE_KEY) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
};

/**
 * Buyer started an online course but has not finished it: a small card keeps
 * coming back with a "Continue" button. It disappears for good once the course
 * is complete (or its access has ended). Closing it only hides it for 30 minutes.
 */
export function CourseResumePopup() {
  const { pathname } = useLocation();
  const inCourse = /^\/course(\/|$)/.test(pathname);
  const [session, setSession] = useState(0);
  const [pending, setPending] = useState<MyCourse[]>([]);
  const [snoozed, setSnoozed] = useState<Record<string, number>>(readSnoozed);

  useEffect(() => {
    const bump = () => setSession(n => n + 1);
    window.addEventListener('edudeen:auth-login', bump);
    window.addEventListener('edudeen:auth-logout', bump);
    return () => { window.removeEventListener('edudeen:auth-login', bump); window.removeEventListener('edudeen:auth-logout', bump); };
  }, []);

  // (Re)read progress on load, on login/logout and each time the buyer leaves the course player.
  useEffect(() => {
    if (inCourse) return;
    if (!isBuyerSession()) { setPending([]); return; }
    let alive = true;
    apiGetMyCourses()
      .then(res => {
        if (!alive) return;
        setPending((res.data ?? []).filter(c =>
          c.deliveryFormat === 'course' && !c.completedAt && !(c as MyCourse & { accessExpired?: boolean }).accessExpired
          && c.isPublished !== false
          && c.lessons > 0 && (c.completed > 0 || !!c.lastLessonId)));
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [inCourse, session]);

  // Wake up again once the soonest snooze is over.
  useEffect(() => {
    const next = Math.min(...Object.values(snoozed).filter(u => u > Date.now()), Infinity);
    if (next === Infinity) return;
    const t = window.setTimeout(() => setSnoozed(s => ({ ...s })), next - Date.now() + 500);
    return () => window.clearTimeout(t);
  }, [snoozed]);

  // Only on the home page and My Courses (library); never on product, cart, checkout or anywhere else.
  const visible = pending.filter(p => (snoozed[p.productId] ?? 0) <= Date.now());
  if (!visible.length || !SHOW_ON.test(pathname)) return null;
  const c = visible[0];
  const pct = c.percent ?? Math.round((c.completed / c.lessons) * 100);
  const snooze = () => {
    const next = { ...readSnoozed(), [c.productId]: Date.now() + SNOOZE_MS };
    try { sessionStorage.setItem(SNOOZE_KEY, JSON.stringify(next)); } catch { /* private mode */ }
    setSnoozed(next);
  };

  return (
    <div role="complementary" aria-label="Continue your course"
      className="fixed z-[60] start-3 bottom-[88px] lg:bottom-5 lg:start-5 w-[calc(100vw-24px)] max-w-[340px] rounded-2xl bg-white border border-bone shadow-xl p-3.5">
      <button type="button" onClick={snooze} aria-label="Remind me later" className="absolute top-2 end-2 p-1 bg-transparent border-none text-slate cursor-pointer"><X size={16} /></button>
      <p className="m-0 text-[11.5px] font-bold uppercase tracking-[0.08em] text-brand-royal">Continue your course</p>
      <p className="m-0 mt-1 text-[14px] font-semibold text-carbon pe-5 line-clamp-2">{c.name}</p>
      <div className="flex items-center gap-2 mt-2"><ProgressBar value={pct} className="flex-1" /><span className="text-[12px] tabular-nums text-slate">{pct}%</span></div>
      <p className="m-0 mt-1 text-[12px] text-slate">{c.completed} of {c.lessons} lessons done</p>
      <Link to={`/course/${c.slug}`} className="mt-3 inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-brand-royal text-white px-3 py-2 text-[13px] font-semibold no-underline">
        <PlayCircle size={15} /> Continue
      </Link>
      {visible.length > 1 && <Link to="/account/downloads" className="block mt-2 text-center text-[12px] text-brand-royal font-semibold">{visible.length - 1} more unfinished {visible.length - 1 === 1 ? 'course' : 'courses'}</Link>}
    </div>
  );
}
