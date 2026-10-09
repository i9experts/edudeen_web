import { type ReactNode } from 'react';
import { clsx } from 'clsx';
import type { BadgeColor } from '@/types';
import { statusColor, statusLabel } from '@/constants/statusLabels';

interface BadgeProps {
  children:   ReactNode;
  color?:     BadgeColor;
  size?:      'sm' | 'md';
  dot?:       boolean;
  className?: string;
}

// Soft studio-style status pills (e.g. Published = green, Pending review = amber).
const colorClasses: Record<BadgeColor, string> = {
  gray:   'bg-mist text-slate',
  orange: 'bg-brand-pale-orange text-brand-deep-orange',
  green:  'bg-[#eaf3e3] text-[#3b6720]',
  red:    'bg-error-bg text-error',
  yellow: 'bg-[#faf0d4] text-[#755600]',
  blue:   'bg-info-bg text-info',
};

const dotColor: Record<BadgeColor, string> = {
  gray:   'bg-slate',
  orange: 'bg-brand-orange',
  green:  'bg-success',
  red:    'bg-error',
  yellow: 'bg-warning',
  blue:   'bg-info',
};

export function Badge({ children, color = 'gray', size = 'md', dot, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-[5px] rounded-full whitespace-nowrap font-medium',
        size === 'md' ? 'text-[12px] py-[5px] px-[10px]' : 'text-[12px] py-[2px] px-[8px]',
        colorClasses[color],
        className,
      )}
    >
      {dot && <span className={clsx('w-[5px] h-[5px] rounded-full shrink-0', dotColor[color])} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, size, className }: { status: string; size?: 'sm' | 'md'; className?: string }) {
  // Colour + wording come from one map (src/constants/statusLabels.ts).
  return <Badge color={statusColor(status)} size={size} className={className}>{statusLabel(status)}</Badge>;
}
