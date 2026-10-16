import { useEffect } from 'react';

/**
 * For full-height dashboards (seller, store, admin, buyer account) that scroll
 * inside their own content area. While mounted, the document can't scroll —
 * otherwise anything slightly taller than the screen showed a second,
 * page-wide scrollbar and scrolling slid the whole dashboard up.
 */
export function useLockPageScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const prev = { html: html.style.overflow, body: document.body.style.overflow };
    window.scrollTo({ top: 0 });
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev.html;
      document.body.style.overflow = prev.body;
    };
  }, []);
}
