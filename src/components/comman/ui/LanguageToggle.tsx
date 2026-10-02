import { Languages } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/contexts/languageCtx';

/** EN / اردو switch for the top bar. */
export function LanguageToggle({ tone = 'dark' }: { tone?: 'light' | 'dark' }) {
  const { lang, setLang, t } = useLanguage();
  const base = tone === 'dark' ? 'text-white/70 hover:text-white' : 'text-slate hover:text-carbon';
  const on = tone === 'dark' ? 'text-white font-bold' : 'text-carbon font-bold';
  return (
    <div role="group" aria-label={t('Language')} className="flex items-center gap-1.5 shrink-0 text-[12px]">
      <Languages size={13} className={tone === 'dark' ? 'text-white/70' : 'text-slate'} aria-hidden />
      <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => setLang('en')} className={clsx('bg-transparent border-none p-0 cursor-pointer', lang === 'en' ? on : base)}>EN</button>
      <span className={tone === 'dark' ? 'text-white/30' : 'text-bone'} aria-hidden>|</span>
      <button type="button" lang="ur" aria-pressed={lang === 'ur'} onClick={() => setLang('ur')} className={clsx('bg-transparent border-none p-0 cursor-pointer font-urdu', lang === 'ur' ? on : base)}>اردو</button>
    </div>
  );
}
