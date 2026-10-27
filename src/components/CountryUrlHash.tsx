import { useEffect } from 'react';
import { router } from '@/router';
import { useCurrencyPreference } from '@/contexts/CurrencyPreferenceContext';

/**
 * Shows the visitor's country at the very end of every URL as a hash, e.g. edudeen.com/product/abc#pk.
 * A hash never reaches the server (no routing / SEO / cache effect). A functional hash that is already
 * there (#reviews, #deals, #write-review...) is left alone, so those links keep working.
 */
export function CountryUrlHash() {
  const { country } = useCurrencyPreference();

  useEffect(() => {
    if (!country) return;
    const tag = `#${country.toLowerCase()}`;
    const apply = () => {
      const { pathname, search, hash } = window.location;
      if (hash === '') window.history.replaceState(window.history.state, '', `${pathname}${search}${tag}`);
    };
    apply();
    return router.subscribe(apply);
  }, [country]);

  return null;
}
