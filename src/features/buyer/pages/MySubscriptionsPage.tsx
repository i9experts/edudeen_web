import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, ImageOff } from 'lucide-react';
import {
  Card, EmptyState, SkeletonBox, Table, type TableColumn,
  ActionMenu, type ActionMenuItem, Badge, PageHeader, Toggle,
} from '@/components/comman/ui';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { getStorefrontUrl } from '@/utils/storefrontUrl';
import {
  apiGetMySubscriptions, apiGetMySubscriptionById, apiPauseMySubscription, apiResumeMySubscription,
  apiCancelMySubscription, apiChangeMyPlan, apiBrowseStorePlans,
  apiGetSubscriptionTimeline, apiCreateBillingPortalSession, apiGetBenefitsSummary,
  apiGetCreditWallets, apiSpendCredit, apiGetNotificationPreferences, apiUpdateNotificationPreferences,
  type Subscription, type BuyerPlan, type SubscriptionInvoice, type BillingInterval,
  type SubscriptionTimelineEvent, type BenefitsSummary, type CreditWallet, type NotificationPreferences,
} from '@/api/services/subscriptions';
import { useToast } from '@/contexts/ToastContext';

const NOTIF_LABELS: Record<keyof NotificationPreferences, string> = {
  renewalReminders: 'Renewal reminders', paymentFailedAlerts: 'Payment failed alerts',
  prorationReceipts: 'Plan change receipts', cancellationConfirmations: 'Cancellation confirmations',
  planChangeUpdates: 'Plan change updates', marketingTips: 'Tips & marketing emails',
};

type EnrichedSub = Subscription & {
  store: { _id: string; name: string; logo: string | null; slug: string } | null;
  plan: { _id: string; name: string; features: string[] } | null;
};

const STATUS_COLOR: Record<string, 'green' | 'orange' | 'gray' | 'red'> = {
  active: 'green', paused: 'orange', canceled: 'gray', past_due: 'red',
};

// ── Manage modal: details, invoices, pause/resume/cancel, change plan ────────
function ManageSubscriptionModal({ sub, onClose, onChanged }: {
  sub: EnrichedSub; onClose: () => void; onChanged: () => void;
}) {
  const toast = useToast();
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [changingPlan, setChangingPlan] = useState(false);
  const [plans, setPlans] = useState<BuyerPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('monthly');
  const [benefits, setBenefits] = useState<BenefitsSummary | null>(null);
  const [timeline, setTimeline] = useState<SubscriptionTimelineEvent[] | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  useEffect(() => {
    apiGetMySubscriptionById(sub._id)
      .then(res => setInvoices(res.data.invoices ?? []))
      .catch(() => {})
      .finally(() => setLoadingInvoices(false));
    if (sub.store) apiGetBenefitsSummary(sub.store._id).then(res => setBenefits(res.data)).catch(() => {});
  }, [sub._id, sub.store]);

  function toggleTimeline() {
    if (timeline) { setTimeline(null); return; }
    setLoadingTimeline(true);
    apiGetSubscriptionTimeline(sub._id).then(res => setTimeline(res.data)).finally(() => setLoadingTimeline(false));
  }

  async function openChangePlan() {
    setChangingPlan(true);
    if (sub.store) {
      const res = await apiBrowseStorePlans(sub.store._id).catch(() => null);
      if (res) setPlans((res.data ?? []).filter(p => p._id !== sub.planId));
    }
  }

  async function submitChangePlan() {
    if (!selectedPlanId) return;
    setBusy(true);
    setError('');
    try {
      await apiChangeMyPlan(sub._id, selectedPlanId, selectedInterval);
      toast.success('Plan changed');
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change plan.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function handle(action: 'pause' | 'resume') {
    setBusy(true);
    setError('');
    try {
      if (action === 'pause') await apiPauseMySubscription(sub._id);
      else await apiResumeMySubscription(sub._id);
      toast.success(action === 'pause' ? 'Subscription paused' : 'Subscription resumed');
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel(atPeriodEnd: boolean) {
    setBusy(true);
    setError('');
    try {
      await apiCancelMySubscription(sub._id, atPeriodEnd);
      setConfirmingCancel(false);
      toast.success('Subscription cancelled');
      onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={sub.plan?.name ?? 'Manage Subscription'} width={520} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="bg-cream rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-charcoal">{sub.store?.name ?? 'Store'}</p>
            <p className="text-[11px] text-slate">{sub.billingInterval} — ${sub.amountUSD.toFixed(2)}</p>
          </div>
          <Badge color={STATUS_COLOR[sub.status] ?? 'gray'}>{sub.status}{sub.pendingCancellation ? ' (ending)' : ''}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div><p className="text-slate mb-0.5">Next billing</p><p className="font-semibold text-charcoal">{new Date(sub.nextBillingDate).toLocaleDateString()}</p></div>
          <div><p className="text-slate mb-0.5">Total paid</p><p className="font-semibold text-charcoal">${sub.totalPaidUSD.toFixed(2)}</p></div>
          {sub.creditBalanceUSD > 0 && (
            <div className="col-span-2"><p className="text-slate mb-0.5">Account credit</p><p className="font-semibold text-[#1e7a3c]">${sub.creditBalanceUSD.toFixed(2)}</p></div>
          )}
        </div>

        {benefits?.subscribed && (
          <div className="border border-bone rounded-lg p-3 flex flex-col gap-1.5">
            <p className="text-[12px] font-semibold text-charcoal mb-0.5">Your Benefits</p>
            {benefits.discount && <p className="text-[12px] text-graphite">• {benefits.discount.discountPercent}% off {benefits.discount.scope === 'store' ? 'storewide' : 'selected items'}</p>}
            {benefits.shipping?.free && <p className="text-[12px] text-graphite">• Free shipping</p>}
            {benefits.loyaltyMultiplier && benefits.loyaltyMultiplier > 1 && <p className="text-[12px] text-graphite">• {benefits.loyaltyMultiplier}x loyalty points</p>}
            {benefits.earlyAccessHours ? <p className="text-[12px] text-graphite">• {benefits.earlyAccessHours}h early access to new arrivals</p> : null}
            {benefits.hasPrioritySupport && <p className="text-[12px] text-graphite">• Priority support</p>}
            {benefits.hasPriorityBooking && <p className="text-[12px] text-graphite">• Priority booking</p>}
          </div>
        )}

        {!changingPlan ? (
          <div className="flex flex-wrap gap-2">
            {sub.status === 'active' && <Button size="sm" variant="outline" onClick={() => handle('pause')} disabled={busy}>Pause</Button>}
            {sub.status === 'paused' && <Button size="sm" variant="outline" onClick={() => handle('resume')} disabled={busy}>Resume</Button>}
            {sub.status === 'active' && <Button size="sm" variant="outline" onClick={openChangePlan} disabled={busy}>Change Plan</Button>}
            <Button size="sm" variant="outline" onClick={toggleTimeline} loading={loadingTimeline}>{timeline ? 'Hide Timeline' : 'View Timeline'}</Button>
            {(sub.status === 'active' || sub.status === 'paused' || sub.status === 'past_due') && (
              <Button size="sm" variant="danger" onClick={() => setConfirmingCancel(true)} disabled={busy}>Cancel Subscription</Button>
            )}
          </div>
        ) : null}

        {timeline && (
          <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
            {timeline.length === 0 ? (
              <p className="text-[12px] text-slate">No history recorded.</p>
            ) : timeline.map(ev => (
              <div key={ev._id} className="text-[12px] px-2 py-1.5 rounded bg-cream">
                <span className="text-charcoal">{ev.description}</span>
                <span className="text-slate ml-1.5">· {new Date(ev.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {changingPlan && (
          <div className="border border-bone rounded-lg p-3 flex flex-col gap-3">
            <p className="text-[12px] font-semibold text-charcoal">Choose a new plan</p>
            {plans.length === 0 ? (
              <p className="text-[12px] text-slate">No other plans available for this store.</p>
            ) : (
              <>
                <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none bg-white cursor-pointer">
                  <option value="">Select a plan…</option>
                  {plans.map(p => <option key={p._id} value={p._id}>{p.name} — ${p.monthlyPriceUSD}/mo</option>)}
                </select>
                <div className="flex gap-2">
                  {(['monthly', 'yearly'] as const).map(iv => (
                    <button key={iv} type="button" onClick={() => setSelectedInterval(iv)}
                      className="flex-1 py-2 rounded-lg text-[12px] font-semibold capitalize cursor-pointer transition-all"
                      style={{ border: `1.5px solid ${selectedInterval === iv ? '#174771' : '#E8E6DC'}`, background: selectedInterval === iv ? '#EAF2F8' : '#fff', color: selectedInterval === iv ? '#174771' : '#8C8A82' }}>
                      {iv}
                    </button>
                  ))}
                </div>
                <Button size="sm" onClick={submitChangePlan} loading={busy} disabled={!selectedPlanId}>Confirm Change</Button>
              </>
            )}
            <button onClick={() => setChangingPlan(false)} className="text-[11px] text-slate bg-transparent border-none cursor-pointer text-left">Back</button>
          </div>
        )}

        {error && <p className="text-[12px] text-error">{error}</p>}

        <div>
          <p className="text-[12px] font-semibold text-charcoal mb-2">Invoices</p>
          {loadingInvoices ? (
            <div className="flex flex-col gap-1.5">
              {[1, 2, 3].map(i => (
                <SkeletonBox key={i} height={28} rounded="6px" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-[12px] text-slate">No invoices yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
              {invoices.map(inv => (
                <div key={inv._id} className="flex items-center justify-between text-[12px] px-2 py-1.5 rounded bg-cream">
                  <span className="text-slate">{new Date(inv.createdAt).toLocaleDateString()} · {inv.type}</span>
                  <span className={`font-semibold ${inv.status === 'paid' ? 'text-[#1e7a3c]' : inv.status === 'failed' ? 'text-error' : 'text-slate'}`}>
                    {inv.amountUSD < 0 ? '−' : ''}${Math.abs(inv.amountUSD).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmingCancel && (
        <Modal
          title="Cancel Subscription"
          onClose={() => setConfirmingCancel(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmingCancel(false)} disabled={busy}>Keep Subscription</Button>
              <Button variant="outline" onClick={() => confirmCancel(true)} loading={busy}>Cancel at Period End</Button>
              <Button variant="danger" onClick={() => confirmCancel(false)} disabled={busy}>Cancel Immediately</Button>
            </>
          }
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            You can keep your benefits until <strong>{new Date(sub.nextBillingDate).toLocaleDateString()}</strong> by
            cancelling at period end, or end access right away with an immediate cancellation.
          </p>
          {error && <p className="text-[12px] text-error mt-3">{error}</p>}
        </Modal>
      )}
    </Modal>
  );
}

function CreditsPanel() {
  const toast = useToast();
  const [wallets, setWallets] = useState<CreditWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [spending, setSpending] = useState<CreditWallet | null>(null);
  const [spendAmount, setSpendAmount] = useState(1);
  const [spendBusy, setSpendBusy] = useState(false);
  const [spendError, setSpendError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiGetCreditWallets().then(res => setWallets(res.data ?? [])).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  function openSpend(w: CreditWallet) {
    setSpending(w);
    setSpendAmount(1);
    setSpendError('');
  }

  async function confirmSpend() {
    if (!spending || spendAmount <= 0) return;
    setSpendBusy(true);
    setSpendError('');
    try {
      await apiSpendCredit(spending.storeId, spending.creditType, spendAmount, 'Redeemed from My Subscriptions');
      setSpending(null);
      toast.success('Credit redeemed');
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to spend credit.';
      setSpendError(message);
      toast.error(message);
    } finally {
      setSpendBusy(false);
    }
  }

  if (loading) return null;
  if (wallets.length === 0) return null;

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-bone">
        <p className="text-[14px] font-bold text-charcoal">My Credits</p>
      </div>
      <div className="flex flex-col p-5 gap-2.5">
        {wallets.map(w => (
          <div key={w._id} className="flex items-center justify-between text-[13px] bg-cream rounded-lg px-3.5 py-2.5">
            <div>
              <p className="font-semibold text-charcoal">{w.store?.name ?? 'Store'} — {w.creditType} credits</p>
              <p className="text-[11px] text-slate">{w.balance} available of {w.totalGranted} granted</p>
            </div>
            <Button size="xs" variant="outline" disabled={w.balance <= 0} onClick={() => openSpend(w)}>
              Use Credit
            </Button>
          </div>
        ))}
      </div>

      {spending && (
        <Modal
          title="Use Credit"
          onClose={() => setSpending(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setSpending(null)} disabled={spendBusy}>Cancel</Button>
              <Button variant="primary" onClick={confirmSpend} loading={spendBusy} disabled={spendAmount <= 0 || spendAmount > spending.balance}>
                Spend {spendAmount} Credit{spendAmount !== 1 ? 's' : ''}
              </Button>
            </>
          }
        >
          <p className="text-[13px] text-slate mb-3">
            {spending.store?.name ?? 'Store'} — {spending.balance} {spending.creditType} credit{spending.balance !== 1 ? 's' : ''} available
          </p>
          <label className="block text-[12px] font-medium text-charcoal mb-[6px]">
            How many credits would you like to spend?
          </label>
          <input
            type="number" min={1} max={spending.balance}
            value={spendAmount}
            onChange={e => setSpendAmount(Math.max(1, Math.min(spending.balance, Number(e.target.value) || 1)))}
            className="w-full px-3 py-[10px] rounded-lg border border-bone text-[13px] text-charcoal outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
          />
          {spendError && <p className="text-[12px] text-error mt-2">{spendError}</p>}
        </Modal>
      )}
    </Card>
  );
}

function NotificationPreferencesPanel() {
  const toast = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { apiGetNotificationPreferences().then(res => setPrefs(res.data)); }, []);

  async function toggle(key: keyof NotificationPreferences) {
    if (!prefs) return;
    const prev = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    try {
      await apiUpdateNotificationPreferences({ [key]: next[key] });
    } catch (err) {
      setPrefs(prev);
      toast.error(err instanceof Error ? err.message : 'Failed to update preference.');
    } finally {
      setSaving(false);
    }
  }

  if (!prefs) return null;

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-bone">
        <p className="text-[14px] font-bold text-charcoal">Subscription Notifications</p>
      </div>
      <div className="flex flex-col p-5 gap-2">
        {(Object.keys(NOTIF_LABELS) as Array<keyof NotificationPreferences>).map(key => (
          <div key={key} className="flex items-center justify-between text-[13px] text-graphite py-1">
            {NOTIF_LABELS[key]}
            <Toggle checked={prefs[key]} disabled={saving} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SubscriptionsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [subs, setSubs] = useState<EnrichedSub[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(() => { const p = Number(searchParams.get('page')); return p > 0 ? p : 1; });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [managing, setManaging] = useState<EnrichedSub | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [billingError, setBillingError] = useState('');

  async function handleManageBilling() {
    setOpeningPortal(true);
    setBillingError('');
    try {
      const res = await apiCreateBillingPortalSession(window.location.href);
      window.location.href = res.data.url;
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Billing portal is unavailable right now.');
    } finally {
      setOpeningPortal(false);
    }
  }

  const load = useCallback(() => {
    setLoading(true);
    apiGetMySubscriptions({ page, limit: 10 })
      .then(res => { setSubs(res.data.subscriptions ?? []); setTotal(res.data.pagination?.total ?? 0); })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load your subscriptions.'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(load, [load]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (page > 1) next.set('page', String(page));
    else next.delete('page');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const columns: TableColumn<EnrichedSub>[] = [
    {
      key: 'store', header: 'Store', width: '220px',
      render: s => (
        <button onClick={() => s.store && (window.location.href = getStorefrontUrl(s.store.slug))} className="flex items-center gap-[10px] bg-transparent border-0 cursor-pointer text-left p-0">
          <div className="w-9 h-9 rounded-lg bg-cream border border-bone overflow-hidden shrink-0 flex items-center justify-center">
            {s.store?.logo ? <img loading="lazy" decoding="async" src={s.store.logo} alt="" className="w-full h-full object-cover" /> : <ImageOff size={13} className="text-slate" />}
          </div>
          <span className="text-[13px] font-semibold text-charcoal truncate max-w-[140px]">{s.store?.name ?? 'Store'}</span>
        </button>
      ),
    },
    { key: 'plan', header: 'Plan', render: s => <span className="text-[13px] text-graphite">{s.plan?.name ?? '—'} — {s.billingInterval}</span> },
    { key: 'amount', header: 'Amount', render: s => <span className="text-[13px] font-semibold text-charcoal">${s.amountUSD.toFixed(2)}</span> },
    {
      key: 'status', header: 'Status',
      render: s => <Badge color={STATUS_COLOR[s.status] ?? 'gray'} dot>{s.status}{s.pendingCancellation ? ' (ending)' : ''}</Badge>,
    },
    { key: 'nextBilling', header: 'Next Billing', render: s => <span className="text-[12px] text-slate">{new Date(s.nextBillingDate).toLocaleDateString()}</span> },
    {
      key: 'actions', header: '', align: 'right', width: '60px',
      render: s => {
        const items: ActionMenuItem[] = [{ label: 'Manage', onClick: () => setManaging(s) }];
        return <ActionMenu items={items} />;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
    <Card padding="none">
      <div className="px-5 pt-5 pb-4 border-b border-bone">
        <PageHeader
          eyebrow="Account"
          title="Subscriptions"
          description={`${total} subscription${total !== 1 ? 's' : ''} · Manage plans, invoices, and billing`}
          actions={
            <div className="flex flex-col items-end gap-1">
              <Button size="sm" variant="outline" loading={openingPortal} onClick={handleManageBilling}>Manage Billing</Button>
              {billingError && <p className="text-[11px] text-error max-w-[220px] text-right">{billingError}</p>}
            </div>
          }
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 p-5">{[1, 2, 3].map(i => <SkeletonBox key={i} height={56} rounded="8px" />)}</div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-[13px] text-error text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>Try again</Button>
        </div>
      ) : subs.length === 0 ? (
        <EmptyState
          icon={<RefreshCw size={28} className="text-brand-orange opacity-55" />}
          title="No subscriptions yet"
          description="Subscribe to a store's plan from its storefront to see it here."
        />
      ) : (
        <Table columns={columns} data={subs} keyExtractor={s => s._id} pagination={{ page, total, perPage: 10, onChange: setPage, label: 'subscriptions' }} />
      )}

      {managing && (
        <ManageSubscriptionModal
          sub={managing}
          onClose={() => setManaging(null)}
          onChanged={() => { setManaging(null); load(); }}
        />
      )}
    </Card>
    <CreditsPanel />
    <NotificationPreferencesPanel />
    </div>
  );
}
