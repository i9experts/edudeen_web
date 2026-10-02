import { useId, useState, type KeyboardEvent } from 'react';
import { X, ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import { DialogShell } from './DialogShell';

const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEK_DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const HOURS     = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINS      = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const CX = 110, CY = 110, R_BG = 100, R_ITEM = 78;

function polar(val: number, outOf: number, r: number) {
  const a = ((val / outOf) * 360 - 90) * (Math.PI / 180);
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

export interface DateTimePickerModalProps {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}

type Mode = 'hour' | 'minute';
type Sel  = { y: number; m: number; d: number };

export function DateTimePickerModal({ value, onChange, onClose }: DateTimePickerModalProps) {
  const titleId   = useId();

  const init = value ? new Date(value) : null;
  const now  = new Date();

  const [viewY, setViewY] = useState(init?.getFullYear() ?? now.getFullYear());
  const [viewM, setViewM] = useState(init?.getMonth()    ?? now.getMonth());
  const [sel,   setSel]   = useState<Sel | null>(
    init ? { y: init.getFullYear(), m: init.getMonth(), d: init.getDate() } : null,
  );

  const [mode,   setMode]   = useState<Mode>('hour');
  const [hour,   setHour]   = useState(init ? (init.getHours() % 12 || 12) : 10);
  const [minute, setMinute] = useState(init ? Math.round(init.getMinutes() / 5) * 5 % 60 : 0);
  const [ampm,   setAmpm]   = useState<'AM'|'PM'>(init ? (init.getHours() >= 12 ? 'PM' : 'AM') : 'AM');

  // ─── Calendar ──────────────────────────────────────────────────────────────
  const firstDOW  = new Date(viewY, viewM, 1).getDay();
  const daysInMon = new Date(viewY, viewM + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDOW).fill(null),
    ...Array.from({ length: daysInMon }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today  = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
  const isPast = (d: number) => {
    if (viewY < today.y) return true;
    if (viewY === today.y && viewM < today.m) return true;
    if (viewY === today.y && viewM === today.m && d < today.d) return true;
    return false;
  };
  const isSel   = (d: number) => sel?.y === viewY && sel?.m === viewM && sel?.d === d;
  const isToday = (d: number) => viewY === today.y && viewM === today.m && d === today.d;

  const prevMonth = () => {
    if (viewM === 0) { setViewM(11); setViewY(y => y - 1); }
    else setViewM(m => m - 1);
  };
  const nextMonth = () => {
    if (viewM === 11) { setViewM(0); setViewY(y => y + 1); }
    else setViewM(m => m + 1);
  };

  // ─── Clock hand position ───────────────────────────────────────────────────
  const handPos = mode === 'hour'
    ? polar(hour === 12 ? 0 : hour, 12, R_ITEM)
    : polar(minute, 60, R_ITEM);

  // ─── Confirm ───────────────────────────────────────────────────────────────
  const confirm = () => {
    if (!sel) return;
    const h24 = ampm === 'AM' ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
    const p   = (n: number) => String(n).padStart(2, '0');
    onChange(`${sel.y}-${p(sel.m + 1)}-${p(sel.d)}T${p(h24)}:${p(minute)}`);
    onClose();
  };

  const hh        = String(hour).padStart(2, '0');
  const mm        = String(minute).padStart(2, '0');
  const dateLabel = sel
    ? new Date(sel.y, sel.m, sel.d).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  return (
    <DialogShell onClose={onClose} ariaLabelledBy={titleId} className="max-w-[360px] max-h-[92vh]">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-5 py-[14px] border-b border-bone">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[9px] bg-brand-pale-orange flex items-center justify-center shrink-0">
              <CalendarClock size={15} className="text-brand-orange" />
            </div>
            <div>
              <p id={titleId} className="text-[14px] font-bold text-charcoal leading-tight">Schedule Go-Live</p>
              <p className="text-[11px] text-slate mt-[1px]">Choose date &amp; time</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-7 h-7 rounded-full bg-bone flex items-center justify-center border-none cursor-pointer text-slate hover:bg-[#e0ded6] hover:text-charcoal transition-colors shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Calendar */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous month"
                className="w-7 h-7 rounded-[7px] bg-bone border-none cursor-pointer flex items-center justify-center text-slate hover:bg-[#e0ded6] hover:text-charcoal transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[13px] font-bold text-charcoal">{MONTHS[viewM]} {viewY}</span>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="w-7 h-7 rounded-[7px] bg-bone border-none cursor-pointer flex items-center justify-center text-slate hover:bg-[#e0ded6] hover:text-charcoal transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEK_DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate uppercase tracking-wide py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 mb-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} className="h-9" />;
                const past = isPast(day);
                const s    = isSel(day);
                const t    = isToday(day);
                return (
                  <div key={i} className="flex items-center justify-center h-9">
                    <button
                      type="button"
                      disabled={past}
                      onClick={() => !past && setSel({ y: viewY, m: viewM, d: day })}
                      className="w-8 h-8 rounded-full border-none flex items-center justify-center text-[12px] transition-all duration-100"
                      style={{
                        background: s ? '#174771' : 'transparent',
                        color:      s ? '#fff' : past ? '#C5C3BB' : '#141413',
                        fontWeight: s || t ? 700 : 400,
                        cursor:     past ? 'default' : 'pointer',
                        border:     t && !s ? '1.5px solid #174771' : '1.5px solid transparent',
                      }}
                    >
                      {day}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-px mx-5 bg-bone" />

          {/* Time section */}
          <div className="px-5 pt-4 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-slate mb-3">Time</p>

            {/* Digital display: HH : MM + AM/PM */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <button
                type="button"
                onClick={() => setMode('hour')}
                className="w-[60px] h-[48px] rounded-[10px] border-none cursor-pointer text-[26px] font-bold transition-all duration-150 flex items-center justify-center select-none"
                style={{ background: mode === 'hour' ? '#174771' : '#F5F4EF', color: mode === 'hour' ? '#fff' : '#141413' }}
              >
                {hh}
              </button>
              <span className="text-[26px] font-bold text-[#c8c4bb] select-none leading-none">:</span>
              <button
                type="button"
                onClick={() => setMode('minute')}
                className="w-[60px] h-[48px] rounded-[10px] border-none cursor-pointer text-[26px] font-bold transition-all duration-150 flex items-center justify-center select-none"
                style={{ background: mode === 'minute' ? '#174771' : '#F5F4EF', color: mode === 'minute' ? '#fff' : '#141413' }}
              >
                {mm}
              </button>
              <div className="flex flex-col gap-1.5 ms-1">
                {(['AM', 'PM'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmpm(p)}
                    className="w-[40px] h-[22px] rounded-[6px] text-[11px] font-bold border-none cursor-pointer transition-all duration-150 flex items-center justify-center"
                    style={{ background: ampm === p ? '#174771' : '#E8E6DC', color: ampm === p ? '#fff' : '#8C8A82' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Clock face */}
            <div className="flex justify-center">
              <svg width="220" height="220" viewBox="0 0 220 220" style={{ display: 'block' }}>

                {/* Track */}
                <circle cx={CX} cy={CY} r={R_BG} fill="#F5F4EF" stroke="#E8E6DC" strokeWidth="1.5" />

                {/* Hand */}
                <line
                  x1={CX} y1={CY}
                  x2={handPos.x} y2={handPos.y}
                  stroke="#174771" strokeWidth="2" strokeLinecap="round"
                />

                {/* Selected indicator circle */}
                <circle cx={handPos.x} cy={handPos.y} r="15" fill="#174771" />

                {/* Center dot */}
                <circle cx={CX} cy={CY} r="3.5" fill="#174771" />

                {/* Hour or minute numbers */}
                {mode === 'hour'
                  ? HOURS.map(h => {
                      const pos      = polar(h === 12 ? 0 : h, 12, R_ITEM);
                      const isActive = h === hour;
                      const pick     = () => { setHour(h); setMode('minute'); };
                      return (
                        <g
                          key={h}
                          role="button"
                          tabIndex={0}
                          aria-label={`${h} o'clock`}
                          aria-pressed={isActive}
                          style={{ cursor: 'pointer' }}
                          onClick={pick}
                          onKeyDown={(e: KeyboardEvent<SVGGElement>) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}
                        >
                          <circle cx={pos.x} cy={pos.y} r="16" fill="transparent" />
                          <text
                            x={pos.x} y={pos.y}
                            textAnchor="middle" dominantBaseline="central"
                            fontSize="13" fill={isActive ? '#fff' : '#141413'}
                            style={{ fontWeight: isActive ? 700 : 500, userSelect: 'none', pointerEvents: 'none' }}
                          >
                            {h}
                          </text>
                        </g>
                      );
                    })
                  : MINS.map(m => {
                      const pos      = polar(m, 60, R_ITEM);
                      const isActive = m === minute;
                      const pick     = () => setMinute(m);
                      return (
                        <g
                          key={m}
                          role="button"
                          tabIndex={0}
                          aria-label={`${m} minutes`}
                          aria-pressed={isActive}
                          style={{ cursor: 'pointer' }}
                          onClick={pick}
                          onKeyDown={(e: KeyboardEvent<SVGGElement>) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}
                        >
                          <circle cx={pos.x} cy={pos.y} r="16" fill="transparent" />
                          <text
                            x={pos.x} y={pos.y}
                            textAnchor="middle" dominantBaseline="central"
                            fontSize="12" fill={isActive ? '#fff' : '#141413'}
                            style={{ fontWeight: isActive ? 700 : 500, userSelect: 'none', pointerEvents: 'none' }}
                          >
                            {String(m).padStart(2, '0')}
                          </text>
                        </g>
                      );
                    })
                }
              </svg>
            </div>

            <p className="text-center text-[11px] text-slate mt-1.5">
              {mode === 'hour' ? 'Tap an hour · then set minutes' : 'Tap a minute to set time'}
            </p>
          </div>

          {/* Preview strip */}
          <div
            className="mx-5 mb-4 px-4 py-3 rounded-[10px] border transition-all duration-200"
            style={{ background: sel ? '#EAF2F8' : '#F5F4EF', borderColor: sel ? 'rgba(23,71,113,0.3)' : '#E8E6DC' }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.07em] mb-[3px]"
              style={{ color: sel ? '#174771' : '#8C8A82' }}
            >
              {sel ? 'Going live on' : 'No date selected'}
            </p>
            <p className="text-[13px] font-semibold text-charcoal">
              {sel
                ? `${dateLabel}  ·  ${hh}:${mm} ${ampm}`
                : 'Select a date from the calendar above'}
            </p>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex gap-2.5 px-5 py-4 border-t border-bone">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-[42px] rounded-[10px] border border-bone bg-white text-[13px] font-semibold text-slate cursor-pointer hover:bg-cream transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!sel}
            className="flex-1 h-[42px] rounded-[10px] border-none text-[13px] font-semibold transition-all duration-150"
            style={{ background: sel ? '#174771' : '#E8E6DC', color: sel ? '#fff' : '#B5B3AC', cursor: sel ? 'pointer' : 'not-allowed' }}
          >
            Confirm Schedule
          </button>
        </div>

    </DialogShell>
  );
}
