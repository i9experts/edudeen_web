import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { Button, Card, Input, Select, SkeletonBox, Toggle } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { apiAdminGetReferralSettings, apiAdminSaveReferralSettings, type ReferralSettings } from '@/api/services/retention';

/**
 * Admin -> Platform Config -> Referral programme. The reward is a single-use platform coupon granted after the invited
 * friend's first PAID and delivered order (not tied to any store's loyalty plan). Off by default.
 */
export function ReferralSettingsCard() {
  const toast = useToast();
  const [s, setS] = useState<ReferralSettings | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ReferralSettings>(k: K, v: ReferralSettings[K]) => setS(prev => (prev ? { ...prev, [k]: v } : prev));

  useEffect(() => { apiAdminGetReferralSettings().then(r => setS(r.data)).catch(() => setFailed(true)); }, []);

  const save = async () => {
    if (!s) return;
    setBusy(true);
    try { const r = await apiAdminSaveReferralSettings(s); setS(r.data); toast.success('Referral settings saved'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <p className="text-[14px] font-bold text-carbon flex items-center gap-2 mb-1"><Gift size={15} className="text-brand-orange" /> Referral programme</p>
      <p className="text-[12.5px] text-slate mb-4">Buyers get an invite code. When the friend completes a first paid and delivered order, the buyer (and optionally the friend) receives a single-use coupon. Self-referrals, alias emails, shared phones and repeat sign-ups from one connection are not rewarded.</p>
      {failed ? <p className="text-[13px] text-error">Could not load the referral settings.</p> : !s ? <SkeletonBox height={120} rounded="12px" /> : (
        <div className="flex flex-col gap-4">
          <label className="inline-flex items-center gap-2 text-[13px] text-charcoal cursor-pointer">
            <Toggle size="sm" label="Referral programme enabled" checked={s.enabled} onChange={v => set('enabled', v)} /> Programme is {s.enabled ? 'on' : 'off'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Reward type" value={s.rewardType} onChange={e => set('rewardType', e.target.value as ReferralSettings['rewardType'])}>
              <option value="percentage">Percent off</option>
              <option value="fixed">Fixed amount (USD)</option>
            </Select>
            <Input label={s.rewardType === 'percentage' ? 'Referrer reward (%)' : 'Referrer reward (USD)'} type="number" min={0} value={String(s.rewardValue)} onChange={e => set('rewardValue', Number(e.target.value) || 0)} />
            <Input label={s.rewardType === 'percentage' ? 'Friend reward (%, 0 = none)' : 'Friend reward (USD, 0 = none)'} type="number" min={0} value={String(s.refereeRewardValue)} onChange={e => set('refereeRewardValue', Number(e.target.value) || 0)} />
            <Input label="Minimum order (USD, optional)" type="number" min={0} value={s.minOrderUSD == null ? '' : String(s.minOrderUSD)} onChange={e => set('minOrderUSD', e.target.value === '' ? null : Number(e.target.value) || 0)} />
            <Input label="Coupon valid for (days)" type="number" min={1} max={365} value={String(s.expiryDays)} onChange={e => set('expiryDays', Number(e.target.value) || 1)} />
            <Input label="Max rewards per referrer" type="number" min={1} max={500} value={String(s.maxRewardsPerReferrer)} onChange={e => set('maxRewardsPerReferrer', Number(e.target.value) || 1)} />
          </div>
          <div><Button variant="primary" loading={busy} onClick={save}>Save referral settings</Button></div>
        </div>
      )}
    </Card>
  );
}
