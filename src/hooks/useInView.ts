import { useCallback, useEffect, useState } from 'react';

/**
 * True (and stays true) once the element is within `margin` of the viewport. Without IntersectionObserver it is true at once.
 * Returns a CALLBACK ref: the element may mount long after the hook (e.g. behind a page skeleton) or be swapped
 * (desktop/mobile layouts), and the observer must attach whenever it appears.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(margin = '600px') {
  const [el, setEl] = useState<T | null>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  const ref = useCallback((node: T | null) => setEl(node), []);
  useEffect(() => {
    if (seen || !el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, margin, el]);
  return [seen, ref] as const;
}
