import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { TokenStorage } from '@/api/services/auth';
import { apiEditProfile } from '@/api/services/auth';
import { apiGetCurrentRates, apiGetDisplayRate, type CurrentRatesMap, type DisplayRateInfo } from '@/api/services/exchangeRate';

/** Any ISO-4217 code. The buyer can SEE prices in their local currency; only USD or PKR is ever charged. */
export type SupportedCurrency = string;

const STORAGE_KEY = 'edudeen_currency_preference';
/** USD|PKR actually sent to checkout (read by api/services/checkout.ts). Differs from STORAGE_KEY when a local currency is shown. */
const CHARGE_KEY = 'edudeen_charge_currency';
const GEO_KEY = 'edudeen_geo';
/** Country the saved currency choice was made in: a choice only holds while the buyer is still in that country. */
const CHOICE_COUNTRY_KEY = 'edudeen_currency_choice_country';
const GEO_REFRESH_MS = 15 * 60_000;

/** The currency a buyer is charged for a display currency: PKR stays PKR, everything else is USD. */
export function chargeCurrencyFor(display: string): 'PKR' | 'USD' {
  return display === 'PKR' ? 'PKR' : 'USD';
}

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

// Country hint for the API when no CDN header exists: browser locale region, else a few well-known timezones.
const TZ_COUNTRY: Record<string, string> = {
  'Asia/Karachi': 'PK', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Dhaka': 'BD',
  'Europe/London': 'GB', 'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW', 'Asia/Bahrain': 'BH', 'Asia/Muscat': 'OM', 'Asia/Colombo': 'LK',
  'Asia/Kathmandu': 'NP', 'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Istanbul': 'TR', 'Africa/Cairo': 'EG',
  'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/New_York': 'US', 'America/Chicago': 'US', 'America/Los_Angeles': 'US',
};
function browserCountryHint(): string | null {
  try {
    for (const lang of navigator.languages ?? [navigator.language]) {
      const m = /^[a-z]{2,3}-([A-Z]{2})$/.exec(lang ?? '');
      if (m) return m[1];
    }
    return TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? null;
  } catch { return null; }
}

interface Geo { country: string | null; currency: string | null; ratePerUSD: number | null; stale: boolean }
function readGeo(): Geo | null {
  try {
    const g = JSON.parse(localStorage.getItem(GEO_KEY) ?? 'null') as Geo | null;
    return g && typeof g === 'object' ? g : null;
  } catch { return null; }
}
function writeGeo(g: Geo) { try { localStorage.setItem(GEO_KEY, JSON.stringify(g)); } catch { /* storage blocked */ } }
function writeCharge(c: string) { try { localStorage.setItem(CHARGE_KEY, chargeCurrencyFor(c)); } catch { /* storage blocked */ } }

interface CurrencyPreferenceContextValue {
  /** The currency prices are SHOWN in (local / USD / PKR). */
  currency: SupportedCurrency;
  setCurrency: (value: SupportedCurrency) => void;
  /** The buyer's detected local currency (null for unknown / when it is USD or PKR). */
  localCurrency: string | null;
  /** Menu options: [local currency, USD, PKR] without duplicates. */
  options: string[];
  /** Detected ISO country (e.g. 'PK'), null when unknown. */
  country: string | null;
  /** USD or PKR — what checkout actually charges for the current display currency. */
  chargeCurrency: 'PKR' | 'USD';
  /** Converts a native-currency amount into the buyer's chosen display
   *  currency using the live current rate. This is what actually makes the
   *  navbar toggle change visible prices — every price display must call
   *  this instead of showing a product/cart item's raw stored amount. */
  convert: (amount: number, fromCurrency?: string | null) => number;
  /** Converts between any two supported currencies with the live rates (e.g. the buyer's USD filter input -> the PKR the catalogue is priced in). */
  convertBetween: (amount: number, from: string, to: string) => number;
  ratesLoaded: boolean;
}

const Ctx = createContext<CurrencyPreferenceContextValue | null>(null);

export function CurrencyPreferenceProvider({ children }: { children: ReactNode }) {
  const [geo, setGeo] = useState<Geo | null>(() => readGeo());
  const [chosen, setChosen] = useState<string | null>(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* storage blocked */ }
    return saved && /^[A-Z]{3}$/.test(saved) ? saved : null;
  });
  const [chosenCountry, setChosenCountry] = useState<string | null>(() => {
    try { return localStorage.getItem(CHOICE_COUNTRY_KEY) || null; } catch { return null; }
  });
  const [rates, setRates] = useState<CurrentRatesMap>({});
  const [ratesLoaded, setRatesLoaded] = useState(false);

  // Fetched once, globally — the same current-rate lookup every price
  // display on the site shares, so switching currency in the navbar updates
  // every price on screen without each component making its own API call.
  useEffect(() => {
    apiGetCurrentRates()
      .then(res => { setRates(res.data); setRatesLoaded(true); })
      .catch(() => { setRatesLoaded(true); }); // fail open — display falls back to native currency, never blocks the page
  }, []);

  // Visitor country -> local currency + live rate. Re-polled every 15 min and when the tab regains focus
  // (the server cache itself follows the provider's own update schedule). Failure keeps the last known value.
  useEffect(() => {
    let alive = true;
    let lastAt = 0;
    const load = () => {
      lastAt = Date.now();
      const user = TokenStorage.isLoggedIn() ? TokenStorage.getUser<{ detectedCountry?: string | null }>() : null;
      apiGetDisplayRate(browserCountryHint() ?? user?.detectedCountry)
        .then(res => {
          if (!alive) return;
          const d: DisplayRateInfo = res.data;
          const next: Geo = { country: d.country, currency: d.currency, ratePerUSD: d.ratePerUSD, stale: d.stale };
          setGeo(next);
          writeGeo(next);
        })
        .catch(() => { /* keep the cached / previous value */ });
    };
    load();
    const timer = window.setInterval(load, GEO_REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible' && Date.now() - lastAt > 5 * 60_000) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  // On login (or first mount while already logged in), the account's own
  // saved preference is the cross-device source of truth and wins over
  // whatever's in this browser's localStorage — but only if the account
  // actually has one set yet; otherwise the guest/local value carries over
  // (see CLAUDE.md: "guest becomes authenticated" carry-over rule).
  useEffect(() => {
    if (!TokenStorage.isLoggedIn()) return;
    const user = TokenStorage.getUser<{ displayCurrency?: string | null; currencyPreference?: string | null; detectedCountry?: string | null }>();
    const saved = user?.displayCurrency || user?.currencyPreference;
    if (saved && /^[A-Z]{3}$/.test(saved)) {
      // The account's choice belongs to the country it was made in (signup country); abroad it is ignored.
      setChosen(saved);
      setChosenCountry(user?.detectedCountry ?? null);
      try { localStorage.setItem(STORAGE_KEY, saved); } catch { /* storage blocked */ }
    }
  }, []);

  // Remember the signup country on the account (the server keeps the first value only).
  useEffect(() => {
    if (!geo?.country || !TokenStorage.isLoggedIn()) return;
    const user = TokenStorage.getUser<{ detectedCountry?: string | null }>();
    if (user?.detectedCountry) return;
    try {
      if (sessionStorage.getItem('edudeen_country_sent') === geo.country) return;
      sessionStorage.setItem('edudeen_country_sent', geo.country);
    } catch { /* storage blocked */ }
    apiEditProfile({ detectedCountry: geo.country }).catch(() => { /* best effort */ });
  }, [geo?.country]);

  const localCurrency = geo?.currency && geo.currency !== 'USD' && geo.currency !== 'PKR' ? geo.currency : null;

  // Merge the live local rate into the rate table so convert()/convertBetween() work unchanged.
  const allRates = useMemo<CurrentRatesMap>(() => {
    if (!geo?.currency || !geo.ratePerUSD || geo.currency === 'USD' || geo.currency === 'PKR') return rates;
    return { ...rates, [geo.currency]: { ratePerUSD: geo.ratePerUSD, effectiveFrom: new Date().toISOString(), source: 'provider' } };
  }, [rates, geo?.currency, geo?.ratePerUSD]);

  // Default order: explicit choice -> detected local currency -> PKR. A local currency with no valid rate
  // (providers down and never cached) is NOT shown: the platform default PKR is used so a number is never
  // labelled with a currency it was not converted to.
  // A saved choice only counts while the buyer is still in the country it was made in; opening the platform from another country switches to that country's currency.
  const choiceHolds = !!chosen && (!geo?.country || chosenCountry === geo.country);
  const wanted: string = (choiceHolds ? chosen : null) ?? geo?.currency ?? 'PKR';
  const currency: string = wanted === 'USD' || wanted === 'PKR' || allRates[wanted]?.ratePerUSD ? wanted : 'PKR';

  const options = useMemo(() => {
    const list = [localCurrency, 'USD', 'PKR'].filter((c): c is string => !!c);
    if (choiceHolds && chosen && !list.includes(chosen)) list.unshift(chosen); // keep a previously chosen currency selectable
    // Detected PK/US visitors: show their own currency first, as before.
    return Array.from(new Set(geo?.currency === 'PKR' ? ['PKR', ...list] : list));
  }, [localCurrency, chosen, choiceHolds, geo?.currency]);

  const chargeCurrency = chargeCurrencyFor(currency);
  useEffect(() => { writeCharge(currency); }, [currency]);

  const geoCountryRef = useRef<string | null>(geo?.country ?? null);
  geoCountryRef.current = geo?.country ?? null;

  const setCurrency = useCallback((value: SupportedCurrency) => {
    setChosen(value);
    setChosenCountry(geoCountryRef.current);
    try {
      localStorage.setItem(STORAGE_KEY, value);
      localStorage.setItem(CHOICE_COUNTRY_KEY, geoCountryRef.current ?? '');
    } catch { /* storage blocked */ }
    writeCharge(value);
    if (TokenStorage.isLoggedIn()) {
      // currencyPreference stays the CHARGE currency (checkout/cart read it); displayCurrency is what is shown.
      apiEditProfile({ currencyPreference: chargeCurrencyFor(value), displayCurrency: value }).catch(() => {
        // Best-effort — the local choice still applies to this device/browser
        // even if persisting it to the account fails.
      });
    }
  }, []);

  const convert = useCallback(
    (amount: number, fromCurrency?: string | null) => convertAmount(amount, fromCurrency ?? currency, currency, allRates),
    [currency, allRates],
  );

  const convertBetween = useCallback(
    (amount: number, from: string, to: string) => convertAmount(amount, from, to, allRates),
    [allRates],
  );

  const value = useMemo<CurrencyPreferenceContextValue>(
    () => ({ currency, setCurrency, localCurrency, options, country: geo?.country ?? null, chargeCurrency, convert, convertBetween, ratesLoaded }),
    [currency, setCurrency, localCurrency, options, geo?.country, chargeCurrency, convert, convertBetween, ratesLoaded],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCurrencyPreference(): CurrencyPreferenceContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCurrencyPreference must be inside CurrencyPreferenceProvider');
  return ctx;
}
