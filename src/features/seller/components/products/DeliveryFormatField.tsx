import { Download, MonitorPlay } from 'lucide-react';
import { clsx } from 'clsx';
import { normalizeDeliveryFormat } from '@/utils/deliveryFormat';
import type { DeliveryFormat } from '@/api/services/product';

export interface DeliveryState {
  format: DeliveryFormat;
}

export const EMPTY_DELIVERY: DeliveryState = { format: 'download' };

const OPTIONS: { value: DeliveryFormat; label: string; hint: string; Icon: typeof Download }[] = [
  { value: 'download', label: 'Files to download', hint: 'Worksheets, books, slides — buyers download them.', Icon: Download },
  { value: 'course', label: 'Online course', hint: 'Video lessons with progress and a certificate.', Icon: MonitorPlay },
];

/** Builds state from a saved product (edit form). Unknown / retired formats become a normal download. */
export function deliveryFromProduct(p: { deliveryFormat?: unknown }): DeliveryState {
  return { format: normalizeDeliveryFormat(p.deliveryFormat) };
}

export function deliveryPayload(s: DeliveryState): { deliveryFormat: DeliveryFormat } {
  return { deliveryFormat: normalizeDeliveryFormat(s.format) };
}

/** "How buyers get it" — downloads or an online course. */
export function DeliveryFormatField({ value, onChange }: { value: DeliveryState; onChange: (v: DeliveryState) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="How buyers get it" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {OPTIONS.map(o => {
          const on = value.format === o.value;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange({ ...value, format: o.value })}
              className={clsx('text-left rounded-xl border-[1.5px] px-3 py-3 cursor-pointer bg-white transition-colors', on ? 'border-brand-royal bg-brand-pale-orange/40' : 'border-bone hover:border-brand-royal/40')}>
              <o.Icon size={18} className={on ? 'text-brand-royal' : 'text-slate'} />
              <span className="block text-[13.5px] font-bold text-carbon mt-1.5">{o.label}</span>
              <span className="block text-[12px] text-slate mt-0.5 leading-snug">{o.hint}</span>
            </button>
          );
        })}
      </div>

      {value.format === 'course' && (
        <p className="text-[12.5px] text-graphite rounded-lg bg-cream px-3 py-2 m-0">
          After you save, the course builder opens so you can add sections, lessons and quizzes. A course can be published once it has at least one lesson.
        </p>
      )}
    </div>
  );
}
