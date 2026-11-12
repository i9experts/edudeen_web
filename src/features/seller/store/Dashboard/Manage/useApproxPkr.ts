import { useCallback } from 'react';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { formatPrice } from '@/utils/formatPrice';

/** Display-only "approx." PKR text for a USD amount (null until a rate is loaded). Never used for charging. */
export function useApproxPkr() {
  const { convertBetween, ratesLoaded } = useCurrencyPreference();
  return useCallback((usd: number | null | undefined): string | null => {
    const n = Number(usd ?? 0);
    if (!ratesLoaded || !(n > 0)) return null;
    const pkr = Math.round(convertBetween(n, 'USD', 'PKR'));
    return pkr > 0 ? `≈ ${formatPrice(pkr, 'PKR')} approx.` : null;
  }, [convertBetween, ratesLoaded]);
}
