import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useT } from '@/contexts/languageCtx';

/**
 * First focusable element on every page: keyboard and screen-reader users jump past the header and menus.
 * Moves focus to the page's <main> (or its first <h1> when a page has no <main>).
 */
export function SkipLink() {
  const t = useT();
  const { pathname, search } = useLocation();
  // Gives the page's <main> (or first <h1>) the id the link points at, now and as the lazy page renders.
  useEffect(() => {
    const mark = () => {
      const el = document.querySelector<HTMLElement>('main, [role="main"]') ?? document.querySelector<HTMLElement>('h1');
      if (!el) return false;
      document.getElementById('main-content')?.removeAttribute('id');
      el.id = 'main-content';
      return true;
    };
    if (mark()) return;
    const mo = new MutationObserver(() => { if (mark()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    const stop = window.setTimeout(() => mo.disconnect(), 5000);
    return () => { mo.disconnect(); window.clearTimeout(stop); };
  }, [pathname, search]);
  return (
    <a
      href="#main-content"
      onClick={e => {
        e.preventDefault();
        const target = document.querySelector<HTMLElement>('main, [role="main"]') ?? document.querySelector<HTMLElement>('h1');
        if (!target) return;
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: false });
        target.scrollIntoView({ block: 'start' });
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[2147483001] focus:rounded-md focus:bg-carbon focus:px-4 focus:py-2.5 focus:text-[13px] focus:font-semibold focus:text-white focus:no-underline focus:outline-2 focus:outline-offset-2 focus:outline-brand-orange"
    >
      {t('Skip to main content')}
    </a>
  );
}
