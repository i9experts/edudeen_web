import { useEffect } from 'react';

const EDGE = 0.22;
const MAX_SPEED = 14;

/** A horizontally scrolling strip whose scrollbar is hidden (tab bars, chip rows,
 *  carousels) — content past the edge is otherwise unreachable with a mouse. */
function isHiddenScrollStrip(el: HTMLElement): boolean {
  if (el.dataset.edgeHover || el.dataset.noEdgeScroll != null) return false; // already handled / opted out
  if (el.scrollWidth <= el.clientWidth + 1) return false;
  const cs = getComputedStyle(el);
  if (cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') return false;
  if (cs.scrollSnapType !== 'none' && cs.scrollSnapType !== '') return false; // snap carousels fight programmatic scroll
  // A visible scrollbar means the user can drag it — leave data tables and the like alone.
  const bar = el.offsetHeight - el.clientHeight - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth);
  if (bar > 1) return false;
  if (el.querySelector('table')) return false;
  return true;
}

/** One app-wide mouse handler: near the right edge of any hidden-scrollbar strip
 *  it glides right, near the left edge it glides left (faster closer to the edge).
 *  Mouse only; respects prefers-reduced-motion. Opt out with `data-no-edge-scroll`. */
export function useGlobalEdgeHoverScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let target: HTMLElement | null = null;
    let speed = 0;
    let frame = 0;

    const tick = () => {
      if (!target || speed === 0) { frame = 0; return; }
      const atStart = target.scrollLeft <= 0;
      const atEnd = target.scrollLeft + target.clientWidth >= target.scrollWidth - 1;
      if ((speed > 0 && atEnd) || (speed < 0 && atStart)) { speed = 0; frame = 0; return; }
      target.scrollLeft += speed;
      frame = requestAnimationFrame(tick);
    };

    const findStrip = (from: EventTarget | null): HTMLElement | null => {
      let el = from instanceof HTMLElement ? from : null;
      for (let depth = 0; el && el !== document.body && depth < 8; depth++, el = el.parentElement) {
        if (isHiddenScrollStrip(el)) return el;
      }
      return null;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const strip = findStrip(e.target);
      if (!strip) { speed = 0; target = null; return; }
      target = strip;
      const rect = strip.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      if (x > 1 - EDGE) speed = Math.ceil(((x - (1 - EDGE)) / EDGE) * MAX_SPEED);
      else if (x < EDGE) speed = -Math.ceil(((EDGE - x) / EDGE) * MAX_SPEED);
      else speed = 0;
      if (speed !== 0 && !frame) frame = requestAnimationFrame(tick);
    };
    const stop = () => { speed = 0; target = null; };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', stop);
    window.addEventListener('blur', stop);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', stop);
      window.removeEventListener('blur', stop);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
