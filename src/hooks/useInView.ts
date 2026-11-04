import { useEffect, useRef, useState } from 'react';

/** True (and stays true) once the element is within `margin` of the viewport. Without IntersectionObserver it is true at once. */
export function useInView<T extends HTMLElement = HTMLDivElement>(margin = '600px') {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, margin]);
  return [seen, ref] as const;
}
