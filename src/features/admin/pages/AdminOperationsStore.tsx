import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, ExternalLink, Gauge, RefreshCw } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AdminPageHeader } from '@/components/comman/ui/AdminPageHeader';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox } from '@/components/comman/ui/SkeletonBox';
import { useAdminAccess } from '@/hooks/admin/useAdminAccess';
import { useManageAsSeller } from '@/hooks/admin/useManageAsSeller';
import { apiOpsStore, flagOf, formatMinutes, type OpsStoreDetail } from '@/api/services/operations';
import { HealthPill } from '@/features/admin/components/opsShared';

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—');
const hours = (h: number | null) => (h === null ? '—' : h < 48 ? `${h} h` : `${Math.floor(h / 24)} d`);
const MOU_LABEL: Record<string, string> = { none: 'No MOU', not_started: 'Starts later', active: 'Active', expiring_soon: 'Ending soon', expired: 'Ended' };

function Section({ title, count, children, empty }: { title: string; count?: number; children: ReactNode; empty: string }) {
  return (
    <section className="rounded-xl border border-bone bg-white">
      <h2 className="m-0 px-4 py-3 border-b border-bone text-[14px] font-bold text-carbon flex items-center gap-2">
        {title}{typeof count === 'number' && <span className={count ? 'rounded-full px-2 py-px text-[11.5px] bg-error-bg text-error' : 'rounded-full px-2 py-px text-[11.5px] bg-cream text-slate'}>{count}</span>}
      </h2>
      {count === 0 ? <p className="m-0 px-4 py-4 text-[13px] text-slate">{empty}</p> : children}
    </section>
  );
}

function Stat({ label, value, alert }: { label: string; value: ReactNode; alert?: boolean }) {
  return (
    <div className="rounded-lg bg-cream/60 px-3 py-2">
      <div className="text-[11.5px] text-slate">{label}</div>
      <div className={alert ? 'text-[16px] font-bold text-error' : 'text-[16px] font-bold text-carbon'}>{value}</div>
    </div>
  );
}

/** One store in the Seller Operations Center: the numbers plus the actual late orders, waiting buyers, stuck parcels and listing fixes. */
export function AdminOperationsStore() {
  const { storeId = '' } = useParams();
  const [data, setData] = useState<OpsStoreDetail | null>(null);
  const [error, setError] = useState('');
  const { me, isOwner, can } = useAdminAccess();
  const { start, busyId, error: operateError } = useManageAsSeller();
  usePageTitle(data ? `${data.store.name} · operations` : 'Store operations');

  const load = useCallback(() => {
    apiOpsStore(storeId).then(r => { setData(r.data); setError(''); }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load this store.'));
  }, [storeId]);
  useEffect(() => { load(); }, [load]);
  const retry = () => { setError(''); load(); };

  const back = <Link to="/admin/operations" className="inline-flex items-center gap-1 text-[13px] text-brand-royal no-underline hover:underline"><ArrowLeft size={14} /> All stores</Link>;
  if (error) {
    return (
      <div className="px-4 sm:px-7 py-5 flex flex-col gap-3">
        {back}
        <div role="alert" className="flex items-center gap-3 rounded-lg border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={retry} className="inline-flex items-center gap-1 font-semibold underline bg-transparent border-none cursor-pointer text-error"><RefreshCw size={12} /> Retry</button>
        </div>
      </div>
    );
  }
  if (!data) return <div className="px-4 sm:px-7 py-5 flex flex-col gap-3" aria-busy="true">{back}{[0, 1, 2].map(i => <SkeletonBox key={i} className="h-32 w-full" />)}</div>;

  const s = data.store;
  // The server allows operating only stores assigned to a staff member (the owner may open any).
  const mayOperate = isOwner || (can('stores.operate') && data.assignees.some(a => a.adminId === me?._id));
  const canOrders = can('orders.view');
  const canChats = can('support.view');

  return (
    <>
      <AdminPageHeader
        title={s.name}
        subtitle={`${flagOf(s.country)} ${s.country} · ${s.managementType === 'managed' ? 'Managed by Edudeen' : 'Self-managed'} · ships: ${s.fulfillmentMode === 'platform' ? 'Edudeen' : 'the seller'}`}
        icon={<Gauge size={18} />}
        actions={
          <div className="flex flex-wrap gap-2">
            {canOrders && <Link to={`/admin/orders?store=${s.id}`} className="no-underline"><Button variant="outline" size="sm" icon={<ExternalLink size={13} />}>All orders</Button></Link>}
            {mayOperate && <Button size="sm" icon={<Building2 size={13} />} onClick={() => start(s.id)} loading={busyId === s.id}>Operate store</Button>}
          </div>
        }
      />
      <div className="px-4 sm:px-7 py-5 flex flex-col gap-4">
        {back}
        {operateError && <p role="alert" className="m-0 text-[13px] text-error">{operateError}</p>}

        <div className="rounded-xl border border-bone bg-white p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <HealthPill level={s.health.level} />
            {s.health.reasons.length > 0 ? <span className="text-[13px] text-graphite">{s.health.reasons.join(' · ')}</span> : <span className="text-[13px] text-slate">Nothing needs attention right now.</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            <Stat label="Live listings" value={s.listings.active} />
            <Stat label="Waiting for review" value={s.listings.pendingReview} />
            <Stat label="To ship" value={s.orders.toShip} />
            <Stat label="Overdue" value={s.orders.overdue} alert={s.orders.overdue > 0} />
            <Stat label="In transit" value={s.shipments.inTransit} />
            <Stat label="Stuck" value={s.shipments.stuck} alert={s.shipments.stuck > 0} />
            <Stat label="Median first reply" value={formatMinutes(s.response.medianReplyMinutes)} />
            <Stat label="Answered in 24 h" value={s.response.responseRatePct === null ? '—' : `${s.response.responseRatePct}%`} alert={s.response.responseRatePct !== null && s.response.responseRatePct < 90} />
            <Stat label="Buyers waiting" value={s.response.unanswered} alert={s.response.unansweredOver24h > 0} />
            <Stat label="Unanswered questions" value={s.response.unansweredQuestions} />
            <Stat label="On-time dispatch" value={s.shipments.onTimeDispatchPct === null ? '—' : `${s.shipments.onTimeDispatchPct}%`} alert={s.shipments.lateDispatchPct !== null && s.shipments.lateDispatchPct > 10} />
            <Stat label="Delivered (30 d)" value={s.orders.delivered30d} />
            <Stat label="Seller cancels (30 d)" value={s.orders.cancelledBySeller30d} />
            <Stat label="Open returns" value={s.orders.returnsOpen} />
            <Stat label="Domestic / abroad (30 d)" value={`${s.shipments.domestic30d} / ${s.shipments.crossBorder30d}`} />
            <Stat label="New orders" value={s.orders.new} />
          </div>
          {s.shipments.unknown30d > 0 && <p className="m-0 text-[12px] text-slate">{s.shipments.unknown30d} recent parcel{s.shipments.unknown30d === 1 ? ' has' : 's have'} no buyer country (older orders), so {s.shipments.unknown30d === 1 ? 'it is' : 'they are'} not counted as domestic or abroad.</p>}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Section title="Overdue orders" count={data.overdueOrders.length} empty="No order is past its ship-by time.">
            <ul className="m-0 p-0 list-none divide-y divide-bone">
              {data.overdueOrders.map(o => (
                <li key={o.orderId} className="px-4 py-2.5 flex items-center gap-3 text-[13px]">
                  <span className="min-w-0 flex-1">
                    {canOrders ? <Link to={`/admin/orders?order=${o.orderId}`} className="font-semibold text-brand-royal no-underline hover:underline">{o.orderNumber}</Link> : <span className="font-semibold">{o.orderNumber}</span>}
                    <span className="block text-[12px] text-slate">{o.buyerCity ?? ''}{o.buyerCountry ? ` ${flagOf(o.buyerCountry)}` : ''} · ordered {when(o.createdAt)} · ships: {o.shippedBy === 'edudeen' ? 'Edudeen' : 'seller'}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-error">{hours(o.hoursLate)} late</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Buyers waiting for a reply" count={data.unansweredChats.length} empty="Every buyer chat has a reply.">
            <ul className="m-0 p-0 list-none divide-y divide-bone">
              {data.unansweredChats.map(c => (
                <li key={c.conversationId} className="px-4 py-2.5 flex items-center gap-3 text-[13px]">
                  <span className="min-w-0 flex-1">
                    {canChats ? <Link to={`/admin/messages?tab=conversations&store=${s.id}&conversation=${c.conversationId}`} className="font-semibold text-brand-royal no-underline hover:underline">{c.buyer}</Link> : <span className="font-semibold">{c.buyer}</span>}
                    <span className="block text-[12px] text-slate">{c.aboutOrderId ? 'About an order' : c.aboutProductId ? 'About a product' : 'General question'} · since {when(c.waitingSince)}</span>
                  </span>
                  <span className={(c.hoursWaiting ?? 0) >= 24 ? 'shrink-0 font-semibold text-error' : 'shrink-0 text-graphite'}>{hours(c.hoursWaiting)}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Stuck parcels" count={data.stuckShipments.length} empty="No parcel has been in transit too long.">
            <ul className="m-0 p-0 list-none divide-y divide-bone">
              {data.stuckShipments.map(p => (
                <li key={p.orderId} className="px-4 py-2.5 flex items-center gap-3 text-[13px]">
                  <span className="min-w-0 flex-1">
                    {canOrders ? <Link to={`/admin/orders?order=${p.orderId}`} className="font-semibold text-brand-royal no-underline hover:underline">{p.orderNumber}</Link> : <span className="font-semibold">{p.orderNumber}</span>}
                    <span className="block text-[12px] text-slate">{p.courier ?? 'No courier'}{p.trackingNumber ? ` · ${p.trackingNumber}` : ''} · {p.kind === 'cross_border' ? 'abroad' : p.kind === 'domestic' ? 'domestic' : 'destination unknown'}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-error">{p.days} d</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Listings to fix" count={data.listingIssues.rejected.length + data.listingIssues.missingPhotos.length + data.listingIssues.outOfStock.length} empty="No listing needs fixing.">
            <div className="px-4 py-3 flex flex-col gap-3 text-[13px]">
              {data.listingIssues.rejected.length > 0 && (
                <div><p className="m-0 mb-1 text-[12px] font-semibold text-slate uppercase tracking-wide">Sent back by review</p>
                  <ul className="m-0 ps-4">{data.listingIssues.rejected.map(p => <li key={p.productId}>{p.name}{p.note && <span className="text-slate"> — {p.note}</span>}</li>)}</ul></div>
              )}
              {data.listingIssues.missingPhotos.length > 0 && (
                <div><p className="m-0 mb-1 text-[12px] font-semibold text-slate uppercase tracking-wide">No photos</p>
                  <ul className="m-0 ps-4">{data.listingIssues.missingPhotos.map(p => <li key={p.productId}>{p.name}</li>)}</ul></div>
              )}
              {data.listingIssues.outOfStock.length > 0 && (
                <div><p className="m-0 mb-1 text-[12px] font-semibold text-slate uppercase tracking-wide">Out of stock (live)</p>
                  <ul className="m-0 ps-4">{data.listingIssues.outOfStock.map(p => <li key={p.productId}>{p.name}</li>)}</ul></div>
              )}
            </div>
          </Section>
        </div>

        <div className="rounded-xl border border-bone bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
          <div>
            <h2 className="m-0 mb-2 text-[14px] font-bold text-carbon">Agreement</h2>
            {data.mou ? (
              <p className="m-0 text-graphite">
                MOU {MOU_LABEL[data.mou.status ?? 'none']} · {data.mou.commissionRate !== null ? `${Math.round(data.mou.commissionRate * 10000) / 100}% commission` : 'no commission set'}
                {data.mou.endDate ? ` · ends ${new Date(data.mou.endDate).toLocaleDateString()}` : ''}{data.mou.hasDocument ? ' · signed copy on file' : ' · no signed copy'}
              </p>
            ) : <p className="m-0 text-slate">Self-managed store (no MOU).</p>}
            {can('managed.manage') && <Link to={`/admin/stores?store=${s.id}`} className="inline-block mt-2 text-brand-royal no-underline hover:underline">Edit in Stores</Link>}
          </div>
          <div>
            <h2 className="m-0 mb-2 text-[14px] font-bold text-carbon">Team</h2>
            {data.assignees.length ? (
              <ul className="m-0 ps-4 text-graphite">{data.assignees.map(a => <li key={a.adminId}>{a.name ?? a.email} · {a.role === 'assistant' ? 'Assistant' : 'Account manager'} since {when(a.assignedAt)}</li>)}</ul>
            ) : <p className="m-0 text-slate">No one is assigned to this store.</p>}
          </div>
        </div>
        <p className="m-0 text-[12px] text-slate">Updated {new Date(data.generatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}.</p>
      </div>
    </>
  );
}
