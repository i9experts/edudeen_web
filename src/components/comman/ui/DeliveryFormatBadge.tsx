import { Download, MonitorPlay } from 'lucide-react';
import { clsx } from 'clsx';
import { deliveryFormatLabel, normalizeDeliveryFormat } from '@/utils/deliveryFormat';

const STYLE = {
  download: 'bg-[#eef0ff] text-[#3851d1]',
  course: 'bg-[#e8f6ee] text-[#1d7a46]',
} as const;
const ICON = { download: Download, course: MonitorPlay } as const;

/** Small pill naming how a digital product is delivered: File download / Online course. */
export function DeliveryFormatBadge({ format, className, showIcon = true }: { format: unknown; className?: string; showIcon?: boolean }) {
  const f = normalizeDeliveryFormat(format);
  const Icon = ICON[f];
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[12px] font-semibold whitespace-nowrap', STYLE[f], className)}>
      {showIcon && <Icon size={11} aria-hidden />} {deliveryFormatLabel(f)}
    </span>
  );
}
