import { CalendarOff } from 'lucide-react';
import { AwayText, type StoreHolidayInfo } from '@/utils/storeHoliday';

/**
 * Public storefront banner while the store is on holiday. Also used (as a preview) by the seller's holiday card, so
 * what the seller sees is exactly what buyers get. The seller's own message is shown as typed.
 */
export function StoreHolidayBanner({ holiday, className }: { holiday: StoreHolidayInfo | null | undefined; className?: string }) {
  if (!holiday?.enabled) return null;
  return (
    <div role="status" className={`bg-[#fff7e6] border-b border-[#f3d9a4] text-[#7a4b00] ${className ?? ''}`}>
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 py-2.5 flex items-start gap-2.5 text-[13px] leading-snug">
        <CalendarOff size={16} className="shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold"><AwayText holiday={holiday} /></p>
          {holiday.message && <p className="mt-0.5 break-words">{holiday.message}</p>}
          <p className="mt-0.5 text-[12px] opacity-90">
            {holiday.digitalStillSells ? 'Digital downloads and courses are still available.' : 'Orders resume when the store is back.'}
          </p>
        </div>
      </div>
    </div>
  );
}
