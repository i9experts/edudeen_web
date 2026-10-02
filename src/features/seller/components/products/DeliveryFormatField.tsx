import { Download, MonitorPlay, Video } from 'lucide-react';
import { clsx } from 'clsx';
import type { DeliveryFormat, LiveSessionInput } from '@/api/services/product';

export interface DeliveryState {
  format: DeliveryFormat;
  date: string;
  time: string;
  durationMinutes: string;
  platform: LiveSessionInput['platform'];
  meetingUrl: string;
  capacity: string;
  notes: string;
}

export const EMPTY_DELIVERY: DeliveryState = {
  format: 'download', date: '', time: '17:00', durationMinutes: '60', platform: 'zoom', meetingUrl: '', capacity: '', notes: '',
};

const OPTIONS: { value: DeliveryFormat; label: string; hint: string; Icon: typeof Download }[] = [
  { value: 'download', label: 'Files to download', hint: 'Worksheets, books, slides — buyers download them.', Icon: Download },
  { value: 'course', label: 'Online course', hint: 'Lessons with videos, PDFs and quizzes, progress and a certificate.', Icon: MonitorPlay },
  { value: 'live_class', label: 'Live class', hint: 'A Zoom / Google Meet session at a set time. Buyers get the link.', Icon: Video },
];

const PLATFORMS: { value: LiveSessionInput['platform']; label: string }[] = [
  { value: 'zoom', label: 'Zoom' }, { value: 'google_meet', label: 'Google Meet' }, { value: 'teams', label: 'Microsoft Teams' }, { value: 'other', label: 'Other' },
];

const inp = 'w-full px-3 py-[10px] text-[14px] border border-bone rounded-lg text-carbon bg-white placeholder:text-[#9aa6ad] outline-none focus:border-brand-royal focus:ring-2 focus:ring-brand-royal/15';
const lbl = 'text-[13px] font-bold text-carbon block mb-1.5';

/** Builds state from a saved product (edit form). */
export function deliveryFromProduct(p: { deliveryFormat?: DeliveryFormat | null; liveSession?: (Partial<LiveSessionInput> & { startsAt?: string }) | null }): DeliveryState {
  const live = p.liveSession;
  const d = live?.startsAt ? new Date(live.startsAt) : null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    ...EMPTY_DELIVERY,
    format: p.deliveryFormat ?? 'download',
    date: d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '',
    time: d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : EMPTY_DELIVERY.time,
    durationMinutes: live?.durationMinutes ? String(live.durationMinutes) : EMPTY_DELIVERY.durationMinutes,
    platform: (live?.platform as LiveSessionInput['platform']) ?? 'zoom',
    meetingUrl: live?.meetingUrl ?? '',
    capacity: live?.capacity ? String(live.capacity) : '',
    notes: live?.notes ?? '',
  };
}

/** Client-side check before saving; the server re-checks everything. */
export function deliveryError(s: DeliveryState): string | null {
  if (s.format !== 'live_class') return null;
  if (!s.date || !s.time) return 'Pick the date and time of the live class.';
  const dur = Number(s.durationMinutes);
  if (!Number.isInteger(dur) || dur < 15 || dur > 600) return 'Class length should be 15–600 minutes.';
  if (!/^https:\/\/\S+$/i.test(s.meetingUrl.trim())) return 'Add the https:// meeting link.';
  if (s.capacity && (!Number.isInteger(Number(s.capacity)) || Number(s.capacity) < 1)) return 'Seats must be a whole number (or leave empty).';
  return null;
}

export function deliveryPayload(s: DeliveryState): { deliveryFormat: DeliveryFormat; liveSession?: LiveSessionInput | null } {
  if (s.format !== 'live_class') return { deliveryFormat: s.format };
  return {
    deliveryFormat: 'live_class',
    liveSession: {
      startsAt: new Date(`${s.date}T${s.time}:00`).toISOString(),
      durationMinutes: Number(s.durationMinutes),
      platform: s.platform,
      meetingUrl: s.meetingUrl.trim(),
      capacity: s.capacity ? Number(s.capacity) : null,
      notes: s.notes.trim(),
    },
  };
}

/** "How buyers get it" — downloads, an online course, or a live class with its schedule. */
export function DeliveryFormatField({ value, onChange }: { value: DeliveryState; onChange: (v: DeliveryState) => void }) {
  const set = <K extends keyof DeliveryState>(k: K, v: DeliveryState[K]) => onChange({ ...value, [k]: v });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="How buyers get it" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {OPTIONS.map(o => {
          const on = value.format === o.value;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => set('format', o.value)}
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

      {value.format === 'live_class' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="live-date" className={lbl}>Date</label>
            <input id="live-date" type="date" min={today} className={inp} value={value.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label htmlFor="live-time" className={lbl}>Start time (Pakistan time)</label>
            <input id="live-time" type="time" className={inp} value={value.time} onChange={e => set('time', e.target.value)} />
          </div>
          <div>
            <label htmlFor="live-dur" className={lbl}>Length (minutes)</label>
            <input id="live-dur" type="number" min={15} max={600} step={5} className={inp} value={value.durationMinutes} onChange={e => set('durationMinutes', e.target.value)} />
          </div>
          <div>
            <label htmlFor="live-seats" className={lbl}>Seats <span className="text-[12px] font-normal text-slate">(optional — empty means no limit)</span></label>
            <input id="live-seats" type="number" min={1} className={inp} value={value.capacity} onChange={e => set('capacity', e.target.value)} placeholder="e.g. 30" />
          </div>
          <div>
            <label htmlFor="live-platform" className={lbl}>Platform</label>
            <select id="live-platform" className={inp} value={value.platform} onChange={e => set('platform', e.target.value as LiveSessionInput['platform'])}>
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="live-url" className={lbl}>Meeting link</label>
            <input id="live-url" type="url" className={inp} value={value.meetingUrl} onChange={e => set('meetingUrl', e.target.value)} placeholder="https://zoom.us/j/…" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="live-notes" className={lbl}>Notes for students <span className="text-[12px] font-normal text-slate">(optional)</span></label>
            <textarea id="live-notes" rows={2} maxLength={1000} className={`${inp} resize-y`} value={value.notes} onChange={e => set('notes', e.target.value)} placeholder="Passcode, what to bring, how to prepare…" />
          </div>
          <p className="sm:col-span-2 text-[12px] text-slate m-0">Only buyers see the link — in My Library and on their order. Sales stop when the class ends or the seats are full.</p>
        </div>
      )}
    </div>
  );
}
