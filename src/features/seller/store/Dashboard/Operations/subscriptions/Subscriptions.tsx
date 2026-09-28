import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Loader2, Plus, Pencil, Archive, Download, Users, TrendingUp, RefreshCw,
  Trash2, AlertTriangle, CheckCircle2, Tag, Truck, Clock, Star, Gift, Headset, CalendarClock,
  type LucideIcon,
} from 'lucide-react';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { Input, Textarea, Select } from '@/components/comman/ui/Input';
import { SkeletonBox, Table, type TableColumn } from '@/components/comman/ui';
import { useStoreSubcategories } from '@/hooks/store/useStoreSubcategories';
import {
  apiListPlans, apiCreatePlan, apiUpdatePlan, apiArchivePlan, apiEstimatePlanHealth,
  apiGetSubscriptionDashboard, apiExportSubscribersCsv,
  apiListStoreSubscribers, apiPauseSubscriber, apiResumeSubscriber, apiCancelSubscriber,
  apiGetStoreSubscriberById, apiRefundSubscriberInvoice, apiGetAdvancedAnalytics,
  type SellerPlan, type SellerSubscriber, type DashboardData, type SubscriptionStatus,
  type PlanBenefit, type BenefitType, type PlanHealthEstimate, type SubscriptionInvoice,
  type AdvancedSellerAnalytics,
} from '@/api/services/subscriptions';

// ── Benefit type menu ─────────────────────────────────────────────────────────
const BENEFIT_MENU: { type: BenefitType; label: string; Icon: LucideIcon; desc: string }[] = [
  { type: 'discount',           label: 'Discount',            Icon: Tag,          desc: 'Member pricing storewide, by category, or per product' },
  { type: 'shipping',           label: 'Shipping',             Icon: Truck,        desc: 'Free or discounted shipping for members' },
  { type: 'early_access',       label: 'Early Access',         Icon: Clock,        desc: 'Members see new arrivals first' },
  { type: 'loyalty_multiplier', label: 'Loyalty Multiplier',   Icon: Star,         desc: 'Extra loyalty points while subscribed' },
  { type: 'credits',            label: 'Credits',              Icon: Gift,         desc: 'Monthly download or service credits' },
  { type: 'priority_support',   label: 'Priority Support',     Icon: Headset,      desc: 'Member messages answered first' },
  { type: 'priority_booking',   label: 'Priority Booking',     Icon: CalendarClock, desc: 'Guaranteed booking slots for members' },
];

function defaultBenefit(type: BenefitType): PlanBenefit {
  switch (type) {
    case 'discount':     return { type, enabled: true, scope: 'store', discountPercent: 10 };
    case 'shipping':     return { type, enabled: true, shippingType: 'free' };
    case 'early_access': return { type, enabled: true, earlyAccessHours: 24 };
    case 'loyalty_multiplier': return { type, enabled: true, multiplier: 2 };
    case 'credits':      return { type, enabled: true, creditsPerCycle: 3, creditType: 'download' };
    case 'priority_support': return { type, enabled: true };
    case 'priority_booking': return { type, enabled: true };
  }
}

function benefitSummary(b: PlanBenefit): string {
  switch (b.type) {
    case 'discount': {
      const scope = b.scope === 'store' ? 'storewide' : b.scope === 'category' ? 'on selected categories' : 'on selected products';
      return `${b.discountPercent ?? 0}% off ${scope}${b.maxDiscountAmountUSD ? `, capped at $${b.maxDiscountAmountUSD}` : ''}${b.minOrderValueUSD ? `, on orders over $${b.minOrderValueUSD}` : ''}`;
    }
    case 'shipping':
      return b.shippingType === 'free' ? 'Free shipping' + (b.minOrderValueForShippingUSD ? ` on orders over $${b.minOrderValueForShippingUSD}` : '') : `${b.shippingDiscountPercent ?? 0}% off shipping`;
    case 'early_access': return `${b.earlyAccessHours ?? 24}h early access to new arrivals`;
    case 'loyalty_multiplier': return `${b.multiplier ?? 2}x loyalty points`;
    case 'credits': return `${b.creditsPerCycle ?? 0} ${b.creditType ?? 'download'} credits per cycle`;
    case 'priority_support': return 'Priority customer support';
    case 'priority_booking': return 'Priority booking slots';
    default: return b.label ?? '';
  }
}

const HEALTH_STYLE: Record<string, { bg: string; color: string; Icon: LucideIcon }> = {
  healthy: { bg: '#E3F4EA', color: '#1E7A3C', Icon: CheckCircle2 },
  warning: { bg: '#FFF4DC', color: '#B36200', Icon: AlertTriangle },
  risky:   { bg: '#FDECEA', color: '#C0392B', Icon: AlertTriangle },
};

// ── Benefit row editor ────────────────────────────────────────────────────────
function BenefitEditor({ benefit, onChange, onRemove, categories }: {
  benefit: PlanBenefit; onChange: (b: PlanBenefit) => void; onRemove: () => void;
  categories: { _id: string; name: string }[];
}) {
  const set = <K extends keyof PlanBenefit>(k: K, v: PlanBenefit[K]) => onChange({ ...benefit, [k]: v });
  // Falls back instead of crashing if this plan has an older benefit `type`
  // that's since been removed/renamed in BENEFIT_MENU (e.g. a plan created
  // before a benefit type was deprecated) — production data can outlive the
  // current menu list even though every benefit is only ever authored via it.
  const menuEntry = BENEFIT_MENU.find(m => m.type === benefit.type)
    ?? { type: benefit.type, label: benefit.label || benefit.type, Icon: AlertTriangle, desc: '' };

  return (
    <div className="border border-bone rounded-lg p-3 flex flex-col gap-2.5 bg-cream">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <menuEntry.Icon size={14} className="text-brand-orange" />
          <span className="text-[12.5px] font-semibold text-charcoal">{menuEntry.label}</span>
        </div>
        <button onClick={onRemove} className="text-slate hover:text-error bg-transparent border-none cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 rounded-sm"><Trash2 size={13} /></button>
      </div>

      {benefit.type === 'discount' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select label="Applies to" value={benefit.scope ?? 'store'} onChange={e => set('scope', e.target.value as PlanBenefit['scope'])}>
              <option value="store">Entire store</option>
              <option value="category">Selected categories</option>
              <option value="product">Selected products</option>
            </Select>
            <Input label="Discount %" type="number" min={1} max={50} value={benefit.discountPercent ?? ''} onChange={e => set('discountPercent', Number(e.target.value))} />
          </div>
          {benefit.scope === 'category' && (
            <div>
              <label className="text-[11px] font-medium text-graphite block mb-1">Categories</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map(c => {
                  const active = (benefit.categoryIds ?? []).includes(c._id);
                  return (
                    <button key={c._id} type="button"
                      onClick={() => set('categoryIds', active ? (benefit.categoryIds ?? []).filter(id => id !== c._id) : [...(benefit.categoryIds ?? []), c._id])}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer"
                      style={{ background: active ? '#174771' : '#fff', color: active ? '#fff' : '#5A5852', borderColor: active ? '#174771' : '#E8E6DC' }}>
                      {c.name}
                    </button>
                  );
                })}
                {categories.length === 0 && <p className="text-[11px] text-slate">No subcategories yet — add some under Categories first.</p>}
              </div>
            </div>
          )}
          {benefit.scope === 'product' && (
            <Input label="Product IDs (comma-separated)" placeholder="prod_123, prod_456"
              value={(benefit.productIds ?? []).join(', ')}
              onChange={e => set('productIds', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input label="Max $ off (optional)" type="number" min={0} value={benefit.maxDiscountAmountUSD ?? ''} onChange={e => set('maxDiscountAmountUSD', e.target.value ? Number(e.target.value) : undefined)} />
            <Input label="Min order $ (optional)" type="number" min={0} value={benefit.minOrderValueUSD ?? ''} onChange={e => set('minOrderValueUSD', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        </>
      )}

      {benefit.type === 'shipping' && (
        <>
          <Select label="Type" value={benefit.shippingType ?? 'free'} onChange={e => set('shippingType', e.target.value as PlanBenefit['shippingType'])}>
            <option value="free">Free shipping</option>
            <option value="discounted">Discounted shipping</option>
          </Select>
          {benefit.shippingType === 'discounted' && (
            <Input label="Discount %" type="number" min={1} max={100} value={benefit.shippingDiscountPercent ?? ''} onChange={e => set('shippingDiscountPercent', Number(e.target.value))} />
          )}
          <Input label="Minimum order value (optional)" type="number" min={0} value={benefit.minOrderValueForShippingUSD ?? ''} onChange={e => set('minOrderValueForShippingUSD', e.target.value ? Number(e.target.value) : undefined)} />
        </>
      )}

      {benefit.type === 'early_access' && (
        <Input label="Hours of early access" type="number" min={1} max={720} value={benefit.earlyAccessHours ?? ''} onChange={e => set('earlyAccessHours', Number(e.target.value))} />
      )}

      {benefit.type === 'loyalty_multiplier' && (
        <Input label="Points multiplier (e.g. 2 = 2x)" type="number" min={1} max={5} step="0.5" value={benefit.multiplier ?? ''} onChange={e => set('multiplier', Number(e.target.value))} />
      )}

      {benefit.type === 'credits' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input label="Credits per cycle" type="number" min={0} value={benefit.creditsPerCycle ?? ''} onChange={e => set('creditsPerCycle', Number(e.target.value))} />
          <Select label="Credit type" value={benefit.creditType ?? 'download'} onChange={e => set('creditType', e.target.value as PlanBenefit['creditType'])}>
            <option value="download">Download</option>
            <option value="service">Service</option>
          </Select>
        </div>
      )}
    </div>
  );
}

// ── Plan form modal ──────────────────────────────────────────────────────────
function PlanFormModal({ storeId, plan, onClose, onSaved }: {
  storeId: string; plan: SellerPlan | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!plan;
  const { store } = useStoreWorkspace();
  const { subcategories } = useStoreSubcategories(store?.categoryId);
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [monthlyPrice, setMonthlyPrice] = useState(plan ? String(plan.monthlyPriceUSD) : '');
  const [yearlyPrice, setYearlyPrice] = useState(plan?.yearlyPriceUSD != null ? String(plan.yearlyPriceUSD) : '');
  const [benefits, setBenefits] = useState<PlanBenefit[]>(plan?.benefits ?? []);
  const [addingType, setAddingType] = useState<BenefitType | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState<PlanHealthEstimate | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const price = Number(monthlyPrice);
    if (!price || price <= 0) { setHealth(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setHealthLoading(true);
      apiEstimatePlanHealth(storeId, benefits, price)
        .then(res => setHealth(res.data))
        .catch(() => setHealth(null))
        .finally(() => setHealthLoading(false));
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [storeId, monthlyPrice, JSON.stringify(benefits)]);

  function addBenefit() {
    if (!addingType) return;
    setBenefits(prev => [...prev, defaultBenefit(addingType)]);
    setAddingType('');
  }

  async function submit() {
    if (!name.trim() || !monthlyPrice) { setError('Name and monthly price are required.'); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        monthlyPriceUSD: Number(monthlyPrice),
        yearlyPriceUSD: yearlyPrice ? Number(yearlyPrice) : undefined,
        benefits,
      };
      if (isEdit) await apiUpdatePlan(storeId, plan._id, payload);
      else await apiCreatePlan(storeId, payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan.');
    } finally {
      setSaving(false);
    }
  }

  const healthStyle = health ? HEALTH_STYLE[health.health] : null;

  return (
    <Modal
      title={isEdit ? 'Edit Plan' : 'Create Plan'}
      width={620}
      onClose={onClose}
      mobileSheet
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving}>{isEdit ? 'Save Changes' : 'Create Plan'}</Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <Input label="Plan Name" placeholder="e.g. Store Membership" value={name} onChange={e => setName(e.target.value)} />
        <Textarea label="Description (optional)" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Monthly Price (USD)" type="number" min={0} step="0.01" value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} />
          <Input label="Yearly Price (USD, optional)" type="number" min={0} step="0.01" value={yearlyPrice} onChange={e => setYearlyPrice(e.target.value)} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] font-semibold text-charcoal">Benefits</label>
          </div>
          <div className="flex flex-col gap-2.5 mb-2">
            {benefits.map((b, i) => (
              <BenefitEditor key={i} benefit={b} categories={subcategories}
                onChange={updated => setBenefits(prev => prev.map((x, idx) => idx === i ? updated : x))}
                onRemove={() => setBenefits(prev => prev.filter((_, idx) => idx !== i))} />
            ))}
          </div>
          <div className="flex gap-2">
            <Select value={addingType} onChange={e => setAddingType(e.target.value as BenefitType)} className="flex-1">
              <option value="">+ Add a benefit…</option>
              {BENEFIT_MENU.filter(m => !benefits.some(b => b.type === m.type)).map(m => (
                <option key={m.type} value={m.type}>{m.label} — {m.desc}</option>
              ))}
            </Select>
            <Button variant="outline" onClick={addBenefit} disabled={!addingType}>Add</Button>
          </div>
        </div>

        {(healthLoading || health) && (
          <div className="rounded-lg px-3.5 py-3 flex items-start gap-2.5" style={{ background: healthStyle?.bg ?? '#F0EEE6' }}>
            {healthLoading ? <Loader2 size={15} className="animate-spin mt-[1px] shrink-0" style={{ color: healthStyle?.color ?? '#5A5852' }} /> : healthStyle && <healthStyle.Icon size={15} className="mt-[1px] shrink-0" style={{ color: healthStyle.color }} />}
            <p className="text-[12px] leading-[1.5]" style={{ color: healthStyle?.color ?? '#5A5852' }}>
              {healthLoading ? 'Estimating plan profitability…' : health?.message}
            </p>
          </div>
        )}

        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

type SubscriberDetail = NonNullable<Awaited<ReturnType<typeof apiGetStoreSubscriberById>>['data']>;

function SubscriberDetailModal({ storeId, subId, onClose }: { storeId: string; subId: string; onClose: () => void }) {
  const [data, setData] = useState<SubscriberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [confirmingRefund, setConfirmingRefund] = useState<SubscriptionInvoice | null>(null);
  const [refundError, setRefundError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiGetStoreSubscriberById(storeId, subId).then(res => setData(res.data)).finally(() => setLoading(false));
  }, [storeId, subId]);
  useEffect(load, [load]);

  async function confirmRefund() {
    if (!confirmingRefund) return;
    setRefundingId(confirmingRefund._id);
    setRefundError('');
    try {
      await apiRefundSubscriberInvoice(storeId, subId, confirmingRefund._id);
      setConfirmingRefund(null);
      load();
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : 'Refund failed.');
    } finally {
      setRefundingId(null);
    }
  }

  return (
    <Modal title="Subscriber Detail" width={560} onClose={onClose} mobileSheet>
      {loading || !data ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonBox key={i} height={30} rounded="6px" />)}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
            <div><p className="text-slate">Customer</p><p className="font-semibold text-charcoal">{data.customer?.name} ({data.customer?.email})</p></div>
            <div><p className="text-slate">Plan</p><p className="font-semibold text-charcoal">{data.plan?.name ?? '—'}</p></div>
            <div><p className="text-slate">Status</p><p className="font-semibold text-charcoal capitalize">{data.status}</p></div>
            <div><p className="text-slate">Started</p><p className="font-semibold text-charcoal">{new Date(data.startedAt).toLocaleDateString()}</p></div>
            <div><p className="text-slate">Total Paid</p><p className="font-semibold text-charcoal">${data.totalPaidUSD.toFixed(2)}</p></div>
            <div><p className="text-slate">Next Billing</p><p className="font-semibold text-charcoal">{new Date(data.nextBillingDate).toLocaleDateString()}</p></div>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-charcoal mb-2">Invoices</p>
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
              {(data.invoices ?? []).map((inv: SubscriptionInvoice) => (
                <div key={inv._id} className="flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded bg-cream">
                  <span className="text-slate">{inv.invoiceNumber} · {inv.status} · ${inv.amountUSD.toFixed(2)}</span>
                  {['paid', 'partially_refunded'].includes(inv.status) && (
                    <button disabled={refundingId === inv._id} onClick={() => { setConfirmingRefund(inv); setRefundError(''); }}
                      className="px-2 py-[3px] bg-white border border-bone rounded-[5px] text-[11px] text-error cursor-pointer disabled:opacity-50">
                      {refundingId === inv._id ? 'Refunding…' : 'Refund'}
                    </button>
                  )}
                </div>
              ))}
              {(data.invoices ?? []).length === 0 && <p className="text-[12px] text-slate">No invoices yet.</p>}
            </div>
          </div>
        </div>
      )}

      {confirmingRefund && (
        <Modal
          title="Refund Invoice"
          onClose={() => setConfirmingRefund(null)}
          mobileSheet
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmingRefund(null)} disabled={refundingId === confirmingRefund._id}>Cancel</Button>
              <Button variant="danger" onClick={confirmRefund} loading={refundingId === confirmingRefund._id}>Refund</Button>
            </>
          }
        >
          <p className="text-[13px] text-charcoal">
            Refund invoice <strong>{confirmingRefund.invoiceNumber}</strong> (${confirmingRefund.amountUSD.toFixed(2)})?
            This cannot be undone.
          </p>
          {refundError && <p className="text-[12px] text-error mt-2">{refundError}</p>}
        </Modal>
      )}
    </Modal>
  );
}

// ── Config ────────────────────────────────────────────────────────────────────
const SUB_TABS: { id: SubscriptionStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'active', label: 'Active' },
  { id: 'past_due', label: 'Past Due' }, { id: 'paused', label: 'Paused' }, { id: 'canceled', label: 'Canceled' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active: { bg: '#E3F4EA', color: '#1E7A3C' },
  paused: { bg: '#FFF4DC', color: '#B36200' },
  canceled: { bg: '#F0EEE6', color: '#5A5852' },
  past_due: { bg: '#FDECEA', color: '#C0392B' },
};

export function StoreSubscriptions() {
  const { store, storeId } = useStoreWorkspace();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [plans, setPlans] = useState<SellerPlan[]>([]);
  const [subs, setSubs] = useState<SellerSubscriber[]>([]);
  const [subsTotal, setSubsTotal] = useState(0);
  const [statusTab, setStatusTab] = useState<SubscriptionStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPlan, setEditingPlan] = useState<SellerPlan | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [cancelReasonFor, setCancelReasonFor] = useState<SellerSubscriber | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [cancelError, setCancelError] = useState('');
  const [viewingSubId, setViewingSubId] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState<AdvancedSellerAnalytics | null>(null);

  const load = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    setError('');
    Promise.all([
      apiGetSubscriptionDashboard(storeId),
      apiListPlans(storeId),
      apiListStoreSubscribers(storeId, { page, limit: 10, status: statusTab === 'all' ? undefined : statusTab }),
    ])
      .then(([dashRes, plansRes, subsRes]) => {
        setDashboard(dashRes.data);
        setPlans(plansRes.data ?? []);
        setSubs(subsRes.data.subscriptions ?? []);
        setSubsTotal(subsRes.data.pagination.total);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load subscriptions.'))
      .finally(() => setLoading(false));
  }, [storeId, page, statusTab]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!storeId) return;
    apiGetAdvancedAnalytics(storeId).then(res => setAdvanced(res.data)).catch(() => {});
  }, [storeId]);

  const [archivingPlan, setArchivingPlan] = useState<SellerPlan | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [archiveNeedsForce, setArchiveNeedsForce] = useState(false);

  async function submitArchive(force = false) {
    if (!archivingPlan) return;
    setArchiveBusy(true);
    setArchiveError('');
    try {
      await apiArchivePlan(storeId, archivingPlan._id, force);
      setArchivingPlan(null);
      setArchiveNeedsForce(false);
      load();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Failed to archive plan.');
      setArchiveNeedsForce(true);
    } finally {
      setArchiveBusy(false);
    }
  }

  async function handleAction(sub: SellerSubscriber, action: 'pause' | 'resume') {
    setBusyId(sub._id);
    setActionError('');
    try {
      if (action === 'pause') await apiPauseSubscriber(storeId, sub._id);
      else await apiResumeSubscriber(storeId, sub._id);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function submitCancel() {
    if (!cancelReasonFor) return;
    setBusyId(cancelReasonFor._id);
    setCancelError('');
    try {
      await apiCancelSubscriber(storeId, cancelReasonFor._id, cancelAtPeriodEnd, cancelReasonText);
      setCancelReasonFor(null);
      setCancelReasonText('');
      load();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel subscription.');
    } finally {
      setBusyId(null);
    }
  }

  const metrics = dashboard ? [
    { label: 'Active Subscribers', value: String(dashboard.activeSubscribersCount), Icon: Users },
    { label: 'MRR', value: `$${dashboard.mrr.toFixed(2)}`, Icon: TrendingUp },
    { label: 'ARR', value: `$${dashboard.arr.toFixed(2)}`, Icon: TrendingUp },
    { label: 'Churn Rate', value: `${dashboard.churnRate}%`, Icon: RefreshCw },
  ] : [];

  const subscriberColumns: TableColumn<SellerSubscriber>[] = [
    {
      key: 'customer', header: 'Customer',
      render: sub => (
        <div className="flex items-center gap-[10px]">
          <div className="w-[30px] h-[30px] rounded-full bg-[#f0eee6] text-[10px] font-bold flex items-center justify-center shrink-0 text-[#5a5852]">
            {sub.customer.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[13px] font-medium text-carbon whitespace-nowrap">{sub.customer.name}</p>
            <p className="text-[11px] text-slate">{sub.customer.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'planName', header: 'Plan', render: sub => <span className="text-graphite whitespace-nowrap">{sub.planName} — {sub.billingInterval}</span> },
    { key: 'amountUSD', header: 'Amount', render: sub => <span className="font-semibold text-carbon whitespace-nowrap">${sub.amountUSD.toFixed(2)}</span> },
    {
      key: 'status', header: 'Status',
      render: sub => {
        const style = STATUS_STYLE[sub.status] ?? { bg: '#F0EEE6', color: '#5A5852' };
        return (
          <span className="px-[10px] py-[3px] rounded-[5px] text-[11px] font-semibold" style={{ background: style.bg, color: style.color }}>
            {sub.status}{sub.pendingCancellation ? ' (ending)' : ''}
          </span>
        );
      },
    },
    { key: 'startedAt', header: 'Started', render: sub => <span className="text-slate whitespace-nowrap">{new Date(sub.startedAt).toLocaleDateString()}</span> },
    { key: 'nextBillingDate', header: 'Next Billing', render: sub => <span className="text-slate whitespace-nowrap">{new Date(sub.nextBillingDate).toLocaleDateString()}</span> },
    { key: 'totalPaidUSD', header: 'Total Paid', render: sub => <span className="font-semibold text-carbon">${sub.totalPaidUSD.toFixed(2)}</span> },
    {
      key: 'actions', header: '',
      render: sub => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => setViewingSubId(sub._id)} className="px-2.5 py-1 bg-white border border-bone rounded-[6px] text-[11px] text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">View</button>
          {sub.status === 'active' && (
            <button disabled={busyId === sub._id} onClick={() => handleAction(sub, 'pause')} className="px-2.5 py-1 bg-white border border-bone rounded-[6px] text-[11px] text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">Pause</button>
          )}
          {sub.status === 'paused' && (
            <button disabled={busyId === sub._id} onClick={() => handleAction(sub, 'resume')} className="px-2.5 py-1 bg-white border border-bone rounded-[6px] text-[11px] text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">Resume</button>
          )}
          {(sub.status === 'active' || sub.status === 'paused' || sub.status === 'past_due') && (
            <button disabled={busyId === sub._id} onClick={() => setCancelReasonFor(sub)} className="px-2.5 py-1 bg-white border border-bone rounded-[6px] text-[11px] text-error cursor-pointer transition-colors duration-150 hover:bg-error hover:text-white hover:border-error disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">Cancel</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <StorePageHeader
        title="Subscriptions"
        subtitle="Manage recurring billing plans, subscribers, and subscription revenue."
        actions={
          <>
            <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={() => apiExportSubscribersCsv(storeId, store?.name ?? 'store')}>
              <span className="hidden sm:inline">Export Subscribers</span>
            </Button>
            <Button size="sm" icon={<Plus size={13} />} onClick={() => setEditingPlan('new')}><span className="hidden sm:inline">Create Plan</span></Button>
          </>
        }
      />

      <div className="px-4 lg:px-7 pb-8 pt-5 flex flex-col gap-5">
        {error && <p className="text-[13px] text-error">{error}</p>}
        {actionError && (
          <div className="flex items-center justify-between gap-3 text-[13px] text-error bg-error-bg border border-error-border rounded-lg px-3 py-2">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-[11px] font-semibold text-error bg-transparent border-none cursor-pointer shrink-0">Dismiss</button>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(loading && !dashboard) ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-bone rounded-[10px] px-5 py-4 h-[84px] animate-pulse" />
          )) : metrics.map(m => (
            <div key={m.label} className="bg-white border border-bone rounded-[10px] px-5 py-4">
              <p className="text-[11px] font-medium text-slate uppercase tracking-[0.06em] mb-1">{m.label}</p>
              <p className="text-[28px] font-bold text-carbon leading-[1.15]">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Subscriber economics — proves the feature's value with real data */}
        {dashboard?.subscriberEconomics && (
          <div className="bg-white border border-bone rounded-[10px] px-5 py-4">
            <p className="text-[13px] font-bold text-carbon mb-3">Subscribers vs. Regular Customers</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Subscriber Revenue</p>
                <p className="text-[18px] font-bold text-success">${dashboard.subscriberEconomics.subscriberRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Regular Revenue</p>
                <p className="text-[18px] font-bold text-carbon">${dashboard.subscriberEconomics.regularRevenue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Orders/Subscriber</p>
                <p className="text-[18px] font-bold text-carbon">{dashboard.subscriberEconomics.avgOrdersPerSubscriber}</p>
                <p className="text-[10px] text-slate">vs {dashboard.subscriberEconomics.avgOrdersPerRegularCustomer} regular</p>
              </div>
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Member Savings Given</p>
                <p className="text-[18px] font-bold text-brand-orange">${dashboard.subscriberEconomics.totalCustomerSavingsUSD.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            const hs = plan.healthEstimate ? HEALTH_STYLE[plan.healthEstimate.health] : null;
            return (
              <div key={plan._id} className="bg-white border border-bone rounded-[10px] px-[22px] py-5 flex flex-col transition-transform duration-200 hover:-translate-y-[1px]">
                <div className="flex items-start justify-between mb-1 gap-2">
                  <p className="text-[15px] font-bold text-carbon">{plan.name}</p>
                  {plan.status === 'suspended' && <span className="text-[10px] font-bold px-[8px] py-[2px] rounded-full bg-[#fdecea] text-[#c0392b] shrink-0">Suspended by admin</span>}
                  {plan.status === 'archived' && <span className="text-[10px] font-bold px-[8px] py-[2px] rounded-full bg-[#f0eee6] text-[#5a5852] shrink-0">Archived</span>}
                </div>
                <div className="flex items-baseline gap-2 mb-[10px]">
                  <span className="text-[18px] font-bold text-brand-orange">${plan.monthlyPriceUSD.toFixed(2)}/mo</span>
                  {plan.yearlyPriceUSD != null && <span className="text-xs text-slate">or ${plan.yearlyPriceUSD.toFixed(2)}/yr</span>}
                </div>
                {plan.description && <p className="text-xs text-slate mb-3 leading-[1.6]">{plan.description}</p>}
                <ul className="flex flex-col gap-1.5 mb-3 p-0 list-none">
                  {(plan.benefits ?? []).length > 0
                    ? (plan.benefits ?? []).map((b, i) => <li key={i} className="text-[12px] text-graphite">• {benefitSummary(b)}</li>)
                    : (plan.features ?? []).slice(0, 4).map(f => <li key={f} className="text-[12px] text-graphite">• {f}</li>)}
                </ul>
                {hs && (
                  <div className="flex items-center gap-1.5 px-2.5 py-[6px] rounded-md mb-3" style={{ background: hs.bg }}>
                    <hs.Icon size={12} style={{ color: hs.color }} />
                    <span className="text-[11px] font-medium capitalize" style={{ color: hs.color }}>{plan.healthEstimate!.health}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3 border-t border-[#f0eee6] mb-[14px] mt-auto">
                  <span className="text-xs text-slate">{plan.subscriberCount} subscribers</span>
                  <span className="text-xs font-bold text-success">${plan.monthlyRecurringRevenueUSD.toFixed(2)}/mo</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingPlan(plan)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-white border border-bone rounded-lg text-xs font-medium text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">
                    <Pencil size={12} /> Edit
                  </button>
                  {plan.status !== 'archived' && (
                    <button onClick={() => { setArchivingPlan(plan); setArchiveError(''); setArchiveNeedsForce(false); }} className="flex-1 flex items-center justify-center gap-1 py-2 bg-white border border-bone rounded-lg text-xs font-medium text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">
                      <Archive size={12} /> Archive
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {!loading && plans.length === 0 && (
            <div className="col-span-full text-center py-10 text-[13px] text-slate">No plans yet — create your first subscription plan.</div>
          )}
        </div>

        {/* Subscribers */}
        <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-[14px] border-b border-bone flex-wrap gap-2">
            <p className="text-[15px] font-bold text-carbon">Subscribers</p>
            <div className="flex items-center gap-0.5 bg-[#f5f4ef] rounded-lg p-[3px] max-w-full overflow-x-auto scrollbar-none">
              {SUB_TABS.map(t => (
                <button key={t.id} onClick={() => { setStatusTab(t.id); setPage(1); }}
                  className="px-[14px] py-[5px] rounded-[6px] text-xs font-medium cursor-pointer border-none shrink-0 whitespace-nowrap transition-all duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
                  style={{ background: statusTab === t.id ? '#141413' : 'transparent', color: statusTab === t.id ? '#fff' : '#8C8A82' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <Table
            columns={subscriberColumns}
            data={subs}
            keyExtractor={sub => sub._id}
            loading={loading}
            emptyState={{ title: 'No subscribers in this view.' }}
            pagination={{ page, total: subsTotal, perPage: 10, onChange: setPage, label: 'subscribers' }}
          />
        </div>

        {/* Cancellation reasons — churn insight */}
        {dashboard && (dashboard.cancellationReasons ?? []).length > 0 && (
          <div className="bg-white border border-bone rounded-[10px] px-5 py-4">
            <p className="text-[13px] font-bold text-carbon mb-3">Why subscribers cancel</p>
            <div className="flex flex-col gap-2">
              {dashboard.cancellationReasons.map(r => (
                <div key={r.reason} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-graphite">{r.reason}</span>
                  <span className="font-semibold text-carbon">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Analytics */}
        {advanced && (
          <div className="bg-white border border-bone rounded-[10px] px-5 py-4">
            <p className="text-[13px] font-bold text-carbon mb-3">Advanced Analytics</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Conversion Rate</p>
                <p className="text-[18px] font-bold text-carbon">{advanced.conversionRatePercent}%</p>
              </div>
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">30d Retention</p>
                <p className="text-[18px] font-bold text-carbon">{advanced.retention30dPercent}%</p>
              </div>
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Realized LTV</p>
                <p className="text-[18px] font-bold text-success">${advanced.realizedLtvUSD.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate uppercase tracking-wide mb-1">Upgrades / Downgrades</p>
                <p className="text-[18px] font-bold text-carbon">{advanced.upgradeCount} / {advanced.downgradeCount}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {(advanced.recommendations ?? []).map((r, i) => (
                <p key={i} className="text-[12px] text-graphite bg-cream rounded-md px-3 py-2">{r}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {viewingSubId && (
        <SubscriberDetailModal storeId={storeId} subId={viewingSubId} onClose={() => setViewingSubId(null)} />
      )}

      {editingPlan && (
        <PlanFormModal
          storeId={storeId}
          plan={editingPlan === 'new' ? null : editingPlan}
          onClose={() => setEditingPlan(null)}
          onSaved={() => { setEditingPlan(null); load(); }}
        />
      )}

      {archivingPlan && (
        <Modal title="Archive Plan" width={420} onClose={() => setArchivingPlan(null)} mobileSheet
          footer={<>
            <Button variant="outline" onClick={() => setArchivingPlan(null)}>Back</Button>
            <Button variant="danger" loading={archiveBusy} onClick={() => submitArchive(archiveNeedsForce)}>
              {archiveNeedsForce ? 'Archive Anyway' : 'Archive Plan'}
            </Button>
          </>}
        >
          <p className="text-[13px] text-charcoal">
            Archive <strong>"{archivingPlan.name}"</strong>? Existing subscribers keep their access; no new subscribers can join this plan.
          </p>
          {archiveError && <p className="text-[12px] text-error mt-2">{archiveError}</p>}
        </Modal>
      )}

      {cancelReasonFor && (
        <Modal title="Cancel Subscription" width={420} onClose={() => { setCancelReasonFor(null); setCancelError(''); }} mobileSheet
          footer={<>
            <Button variant="outline" onClick={() => { setCancelReasonFor(null); setCancelError(''); }}>Back</Button>
            <Button variant="danger" loading={busyId === cancelReasonFor._id} onClick={submitCancel}>
              Cancel Subscription
            </Button>
          </>}
        >
          <div className="flex flex-col gap-2 mb-4">
            <label className="flex items-center gap-2 text-[13px] text-charcoal cursor-pointer">
              <input type="radio" checked={cancelAtPeriodEnd} onChange={() => setCancelAtPeriodEnd(true)} className="accent-brand-orange" />
              Cancel at end of billing period (member keeps access until then)
            </label>
            <label className="flex items-center gap-2 text-[13px] text-charcoal cursor-pointer">
              <input type="radio" checked={!cancelAtPeriodEnd} onChange={() => setCancelAtPeriodEnd(false)} className="accent-brand-orange" />
              Cancel immediately
            </label>
          </div>
          <Textarea
            label="Reason (optional, helps you track why members leave)" rows={3}
            placeholder="e.g. Customer said too expensive"
            value={cancelReasonText} onChange={e => setCancelReasonText(e.target.value)}
          />
          {cancelError && <p className="text-[12px] text-error mt-2">{cancelError}</p>}
        </Modal>
      )}
    </>
  );
}
