import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { StorePageHeader, useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { Modal } from '@/components/comman/ui/Modal';
import { EmptyState, SkeletonBox, Table, type TableColumn } from '@/components/comman/ui';
import { Star, Trophy, Gift, Users, Settings, Award, Gem, Trash2, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  apiGetLoyaltyOverview, apiGetLoyaltyProgram, apiUpdateLoyaltyProgram, apiUpdateEarningRules,
  apiUpdateTiers, apiGetLoyaltyMembers, apiGetMemberTransactions, apiAwardPoints,
  apiCreateReward, apiGetRewardsForManagement, apiUpdateReward, apiDeleteReward,
  type LoyaltyProgram, type LoyaltyOverview, type LoyaltyMember, type LoyaltyTransaction,
  type Reward, type RewardType, type LoyaltyTier,
} from '@/api/services/loyalty';

type TabId = 'overview' | 'tiers' | 'rewards' | 'members' | 'earning-rules';

const TABS: { id: TabId; Icon: LucideIcon; label: string }[] = [
  { id: 'overview',      Icon: Star,     label: 'Overview'        },
  { id: 'tiers',         Icon: Trophy,   label: 'Tiers'           },
  { id: 'rewards',       Icon: Gift,     label: 'Rewards Catalog' },
  { id: 'members',       Icon: Users,    label: 'Member Activity' },
  { id: 'earning-rules', Icon: Settings, label: 'Earning Rules'   },
];

const TIER_ICONS: Record<string, { Icon: LucideIcon; color: string }> = {
  bronze:   { Icon: Award, color: '#CD7F32' },
  silver:   { Icon: Award, color: '#A0A0A0' },
  gold:     { Icon: Award, color: '#D4A017' },
  platinum: { Icon: Gem,   color: '#4A90D9' },
};

const INPUT_CLS = 'w-full px-3 py-2 text-[13px] border border-bone rounded-lg outline-none text-charcoal bg-white box-border transition-shadow duration-150 focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange/50';

const ACTIVITY_LABELS: Record<string, string> = {
  purchase: 'Points Earned from Purchases',
  review: 'Points Earned from Reviews',
  referral: 'Points Earned from Referrals',
  birthday: 'Birthday Bonuses',
  adjustment: 'Manual Adjustments',
  expire: 'Points Expired',
  redeem: 'Points Redeemed',
};

export function StoreLoyalty() {
  usePageTitle('Loyalty');
  const { storeId } = useStoreWorkspace();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateReward, setShowCreateReward] = useState(false);
  const [awardingMember, setAwardingMember] = useState<LoyaltyMember | null>(null);

  useEffect(() => {
    if (!storeId) return;
    apiGetLoyaltyProgram(storeId).then(res => setProgram(res.data)).catch(() => {});
  }, [storeId]);

  return (
    <>
      <StorePageHeader
        title="Loyalty & Rewards"
        subtitle="Build lasting customer relationships with a points-based loyalty program."
        actions={
          <>
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 px-2.5 sm:px-4 py-[7px] bg-white border border-bone rounded-lg text-xs font-medium text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">
              <Settings size={13} className="sm:hidden" /> <span className="hidden sm:inline">Program Settings</span>
            </button>
            <button onClick={() => setShowCreateReward(true)} className="flex items-center gap-1.5 px-2.5 sm:px-4 py-[7px] bg-brand-orange border-none rounded-lg text-xs font-semibold text-white cursor-pointer transition-colors duration-150 hover:bg-brand-deep-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50">
              <Plus size={13} /> <span className="hidden sm:inline">Create Reward</span>
            </button>
          </>
        }
      />

      <div className="px-4 lg:px-7 pb-8 pt-5 flex flex-col gap-5">

        {program && !program.isEnabled && (
          <div className="bg-[#fff4dc] border border-[#f0d9a0] rounded-[10px] px-4 py-3 text-xs text-[#8a6200]">
            Loyalty program is currently <strong>disabled</strong> — customers aren't earning points yet. Enable it from Program Settings.
          </div>
        )}

        <div className="border-b border-bone overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-0.5 w-max">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-[10px] text-[13px] font-medium cursor-pointer border-none rounded-tl-lg rounded-tr-lg flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors duration-150 hover:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
                style={{
                  background: activeTab === tab.id ? '#fff' : 'transparent',
                  color: activeTab === tab.id ? '#141413' : '#8C8A82',
                  borderBottom: activeTab === tab.id ? '2px solid #174771' : '2px solid transparent',
                }}
              >
                <tab.Icon size={13} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && <OverviewTab storeId={storeId} />}
        {activeTab === 'tiers' && program && <TiersTab storeId={storeId} program={program} onSaved={setProgram} />}
        {activeTab === 'rewards' && <RewardsTab storeId={storeId} showCreate={showCreateReward} onCloseCreate={() => setShowCreateReward(false)} />}
        {activeTab === 'members' && <MembersTab storeId={storeId} onAward={setAwardingMember} />}
        {activeTab === 'earning-rules' && program && <EarningRulesTab storeId={storeId} program={program} onSaved={setProgram} />}
      </div>

      {showSettings && program && (
        <ProgramSettingsModal storeId={storeId} program={program} onClose={() => setShowSettings(false)} onSaved={p => { setProgram(p); setShowSettings(false); }} />
      )}
      {awardingMember && (
        <AwardPointsModal storeId={storeId} member={awardingMember} onClose={() => setAwardingMember(null)} />
      )}
    </>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────

function OverviewTab({ storeId }: { storeId: string }) {
  const [data, setData] = useState<LoyaltyOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    apiGetLoyaltyOverview(storeId).then(res => setData(res.data)).finally(() => setLoading(false));
  }, [storeId]);

  if (loading) return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-bone rounded-[10px] px-5 py-4 flex flex-col gap-2">
            <SkeletonBox width="60%" height={11} />
            <SkeletonBox width="40%" height={24} />
          </div>
        ))}
      </div>
    </div>
  );
  if (!data) return <p className="text-xs text-error">Failed to load overview.</p>;

  const metrics = [
    { label: 'Program Members', value: data.programMembers.toLocaleString() },
    { label: 'Points Issued (30d)', value: data.pointsIssuedLast30Days.toLocaleString() },
    { label: 'Points Redeemed', value: data.pointsRedeemedTotal.toLocaleString() },
    { label: 'Revenue from Members (30d)', value: `$${data.revenueFromMembersLast30Days.toFixed(2)}` },
  ];

  const activityRows = Object.entries(ACTIVITY_LABELS).map(([type, label]) => ({
    label, value: data.pointsActivityLast30Days[type] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-white border border-bone rounded-[10px] px-5 py-4">
            <p className="text-[11px] font-medium text-slate uppercase tracking-[0.06em] mb-1">{m.label}</p>
            <p className="text-[28px] font-bold text-carbon leading-[1.15]">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
          <p className="text-[14px] font-bold text-carbon mb-[18px]">Member Distribution</p>
          {(data.memberDistribution ?? []).length === 0 ? (
            <p className="text-xs text-slate italic">No tiers configured yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {(data.memberDistribution ?? []).map(tier => {
                const style = TIER_ICONS[tier.tier.toLowerCase()] ?? { Icon: Award, color: '#8C8A82' };
                return (
                  <div key={tier.tier}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <style.Icon size={18} style={{ color: style.color }} />
                        <span className="text-[13px] font-semibold text-graphite">{tier.tier}</span>
                      </div>
                      <span className="text-xs text-slate">{tier.members.toLocaleString()} members</span>
                    </div>
                    <div className="h-2 rounded-[4px] bg-bone overflow-hidden">
                      <div className="h-full rounded-[4px]" style={{ width: `${tier.percent}%`, background: style.color }} />
                    </div>
                    <p className="text-[11px] text-slate mt-[3px] text-right">{tier.percent}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5">
          <p className="text-[14px] font-bold text-carbon mb-[18px]">Points Activity (Last 30 Days)</p>
          <div className="flex flex-col">
            {activityRows.map((item, i) => {
              const isRedeemLike = item.value < 0;
              return (
                <div key={item.label} className="flex items-center justify-between py-[10px]" style={{ borderBottom: i < activityRows.length - 1 ? '1px solid #F0EEE6' : 'none' }}>
                  <span className="text-[13px] text-graphite">{item.label}</span>
                  <span className="text-[13px] font-bold" style={{ color: isRedeemLike ? '#C13030' : '#2D8A4E' }}>
                    {item.value > 0 ? '+' : ''}{item.value.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tiers ─────────────────────────────────────────────────────────────────────

function TiersTab({ storeId, program, onSaved }: { storeId: string; program: LoyaltyProgram; onSaved: (p: LoyaltyProgram) => void }) {
  const [tiers, setTiers] = useState<LoyaltyTier[]>(program.tiers ?? []);
  const [saving, setSaving] = useState(false);

  function update(i: number, patch: Partial<LoyaltyTier>) {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await apiUpdateTiers(storeId, tiers);
      onSaved(res.data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5 flex flex-col gap-4">
      <p className="text-[14px] font-bold text-carbon">Tier Thresholds</p>
      {tiers.map((tier, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_1fr_32px] gap-2.5 items-end">
          <div>
            <label className="text-xs font-medium text-graphite mb-[5px] block">Tier Name</label>
            <input value={tier.name} onChange={e => update(i, { name: e.target.value })}
              className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-xs font-medium text-graphite mb-[5px] block">Min Points</label>
            <input type="number" value={tier.minPoints} onChange={e => update(i, { minPoints: Number(e.target.value) })}
              className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-xs font-medium text-graphite mb-[5px] block">Benefits (comma-separated)</label>
            <input value={tier.benefits.join(', ')} onChange={e => update(i, { benefits: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              className={INPUT_CLS} />
          </div>
          <button onClick={() => setTiers(prev => prev.filter((_, idx) => idx !== i))} className="w-8 h-8 flex items-center justify-center bg-white border border-bone rounded-lg text-error cursor-pointer transition-colors duration-150 hover:bg-error hover:text-white hover:border-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={() => setTiers(prev => [...prev, { name: '', minPoints: 0, benefits: [] }])} className="px-3.5 py-[7px] bg-white border border-bone rounded-lg text-xs font-medium text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">
          + Add Tier
        </button>
        <button onClick={save} disabled={saving} className="px-6 py-[7px] bg-brand-orange border-none rounded-lg text-xs font-semibold text-white cursor-pointer transition-colors duration-150 hover:bg-brand-deep-orange disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50">
          {saving ? 'Saving…' : 'Save Tiers'}
        </button>
      </div>
    </div>
  );
}

// ── Rewards Catalog ───────────────────────────────────────────────────────────

const emptyRewardForm = { name: '', description: '', pointsCost: '', type: 'fixed_discount' as RewardType, discountValue: '', productId: '', stockLimit: '' };

function RewardsTab({ storeId, showCreate, onCloseCreate }: { storeId: string; showCreate: boolean; onCloseCreate: () => void }) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyRewardForm);

  useEffect(() => {
    if (!storeId) return;
    apiGetRewardsForManagement(storeId).then(res => setRewards(res.data ?? [])).finally(() => setLoading(false));
  }, [storeId]);

  async function handleCreate() {
    if (!form.name || !form.pointsCost) return;
    const res = await apiCreateReward(storeId, {
      name: form.name,
      description: form.description || undefined,
      pointsCost: Number(form.pointsCost),
      type: form.type,
      discountValue: form.discountValue ? Number(form.discountValue) : undefined,
      productId: form.productId || undefined,
      stockLimit: form.stockLimit ? Number(form.stockLimit) : undefined,
    });
    setRewards(prev => [res.data, ...prev]);
    setForm(emptyRewardForm);
    onCloseCreate();
  }

  async function toggleActive(r: Reward) {
    const res = await apiUpdateReward(storeId, r._id, { isActive: !r.isActive });
    setRewards(prev => prev.map(x => x._id === r._id ? res.data : x));
  }

  async function remove(r: Reward) {
    await apiDeleteReward(storeId, r._id);
    setRewards(prev => prev.filter(x => x._id !== r._id));
  }

  return (
    <div className="flex flex-col gap-5">
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-bone rounded-[10px] px-[22px] py-5 flex flex-col gap-3">
              <SkeletonBox width="70%" height={16} />
              <SkeletonBox width="40%" height={13} />
              <SkeletonBox width="100%" height={30} rounded="7px" />
            </div>
          ))}
        </div>
      ) : rewards.length === 0 ? (
        <EmptyState
          icon={<Gift size={28} className="text-brand-orange opacity-55" />}
          title="No rewards yet"
          description={'Click "+ Create Reward" to add your first reward.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map(r => (
            <div key={r._id} className="bg-white border border-bone rounded-[10px] px-[22px] py-5 transition-transform duration-200 hover:-translate-y-[1px]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-carbon">{r.name}</p>
                <span className="px-2.5 py-[3px] rounded-[5px] text-[11px] font-semibold" style={{ background: r.isActive ? '#E3F4EA' : '#F0EEE6', color: r.isActive ? '#1E7A3C' : '#5A5852' }}>
                  {r.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {r.description && <p className="text-xs text-slate mb-2">{r.description}</p>}
              <p className="text-[13px] font-bold text-brand-orange mb-3">{r.pointsCost} points</p>
              <p className="text-xs text-slate mb-3">
                {r.type === 'fixed_discount' ? `$${r.discountValue} discount` : `Free product`}
                {r.stockLimit != null && ` — ${r.redeemedCount}/${r.stockLimit} redeemed`}
              </p>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(r)} className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">
                  {r.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => remove(r)} className="flex-1 py-[7px] bg-white border border-bone rounded-[7px] text-xs text-error cursor-pointer transition-colors duration-150 hover:bg-error hover:text-white hover:border-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="Create Reward" onClose={onCloseCreate} mobileSheet footer={
          <>
            <button onClick={onCloseCreate} className="px-4 py-2 bg-white border border-bone rounded-lg text-xs font-medium text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 bg-brand-orange border-none rounded-lg text-xs font-semibold text-white cursor-pointer transition-colors duration-150 hover:bg-brand-deep-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50">Create</button>
          </>
        }>
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Points Cost</label>
              <input type="number" value={form.pointsCost} onChange={e => setForm(f => ({ ...f, pointsCost: e.target.value }))}
                className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as RewardType }))}
                className={`${INPUT_CLS} cursor-pointer`}>
                <option value="fixed_discount">Fixed Discount</option>
                <option value="free_product">Free Product</option>
              </select>
            </div>
            {form.type === 'fixed_discount' ? (
              <div>
                <label className="text-xs font-medium text-graphite mb-[5px] block">Discount Value ($)</label>
                <input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                  className={INPUT_CLS} />
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-graphite mb-[5px] block">Product ID</label>
                <input value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                  className={INPUT_CLS} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-graphite mb-[5px] block">Stock Limit (optional)</label>
              <input type="number" value={form.stockLimit} onChange={e => setForm(f => ({ ...f, stockLimit: e.target.value }))}
                className={INPUT_CLS} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Member Activity ───────────────────────────────────────────────────────────

function MembersTab({ storeId, onAward }: { storeId: string; onAward: (m: LoyaltyMember) => void }) {
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    apiGetLoyaltyMembers(storeId).then(res => { setMembers(res.data.members ?? []); setTotal(res.data.pagination.total); }).finally(() => setLoading(false));
  }, [storeId]);

  const columns: TableColumn<LoyaltyMember>[] = [
    {
      key: 'user', header: 'Customer',
      render: m => (
        <div>
          <p className="font-semibold text-charcoal">{m.user?.name ?? 'Unknown'}</p>
          <p className="text-[11px] text-slate">{m.user?.email}</p>
        </div>
      ),
    },
    { key: 'pointsBalance', header: 'Points Balance', render: m => <span className="font-semibold text-charcoal">{m.pointsBalance.toLocaleString()}</span> },
    { key: 'lifetimePoints', header: 'Lifetime Points', render: m => <span className="text-slate">{m.lifetimePoints.toLocaleString()}</span> },
    { key: 'currentTier', header: 'Tier', render: m => <span className="text-slate">{m.currentTier ?? '—'}</span> },
    { key: 'lastActivityAt', header: 'Last Activity', render: m => <span className="text-slate">{new Date(m.lastActivityAt).toLocaleDateString()}</span> },
    {
      key: 'actions', header: '',
      render: m => <button onClick={() => onAward(m)} className="text-xs font-medium text-brand-orange bg-transparent border-none cursor-pointer transition-opacity duration-150 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50 rounded-sm">Award Points</button>,
    },
  ];

  return (
    <div className="bg-white border border-bone rounded-[10px] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-bone">
        <p className="text-[13px] font-semibold text-carbon">{loading ? 'Loading members…' : `${total} Member${total === 1 ? '' : 's'}`}</p>
      </div>
      <Table
        columns={columns}
        data={members}
        keyExtractor={m => m._id}
        loading={loading}
        emptyState={{ icon: <Users size={28} className="text-brand-orange opacity-55" />, title: 'No loyalty members yet', description: 'Members will appear here once customers start earning points.' }}
      />
    </div>
  );
}

// ── Earning Rules ─────────────────────────────────────────────────────────────

function EarningRulesTab({ storeId, program, onSaved }: { storeId: string; program: LoyaltyProgram; onSaved: (p: LoyaltyProgram) => void }) {
  const [form, setForm] = useState({
    pointsPerDollar: String(program.pointsPerDollar),
    pointsPerReview: String(program.pointsPerReview),
    pointsPerReferral: String(program.pointsPerReferral),
    birthdayBonusPoints: String(program.birthdayBonusPoints),
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await apiUpdateEarningRules(storeId, {
        pointsPerDollar: Number(form.pointsPerDollar),
        pointsPerReview: Number(form.pointsPerReview),
        pointsPerReferral: Number(form.pointsPerReferral),
        birthdayBonusPoints: Number(form.birthdayBonusPoints),
      });
      onSaved(res.data);
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof typeof form; label: string; hint: string }[] = [
    { key: 'pointsPerDollar', label: 'Points per $1 spent', hint: 'Awarded automatically when an order is completed' },
    { key: 'pointsPerReview', label: 'Points per verified review', hint: 'Awarded automatically for a star rating on a verified purchase' },
    { key: 'pointsPerReferral', label: 'Points per referral', hint: 'Awarded manually from Member Activity until referrals are automated' },
    { key: 'birthdayBonusPoints', label: 'Birthday bonus points', hint: 'Awarded manually from Member Activity until birthdate collection is automated' },
  ];

  return (
    <div className="bg-white border border-bone rounded-[10px] px-[22px] py-5 flex flex-col gap-4 max-w-[480px]">
      <p className="text-[14px] font-bold text-carbon">Earning Rules</p>
      {fields.map(f => (
        <div key={f.key}>
          <label className="text-xs font-medium text-graphite mb-[5px] block">{f.label}</label>
          <input type="number" value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            className={INPUT_CLS} />
          <p className="text-[11px] text-slate mt-1">{f.hint}</p>
        </div>
      ))}
      <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-brand-orange border-none rounded-lg text-[13px] font-semibold text-white cursor-pointer self-start transition-colors duration-150 hover:bg-brand-deep-orange disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50">
        {saving ? 'Saving…' : 'Save Earning Rules'}
      </button>
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

function ProgramSettingsModal({ storeId, program, onClose, onSaved }: { storeId: string; program: LoyaltyProgram; onClose: () => void; onSaved: (p: LoyaltyProgram) => void }) {
  const [isEnabled, setIsEnabled] = useState(program.isEnabled);
  const [expiry, setExpiry] = useState(program.pointsExpiryMonths != null ? String(program.pointsExpiryMonths) : '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await apiUpdateLoyaltyProgram(storeId, { isEnabled, pointsExpiryMonths: expiry ? Number(expiry) : null });
      onSaved(res.data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Program Settings" onClose={onClose} mobileSheet footer={
      <>
        <button onClick={onClose} className="px-4 py-2 bg-white border border-bone rounded-lg text-xs font-medium text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">Cancel</button>
        <button onClick={save} disabled={saving} className="px-4 py-2 bg-brand-orange border-none rounded-lg text-xs font-semibold text-white cursor-pointer transition-colors duration-150 hover:bg-brand-deep-orange disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </>
    }>
      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)} className="w-4 h-4 cursor-pointer" />
          <span className="text-[13px] text-graphite">Loyalty program enabled</span>
        </label>
        <div>
          <label className="text-xs font-medium text-graphite mb-[5px] block">Points expire after (months)</label>
          <input type="number" placeholder="Leave blank for never" value={expiry} onChange={e => setExpiry(e.target.value)}
            className={INPUT_CLS} />
        </div>
      </div>
    </Modal>
  );
}

function AwardPointsModal({ storeId, member, onClose }: { storeId: string; member: LoyaltyMember; onClose: () => void }) {
  const [points, setPoints] = useState('');
  const [type, setType] = useState<'referral' | 'birthday' | 'adjustment'>('birthday');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<LoyaltyTransaction[]>([]);

  useEffect(() => {
    apiGetMemberTransactions(storeId, member._id).then(res => setHistory(res.data.transactions ?? [])).catch(() => {});
  }, [storeId, member._id]);

  async function submit() {
    if (!points || !description) return;
    setSaving(true);
    try {
      await apiAwardPoints(storeId, member._id, { points: Number(points), type, description });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Award Points — ${member.user?.name ?? 'Member'}`} onClose={onClose} width={480} mobileSheet footer={
      <>
        <button onClick={onClose} className="px-4 py-2 bg-white border border-bone rounded-lg text-xs font-medium text-graphite cursor-pointer transition-colors duration-150 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50">Cancel</button>
        <button onClick={submit} disabled={saving} className="px-4 py-2 bg-brand-orange border-none rounded-lg text-xs font-semibold text-white cursor-pointer transition-colors duration-150 hover:bg-brand-deep-orange disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-orange/50">
          {saving ? 'Awarding…' : 'Award'}
        </button>
      </>
    }>
      <div className="flex flex-col gap-3.5 mb-4">
        <div>
          <label className="text-xs font-medium text-graphite mb-[5px] block">Points (negative to deduct)</label>
          <input type="number" value={points} onChange={e => setPoints(e.target.value)}
            className={INPUT_CLS} />
        </div>
        <div>
          <label className="text-xs font-medium text-graphite mb-[5px] block">Reason</label>
          <select value={type} onChange={e => setType(e.target.value as 'referral' | 'birthday' | 'adjustment')}
            className={`${INPUT_CLS} cursor-pointer`}>
            <option value="birthday">Birthday bonus</option>
            <option value="referral">Referral bonus</option>
            <option value="adjustment">Manual adjustment</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-graphite mb-[5px] block">Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)}
            className={INPUT_CLS} />
        </div>
      </div>

      <p className="text-[11px] font-semibold text-slate uppercase tracking-[0.07em] mb-2">Recent History</p>
      <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-xs text-slate italic">No transactions yet.</p>
        ) : history.map(tx => (
          <div key={tx._id} className="flex justify-between items-center bg-cream rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-bone">
            <div>
              <p className="text-[11px] font-semibold text-carbon">{tx.description ?? tx.type}</p>
              <p className="text-[11px] text-slate">{new Date(tx.createdAt).toLocaleDateString()}</p>
            </div>
            <span className="text-xs font-bold" style={{ color: tx.points > 0 ? '#2D8A4E' : '#C13030' }}>
              {tx.points > 0 ? '+' : ''}{tx.points}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
