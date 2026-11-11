import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Download, FileText, GraduationCap, MessageCircle, RefreshCw, Users, TrendingUp, Activity } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useUrlPage, useUrlParam } from '@/hooks/useUrlParam';
import { useDebouncedValue } from '@/hooks/seller/useInventorySearch';
import { useStoreWorkspace, StorePageHeader } from '@/components/layouts/StoreLayout';
import { Button, ProgressBar, SkeletonBox } from '@/components/comman/ui';
import { MetricCard } from '@/components/comman/ui/MetricCard';
import { Modal } from '@/components/comman/ui/Modal';
import { SearchInput } from '@/components/comman/ui/SearchInput';
import { Table, type TableColumn } from '@/components/comman/ui/Table';
import {
  apiExportStoreRoster, apiGetRosterStudent, apiGetStoreRoster, apiSellerStartConversation,
  type RosterPage, type RosterRow, type RosterSortKey, type RosterStatusKey, type RosterStudentDetail,
} from '@/api/services/classroom';
import { saveCsv } from '@/api/services/adminExports';

const PAGE_SIZE = 25;
const SORTS: RosterSortKey[] = ['enrolled', 'progress', 'activity', 'name'];
const STATUSES: RosterStatusKey[] = ['all', 'not_started', 'in_progress', 'completed', 'inactive14'];
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const rowKey = (r: RosterRow) => `${r.userId}:${r.productId}`;

function FlagChips({ r }: { r: RosterRow }) {
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

function ProductName({ r }: { r: RosterRow }) {
  return (
    <p className="m-0 text-charcoal inline-flex items-center gap-1 max-w-full min-w-0" title={r.productName}>
      {r.kind === 'course' ? <GraduationCap size={13} className="shrink-0" aria-hidden /> : <FileText size={13} className="shrink-0" aria-hidden />}
      <span className="truncate">{r.productName}</span>
    </p>
  );
}

/** Drawer body: one student's items (lesson checklist or downloads), orders, and the message button. */
function StudentDetail({ storeId, userId, onLeave }: { storeId: string; userId: string; onLeave: () => void }) {
  const navigate = useNavigate();
  const [data, setData] = useState<RosterStudentDetail | null>(null);
  const [error, setError] = useState('');
  const [tryKey, setTryKey] = useState(0);
  const [messaging, setMessaging] = useState(false);
  const [msgError, setMsgError] = useState('');

  useEffect(() => {
    let alive = true;
    setData(null); setError('');
    apiGetRosterStudent(storeId, userId)
      .then(res => { if (alive) setData(res.data ?? null); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load this student.'); });
    return () => { alive = false; };
  }, [storeId, userId, tryKey]);

  async function message() {
    setMessaging(true); setMsgError('');
    try {
      const res = await apiSellerStartConversation(storeId, userId);
      onLeave(); // the drawer must not be left open behind the inbox (Back returns to a clean list)
      navigate(`/store/${storeId}/messages?conv=${res.conversationId}`);
    } catch (err) { setMsgError(err instanceof Error ? err.message : 'Could not open the conversation.'); }
    finally { setMessaging(false); }
  }

  if (error) {
    return (
      <div role="alert" className="py-8 flex flex-col items-center gap-3 text-center">
        <p className="m-0 text-[13px] text-error">{error}</p>
        <Button variant="outline" size="sm" icon={<RefreshCw size={12} />} onClick={() => setTryKey(k => k + 1)}>Retry</Button>
      </div>
    );
  }
  if (!data) return <div className="flex flex-col gap-3" aria-busy="true">{[1, 2, 3].map(i => <SkeletonBox key={i} height={i === 1 ? 64 : 96} rounded="10px" />)}</div>;

  return (
    <div className="flex flex-col gap-5 min-w-0">
      <div className="min-w-0">
        <p className="m-0 text-[16px] font-semibold text-carbon break-words">{data.name}</p>
        {data.email && <p className="m-0 text-[12.5px] text-slate break-all">{data.email}</p>}
        <p className="m-0 mt-1 text-[12.5px] text-slate">Enrolled since {fmt(data.enrolledAt)} · Last activity {fmt(data.lastActivityAt)}</p>
        <button type="button" onClick={() => void message()} disabled={messaging}
          className="mt-3 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg border-0 bg-brand-royal text-white text-[13px] font-semibold cursor-pointer disabled:opacity-60 w-full sm:w-auto">
          <MessageCircle size={14} aria-hidden /> {messaging ? 'Opening…' : 'Message student'}
        </button>
        {msgError && <p role="alert" className="m-0 mt-2 text-[12px] text-error">{msgError}</p>}
      </div>

      {data.items.map(it => (
        <section key={it.productId} className="border border-bone rounded-[10px] p-3.5 min-w-0" aria-label={it.productName}>
          <p className="m-0 text-[13.5px] font-semibold text-carbon inline-flex items-center gap-1.5 max-w-full" title={it.productName}>
            {it.kind === 'course' ? <GraduationCap size={14} className="shrink-0" aria-hidden /> : <FileText size={14} className="shrink-0" aria-hidden />}
            <span className="break-words min-w-0">{it.productName}</span>
          </p>
          <div className="flex gap-1 flex-wrap mt-1">
            <span className="rounded-full bg-cream text-slate px-2 py-[1px] text-[12px] font-semibold">{it.isFree ? 'Free' : 'Paid'}</span>
            {it.accessEnded && <span className="rounded-full bg-[#FDECEC] text-error px-2 py-[1px] text-[12px] font-semibold">Access ended</span>}
          </div>
          {it.kind === 'course' ? (
            <div className="mt-2.5">
              <div className="flex items-center gap-2"><ProgressBar value={it.percent ?? 0} className="flex-1" /><span className="text-[12px] tabular-nums w-[38px]">{it.percent ?? 0}%</span></div>
              <p className="m-0 mt-0.5 text-[12px] text-slate">{it.completedLessons ?? 0} of {it.totalLessons ?? 0} lessons · last activity {fmt(it.lastActivityAt)}</p>
              {it.sections.length === 0 ? <p className="m-0 mt-2 text-[12.5px] text-slate">This course has no lessons yet.</p> : (
                <ul className="list-none p-0 m-0 mt-2.5 flex flex-col gap-2">
                  {it.sections.map((s, si) => (
                    <li key={si}>
                      {s.title && <p className="m-0 text-[12px] font-bold uppercase tracking-[0.05em] text-slate break-words">{s.title}</p>}
                      <ul className="list-none p-0 m-0 mt-1 flex flex-col gap-1">
                        {s.lessons.map((l, li) => (
                          <li key={li} className="flex items-start gap-2 text-[13px] text-charcoal">
                            {l.done ? <CheckCircle2 size={15} className="text-success shrink-0 mt-[2px]" aria-label="Done" /> : <Circle size={15} className="text-slate shrink-0 mt-[2px]" aria-label="Not done" />}
                            <span className="break-words min-w-0">{l.title}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="m-0 mt-2.5 text-[13px] text-charcoal inline-flex items-center gap-1.5"><Download size={13} aria-hidden /> {it.downloads ?? 0} {it.downloads === 1 ? 'download' : 'downloads'}</p>
          )}
          <p className="m-0 mt-2.5 text-[12px] text-slate">
            Orders:{' '}
            {it.orders.map((o, i) => (
              <span key={o.orderNumber}>
                {i > 0 && ', '}
                <Link to={`/store/${storeId}/orders?tab=all&q=${encodeURIComponent(o.orderNumber)}`} className="text-brand-royal font-medium">{o.orderNumber}</Link>{o.free ? ' (free)' : ''}
              </span>
            ))}
          </p>
        </section>
      ))}
    </div>
  );
}

/** Store → Customers → Students: buyers of this store's digital products, with course progress or download counts. */
export default function StoreStudents() {
  const { storeId } = useStoreWorkspace();
  usePageTitle('Students');

  // Everything that shapes the list lives in the URL (survives refresh, shareable).
  const [productId, setProductId] = useUrlParam('productId');
  const [qParam, setQParam] = useUrlParam('q');
  const [sortRaw, setSortRaw] = useUrlParam('sort', 'enrolled');
  const [orderRaw, setOrderRaw] = useUrlParam('order', 'desc');
  const [statusRaw, setStatusRaw] = useUrlParam('status', 'all');
  const [page, setPage] = useUrlPage();
  const sort: RosterSortKey = (SORTS as string[]).includes(sortRaw) ? (sortRaw as RosterSortKey) : 'enrolled';
  const order: 'asc' | 'desc' = orderRaw === 'asc' ? 'asc' : 'desc';
  const status: RosterStatusKey = (STATUSES as string[]).includes(statusRaw) ? (statusRaw as RosterStatusKey) : 'all';

  const [search, setSearch] = useState(qParam);
  const debounced = useDebouncedValue(search.trim(), 300);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (debounced !== qParam) { setQParam(debounced); setPage(1); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const [data, setData] = useState<RosterPage | null>(null);
  const [loaded, setLoaded] = useState(false);       // first answer received: later loads keep the old rows (dimmed)
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tryKey, setTryKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [open, setOpen] = useState<{ userId: string; key: string } | null>(null);

  const filters = { productId: productId || undefined, q: qParam || undefined, sort, order, status };

  useEffect(() => {
    let alive = true;
    setRefreshing(true); setError('');
    apiGetStoreRoster(storeId, filters, page, PAGE_SIZE)
      .then(res => { if (alive) { setData(res.data ?? null); setLoaded(true); } })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load your students.'); })
      .finally(() => { if (alive) setRefreshing(false); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, productId, qParam, sort, order, status, page, tryKey]);

  // Quiet re-read when orders change (new buyer, refund).
  const quiet = useCallback(() => {
    apiGetStoreRoster(storeId, { productId: productId || undefined, q: qParam || undefined, sort, order, status }, page, PAGE_SIZE)
      .then(res => setData(res.data ?? null)).catch(() => {});
  }, [storeId, productId, qParam, sort, order, status, page]);
  useLiveRefresh(['orders'], quiet);

  async function exportCsv() {
    setExporting(true); setExportError('');
    try {
      const csv = await apiExportStoreRoster(storeId, filters);
      saveCsv(csv, `students-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) { setExportError(err instanceof Error ? err.message : 'Export failed.'); }
    finally { setExporting(false); }
  }

  function onSort(key: string) {
    const k = key as RosterSortKey;
    if (k === sort) setOrderRaw(order === 'desc' ? 'asc' : 'desc');
    else { setSortRaw(k); setOrderRaw(k === 'name' ? 'asc' : 'desc'); }
    setPage(1);
  }

  function closeDrawer() {
    const key = open?.key;
    setOpen(null);
    // Focus goes back to the row that opened it (the dialog trap restores it too; this covers a re-rendered row).
    if (key) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(key)}"]`)?.focus());
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const firstLoad = !loaded && !error;
  const filtered = !!(productId || qParam || status !== 'all');
  const counts = data?.statusCounts;
  const stats = data?.stats;
  const chips: { id: RosterStatusKey; label: string; n: number | undefined }[] = [
    { id: 'all', label: 'All', n: counts?.all },
    { id: 'not_started', label: 'Not started', n: counts?.notStarted },
    { id: 'in_progress', label: 'In progress', n: counts?.inProgress },
    { id: 'completed', label: 'Completed', n: counts?.completed },
    { id: 'inactive14', label: 'Inactive 14+ days', n: counts?.inactive14 },
  ];

  const columns: TableColumn<RosterRow>[] = [
    {
      key: 'name', header: 'Student', sortable: true,
      render: r => <div className="min-w-0 max-w-[240px]"><p className="m-0 font-semibold text-carbon truncate" title={r.name}>{r.name}</p>{r.email && <p className="m-0 text-[12px] text-slate truncate">{r.email}</p>}</div>,
    },
    {
      key: 'product', header: 'Product',
      render: r => <div className="min-w-0 max-w-[260px]"><ProductName r={r} /><div className="flex gap-1 flex-wrap mt-0.5 empty:hidden"><FlagChips r={r} /></div></div>,
    },
    { key: 'enrolled', header: 'Enrolled', sortable: true, render: r => <span className="whitespace-nowrap text-charcoal">{fmt(r.enrolledAt)}</span> },
    { key: 'progress', header: 'Progress / downloads', sortable: true, render: r => <div className="min-w-[150px]"><Progress r={r} /></div> },
    { key: 'activity', header: 'Last activity', sortable: true, render: r => <span className="whitespace-nowrap text-charcoal">{fmt(r.lastActivityAt)}</span> },
  ];

  const detailBody = open ? <StudentDetail key={open.userId} storeId={storeId} userId={open.userId} onLeave={() => setOpen(null)} /> : null;

  return (
    <>
      <StorePageHeader eyebrow="" title="Students" subtitle={firstLoad ? 'Loading…' : `${total} ${total === 1 ? 'enrolment' : 'enrolments'}`} />
      <div className="px-4 lg:px-7 pb-10 pt-5 flex flex-col gap-4 max-w-[1100px]">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCard label="Students" value={(stats?.totalStudents ?? 0).toLocaleString()} icon={<Users size={16} />} loading={firstLoad} />
          <MetricCard label="Avg. completion" value={stats?.avgCompletionPct == null ? '—' : `${stats.avgCompletionPct}%`} icon={<TrendingUp size={16} />} loading={firstLoad} info="Average progress across course enrolments only (files have no progress)." />
          <div className="col-span-2 sm:col-span-1 flex">
            <MetricCard label="Active last 7 days" value={(stats?.active7d ?? 0).toLocaleString()} icon={<Activity size={16} />} loading={firstLoad} info="Students who made progress in a course in the last 7 days." />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select value={productId} onChange={e => { setProductId(e.target.value); setPage(1); }} aria-label="Filter by product"
            className="rounded-lg border border-bone bg-white px-3 min-h-[44px] text-[13px] outline-none focus:border-brand-orange w-full sm:w-[260px]">
            <option value="">All digital products</option>
            {(data?.products ?? []).map(p => <option key={p.id} value={p.id}>{p.name} ({p.count})</option>)}
          </select>
          <SearchInput value={search} onChange={setSearch} placeholder="Search student name…" className="w-full sm:w-[260px]" />
          <span className="sm:ms-auto inline-flex flex-col items-end gap-1">
            <Button variant="outline" size="sm" icon={<Download size={12} />} loading={exporting} disabled={!total} onClick={exportCsv}>Export CSV</Button>
            {exportError && <span role="alert" className="text-[12px] text-error max-w-[240px] text-end">{exportError}</span>}
          </span>
        </div>

        <div role="group" aria-label="Filter by progress" className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 [scrollbar-width:none]">
          {chips.map(c => {
            const active = status === c.id;
            return (
              <button key={c.id} type="button" aria-pressed={active} onClick={() => { setStatusRaw(c.id); setPage(1); }}
                className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 min-h-[36px] text-[13px] font-medium cursor-pointer ${active ? 'bg-brand-royal text-white border-brand-royal' : 'bg-white text-charcoal border-bone hover:bg-cream'}`}>
                {c.label}{c.n !== undefined ? ` (${c.n})` : ''}
              </button>
            );
          })}
        </div>

        <div className="bg-white border border-bone rounded-[10px] min-w-0 overflow-hidden">
          {error ? (
            <div role="alert" className="flex flex-col items-center gap-3 py-10">
              <p className="text-[13px] text-error text-center m-0">{error}</p>
              <Button variant="outline" size="sm" icon={<RefreshCw size={12} />} onClick={() => setTryKey(n => n + 1)}>Try again</Button>
            </div>
          ) : (
            <div className={refreshing && loaded ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={refreshing}>
              <Table
                columns={columns}
                data={rows}
                keyExtractor={rowKey}
                onRowClick={r => setOpen({ userId: r.userId, key: rowKey(r) })}
                rowsFocusable
                rowLabel={r => `${r.name}, ${r.productName}. Open student details`}
                loading={firstLoad}
                cardsBelow="md"
                compact
                sort={{ key: sort, direction: order }}
                onSortChange={onSort}
                renderCard={r => (
                  <div className="flex flex-col gap-1.5 min-h-[44px] min-w-0">
                    <p className="m-0 font-semibold text-carbon text-[14px] break-words" title={r.name}>{r.name}</p>
                    {r.email && <p className="m-0 text-[12px] text-slate break-all">{r.email}</p>}
                    <ProductName r={r} />
                    <div className="flex gap-1 flex-wrap empty:hidden"><FlagChips r={r} /></div>
                    <Progress r={r} />
                    <p className="m-0 text-[12px] text-slate">Enrolled {fmt(r.enrolledAt)} · Last activity {fmt(r.lastActivityAt)}</p>
                  </div>
                )}
                pagination={{ page, total, perPage: PAGE_SIZE, onChange: setPage, label: 'enrolments' }}
                emptyState={{
                  icon: <Users size={28} className="text-brand-orange opacity-55" />,
                  title: filtered ? 'No matching students' : 'No students yet',
                  description: filtered ? 'Try another product, status or a different name.' : 'Buyers of your digital products and free downloads appear here.',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {open && (
        <Modal title="Student" onClose={closeDrawer} drawer width={480}>
          {detailBody}
        </Modal>
      )}
    </>
  );
}
