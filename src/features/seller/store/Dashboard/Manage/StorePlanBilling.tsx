import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { statusLabel } from '@/constants/statusLabels';
import { formatPrice } from '@/utils/formatPrice';
import {
  Check, Megaphone, Sparkles, AlertTriangle, Clock, CreditCard,
  XCircle, RotateCcw, Loader2, type LucideIcon,
} from 'lucide-react';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { Button } from '@/components/comman/ui/Button';
import { Modal } from '@/components/comman/ui/Modal';
import { Textarea } from '@/components/comman/ui/Input';
import { SkeletonBox } from '@/components/comman/ui';
import {
  apiBrowsePlatformPlans, apiGetStorePlatformPlan, apiRefreshStorePlatformPlan, apiGetStoreEntitlements, apiChangePlatformPlan,
  apiPreviewPlatformPlanChange, apiCancelPlatformPlan, apiReactivatePlatformPlan, apiCreatePlatformBillingPortalSession,
  apiPurchaseAddon, apiListStoreAddons, apiCancelAddon, apiGetStoreInvoices, apiGetPublicAddonCatalog, apiFreeTrialEligibility,
  type PublicAddonCatalogItem, type PlatformPlan, type StorePlatformSubscription, type EntitlementsSummary, type AddonPurchase, type AddonType,
  type PlatformPlanInvoice, type PlanChangePreview,
} from '@/api/services/platformPlans';
import { apiGetAiStudioCredits, type AiCreditsOverview } from '@/api/services/aiStudio';
import { invalidateCache } from '@/api/services/requestCache';
import { NO_PLAN_LABEL, planName, planStatus, planVisibilityLine } from '@/hooks/store/useStorePlan';
import { planPriceFor, planYearlySavePct, planYearlyPrice } from '@/utils/planPricing';
import { PlanComparisonTable, commonToAllPlans } from './PlanComparison';
import { FeeEstimateCard } from './FeeEstimateCard';
import { useApproxPkr } from './useApproxPkr';
import { confirmSubscriptionPayment } from '@/features/auth/pages/onboard/StripeCardSetup';

const INVOICE_STATUS_STYLE: Record<string, string> = {
  paid: 'bg-[#e3f4ea] text-[#1e7a3c]',
  pending: 'bg-[#fdf2da] text-[#946200]',
  failed: 'bg-[#fdecea] text-[#c0392b]',
  refunded: 'bg-bone text-slate',
  partially_refunded: 'bg-bone text-slate',
};

// extra_ai_credits gets its "(+N)" suffix from the live AI Studio credits
// config (buyCredits.creditsPerUnit) — see addonLabel() below.
const ADDON_LABELS: Record<AddonType, string> = {
  extra_ai_credits: 'Extra AI Credits',
  extra_staff_seat: 'Extra Staff Seat',
  priority_marketplace_placement: 'Priority Marketplace Placement',
  advanced_tax_compliance: 'Advanced Tax Compliance',
  sms_notifications: 'SMS Notifications',
};

// Only add-ons with a real effect are offered for purchase — extra AI credits
// top up the AI Studio balance. Staff seats, tax compliance, SMS and priority
// placement have nothing behind them yet (labels above stay only so any
// already-purchased row still renders a name).
const PURCHASABLE_ADDONS: AddonType[] = ['extra_ai_credits'];

function daysUntil(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

// Usage meter: amber from 80%, red at 100% (+ upgrade link). max -1 = unlimited -> no bar. max 0 = nothing allowed -> no bar.
function UsageBar({ label, used, max, Icon, valueText, upgradeTo, action }: {
  label: string; used: number; max: number; Icon: LucideIcon; valueText?: string; upgradeTo?: string; action?: React.ReactNode;
}) {
  const unlimited = max === -1;
  const hasBar = !unlimited && max > 0;
  const pct = hasBar ? Math.min(100, (used / max) * 100) : 0;
  const full = hasBar && used >= max;
  const warn = hasBar && pct >= 80 && !full;
  const color = full ? '#C0392B' : warn ? '#D98E04' : '#174771';
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-1.5 text-[12.5px] text-graphite"><Icon size={13} className="text-slate" />{label}</span>
        <span className="text-[12px] font-semibold text-carbon">{valueText ?? (unlimited ? `${used} · Unlimited` : `${used} / ${max}`)}</span>
      </div>
      {hasBar && (
        <div className="h-[6px] bg-cream rounded-full overflow-hidden" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(used, max)}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      )}
      {(full || warn || action) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
          {full && <span className="text-[12px] text-error">Limit reached.</span>}
          {warn && <span className="text-[12px] text-[#946200]">Almost at your limit.</span>}
          {(full || warn) && upgradeTo && <a href={upgradeTo} className="text-[12px] font-semibold text-brand-orange hover:underline">Upgrade plan</a>}
          {action}
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
  const { store } = useStoreWorkspace();
  const approx = useApproxPkr();
  // AI Studio wallet = the SAME source the sidebar reads (apiGetAiStudioCredits).
  const [credits, setCredits] = useState<AiCreditsOverview | null>(null);
  const [creditsState, setCreditsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [addonCatalog, setAddonCatalog] = useState<PublicAddonCatalogItem | null>(null);
  const [trialInfo, setTrialInfo] = useState<{ eligible: boolean; usedAt: string | null } | null>(null);
  const creditsPerUnit = credits?.buyCredits?.creditsPerUnit ?? null;

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setCreditsState('loading');
    apiGetAiStudioCredits(storeId)
      .then(res => { if (cancelled) return; setCredits(res.data ?? null); setCreditsState(res.data ? 'ready' : 'error'); })
      .catch(() => { if (!cancelled) setCreditsState('error'); });
    return () => { cancelled = true; };
  }, [storeId]);

  // Add-on price comes from config (public catalog = the price a purchase charges); trial eligibility explains the disabled trial card.
  useEffect(() => {
    let cancelled = false;
    apiGetPublicAddonCatalog()
      .then(res => { if (!cancelled) setAddonCatalog((res.data ?? []).find(a => a.addonType === 'extra_ai_credits') ?? null); })
      .catch(() => { /* modal says "price shown at checkout" */ });
    apiFreeTrialEligibility()
      .then(res => { if (!cancelled && res.data) setTrialInfo({ eligible: res.data.eligible, usedAt: res.data.trialUsedAt ?? null }); })
      .catch(() => { /* card falls back to a generic one-time label */ });
    return () => { cancelled = true; };
  }, []);

  const addonLabel = (type: AddonType) =>
    type === 'extra_ai_credits' && creditsPerUnit
      ? `${ADDON_LABELS[type]} (+${creditsPerUnit.toLocaleString()})`
      : ADDON_LABELS[type];

  const quietRef = useRef(false);
  const load = useCallback(() => {
    if (!storeId) return;
    const quiet = quietRef.current;
    quietRef.current = false;
    if (!quiet) { setLoading(true); setError(''); }
    Promise.all([apiBrowsePlatformPlans(), apiGetStorePlatformPlan(storeId), apiGetStoreEntitlements(storeId), apiListStoreAddons(storeId), apiGetStoreInvoices(storeId)])
      .then(([plansRes, curRes, entRes, addonRes, invRes]) => {
        setPlans(plansRes.data); setCurrent(curRes.data); setEntitlements(entRes.data); setAddons(addonRes.data); setInvoices(invRes.data.invoices);
      })
      .catch(err => { if (!quiet) setError(err instanceof Error ? err.message : 'Failed to load plan & billing.'); })
      .finally(() => setLoading(false));
  }, [storeId]);
  useEffect(load, [load]);
  // Admin changed plans / granted free access, a renewal or invoice landed: quiet re-read (a failure keeps what is shown).
  useLiveRefresh(['plans', 'finance'], () => { quietRef.current = true; load(); }, !!storeId);

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
      const res = await apiChangePlatformPlan(storeId, confirmingPlan._id, interval);
      // First paid purchase / upgrade whose card needs 3-D Secure: the plan is NOT applied yet — finish
      // the payment with Stripe, then wait for the invoice-paid webhook to switch the plan (monthly + yearly alike).
      const data = res.data as { requiresAction?: boolean; clientSecret?: string | null } | undefined;
      if (data?.requiresAction && data.clientSecret) {
        const payError = await confirmSubscriptionPayment(data.clientSecret);
        if (payError) { setActionError(payError); return; }
        const targetId = confirmingPlan._id;
        for (let i = 0; i < 8; i++) {
          const cur = await apiRefreshStorePlatformPlan(storeId).catch(() => null);
          if (cur?.data?.platformPlanId === targetId) break;
          await new Promise(r => setTimeout(r, 1500));
        }
      }
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
      // The meter reads the AI Studio wallet: skip its short cache and re-read the new balance.
      invalidateCache(`ai-credits:${storeId}`);
      apiGetAiStudioCredits(storeId).then(res => { if (res.data) setCredits(res.data); }).catch(() => { /* keeps the old number */ });
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

  // Same function the sidebar uses - status/visibility are never computed separately on this page.
  const ps = planStatus(current);
  const trialDaysLeft = ps.kind === 'trial' ? ps.trialDaysLeft : null;
  const isPastDue = current?.status === 'past_due';
  const isExpired = current?.status === 'expired';
  const noActivePlan = ps.kind === 'none' || ps.ended;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const planCommon = commonToAllPlans(plans);
  // When the current plan ends: a trial's end date, otherwise the paid period's end. Free plans without a trial never end.
  const planEndsAt = isExpired ? null
    : current?.status === 'trialing' && current.trialEndsAt ? current.trialEndsAt
    : current && current.amountUSD > 0 ? current.currentPeriodEnd : null;
  const planDaysLeft = planEndsAt ? Math.max(0, daysUntil(planEndsAt)) : null;
  const daysLeftText = planDaysLeft == null ? '' : planDaysLeft === 0 ? 'ends today' : `${planDaysLeft} day${planDaysLeft === 1 ? '' : 's'} left`;
  const isCancelPending = !!current?.cancelAtPeriodEnd;

  const banner = useMemo(() => {
    if (isExpired) {
      return {
        tone: 'error' as const, Icon: AlertTriangle,
        text: 'Your free trial has ended. Choose a paid plan below to keep adding products and selling.',
      };
    }
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
      <StorePageHeader title="Billing Center" subtitle="Your store's Edudeen plan, what it includes, and your billing history." />

      <div className="px-4 lg:px-7 pt-5 pb-8 flex flex-col gap-5">
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2" role="alert">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={load}>Retry</Button>
          </div>
        )}
        {actionError && (
          <div className="flex items-center justify-between gap-3 text-[13px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-[12px] font-semibold text-error bg-transparent border-none cursor-pointer shrink-0">Dismiss</button>
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

        {!current && !loading && (
          <div className="bg-white border border-bone rounded-[10px] px-5 py-4">
            <p className="text-[13px] font-bold text-carbon">Your current plan — {NO_PLAN_LABEL}</p>
            <p className="text-[12px] text-slate mt-[3px]">No active subscription on this store. Choose a plan below to get started.</p>
            <p className="text-[12px] text-graphite mt-2">{planVisibilityLine('none')}</p>
          </div>
        )}

        {current && (
          <div className="bg-white border border-bone rounded-[10px] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-carbon">Your current plan — {planName(current)}</p>
                <p className="text-[12px] text-slate mt-[3px]">
                  {current.amountUSD > 0 ? `${formatPrice(current.amountUSD, 'USD')}/${current.billingInterval === 'yearly' ? 'yr' : 'mo'} · ` : ''}
                  {ps.kind === 'trial' ? `Free trial · ${daysLeftText || 'ends soon'} · ends ${fmtDate(ps.endsAt ?? '')}`
                    : ps.kind === 'trial_ended' ? `Trial ended${ps.endsAt ? ` on ${fmtDate(ps.endsAt)}` : ''}`
                    : ps.ended ? `Ended${ps.endsAt ? ` on ${fmtDate(ps.endsAt)}` : ''} — choose a plan to continue`
                    : planEndsAt ? `${isCancelPending ? 'Ends' : 'Renews'} ${fmtDate(planEndsAt)} · ${daysLeftText}`
                    : 'No end date'}
                </p>
                <p className={`text-[12px] mt-1.5 ${ps.ended ? 'text-error' : 'text-graphite'}`}>{planVisibilityLine(ps.kind)}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[12px] font-semibold px-2 py-[3px] rounded-full capitalize ${
                  isPastDue ? 'bg-error-bg text-error' : isCancelPending ? 'bg-[#fdf2da] text-[#946200]' : 'bg-[#e3f4ea] text-[#1e7a3c]'
                }`}>
                  {isCancelPending ? 'Canceling' : statusLabel(current.status)}
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
            <div className="border-t border-bone pt-4">
              <p className="text-[12px] font-semibold text-slate mb-3">Usage</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {entitlements?.maxActivePromotions && (
                  <UsageBar
                    label="Active promotions" Icon={Megaphone}
                    used={entitlements.maxActivePromotions.used} max={entitlements.maxActivePromotions.limit}
                    upgradeTo="#available-plans"
                  />
                )}
                {creditsState === 'loading' ? (
                  <SkeletonBox height={36} rounded="6px" />
                ) : credits ? (
                  <UsageBar
                    label="AI credits" Icon={Sparkles}
                    used={credits.monthlyAllowance > 0 ? Math.max(0, credits.monthlyAllowance - credits.balance) : 0}
                    max={credits.monthlyAllowance}
                    valueText={credits.monthlyAllowance === -1 ? 'Unlimited' : `${credits.balance.toLocaleString()} left`}
                    upgradeTo="#available-plans"
                    action={(
                      <button type="button" onClick={() => { setAddonModal(true); setActionError(''); }}
                        className="text-[12px] font-semibold text-brand-orange hover:underline bg-transparent border-none p-0 cursor-pointer">
                        Buy more credits
                      </button>
                    )}
                  />
                ) : (
                  <p className="text-[12px] text-slate">AI credits unavailable right now.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div id="available-plans" className="flex items-center justify-between scroll-mt-24">
          <p className="text-[15px] font-bold text-carbon">Available Plans</p>
          <div className="inline-flex bg-white rounded-full p-1 border border-bone">
            {(['monthly', 'yearly'] as const).map(iv => (
              <button key={iv} onClick={() => setInterval_(iv)}
                className="px-3.5 py-[6px] rounded-full text-[12px] font-semibold cursor-pointer border-none capitalize"
                style={{ background: interval === iv ? '#141413' : 'transparent', color: interval === iv ? '#fff' : '#8C8A82' }}>
                {iv}
              </button>
            ))}
          </div>
        </div>

        {planCommon.labels.length > 0 && (
          <p className="text-[12.5px] text-graphite -mt-2 flex items-start gap-1.5">
            <Check size={13} className="text-success mt-[2px] shrink-0" />
            <span><strong className="text-carbon">Included in every plan:</strong> {planCommon.labels.join(' · ')}</span>
          </p>
        )}
        {!loading && plans.length === 0 && !error && (
          <p className="text-[13px] text-slate bg-white border border-bone rounded-[10px] px-5 py-6 text-center">No plans are available right now. Please check back soon.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            // "Current" only while the plan is usable; an ended plan can be chosen again.
            const isCurrent = current?.platformPlanId === plan._id && !ps.ended;
            const price = planPriceFor(plan, interval);
            const savePct = interval === 'yearly' ? planYearlySavePct(plan) : 0;
            const currentPlan = plans.find(p => p._id === current?.platformPlanId);
            const hasPlan = !!currentPlan && !noActivePlan;
            const isUpgrade = hasPlan && (planPriceFor(plan, interval) > planPriceFor(currentPlan, interval)
              || (planPriceFor(plan, interval) === planPriceFor(currentPlan, interval) && plan.sortOrder > currentPlan.sortOrder));
            const ctaLabel = isCurrent ? 'Current plan' : !hasPlan ? `Choose ${plan.name}` : isUpgrade ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`;
            const monthlyEq = interval === 'yearly' && !plan.isFree && !plan.isCustomPricing ? planYearlyPrice(plan) / 12 : null;
            const approxText = !plan.isFree && !plan.isCustomPricing ? approx(Number(price)) : null;
            const bullets = plan.featureBullets.filter(f => !planCommon.bullets.has(f));
            return (
              <div key={plan._id} className="bg-white border rounded-[10px] px-5 py-4 flex flex-col" style={{ borderColor: isCurrent ? '#174771' : '#E8E6DC', borderWidth: isCurrent ? 2 : 1 }}>
                <div className="flex items-start justify-between mb-1">
                  <p className="text-[15px] font-bold text-carbon">{plan.name}</p>
                  {isCurrent
                    ? <span className="text-[12px] font-bold px-2 py-[2px] rounded-full bg-[#e3f4ea] text-[#1e7a3c]">Your current plan</span>
                    : plan.badge && <span className="text-[12px] font-bold px-2 py-[2px] rounded-full bg-brand-pale-orange text-brand-deep-orange">{plan.badge}</span>}
                </div>
                <p className="text-[20px] font-bold text-brand-orange mb-2">
                  {plan.isFree ? `Free${plan.trialDays > 0 ? ` · ${plan.trialDays} days` : ''}` : plan.isCustomPricing ? 'Custom' : `${formatPrice(Number(price), 'USD')}/${interval === 'yearly' ? 'yr' : 'mo'}`}
                  {!plan.isFree && !plan.isCustomPricing && savePct > 0 && <span className="ms-2 text-[12px] font-semibold text-success">Save {savePct}%</span>}
                </p>
                {(monthlyEq != null || approxText) && (
                  <p className="text-[12px] text-slate -mt-1 mb-2">
                    {monthlyEq != null && <span>= {formatPrice(Math.round(monthlyEq * 100) / 100, 'USD')}/mo</span>}
                    {monthlyEq != null && approxText && ' · '}
                    {approxText}
                  </p>
                )}
                {isCurrent && planEndsAt && <p className="text-[12px] font-semibold text-[#1e7a3c] mb-2">{daysLeftText} · {current?.status === 'trialing' ? 'ends' : 'renews'} {fmtDate(planEndsAt)}</p>}
                <ul className="flex flex-col gap-1.5 mb-4 p-0 list-none flex-1">
                  {bullets.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-[12px] text-graphite"><Check size={12} className="text-brand-orange mt-[2px] shrink-0" />{f}</li>
                  ))}
                </ul>
                {(() => {
                  // The free trial is a one-time offer — it can't be switched back to; say why when it is greyed out.
                  const trialPlan = plan.isFree && plan.trialDays > 0;
                  const trialEnd = ps.kind === 'trial_ended' ? ps.endsAt : null;
                  const trialReason = !trialPlan || isCurrent ? null
                    : trialInfo && !trialInfo.eligible
                      ? (trialEnd ? `Trial used — ended on ${fmtDate(trialEnd)}` : trialInfo.usedAt ? `Trial used — started on ${fmtDate(trialInfo.usedAt)}` : 'Trial used')
                      : 'One-time free trial';
                  return (
                    <>
                      <Button size="sm" variant={isCurrent || trialPlan ? 'outline' : 'primary'} disabled={isCurrent || trialPlan} loading={changingId === plan._id} onClick={() => { setConfirmingPlan(plan); setActionError(''); }}>
                        {trialReason ?? ctaLabel}
                      </Button>
                    </>
                  );
                })()}
              </div>
            );
          })}
        </div>

        <PlanComparisonTable plans={plans} currentPlanId={ps.ended ? null : (current?.platformPlanId ?? null)} />

        <FeeEstimateCard storeId={storeId} currency={store?.baseCurrency || 'PKR'} />

        {/* The only purchasable add-on (extra AI credits) is bought from the AI credits meter above; this list only shows ones already bought. */}
        {addons.length > 0 && (
        <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-[14px] border-b border-bone">
            <p className="text-[13px] font-bold text-carbon">Add-ons</p>
          </div>
          {(
            <div className="flex flex-col">
              {addons.map(a => (
                <div key={a._id} className="flex items-center justify-between gap-3 flex-wrap px-5 py-3 border-b border-[#f0eee6] last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-carbon">{addonLabel(a.addonType)}</p>
                    <p className="text-[12px] text-slate">Qty {a.quantity} · {formatPrice(a.amountUSD, 'USD')}/mo</p>
                  </div>
                  <button onClick={() => { setCancelingAddon(a); setActionError(''); }} className="px-2.5 py-1 bg-white border border-bone rounded-[6px] text-[12px] text-error cursor-pointer shrink-0">Cancel</button>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

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
                    <p className="text-[12px] text-slate">
                      {new Date(inv.createdAt).toLocaleDateString()} · {formatPrice(inv.amountUSD, 'USD')}
                      {inv.refundedAmountUSD > 0 && <span className="text-error"> · {formatPrice(inv.refundedAmountUSD, 'USD')} refunded</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`text-[12px] font-semibold px-2 py-[3px] rounded-full capitalize ${INVOICE_STATUS_STYLE[inv.status] ?? 'bg-bone text-slate'}`}>
                      {inv.status.replace('_', ' ')}
                    </span>
                    {(inv.hostedInvoiceUrl || inv.invoicePdfUrl) && (
                      <a href={inv.invoicePdfUrl ?? inv.hostedInvoiceUrl ?? '#'} target="_blank" rel="noreferrer"
                        className="text-[12px] font-semibold text-brand-orange hover:underline">
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
        <Modal title="Buy more AI credits" width={420} onClose={() => !addonBusy && setAddonModal(false)}
          footer={<>
            <Button variant="outline" onClick={() => setAddonModal(false)} disabled={addonBusy}>Cancel</Button>
            <Button onClick={() => handlePurchaseAddon(PURCHASABLE_ADDONS[0])} loading={addonBusy}>Confirm purchase</Button>
          </>}
        >
          <div className="bg-cream border border-bone rounded-lg p-3.5 flex flex-col gap-[6px] mb-3">
            <div className="flex justify-between gap-3 text-[12.5px]">
              <span className="text-slate">You get</span>
              <span className="text-charcoal font-medium text-end">
                {creditsPerUnit ? `${creditsPerUnit.toLocaleString()} AI credits` : addonCatalog?.unitLabel ?? 'Extra AI credits'}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-[12.5px]">
              <span className="text-slate">Price</span>
              <span className="text-charcoal font-medium text-end">
                {addonCatalog && addonCatalog.priceUSD > 0
                  ? <>{formatPrice(addonCatalog.priceUSD, 'USD')}{addonCatalog.recurring ? '/mo' : ''}{approx(addonCatalog.priceUSD) && <span className="block text-[12px] font-normal text-slate">{approx(addonCatalog.priceUSD)}</span>}</>
                  : 'Price shown at checkout'}
              </span>
            </div>
          </div>
          <p className="text-[12px] text-slate">The credits are added to your AI Studio balance. Please confirm to continue.</p>
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
                <span className="text-charcoal font-medium">{formatPrice(preview.newAmountUSD, 'USD')}/{preview.newBillingInterval === 'yearly' ? 'yr' : 'mo'}</span>
              </div>
              {preview.unusedCreditFromCurrentPlanUSD > 0 && (
                <div className="flex justify-between text-[12.5px]">
                  <span className="text-slate">Unused credit ({preview.remainingDaysInCurrentPeriod} day{preview.remainingDaysInCurrentPeriod === 1 ? '' : 's'} left)</span>
                  <span className="text-success">−{formatPrice(preview.unusedCreditFromCurrentPlanUSD, 'USD')}</span>
                </div>
              )}
              {preview.existingCreditBalanceUSD > 0 && (
                <div className="flex justify-between text-[12.5px]">
                  <span className="text-slate">Existing account credit</span>
                  <span className="text-success">−{formatPrice(preview.existingCreditBalanceUSD, 'USD')}</span>
                </div>
              )}
              <div className="flex justify-between text-[13.5px] font-bold pt-[6px] mt-[2px] border-t border-bone">
                <span className="text-carbon">{preview.creditAppliedToBalanceUSD > 0 ? 'Credited to your account' : 'Due today'}</span>
                <span className={preview.creditAppliedToBalanceUSD > 0 ? 'text-success' : 'text-brand-orange'}>
                  {formatPrice(preview.creditAppliedToBalanceUSD > 0 ? preview.creditAppliedToBalanceUSD : preview.amountDueTodayUSD, 'USD')}
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
          <label className="block text-[12px] font-medium text-slate mb-1.5">Reason (optional — helps us improve)</label>
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
            Cancel <strong>{addonLabel(cancelingAddon.addonType)}</strong>? This takes effect immediately.
          </p>
          {actionError && <p className="text-[12px] text-error mt-2">{actionError}</p>}
        </Modal>
      )}
    </>
  );
}
