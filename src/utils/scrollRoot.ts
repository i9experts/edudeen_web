// The page scrolls with the normal document (window). These helpers keep the
// few consumers that need the scroll offset in one place.
export function getScrollTop(): number {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function getScrollMax(): number {
  const d = document.documentElement;
  return Math.max(0, d.scrollHeight - d.clientHeight);
}

export function scrollRootToTop(behavior: ScrollBehavior = 'auto') {
  window.scrollTo({ top: 0, behavior });
}

/** Subscribe to page scroll (passive). Returns the unsubscribe function. */
export function onPageScroll(cb: () => void): () => void {
  window.addEventListener('scroll', cb, { passive: true });
  return () => window.removeEventListener('scroll', cb);
}
