import { useState } from 'react';
import { Plus, Pencil, Archive, Crown } from 'lucide-react';
import { Badge, Button, Input, Modal, Select, Table, Textarea, Toggle, type TableColumn } from '@/components/comman/ui';
import {
  apiAdminPremiumPlans, apiAdminCreatePremiumPlan, apiAdminUpdatePremiumPlan, apiAdminArchivePremiumPlan,
  type AdminPremiumPlan, type PremiumPlanPayload,
} from '@/api/services/adminPremium';
import { useLoad, money } from './useLoad';

interface FormState {
  name: string; description: string; monthly: string; yearly: string; isActive: boolean;
  childrenLimit: string; earlyAccessHours: string; couponValue: string; couponType: 'percentage' | 'fixed'; prioritySupport: boolean;
}

const EMPTY: FormState = {
  name: '', description: '', monthly: '', yearly: '', isActive: true,
  childrenLimit: '15', earlyAccessHours: '2', couponValue: '0', couponType: 'percentage', prioritySupport: true,
};

function fromPlan(p: AdminPremiumPlan): FormState {
  return {
    name: p.name, description: p.description, monthly: String(p.monthlyPriceUSD),
    // The API returns the effective yearly price; only keep it as an override when it differs from 12 x monthly.
    yearly: Math.abs(p.yearlyPriceUSD - p.monthlyPriceUSD * 12) > 0.005 ? String(p.yearlyPriceUSD) : '',
    isActive: p.isActive, childrenLimit: String(p.benefits.childrenLimit), earlyAccessHours: String(p.benefits.earlyAccessHours),
    couponValue: String(p.benefits.monthlyCouponValue), couponType: p.benefits.monthlyCouponType, prioritySupport: p.benefits.prioritySupport,
  };
}

function validate(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  const num = (s: string) => (s.trim() === '' ? NaN : Number(s));
  if (f.name.trim().length < 2 || f.name.trim().length > 80) e.name = 'Name must be 2 to 80 characters.';
  if (f.description.length > 1000) e.description = 'Keep the description under 1000 characters.';
  const m = num(f.monthly);
  if (!(m >= 0 && m <= 100000)) e.monthly = 'Enter a monthly price from 0 to 100000.';
  if (f.yearly.trim() !== '') { const y = num(f.yearly); if (!(y >= 0 && y <= 1000000)) e.yearly = 'Enter a yearly price from 0 to 1000000, or leave empty.'; }
  const c = num(f.childrenLimit);
  if (!(Number.isInteger(c) && c >= 8 && c <= 100)) e.childrenLimit = 'Whole number from 8 to 100.';
  const h = num(f.earlyAccessHours);
  if (!(h >= 0 && h <= 168)) e.earlyAccessHours = 'From 0 to 168 hours.';
  const v = num(f.couponValue);
  if (!(v >= 0 && v <= 100000)) e.couponValue = 'From 0 to 100000 (0 = no coupon).';
  else if (f.couponType === 'percentage' && v > 100) e.couponValue = 'A percentage coupon cannot exceed 100.';
  return e;
}

function toPayload(f: FormState): PremiumPlanPayload {
  return {
    name: f.name.trim(), description: f.description.trim(), monthlyPriceUSD: Number(f.monthly),
    yearlyPriceUSD: f.yearly.trim() === '' ? null : Number(f.yearly), isActive: f.isActive,
    benefits: {
      childrenLimit: Number(f.childrenLimit), earlyAccessHours: Number(f.earlyAccessHours),
      monthlyCouponValue: Number(f.couponValue), monthlyCouponType: f.couponType, prioritySupport: f.prioritySupport,
    },
  };
}

function PlanModal({ plan, fx, onClose, onSaved }: { plan: AdminPremiumPlan | null; fx: number | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<FormState>(plan ? fromPlan(plan) : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const errors = validate(f);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF(s => ({ ...s, [k]: v }));
  const show = (k: string) => (touched ? errors[k] : undefined);

  const monthly = Number(f.monthly) || 0;
  const yearly = f.yearly.trim() !== '' ? Number(f.yearly) || 0 : monthly * 12;

  async function save() {
    setTouched(true);
    if (Object.keys(errors).length) return;
    setSaving(true); setError('');
    try {
      if (plan) await apiAdminUpdatePremiumPlan(plan._id, toPayload(f));
      else await apiAdminCreatePremiumPlan(toPayload(f));
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the plan.');
    } finally { setSaving(false); }
  }

  return (
    <Modal mobileSheet title={plan ? 'Edit Premium plan' : 'New Premium plan'} width={600} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={save}>{plan ? 'Save changes' : 'Create plan'}</Button></>}>
      <div className="flex flex-col gap-4">
        <Input label="Plan name" value={f.name} maxLength={80} onChange={e => set('name', e.target.value)} error={show('name')} placeholder="Edudeen Premium" />
        <Textarea label="Description (shown to buyers)" rows={2} value={f.description} maxLength={1000} onChange={e => set('description', e.target.value)} error={show('description')} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Monthly price (USD)" type="number" min={0} step="0.01" value={f.monthly} onChange={e => set('monthly', e.target.value)} error={show('monthly')} />
          <Input label="Yearly price (USD, optional)" type="number" min={0} step="0.01" value={f.yearly} onChange={e => set('yearly', e.target.value)} error={show('yearly')} placeholder={`${(monthly * 12).toFixed(2)} (12 x monthly)`} />
        </div>
        <p className="text-[12px] text-slate -mt-2">
          {fx
            ? <>Buyers paying in PKR see about <strong>PKR {Math.round(monthly * fx).toLocaleString()}</strong> monthly and <strong>PKR {Math.round(yearly * fx).toLocaleString()}</strong> yearly (rate {fx.toFixed(2)}, set under FX Settings).</>
            : 'PKR preview appears once an exchange rate exists (FX Settings).'}
        </p>

        <div className="rounded-lg border border-bone bg-cream/40 p-3 flex flex-col gap-3">
          <p className="text-[12px] font-bold text-brand-royal uppercase tracking-[0.12em]">Benefits</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Children profiles allowed (8 to 100)" type="number" min={8} max={100} step={1} value={f.childrenLimit} onChange={e => set('childrenLimit', e.target.value)} error={show('childrenLimit')} />
            <Input label="Early access to sales (hours, 0 to 168)" type="number" min={0} max={168} value={f.earlyAccessHours} onChange={e => set('earlyAccessHours', e.target.value)} error={show('earlyAccessHours')} />
            <Input label="Monthly coupon value (0 = none)" type="number" min={0} value={f.couponValue} onChange={e => set('couponValue', e.target.value)} error={show('couponValue')} />
            <Select label="Monthly coupon type" value={f.couponType} onChange={e => set('couponType', e.target.value as 'percentage' | 'fixed')}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed amount (USD)</option>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-charcoal">Priority support (Contact messages are flagged)</p>
            <Toggle label="Priority support" checked={f.prioritySupport} onChange={v => set('prioritySupport', v)} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-charcoal">Active</p>
            <p className="text-[12px] text-slate">Inactive plans are hidden from buyers; existing members keep their benefits.</p>
          </div>
          <Toggle label="Plan active" checked={f.isActive} onChange={v => set('isActive', v)} />
        </div>
        {plan && <p className="text-[12px] text-slate">Running memberships keep the benefits they bought; changes apply to new purchases and renewals.</p>}
        {error && <p role="alert" className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

export function PremiumPlansTab() {
  const { data, loading, error, refetch } = useLoad(() => apiAdminPremiumPlans().then(r => r.data), []);
  const [editing, setEditing] = useState<AdminPremiumPlan | 'new' | null>(null);
  const [archiving, setArchiving] = useState<AdminPremiumPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const plans = data ?? [];
  const fx = plans.find(p => p.fxRate)?.fxRate ?? null;

  async function archive() {
    if (!archiving) return;
    setBusy(true); setActionError('');
    try { await apiAdminArchivePremiumPlan(archiving._id); setArchiving(null); refetch(); }
    catch (err) { setActionError(err instanceof Error ? err.message : 'Could not archive the plan.'); }
    finally { setBusy(false); }
  }

  const columns: TableColumn<AdminPremiumPlan>[] = [
    { key: 'name', header: 'Plan', render: p => (<div className="max-w-[220px]"><p className="font-semibold truncate">{p.name}</p>{p.description && <p className="text-[12px] text-slate truncate">{p.description}</p>}</div>) },
    { key: 'price', header: 'Price', render: p => (<div className="whitespace-nowrap"><p>{money(p.monthlyPriceUSD)} / month</p><p className="text-[12px] text-slate">{money(p.yearlyPriceUSD)} / year{p.monthlyPricePKR ? ` · PKR ${p.monthlyPricePKR.toLocaleString()} / mo` : ''}</p></div>) },
    { key: 'benefits', header: 'Benefits', render: p => (
      <div className="text-[12px] text-graphite">
        <p>{p.benefits.childrenLimit} children · {p.benefits.earlyAccessHours}h early access</p>
        <p>{p.benefits.monthlyCouponValue > 0 ? `${p.benefits.monthlyCouponType === 'percentage' ? `${p.benefits.monthlyCouponValue}%` : money(p.benefits.monthlyCouponValue)} monthly coupon` : 'No monthly coupon'}{p.benefits.prioritySupport ? ' · priority support' : ''}</p>
      </div>) },
    { key: 'members', header: 'Members', render: p => <span>{p.activeMembers ?? 0}</span> },
    { key: 'status', header: 'Status', render: p => <Badge color={p.isActive ? 'green' : 'gray'} dot>{p.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', header: '', align: 'right', render: p => (
      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => setEditing(p)}>Edit</Button>
        <Button variant="ghost" size="sm" icon={<Archive size={13} />} onClick={() => { setArchiving(p); setActionError(''); }}>Archive</Button>
      </div>) },
  ];

  return (
    <div className="bg-white border border-bone rounded-xl overflow-hidden">
      <div className="px-5 py-[14px] border-b border-bone flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[13px] text-slate">Plans buyers can choose from. Yearly defaults to 12 x monthly unless you set a price.</p>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setEditing('new')}>New plan</Button>
      </div>
      {error ? (
        <div className="px-4 py-6 text-center"><p className="text-[13px] text-error mb-2">{error}</p><Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button></div>
      ) : (
        <Table columns={columns} data={plans} keyExtractor={p => p._id} loading={loading} onRowClick={p => setEditing(p)}
          emptyState={{ icon: <Crown size={28} className="text-slate" />, title: 'No Premium plans yet', description: 'Create a plan so buyers can subscribe.', action: { label: 'New plan', onClick: () => setEditing('new') } }} />
      )}

      {editing && <PlanModal plan={editing === 'new' ? null : editing} fx={fx} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refetch(); }} />}

      {archiving && (
        <Modal mobileSheet title="Archive plan" onClose={() => setArchiving(null)}
          footer={<><Button variant="ghost" onClick={() => setArchiving(null)}>Cancel</Button><Button variant="danger" loading={busy} onClick={archive}>Archive</Button></>}>
          <p className="text-[13px] text-charcoal leading-[1.6]">
            Archive "<strong>{archiving.name}</strong>"? Buyers can no longer choose it. Its {archiving.activeMembers ?? 0} active member(s) keep their benefits until their period ends.
          </p>
          {actionError && <p role="alert" className="text-[12px] text-error mt-2">{actionError}</p>}
        </Modal>
      )}
    </div>
  );
}
