import { useEffect, useMemo, useRef, useState } from 'react';
import { Captions, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '@/contexts/languageCtx';
import type { LessonSubtitle } from '@/api/services/classroom';
import { SUBTITLE_LANGS, parseCues, subtitleShortLabel } from '@/utils/subtitles';

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const langLabel = (code: string) => SUBTITLE_LANGS.find(l => l.code === code)?.label ?? code;

/**
 * Subtitles under a lesson: the current line in large text (voice lessons, when `time` is given) plus the whole
 * transcript. Urdu / English switch when the teacher added both. Text only, never HTML.
 * Pass `time` (seconds) to follow playback; pass `onSeek` to make transcript lines jump to that moment.
 */
export function LessonSubtitles({ subtitles, time, onSeek, live, choice, onChoice }: {
  subtitles: LessonSubtitle[];
  time?: number;
  onSeek?: (t: number) => void;
  /** Show the line being spoken right now, big, above the transcript. */
  live?: boolean;
  /** Controlled mode (voice lessons): the learner's pick, `'off'` hides the subtitles. Leave both out to let this component remember the language itself. */
  choice?: 'ur' | 'en' | 'roman_ur' | 'off';
  onChoice?: (c: 'ur' | 'en' | 'roman_ur' | 'off') => void;
}) {
  const { lang: appLang } = useLanguage();
  // Starts in the learner's own language when the teacher wrote one, else the first available.
  const [ownLang, setOwnLang] = useState(() => (subtitles.find(s => s.lang === appLang) ?? subtitles[0])?.lang ?? 'en');
  const controlled = choice !== undefined && onChoice !== undefined;
  const off = controlled && choice === 'off';
  const lang = controlled && choice !== 'off' ? choice : ownLang;
  const setLang = (l: 'ur' | 'en' | 'roman_ur') => (controlled ? onChoice(l) : setOwnLang(l));
  const sub = subtitles.find(s => s.lang === lang) ?? subtitles[0] ?? null;
  const cues = useMemo(() => (sub && sub.kind !== 'text' ? parseCues(sub.content) : []), [sub]);
  const timed = cues.length > 0;
  const [open, setOpen] = useState(!timed);
  const listRef = useRef<HTMLDivElement>(null);

  const active = time === undefined ? -1 : cues.findIndex(c => time >= c.start && time < c.end);
  const dir = SUBTITLE_LANGS.find(l => l.code === sub?.lang)?.dir ?? 'ltr';
  const urdu = sub?.lang === 'ur';

  // Keep the spoken line visible inside the transcript box (scrolls the box only, never the page).
  useEffect(() => {
    const box = listRef.current;
    const el = active >= 0 ? box?.querySelector<HTMLElement>(`[data-cue="${active}"]`) : null;
    if (!box || !el) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top - box.clientHeight / 3;
  }, [active]);

  if (!sub) return null;

  return (
    <section aria-label="Subtitles" className="rounded-xl border border-bone bg-white overflow-hidden">
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b border-bone bg-cream/60">
        <Captions size={15} className="text-brand-royal shrink-0" aria-hidden />
        <span className="text-[13px] font-bold text-carbon">Subtitles</span>
        {(subtitles.length > 1 || controlled) && (
          <div role="radiogroup" aria-label="Subtitle language" className="inline-flex rounded-lg border border-bone overflow-hidden">
            {subtitles.map(s => (
              <button key={s.lang} type="button" role="radio" aria-checked={!off && s.lang === sub.lang} onClick={() => setLang(s.lang)} lang={s.lang}
                className={clsx('px-2.5 py-1 text-[12.5px] border-none cursor-pointer', s.lang === 'ur' && 'font-urdu', !off && s.lang === sub.lang ? 'bg-carbon text-white' : 'bg-white text-graphite hover:bg-cream')}>
                {subtitleShortLabel(s.lang)}
              </button>
            ))}
            {controlled && (
              <button type="button" role="radio" aria-checked={off} onClick={() => onChoice('off')}
                className={clsx('px-2.5 py-1 text-[12.5px] border-none cursor-pointer', off ? 'bg-carbon text-white' : 'bg-white text-graphite hover:bg-cream')}>Off</button>
            )}
          </div>
        )}
        {subtitles.length === 1 && !controlled && <span className="text-[12px] text-slate" lang={sub.lang}>{langLabel(sub.lang)}</span>}
        {timed && !off && (
          <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)}
            className="ms-auto inline-flex items-center gap-1 bg-transparent border-none cursor-pointer text-[12.5px] font-semibold text-brand-orange">
            {open ? 'Hide transcript' : 'Show transcript'} {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {live && timed && !off && (
        <p dir={dir} lang={sub.lang} aria-hidden
          className={clsx('m-0 px-4 py-4 min-h-[88px] flex items-center justify-center text-center text-[18px] md:text-[22px] leading-[1.9] text-carbon whitespace-pre-line', urdu && 'font-urdu')}>
          {active >= 0 ? cues[active].text : ''}
        </p>
      )}

      {open && !off && (
        <div ref={listRef} className="relative max-h-[280px] overflow-y-auto border-t border-bone">
          {timed ? (
            <ul className="list-none m-0 p-1 flex flex-col">
              {cues.map((c, i) => {
                const row = (
                  <>
                    <span className="text-[11.5px] text-slate tabular-nums shrink-0 mt-1" dir="ltr">{mmss(c.start)}</span>
                    <span dir={dir} lang={sub.lang} className={clsx('flex-1 text-[14px] leading-[1.8] whitespace-pre-line', urdu && 'font-urdu')}>{c.text}</span>
                  </>
                );
                const cls = clsx('w-full flex items-start gap-3 rounded-lg px-2.5 py-1.5 text-start border-none', i === active ? 'bg-brand-pale-orange text-carbon' : 'bg-transparent text-charcoal');
                return (
                  <li key={i} data-cue={i}>
                    {onSeek
                      ? <button type="button" onClick={() => onSeek(c.start)} aria-current={i === active ? 'true' : undefined} className={clsx(cls, 'cursor-pointer hover:bg-fog')}>{row}</button>
                      : <div className={cls}>{row}</div>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p dir={dir} lang={sub.lang} className={clsx('m-0 p-4 text-[14.5px] leading-[1.9] text-charcoal whitespace-pre-line', urdu && 'font-urdu')}>{sub.content}</p>
          )}
        </div>
      )}
    </section>
  );
}
