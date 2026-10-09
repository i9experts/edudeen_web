import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useCampaigns, useCampaignActions, usePlatformCoupons, usePlatformCouponActions,
} from '@/hooks/admin/useAdminMarketing';
import type { Campaign, CampaignStatus, DiscountType, CampaignSponsorType, PlatformCoupon } from '@/api/services/marketing/adminMarketing';
import { Button, Modal, Input, Textarea, Select, Table, StatusBadge, Badge, Toggle, TabBar, ImageUpload, ActionMenu, EmptyState } from '@/components/comman/ui';
import { AdminStudioHeader } from '@/features/admin/components/studio';
import type { TableColumn, Tab } from '@/components/comman/ui';
import { AnalyticsErrorState } from '@/components/comman/analytics/AnalyticsErrorState';
import { formatDate, formatCurrency } from '@/components/comman/analytics/format';
import { Tag, Percent, Trash2, Plus, Store, Building2, User, Pencil, Play, Square, Rocket, Check, X, Calendar as CalendarIcon, AlertTriangle, GraduationCap, LayoutGrid, Megaphone, ShieldCheck } from 'lucide-react';
import {
  apiAdminListPromotionRequests, apiAdminApprovePromotionRequest, apiAdminRejectPromotionRequest, apiAdminCheckPromotionConflicts,
  apiGetAdminPromotionAnalytics, apiAdminPromotionCalendar,
  type PromotionRequest, type PromotionAnalyticsData, type CalendarPromotionItem, type CalendarCampaignItem,
} from '@/api/services/promotions';
import type { PromotionPlacement } from '@/api/services/banner';
import { useAdminConfig, useUpdatePlacementLimits, useUpdatePromotionPricing } from '@/hooks/admin/useAdminConfig';
import type { PlacementLimits, PlacementRateCard } from '@/api/services/config/adminConfig';
import { Settings } from 'lucide-react';

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, not the raw ISO string.
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const TABS: Tab[] = [
  { id: 'campaigns', label: 'Sale Campaigns', icon: <Tag size={14} /> },
  { id: 'coupons', label: 'Platform Coupons', icon: <Percent size={14} /> },
  { id: 'promotions', label: 'Promotion Requests', icon: <Rocket size={14} /> },
];

const PLACEMENT_LABEL: Record<PromotionPlacement, string> = {
  homepageHero: 'Homepage Hero', marketplaceHero: 'Marketplace Hero', educationHero: 'Education Marketplace Hero', categoryHero: 'Category Hero', productPage: 'Product Page Banner',
};

// ═══════════════════════════════ Campaigns ═══════════════════════════════════

// Seasonal sale presets — one click fills the form with the next upcoming
// dates; the admin can still change anything before creating it.
type SalePreset = { label: string; description: string; discount: number } & (
  | { start: [number, number]; end: [number, number] }
  // Lunar dates move every year, so these come from a table instead.
  | { lunar: Record<number, [string, string]> }
);

// Expected Ramzan dates in Pakistan (moon sighting can shift them by a day —
// the admin adjusts before creating).
const RAMZAN: Record<number, [string, string]> = {
  2026: ['2026-02-18', '2026-03-19'], 2027: ['2027-02-08', '2027-03-09'], 2028: ['2028-01-28', '2028-02-26'],
  2029: ['2029-01-16', '2029-02-14'], 2030: ['2030-01-06', '2030-02-04'],
};

const SALE_PRESETS: SalePreset[] = [
  { label: 'Back to School (April)', description: 'Workbooks, stationery and courses for the new session in Pakistan.', start: [3, 25], end: [4, 15], discount: 15 },
  { label: 'Back to School (August)', description: 'New Cambridge / O & A Level session — notes, past papers and books.', start: [8, 1], end: [8, 31], discount: 15 },
  { label: 'Exam Prep Sale',      description: 'Board exam season — past papers, notes and revision packs for Matric and Inter.', start: [2, 1], end: [3, 15], discount: 20 },
  { label: 'O/A Level Exam Prep', description: 'Cambridge May/June series — topical past papers and revision guides.', start: [3, 15], end: [5, 15], discount: 20 },
  { label: 'Ramzan Sale',         description: 'Quran, Tajweed, Seerah and Islamic learning for the blessed month.', lunar: RAMZAN, discount: 20 },
  { label: 'Summer Learning',     description: 'Holiday homework help, reading packs and summer courses.', start: [6, 1], end: [7, 31], discount: 15 },
  { label: "Teachers' Day",       description: 'World Teachers’ Day (5 October) — thank-you deals on teacher resources.', start: [10, 1], end: [10, 7], discount: 15 },
  { label: 'October Mega Sale', description: 'A month of savings on books, courses and learning resources.', start: [10, 1],  end: [10, 31], discount: 20 },
  { label: '11.11 Sale',        description: 'One day only — the biggest discounts of the year on 11 November.', start: [11, 11], end: [11, 11], discount: 30 },
  { label: '12.12 Sale',        description: 'Year-end deals on 12 December.',                               start: [12, 12], end: [12, 12], discount: 25 },
  { label: 'Azadi Sale',        description: 'Celebrate Independence Day (14 August) with special prices.',   start: [8, 10],  end: [8, 15],  discount: 14 },
];

/** Next occurrence of a preset's window (rolls to next year once it has ended). */
function nextPresetWindow(p: SalePreset) {
  const now = new Date();
  // A window already underway starts now rather than in the past.
  const clamp = (s: Date, e: Date) => ({ start: s < now ? now : s, end: e });
  if ('lunar' in p) {
    const year = Object.keys(p.lunar).map(Number).sort().find(y => new Date(`${p.lunar[y][1]}T23:59:00`) >= now);
    // Past the dates in the table: no guess — the admin sets the dates.
    if (year == null) return null;
    return clamp(new Date(`${p.lunar[year][0]}T00:00:00`), new Date(`${p.lunar[year][1]}T23:59:00`));
  }
  let year = now.getFullYear();
  const endOf = (y: number) => new Date(y, p.end[0] - 1, p.end[1], 23, 59);
  if (endOf(year) < now) year += 1;
  return clamp(new Date(year, p.start[0] - 1, p.start[1], 0, 0), endOf(year));
}

function CreateCampaignModal({ campaign, onClose, onSaved }: { campaign?: Campaign; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!campaign;
  const { createCampaign, updateCampaign, submitting, error } = useCampaignActions();
  const [name, setName] = useState(campaign?.name ?? '');
  const [description, setDescription] = useState(campaign?.description ?? '');
  const [bannerImage, setBannerImage] = useState(campaign?.bannerImage ?? '');
  const [startDate, setStartDate] = useState(campaign ? toDatetimeLocalValue(campaign.startDate) : '');
  const [endDate, setEndDate] = useState(campaign ? toDatetimeLocalValue(campaign.endDate) : '');
  const [discountType, setDiscountType] = useState<DiscountType | ''>(campaign?.discountType ?? '');
  const [discountValue, setDiscountValue] = useState(campaign?.discountValue != null ? String(campaign.discountValue) : '');
  const [sponsorType, setSponsorType] = useState<CampaignSponsorType>(campaign?.sponsorType ?? 'seller');
  const [order, setOrder] = useState(campaign ? String(campaign.order) : '');
  const [validationError, setValidationError] = useState('');

  async function submit() {
    if (!name.trim() || !startDate || !endDate) { setValidationError('Name, start date, and end date are required.'); return; }
    if (new Date(endDate) <= new Date(startDate)) { setValidationError('End date must be after start date.'); return; }
    if (sponsorType === 'platform' && (!discountType || !discountValue)) {
      setValidationError('A platform-sponsored campaign needs a discount type and value — that\'s what the platform is covering.');
      return;
    }
    setValidationError('');
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      bannerImage: bannerImage || undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      discountType: discountType || undefined,
      discountValue: discountType && discountValue ? Number(discountValue) : undefined,
      sponsorType,
      order: order.trim() ? Number(order) : undefined,
    };
    const ok = isEdit ? await updateCampaign(campaign._id, payload) : await createCampaign(payload);
    if (ok) onSaved();
  }

  return (
    <Modal mobileSheet
      title={isEdit ? 'Edit Sale Campaign' : 'Create Sale Campaign'}
      width={520}
      onClose={onClose}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={submitting}>{isEdit ? 'Save Changes' : 'Create Campaign'}</Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        {!isEdit && (
          <div>
            <p className="text-[12px] font-medium text-charcoal mb-1.5">Quick start</p>
            <div className="flex flex-wrap gap-2">
              {SALE_PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const w = nextPresetWindow(p);
                    setName(p.label);
                    setDescription(p.description);
                    // No known dates for this year (lunar table ran out) → leave the dates for the admin.
                    setStartDate(w ? toDatetimeLocalValue(w.start.toISOString()) : '');
                    setEndDate(w ? toDatetimeLocalValue(w.end.toISOString()) : '');
                    setDiscountType('percentage');
                    setDiscountValue(String(p.discount));
                  }}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer transition-colors',
                    name === p.label ? 'border-brand-orange bg-brand-pale-orange text-charcoal' : 'border-bone bg-white text-charcoal hover:border-brand-orange',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-slate mt-1.5">Fills in the name, the next dates and a suggested discount — edit anything before creating. Live campaigns show in the top bar of every page.</p>
          </div>
        )}
        <Input label="Campaign Name" placeholder="October Mega Sale" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Description" rows={3} placeholder="Optional description sellers will see when opting in…" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div>
          <label className="text-[12px] font-medium text-charcoal block mb-1.5">Banner Image (optional)</label>
          <ImageUpload value={bannerImage ? [bannerImage] : []} onChange={(urls) => setBannerImage(urls[0] ?? '')} maxFiles={1} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Start Date" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="End Date" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div>
          <Input
            label="Display Order (optional)" type="number" min={0} placeholder="0 = shown first"
            value={order} onChange={(e) => setOrder(e.target.value)}
          />
          <p className="text-[12px] text-slate mt-1">
            Controls which campaign shows first when more than one is active on the deals banner — lower number = shown first. Leave blank to add it to the end of the rotation.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label={sponsorType === 'platform' ? 'Discount (required)' : 'Suggested Discount (optional)'} value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType | '')}>
            <option value="">No default discount</option>
            <option value="percentage">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
          </Select>
          <Input label="Discount Value" type="number" min={0} disabled={!discountType} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
        </div>

        <div>
          <label className="text-[12px] font-medium text-charcoal block mb-1.5">Who covers the discount?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setSponsorType('seller')}
              className={clsx(
                'text-left px-3.5 py-3 rounded-lg border transition-colors cursor-pointer',
                sponsorType === 'seller' ? 'border-brand-orange bg-brand-pale-orange' : 'border-bone bg-cream',
              )}
            >
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-charcoal"><User size={13} /> Seller Sponsored</p>
              <p className="text-[12px] text-slate mt-1">Participating sellers give the discount out of their own payout — the platform's cost is $0.</p>
            </button>
            <button
              type="button"
              onClick={() => setSponsorType('platform')}
              className={clsx(
                'text-left px-3.5 py-3 rounded-lg border transition-colors cursor-pointer',
                sponsorType === 'platform' ? 'border-brand-orange bg-brand-pale-orange' : 'border-bone bg-cream',
              )}
            >
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-charcoal"><Building2 size={13} /> Platform Sponsored</p>
              <p className="text-[12px] text-slate mt-1">The platform reimburses the discount — sellers keep their full payout, no margin lost by joining.</p>
            </button>
          </div>
        </div>

        {(validationError || error) && <p className="text-[12px] text-error">{validationError || error}</p>}
      </div>
    </Modal>
  );
}

function CampaignsTab() {
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | undefined>(undefined);
  const { data: campaigns, loading, error, refetch } = useCampaigns(statusFilter);
  const { setStatus, updateCampaign, deleteCampaign, submitting, error: actionError } = useCampaignActions();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState<Campaign | null>(null);
  const [orderDrafts, setOrderDrafts] = useState<Record<string, string>>({});

  async function toggleStatus(c: Campaign, next: CampaignStatus) {
    const ok = await setStatus(c._id, next);
    if (ok) refetch();
  }

  async function saveOrder(c: Campaign, raw: string) {
    const next = Number(raw);
    if (raw.trim() === '' || Number.isNaN(next) || next === c.order) return;
    const ok = await updateCampaign(c._id, { order: next });
    if (ok) {
      refetch();
    } else {
      // Rejected (e.g. position already taken by another campaign) — snap the
      // input back to the real value instead of leaving the invalid number
      // displayed as if it had been saved.
      setOrderDrafts((prev) => ({ ...prev, [c._id]: String(c.order) }));
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    const ok = await deleteCampaign(deleting._id);
    if (ok) { setDeleting(null); refetch(); }
  }

  const columns: TableColumn<Campaign>[] = [
    {
      key: 'name',
      header: 'Campaign',
      render: (c) => (
        <div className="max-w-[260px]">
          <p className="text-[13px] font-semibold text-charcoal">{c.name}</p>
          {c.description && <p className="text-[12px] text-slate truncate">{c.description}</p>}
        </div>
      ),
    },
    { key: 'dates', header: 'Dates', render: (c) => <span className="text-[12px] text-slate whitespace-nowrap">{formatDate(c.startDate)} – {formatDate(c.endDate)}</span> },
    {
      key: 'order',
      header: 'Banner Order',
      align: 'center',
      render: (c) => (
        <input
          type="number"
          min={0}
          value={orderDrafts[c._id] ?? String(c.order)}
          onChange={(e) => setOrderDrafts((prev) => ({ ...prev, [c._id]: e.target.value }))}
          onBlur={(e) => saveOrder(c, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          disabled={submitting}
          title="Lower number shows first when multiple campaigns are active on the deals banner"
          className="w-14 rounded-md border border-bone px-2 py-1 text-center text-[12px] text-charcoal outline-none focus:border-brand-orange disabled:opacity-50"
        />
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (c) => c.discountType && c.discountValue
        ? <span className="text-[13px] font-semibold text-charcoal">{c.discountType === 'percentage' ? `${c.discountValue}% off` : formatCurrency(c.discountValue) + ' off'}</span>
        : <span className="text-slate/40">—</span>,
    },
    {
      key: 'sponsor',
      header: 'Sponsored By',
      render: (c) => c.sponsorType === 'platform'
        ? (
          <div>
            <Badge size="sm" color="orange"><Building2 size={10} /> Platform</Badge>
            {c.totalPlatformSubsidyUSD > 0 && <p className="text-[12px] text-slate mt-1">{formatCurrency(c.totalPlatformSubsidyUSD)} spent</p>}
          </div>
        )
        : <Badge size="sm"><User size={10} /> Seller</Badge>,
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} size="sm" /> },
    {
      key: 'participating',
      header: 'Stores Joined',
      align: 'center',
      render: (c) => c.sponsorType === 'platform'
        ? <Badge size="sm" color="orange"><Store size={10} /> All stores</Badge>
        : <Badge size="sm"><Store size={10} /> {(c.participatingStoreIds ?? []).length}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (c) => (
        <ActionMenu
          align="right"
          items={[
            { label: 'Edit Campaign', icon: <Pencil size={13} />, onClick: () => setEditing(c) },
            ...(c.status === 'draft' ? [{ label: 'Activate', icon: <Play size={13} />, onClick: () => toggleStatus(c, 'active' as CampaignStatus), disabled: submitting }] : []),
            ...(c.status === 'active' ? [{ label: 'End Campaign', icon: <Square size={13} />, onClick: () => toggleStatus(c, 'ended' as CampaignStatus), disabled: submitting }] : []),
            { label: 'Delete', icon: <Trash2 size={13} />, danger: true, onClick: () => setDeleting(c) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 pt-4">
      {actionError && <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{actionError}</div>}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {(['', 'draft', 'active', 'ended'] as const).map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s || undefined)}
              className={`px-3 py-[6px] rounded-lg text-[12px] font-medium border cursor-pointer transition-colors duration-150 ${
                (statusFilter ?? '') === s ? 'bg-brand-pale-orange border-brand-orange/30 text-brand-deep-orange' : 'bg-white border-bone text-slate hover:bg-cream'
              }`}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
        <Button size="sm" icon={<Plus size={13} />} onClick={() => setCreating(true)}>New Campaign</Button>
      </div>

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        {error ? (
          <div className="p-5"><AnalyticsErrorState message={error} onRetry={refetch} /></div>
        ) : (
          <Table
            columns={columns}
            data={campaigns ?? []}
            keyExtractor={(c) => c._id}
            loading={loading}
            emptyState={{ icon: <Tag size={28} className="text-slate/50" />, title: 'No sale campaigns yet', description: 'Create a platform-wide sale event for sellers to opt their stores into.', action: { label: 'New Campaign', onClick: () => setCreating(true), icon: <Plus size={14} /> } }}
          />
        )}
      </div>

      {creating && <CreateCampaignModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refetch(); }} />}
      {editing && <CreateCampaignModal campaign={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refetch(); }} />}

      {deleting && (
        <Modal mobileSheet
          title="Delete Campaign"
          onClose={() => setDeleting(null)}
          footer={<>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={submitting}>Delete Campaign</Button>
          </>}
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">Delete "<strong>{deleting.name}</strong>"? This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════ Platform Coupons ═════════════════════════════

function CreateCouponModal({ coupon, onClose, onSaved }: { coupon?: PlatformCoupon; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!coupon;
  const { createCoupon, updateCoupon, submitting, error } = usePlatformCouponActions();
  const [code, setCode] = useState(coupon?.code ?? '');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(coupon?.discountType ?? 'percentage');
  const [discountValue, setDiscountValue] = useState(coupon ? String(coupon.discountValue) : '');
  const [minOrderAmount, setMinOrderAmount] = useState(coupon?.minOrderAmount != null ? String(coupon.minOrderAmount) : '');
  const [usageLimit, setUsageLimit] = useState(coupon?.usageLimit != null ? String(coupon.usageLimit) : '');
  const [expiresAt, setExpiresAt] = useState(coupon?.expiresAt ? coupon.expiresAt.slice(0, 10) : '');
  const [validationError, setValidationError] = useState('');

  async function submit() {
    const value = Number(discountValue);
    if (!code.trim() || !discountValue || Number.isNaN(value) || value <= 0) { setValidationError('Code and a valid discount value are required.'); return; }
    if (discountType === 'percentage' && value > 100) { setValidationError('Percentage discount cannot exceed 100.'); return; }
    setValidationError('');
    const commonFields = {
      discountValue: value,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    };
    // code/discountType are immutable after creation (UpdatePlatformCouponPayload
    // doesn't accept them) — an edit only ever adjusts the fields below.
    const ok = isEdit
      ? await updateCoupon(coupon._id, commonFields)
      : await createCoupon({ code: code.trim().toUpperCase(), discountType, ...commonFields });
    if (ok) onSaved();
  }

  return (
    <Modal mobileSheet
      title={isEdit ? 'Edit Platform Coupon' : 'Create Platform Coupon'}
      width={480}
      onClose={onClose}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={submitting}>{isEdit ? 'Save Changes' : 'Create Coupon'}</Button>
      </>}
    >
      <div className="flex flex-col gap-4">
        <Input label="Coupon Code" placeholder="WELCOME10" value={code} disabled={isEdit} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        {isEdit && <p className="text-[12px] text-slate -mt-2.5">Code and discount type can't be changed after creation — delete and create a new coupon instead.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select label="Discount Type" value={discountType} disabled={isEdit} onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </Select>
          <Input label="Discount Value" type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Min Order Amount" type="number" min={0} placeholder="Optional" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} />
          <Input label="Usage Limit" type="number" min={1} placeholder="Unlimited" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
        </div>
        <Input label="Expires At" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        {(validationError || error) && <p className="text-[12px] text-error">{validationError || error}</p>}
      </div>
    </Modal>
  );
}

function CouponsTab() {
  const { data: coupons, loading, error, refetch } = usePlatformCoupons();
  const { updateCoupon, deleteCoupon, submitting, error: actionError } = usePlatformCouponActions();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PlatformCoupon | null>(null);
  const [deleting, setDeleting] = useState<PlatformCoupon | null>(null);

  async function toggleActive(coupon: PlatformCoupon) {
    const ok = await updateCoupon(coupon._id, { isActive: !coupon.isActive });
    if (ok) refetch();
  }

  async function handleDelete() {
    if (!deleting) return;
    const ok = await deleteCoupon(deleting._id);
    if (ok) { setDeleting(null); refetch(); }
  }

  const columns: TableColumn<PlatformCoupon>[] = [
    { key: 'code', header: 'Code', render: (c) => <span className="text-[13px] font-bold text-brand-deep-orange">{c.code}</span> },
    {
      key: 'discount',
      header: 'Discount',
      render: (c) => <span className="text-[13px] font-semibold text-charcoal">{c.discountType === 'percentage' ? `${c.discountValue}% off` : formatCurrency(c.discountValue) + ' off'}</span>,
    },
    { key: 'minOrderAmount', header: 'Min Order', render: (c) => <span className="text-[13px] text-graphite">{c.minOrderAmount != null ? formatCurrency(c.minOrderAmount) : '—'}</span> },
    { key: 'usage', header: 'Usage', render: (c) => <span className="text-[13px] text-graphite">{c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</span> },
    { key: 'expiresAt', header: 'Expires', render: (c) => <span className="text-[13px] text-slate whitespace-nowrap">{c.expiresAt ? formatDate(c.expiresAt) : 'Never'}</span> },
    { key: 'isActive', header: 'Active', render: (c) => <Toggle checked={c.isActive} onChange={() => toggleActive(c)} disabled={submitting} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (c) => (
        <ActionMenu
          align="right"
          items={[
            { label: 'Edit', icon: <Pencil size={13} />, onClick: () => setEditing(c) },
            { label: 'Delete', icon: <Trash2 size={13} />, danger: true, onClick: () => setDeleting(c) },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 pt-4">
      {actionError && <div className="bg-error-bg border border-error-border rounded-lg px-4 py-2.5 text-[12.5px] text-error">{actionError}</div>}
      <div className="flex justify-end">
        <Button size="sm" icon={<Plus size={13} />} onClick={() => setCreating(true)}>New Coupon</Button>
      </div>

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        {error ? (
          <div className="p-5"><AnalyticsErrorState message={error} onRetry={refetch} /></div>
        ) : (
          <Table
            columns={columns}
            data={coupons ?? []}
            keyExtractor={(c) => c._id}
            loading={loading}
            emptyState={{ icon: <Percent size={28} className="text-slate/50" />, title: 'No platform coupons yet', description: 'Create a platform-wide code like WELCOME10 that works across any store.', action: { label: 'New Coupon', onClick: () => setCreating(true), icon: <Plus size={14} /> } }}
          />
        )}
      </div>

      {creating && <CreateCouponModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); refetch(); }} />}
      {editing && <CreateCouponModal coupon={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refetch(); }} />}

      {deleting && (
        <Modal mobileSheet
          title="Delete Coupon"
          onClose={() => setDeleting(null)}
          footer={<>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={submitting}>Delete Coupon</Button>
          </>}
        >
          <p className="text-[13px] text-charcoal leading-[1.6]">Delete coupon "<strong>{deleting.code}</strong>"? This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════ Promotion Requests ═══════════════════════════

function RejectPromotionModal({ request, onClose, onRejected }: { request: PromotionRequest; onClose: () => void; onRejected: () => void }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!reason.trim()) { setError('A rejection reason is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await apiAdminRejectPromotionRequest(request._id, reason.trim());
      onRejected();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal mobileSheet title="Reject Promotion Request" onClose={onClose} footer={<>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button variant="danger" onClick={submit} loading={submitting}>Reject</Button>
    </>}>
      <div className="flex flex-col gap-3">
        <Textarea label="Reason (shown to the seller)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Creative doesn't meet image guidelines" />
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

// Approving activates a paid placement (the seller is charged and their
// creative goes live) — same weight as Reject, which already requires a
// typed reason before submitting. This used to fire on a single click with
// no confirmation. The oversubscription conflict check that used to run
// silently after approval now runs while the confirm dialog is open, so the
// admin sees it *before* committing, not as a surprise afterward.
function ApprovePromotionModal({ request, onClose, onApproved }: { request: PromotionRequest; onClose: () => void; onApproved: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [conflictNote, setConflictNote] = useState<string | null>(null);
  const [checkingConflicts, setCheckingConflicts] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiAdminCheckPromotionConflicts(request.placement, request.startAt, request.endAt, request._id)
      .then(res => {
        if (cancelled) return;
        if (res.data.isOversubscribed) {
          setConflictNote(`${res.data.overlappingCount} other request(s) already overlap this window for ${PLACEMENT_LABEL[request.placement]} (visible slots: ${res.data.visibleLimit}). Approving will oversubscribe the placement.`);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCheckingConflicts(false); });
    return () => { cancelled = true; };
  }, [request]);

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      await apiAdminApprovePromotionRequest(request._id);
      onApproved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal mobileSheet title="Approve promotion request?" onClose={onClose} footer={<>
      <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
      <Button variant="primary" onClick={submit} loading={submitting}>Approve</Button>
    </>}>
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-charcoal leading-[1.6]">
          Approve this <strong>{PLACEMENT_LABEL[request.placement]}</strong> placement request for {formatDate(request.startAt)} – {formatDate(request.endAt)}? This activates a paid placement — the seller is charged {formatCurrency(request.priceUSD)} and their creative goes live in that slot for the approved window.
        </p>
        {checkingConflicts && <p className="text-[12px] text-slate">Checking for placement conflicts…</p>}
        {conflictNote && (
          <div className="bg-[#fdf3e7] border border-[#f5d9a8] rounded-lg px-3 py-2.5 text-[12px] text-[#9a6a17]">{conflictNote}</div>
        )}
        {error && <p className="text-[12px] text-error">{error}</p>}
      </div>
    </Modal>
  );
}

const PLACEMENT_STYLE: Record<PromotionPlacement, { Icon: typeof Store; accent: string; bg: string }> = {
  homepageHero: { Icon: Store, accent: '#64727B', bg: '#EDF2F4' },
  marketplaceHero: { Icon: Store, accent: '#1D5EAE', bg: '#EAF1FB' },
  educationHero: { Icon: GraduationCap, accent: '#7B3DAE', bg: '#F4EAFB' },
  categoryHero: { Icon: LayoutGrid, accent: '#1E7A8C', bg: '#E6F5F5' },
  productPage: { Icon: LayoutGrid, accent: '#B8651E', bg: '#FBEFE3' },
};

function daysBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

function PromotionCalendarModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<{ promotions: CalendarPromotionItem[]; campaigns: CalendarCampaignItem[] } | null>(null);
  const [error, setError] = useState('');
  const rangeStart = new Date();
  const rangeEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    apiAdminPromotionCalendar(rangeStart.toISOString(), rangeEnd.toISOString())
      .then((res) => setData(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load calendar.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = new Map<PromotionPlacement, CalendarPromotionItem[]>();
  (data?.promotions ?? []).forEach((p) => {
    const list = groups.get(p.placement) ?? [];
    list.push(p);
    groups.set(p.placement, list);
  });

  function overlaps(a: CalendarPromotionItem, b: CalendarPromotionItem) {
    return a._id !== b._id && new Date(a.startAt) < new Date(b.endAt) && new Date(a.endAt) > new Date(b.startAt);
  }

  const totalPromotions = data?.promotions.length ?? 0;
  const totalRevenue = (data?.promotions ?? []).reduce((s, p) => s + p.priceUSD, 0);
  const conflictCount = (data?.promotions ?? []).filter((p, _, all) => all.some((o) => overlaps(p, o))).length;

  return (
    <Modal mobileSheet title="Promotion Calendar" onClose={onClose} width={680}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[12px] text-slate">
          <CalendarIcon size={13} className="text-brand-orange" />
          {formatDate(rangeStart.toISOString())} – {formatDate(rangeEnd.toISOString())} <span className="text-bone">·</span> next 30 days
        </div>

        {error ? (
          <p className="text-[13px] text-error">{error}</p>
        ) : !data ? (
          <p className="text-[13px] text-slate">Loading…</p>
        ) : (
          <>
            {/* Summary strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-bone rounded-xl px-3.5 py-3">
                <p className="text-[10px] font-medium text-slate uppercase tracking-[0.06em] mb-1">Scheduled</p>
                <p className="text-[18px] font-bold text-carbon leading-[1.15]">{totalPromotions}</p>
              </div>
              <div className="bg-white border border-bone rounded-xl px-3.5 py-3">
                <p className="text-[10px] font-medium text-slate uppercase tracking-[0.06em] mb-1">Revenue in Window</p>
                <p className="text-[18px] font-bold text-carbon leading-[1.15]">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="rounded-[10px] px-3.5 py-3 border" style={{ background: conflictCount > 0 ? '#FDF3E7' : '#EAF7EF', borderColor: conflictCount > 0 ? '#F5D9A8' : '#CFEEDA' }}>
                <p className="text-[10px] font-medium uppercase tracking-[0.06em] mb-1" style={{ color: conflictCount > 0 ? '#9A6A17' : '#1E7A3C' }}>Conflicts</p>
                <p className="text-[18px] font-bold leading-[1.15]" style={{ color: conflictCount > 0 ? '#9A6A17' : '#1E7A3C' }}>{conflictCount}</p>
              </div>
            </div>

            <div className="flex flex-col gap-5 max-h-[50vh] overflow-y-auto pr-1">
              {groups.size === 0 ? (
                <EmptyState
                  icon={<CalendarIcon size={28} className="text-slate/50" />}
                  title="Nothing scheduled"
                  description="No approved or active platform promotions fall in the next 30 days."
                />
              ) : (
                [...groups.entries()].map(([placement, items]) => {
                  const style = PLACEMENT_STYLE[placement];
                  return (
                    <div key={placement}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: style.bg }}>
                          <style.Icon size={13} style={{ color: style.accent }} />
                        </span>
                        <p className="text-[12.5px] font-bold text-carbon">{PLACEMENT_LABEL[placement]}</p>
                        <span className="text-[12px] text-slate">{items.length} scheduled</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {[...items].sort((a, b) => a.startAt.localeCompare(b.startAt)).map((p) => {
                          const conflicted = items.some((other) => overlaps(p, other));
                          return (
                            <div
                              key={p._id}
                              className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border-l-[3px] bg-white border border-bone"
                              style={{ borderLeftColor: conflicted ? '#E0A64A' : style.accent }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] text-charcoal font-medium whitespace-nowrap">{formatDate(p.startAt)} – {formatDate(p.endAt)}</p>
                                <p className="text-[12px] text-slate">{daysBetween(p.startAt, p.endAt)} day{daysBetween(p.startAt, p.endAt) !== 1 ? 's' : ''}</p>
                              </div>
                              <span className="text-[12.5px] font-semibold text-charcoal shrink-0">{formatCurrency(p.priceUSD)}</span>
                              {conflicted ? (
                                <span className="flex items-center gap-1 text-[12px] font-medium text-[#9a6a17] bg-[#fdf3e7] px-2 py-1 rounded-md shrink-0"><AlertTriangle size={11} /> Overlap</span>
                              ) : (
                                <span className="flex items-center gap-1 text-[12px] font-medium text-success bg-success-bg px-2 py-1 rounded-md shrink-0"><ShieldCheck size={11} /> Clear</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}

              {data.campaigns.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-brand-pale-orange">
                      <Megaphone size={13} className="text-brand-deep-orange" />
                    </span>
                    <p className="text-[12.5px] font-bold text-carbon">Sale Campaigns</p>
                    <span className="text-[12px] text-slate">{data.campaigns.length} running</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {data.campaigns.map((c) => (
                      <div key={c._id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border-l-[3px] border-brand-orange bg-white border border-bone">
                        <span className="text-[12.5px] text-charcoal font-medium truncate">{c.name}</span>
                        <span className="text-[12px] text-slate whitespace-nowrap">{formatDate(c.startDate)} – {formatDate(c.endDate)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// Homepage Hero is deliberately excluded below — the buyer-facing Homepage has
// no hero banner surface wired up at all, so it's kept out of every
// seller/admin-facing placement picker (see SELECTABLE_PROMOTION_PLACEMENTS).
const PLACEMENT_LIMIT_META: { key: keyof PlacementLimits; label: string }[] = [
  { key: 'marketplaceHero', label: 'Marketplace Hero' },
  { key: 'educationHero', label: 'Education Marketplace Hero' },
  { key: 'categoryHero', label: 'Category Hero' },
  { key: 'productPage', label: 'Product Page Banner' },
  { key: 'storeHero', label: 'Store Hero (per store)' },
  { key: 'storeFeaturedProducts', label: 'Store Featured Products' },
];

const PRICING_PLACEMENTS: { key: 'marketplaceHero' | 'educationHero' | 'categoryHero'; label: string }[] = [
  { key: 'marketplaceHero', label: 'Marketplace Hero' },
  { key: 'educationHero', label: 'Education Marketplace Hero' },
  { key: 'categoryHero', label: 'Category Hero' },
];

const RATE_INPUT_CLS = 'w-full px-2 py-1.5 text-[12.5px] border border-bone rounded-md outline-none text-charcoal bg-white text-right transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange/50';

// ── Promotion Settings modal — placement visible-limits + the pricing rate card,
// tucked away here (not on the general Platform Config page) since both only
// matter in the context of reviewing/approving promotion requests. ──────────
function PromotionSettingsModal({ onClose }: { onClose: () => void }) {
  const { data, loading, refetch } = useAdminConfig();
  const { update: updateLimits, submitting: savingLimits, error: limitsError } = useUpdatePlacementLimits();
  const { update: updatePricing, submitting: savingPricing, error: pricingError } = useUpdatePromotionPricing();

  const [limits, setLimits] = useState<PlacementLimits | null>(null);
  const [rates, setRates] = useState<Record<string, PlacementRateCard>>({});
  const [limitsSaved, setLimitsSaved] = useState(false);
  const [pricingSaved, setPricingSaved] = useState(false);

  const [synced, setSynced] = useState<typeof data>(null);
  if (data && data !== synced) {
    setSynced(data);
    setLimits(data.placementLimits);
    setRates(data.promotionPricing ?? {});
  }

  function setRateField(placement: string, field: keyof PlacementRateCard, value: number) {
    setPricingSaved(false);
    setRates((r) => ({ ...r, [placement]: { ...r[placement], [field]: value } }));
  }

  async function saveLimits() {
    if (!limits) return;
    const ok = await updateLimits(limits);
    if (ok) { setLimitsSaved(true); refetch(); }
  }

  async function savePricing() {
    const ok = await updatePricing(rates);
    if (ok) { setPricingSaved(true); refetch(); }
  }

  return (
    <Modal mobileSheet title="Promotion Settings" onClose={onClose} width={640}>
      {loading || !limits ? (
        <p className="text-[13px] text-slate">Loading…</p>
      ) : (
        <div className="flex flex-col gap-6 max-h-[65vh] overflow-y-auto pr-1">
          {/* Placement Limits */}
          <div>
            <p className="text-[13px] font-bold text-carbon mb-1">Placement Limits</p>
            <p className="text-[12px] text-slate mb-3">How many banners rotate at once per placement. Creating banners is always unlimited — this only bounds the display.</p>
            <div className="flex flex-col divide-y divide-bone rounded-lg border border-bone overflow-hidden">
              {PLACEMENT_LIMIT_META.map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-3 px-3.5 py-2 bg-white">
                  <span className="text-[12.5px] text-charcoal">{p.label}</span>
                  <input
                    type="number" min={1}
                    value={limits[p.key] ?? ''}
                    onChange={(e) => { setLimitsSaved(false); setLimits((v) => v && ({ ...v, [p.key]: Number(e.target.value) })); }}
                    className="w-16 px-2 py-1 text-[12.5px] border border-bone rounded-md outline-none text-right focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange/50"
                  />
                </div>
              ))}
            </div>
            {limitsError && <p className="text-[12px] text-error mt-2">{limitsError}</p>}
            <div className="flex items-center gap-2 mt-2.5">
              <Button size="sm" onClick={saveLimits} loading={savingLimits}>Save Limits</Button>
              {limitsSaved && <span className="text-[12px] text-success">Saved</span>}
            </div>
          </div>

          {/* Promotion Pricing */}
          <div>
            <p className="text-[13px] font-bold text-carbon mb-1">Promotion Pricing</p>
            <p className="text-[12px] text-slate mb-3">Rate card sellers are quoted/charged for a paid placement. A blank rate stays unset (quotes show $0 for that unit).</p>
            <div className="overflow-x-auto rounded-lg border border-bone">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-cream">
                    <th className="text-left font-semibold text-slate px-3 py-2 whitespace-nowrap">Placement</th>
                    <th className="font-semibold text-slate px-2 py-2 whitespace-nowrap">Hourly</th>
                    <th className="font-semibold text-slate px-2 py-2 whitespace-nowrap">Daily</th>
                    <th className="font-semibold text-slate px-2 py-2 whitespace-nowrap">Weekly</th>
                    <th className="font-semibold text-slate px-2 py-2 whitespace-nowrap">Monthly</th>
                    <th className="font-semibold text-slate px-2 py-2 whitespace-nowrap">Weekend ×</th>
                    <th className="font-semibold text-slate px-2 py-2 whitespace-nowrap">Peak ×</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING_PLACEMENTS.map((p) => {
                    const card = rates[p.key] ?? {};
                    return (
                      <tr key={p.key} className="border-t border-bone">
                        <td className="px-3 py-2 text-charcoal font-medium whitespace-nowrap">{p.label}</td>
                        <td className="px-1.5 py-1.5"><input type="number" min={0} value={card.hourly ?? ''} onChange={(e) => setRateField(p.key, 'hourly', Number(e.target.value))} className={RATE_INPUT_CLS} /></td>
                        <td className="px-1.5 py-1.5"><input type="number" min={0} value={card.daily ?? ''} onChange={(e) => setRateField(p.key, 'daily', Number(e.target.value))} className={RATE_INPUT_CLS} /></td>
                        <td className="px-1.5 py-1.5"><input type="number" min={0} value={card.weekly ?? ''} onChange={(e) => setRateField(p.key, 'weekly', Number(e.target.value))} className={RATE_INPUT_CLS} /></td>
                        <td className="px-1.5 py-1.5"><input type="number" min={0} value={card.monthly ?? ''} onChange={(e) => setRateField(p.key, 'monthly', Number(e.target.value))} className={RATE_INPUT_CLS} /></td>
                        <td className="px-1.5 py-1.5"><input type="number" min={1} step="0.1" value={card.weekendMultiplier ?? ''} onChange={(e) => setRateField(p.key, 'weekendMultiplier', Number(e.target.value))} className={RATE_INPUT_CLS} /></td>
                        <td className="px-1.5 py-1.5"><input type="number" min={1} step="0.1" value={card.peakMultiplier ?? ''} onChange={(e) => setRateField(p.key, 'peakMultiplier', Number(e.target.value))} className={RATE_INPUT_CLS} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pricingError && <p className="text-[12px] text-error mt-2">{pricingError}</p>}
            <div className="flex items-center gap-2 mt-2.5">
              <Button size="sm" onClick={savePricing} loading={savingPricing}>Save Pricing</Button>
              {pricingSaved && <span className="text-[12px] text-success">Saved</span>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function PromotionsTab() {
  const [requests, setRequests] = useState<PromotionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejecting, setRejecting] = useState<PromotionRequest | null>(null);
  const [approving, setApproving] = useState<PromotionRequest | null>(null);
  const [analytics, setAnalytics] = useState<(PromotionAnalyticsData & { platformRevenueUSD: number }) | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [analyticsError, setAnalyticsError] = useState('');
  const loadAnalytics = () => {
    setAnalyticsError('');
    apiGetAdminPromotionAnalytics()
      .then((res) => setAnalytics(res.data))
      .catch((err) => setAnalyticsError(err instanceof Error ? err.message : 'Could not load promotion analytics.'));
  };
  useEffect(() => { loadAnalytics(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function refetch() {
    setLoading(true);
    apiAdminListPromotionRequests(statusFilter || undefined)
      .then((res) => setRequests(res.data ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load promotion requests.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const columns: TableColumn<PromotionRequest>[] = [
    { key: 'creative', header: '', render: (r) => <img src={r.creativeUrl} alt="" className="w-16 h-9 object-cover rounded-md bg-cream" /> },
    { key: 'placement', header: 'Placement', render: (r) => <span className="text-[13px] font-medium text-charcoal">{PLACEMENT_LABEL[r.placement]}</span> },
    { key: 'window', header: 'Window', render: (r) => <span className="text-[12px] text-graphite whitespace-nowrap">{formatDate(r.startAt)} – {formatDate(r.endAt)}</span> },
    { key: 'price', header: 'Price', render: (r) => <span className="text-[13px] font-semibold text-charcoal">{formatCurrency(r.priceUSD)}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Actions', align: 'center',
      render: (r) => r.status === 'pending' ? (
        <div className="flex items-center gap-1.5 justify-center">
          <button onClick={() => setApproving(r)}
            className="px-2.5 py-1 rounded-md text-[12px] font-semibold text-white bg-success border-0 cursor-pointer disabled:opacity-50 flex items-center gap-1">
            <Check size={12} /> Approve
          </button>
          <button onClick={() => setRejecting(r)}
            className="px-2.5 py-1 rounded-md text-[12px] font-semibold text-error bg-error-bg border-0 cursor-pointer disabled:opacity-50 flex items-center gap-1">
            <X size={12} /> Reject
          </button>
        </div>
      ) : <span className="text-[12px] text-slate text-center block">—</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4 pt-4">
      {analyticsError && <AnalyticsErrorState message={analyticsError} onRetry={loadAnalytics} />}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {[
            ['Impressions', analytics.impressions.toLocaleString()],
            ['Clicks', analytics.clicks.toLocaleString()],
            ['CTR', `${analytics.ctr.toFixed(1)}%`],
            ['Orders', analytics.orders.toLocaleString()],
            ['Buyer Revenue', formatCurrency(analytics.revenueUSD)],
            ['Ad Revenue', formatCurrency(analytics.platformRevenueUSD)],
          ].map(([label, value]) => (
            <div key={label} className="bg-white border border-bone rounded-xl px-3.5 py-3">
              <p className="text-[10px] font-medium text-slate uppercase tracking-[0.06em] mb-1">{label}</p>
              <p className="text-[18px] font-bold text-carbon leading-[1.15]">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-auto">
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="active">Live</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Ended</option>
          <option value="">All</option>
        </Select>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" icon={<CalendarIcon size={13} />} onClick={() => setShowCalendar(true)}>View Calendar</Button>
          <Button variant="outline" size="sm" icon={<Settings size={13} />} onClick={() => setShowSettings(true)}>Pricing & Limits</Button>
        </div>
      </div>

      <div className="bg-white border border-bone rounded-xl overflow-hidden">
        {error ? (
          <div className="p-5"><AnalyticsErrorState message={error} onRetry={refetch} /></div>
        ) : (
          <Table
            columns={columns}
            data={requests}
            keyExtractor={(r) => r._id}
            loading={loading}
            emptyState={{ icon: <Rocket size={28} className="text-slate/50" />, title: 'No promotion requests', description: 'Seller-submitted requests for paid placements will show up here.' }}
          />
        )}
      </div>

      {rejecting && (
        <RejectPromotionModal
          request={rejecting}
          onClose={() => setRejecting(null)}
          onRejected={() => { setRejecting(null); refetch(); }}
        />
      )}

      {approving && (
        <ApprovePromotionModal
          request={approving}
          onClose={() => setApproving(null)}
          onApproved={() => { setApproving(null); refetch(); }}
        />
      )}

      {showCalendar && <PromotionCalendarModal onClose={() => setShowCalendar(false)} />}
      {showSettings && <PromotionSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

// ═══════════════════════════════ Page ════════════════════════════════════════

export function AdminMarketing() {
  usePageTitle('Marketing');
  const [tab, setTab] = useState('campaigns');

  return (
    <>
      <AdminStudioHeader eyebrow="Edudeen team workspace · Growth" title="Marketing" subtitle="Platform-wide sale campaigns and coupon codes, separate from each seller's own store coupons." />
      <div className="px-4 sm:px-7 pt-6 pb-8 flex flex-col gap-5">
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'campaigns' ? <CampaignsTab /> : tab === 'coupons' ? <CouponsTab /> : <PromotionsTab />}
      </div>
    </>
  );
}
