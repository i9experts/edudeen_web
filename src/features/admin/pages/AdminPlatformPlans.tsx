import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Archive, TrendingUp, Users, DollarSign, Eye } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Modal } from '@/components/comman/ui/Modal';
import { Button } from '@/components/comman/ui/Button';
import { Input, Textarea } from '@/components/comman/ui/Input';
import { SkeletonBox, Table, MetricCard, type TableColumn } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import {
  apiAdminListPlatformPlans, apiAdminCreatePlatformPlan, apiAdminUpdatePlatformPlan, apiAdminArchivePlatformPlan,
  apiAdminGetPlatformPlanRevenue, apiAdminGetPlatformPlanSubscribers, apiAdminListAddonPurchases,
  apiAdminRefundPlatformInvoice,
  type PlatformPlan, type PlatformPlanLimits, type StorePlatformSubscription, type AddonPurchase,
} from '@/api/services/platformPlans';

const ADDON_LABELS: Record<string, string> = {
  extra_ai_credits: 'Extra AI Credits', extra_staff_seat: 'Extra Staff Seat',
  priority_marketplace_placement: 'Priority Marketplace Placement',
  advanced_tax_compliance: 'Advanced Tax Compliance', sms_notifications: 'SMS Notifications',
};

const DEFAULT_LIMITS: PlatformPlanLimits = {
  maxProducts: 25, maxStaffAccounts: 1, maxPosLocations: 1, aiCreditsPerMonth: 0, transactionFeeRate: 0,
  customDomainAllowed: false, whiteLabelAllowed: false, loyaltyProgramAllowed: false, subscriptionProductsAllowed: false,
  advancedAnalyticsAllowed: false, abandonedCartRecoveryAllowed: false, emailCampaignsAllowed: false,
  apiWebhooksAllowed: false, dedicatedAccountManager: false, prioritySupport: false, marketplaceFeaturedBadge: false,
  advancedSeoToolsAllowed: false, seoAiSuggestionsAllowed: false, searchConsoleIntegrationAllowed: false, customRedirectsAllowed: false,
  maxActiveStoreBanners: 4, maxActivePromotions: 1,
};

type BooleanKeys<T> = { [K in keyof T]-?: NonNullable<T[K]> extends boolean ? K : never }[keyof T];

// Only the toggles that matter for an education shop are shown. The hidden
// SaaS/POS ones (custom domain, white label, abandoned-cart recovery, API &
// webhooks) plus the hidden numeric limits (staff seats, SLA uptime %,
// maxPosLocations) are NOT dropped: `limits` state is seeded from the whole
// saved `plan.limits` object and sent back as-is, so their values survive.
const BOOL_FLAGS: { key: BooleanKeys<PlatformPlanLimits>; label: string }[] = [
  { key: 'loyaltyProgramAllowed', label: 'Loyalty program' },
  { key: 'subscriptionProductsAllowed', label: 'Store subscriptions' },
  { key: 'advancedAnalyticsAllowed', label: 'Advanced analytics' },
  { key: 'emailCampaignsAllowed', label: 'Email campaigns' },
  { key: 'dedicatedAccountManager', label: 'Dedicated account manager' },
  { key: 'prioritySupport', label: 'Priority support' },
  { key: 'marketplaceFeaturedBadge', label: 'Marketplace featured badge' },
  { key: 'advancedSeoToolsAllowed', label: 'Advanced SEO tools' },
  { key: 'seoAiSuggestionsAllowed', label: 'AI SEO suggestions' },
  { key: 'searchConsoleIntegrationAllowed', label: 'Search Console integration' },
  { key: 'customRedirectsAllowed', label: 'Custom redirects' },
];

type PlanTemplate = {
  label: string; hint: string; name: string; badge: string; description: string; isFree: boolean;
  monthly: string; yearly: string; trialDays: string; sortOrder: string; bullets: string[]; limits: Partial<PlatformPlanLimits>;
};

// One-click starting points for a new plan — everything stays editable.
const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    label: 'Free trial', hint: '15 days, limited', name: 'Free Trial', badge: '', isFree: true, monthly: '', yearly: '', trialDays: '15', sortOrder: '0',
    description: 'Try Edudeen free for 15 days. No card needed.',
    bullets: ['Your own Edudeen store', 'Up to 3 active promotions', 'Instant digital delivery', 'Basic sales reports', '15 days free, then pick a paid plan'],
    limits: { aiCreditsPerMonth: 20, maxActiveStoreBanners: 1, maxActivePromotions: 3 },
  },
  {
    label: 'Basic', hint: '$9 / month', name: 'Basic', badge: '', isFree: false, monthly: '9', yearly: '90', trialDays: '0', sortOrder: '1',
    description: 'Everything you need to start selling your educational resources.',
    bullets: ['Your own branded store', 'Unlimited products', 'Instant digital delivery', 'Bank transfers paid straight to you', 'Basic sales reports'],
    limits: { aiCreditsPerMonth: 100, maxActiveStoreBanners: 3, maxActivePromotions: 5, emailCampaignsAllowed: true },
  },
  {
    label: 'Pro', hint: '$29 / month', name: 'Pro', badge: 'Popular', isFree: false, monthly: '29', yearly: '290', trialDays: '0', sortOrder: '2',
    description: 'Premium tools to grow your store and reach more learners.',
    bullets: ['Everything in Basic', 'Advanced analytics and SEO tools', 'AI SEO suggestions', 'Email campaigns and loyalty program', 'Priority support', 'Featured badge on the marketplace'],
    limits: {
      aiCreditsPerMonth: 500, maxActiveStoreBanners: -1, maxActivePromotions: -1, loyaltyProgramAllowed: true, subscriptionProductsAllowed: true,
      advancedAnalyticsAllowed: true, emailCampaignsAllowed: true, prioritySupport: true, marketplaceFeaturedBadge: true,
      advancedSeoToolsAllowed: true, seoAiSuggestionsAllowed: true, searchConsoleIntegrationAllowed: true, customRedirectsAllowed: true,
    },
  },
];

function FormSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-bone p-4 flex flex-col gap-3">
      <div>
        <p className="text-[13px] font-bold text-carbon">{title}</p>
        {hint && <p className="text-[12px] text-slate mt-[2px]">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function PlanFormModal({ plan, onClose, onSaved }: { plan: PlatformPlan | 'new'; onClose: () => void; onSaved: () => void }) {
  const isEdit = plan !== 'new';
  const p = isEdit ? plan : null;
  const [name, setName] = useState(p?.name ?? '');
  const [description, setDescription] = useState(p?.description ?? '');
  const [badge, setBadge] = useState(p?.badge ?? '');
  const [isFree, setIsFree] = useState(p?.isFree ?? false);
  const [monthlyPrice, setMonthlyPrice] = useState(p?.monthlyPriceUSD != null ? String(p.monthlyPriceUSD) : '');
  const [yearlyPrice, setYearlyPrice] = useState(p?.yearlyPriceUSD != null ? String(p.yearlyPriceUSD) : '');
  const [trialDays, setTrialDays] = useState(p ? String(p.trialDays ?? 0) : '0');
  const [sortOrder, setSortOrder] = useState(p ? String(p.sortOrder ?? 0) : '0');
  const [isPubliclyVisible, setIsPubliclyVisible] = useState(p?.isPubliclyVisible ?? true);
  const [featuresText, setFeaturesText] = useState(p?.featureBullets?.join('\n') ?? '');
  // Edudeen sales are commission-free, so a new plan's fee starts at 0.
  const [limits, setLimits] = useState<PlatformPlanLimits>(p?.limits ?? DEFAULT_LIMITS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setLimit = <K extends keyof PlatformPlanLimits>(k: K, v: PlatformPlanLimits[K]) => setLimits(prev => ({ ...prev, [k]: v }));

  function applyTemplate(t: PlanTemplate) {
    setName(t.name); setBadge(t.badge); setDescription(t.description); setIsFree(t.isFree);
    setMonthlyPrice(t.monthly); setYearlyPrice(t.yearly); setTrialDays(t.trialDays); setSortOrder(t.sortOrder);
    setFeaturesText(t.bullets.join('\n'));
    setLimits({ ...DEFAULT_LIMITS, ...t.limits });
    setIsPubliclyVisible(true); setError('');
  }

  async function submit() {
    if (!name.trim()) { setError('Plan name is required.'); return; }
    if (isFree && !(Number(trialDays) > 0)) { setError('A free plan needs trial days (for example 15).'); return; }
    if (!isFree && !(Number(monthlyPrice) > 0)) { setError('Enter the monthly price.'); return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        name: name.trim(), description: description.trim() || undefined, badge: badge.trim() || undefined,
        isFree, monthlyPriceUSD: !isFree && monthlyPrice ? Number(monthlyPrice) : undefined,
        yearlyPriceUSD: !isFree && yearlyPrice ? Number(yearlyPrice) : undefined,
        trialDays: isFree ? Number(trialDays) || 0 : 0,
        sortOrder: Number(sortOrder) || 0,
        isPubliclyVisible,
        featureBullets: featuresText.split('\n').map(f => f.trim()).filter(Boolean),
        limits,
      };
      if (isEdit) await apiAdminUpdatePlatformPlan(p!._id, payload);
      else await apiAdminCreatePlatformPlan(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan.');
    } finally { setSaving(false); }
  }

  return (
    <Modal mobileSheet title={isEdit ? 'Edit Platform Plan' : 'Create Platform Plan'} width={640} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={saving}>{isEdit ? 'Save Changes' : 'Create Plan'}</Button></>}>
      <div className="flex flex-col gap-4">
        {!isEdit && (
          <div>
            <p className="text-[12px] font-semibold text-charcoal mb-2">Start from a template</p>
            <div className="grid grid-cols-3 gap-2">
              {PLAN_TEMPLATES.map(t => (
                <button key={t.label} type="button" onClick={() => applyTemplate(t)}
                  className="rounded-lg border border-bone bg-white px-3 py-2 text-start cursor-pointer hover:border-brand-orange/50 transition-colors">
                  <p className="text-[12.5px] font-bold text-carbon">{t.label}</p>
                  <p className="text-[12px] text-slate">{t.hint}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <FormSection title="Basics">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Plan name" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Badge (optional)" placeholder="Popular" value={badge} onChange={e => setBadge(e.target.value)} />
          </div>
          <Textarea label="Short description" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </FormSection>

        <FormSection title="Price">
          <div className="grid grid-cols-2 gap-2">
            {([[false, 'Paid plan', 'Monthly fee'], [true, 'Free trial', 'Free for some days, no card']] as const).map(([val, label, hint]) => (
              <button key={label} type="button" onClick={() => setIsFree(val)}
                className={`rounded-lg border-2 px-3 py-2 text-start cursor-pointer ${isFree === val ? 'border-brand-orange bg-brand-pale-orange/40' : 'border-bone bg-white'}`}>
                <p className="text-[12.5px] font-bold text-carbon">{label}</p>
                <p className="text-[12px] text-slate">{hint}</p>
              </button>
            ))}
          </div>
          {isFree ? (
            <Input label="Trial length (days)" type="number" min={1} value={trialDays} onChange={e => setTrialDays(e.target.value)} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Monthly price ($)" type="number" min={0} value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} />
              <Input label="Yearly price ($, optional)" type="number" min={0} value={yearlyPrice} onChange={e => setYearlyPrice(e.target.value)} />
            </div>
          )}
        </FormSection>

        <FormSection title="What sellers get" hint="Bullets are shown on the plan card — one per line.">
          <Textarea label="Feature bullets" rows={4} value={featuresText} onChange={e => setFeaturesText(e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Product count isn't capped on any plan, so there is no field for it. */}
            <Input label="AI credits per month" type="number" value={limits.aiCreditsPerMonth ?? ''} onChange={e => setLimit('aiCreditsPerMonth', Number(e.target.value))} />
            <Input label="Store banners (-1 = unlimited)" type="number" value={limits.maxActiveStoreBanners ?? ''} onChange={e => setLimit('maxActiveStoreBanners', Number(e.target.value))} />
            <Input label="Promotions (-1 = unlimited)" type="number" value={limits.maxActivePromotions ?? ''} onChange={e => setLimit('maxActivePromotions', Number(e.target.value))} />
          </div>
          <div>
            <p className="text-[12px] text-slate mb-2">Tap to switch tools on or off for this plan:</p>
            <div className="flex flex-wrap gap-2">
              {BOOL_FLAGS.map(f => {
                const active = !!limits[f.key];
                return (
                  <button key={f.key} type="button" onClick={() => setLimit(f.key, !active)}
                    className="px-2.5 py-1 rounded-full text-[12px] font-medium border cursor-pointer"
                    style={{ background: active ? '#174771' : '#fff', color: active ? '#fff' : '#486071', borderColor: active ? '#174771' : '#E1E7EA' }}>
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        </FormSection>

        <details className="rounded-xl border border-bone px-4 py-3">
          <summary className="text-[12.5px] font-semibold text-carbon cursor-pointer">Advanced</summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <Input label="Display order (lower shows first)" type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
            <Input label="Commission on sales (0 = none)" type="number" step="0.01" min={0} max={1} value={limits.transactionFeeRate ?? ''} onChange={e => setLimit('transactionFeeRate', Number(e.target.value))} />
          </div>
          <label className="flex items-center gap-2 text-[12.5px] text-charcoal mt-3">
            <input type="checkbox" checked={isPubliclyVisible} onChange={e => setIsPubliclyVisible(e.target.checked)} /> Show this plan to sellers
          </label>
        </details>
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}
// ── Subscribers modal ────────────────────────────────────────────────────────
function SubscribersModal({ plan, onClose }: { plan: PlatformPlan; onClose: () => void }) {
  const [subs, setSubs] = useState<StorePlatformSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refundSuccess, setRefundSuccess] = useState(false);

  useEffect(() => {
    apiAdminGetPlatformPlanSubscribers(plan._id, { limit: 50 }).then(res => setSubs(res.data.subscribers ?? [])).finally(() => setLoading(false));
  }, [plan._id]);

  function openRefund() {
    setInvoiceId('');
    setAmount('');
    setRefundError('');
    setRefundSuccess(false);
    setRefunding(true);
  }

  async function submitRefund() {
    if (!invoiceId.trim()) { setRefundError('Invoice ID is required.'); return; }
    setRefundBusy(true);
    setRefundError('');
    try {
      await apiAdminRefundPlatformInvoice(invoiceId.trim(), amount.trim() ? parseFloat(amount.trim()) : undefined);
      setRefundSuccess(true);
    } catch (err) {
      setRefundError(err instanceof Error ? err.message : 'Refund failed.');
    } finally {
      setRefundBusy(false);
    }
  }

  return (
    <Modal mobileSheet title={`Subscribers — ${plan.name}`} width={560} onClose={onClose}>
      {loading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonBox key={i} height={40} rounded="6px" />)}</div>
      ) : subs.length === 0 ? (
        <p className="text-[13px] text-slate">No subscribers on this plan.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
          {subs.map(s => (
            <div key={s._id} className="flex items-center justify-between text-[12.5px] bg-cream rounded-lg px-3 py-2.5">
              <div>
                <p className="font-semibold text-charcoal">Store {s.storeId.slice(-6).toUpperCase()}</p>
                <p className="text-[12px] text-slate">{s.billingInterval} — ${s.amountUSD.toFixed(2)} — {s.status}</p>
              </div>
              <button onClick={openRefund} className="px-2.5 py-1 bg-white border border-bone rounded-[6px] text-[12px] text-error cursor-pointer">Refund…</button>
            </div>
          ))}
        </div>
      )}

      {refunding && (
        <Modal mobileSheet
          title="Refund Invoice"
          onClose={() => setRefunding(false)}
          footer={refundSuccess ? (
            <Button onClick={() => setRefunding(false)}>Done</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setRefunding(false)} disabled={refundBusy}>Cancel</Button>
              <Button variant="danger" onClick={submitRefund} loading={refundBusy}>Refund</Button>
            </>
          )}
        >
          {refundSuccess ? (
            <p className="text-[13px] text-success">Refund processed.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <Input label="Invoice ID" value={invoiceId} onChange={e => setInvoiceId(e.target.value)} placeholder="Paste the invoice ID to refund" />
              {/* Admins can't list a store's plan invoices yet (that endpoint is
                  seller-only), so the ID can't be prefilled here. */}
              <p className="text-[12px] text-slate -mt-1">Invoice IDs aren't listed here yet. Ask the seller for it (from their Billing page) or copy it from the Stripe dashboard.</p>
              <Input label="Amount (USD)" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Leave blank for full remaining amount" />
              {refundError && <p className="text-[12px] text-error">{refundError}</p>}
            </div>
          )}
        </Modal>
      )}
    </Modal>
  );
}

// ── Add-on purchases panel ────────────────────────────────────────────────────
function AddonsPanel() {
  const [addons, setAddons] = useState<AddonPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiAdminListAddonPurchases({ limit: 50 }).then(res => setAddons(res.data.addons ?? [])).finally(() => setLoading(false));
  }, []);

  const columns: TableColumn<AddonPurchase>[] = [
    { key: 'storeId', header: 'Store', render: a => <span className="text-charcoal">{a.storeId.slice(-6).toUpperCase()}</span> },
    { key: 'addonType', header: 'Add-on', render: a => <span className="text-graphite">{ADDON_LABELS[a.addonType] ?? a.addonType}</span> },
    { key: 'quantity', header: 'Qty', render: a => <span className="text-graphite">{a.quantity}</span> },
    { key: 'amountUSD', header: 'Amount', render: a => <span className="font-semibold text-success">${a.amountUSD.toFixed(2)}</span> },
    { key: 'status', header: 'Status', render: a => <span className="text-slate capitalize">{a.status}</span> },
    { key: 'createdAt', header: 'Date', render: a => <span className="text-slate whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString()}</span> },
  ];

  return (
    <Table
      columns={columns}
      data={addons}
      keyExtractor={a => a._id}
      loading={loading}
      emptyState={{ title: 'No add-on purchases yet.' }}
    />
  );
}

export function AdminPlatformPlans() {
  usePageTitle('Platform Plans');
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [revenue, setRevenue] = useState<{ mrr: number; arr: number; activeSubscribers: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PlatformPlan | 'new' | null>(null);
  const [viewingSubscribersFor, setViewingSubscribersFor] = useState<PlatformPlan | null>(null);
  const [showAddons, setShowAddons] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    Promise.all([apiAdminListPlatformPlans(true), apiAdminGetPlatformPlanRevenue()])
      .then(([plansRes, revRes]) => { setPlans(plansRes.data ?? []); setRevenue(revRes.data); })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load platform plans.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const [archiving, setArchiving] = useState<PlatformPlan | null>(null);
  const [archiveError, setArchiveError] = useState('');
  const [archiveForceNeeded, setArchiveForceNeeded] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);

  async function handleArchive(force = false) {
    if (!archiving) return;
    setArchiveBusy(true);
    setArchiveError('');
    try {
      await apiAdminArchivePlatformPlan(archiving._id, force);
      setArchiving(null);
      setArchiveForceNeeded(false);
      load();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : 'Failed to archive plan.');
      setArchiveForceNeeded(true);
    } finally {
      setArchiveBusy(false);
    }
  }

  const metrics = revenue ? [
    { label: 'Platform MRR', value: `$${revenue.mrr.toFixed(2)}`, Icon: TrendingUp },
    { label: 'Platform ARR', value: `$${revenue.arr.toFixed(2)}`, Icon: DollarSign },
    { label: 'Active Subscribers', value: String(revenue.activeSubscribers), Icon: Users },
  ] : [];

  return (
    <div>
      <AdminStudioHeader
        eyebrow="Edudeen team workspace · Commerce"
        title="Platform plans"
        subtitle="Seller-to-Edudeen billing tiers, limits, and add-ons."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowAddons(s => !s)} aria-expanded={showAddons}>{showAddons ? 'Hide Add-ons' : 'View Add-on Purchases'}</Button>
            <Button icon={<Plus size={14} />} onClick={() => setEditing('new')}>Create Plan</Button>
          </div>
        }
      />

      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
        {error && <p className="text-[13px] text-error">{error}</p>}

        {showAddons && (
          <div className="bg-white border border-bone rounded-xl overflow-hidden">
            <div className="px-5 py-[14px] border-b border-bone">
              <p className="font-serif font-normal text-[19px] sm:text-[21px] text-carbon leading-[1.25]">Add-on Purchases</p>
            </div>
            <AddonsPanel />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {(loading && !revenue)
            ? Array.from({ length: 3 }).map((_, i) => <MetricCard key={i} label="" value="" loading />)
            : metrics.map(m => (
              <MetricCard key={m.label} label={m.label} value={m.value} icon={<m.Icon size={16} />} />
            ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-bone rounded-xl px-5 py-4 flex flex-col gap-3">
                <SkeletonBox width="60%" height={16} rounded="4px" />
                <SkeletonBox width="40%" height={20} rounded="4px" />
                <div className="flex flex-col gap-1.5">
                  <SkeletonBox width="90%" height={11} rounded="4px" />
                  <SkeletonBox width="80%" height={11} rounded="4px" />
                  <SkeletonBox width="70%" height={11} rounded="4px" />
                </div>
                <SkeletonBox width="100%" height={34} rounded="8px" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan._id} className="bg-white border border-bone rounded-xl px-5 py-4 flex flex-col">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-[15px] font-bold text-carbon">{plan.name}</p>
                  <div className="flex items-center gap-1.5">
                    {plan.isPubliclyVisible === false && <span className="text-[12px] font-bold px-2 py-[2px] rounded-full bg-bone text-slate">Hidden</span>}
                    {plan.badge && <span className="text-[12px] font-bold px-2 py-[2px] rounded-full bg-brand-pale-orange text-brand-deep-orange">{plan.badge}</span>}
                  </div>
                </div>
                <p className="text-[18px] font-bold text-brand-orange mb-2">
                  {plan.isFree ? 'Free' : plan.isCustomPricing ? 'Custom' : `$${plan.monthlyPriceUSD}/mo`}
                </p>
                <ul className="flex flex-col gap-1 mb-3 p-0 list-none">
                  {(plan.featureBullets ?? []).slice(0, 4).map(f => <li key={f} className="text-[12px] text-graphite">• {f}</li>)}
                </ul>
                <div className="flex items-center justify-between py-2 border-t border-bone mb-3 mt-auto text-[12px] text-slate">
                  <span>{plan.subscriberCount ?? 0} sellers</span>
                  <span className="font-semibold text-success">${(plan.mrrUSD ?? 0).toFixed(2)}/mo</span>
                  <span className="capitalize">{plan.status}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(plan)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-white border border-bone rounded-lg text-xs font-medium text-graphite cursor-pointer"><Pencil size={12} /> Edit</button>
                  <button onClick={() => setViewingSubscribersFor(plan)} className="flex-1 flex items-center justify-center gap-1 py-2 bg-white border border-bone rounded-lg text-xs font-medium text-graphite cursor-pointer"><Eye size={12} /> Subscribers</button>
                  {plan.status !== 'archived' && <button onClick={() => { setArchiving(plan); setArchiveError(''); setArchiveForceNeeded(false); }} className="flex-1 flex items-center justify-center gap-1 py-2 bg-white border border-bone rounded-lg text-xs font-medium text-graphite cursor-pointer"><Archive size={12} /> Archive</button>}
                </div>
              </div>
            ))}
            {plans.length === 0 && <div className="col-span-full text-center py-10 text-[13px] text-slate">No platform plans yet.</div>}
          </div>
        )}
      </div>

      {editing && <PlanFormModal plan={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {viewingSubscribersFor && <SubscribersModal plan={viewingSubscribersFor} onClose={() => setViewingSubscribersFor(null)} />}

      {archiving && (
        <Modal mobileSheet
          title="Archive Plan"
          onClose={() => setArchiving(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setArchiving(null)} disabled={archiveBusy}>Cancel</Button>
              <Button variant="danger" onClick={() => handleArchive(archiveForceNeeded)} loading={archiveBusy}>
                {archiveForceNeeded ? 'Archive Anyway' : 'Archive'}
              </Button>
            </>
          }
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Archive "<strong>{archiving.name}</strong>"?
          </p>
          {archiveError && (
            <p className="text-[12px] text-error mt-2">
              {archiveError}{archiveForceNeeded ? ' Choose "Archive Anyway" to proceed regardless.' : ''}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
