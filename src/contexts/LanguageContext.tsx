import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { LanguageCtx, type Lang } from './languageCtx';

const STORAGE_KEY = 'edudeen.lang';

function initialLang(): Lang {
  try { return localStorage.getItem(STORAGE_KEY) === 'ur' ? 'ur' : 'en'; } catch { return 'en'; }
}

/**
 * English / Urdu interface switch for the marketplace. Urdu flips the page to
 * right-to-left and switches Urdu text to an Urdu font (see index.css); the choice is remembered on
 * this device. Seller and admin dashboards always stay in English.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [scoped, setScoped] = useState(true);
  const effective: Lang = scoped ? lang : 'en';
  // The Urdu dictionary (~160 KB) is its own chunk: English visitors never download it.
  const [dict, setDict] = useState<Record<string, string> | null>(null);
  const translatorLoaded = useRef(false);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = effective;
    html.dir = effective === 'ur' ? 'rtl' : 'ltr';
    html.classList.toggle('lang-ur', effective === 'ur');
    let cancelled = false;
    if (effective === 'ur') {
      void Promise.all([import('@/i18n/ur'), import('@/i18n/domTranslator')]).then(([u, d]) => {
        if (cancelled) return;
        translatorLoaded.current = true;
        setDict(u.UR);
        d.startUrdu();
      });
    } else if (translatorLoaded.current) {
      void import('@/i18n/domTranslator').then(d => d.stopUrdu());
    }
    return () => { cancelled = true; };
  }, [effective]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* private mode — still switches for this visit */ }
  }, []);

  const t = useCallback((en: string) => (effective === 'ur' && dict ? dict[en] ?? en : en), [effective, dict]);
  const value = useMemo(() => ({ lang, setLang, t, setScoped }), [lang, setLang, t]);
  return <LanguageCtx.Provider value={value}>{children}</LanguageCtx.Provider>;
}

// Workspaces that stay English and left-to-right whatever the visitor picked.
const ENGLISH_ONLY = /^\/(store|admin|seller|onboarding)(\/|$)/;

/** Rendered once inside the router: keeps Urdu to the buyer-facing pages. */
export function LanguageRouteSync() {
  const { pathname } = useLocation();
  const { setScoped } = useContext(LanguageCtx);
  useEffect(() => { setScoped(!ENGLISH_ONLY.test(pathname)); }, [pathname, setScoped]);
  return null;
}
