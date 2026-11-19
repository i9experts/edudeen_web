import { useRef, useState } from 'react';
import { Headphones } from 'lucide-react';
import type { LessonSubtitle } from '@/api/services/classroom';
import { LessonSubtitles } from './LessonSubtitles';

/**
 * Plays a voice lesson (uploaded recording, signed URL) with its Urdu / English subtitles following the speaker.
 * Course-player mode (`lockSeek`): the learner cannot skip ahead of what they have heard, and `onFinished`
 * fires when the recording ends — the same rule as video lessons.
 */
export function LessonAudio({ file, title, subtitles, autoPlay, lockSeek, onFinished }: {
  file: { url: string };
  title: string;
  subtitles?: LessonSubtitle[];
  autoPlay?: boolean;
  lockSeek?: boolean;
  onFinished?: () => void;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const maxT = useRef(0);
  const [time, setTime] = useState(0);
  const subs = subtitles ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-bone bg-cream/60 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-brand-pale-orange text-brand-royal flex items-center justify-center shrink-0"><Headphones size={18} aria-hidden /></div>
          <p className="m-0 text-[13px] text-slate">Voice lesson — press play and listen{subs.length ? ', read along with the subtitles below' : ''}.</p>
        </div>
        <audio
          ref={ref} src={file.url} controls autoPlay={autoPlay} preload="metadata" controlsList="nodownload" aria-label={title} className="w-full"
          onTimeUpdate={e => {
            const a = e.currentTarget;
            if (a.seeking) return;
            if (lockSeek && a.currentTime > maxT.current + 2) { a.currentTime = maxT.current; return; }
            if (a.currentTime > maxT.current) maxT.current = a.currentTime;
            setTime(a.currentTime);
          }}
          onSeeking={e => {
            const a = e.currentTarget;
            if (lockSeek && a.currentTime > maxT.current + 0.75) a.currentTime = maxT.current;
          }}
          onEnded={() => onFinished?.()}
        />
      </div>
      {subs.length > 0 && (
        <LessonSubtitles live subtitles={subs} time={time} onSeek={t => { const a = ref.current; if (a) a.currentTime = t; }} />
      )}
    </div>
  );
}
