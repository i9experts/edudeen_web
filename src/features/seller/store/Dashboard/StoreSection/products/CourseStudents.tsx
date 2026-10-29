import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Award, Search, Users } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Button, Card, EmptyState, ProgressBar, SkeletonBox } from '@/components/comman/ui';
import { apiGetCourseStudents, type CourseStudent } from '@/api/services/classroom';

const PAGE_SIZE = 20;
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/** Store → Products → Course → Students: who enrolled and how far they are. */
export default function CourseStudents() {
  const { productId = '' } = useParams();
  const { storeId } = useStoreWorkspace();
  usePageTitle('Course students');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<CourseStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    apiGetCourseStudents(storeId, productId, page, PAGE_SIZE)
      .then(res => { if (!alive) return; setRows(res.data?.students ?? []); setTotal(res.data?.total ?? 0); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load the students.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [storeId, productId, page, reload]);

  // Search filters the page that is loaded (names / e-mails).
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter(r => r.name.toLowerCase().includes(t) || r.email.toLowerCase().includes(t)) : rows;
  }, [rows, q]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <StorePageHeader title="Course students" subtitle={loading ? 'Loading…' : `${total} ${total === 1 ? 'student' : 'students'} enrolled`} />
      <div className="px-4 lg:px-7 pb-10 pt-5 flex flex-col gap-4 max-w-[1100px]">
        <div className="flex items-center gap-3 flex-wrap">
          <Link to={`/store/${storeId}/products/${productId}/course`} className="inline-flex items-center gap-1 text-[12.5px] text-slate no-underline hover:text-brand-orange"><ArrowLeft size={13} /> Back to the course builder</Link>
          <label className="relative ms-auto w-full sm:w-[260px]">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate" aria-hidden />
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or e-mail" aria-label="Search students"
              className="w-full ps-8 pe-3 py-[8px] rounded-lg border border-bone text-[13px] outline-none focus:border-brand-orange" />
          </label>
        </div>

        <Card padding="none">
          {loading ? (
            <div className="p-5 flex flex-col gap-3">{[1, 2, 3].map(i => <SkeletonBox key={i} height={56} rounded="10px" />)}</div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <p className="text-[13px] text-error text-center m-0">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setReload(n => n + 1)}>Try again</Button>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={<Users size={28} className="text-brand-orange opacity-55" />} title="No students yet" description="Students appear here after they buy the course." className="py-12" />
          ) : shown.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-slate m-0">No student on this page matches your search.</p>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full text-[13px] border-collapse table-fixed">
                  <thead>
                    <tr className="text-start text-[12px] uppercase tracking-[0.06em] text-slate border-b border-bone">
                      <th className="text-start font-bold px-5 py-3 w-[30%]">Student</th>
                      <th className="text-start font-bold px-3 py-3 w-[14%]">Enrolled</th>
                      <th className="text-start font-bold px-3 py-3 w-[28%]">Progress</th>
                      <th className="text-start font-bold px-3 py-3 w-[14%]">Last active</th>
                      <th className="text-start font-bold px-3 py-3 w-[14%]">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(s => (
                      <tr key={s.userId} className="border-b border-[#f5f4ef] align-middle">
                        <td className="px-5 py-3 min-w-0"><p className="m-0 font-semibold text-carbon truncate">{s.name || 'Student'}</p><p className="m-0 text-[12px] text-slate truncate">{s.email}</p></td>
                        <td className="px-3 py-3 text-charcoal">{fmt(s.enrolledAt)}</td>
                        <td className="px-3 py-3"><div className="flex items-center gap-2"><ProgressBar value={s.percent} className="flex-1" /><span className="text-[12px] tabular-nums w-[38px]">{s.percent}%</span></div><p className="m-0 mt-0.5 text-[12px] text-slate">{s.completedLessons} of {s.totalLessons} lessons</p></td>
                        <td className="px-3 py-3 text-charcoal">{fmt(s.lastActiveAt)}</td>
                        <td className="px-3 py-3 text-charcoal">{s.completedAt ? <span className="inline-flex items-center gap-1 text-success font-semibold"><Award size={13} /> {fmt(s.completedAt)}</span> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="md:hidden list-none p-0 m-0 divide-y divide-[#f5f4ef]">
                {shown.map(s => (
                  <li key={s.userId} className="px-4 py-3 flex flex-col gap-1.5 min-w-0">
                    <p className="m-0 font-semibold text-carbon text-[13.5px] break-words">{s.name || 'Student'}</p>
                    <p className="m-0 text-[12px] text-slate break-all">{s.email}</p>
                    <div className="flex items-center gap-2"><ProgressBar value={s.percent} className="flex-1" /><span className="text-[12px] tabular-nums">{s.percent}%</span></div>
                    <p className="m-0 text-[12px] text-slate">{s.completedLessons} of {s.totalLessons} lessons · enrolled {fmt(s.enrolledAt)} · last active {fmt(s.lastActiveAt)}{s.completedAt ? ` · completed ${fmt(s.completedAt)}` : ''}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        {!loading && !error && total > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-[13px] text-slate">Page {page} of {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </>
  );
}
