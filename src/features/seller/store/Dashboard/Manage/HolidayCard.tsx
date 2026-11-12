import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarOff } from 'lucide-react';
import { Toggle } from '@/components/comman/ui';
import { apiUpdateStoreHoliday } from '@/api/services/store';
import { isoToPktWall, pktNowWall } from '@/utils/pkTime';
import type { StoreHolidayInfo } from '@/utils/storeHoliday';
import { StoreHolidayBanner } from '@/features/storefront/sections/StoreHolidayBanner';
import { useToast } from '@/contexts/ToastContext';
import { useSettingsSection } from './settingsDirty';

const MESSAGE_MAX = 200;

/** Tomorrow's Pakistan date "YYYY-MM-DD" - the earliest return day the API accepts. */
function pktTomorrow(): string {
  const [y, m, d] = pktNowWall().slice(0, 10).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return t.toISOString().slice(0, 10);
}

type Draft = { enabled: boolean; day: string; message: string; digitalStillSells: boolean };

function fromStore(h: StoreHolidayInfo | null | undefined): Draft {
  // A holiday whose return day has already passed is shown as off (the daily check may not have run yet).
  const over = !!h?.returnDate && new Date(h.returnDate).getTime() <= Date.now();
  return {
    enabled: !!h?.enabled && !over,
    day: h?.returnDate && !over ? isoToPktWall(h.returnDate).slice(0, 10) : '',
    message: h?.message ?? '',
    digitalStillSells: h?.digitalStillSells !== false,
  };
}

/**
 * Holiday mode (top of Store Settings -> General). Physical orders pause; digital follows the second switch.
 * Saved through the tab's single Save bar (`useSettingsSection`), which already shows saving and error states.
 */
export function HolidayCard({ storeId, holiday, refetch }: { storeId: string; holiday: StoreHolidayInfo | null | undefined; refetch: () => void }) {
  const toast = useToast();
  const saved = useMemo(() => fromStore(holiday), [holiday]);
  const [draft, setDraft] = useState<Draft>(saved);
  const [savedNote, setSavedNote] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => { setDraft(saved); }, [saved]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const min = pktTomorrow();
  const dayError = draft.enabled && draft.day && draft.day < min ? 'Pick a day after today (Pakistan time).' : null;
  const msgError = draft.message.length > MESSAGE_MAX ? `Keep it to ${MESSAGE_MAX} characters.` : null;
  const dirty = draft.enabled !== saved.enabled
    || (draft.enabled && (draft.day !== saved.day || draft.digitalStillSells !== saved.digitalStillSells))
    || draft.message.trim() !== saved.message.trim();

  useSettingsSection('holiday', {
    label: 'Holiday mode',
    dirty,
    blocked: dayError ?? msgError,
    discard: () => setDraft(saved),
    save: async () => {
      await apiUpdateStoreHoliday(storeId, {
        enabled: draft.enabled,
        returnDate: draft.enabled && draft.day ? draft.day : null,
        message: draft.message.trim() || null,
        digitalStillSells: draft.digitalStillSells,
      });
      refetch();
      setSavedNote(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setSavedNote(false), 4000);
      toast.success(draft.enabled ? 'Holiday mode is on. Buyers see it now.' : 'Holiday mode is off. Your store is open.');
    },
  });

  const preview: StoreHolidayInfo = {
    enabled: true,
    returnDate: draft.day ? new Date(`${draft.day}T00:00:00+05:00`).toISOString() : null,
    message: draft.message.trim() || null,
    digitalStillSells: draft.digitalStillSells,
  };

  return (
    <div id="holiday" className="bg-white rounded-xl p-4 sm:p-6 border border-bone sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-[30px] h-[30px] rounded-lg bg-brand-pale-orange flex items-center justify-center shrink-0">
            <CalendarOff size={15} className="text-brand-orange" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-charcoal">Store on holiday</p>
            <p className="text-[12px] text-slate">Pause orders while you are away. Orders already placed are not affected.</p>
          </div>
        </div>
        <Toggle label="Store on holiday" checked={draft.enabled} onChange={v => setDraft(d => ({ ...d, enabled: v }))} />
      </div>

      {savedNote && <p role="status" className="mt-3 text-[12px] font-semibold text-success">Saved.</p>}

      {draft.enabled && (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="holiday-day" className="text-[12px] font-semibold text-charcoal block mb-1.5">Back on (Pakistan time)</label>
              <input
                id="holiday-day" type="date" min={min} value={draft.day}
                onChange={e => setDraft(d => ({ ...d, day: e.target.value }))}
                aria-invalid={!!dayError}
                className="w-full max-w-[220px] px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border"
              />
              <p className="text-[12px] text-slate mt-1">The store reopens by itself on this day. Leave empty to switch it off yourself.</p>
              {dayError && <p className="text-[12px] text-error mt-1">{dayError}</p>}
            </div>

            <div>
              <label htmlFor="holiday-msg" className="text-[12px] font-semibold text-charcoal block mb-1.5">Message for buyers (optional)</label>
              <textarea
                id="holiday-msg" rows={3} value={draft.message} maxLength={MESSAGE_MAX + 50}
                onChange={e => setDraft(d => ({ ...d, message: e.target.value }))}
                placeholder="e.g. We are away for Eid. Orders restart when we are back."
                aria-invalid={!!msgError}
                className="w-full px-3 py-[9px] rounded-lg text-[13px] border border-bone bg-bone text-charcoal outline-none box-border resize-y"
              />
              <p className={`text-[12px] mt-1 text-end ${msgError ? 'text-error' : 'text-slate'}`}>{draft.message.length}/{MESSAGE_MAX}</p>
              {msgError && <p className="text-[12px] text-error">{msgError}</p>}
            </div>

            <div className="flex items-center justify-between gap-3 px-[14px] py-3 rounded-[9px] border border-bone bg-cream">
              <div>
                <p className="text-[13px] font-medium text-charcoal">Digital products still on sale</p>
                <p className="text-[12px] text-slate">Downloads and courses are delivered automatically. Turn this off to pause them too.</p>
              </div>
              <Toggle label="Digital products still on sale" checked={draft.digitalStillSells} onChange={v => setDraft(d => ({ ...d, digitalStillSells: v }))} />
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-charcoal mb-1.5">What buyers will see on your store</p>
            <div className="rounded-lg border border-bone overflow-hidden">
              <StoreHolidayBanner holiday={preview} />
              <p className="px-4 py-3 text-[12px] text-slate">Add to cart is switched off for {draft.digitalStillSells ? 'physical products' : 'all products'} and shows when you are back.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
