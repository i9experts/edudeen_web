import { clsx } from 'clsx';
import { HEALTH_LABEL, type HealthLevel } from '@/api/services/operations';

const HEALTH_STYLE: Record<HealthLevel, string> = {
  good: 'bg-success-bg text-success-text',
  watch: 'bg-warning-bg text-warning-text',
  action: 'bg-error-bg text-error',
};

export function HealthPill({ level, reasons }: { level: HealthLevel; reasons?: string[] }) {
  return (
    <span title={reasons?.join('\n') || undefined} className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap', HEALTH_STYLE[level])}>
      {HEALTH_LABEL[level]}
    </span>
  );
}

