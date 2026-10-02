import { type ReactNode } from 'react';
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
  return (
    <div className={clsx('border-b border-bone overflow-x-auto scrollbar-hide', className)}>
      <div className="flex items-center min-w-max">
        {tabs.map(tab => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={clsx(
                'flex items-center font-medium shrink-0',
                dense ? 'gap-[4px] px-[10px] py-2 text-[11.5px]' : 'gap-[6px] px-4 py-[10px] text-[13px]',
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
                  'text-[10px] font-semibold px-[6px] py-[1px] rounded-full',
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
