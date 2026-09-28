import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Check, Zap, Users, Package, Sparkles, MonitorSmartphone, AlertTriangle, Clock, CreditCard,
  XCircle, RotateCcw, Loader2, type LucideIcon,
} from 'lucide-react';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Textarea } from '@/components/comman/ui/Input';
import { SkeletonBox } from '@/components/comman/ui';
import {
  apiBrowsePlatformPlans, apiGetStorePlatformPlan, apiGetStoreEntitlements, apiChangePlatformPlan,
  apiPreviewPlatformPlanChange, apiCancelPlatformPlan, apiReactivatePlatformPlan, apiCreatePlatformBillingPortalSession,
  apiPurchaseAddon, apiListStoreAddons, apiCancelAddon, apiGetStoreInvoices,
  type PlatformPlan, type StorePlatformSubscription, type EntitlementsSummary, type AddonPurchase, type AddonType,
  type PlatformPlanInvoice, type PlanChangePreview,
} from '@/api/services/platformPlans';

const INVOICE_STATUS_STYLE: Record<string, string> = {
  paid: 'bg-[#e3f4ea] text-[#1e7a3c]',
  pending: 'bg-[#fdf2da] text-[#946200]',
  failed: 'bg-[#fdecea] text-[#c0392b]',
  refunded: 'bg-bone text-slate',
  partially_refunded: 'bg-bone text-slate',
};

const ADDON_LABELS: Record<AddonType, string> = {
  extra_ai_credits: 'Extra AI Credits (+500)',
  extra_staff_seat: 'Extra Staff Seat',
  priority_marketplace_placement: 'Priority Marketplace Placement',
  advanced_tax_compliance: 'Advanced Tax Compliance',
  sms_notifications: 'SMS Notifications',
};

function daysUntil(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

function UsageBar({ label, used, max, Icon }: { label: string; used: number; max: number; Icon: LucideIcon }) {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : Math.min(100, (used / Math.max(1, max)) * 100);
  const near = !unlimited && pct >= 85;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-[12.5px] text-graphite"><Icon size={13} className="text-slate" />{label}</span>
        <span className="text-[12px] font-semibold text-carbon">{used}{unlimited ? '' : ` / ${max}`}</span>
      </div>
      {!unlimited && (
        <div className="h-[6px] bg-cream rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: near ? '#C0392B' : '#174771' }} />
        </div>
      )}
    </div>
  );
}

export default function StorePlanBilling() {
  const { storeId } = useStoreWorkspace();
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [current, setCurrent] = useState<StorePlatformSubscription | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsSummary | null>(null);
  const [addons, setAddons] = useState<AddonPurchase[]>([]);
  const [invoices, setInvoices] = useState<PlatformPlanInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [changingId, setChangingId] = useState<string | null>(null);
  const [interval, setInterval_] = useState<'monthly' | 'yearly'>('monthly');
  const [addonModal, setAddonModal] = useState(false);
  const [confirmingPlan, setConfirmingPlan] = useState<PlatformPlan | null>(null);
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cancelingAddon, setCancelingAddon] = useState<AddonPurchase | null>(null);
  const [actionError, setActionError] = useState('');
  const [addonBusy, setAddonBusy] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [reactivateBusy, setReactivateBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);

  const load = useCallback(() => {
    if (!storeId) return;
    setLoading(true); setError('');
    Promise.all([apiBrowsePlatformPlans(), apiGetStorePlatformPlan(storeId), apiGetStoreEntitlements(storeId), apiListStoreAddons(storeId), apiGetStoreInvoices(storeId)])
      .then(([plansRes, curRes, entRes, addonRes, invRes]) => {
        setPlans(plansRes.data); setCurrent(curRes.data); setEntitlements(entRes.data); setAddons(addonRes.data); setInvoices(invRes.data.invoices);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load plan & billing.'))
      .finally(() => setLoading(false));
  }, [storeId]);
  useEffect(load, [load]);

  // ── Confirm-plan-change modal — fetch the exact proration preview the moment it opens ──
  useEffect(() => {
    if (!confirmingPlan) { setPreview(null); return; }
    let cancelled = false;
    setPreviewLoading(true);
    apiPreviewPlatformPlanChange(storeId, confirmingPlan._id, interval)
      .then(res => { if (!cancelled) setPreview(res.data); })
      .catch(err => { if (!cancelled) setActionError(err instanceof Error ? err.message : 'Failed to calculate proration.'); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [confirmingPlan, interval, storeId]);

  async function submitChangePlan() {
    if (!confirmingPlan) return;
    setChangingId(confirmingPlan._id);
    setActionError('');
    try {
      await apiChangePlatformPlan(storeId, confirmingPlan._id, interval);
      setConfirmingPlan(null);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to change plan.');
    } finally {
      setChangingId(null);
    }
  }

  async function submitCancelSubscription() {
    setCancelBusy(true);
    setActionError('');
    try {
      await apiCancelPlatformPlan(storeId, cancelReason.trim() || undefined);
      setCancelModal(false);
      setCancelReason('');
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel subscription.');
    } finally {
      setCancelBusy(false);
    }
  }

  async function submitReactivate() {
    setReactivateBusy(true);
    setActionError('');
    try {
      await apiReactivatePlatformPlan(storeId);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reactivate subscription.');
    } finally {
      setReactivateBusy(false);
    }
  }

  async function openBillingPortal() {
    setPortalBusy(true);
    setActionError('');
    try {
      const res = await apiCreatePlatformBillingPortalSession(storeId, window.location.href);
      window.location.href = res.data.url;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No billing portal is available yet — subscribe to a paid plan first.');
      setPortalBusy(false);
    }
  }

  async function handlePurchaseAddon(type: AddonType) {
    setAddonBusy(true);
    setActionError('');
    try {
      await apiPurchaseAddon(storeId, type, 1);
      setAddonModal(false);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to purchase add-on.');
    } finally {
      setAddonBusy(false);
    }
  }

  async function submitCancelAddon() {
    if (!cancelingAddon) return;
    setAddonBusy(true);
    setActionError('');
    try {
      await apiCancelAddon(storeId, cancelingAddon._id);
      setCancelingAddon(null);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel add-on.');
    } finally {
      setAddonBusy(false);
    }
  }

  const trialDaysLeft = current?.trialEndsAt ? daysUntil(current.trialEndsAt) : null;
  const isPastDue = current?.status === 'past_due';
  const isCancelPending = !!current?.cancelAtPeriodEnd;

  const banner = useMemo(() => {
    if (isPastDue) {
      return {
        tone: 'error' as const, Icon: AlertTriangle,
        text: `We couldn't process your last payment (attempt ${current?.failedPaymentAttempts ?? 1}). Update your payment method to avoid losing your plan.`,
        actionLabel: 'Update payment method', onAction: openBillingPortal,
      };
    }
    if (isCancelPending && current) {
      return {
        tone: 'warning' as const, Icon: XCircle,
        text: `Your plan will move to the free tier on ${new Date(current.currentPeriodEnd).toDateString()}. You keep full access until then.`,
        actionLabel: 'Reactivate', onAction: submitReactivate,
      };
    }
    if (trialDaysLeft != null && trialDaysLeft <= 7) {
      return {
        tone: 'info' as const, Icon: Clock,
        text: `Your trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}. Add a payment method to keep your plan active after that.`,
        actionLabel: 'Add payment method', onAction: openBillingPortal,
      };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPastDue, isCancelPending, trialDaysLeft, current]);

  const BANNER_STYLE = {
    error:   { bg: 'bg-error-bg', border: 'border-error-border', text: 'text-error', icon: 'text-error' },
    warning: { bg: 'bg-[#fdf2da]', border: 'border-[#f5dfa6]', text: 'text-[#946200]', icon: 'text-[#946200]' },
    info:    { bg: 'bg-info-bg', border: 'border-[#bfdcf3]', text: 'text-[#1a5a8a]', icon: 'text-[#1a5a8a]' },
  };

  if (loading && !current) {
    return (
      <div className="px-4 lg:px-7 pt-5 pb-8 flex flex-col gap-5">
        <div className="bg-white border border-bone rounded-[10px] px-5 py-4 flex flex-col gap-4">
          <SkeletonBox width={180} height={16} rounded="4px" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SkeletonBox height={34} rounded="6px" />
            <SkeletonBox height={34} rounded="6px" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBox key={i} height={220} rounded="10px" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <StorePageHeader title="Billing Center" subtitle="Your store's Edudeen subscription, usage limits, payment method, and billing history." />

      <div className="px-4 lg:px-7 pt-5 pb-8 flex flex-col gap-5">
        {error && <p className="text-[13px] text-error">{error}</p>}
        {actionError && (
          <div className="flex items-center justify-between gap-3 text-[13px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-[11px] font-semibold text-error bg-transparent border-none cursor-pointer shrink-0">Dismiss</button>
          </div>
        )}

        {banner && (() => {
          const s = BANNER_STYLE[banner.tone];
          return (
            <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border ${s.bg} ${s.border}`}>
              <span className={`flex items-center gap-2 text-[12.5px] font-medium ${s.text}`}>
                <banner.Icon size={15} className={`shrink-0 ${s.icon}`} />
                {banner.text}
              </span>
              <Button size="sm" variant="outline" loading={reactivateBusy || portalBusy} onClick={banner.onAction}>
                {banner.actionLabel}
              </Button>
            </div>
          );
        })()}

        {entitlements && current && (
          <div className="bg-white border border-bone rounded-[10px] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[13px] font-bold text-carbon">Current Plan — {entitlements.currentPlanName}</p>
                <p className="text-[11.5px] text-slate mt-[3px]">
                  {current.amountUSD > 0 ? `$${current.amountUSD.toFixed(2)}/${current.billingInterval === 'yearly' ? 'yr' : 'mo'} · ` : ''}
                  Renews {new Date(current.nextBillingDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-semibold px-2 py-[3px] rounded-full capitalize ${
                  isPastDue ? 'bg-error-bg text-error' : isCancelPending ? 'bg-[#fdf2da] text-[#946200]' : 'bg-[#e3f4ea] text-[#1e7a3c]'
                }`}>
                  {isCancelPending ? 'Canceling' : current.status}
                </span>
                {current.stripeCustomerId && (
                  <Button size="sm" variant="outline" icon={<CreditCard size={13} />} loading={portalBusy} onClick={openBillingPortal}>
                    Payment method
                  </Button>
                )}
                {current.amountUSD > 0 && (
                  isCancelPending ? (
                    <Button size="sm" variant="outline" icon={<RotateCcw size={13} />} loading={reactivateBusy} onClick={submitReactivate}>
                      Reactivate
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" icon={<XCircle size={13} />} onClick={() => { setCancelModal(true); setActionError(''); }}>
                      Cancel plan
                    </Button>
                  )
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UsageBar label="Products" used={entitlements.maxProducts.used} max={entitlements.maxProducts.limit} Icon={Package} />
              <UsageBar label="Staff Accounts" used={entitlements.maxStaffAccounts.used} max={entitlements.maxStaffAccounts.limit} Icon={Users} />
              <UsageBar
                label="AI Credits (balance)"
                used={entitlements.aiCredits.monthlyAllowance === -1 ? entitlements.aiCredits.balance : Math.max(0, entitlements.aiCredits.monthlyAllowance - entitlements.aiCredits.balance)}
                max={entitlements.aiCredits.monthlyAllowance}
                Icon={Sparkles}
              />
              <UsageBar label="POS Locations" used={entitlements.maxPosLocations.used} max={entitlements.maxPosLocations.limit} Icon={MonitorSmartphone} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold text-carbon">Available Plans</p>
          <div className="inline-flex bg-white rounded-full p-1 border border-bone">
            {(['monthly', 'yearly'] as const).map(iv => (
              <button key={iv} onClick={() => setInterval_(iv)}
                className="px-3.5 py-[6px] rounded-full text-[11.5px] font-semibold cursor-pointer border-none capitalize"
                style={{ background: interval === iv ? '#141413' : 'transparent', color: interval === iv ? '#fff' : '#8C8A82' }}>
                {iv}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            const isCurrent = current?.platformPlanId === plan._id;
            const price = interval === 'yearly' && plan.yearlyPriceUSD != null ? plan.yearlyPriceUSD : plan.monthlyPriceUSD;
            return (
              <div key={plan._id} className="bg-white border rounded-[10px] px-5 py-4 flex flex-col" style={{ borderColor: isCurrent ? '#174771' : '#E8E6DC', borderWidth: isCurrent ? 2 : 1 }}>
                <div className="flex items-start justify-between mb-1">
                  <p className="text-[15px] font-bold text-carbon">{plan.name}</p>
                  {plan.badge && <span className="text-[10px] font-bold px-2 py-[2px] rounded-full bg-brand-pale-orange text-brand-deep-orange">{plan.badge}</span>}
                </div>
                <p className="text-[20px] font-bold text-brand-orange mb-2">
                  {plan.isFree ? 'Free' : plan.isCustomPricing ? 'Custom' : `$${price}/${interval === 'yearly' ? 'yr' : 'mo'}`}
                </p>
                <ul className="flex flex-col gap-1.5 mb-4 p-0 list-none flex-1">
                  {plan.featureBullets.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-[12px] text-graphite"><Check size={12} className="text-brand-orange mt-[2px] shrink-0" />{f}</li>
                  ))}
                </ul>
                <Button size="sm" variant={isCurrent ? 'outline' : 'primary'} disabled={isCurrent} loading={changingId === plan._id} onClick={() => { setConfirmingPlan(plan); setActionError(''); }}>
                  {isCurrent ? 'Current Plan' : 'Switch to this plan'}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-[14px] border-b border-bone">
            <p className="text-[13px] font-bold text-carbon">Add-ons</p>
            <Button size="sm" icon={<Zap size={13} />} onClick={() => setAddonModal(true)}>Add Add-on</Button>
          </div>
          {addons.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-slate">No active add-ons.</p>
          ) : (
            <div className="flex flex-col">
              {addons.map(a => (
                <div key={a._id} className="flex items-center justify-between gap-3 flex-wrap px-5 py-3 border-b border-[#f0eee6] last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-carbon">{ADDON_LABELS[a.addonType]}</p>
                    <p className="text-[11px] text-slate">Qty {a.quantity} · ${a.amountUSD.toFixed(2)}/mo</p>
                  </div>
                  <button onClick={() => { setCancelingAddon(a); setActionError(''); }} className="px-2.5 py-1 bg-white border border-bone rounded-[6px] text-[11px] text-error cursor-pointer shrink-0">Cancel</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
          <div className="px-5 py-[14px] border-b border-bone">
            <p className="text-[13px] font-bold text-carbon">Billing History</p>
          </div>
          {invoices.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-slate">No invoices yet.</p>
          ) : (
            <div className="flex flex-col">
              {invoices.map(inv => (
                <div key={inv._id} className="flex items-center justify-between gap-3 flex-wrap px-5 py-3 border-b border-[#f0eee6] last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-carbon">{inv.invoiceNumber}</p>
                    <p className="text-[11px] text-slate">
                      {new Date(inv.createdAt).toLocaleDateString()} · ${inv.amountUSD.toFixed(2)}
                      {inv.refundedAmountUSD > 0 && <span className="text-error"> · ${inv.refundedAmountUSD.toFixed(2)} refunded</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`text-[11px] font-semibold px-2 py-[3px] rounded-full capitalize ${INVOICE_STATUS_STYLE[inv.status] ?? 'bg-bone text-slate'}`}>
                      {inv.status.replace('_', ' ')}
                    </span>
                    {(inv.hostedInvoiceUrl || inv.invoicePdfUrl) && (
                      <a href={inv.invoicePdfUrl ?? inv.hostedInvoiceUrl ?? '#'} target="_blank" rel="noreferrer"
                        className="text-[11px] font-semibold text-brand-orange hover:underline">
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {addonModal && (
        <Modal title="Add an Add-on" width={420} onClose={() => setAddonModal(false)}>
          <div className="flex flex-col gap-2">
            {(Object.keys(ADDON_LABELS) as AddonType[]).map(type => (
              <button key={type} disabled={addonBusy} onClick={() => handlePurchaseAddon(type)}
                className="text-left px-3.5 py-3 rounded-lg bg-cream border border-bone cursor-pointer hover:border-brand-orange/40 disabled:opacity-50 disabled:cursor-wait">
                <span className="text-[13px] font-medium text-charcoal">{ADDON_LABELS[type]}</span>
              </button>
            ))}
          </div>
          {actionError && <p className="text-[12px] text-error mt-3">{actionError}</p>}
        </Modal>
      )}

      {confirmingPlan && (
        <Modal title="Confirm Plan Change" width={440} onClose={() => setConfirmingPlan(null)}
          footer={<>
            <Button variant="outline" onClick={() => setConfirmingPlan(null)} disabled={changingId === confirmingPlan._id}>Cancel</Button>
            <Button onClick={submitChangePlan} loading={changingId === confirmingPlan._id} disabled={previewLoading || !preview}>Confirm & Switch</Button>
          </>}
        >
          <p className="text-[13px] text-charcoal mb-3">
            Switch to <strong>{confirmingPlan.name}</strong> ({interval})?
          </p>

          {previewLoading ? (
            <div className="flex items-center gap-2 text-[12.5px] text-slate py-3">
              <Loader2 size={14} className="animate-spin" /> Calculating exact proration…
            </div>
          ) : preview ? (
            <div className="bg-cream border border-bone rounded-lg p-3.5 flex flex-col gap-[6px]">
              <div className="flex justify-between text-[12.5px]">
                <span className="text-slate">New plan price</span>
                <span className="text-charcoal font-medium">${preview.newAmountUSD.toFixed(2)}/{preview.newBillingInterval === 'yearly' ? 'yr' : 'mo'}</span>
              </div>
              {preview.unusedCreditFromCurrentPlanUSD > 0 && (
                <div className="flex justify-between text-[12.5px]">
                  <span className="text-slate">Unused credit ({preview.remainingDaysInCurrentPeriod} day{preview.remainingDaysInCurrentPeriod === 1 ? '' : 's'} left)</span>
                  <span className="text-success">−${preview.unusedCreditFromCurrentPlanUSD.toFixed(2)}</span>
                </div>
              )}
              {preview.existingCreditBalanceUSD > 0 && (
                <div className="flex justify-between text-[12.5px]">
                  <span className="text-slate">Existing account credit</span>
                  <span className="text-success">−${preview.existingCreditBalanceUSD.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[13.5px] font-bold pt-[6px] mt-[2px] border-t border-bone">
                <span className="text-carbon">{preview.creditAppliedToBalanceUSD > 0 ? 'Credited to your account' : 'Due today'}</span>
                <span className={preview.creditAppliedToBalanceUSD > 0 ? 'text-success' : 'text-brand-orange'}>
                  ${(preview.creditAppliedToBalanceUSD > 0 ? preview.creditAppliedToBalanceUSD : preview.amountDueTodayUSD).toFixed(2)}
                </span>
              </div>
            </div>
          ) : null}

          {actionError && <p className="text-[12px] text-error mt-2">{actionError}</p>}
        </Modal>
      )}

      {cancelModal && (
        <Modal title="Cancel Subscription" width={440} onClose={() => setCancelModal(false)}
          footer={<>
            <Button variant="outline" onClick={() => setCancelModal(false)} disabled={cancelBusy}>Keep my plan</Button>
            <Button variant="danger" onClick={submitCancelSubscription} loading={cancelBusy}>Cancel at period end</Button>
          </>}
        >
          <p className="text-[13px] text-charcoal mb-3">
            You'll keep full access to <strong>{entitlements?.currentPlanName}</strong> until{' '}
            {current && new Date(current.currentPeriodEnd).toDateString()}, then your store moves to the free plan. You can reactivate any time before that.
          </p>
          <label className="block text-[11.5px] font-medium text-slate mb-1.5">Reason (optional — helps us improve)</label>
          <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} placeholder="Too expensive, missing a feature, switching platforms…" />
          {actionError && <p className="text-[12px] text-error mt-2">{actionError}</p>}
        </Modal>
      )}

      {cancelingAddon && (
        <Modal title="Cancel Add-on" width={420} onClose={() => setCancelingAddon(null)}
          footer={<>
            <Button variant="outline" onClick={() => setCancelingAddon(null)} disabled={addonBusy}>Back</Button>
            <Button variant="danger" onClick={submitCancelAddon} loading={addonBusy}>Cancel Add-on</Button>
          </>}
        >
          <p className="text-[13px] text-charcoal">
            Cancel <strong>{ADDON_LABELS[cancelingAddon.addonType]}</strong>? This takes effect immediately.
          </p>
          {actionError && <p className="text-[12px] text-error mt-2">{actionError}</p>}
        </Modal>
      )}
    </>
  );
}
