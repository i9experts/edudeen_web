import { useEffect } from 'react';
import { scrollRootRef } from '@/utils/scrollRoot';

/**
 * For full-height dashboards (seller, store, admin, buyer account) that scroll
 * inside their own content area. While mounted, the app's outer scroll
 * container (and the document) can't scroll — otherwise anything slightly
 * taller than the screen showed a second, page-wide scrollbar and scrolling
 * slid the whole dashboard up, leaving a blank gap under it.
 */
export function useLockPageScroll() {
  useEffect(() => {
    const root = scrollRootRef.current;
    const html = document.documentElement;
    const prev = { root: root?.style.overflowY ?? '', html: html.style.overflow, body: document.body.style.overflow };
    if (root) { root.scrollTop = 0; root.style.overflowY = 'hidden'; }
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      if (root) root.style.overflowY = prev.root;
      html.style.overflow = prev.html;
      document.body.style.overflow = prev.body;
    };
  }, []);
}
