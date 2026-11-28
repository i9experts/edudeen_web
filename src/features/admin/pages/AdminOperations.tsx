import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { AlertTriangle, Clock, Gauge, MessageSquare, PackageX, RefreshCw, Timer, Truck } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AdminPageHeader } from '@/components/comman/ui/AdminPageHeader';
import { Button } from '@/components/comman/ui/Button';
import { Select } from '@/components/comman/ui/Input';
import { SearchInput } from '@/components/comman/ui/SearchInput';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { Pagination } from '@/components/comman/ui/Pagination';
import {
  apiOpsManagers, apiOpsOverview, flagOf, formatMinutes,
  type OpsManager, type OpsOverview, type OpsQuery, type OpsRow, type OpsSort,
} from '@/api/services/operations';
import { HealthPill } from '@/features/admin/components/opsShared';

const PER_PAGE = 25;

/** Number that turns red (breach) or amber (attention) — a plain dash when zero. */
function Num({ n, tone = 'error' }: { n: number; tone?: 'error' | 'warning' }) {
  if (!n) return <span className="text-slate">0</span>;
  return <span className={clsx('font-semibold', tone === 'error' ? 'text-error' : 'text-warning-text')}>{n}</span>;
}

type Tile = { key: string; label: string; value: string | number; Icon: typeof Clock; alert: boolean; apply?: Partial<OpsQuery> };

const SORTS: { value: OpsSort; label: string }[] = [
  { value: 'attention', label: 'Most urgent first' },
  { value: 'overdue', label: 'Most overdue orders' },
  { value: 'unanswered', label: 'Most buyers waiting' },
  { value: 'stuck', label: 'Most stuck parcels' },
  { value: 'toShip', label: 'Most orders to ship' },
  { value: 'listings', label: 'Most live listings' },
  { value: 'name', label: 'Store name A–Z' },
];

/** Seller Operations Center: every store's listings, replies, orders and parcels on one screen. */
export function AdminOperations() {
  usePageTitle('Seller operations');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query: OpsQuery = useMemo(() => {
    const p = (k: string) => params.get(k) || undefined;
    return {
      type: p('type') as OpsQuery['type'], region: p('region') as OpsQuery['region'], manager: p('manager'),
      attention: p('attention') === '1' ? '1' : undefined, level: p('level') as OpsQuery['level'],
      q: p('q'), sort: (p('sort') as OpsSort) ?? 'attention', page: Number(p('page')) || 1, limit: PER_PAGE,
    };
  }, [params]);

  const [data, setData] = useState<OpsOverview | null>(null);
  const [managers, setManagers] = useState<OpsManager[]>([]);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  // Set by the Refresh button only: that one request skips the server's few-minute cache.
  const freshRef = useRef(false);
  // Loading = the last finished request is not the one for the current filters.
  const requestKey = `${JSON.stringify(query)}#${reload}`;
  const [doneKey, setDoneKey] = useState('');
  const loading = doneKey !== requestKey;
  const [search, setSearch] = useState(query.q ?? '');

  useEffect(() => { apiOpsManagers().then(r => setManagers(r.data)).catch(() => setManagers([])); }, []);

  useEffect(() => {
    let alive = true;
    const fresh = freshRef.current;
    freshRef.current = false;
    apiOpsOverview({ ...query, ...(fresh ? { refresh: '1' as const } : {}) })
      .then(r => { if (alive) { setData(r.data); setError(''); } })
      .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : 'Could not load seller operations.'); })
      .finally(() => { if (alive) setDoneKey(requestKey); });
    return () => { alive = false; };
  }, [query, reload, requestKey]);

  // Debounced search box -> URL.
  useEffect(() => {
    const t = setTimeout(() => { if ((query.q ?? '') !== search.trim()) update({ q: search.trim() || undefined }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text should trigger this
  }, [search]);

  function update(patch: Partial<Record<keyof OpsQuery, string | undefined>>, keepPage = false) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!keepPage) next.delete('page');
    setParams(next, { replace: true });
  }

  const s = data?.summary;
  const tiles: Tile[] = s ? [
    { key: 'attention', label: 'Stores needing attention', value: s.needsAttention, Icon: AlertTriangle, alert: s.needsAttention > 0, apply: { attention: '1' } },
    { key: 'overdue', label: 'Overdue orders', value: s.overdueOrders, Icon: Clock, alert: s.overdueOrders > 0, apply: { sort: 'overdue' } },
    { key: 'waiting', label: 'Buyers waiting > 24 h', value: s.unansweredOver24h, Icon: MessageSquare, alert: s.unansweredOver24h > 0, apply: { sort: 'unanswered' } },
    { key: 'stuck', label: 'Stuck parcels', value: s.stuckShipments, Icon: PackageX, alert: s.stuckShipments > 0, apply: { sort: 'stuck' } },
    { key: 'reply', label: 'Median first reply', value: formatMinutes(s.medianReplyMinutes), Icon: Timer, alert: (s.medianReplyMinutes ?? 0) > 24 * 60 },
    { key: 'dispatch', label: 'On-time dispatch', value: s.onTimeDispatchPct === null ? '—' : `${s.onTimeDispatchPct}%`, Icon: Truck, alert: s.onTimeDispatchPct !== null && s.onTimeDispatchPct < 90 },
  ] : [];

  const scopeNote = data?.scope === 'assigned' ? 'Showing the stores assigned to you.' : 'Listings, buyer replies, orders and parcels of every store.';
  const updatedAt = data ? new Date(data.generatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <>
      <AdminPageHeader
        title="Seller operations"
        subtitle={scopeNote}
        icon={<Gauge size={18} />}
        actions={<Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={() => { freshRef.current = true; setReload(n => n + 1); }} loading={loading && reload > 0}>Refresh</Button>}
      />
      <div className="px-4 sm:px-7 py-5 flex flex-col gap-4">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {!s ? [0, 1, 2, 3, 4, 5].map(i => <SkeletonBox key={i} className="h-[84px] w-full" />) : tiles.map(t => {
            const body = (
              <>
                <span className={clsx('flex size-8 items-center justify-center rounded-lg', t.alert ? 'bg-error-bg text-error' : 'bg-brand-pale-orange text-brand-orange')}><t.Icon size={16} /></span>
                <span className="min-w-0">
                  <span className={clsx('block text-[20px] font-bold leading-tight', t.alert ? 'text-error' : 'text-carbon')}>{t.value}</span>
                  <span className="block text-[12px] text-slate leading-snug">{t.label}</span>
                </span>
              </>
            );
            const cls = 'flex items-center gap-3 rounded-xl border border-bone bg-white p-3 text-left';
            return t.apply
              ? <button key={t.key} type="button" onClick={() => update(t.apply as Record<string, string>)} className={clsx(cls, 'cursor-pointer hover:border-border-hover transition')}>{body}</button>
              : <div key={t.key} className={cls}>{body}</div>;
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search store or seller" aria-label="Search store or seller" className="w-full sm:w-64" />
          <Select aria-label="Store type" value={query.type ?? ''} onChange={e => update({ type: e.target.value || undefined })}>
            <option value="">All types</option><option value="managed">Managed (MOU)</option><option value="self">Self-managed</option>
          </Select>
          <Select aria-label="Region" value={query.region ?? ''} onChange={e => update({ region: e.target.value || undefined })}>
            <option value="">National &amp; international</option><option value="national">National (Pakistan)</option><option value="international">International</option>
          </Select>
          {managers.length > 0 && (
            <Select aria-label="Account manager" value={query.manager ?? ''} onChange={e => update({ manager: e.target.value || undefined })}>
              <option value="">Any account manager</option>
              {managers.map(m => <option key={m.adminId} value={m.adminId}>{m.name ?? m.email} ({m.stores})</option>)}
            </Select>
          )}
          <Select aria-label="Sort" value={query.sort ?? 'attention'} onChange={e => update({ sort: e.target.value === 'attention' ? undefined : e.target.value })}>
            {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-[13px] text-charcoal cursor-pointer select-none px-1 py-2">
            <input type="checkbox" checked={query.attention === '1'} onChange={e => update({ attention: e.target.checked ? '1' : undefined })} className="size-[15px] accent-brand-orange cursor-pointer" />
            Needs attention only
          </label>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-lg border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setReload(n => n + 1)} className="inline-flex items-center gap-1 font-semibold underline bg-transparent border-none cursor-pointer text-error"><RefreshCw size={12} /> Retry</button>
          </div>
        )}

        {/* Table (desktop) */}
        {!data && loading ? (
          <div className="flex flex-col gap-2" aria-busy="true">{[0, 1, 2, 3].map(i => <SkeletonBox key={i} className="h-14 w-full" />)}</div>
        ) : data && data.items.length === 0 ? (
          <div className="rounded-xl border border-bone bg-white px-4 py-10 text-center text-[13px] text-slate">No stores match these filters.</div>
        ) : data && (
          <>
            <div className={clsx('hidden lg:block rounded-xl border border-bone bg-white overflow-x-auto', loading && 'opacity-60')}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11.5px] uppercase tracking-wide text-slate border-b border-bone">
                    <th className="px-3 py-2.5 font-semibold">Store</th>
                    <th className="px-3 py-2.5 font-semibold">Team</th>
                    <th className="px-3 py-2.5 font-semibold">Listings<br /><span className="normal-case font-normal">live / issues</span></th>
                    <th className="px-3 py-2.5 font-semibold">Replies<br /><span className="normal-case font-normal">median · in 24 h · waiting</span></th>
                    <th className="px-3 py-2.5 font-semibold">Orders<br /><span className="normal-case font-normal">to ship / overdue</span></th>
                    <th className="px-3 py-2.5 font-semibold">Parcels<br /><span className="normal-case font-normal">in transit / stuck</span></th>
                    <th className="px-3 py-2.5 font-semibold">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(r => (
                    <tr key={r.id} onClick={() => navigate(`/admin/operations/${r.id}`)} className="border-b border-bone last:border-0 hover:bg-fog cursor-pointer align-top">
                      <td className="px-3 py-2.5 min-w-[200px]">
                        <Link to={`/admin/operations/${r.id}`} onClick={e => e.stopPropagation()} className="font-semibold text-carbon no-underline hover:underline">{r.name}</Link>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-slate">
                          <span title={r.country}>{flagOf(r.country)} {r.country}</span>
                          {r.managementType === 'managed' && <span className="rounded-full px-1.5 py-px text-[11px] font-semibold bg-brand-pale-orange text-brand-orange">Managed{r.commissionRate !== null ? ` · ${Math.round(r.commissionRate * 100)}%` : ''}</span>}
                          {r.mouStatus === 'expired' && <span className="rounded-full px-1.5 py-px text-[11px] font-semibold bg-error-bg text-error">MOU ended</span>}
                          {r.mouStatus === 'expiring_soon' && <span className="rounded-full px-1.5 py-px text-[11px] font-semibold bg-warning-bg text-warning-text">MOU ending</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-graphite max-w-[160px]">{r.assignees.length ? <span className="line-clamp-2">{r.assignees.map(a => a.name ?? '—').join(', ')}</span> : <span className="text-slate">—</span>}</td>
                      <td className="px-3 py-2.5"><span className="text-carbon">{r.listings.active}</span> / <Num n={r.listings.issues} tone="warning" /></td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {formatMinutes(r.response.medianReplyMinutes)} · <span className={clsx(r.response.responseRatePct !== null && r.response.responseRatePct < 90 && 'text-warning-text font-semibold')}>{r.response.responseRatePct === null ? '—' : `${r.response.responseRatePct}%`}</span> · <Num n={r.response.unansweredOver24h} />
                      </td>
                      <td className="px-3 py-2.5"><span className="text-carbon">{r.orders.toShip}</span> / <Num n={r.orders.overdue} /></td>
                      <td className="px-3 py-2.5"><span className="text-carbon">{r.shipments.inTransit}</span> / <Num n={r.shipments.stuck} /></td>
                      <td className="px-3 py-2.5"><HealthPill level={r.health.level} reasons={r.health.reasons} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards (phone / tablet) */}
            <ul className={clsx('lg:hidden m-0 p-0 list-none flex flex-col gap-2', loading && 'opacity-60')}>
              {data.items.map(r => <StoreCard key={r.id} r={r} />)}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate">
              <span>{data.total} store{data.total === 1 ? '' : 's'} · updated {updatedAt} (refreshes every few minutes)</span>
              <Pagination page={query.page ?? 1} total={data.total} perPage={PER_PAGE} onChange={p => update({ page: String(p) }, true)} />
            </div>
          </>
        )}
        <p className="m-0 text-[12px] text-slate leading-relaxed">
          Overdue = a paid or cash-on-delivery parcel not shipped within the store's dispatch time. Stuck = shipped but not delivered after 7 days (21 days abroad).
          Reply numbers use the store's last 30 days (median) and 90 days (answered within 24 h); a dash means not enough chats yet.
        </p>
      </div>
    </>
  );
}

function StoreCard({ r }: { r: OpsRow }) {
  return (
    <li>
      <Link to={`/admin/operations/${r.id}`} className="block rounded-xl border border-bone bg-white p-3 no-underline text-carbon">
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold truncate">{r.name}</span>
            <span className="block text-[12px] text-slate truncate">{flagOf(r.country)} {r.country} · {r.managementType === 'managed' ? 'Managed' : 'Self-managed'}{r.assignees.length ? ` · ${r.assignees.map(a => a.name ?? '—').join(', ')}` : ''}</span>
          </span>
          <HealthPill level={r.health.level} reasons={r.health.reasons} />
        </div>
        <dl className="m-0 mt-2 grid grid-cols-4 gap-2 text-[12px]">
          <div><dt className="text-slate">Overdue</dt><dd className="m-0"><Num n={r.orders.overdue} /></dd></div>
          <div><dt className="text-slate">Waiting</dt><dd className="m-0"><Num n={r.response.unansweredOver24h} /></dd></div>
          <div><dt className="text-slate">Stuck</dt><dd className="m-0"><Num n={r.shipments.stuck} /></dd></div>
          <div><dt className="text-slate">To ship</dt><dd className="m-0">{r.orders.toShip}</dd></div>
        </dl>
        {r.health.reasons.length > 0 && <p className="m-0 mt-2 text-[12px] text-graphite">{r.health.reasons.join(' · ')}</p>}
      </Link>
    </li>
  );
}
