import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { formatPrice } from '@/utils/formatPrice';

/**
 * A small "≈ $3.62" hint for an amount that was CHARGED in `currency` (an order's own currency): shown only when the
 * buyer's display currency is different, so the main figure stays the real charged amount and nothing looks converted.
 */
export function ApproxPrice({ amount, currency, className }: { amount: number | null | undefined; currency?: string | null; className?: string }) {
  const { currency: display, convert, ratesLoaded } = useCurrencyPreference();
  if (amount == null || !currency || amount === 0 || !ratesLoaded || currency.toUpperCase() === display.toUpperCase()) return null;
  const converted = convert(amount, currency);
  if (!Number.isFinite(converted)) return null;
  return <span className={className ?? 'block text-[12px] font-normal text-slate'} translate="no">≈ {formatPrice(converted, display)}</span>;
}
