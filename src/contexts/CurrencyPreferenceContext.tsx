import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { TokenStorage } from '@/api/services/auth';
import { apiEditProfile } from '@/api/services/auth';
import { apiGetCurrentRates, type CurrentRatesMap } from '@/api/services/exchangeRate';

export type SupportedCurrency = 'PKR' | 'USD';

const STORAGE_KEY = 'edudeen_currency_preference';

/**
 * Converts `amount` (denominated in `fromCurrency` — a product/cart item's
 * own native seller currency) into `toCurrency` (the buyer's chosen display
 * currency), through the USD pivot — same math as the backend's
 * ExchangeRateService.convertWithSnapshots, just against the live current
 * rate instead of a frozen checkout snapshot (this is DISPLAY-ONLY, before
 * any checkout exists — the real, authoritative, snapshotted conversion
 * still happens server-side at checkout creation).
 */
function convertAmount(amount: number, fromCurrency: string, toCurrency: string, rates: CurrentRatesMap): number {
  if (!fromCurrency || fromCurrency === toCurrency) return amount;
  const fromRate = fromCurrency === 'USD' ? 1 : rates[fromCurrency]?.ratePerUSD;
  const toRate = toCurrency === 'USD' ? 1 : rates[toCurrency]?.ratePerUSD;
  if (!fromRate || !toRate) return amount; // rates not loaded yet — show native rather than guess
  const usd = amount / fromRate;
  const converted = usd * toRate;
  return toCurrency === 'PKR' ? Math.round(converted) : Math.round(converted * 100) / 100;
}

// Location detection only ever sets the INITIAL default for a guest with no
// saved preference yet — it never re-runs or overrides an explicit choice
// (see CLAUDE.md's location-detection principle). No real geo-IP lookup is
// wired up yet, so this is deliberately just the Pakistan-origin default —
// swapping in a real IP/locale-based guess later only touches this function.
function detectDefaultCurrency(): SupportedCurrency {
  return 'PKR';
}

interface CurrencyPreferenceContextValue {
  currency: SupportedCurrency;
  setCurrency: (value: SupportedCurrency) => void;
  /** Converts a native-currency amount into the buyer's chosen display
   *  currency using the live current rate. This is what actually makes the
   *  navbar toggle change visible prices — every price display must call
   *  this instead of showing a product/cart item's raw stored amount. */
  convert: (amount: number, fromCurrency?: string | null) => number;
  ratesLoaded: boolean;
}

const Ctx = createContext<CurrencyPreferenceContextValue | null>(null);

export function CurrencyPreferenceProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'PKR' || saved === 'USD' ? saved : detectDefaultCurrency();
  });
  const [rates, setRates] = useState<CurrentRatesMap>({});
  const [ratesLoaded, setRatesLoaded] = useState(false);

  // Fetched once, globally — the same current-rate lookup every price
  // display on the site shares, so switching PKR/USD in the navbar updates
  // every price on screen without each component making its own API call.
  useEffect(() => {
    apiGetCurrentRates()
      .then(res => { setRates(res.data); setRatesLoaded(true); })
      .catch(() => { setRatesLoaded(true); }); // fail open — display falls back to native currency, never blocks the page
  }, []);

  // On login (or first mount while already logged in), the account's own
  // saved preference is the cross-device source of truth and wins over
  // whatever's in this browser's localStorage — but only if the account
  // actually has one set yet; otherwise the guest/local value carries over
  // (see CLAUDE.md: "guest becomes authenticated" carry-over rule).
  useEffect(() => {
    if (!TokenStorage.isLoggedIn()) return;
    const user = TokenStorage.getUser<{ currencyPreference?: SupportedCurrency | null }>();
    if (user?.currencyPreference === 'PKR' || user?.currencyPreference === 'USD') {
      setCurrencyState(user.currencyPreference);
      localStorage.setItem(STORAGE_KEY, user.currencyPreference);
    }
  }, []);

  const setCurrency = useCallback((value: SupportedCurrency) => {
    setCurrencyState(value);
    localStorage.setItem(STORAGE_KEY, value);
    if (TokenStorage.isLoggedIn()) {
      apiEditProfile({ currencyPreference: value }).catch(() => {
        // Best-effort — the local choice still applies to this device/browser
        // even if persisting it to the account fails.
      });
    }
  }, []);

  const convert = useCallback(
    (amount: number, fromCurrency?: string | null) => convertAmount(amount, fromCurrency ?? currency, currency, rates),
    [currency, rates],
  );

  const value = useMemo<CurrencyPreferenceContextValue>(
    () => ({ currency, setCurrency, convert, ratesLoaded }),
    [currency, setCurrency, convert, ratesLoaded],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrencyPreference(): CurrencyPreferenceContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCurrencyPreference must be inside CurrencyPreferenceProvider');
  return ctx;
}
