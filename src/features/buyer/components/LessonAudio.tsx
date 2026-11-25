import { useRef, useState } from 'react';
import { Captions, Headphones } from 'lucide-react';
import { clsx } from 'clsx';
import type { LessonSubtitle } from '@/api/services/classroom';
import { LessonSubtitles } from './LessonSubtitles';
import { createPlayTracker } from '@/utils/playTracker';

type Choice = 'ur' | 'en' | 'off';
const PREF_KEY = 'edudeen.subtitleChoice';

const readPref = (): Choice | null => {
  try { const v = localStorage.getItem(PREF_KEY); return v === 'ur' || v === 'en' || v === 'off' ? v : null; } catch { return null; }
};
const savePref = (c: Choice) => { try { localStorage.setItem(PREF_KEY, c); } catch { /* private mode: the question is simply asked again */ } };

/**
 * Plays a voice lesson (uploaded or recorded, signed URL) with its Urdu / English subtitles following the speaker.
 * Before the voice appears the learner is asked which subtitles they want (Urdu, English or none); the answer is
 * remembered for the next voice lessons and can be changed under the player at any time.
 * Course-player mode (`lockSeek`): the learner cannot skip ahead of what they have heard, and `onFinished`
 * fires when the recording ends — the same rule as video lessons.
 */
export function LessonAudio({ file, title, subtitles, autoPlay, lockSeek, onFinished, onPlayed }: {
  file: { url: string };
  title: string;
  subtitles?: LessonSubtitle[];
  autoPlay?: boolean;
  lockSeek?: boolean;
  /** Fires when the lesson counts as listened (server-confirmed 90% when `onPlayed` is given, else when the recording ends). */
  onFinished?: () => void;
  /** Reports really-played seconds; resolves true once the server counts >= 90%. */
  onPlayed?: (playedSeconds: number, durationSeconds: number | null) => Promise<boolean>;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const maxT = useRef(0);
  const cb = useRef({ onFinished, onPlayed });
  cb.current = { onFinished, onPlayed };
  const tracker = useRef<ReturnType<typeof createPlayTracker> | null>(null);
  if (!tracker.current) {
    tracker.current = createPlayTracker({
      report: (s, d) => (cb.current.onPlayed ? cb.current.onPlayed(s, d) : Promise.resolve(false)),
      onEnough: () => cb.current.onFinished?.(),
    });
  }
  const [time, setTime] = useState(0);
  const subs = subtitles ?? [];
  // null = not asked yet. A remembered answer is only used when this lesson actually has that language.
  const [choice, setChoice] = useState<Choice | null>(() => {
    if (!subs.length) return 'off';
    const pref = readPref();
    return pref === 'off' || (pref !== null && subs.some(s => s.lang === pref)) ? pref : null;
  });
  // Choosing is a tap, so the browser lets the voice start by itself right away: one less button to press.
  const [justChose, setJustChose] = useState(false);
  const pick = (c: Choice) => { setChoice(c); savePref(c); setJustChose(true); };

  if (choice === null) {
    return (
      <div role="group" aria-label="Choose subtitles" className="rounded-xl border border-bone bg-cream/60 p-5 flex flex-col items-center gap-4 text-center">
        <div className="size-11 rounded-full bg-brand-pale-orange text-brand-royal flex items-center justify-center"><Captions size={20} aria-hidden /></div>
        <div>
          <p className="m-0 text-[16px] font-bold text-carbon">Which subtitles do you want for this voice lesson?</p>
          <p lang="ur" className="m-0 mt-1 font-urdu text-[15px] leading-[2] text-charcoal" dir="rtl">اس آڈیو لیکچر کے لیے سب ٹائٹل کس زبان میں چاہییں؟</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          {subs.map(s => (
            <button key={s.lang} type="button" onClick={() => pick(s.lang)} lang={s.lang}
              className={clsx('min-w-[140px] rounded-xl border border-bone bg-white px-5 py-3 text-[15px] font-semibold text-carbon cursor-pointer hover:border-brand-orange hover:bg-brand-pale-orange', s.lang === 'ur' && 'font-urdu text-[17px]')}>
              {s.lang === 'ur' ? 'اردو' : 'English'}
            </button>
          ))}
          <button type="button" onClick={() => pick('off')}
            className="min-w-[140px] rounded-xl border border-bone bg-white px-5 py-3 text-[14px] text-slate cursor-pointer hover:bg-fog">No subtitles</button>
        </div>
        <p className="m-0 text-[12px] text-slate">You can change this any time under the player.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-bone bg-cream/60 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-brand-pale-orange text-brand-royal flex items-center justify-center shrink-0"><Headphones size={18} aria-hidden /></div>
          <p className="m-0 text-[13px] text-slate">Voice lesson — {choice !== 'off' ? 'listen and read along with the subtitles below' : 'press play and listen'}.</p>
        </div>
        <audio
          ref={ref} src={file.url} controls autoPlay={autoPlay || justChose} preload="metadata" controlsList="nodownload" aria-label={title} className="w-full"
          onTimeUpdate={e => {
            const a = e.currentTarget;
            if (a.seeking) return;
            if (lockSeek && a.currentTime > maxT.current + 2) { a.currentTime = maxT.current; return; }
            if (a.currentTime > maxT.current) maxT.current = a.currentTime;
            setTime(a.currentTime);
            if (onPlayed) tracker.current?.tick(a.currentTime, a.duration);
          }}
          onSeeking={e => {
            const a = e.currentTarget;
            tracker.current?.seeked();
            if (lockSeek && a.currentTime > maxT.current + 0.75) a.currentTime = maxT.current;
          }}
          onEnded={() => { if (onPlayed) tracker.current?.end(); else onFinished?.(); }}
        />
      </div>
      {subs.length > 0 && (
        <LessonSubtitles live subtitles={subs} time={time} choice={choice} onChoice={pick} onSeek={t => { const a = ref.current; if (a) a.currentTime = t; }} />
      )}
    </div>
  );
}
