import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { apiUpdateStore, type StorePremiumDiscount } from '@/api/services/store';
import { apiStoreDashboardSummary, type StoreDashboardSummary } from '@/api/services/storeDashboard';
import { Toggle } from '@/components/comman/ui';
import { Button } from '@/components/comman/ui/Button';
import { formatMoney } from '@/utils/currency';
import { apiGetPremiumConflicts, type PremiumConflict } from '@/api/services/premium';
import { PremiumEarningsCalculator } from '../StoreSection/products/PremiumEarningsCalculator';

const inputCls = 'w-full px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border';

export function PremiumDiscountCard({ storeId, discount, refetch, currency }: {
  storeId: string;
  currency?: string | null;
  discount: StorePremiumDiscount | null | undefined;
  refetch: () => void;
}) {
  const [enabled, setEnabled] = useState(discount?.enabled ?? false);
  const [percent, setPercent] = useState(discount?.percent ? String(discount.percent) : '10');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [stats, setStats] = useState<StoreDashboardSummary['premium'] | null>(null);
  const [conflicts, setConflicts] = useState<PremiumConflict[]>([]);
  const [gap, setGap] = useState<number | null>(null);
  const loadConflicts = () => apiGetPremiumConflicts(storeId).then(r => { setConflicts(r.data?.conflicts ?? []); setGap(r.data?.minGapPercent ?? null); }).catch(() => {});

  useEffect(() => {
    setEnabled(discount?.enabled ?? false);
    setPercent(discount?.percent ? String(discount.percent) : '10');
  }, [discount?.enabled, discount?.percent]);

  useEffect(() => { void loadConflicts(); }, [storeId, discount?.enabled, discount?.percent]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    apiStoreDashboardSummary(storeId).then(r => { if (alive) setStats(r.data?.premium ?? null); }).catch(() => {});
    return () => { alive = false; };
  }, [storeId]);

  const n = Number(percent);
  const percentError = enabled && (percent.trim() === '' || !Number.isInteger(n) || n < 1 || n > 50) ? 'Enter a whole number from 1 to 50.' : null;

  async function save() {
    if (percentError) return;
    setSaving(true); setMsg(null);
    try {
      // Turning it off keeps the percent so it can be switched back on; null clears the setting entirely.
      const body: StorePremiumDiscount | null = enabled ? { enabled: true, percent: n } : (n >= 1 && n <= 50 ? { enabled: false, percent: n } : null);
      await apiUpdateStore({ storeId, premiumDiscount: body });
      refetch();
      setMsg({ ok: true, text: 'Premium member discount saved.' });
      void loadConflicts();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save the Premium discount.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-bone bg-white p-5">
      <p className="text-[13.5px] font-semibold text-charcoal mb-1 flex items-center gap-1.5"><Crown size={14} className="text-brand-orange" />Premium member discount</p>
      <p className="text-[12.5px] text-slate leading-relaxed mb-4">
        Offer Edudeen Premium members a lower price. You choose the discount; Edudeen adds its own extra % on top and pays that part itself, so you never fund it.
        Members pay the list price less both, and they do not also get your normal sale, so keep your normal sales at least {gap ?? 5} points below this discount.
        It applies to your whole store unless a product sets its own Premium member price. Only signed-in Premium members see and get it.
      </p>
      <div className="flex items-center justify-between gap-3 px-[14px] py-3 rounded-[9px] border border-bone bg-cream mb-4">
        <p className="text-[13px] font-medium text-charcoal">Give Premium members a discount</p>
        <Toggle label="Premium member discount" checked={enabled} onChange={setEnabled} />
      </div>
      {enabled && (
        <div className="mb-4">
          <label htmlFor="premium-store-pct" className="text-[12px] font-semibold text-charcoal block mb-1.5">Discount (% off, 1 to 50)</label>
          <input id="premium-store-pct" type="number" min={1} max={50} step={1} value={percent} onChange={e => setPercent(e.target.value)} className={inputCls} />
          {percentError && <p className="text-[12px] text-red-600 mt-1">{percentError}</p>}
        </div>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" loading={saving} disabled={!!percentError} onClick={save}>Save Premium discount</Button>
        {msg && <span className={`text-[12px] ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
      </div>
      {conflicts.length > 0 && (
        <div role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-800">
          <p className="font-semibold m-0 mb-1">{conflicts.length} product{conflicts.length === 1 ? '' : 's'} have a normal sale too close to the Premium discount</p>
          <p className="m-0 mb-1">Members still get the better price, but you cannot save these products again until the sale is lowered or the Premium discount raised.</p>
          <ul className="m-0 ps-5 list-disc">
            {conflicts.slice(0, 5).map(c => <li key={c.productId}>{c.name}: sale {c.salePercent}% vs Premium {c.premiumPercent}%</li>)}
            {conflicts.length > 5 && <li>and {conflicts.length - 5} more</li>}
          </ul>
        </div>
      )}
      <PremiumEarningsCalculator price="1000" compareAtPrice="" premiumValue="" storePercent={enabled && !percentError ? n : 0} productType="digital" currency={currency} />
      <p className="text-[12px] text-slate mt-1 mb-4">Example for a product priced at {formatMoney(1000, currency ?? 'PKR')}.</p>
      {stats && (
        <div className="mt-4 pt-3 border-t border-bone text-[12.5px] text-slate">
          <p className="font-semibold text-charcoal mb-1">Last {stats.windowDays} days</p>
          {stats.premiumOrders > 0 ? (
            <>
              <p>{stats.premiumOrders} order{stats.premiumOrders === 1 ? '' : 's'} from Premium members</p>
              {stats.byCurrency.map(c => (
                <p key={c.currency}>Discount given: {formatMoney(c.premiumDiscountGiven, c.currency)}{(c.platformFundedDiscount ?? 0) > 0 ? ` (plus ${formatMoney(c.platformFundedDiscount ?? 0, c.currency)} paid by Edudeen)` : ''} on {formatMoney(c.revenue, c.currency)} in sales</p>
              ))}
            </>
          ) : <p>No Premium member orders yet.</p>}
        </div>
      )}
    </div>
  );
}
