import { useCallback } from 'react';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';
import { useStoreWorkspace } from '@/components/layouts/StoreLayout';
import { formatPrice } from '@/utils/formatPrice';

/** Formats an amount the API stores in USD in the seller's store currency (PKR for most stores). */
export function useUsdMoney() {
  const { store } = useStoreWorkspace();
  const { convertBetween, ratesLoaded } = useCurrencyPreference();
  const cur = store?.baseCurrency || 'PKR';
  return useCallback(
    (usd: number | null | undefined) => {
      const n = Number(usd ?? 0);
      if (cur === 'USD' || !ratesLoaded) return formatPrice(n, 'USD');
      return formatPrice(Math.round(convertBetween(n, 'USD', cur) * 100) / 100, cur);
    },
    [cur, convertBetween, ratesLoaded],
  );
}
