import { type ReactNode, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';


export interface Tab {
  id:     string;
  label:  string;
  icon?:  ReactNode;
  count?: number;
}

interface TabBarProps {
  tabs:       Tab[];
  active:     string;
  onChange:   (id: string) => void;
  className?: string;
  /** Tighter padding/font — for narrow containers where the default size would clip. */
  dense?: boolean;
}

export function TabBar({ tabs, active, onChange, className, dense = false }: TabBarProps) {
  // ScrollTabs behaviour: the active tab is scrolled into view and a fade shows
  // on whichever edge still has hidden tabs.
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const x = Math.abs(el.scrollLeft);
      setEdges({ start: x > 4, end: max - x > 4 });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [tabs.length]);
  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const box = scroller.current;
    if (!el || !box) return;
    const left = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
    box.scrollTo({ left: document.documentElement.dir === 'rtl' ? -Math.max(0, left) : Math.max(0, left), behavior: 'smooth' });
  }, [active]);

  const fade = edges.start || edges.end
    ? { WebkitMaskImage: `linear-gradient(to right, ${edges.start ? 'transparent' : '#000'} 0, #000 28px, #000 calc(100% - 28px), ${edges.end ? 'transparent' : '#000'} 100%)`, maskImage: `linear-gradient(to right, ${edges.start ? 'transparent' : '#000'} 0, #000 28px, #000 calc(100% - 28px), ${edges.end ? 'transparent' : '#000'} 100%)` }
    : undefined;

  return (
    <div ref={scroller} style={fade} className={clsx('border-b border-bone overflow-x-auto scrollbar-hide', className)}>
      <div className="flex items-center min-w-max">
        {tabs.map(tab => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChange(tab.id)}
              className={clsx(
                'flex items-center font-medium shrink-0',
                dense ? 'gap-[4px] px-[10px] py-2 text-[12px]' : 'gap-[6px] px-4 py-[10px] text-[13px]',
                'border-b-2 -mb-px bg-transparent border-s-0 border-e-0 border-t-0',
                'outline-none cursor-pointer transition-all duration-150 whitespace-nowrap',
                isActive
                  ? 'border-b-brand-orange text-brand-orange'
                  : 'border-b-transparent text-slate hover:text-carbon',
              )}
            >
              {tab.icon && <span className="leading-none shrink-0">{tab.icon}</span>}
              {tab.label}
              {tab.count != null && (
                <span className={clsx(
                  'text-[12px] font-semibold px-[6px] py-[1px] rounded-full',
                  isActive ? 'bg-brand-pale-orange text-brand-deep-orange' : 'bg-cream text-slate',
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
