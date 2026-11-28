import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { AlertTriangle, Briefcase, Building2, Clock, ImageOff, Inbox, MessageSquare, PackageCheck, RefreshCw, Truck } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AdminPageHeader } from '@/components/comman/ui/AdminPageHeader';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { useManageAsSeller } from '@/hooks/admin/useManageAsSeller';
import { apiMyManagedStores, ASSIGNMENT_ROLE_LABEL, MOU_STATUS_LABEL, type ManagedStoreRow } from '@/api/services/managedStores';
import { apiOpsMyQueue, formatMinutes, type MyQueue, type QueueParcel } from '@/api/services/operations';

type TabId = 'waiting' | 'toShip' | 'overdue' | 'stuck' | 'listings' | 'stores';
const TABS: { id: TabId; label: string; Icon: typeof Clock }[] = [
  { id: 'waiting', label: 'Buyers waiting', Icon: MessageSquare },
  { id: 'toShip', label: 'To ship', Icon: PackageCheck },
  { id: 'overdue', label: 'Overdue', Icon: AlertTriangle },
  { id: 'stuck', label: 'Stuck parcels', Icon: Truck },
  { id: 'listings', label: 'Listings to fix', Icon: ImageOff },
  { id: 'stores', label: 'My stores', Icon: Building2 },
];
const ISSUE_LABEL = { rejected: 'Sent back by review', missing_photos: 'No photos', out_of_stock: 'Out of stock' } as const;

const ago = (h: number | null) => (h === null ? '' : h < 1 ? 'under 1 h' : h < 48 ? `${h} h` : `${Math.floor(h / 24)} d`);

/**
 * Team member workspace: one to-do list across the stores assigned to them (buyers waiting, parcels to ship,
 * overdue, stuck, listings to fix). Every action opens the store as the seller on the right page.
 */
export function AdminMyStores() {
  usePageTitle('My stores');
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'waiting') as TabId;
  const setTab = (id: TabId) => setParams(prev => { const n = new URLSearchParams(prev); n.set('tab', id); return n; }, { replace: true });

  const [queue, setQueue] = useState<MyQueue | null>(null);
  const [rows, setRows] = useState<ManagedStoreRow[] | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const { start, busyId, error: operateError } = useManageAsSeller();

  const load = useCallback(() => {
    Promise.all([apiOpsMyQueue(), apiMyManagedStores()])
      .then(([q, s]) => { setError(''); setQueue(q.data); setRows(s.data.items); setIsOwner(s.data.isOwner); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your work.'));
  }, []);
  useEffect(() => { load(); }, [load, reload]);

  const counts: Record<TabId, number> = {
    waiting: queue?.waiting.length ?? 0,
    toShip: queue?.toShip.length ?? 0,
    overdue: queue?.overdue.length ?? 0,
    stuck: queue?.stuck.length ?? 0,
    listings: queue?.listings.length ?? 0,
    stores: rows?.length ?? 0,
  };
  const openItems = counts.waiting + counts.toShip + counts.overdue + counts.stuck + counts.listings;

  /** Opens the store as the seller on `page`; the button shows a spinner for that store. */
  const act = (storeId: string, page: string, label: string) => (
    <Button size="xs" variant="outline" icon={<Building2 size={12} />} onClick={() => start(storeId, page)} loading={busyId === storeId} disabled={!!busyId && busyId !== storeId}>{label}</Button>
  );

  return (
    <>
      <AdminPageHeader
        title="My stores"
        subtitle={isOwner ? 'Your work queue across the stores assigned to you, plus every managed store.' : 'Everything waiting in the stores assigned to you. Each button opens the store as the seller, on the right page.'}
        icon={<Briefcase size={18} />}
        actions={<Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={() => { setQueue(null); setReload(n => n + 1); }}>Refresh</Button>}
      />
      <div className="px-4 sm:px-7 py-5 flex flex-col gap-4">
        {operateError && <p role="alert" className="m-0 text-[13px] text-error">{operateError}</p>}
        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-lg border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setReload(n => n + 1)} className="inline-flex items-center gap-1 font-semibold underline bg-transparent border-none cursor-pointer text-error"><RefreshCw size={12} /> Retry</button>
          </div>
        )}

        {/* My numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Stores assigned" value={queue ? queue.stores.length : null} />
          <Kpi label="Open items" value={queue ? openItems : null} alert={counts.overdue + counts.stuck > 0} />
          <Kpi label="My reply time (30 d, median)" value={queue ? formatMinutes(queue.kpis.medianReplyMinutes) : null} alert={(queue?.kpis.medianReplyMinutes ?? 0) > 24 * 60} />
          <Kpi label="Shipped on time (30 d)" value={queue ? (queue.kpis.onTimePct === null ? '—' : `${queue.kpis.onTimePct}%`) : null} alert={queue?.kpis.onTimePct !== null && (queue?.kpis.onTimePct ?? 100) < 90} />
        </div>
        {queue && <Link to={`/admin/team/${queue.adminId}`} className="self-start text-[12.5px] font-semibold text-brand-royal no-underline hover:underline">See my performance →</Link>}

        {/* Tabs */}
        <div role="tablist" aria-label="Work queue" className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {TABS.map(t => (
            <button
              key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={clsx('shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] cursor-pointer transition',
                tab === t.id ? 'border-brand-orange bg-brand-pale-orange text-brand-orange font-semibold' : 'border-bone bg-white text-charcoal hover:border-border-hover')}
            >
              <t.Icon size={13} />{t.label}
              <span className={clsx('rounded-full px-1.5 text-[11px] font-semibold', counts[t.id] && (t.id === 'overdue' || t.id === 'stuck') ? 'bg-error text-white' : 'bg-mist text-graphite')}>{counts[t.id]}</span>
            </button>
          ))}
        </div>

        {!queue && !error ? (
          <div className="flex flex-col gap-2" aria-busy="true">{[0, 1, 2].map(i => <SkeletonBox key={i} className="h-14 w-full" />)}</div>
        ) : queue && (
          <div role="tabpanel">
            {tab === 'waiting' && (
              <List empty="No buyer is waiting for a reply.">
                {queue.waiting.map(c => (
                  <Row key={c.conversationId} store={c.storeName} alert={(c.hoursWaiting ?? 0) >= 24}
                    title={`${c.buyer} is waiting`} meta={c.hoursWaiting === null ? '' : `for ${ago(c.hoursWaiting)}`}
                    action={act(c.storeId, `messages?c=${c.conversationId}`, 'Reply')} />
                ))}
              </List>
            )}
            {tab === 'toShip' && <Parcels items={queue.toShip} empty="Nothing waiting to ship." act={act} />}
            {tab === 'overdue' && <Parcels items={queue.overdue} empty="No overdue orders. Well done." act={act} overdue />}
            {tab === 'stuck' && (
              <List empty="No stuck parcels.">
                {queue.stuck.map(p => (
                  <Row key={`${p.orderId}:${p.storeId}`} store={p.storeName} alert
                    title={`Order ${p.orderNumber} · ${p.days} days in transit`}
                    meta={[p.courier, p.trackingNumber, p.kind === 'cross_border' ? 'Cross-border' : null].filter(Boolean).join(' · ')}
                    action={act(p.storeId, `orders?q=${encodeURIComponent(p.orderNumber)}`, 'Open order')} />
                ))}
              </List>
            )}
            {tab === 'listings' && (
              <List empty="No listings need fixing.">
                {queue.listings.map(l => (
                  <Row key={`${l.productId}:${l.issue}`} store={l.storeName} alert={l.issue === 'rejected'}
                    title={l.name} meta={`${ISSUE_LABEL[l.issue]}${l.note ? ` · ${l.note}` : ''}`}
                    action={act(l.storeId, `products/edit/${l.productId}`, 'Fix listing')} />
                ))}
              </List>
            )}
            {tab === 'stores' && (
              rows && rows.length === 0 ? (
                <Empty text="No stores assigned to you yet. Ask the owner to assign one." />
              ) : (
                <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(rows ?? []).map(r => (
                    <li key={r.id} className="rounded-xl border border-bone bg-white p-4 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-carbon truncate">{r.name}</span>
                          <span className="block text-[12px] text-slate truncate">{r.seller?.name ?? r.seller?.email ?? ''}{r.country ? ` · ${r.country}` : ''}</span>
                        </span>
                        {r.managementType === 'managed' && r.mou && <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-brand-pale-orange text-brand-orange">MOU {MOU_STATUS_LABEL[r.mou.status]}</span>}
                      </div>
                      <p className="m-0 text-[12px] text-graphite">
                        Ships: {r.fulfillmentMode === 'platform' ? 'Edudeen' : 'the seller'}
                        {r.assignees.length > 0 && <> · Team: {r.assignees.map(a => `${a.name ?? a.email} (${ASSIGNMENT_ROLE_LABEL[a.role]})`).join(', ')}</>}
                      </p>
                      <div><Button size="sm" icon={<Building2 size={13} />} onClick={() => start(r.id)} loading={busyId === r.id}>Operate store</Button></div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        )}
        <p className="m-0 text-[12px] text-slate">A store opens in a new tab for 30 minutes after you confirm your password. Lists refresh every few minutes; overdue = not shipped within the store's dispatch time.</p>
      </div>
    </>
  );
}

function Kpi({ label, value, alert }: { label: string; value: string | number | null; alert?: boolean }) {
  return (
    <div className={clsx('rounded-xl border bg-white px-4 py-3', alert ? 'border-error-border' : 'border-bone')}>
      <p className="m-0 text-[12px] text-slate">{label}</p>
      {value === null ? <SkeletonBox className="h-6 w-16 mt-1" /> : <p className={clsx('m-0 mt-0.5 text-[20px] font-semibold', alert ? 'text-error' : 'text-carbon')}>{value}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-bone bg-white px-4 py-10 text-center text-[13px] text-slate flex flex-col items-center gap-2"><Inbox size={22} />{text}</div>;
}

function List({ empty, children }: { empty: string; children: ReactNode[] }) {
  if (!children.length) return <Empty text={empty} />;
  return <ul className="m-0 p-0 list-none flex flex-col gap-2">{children}</ul>;
}

function Row({ store, title, meta, action, alert }: { store: string; title: string; meta: string; action: ReactNode; alert?: boolean }) {
  return (
    <li className={clsx('rounded-xl border bg-white px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2', alert ? 'border-error-border' : 'border-bone')}>
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] font-semibold uppercase tracking-wide text-slate truncate">{store}</span>
        <span className="block font-semibold text-carbon truncate">{title}</span>
        {meta && <span className={clsx('block text-[12px] truncate', alert ? 'text-error' : 'text-graphite')}>{meta}</span>}
      </span>
      {action}
    </li>
  );
}

function Parcels({ items, empty, act, overdue }: { items: QueueParcel[]; empty: string; act: (storeId: string, page: string, label: string) => ReactNode; overdue?: boolean }) {
  return (
    <List empty={empty}>
      {items.map(p => {
        const h = p.hoursToDue ?? 0;
        const when = p.hoursToDue === null ? '' : overdue ? `${ago(-h)} late` : `ship within ${ago(h)}`;
        return (
          <Row key={`${p.orderId}:${p.storeId}`} store={p.storeName} alert={overdue}
            title={`Order ${p.orderNumber}${p.status === 'pending' ? ' · to confirm' : ''}`}
            meta={[when, p.shippedBy === 'edudeen' ? 'Edudeen ships' : 'Seller ships', p.buyerCountry].filter(Boolean).join(' · ')}
            action={act(p.storeId, `orders?q=${encodeURIComponent(p.orderNumber)}`, overdue ? 'Ship now' : 'Open order')} />
        );
      })}
    </List>
  );
}
