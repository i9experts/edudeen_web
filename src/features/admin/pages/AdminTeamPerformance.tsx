import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { Award, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AdminPageHeader } from '@/components/comman/ui/AdminPageHeader';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { apiOpsTeam, formatMinutes, type TeamList, type TeamPeriod, type TeamRow } from '@/api/services/operations';
import { Metric, PeriodSwitch } from '@/features/admin/components/teamShared';
import { ON_TIME_TARGET, REPLY_LIMIT_MIN, lastSeen, parsePeriod } from '@/features/admin/components/teamUtils';

/** Super admin: how each team member performs across the stores they run (period: 7 / 30 / 90 days). */
export function AdminTeamPerformance() {
  usePageTitle('Team performance');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const days = parsePeriod(params.get('days'));
  const [data, setData] = useState<TeamList | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState<{ n: number; refresh: boolean }>({ n: 0, refresh: false });
  // Loading = the last finished request is not the one for the current period/reload.
  const requestKey = `${days}:${reload.n}`;
  const [doneKey, setDoneKey] = useState('');
  const loading = doneKey !== requestKey;

  useEffect(() => {
    let alive = true;
    apiOpsTeam(days, reload.refresh)
      .then(r => { if (alive) { setData(r.data); setError(''); } })
      .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : 'Could not load team performance.'); })
      .finally(() => { if (alive) setDoneKey(`${days}:${reload.n}`); });
    return () => { alive = false; };
  }, [days, reload]);

  const s = data?.summary;
  return (
    <>
      <AdminPageHeader
        title="Team performance"
        subtitle="What each team member did in the stores they run: listings, buyer replies, orders and shipping, plus what is waiting in their stores now."
        icon={<Award size={18} />}
        actions={<>
          <PeriodSwitch value={days} onChange={d => setParams({ days: String(d) }, { replace: true })} />
          <Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={() => setReload(r => ({ n: r.n + 1, refresh: true }))}>Refresh</Button>
        </>}
      />
      <div className="px-4 sm:px-7 py-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Tile label="Team members" value={s?.members} sub={s && s.withBreaches ? `${s.withBreaches} need attention` : undefined} bad={!!s?.withBreaches} />
          <Tile label="Products listed" value={s?.productsListed} />
          <Tile label="Buyer chats answered" value={s?.repliesAnswered} sub={s ? `median ${formatMinutes(s.medianReplyMinutes)}` : undefined} bad={(s?.medianReplyMinutes ?? 0) > REPLY_LIMIT_MIN} />
          <Tile label="Orders handled" value={s?.ordersActioned} sub={s ? `on time ${s.onTimePct === null ? '—' : `${s.onTimePct}%`}` : undefined} bad={s?.onTimePct !== null && (s?.onTimePct ?? 100) < ON_TIME_TARGET} />
          <Tile label="Overdue now" value={s?.openOverdue} bad={!!s?.openOverdue} />
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-lg border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setReload(r => ({ n: r.n + 1, refresh: false }))} className="inline-flex items-center gap-1 font-semibold underline bg-transparent border-none cursor-pointer text-error"><RefreshCw size={12} /> Retry</button>
          </div>
        )}

        {!data && loading ? (
          <div className="flex flex-col gap-2" aria-busy="true">{[0, 1, 2].map(i => <SkeletonBox key={i} className="h-14 w-full" />)}</div>
        ) : data && data.items.length === 0 ? (
          <div className="rounded-xl border border-bone bg-white px-4 py-10 text-center text-[13px] text-slate">
            No team activity yet. Assign team members to stores in <Link to="/admin/stores" className="text-brand-royal">Sellers → Stores</Link>; their work appears here once they start operating stores.
          </div>
        ) : data && (
          <>
            <div className={clsx('hidden lg:block rounded-xl border border-bone bg-white overflow-x-auto', loading && 'opacity-60')}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11.5px] uppercase tracking-wide text-slate border-b border-bone">
                    <th className="px-3 py-2.5 font-semibold">Team member</th>
                    <th className="px-3 py-2.5 font-semibold">Stores<br /><span className="normal-case font-normal">assigned · managed</span></th>
                    <th className="px-3 py-2.5 font-semibold">Products<br /><span className="normal-case font-normal">added · edited</span></th>
                    <th className="px-3 py-2.5 font-semibold">Buyer replies<br /><span className="normal-case font-normal">answered · median · in 24 h</span></th>
                    <th className="px-3 py-2.5 font-semibold">Orders<br /><span className="normal-case font-normal">handled · shipped · on time</span></th>
                    <th className="px-3 py-2.5 font-semibold">Waiting now<br /><span className="normal-case font-normal">overdue · buyers 24 h+ · stuck</span></th>
                    <th className="px-3 py-2.5 font-semibold">Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(r => (
                    <tr key={r.adminId} onClick={() => navigate(`/admin/team/${r.adminId}?days=${days}`)} className="border-b border-bone last:border-0 hover:bg-fog cursor-pointer align-top">
                      <td className="px-3 py-2.5 min-w-[180px]">
                        <Link to={`/admin/team/${r.adminId}?days=${days}`} onClick={e => e.stopPropagation()} className="font-semibold text-carbon no-underline hover:underline">{r.name ?? r.email ?? 'Team member'}</Link>
                        {r.breaches.length > 0 && <p className="m-0 mt-0.5 text-[12px] text-error line-clamp-2">{r.breaches.join(' · ')}</p>}
                      </td>
                      <td className="px-3 py-2.5">{r.stores.assigned} · {r.stores.managed}</td>
                      <td className="px-3 py-2.5">{r.products.created} · {r.products.edited}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {r.replies.answered} · <Metric bad={(r.replies.medianMinutes ?? 0) > REPLY_LIMIT_MIN}>{formatMinutes(r.replies.medianMinutes)}</Metric> · {r.replies.within24hPct === null ? '—' : `${r.replies.within24hPct}%`}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {r.orders.actioned} · {r.orders.shipped} · <Metric bad={r.orders.onTimePct !== null && r.orders.onTimePct < ON_TIME_TARGET}>{r.orders.onTimePct === null ? '—' : `${r.orders.onTimePct}%`}</Metric>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <Metric bad={r.workload.overdue > 0}>{r.workload.overdue}</Metric> · <Metric bad={r.workload.waitingOver24h > 0}>{r.workload.waitingOver24h}</Metric> · <Metric bad={r.workload.stuck > 0}>{r.workload.stuck}</Metric>
                      </td>
                      <td className="px-3 py-2.5 text-graphite whitespace-nowrap">{lastSeen(r.lastActiveAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={clsx('lg:hidden m-0 p-0 list-none flex flex-col gap-2', loading && 'opacity-60')}>
              {data.items.map(r => <MemberCard key={r.adminId} r={r} days={days} />)}
            </ul>
            <p className="m-0 text-[12px] text-slate">Updated {new Date(data.generatedAt).toLocaleTimeString()} · refreshes every few minutes.</p>
          </>
        )}
        <p className="m-0 text-[12px] text-slate leading-relaxed">
          Counts only work done while operating a store from the admin panel. A reply is timed from the buyer's first waiting message to the team member's first answer; on time = shipped within the order's dispatch time.
          "Edited" counts listings whose latest edit was by that person. Red marks a miss: median reply over 24 h, on-time under {ON_TIME_TARGET}%, or anything overdue right now.
        </p>
      </div>
    </>
  );
}

function Tile({ label, value, sub, bad }: { label: string; value: number | undefined; sub?: string; bad?: boolean }) {
  return (
    <div className={clsx('rounded-xl border bg-white px-4 py-3', bad ? 'border-error-border' : 'border-bone')}>
      <p className="m-0 text-[12px] text-slate">{label}</p>
      {value === undefined ? <SkeletonBox className="h-6 w-12 mt-1" /> : <p className={clsx('m-0 mt-0.5 text-[20px] font-semibold', bad ? 'text-error' : 'text-carbon')}>{value}</p>}
      {sub && <p className={clsx('m-0 text-[12px]', bad ? 'text-error' : 'text-graphite')}>{sub}</p>}
    </div>
  );
}

function MemberCard({ r, days }: { r: TeamRow; days: TeamPeriod }) {
  return (
    <li>
      <Link to={`/admin/team/${r.adminId}?days=${days}`} className={clsx('block rounded-xl border bg-white p-3 no-underline text-carbon', r.breaches.length ? 'border-error-border' : 'border-bone')}>
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1 font-semibold truncate">{r.name ?? r.email ?? 'Team member'}</span>
          <span className="text-[12px] text-slate shrink-0">{lastSeen(r.lastActiveAt)}</span>
        </div>
        <dl className="m-0 mt-2 grid grid-cols-4 gap-2 text-[12px]">
          <div><dt className="text-slate">Stores</dt><dd className="m-0">{r.stores.assigned}</dd></div>
          <div><dt className="text-slate">Replies</dt><dd className="m-0"><Metric bad={(r.replies.medianMinutes ?? 0) > REPLY_LIMIT_MIN}>{formatMinutes(r.replies.medianMinutes)}</Metric></dd></div>
          <div><dt className="text-slate">On time</dt><dd className="m-0"><Metric bad={r.orders.onTimePct !== null && r.orders.onTimePct < ON_TIME_TARGET}>{r.orders.onTimePct === null ? '—' : `${r.orders.onTimePct}%`}</Metric></dd></div>
          <div><dt className="text-slate">Overdue</dt><dd className="m-0"><Metric bad={r.workload.overdue > 0}>{r.workload.overdue}</Metric></dd></div>
        </dl>
        {r.breaches.length > 0 && <p className="m-0 mt-2 text-[12px] text-error">{r.breaches.join(' · ')}</p>}
      </Link>
    </li>
  );
}
