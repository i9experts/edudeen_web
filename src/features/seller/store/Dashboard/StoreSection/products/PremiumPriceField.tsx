import { Crown } from 'lucide-react';
import { Toggle } from '@/components/comman/ui';

const inputCls = 'w-full px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border';

/** '' -> null (clears / uses the store setting); otherwise a whole percent 1-50. */
export function premiumPercentError(value: string): string | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 50 ? null : 'Enter a percent from 1 to 50.';
}

export function premiumPercentPayload(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

/** Per-product Edudeen Premium member discount (seller-funded): a switch, then the percent. */
export function PremiumPriceField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const on = value.trim() !== '';
  const error = premiumPercentError(value);
  return (
    <div className="rounded-xl border border-bone bg-cream/60 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-carbon flex items-center gap-1.5 m-0">
            <Crown size={14} className="text-[#C79A00]" aria-hidden /> Offer a Premium member discount
          </p>
          <p className="text-[12px] text-slate mt-0.5 mb-0">
            Edudeen Premium members get a % off this product, paid from your side - you keep the rest. Switch off to use your store-wide setting.
          </p>
        </div>
        <Toggle label="Premium member discount on this product" checked={on} disabled={disabled} onChange={next => onChange(next ? (on ? value : '10') : '')} />
      </div>
      {on && (
        <div className="mt-3 max-w-[200px]">
          <label htmlFor="premium-price-pct" className="text-[12px] font-semibold text-charcoal block mb-1.5">Discount for Premium members (%)</label>
          <input
            id="premium-price-pct" type="number" min={1} max={50} step="any" inputMode="decimal"
            value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
            placeholder="e.g. 10" className={inputCls}
          />
          {error && <p className="text-[12px] text-red-600 mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}
