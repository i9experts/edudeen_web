import { useEffect, useState, useCallback } from 'react';
import { TrendingUp, Users, AlertTriangle, Store as StoreIcon, ShieldAlert } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { SkeletonBox, Table, type TableColumn } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import { useToast } from '@/contexts/ToastContext';
import {
  apiAdminGetOverview, apiAdminGetStoreBreakdown, apiAdminGetStoreDetail,
  apiAdminGetPaymentFailures, apiAdminGetSubscriptionDetail, apiAdminSuspendPlan, apiAdminUnsuspendPlan,
  apiAdminGetWebhookHistory, apiAdminRetryWebhook, apiAdminGetLtv, apiAdminGetRevenueBreakdown,
  apiAdminGetChurnCohorts, apiAdminRefundInvoice,
  type StoreBreakdownRow, type PaymentAttempt, type DashboardData, type SellerPlan, type WebhookEvent,
  type LtvData, type RevenueBreakdown, type ChurnCohort, type SubscriptionInvoice,
} from '@/api/services/subscriptions';

type Tab = 'stores' | 'failures' | 'webhooks' | 'insights';
type FailureRow = PaymentAttempt & { store: { name: string } | null; customer: { name: string; email: string } | null };

const WEBHOOK_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  processed: { bg: '#E3F4EA', color: '#1E7A3C' },
  received: { bg: '#EDF2F4', color: '#486071' },
  processing: { bg: '#FFF4DC', color: '#B36200' },
  failed: { bg: '#FDECEA', color: '#C0392B' },
  ignored: { bg: '#EDF2F4', color: '#64727B' },
};

function WebhooksPanel() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<{ id: string; message: string } | null>(null);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    setError('');
    apiAdminGetWebhookHistory({ limit: 50 })
      .then(res => setEvents(res.data.events ?? []))
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load webhook history.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  async function retry(id: string) {
    setRetryingId(id);
    setRetryError(null);
    try {
      await apiAdminRetryWebhook(id);
      toast.success('Webhook re-processed');
      load();
    } catch (err) {
      setRetryError({ id, message: err instanceof Error ? err.message : 'Retry failed.' });
    } finally {
      setRetryingId(null);
    }
  }

  const columns: TableColumn<WebhookEvent>[] = [
    { key: 'createdAt', header: 'Received', render: ev => <span className="text-slate whitespace-nowrap">{new Date(ev.createdAt).toLocaleString()}</span> },
    { key: 'type', header: 'Type', render: ev => <span className="text-charcoal">{ev.type}</span> },
    {
      key: 'status', header: 'Status',
      render: ev => {
        const st = WEBHOOK_STATUS_STYLE[ev.status] ?? { bg: '#EDF2F4', color: '#486071' };
        return <span className="px-[10px] py-[3px] rounded-[5px] text-[11px] font-semibold" style={{ background: st.bg, color: st.color }}>{ev.status}</span>;
      },
    },
    { key: 'processingAttempts', header: 'Attempts', render: ev => <span className="text-slate">{ev.processingAttempts}</span> },
    { key: 'error', header: 'Error', render: ev => <span className="text-slate max-w-[220px] truncate block">{ev.error ?? '—'}</span> },
    {
      key: 'actions', header: '',
      render: ev => ev.status === 'failed' ? (
        <div className="flex flex-col items-start gap-1">
          <button disabled={retryingId === ev._id} onClick={() => retry(ev._id)} className="px-2.5 py-1 bg-white border border-bone rounded-[6px] text-[11px] text-graphite cursor-pointer disabled:opacity-50">
            {retryingId === ev._id ? 'Retrying…' : 'Retry'}
          </button>
          {retryError?.id === ev._id && <span className="text-[11px] text-error max-w-[220px]">{retryError.message}</span>}
        </div>
      ) : null,
    },
  ];

  if (error) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[13px] text-error mb-2">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>Try Again</Button>
      </div>
    );
  }

  return (
    <Table
      columns={columns}
      data={events}
      keyExtractor={ev => ev._id}
      loading={loading}
      emptyState={{ title: 'No webhook events yet.' }}
    />
  );
}

// ── Insights panel (LTV, revenue breakdown, churn cohorts) ───────────────────
function InsightsPanel() {
  const [ltv, setLtv] = useState<LtvData | null>(null);
  const [revenue, setRevenue] = useState<RevenueBreakdown | null>(null);
  const [cohorts, setCohorts] = useState<ChurnCohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([apiAdminGetLtv(), apiAdminGetRevenueBreakdown(), apiAdminGetChurnCohorts({ months: 6 })])
      .then(([l, r, c]) => { setLtv(l.data); setRevenue(r.data); setCohorts(c.data ?? []); })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load insights.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  if (loading) {
    return (
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => <SkeletonBox key={i} height={70} rounded="8px" />)}
        </div>
        <SkeletonBox height={180} rounded="8px" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
        <p className="text-[13px] text-error">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 flex flex-col gap-5">
      {ltv && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-cream rounded-[8px] px-4 py-3">
            <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Avg. lifetime value (ended subscriptions)</p>
            <p className="text-[18px] font-bold text-carbon">${ltv.realizedLtvUSD.toFixed(2)}</p>
            <p className="text-[11px] text-slate mt-0.5">{ltv.canceledSubscriptionsSampled} sampled</p>
          </div>
          <div className="bg-cream rounded-[8px] px-4 py-3">
            <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Avg. paid so far (active subscriptions)</p>
            <p className="text-[18px] font-bold text-carbon">${ltv.activeAvgRevenueToDateUSD.toFixed(2)}</p>
            <p className="text-[11px] text-slate mt-0.5">{ltv.activeSubscriptionsSampled} sampled</p>
          </div>
        </div>
      )}

      {cohorts.length > 0 && (
        <div>
          <p className="text-[12px] font-semibold text-charcoal mb-2">How many subscribers stay, by start month</p>
          <Table
            columns={[
              { key: 'cohort', header: 'Started in', render: c => <span className="text-charcoal">{c.cohort}</span> },
              { key: 'totalStarted', header: 'Started', render: c => <span className="text-graphite">{c.totalStarted}</span> },
              { key: 'stillActive', header: 'Still Active', render: c => <span className="text-graphite">{c.stillActive}</span> },
              { key: 'retentionPercent', header: 'Retention', render: c => <span className="font-semibold text-success">{c.retentionPercent}%</span> },
            ] as TableColumn<ChurnCohort>[]}
            data={cohorts}
            keyExtractor={c => c.cohort}
          />
        </div>
      )}

      {revenue && (
        <div>
          <p className="text-[12px] font-semibold text-charcoal mb-2">Revenue by Store (last 90 days)</p>
          <Table
            columns={[
              { key: 'storeName', header: 'Store', render: r => <span className="text-charcoal">{r.storeName}</span> },
              { key: 'totalUSD', header: 'Total', render: r => <span className="font-semibold text-success">${r.totalUSD.toFixed(2)}</span> },
              { key: 'invoiceCount', header: 'Invoices', render: r => <span className="text-graphite">{r.invoiceCount}</span> },
              { key: 'sellerPayoutUSD', header: 'Seller Payout', render: r => <span className="text-graphite">${r.sellerPayoutUSD.toFixed(2)}</span> },
              { key: 'platformCommissionUSD', header: 'Platform Commission', render: r => <span className="text-graphite">${r.platformCommissionUSD.toFixed(2)}</span> },
            ] as TableColumn<RevenueBreakdown['byStore'][number]>[]}
            data={revenue.byStore ?? []}
            keyExtractor={r => r.storeId}
            emptyState={{ title: 'No revenue in range.' }}
          />
          <p className="text-[11px] text-slate mt-2">{revenue.note}</p>
        </div>
      )}
    </div>
  );
}

// ── Store detail modal ───────────────────────────────────────────────────────
function StoreDetailModal({ storeId, onClose }: { storeId: string; onClose: () => void }) {
  const [data, setData] = useState<(DashboardData & { store: { name: string; slug: string }; plans: SellerPlan[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [confirmingSuspendId, setConfirmingSuspendId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    apiAdminGetStoreDetail(storeId)
      .then(res => setData(res.data))
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Failed to load store detail.'))
      .finally(() => setLoading(false));
  }, [storeId]);
  useEffect(load, [load]);

  // Suspend blocks a seller's plan and is confirmed before firing; unsuspend
  // is corrective/restorative, not destructive, so it fires immediately.
  async function toggleSuspend(plan: SellerPlan) {
    if (plan.status === 'suspended') {
      await apiAdminUnsuspendPlan(plan._id);
      load();
      return;
    }
    if (confirmingSuspendId !== plan._id) {
      setConfirmingSuspendId(plan._id);
      return;
    }
    setConfirmingSuspendId(null);
    await apiAdminSuspendPlan(plan._id);
    load();
  }

  return (
    <Modal mobileSheet title={data?.store.name ?? 'Store'} width={560} onClose={onClose}>
      {loadError ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-[13px] text-error">{loadError}</p>
          <Button variant="outline" size="sm" onClick={load}>Try Again</Button>
        </div>
      ) : loading || !data ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBox key={i} height={54} rounded="8px" />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBox key={i} height={46} rounded="8px" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            {[['Monthly revenue', `$${data.mrr.toFixed(2)}`], ['Subscribers', String(data.activeSubscribersCount)], ['Cancellation rate', `${data.churnRate}%`]].map(([l, v]) => (
              <div key={l} className="bg-cream rounded-lg px-3 py-2.5 text-center">
                <p className="text-[10px] text-slate uppercase tracking-wide">{l}</p>
                <p className="text-[16px] font-bold text-carbon">{v}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-charcoal mb-2">Plans</p>
            <div className="flex flex-col gap-2">
              {(data.plans ?? []).map(p => (
                <div key={p._id} className="flex items-center justify-between bg-cream rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-semibold text-charcoal">{p.name}</p>
                    <p className="text-[11px] text-slate">${p.monthlyPriceUSD}/mo · {p.subscriberCount} subscribers · status: {p.status}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {confirmingSuspendId === p._id && (
                      <Button size="xs" variant="ghost" onClick={() => setConfirmingSuspendId(null)}>Cancel</Button>
                    )}
                    <Button size="xs" variant={p.status === 'suspended' ? 'outline' : 'danger'} onClick={() => toggleSuspend(p)}>
                      {p.status === 'suspended' ? 'Unsuspend' : confirmingSuspendId === p._id ? 'Confirm Suspend' : 'Suspend'}
                    </Button>
                  </div>
                </div>
              ))}
              {(data.plans ?? []).length === 0 && <p className="text-[12px] text-slate">No plans.</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

type SubscriptionDetailData = Awaited<ReturnType<typeof apiAdminGetSubscriptionDetail>>['data'];

// ── Subscription detail modal (dunning/retry drill-down) ─────────────────────
function SubscriptionDetailModal({ subId, onClose }: { subId: string; onClose: () => void }) {
  const [data, setData] = useState<SubscriptionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [confirmingRefund, setConfirmingRefund] = useState<SubscriptionInvoice | null>(null);
  const [refundError, setRefundError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    apiAdminGetSubscriptionDetail(subId)
      .then(res => setData(res.data))
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Failed to load subscription detail.'))
      .finally(() => setLoading(false));
  }, [subId]);
  useEffect(load, [load]);

  async function refund() {
    if (!confirmingRefund) return;
    setRefundingId(confirmingRefund._id);
    setRefundError('');
    try {
      await apiAdminRefundInvoice(confirmingRefund._id);
      setConfirmingRefund(null);
      load();
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : 'Refund failed.');
    } finally {
      setRefundingId(null);
    }
  }

  return (
    <Modal mobileSheet title="Subscription Detail" width={600} onClose={onClose}>
      {loadError ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-[13px] text-error">{loadError}</p>
          <Button variant="outline" size="sm" onClick={load}>Try Again</Button>
        </div>
      ) : loading || !data ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBox key={i} height={32} rounded="6px" />
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBox key={i} height={28} rounded="6px" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div><p className="text-slate">Store</p><p className="font-semibold text-charcoal">{data.store?.name ?? '—'}</p></div>
            <div><p className="text-slate">Customer</p><p className="font-semibold text-charcoal">{data.customer?.name ?? '—'} ({data.customer?.email ?? '—'})</p></div>
            <div><p className="text-slate">Plan</p><p className="font-semibold text-charcoal">{data.plan?.name ?? '—'}</p></div>
            <div><p className="text-slate">Status</p><p className="font-semibold text-charcoal">{data.status}</p></div>
            <div><p className="text-slate">Failed attempts</p><p className="font-semibold text-charcoal">{data.failedPaymentAttempts}</p></div>
            <div><p className="text-slate">Next billing</p><p className="font-semibold text-charcoal">{new Date(data.nextBillingDate).toLocaleDateString()}</p></div>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-charcoal mb-2">Payment Attempt History</p>
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
              {(data.paymentAttempts ?? []).map((a: PaymentAttempt) => (
                <div key={a._id} className="flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded bg-cream">
                  <span className="text-slate">#{a.attemptNumber} · {a.attemptType} · {new Date(a.createdAt).toLocaleString()}</span>
                  <span className={`font-semibold ${a.outcome === 'success' ? 'text-[#1e7a3c]' : 'text-error'}`}>
                    {a.outcome === 'failed' ? (a.failureReason ?? 'Failed') : `$${a.amountUSD.toFixed(2)}`}
                  </span>
                </div>
              ))}
              {(data.paymentAttempts ?? []).length === 0 && <p className="text-[12px] text-slate">No payment attempts recorded.</p>}
            </div>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-charcoal mb-2">Invoices</p>
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
              {(data.invoices ?? []).map((inv: SubscriptionInvoice) => (
                <div key={inv._id} className="flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded bg-cream">
                  <span className="text-slate">{inv.invoiceNumber} · {inv.status} · ${inv.amountUSD.toFixed(2)}</span>
                  {['paid', 'partially_refunded'].includes(inv.status) && (
                    <button onClick={() => { setConfirmingRefund(inv); setRefundError(''); }}
                      className="px-2 py-[3px] bg-white border border-bone rounded-[5px] text-[11px] text-error cursor-pointer">
                      Refund
                    </button>
                  )}
                </div>
              ))}
              {(data.invoices ?? []).length === 0 && <p className="text-[12px] text-slate">No invoices recorded.</p>}
            </div>
          </div>
        </div>
      )}

      {confirmingRefund && (
        <Modal mobileSheet
          title="Refund Invoice"
          onClose={() => setConfirmingRefund(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmingRefund(null)} disabled={refundingId === confirmingRefund._id}>Cancel</Button>
              <Button variant="danger" onClick={refund} loading={refundingId === confirmingRefund._id}>Refund</Button>
            </>
          }
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Refund invoice <strong>{confirmingRefund.invoiceNumber}</strong> for <strong>${confirmingRefund.amountUSD.toFixed(2)}</strong>?
          </p>
          {refundError && <p className="text-[12px] text-error mt-2">{refundError}</p>}
        </Modal>
      )}
    </Modal>
  );
}

export function AdminSubscriptions() {
  usePageTitle('Subscriptions');
  const [tab, setTab] = useState<Tab>('stores');
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof apiAdminGetOverview>>['data'] | null>(null);
  const [stores, setStores] = useState<StoreBreakdownRow[]>([]);
  const [failures, setFailures] = useState<FailureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingStore, setViewingStore] = useState<string | null>(null);
  const [viewingSub, setViewingSub] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([apiAdminGetOverview(), apiAdminGetStoreBreakdown({ limit: 50 }), apiAdminGetPaymentFailures({ limit: 50 })])
      .then(([ov, sb, pf]) => {
        setOverview(ov.data);
        setStores(sb.data.stores ?? []);
        setFailures(pf.data.failures ?? []);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load subscription data.'))
      .finally(() => setLoading(false));
  }, []);

  const metrics = overview ? [
    { label: 'Monthly revenue', value: `$${overview.mrr.toFixed(2)}`, Icon: TrendingUp },
    { label: 'Active subscribers', value: String(overview.activeSubscribersCount), Icon: Users },
    { label: 'Stores offering subscriptions', value: String(overview.storesWithActivePlans), Icon: StoreIcon },
    { label: 'Failed renewals (30 days)', value: String(overview.failedPaymentsLast30Days), Icon: AlertTriangle },
    { label: 'Overdue subscriptions', value: String(overview.pastDueSubscriptionsCount), Icon: ShieldAlert },
  ] : [];

  const storeColumns: TableColumn<StoreBreakdownRow>[] = [
    { key: 'storeName', header: 'Store', render: s => <span className="font-semibold text-charcoal">{s.storeName}</span> },
    { key: 'subscriberCount', header: 'Subscribers', render: s => <span className="text-graphite">{s.subscriberCount}</span> },
    { key: 'mrrUSD', header: 'Monthly revenue', render: s => <span className="font-semibold text-success">${s.mrrUSD.toFixed(2)}</span> },
    { key: 'planCount', header: 'Subscription plans', render: s => <span className="text-graphite">{s.planCount}</span> },
    {
      key: 'actions', header: '',
      render: s => <button onClick={() => setViewingStore(s.storeId)} className="px-3 py-1 bg-white border border-bone rounded-[6px] text-xs text-graphite cursor-pointer">View</button>,
    },
  ];

  const failureColumns: TableColumn<FailureRow>[] = [
    { key: 'createdAt', header: 'Date', render: f => <span className="text-slate whitespace-nowrap">{new Date(f.createdAt).toLocaleString()}</span> },
    { key: 'store', header: 'Store', render: f => <span className="text-charcoal">{f.store?.name ?? '—'}</span> },
    { key: 'customer', header: 'Buyer', render: f => <span className="text-graphite">{f.customer?.name ?? '—'}</span> },
    { key: 'attemptType', header: 'Type', render: f => <span className="text-slate">{f.attemptType} #{f.attemptNumber}</span> },
    { key: 'amountUSD', header: 'Amount', render: f => <span className="font-semibold text-error">${f.amountUSD.toFixed(2)}</span> },
    { key: 'failureReason', header: 'Reason', render: f => <span className="text-slate max-w-[180px] truncate block">{f.failureReason ?? '—'}</span> },
    {
      key: 'actions', header: '',
      render: f => <button onClick={() => setViewingSub(f.subscriptionId)} className="px-3 py-1 bg-white border border-bone rounded-[6px] text-xs text-graphite cursor-pointer">Inspect</button>,
    },
  ];

  return (
    <div>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Commerce"
        title="Subscriptions"
        subtitle="Recurring learning subscriptions buyers take out with stores (e.g. monthly worksheet packs or memberships): revenue by store and failed renewals."
      />

      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
        {error && <p className="text-[13px] text-error">{error}</p>}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {(loading && !overview) ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white border border-bone rounded-xl px-5 py-4 h-[84px] animate-pulse" />
          )) : metrics.map(m => (
            <div key={m.label} className="bg-white border border-bone rounded-xl px-5 py-4">
              <p className="text-[11px] font-medium text-slate uppercase tracking-[0.06em] mb-1">{m.label}</p>
              <p className="text-[24px] font-bold text-carbon leading-[1.15]">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-bone rounded-xl overflow-hidden">
          <div className="px-5 py-[14px] border-b border-bone flex items-center gap-[10px] overflow-x-auto scrollbar-hide">
            {(['stores', 'failures', 'webhooks', 'insights'] as Tab[]).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t}
                className={`px-[14px] py-[6px] rounded-lg text-[13px] font-medium cursor-pointer border-none capitalize shrink-0 whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 ${tab === t ? 'bg-brand-pale-orange text-brand-orange font-semibold' : 'bg-transparent text-slate hover:text-carbon hover:bg-cream'}`}>
                {t === 'stores' ? 'By store' : t === 'failures' ? 'Failed renewals' : t === 'webhooks' ? 'Payment events (technical)' : 'Insights'}
              </button>
            ))}
          </div>

          {tab === 'webhooks' ? (
            <WebhooksPanel />
          ) : tab === 'insights' ? (
            <InsightsPanel />
          ) : tab === 'stores' ? (
            <Table
              columns={storeColumns}
              data={stores}
              keyExtractor={s => s.storeId}
              loading={loading}
              emptyState={{ title: 'No stores with active plans yet.' }}
            />
          ) : (
            <Table
              columns={failureColumns}
              data={failures}
              keyExtractor={f => f._id}
              loading={loading}
              emptyState={{ title: 'No failed renewals.' }}
            />
          )}
        </div>
      </div>

      {viewingStore && <StoreDetailModal storeId={viewingStore} onClose={() => setViewingStore(null)} />}
      {viewingSub && <SubscriptionDetailModal subId={viewingSub} onClose={() => setViewingSub(null)} />}
    </div>
  );
}
