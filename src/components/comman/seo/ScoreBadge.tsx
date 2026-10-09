import { clsx } from 'clsx';

interface ScoreBadgeProps {
  score:      number;
  className?: string;
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  const tone = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'error';
  return (
    <span
      className={clsx(
        'inline-flex items-center text-[12px] font-semibold px-2 py-[2px] rounded-[5px] shrink-0 whitespace-nowrap',
        tone === 'success' && 'bg-success-bg text-success',
        tone === 'warning' && 'bg-warning-bg text-warning',
        tone === 'error'   && 'bg-error-bg text-error',
        className,
      )}
    >
      {Math.round(score)}/100
    </span>
  );
}
