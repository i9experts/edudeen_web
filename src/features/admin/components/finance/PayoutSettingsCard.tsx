import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button, Input, Select, SkeletonBox } from '@/components/comman/ui';
import { useAdminConfig, useUpdatePayoutConfig } from '@/hooks/admin/useAdminConfig';
import type { PayoutConfig, PayoutFrequency } from '@/api/services/config/adminConfig';
import { StudioPanel } from '../studio';

// Backend defaults (PayoutConfig in platform-config.schema.ts) — used when an
// older config document has no payoutConfig yet.
const DEFAULTS: PayoutConfig = { minPayoutUSD: 5, minPayoutPKR: 1500, payoutFrequency: 'monthly' };

const FREQUENCY_LABEL: Record<PayoutFrequency, string> = {
  monthly: 'Monthly (recommended)',
  biweekly: 'Every two weeks',
  weekly: 'Weekly',
  daily: 'Daily',
  manual: 'Manual only',
};

/**
 * Payout settings — the platform-wide minimum payout per currency (sellers
 * owed less are skipped as "below minimum" in the monthly run and can't
 * withdraw) and the payout frequency new sellers start on.
 * Uses PUT /api/admin/platform-config/payout.
 */
export function PayoutSettingsCard() {
  const { data, loading, error: loadError, refetch } = useAdminConfig();
  const { update, submitting, error } = useUpdatePayoutConfig();
  const [form, setForm] = useState<{ usd: string; pkr: string; frequency: PayoutFrequency } | null>(null);
  const [saved, setSaved] = useState(false);
  const [validation, setValidation] = useState('');

  // Seed the form from the fetched config (during render, not in an effect).
  const [synced, setSynced] = useState<unknown>(null);
  if (data && data !== synced) {
    setSynced(data);
    const pc = { ...DEFAULTS, ...(data.payoutConfig ?? {}) };
    setForm({ usd: String(pc.minPayoutUSD), pkr: String(pc.minPayoutPKR), frequency: pc.payoutFrequency });
  }

  async function save() {
    if (!form) return;
    const usd = Number(form.usd);
    const pkr = Number(form.pkr);
    if (!Number.isFinite(usd) || usd < 0 || !Number.isFinite(pkr) || pkr < 0 || form.usd === '' || form.pkr === '') {
      setValidation('Minimum payouts must be zero or a positive number.');
      return;
    }
    setValidation('');
    const ok = await update({ minPayoutUSD: usd, minPayoutPKR: pkr, payoutFrequency: form.frequency });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      refetch();
    }
  }

  return (
    <StudioPanel
      title="Payout settings"
      description="Sellers owed less than the minimum are skipped in the monthly run (shown as “below the minimum payout”) and carried over to the next month."
    >
      {loading && !form ? (
        <SkeletonBox height={120} rounded="10px" />
      ) : loadError && !form ? (
        <div className="flex items-center gap-3 text-[13px] text-error">
          {loadError}
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : form ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px]">
            <Input
              label="Minimum payout (PKR)"
              type="number"
              min={0}
              value={form.pkr}
              onChange={e => setForm(f => f && ({ ...f, pkr: e.target.value }))}
            />
            <Input
              label="Minimum payout (USD)"
              type="number"
              min={0}
              step="0.01"
              value={form.usd}
              onChange={e => setForm(f => f && ({ ...f, usd: e.target.value }))}
            />
            <Select
              label="Payout frequency for new sellers"
              value={form.frequency}
              onChange={e => setForm(f => f && ({ ...f, frequency: e.target.value as PayoutFrequency }))}
            >
              {(Object.keys(FREQUENCY_LABEL) as PayoutFrequency[]).map(k => <option key={k} value={k}>{FREQUENCY_LABEL[k]}</option>)}
            </Select>
          </div>
          <p className="text-[12px] text-slate">
            Changing the frequency only affects sellers who join after the change; existing sellers keep their current schedule.
          </p>
          {(validation || error) && <p className="text-[12px] text-error">{validation || error}</p>}
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={save} loading={submitting}>Save payout settings</Button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-success">
                <CheckCircle2 size={13} /> Saved
              </span>
            )}
          </div>
        </div>
      ) : null}
    </StudioPanel>
  );
}
