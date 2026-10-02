import { type ReactNode } from 'react';
import { clsx } from 'clsx';

interface InfoRowProps {
  label:      string;
  value:      ReactNode;
  border?:    boolean;
  className?: string;
}

export function InfoRow({ label, value, border = true, className }: InfoRowProps) {
  return (
    <div className={clsx(
      'flex justify-between items-start py-[10px]',
      border && 'border-b border-bone last:border-b-0',
      className,
    )}>
      <span className="text-[12px] text-slate shrink-0 me-4 pt-px">{label}</span>
      <span className="text-[13px] text-carbon text-end">{value ?? '—'}</span>
    </div>
  );
}
