import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, GraduationCap, Search, Users } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Button, Card, EmptyState, ProgressBar, SkeletonBox } from '@/components/comman/ui';
import { apiExportStoreRoster, apiGetStoreRoster, type RosterPage, type RosterRow } from '@/api/services/classroom';
import { saveCsv } from '@/api/services/adminExports';

const PAGE_SIZE = 20;
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function StatusChips({ r }: { r: RosterRow }) {
  return (
    <>
      {r.isFree && <span className="rounded-full bg-[#E8F5EC] text-success px-2 py-[1px] text-[12px] font-semibold">Free</span>}
      {r.accessEnded && <span className="rounded-full bg-[#FDECEC] text-error px-2 py-[1px] text-[12px] font-semibold">Access ended</span>}
    </>
  );
}

function Progress({ r }: { r: RosterRow }) {
  if (r.kind === 'course') {
    return (
      <div>
        <div className="flex items-center gap-2"><ProgressBar value={r.percent ?? 0} className="flex-1" /><span className="text-[12px] tabular-nums w-[38px]">{r.percent ?? 0}%</span></div>
        <p className="m-0 mt-0.5 text-[12px] text-slate">{r.completedLessons ?? 0} of {r.totalLessons ?? 0} lessons</p>
      </div>
    );
  }
  return <span className="text-charcoal">{r.downloads ?? 0} {r.downloads === 1 ? 'download' : 'downloads'}</span>;
}

/** Store → Customers → Students: buyers of this store's digital products, with course progress or download counts. */
export default function StoreStudents() {
  const { storeId } = useStoreWorkspace();
  usePageTitle('Students');
  const [productId, setProductId] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RosterPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // Debounce the search box; a new term restarts at page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = search.trim();
      if (next !== q) { setQ(next); setPage(1); }
    }, 300);
    return () => clearTimeout(t);
  }, [search, q]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    apiGetStoreRoster(storeId, { productId: productId || undefined, q: q || undefined }, page, PAGE_SIZE)
      .then(res => { if (alive) setData(res.data ?? null); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load your students.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [storeId, productId, q, page, reload]);

  // Quiet re-read when orders change (new buyer, refund).
  const quiet = useCallback(() => {
    apiGetStoreRoster(storeId, { productId: productId || undefined, q: q || undefined }, page, PAGE_SIZE)
      .then(res => setData(res.data ?? null)).catch(() => {});
  }, [storeId, productId, q, page]);
  useLiveRefresh(['orders'], quiet);

  async function exportCsv() {
    setExporting(true); setExportError('');
    try {
      const csv = await apiExportStoreRoster(storeId, { productId: productId || undefined, q: q || undefined });
      saveCsv(csv, `students-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) { setExportError(err instanceof Error ? err.message : 'Export failed.'); }
    finally { setExporting(false); }
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = data?.totalPages ?? 1;
  const filtered = !!(productId || q);

  return (
    <>
      <StorePageHeader title="Students" subtitle={loading && !data ? 'Loading…' : `${total} ${total === 1 ? 'enrolment' : 'enrolments'}`} />
      <div className="px-4 lg:px-7 pb-10 pt-5 flex flex-col gap-4 max-w-[1100px]">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={productId} onChange={e => { setProductId(e.target.value); setPage(1); }} aria-label="Filter by product"
            className="rounded-lg border border-bone bg-white px-3 py-[8px] text-[13px] outline-none focus:border-brand-orange w-full sm:w-[240px]">
            <option value="">All digital products</option>
            {(data?.products ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <label className="relative w-full sm:w-[260px]">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate" aria-hidden />
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or e-mail" aria-label="Search students"
              className="w-full ps-8 pe-3 py-[8px] rounded-lg border border-bone text-[13px] outline-none focus:border-brand-orange" />
          </label>
          <span className="ms-auto inline-flex flex-col items-end gap-1">
            <Button variant="outline" size="sm" icon={<Download size={12} />} loading={exporting} disabled={!total} onClick={exportCsv}>Export CSV</Button>
            {exportError && <span role="alert" className="text-[12px] text-error max-w-[240px] text-end">{exportError}</span>}
          </span>
        </div>

        <Card padding="none">
          {loading && !data ? (
            <div className="p-5 flex flex-col gap-3">{[1, 2, 3].map(i => <SkeletonBox key={i} height={56} rounded="10px" />)}</div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <p role="alert" className="text-[13px] text-error text-center m-0">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setReload(n => n + 1)}>Try again</Button>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={<Users size={28} className="text-brand-orange opacity-55" />}
              title={filtered ? 'No matching students' : 'No students yet'}
              description={filtered ? 'Try another product or a different name.' : 'Buyers of your digital products and free downloads appear here.'} className="py-12" />
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full text-[13px] border-collapse table-fixed">
                  <thead>
                    <tr className="text-start text-[12px] uppercase tracking-[0.06em] text-slate border-b border-bone">
                      <th className="text-start font-bold px-5 py-3 w-[24%]">Buyer</th>
                      <th className="text-start font-bold px-3 py-3 w-[24%]">Product</th>
                      <th className="text-start font-bold px-3 py-3 w-[13%]">Enrolled</th>
                      <th className="text-start font-bold px-3 py-3 w-[24%]">Progress / downloads</th>
                      <th className="text-start font-bold px-3 py-3 w-[15%]">Last activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={`${r.userId}:${r.productId}`} className="border-b border-[#f5f4ef] align-middle">
                        <td className="px-5 py-3 min-w-0"><p className="m-0 font-semibold text-carbon truncate">{r.name}</p>{r.email && <p className="m-0 text-[12px] text-slate truncate">{r.email}</p>}</td>
                        <td className="px-3 py-3 min-w-0">
                          <p className="m-0 text-charcoal truncate inline-flex items-center gap-1 max-w-full">{r.kind === 'course' ? <GraduationCap size={13} className="shrink-0" aria-hidden /> : <FileText size={13} className="shrink-0" aria-hidden />}<span className="truncate">{r.productName}</span></p>
                          <div className="flex gap-1 flex-wrap mt-0.5"><StatusChips r={r} /></div>
                        </td>
                        <td className="px-3 py-3 text-charcoal">{fmt(r.enrolledAt)}</td>
                        <td className="px-3 py-3"><Progress r={r} /></td>
                        <td className="px-3 py-3 text-charcoal">{fmt(r.lastActivityAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="md:hidden list-none p-0 m-0 divide-y divide-[#f5f4ef]">
                {rows.map(r => (
                  <li key={`${r.userId}:${r.productId}`} className="px-4 py-3 flex flex-col gap-1.5 min-w-0">
                    <p className="m-0 font-semibold text-carbon text-[13.5px] break-words">{r.name}</p>
                    {r.email && <p className="m-0 text-[12px] text-slate break-all">{r.email}</p>}
                    <p className="m-0 text-[13px] text-charcoal break-words">{r.productName}</p>
                    <div className="flex gap-1 flex-wrap empty:hidden"><StatusChips r={r} /></div>
                    <Progress r={r} />
                    <p className="m-0 text-[12px] text-slate">Enrolled {fmt(r.enrolledAt)}{r.lastActivityAt ? ` · last activity ${fmt(r.lastActivityAt)}` : ''}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        {!error && total > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-[13px] text-slate">Page {page} of {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </>
  );
}
