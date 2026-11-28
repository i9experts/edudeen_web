import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ArrowLeft, RefreshCw, UserRound } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AdminPageHeader } from '@/components/comman/ui/AdminPageHeader';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { Pagination } from '@/components/comman/ui/Pagination';
import { apiOpsTeamMember, formatMinutes, type TeamMemberDetail } from '@/api/services/operations';
import { HealthPill } from '@/features/admin/components/opsShared';
import { Metric, PeriodSwitch } from '@/features/admin/components/teamShared';
import { ON_TIME_TARGET, REPLY_LIMIT_MIN, lastSeen, parsePeriod } from '@/features/admin/components/teamUtils';

/** One team member: totals for the period, per-store breakdown and every change they made inside a store. */
export function AdminTeamMember() {
  const { adminId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const days = parsePeriod(params.get('days'));
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [data, setData] = useState<TeamMemberDetail | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const m = data?.member;
  usePageTitle(m?.name ? `${m.name} · Team` : 'Team member');

  useEffect(() => {
    let alive = true;
    apiOpsTeamMember(adminId, days, page)
      .then(r => { if (alive) { setData(r.data); setError(''); } })
      .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : 'Could not load this team member.'); });
    return () => { alive = false; };
  }, [adminId, days, page, reload]);

  const set = (patch: Record<string, string>) => setParams(prev => { const n = new URLSearchParams(prev); Object.entries(patch).forEach(([k, v]) => n.set(k, v)); return n; }, { replace: true });

  return (
    <>
      <AdminPageHeader
        title={m?.name ?? m?.email ?? 'Team member'}
        subtitle={m ? `${m.email ?? ''}${m.email ? ' · ' : ''}last active ${lastSeen(m.lastActiveAt).toLowerCase()}` : undefined}
        icon={<UserRound size={18} />}
        actions={<PeriodSwitch value={days} onChange={d => set({ days: String(d), page: '1' })} />}
      />
      <div className="px-4 sm:px-7 py-5 flex flex-col gap-4">
        <Link to={`/admin/team?days=${days}`} className="self-start inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-royal no-underline hover:underline"><ArrowLeft size={13} /> Team performance</Link>
        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-lg border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setReload(n => n + 1)} className="inline-flex items-center gap-1 font-semibold underline bg-transparent border-none cursor-pointer text-error"><RefreshCw size={12} /> Retry</button>
          </div>
        )}
        {!data && !error ? (
          <div className="flex flex-col gap-2" aria-busy="true">{[0, 1, 2].map(i => <SkeletonBox key={i} className="h-16 w-full" />)}</div>
        ) : data && m && (
          <>
            {m.breaches.length > 0 && <p role="status" className="m-0 rounded-lg border border-error-border bg-error-bg px-4 py-2.5 text-[13px] text-error">{m.breaches.join(' · ')}</p>}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Box label="Stores" lines={[`${m.stores.assigned} assigned`, `${m.stores.managed} managed (MOU)`]} />
              <Box label="Products" lines={[`${m.products.created} added`, `${m.products.edited} edited`]} />
              <Box label="Buyer replies" bad={(m.replies.medianMinutes ?? 0) > REPLY_LIMIT_MIN}
                lines={[`${m.replies.answered} chats answered`, `median ${formatMinutes(m.replies.medianMinutes)}`, `${m.replies.within24hPct === null ? '—' : `${m.replies.within24hPct}%`} within 24 h`]} />
              <Box label="Orders" bad={m.orders.onTimePct !== null && m.orders.onTimePct < ON_TIME_TARGET}
                lines={[`${m.orders.actioned} handled (${m.orders.confirmed} confirmed, ${m.orders.shipped} shipped, ${m.orders.courierBooked} courier bookings, ${m.orders.cancelled} cancelled)`, `on time ${m.orders.onTimePct === null ? '—' : `${m.orders.onTimePct}%`} of ${m.orders.onTimeSample}`]} />
            </div>

            <section className="flex flex-col gap-2">
              <h2 className="m-0 text-[15px] font-semibold text-carbon">Stores</h2>
              {data.stores.length === 0 ? (
                <p className="m-0 rounded-xl border border-bone bg-white px-4 py-6 text-center text-[13px] text-slate">No assigned stores and no store work in this period.</p>
              ) : (
                <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.stores.map(s => (
                    <li key={s.storeId} className="rounded-xl border border-bone bg-white p-4 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1">
                          <Link to={`/admin/operations/${s.storeId}`} className="block font-semibold text-carbon no-underline hover:underline truncate">{s.name}</Link>
                          <span className="block text-[12px] text-slate">{s.managementType === 'managed' ? 'Managed' : 'Self-managed'} · {s.assigned ? (s.role === 'assistant' ? 'Assistant' : 'Account manager') : 'Not assigned (helped out)'}</span>
                        </span>
                        {s.health && <HealthPill level={s.health.level} reasons={s.health.reasons} />}
                      </div>
                      <p className="m-0 text-[12.5px] text-graphite">
                        In {days} days: {s.activity.productsCreated} products added, {s.activity.productsEdited} edited · {s.activity.answered} chats answered (median {formatMinutes(s.activity.medianReplyMinutes)}) · {s.activity.ordersActioned} orders handled, {s.activity.shipped} shipped{s.activity.onTimePct !== null ? ` (${s.activity.onTimePct}% on time)` : ''}
                      </p>
                      {s.workload && (
                        <p className="m-0 text-[12.5px]">
                          Waiting now: <Metric bad={s.workload.overdue > 0}>{s.workload.overdue} overdue</Metric> · {s.workload.toShip} to ship · <Metric bad={s.workload.waitingOver24h > 0}>{s.workload.waiting} buyers waiting</Metric> · <Metric bad={s.workload.stuck > 0}>{s.workload.stuck} stuck</Metric> · {s.workload.listingIssues} listing issues
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="m-0 text-[15px] font-semibold text-carbon">Recent activity</h2>
              {data.timeline.items.length === 0 ? (
                <p className="m-0 rounded-xl border border-bone bg-white px-4 py-6 text-center text-[13px] text-slate">No changes made inside a store yet.</p>
              ) : (
                <ol className="m-0 p-0 list-none rounded-xl border border-bone bg-white divide-y divide-bone">
                  {data.timeline.items.map((t, i) => (
                    <li key={`${t.at}-${i}`} className="px-4 py-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13px]">
                      <span className="text-slate text-[12px] w-[150px] shrink-0">{new Date(t.at).toLocaleString()}</span>
                      <span className="text-carbon flex-1 min-w-[160px]">{t.label}</span>
                      <Link to={`/admin/operations/${t.storeId}`} className={clsx('text-[12px] text-brand-royal no-underline hover:underline truncate max-w-[200px]')}>{t.storeName}</Link>
                    </li>
                  ))}
                </ol>
              )}
              {data.timeline.total > data.timeline.limit && (
                <Pagination page={page} total={data.timeline.total} perPage={data.timeline.limit} onChange={p => set({ page: String(p) })} />
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

function Box({ label, lines, bad }: { label: string; lines: string[]; bad?: boolean }) {
  return (
    <div className={clsx('rounded-xl border bg-white px-4 py-3', bad ? 'border-error-border' : 'border-bone')}>
      <p className="m-0 text-[12px] text-slate">{label}</p>
      <p className={clsx('m-0 mt-0.5 text-[17px] font-semibold', bad ? 'text-error' : 'text-carbon')}>{lines[0]}</p>
      {lines.slice(1).map(l => <p key={l} className={clsx('m-0 text-[12.5px]', bad ? 'text-error' : 'text-graphite')}>{l}</p>)}
    </div>
  );
}
