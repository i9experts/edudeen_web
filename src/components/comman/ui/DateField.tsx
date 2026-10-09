import { useRef } from 'react';
import { CalendarDays } from 'lucide-react';
import { clsx } from 'clsx';

/** yyyy-mm-dd -> dd/mm/yyyy (always, regardless of browser locale). */
export function formatDmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/**
 * Filter-style date control: shows dd/mm/yyyy and opens the native calendar.
 * Value stays yyyy-mm-dd so existing API params are unchanged.
 */
export function DateField({ id, label, value, onChange, className }: {
  id?: string; label: string; value: string; onChange: (v: string) => void; className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <label htmlFor={id} className={clsx('relative inline-flex items-center gap-1.5 bg-white border border-bone rounded-lg text-[13px] ps-3 pe-2 py-[7px] cursor-pointer hover:bg-cream transition-colors', className)}>
      <span className="text-slate">{label}</span>
      <span className={clsx('num min-w-[78px]', value ? 'text-carbon' : 'text-slate')}>{formatDmy(value) || 'dd/mm/yyyy'}</span>
      <CalendarDays size={13} className="text-slate shrink-0" aria-hidden="true" />
      <input
        ref={ref}
        id={id}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onClick={() => { try { ref.current?.showPicker?.(); } catch { /* unsupported: native click handles it */ } }}
      />
    </label>
  );
}