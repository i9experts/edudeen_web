const inputCls = 'w-full px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border';

/** '' -> null (clears / uses the store setting); otherwise a whole percent 1-50. */
export function premiumPercentError(value: string): string | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 50 ? null : 'Enter a percent from 1 to 50, or leave empty.';
}

export function premiumPercentPayload(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

/** Optional per-product Edudeen Premium member discount (seller-funded). */
export function PremiumPriceField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const error = premiumPercentError(value);
  return (
    <div>
      <label htmlFor="premium-price-pct" className="text-[12px] font-semibold text-charcoal block mb-1.5">Premium member price (% off)</label>
      <input
        id="premium-price-pct" type="number" min={1} max={50} step="any" inputMode="decimal"
        value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
        placeholder="e.g. 10" className={inputCls}
      />
      <p className="text-[12px] text-slate mt-1">Premium members get this % off this product; you keep the rest. Leave empty to use your store setting.</p>
      {error && <p className="text-[12px] text-red-600 mt-1">{error}</p>}
    </div>
  );
}
