import { useEffect, useState } from 'react';

/**
 * Hover-to-scroll for a horizontal row: while the mouse is near the row's
 * right edge it glides right, near the left edge it glides left — faster the
 * closer the cursor is to the edge. Mouse only (touch keeps normal swiping)
 * and it respects `prefers-reduced-motion`.
 *
 * Returns a callback ref, so it also works for a row that only renders once
 * its data has loaded.
 */
export function useEdgeHoverScroll<T extends HTMLElement>({ edge = 0.22, maxSpeed = 14 } = {}) {
  const [el, setEl] = useState<T | null>(null);

  useEffect(() => {
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let speed = 0;      // px per frame; negative = left
    let frame = 0;

    const tick = () => {
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if ((speed > 0 && atEnd) || (speed < 0 && atStart)) speed = 0; // reached the end — stop
      if (speed !== 0) {
        el.scrollLeft += speed;
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width; // 0..1 across the row
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if (x > 1 - edge && !atEnd) speed = Math.ceil(((x - (1 - edge)) / edge) * maxSpeed);
      else if (x < edge && !atStart) speed = -Math.ceil(((edge - x) / edge) * maxSpeed);
      else speed = 0;
      if (speed !== 0 && !frame) frame = requestAnimationFrame(tick);
    };
    const stop = () => { speed = 0; };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', stop);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', stop);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [el, edge, maxSpeed]);

  return setEl;
}
