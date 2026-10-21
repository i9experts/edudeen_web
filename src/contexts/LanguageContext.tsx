import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { LanguageCtx, type Lang } from './languageCtx';

const STORAGE_KEY = 'edudeen.lang';

function initialLang(): Lang {
  try { return localStorage.getItem(STORAGE_KEY) === 'ur' ? 'ur' : 'en'; } catch { return 'en'; }
}

type Translator = typeof import('@/i18n/domTranslator');
let urduAssets: Promise<{ dict: Record<string, string>; tr: Translator }> | null = null;
/** The Urdu dictionary (~160 KB) is its own chunk: English visitors never download it. */
function loadUrdu() {
  urduAssets ??= Promise.all([import('@/i18n/ur'), import('@/i18n/domTranslator')]).then(([u, d]) => ({ dict: u.UR, tr: d }));
  return urduAssets;
}

/**
 * English / Urdu interface switch for the marketplace. Urdu flips the page to
 * right-to-left and switches Urdu text to an Urdu font (see index.css); the choice is remembered on
 * this device. Seller and admin dashboards always stay in English.
 *
 * Switching is instant and in one step: the Urdu assets are fetched BEFORE the language changes, and
 * direction + font + translation are applied together before the browser paints (no slide / no
 * English-then-Urdu flash). Transitions are muted for that one frame.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [scoped, setScoped] = useState(true);
  const effective: Lang = scoped ? lang : 'en';
  const [dict, setDict] = useState<Record<string, string> | null>(null);
  const trRef = useRef<Translator | null>(null);
  const started = useRef(false);

  useLayoutEffect(() => {
    const html = document.documentElement;
    let cancelled = false;
    const apply = () => {
      html.classList.add('lang-switching');
      html.lang = effective;
      html.dir = effective === 'ur' ? 'rtl' : 'ltr';
      html.classList.toggle('lang-ur', effective === 'ur');
      if (effective === 'ur') { trRef.current?.startUrdu(); started.current = true; }
      else if (started.current) { trRef.current?.stopUrdu(); started.current = false; }
      // layout is settled after the next frame: re-enable transitions
      requestAnimationFrame(() => requestAnimationFrame(() => html.classList.remove('lang-switching')));
    };
    if (effective === 'ur' && !trRef.current) {
      // first load straight into Urdu (saved choice): wait for the chunk, then apply in one go
      void loadUrdu().then(a => { if (cancelled) return; trRef.current = a.tr; setDict(a.dict); apply(); });
    } else {
      apply();
    }
    return () => { cancelled = true; };
  }, [effective]);

  const setLang = useCallback((l: Lang) => {
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* private mode — still switches for this visit */ }
    if (l === 'ur' && !trRef.current) {
      void loadUrdu().then(a => { trRef.current = a.tr; setDict(a.dict); setLangState('ur'); });
    } else {
      setLangState(l);
    }
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
