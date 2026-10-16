import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useT } from '@/contexts/languageCtx';

/**
 * A horizontally scrolling row: hidden scrollbar, a soft fade on whichever edge still has
 * more content, and (desktop, mouse only) arrow buttons. RTL-aware. Pass the same
 * className you would give the scrolling div (flex, gap, snap ...).
 */
export function ScrollRow({ children, className, arrows = true }: { children: ReactNode; className?: string; arrows?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();
  const [edges, setEdges] = useState({ start: false, end: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const x = Math.abs(el.scrollLeft);
      setEdges({ start: x > 4, end: max - x > 4 });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); ro?.disconnect(); };
  }, []);
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const left = rtl ? edges.end : edges.start;   // content hidden on the physical left
  const right = rtl ? edges.start : edges.end;  // content hidden on the physical right
  const mask = left || right
    ? `linear-gradient(to right, ${left ? 'transparent' : '#000'} 0, #000 28px, #000 calc(100% - 28px), ${right ? 'transparent' : '#000'} 100%)`
    : undefined;
  const go = (dir: 1 | -1) => {
    const el = ref.current; if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  const arrowCls = 'hidden [@media(hover:hover)]:md:flex absolute top-1/2 -translate-y-1/2 z-10 size-9 rounded-full bg-white border border-bone shadow-md items-center justify-center text-carbon cursor-pointer hover:bg-cream before:absolute before:-inset-1';
  return (
    <div className="relative">
      <div ref={ref} style={mask ? { WebkitMaskImage: mask, maskImage: mask } : undefined} className={clsx('overflow-x-auto scrollbar-hide', className)}>
        {children}
      </div>
      {arrows && left && <button type="button" aria-label={t('Scroll left')} onClick={() => go(-1)} className={clsx(arrowCls, 'left-1')}><ChevronLeft size={18} /></button>}
      {arrows && right && <button type="button" aria-label={t('Scroll right')} onClick={() => go(1)} className={clsx(arrowCls, 'right-1')}><ChevronRight size={18} /></button>}
    </div>
  );
}
