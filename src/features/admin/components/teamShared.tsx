import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import type { TeamPeriod } from '@/api/services/operations';
import { PERIODS } from './teamUtils';

export function PeriodSwitch({ value, onChange }: { value: TeamPeriod; onChange: (d: TeamPeriod) => void }) {
  return (
    <div role="radiogroup" aria-label="Period" className="inline-flex rounded-full border border-bone bg-white p-0.5">
      {PERIODS.map(d => (
        <button key={d} type="button" role="radio" aria-checked={value === d} onClick={() => onChange(d)}
          className={clsx('rounded-full px-3 py-1 text-[12.5px] cursor-pointer border-none', value === d ? 'bg-brand-orange text-white font-semibold' : 'bg-transparent text-charcoal')}>
          {d} days
        </button>
      ))}
    </div>
  );
}

/** Breach-aware value: red when it misses the target. */
export function Metric({ children, bad }: { children: ReactNode; bad?: boolean }) {
  return <span className={clsx(bad ? 'text-error font-semibold' : 'text-carbon')}>{children}</span>;
}
