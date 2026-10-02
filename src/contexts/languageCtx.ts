import { createContext, useContext } from 'react';

export type Lang = 'en' | 'ur';

export interface LanguageValue {
  /** The visitor's choice. */
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translates an English UI string; anything not in the dictionary stays English. */
  t: (en: string) => string;
  /** Internal: LanguageRouteSync turns Urdu off on seller/admin screens. */
  setScoped: (on: boolean) => void;
}

export const LanguageCtx = createContext<LanguageValue>({ lang: 'en', setLang: () => {}, t: s => s, setScoped: () => {} });

export const useLanguage = () => useContext(LanguageCtx);
/** Shorthand when only the translator is needed. */
export const useT = () => useContext(LanguageCtx).t;