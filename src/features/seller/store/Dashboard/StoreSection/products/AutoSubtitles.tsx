import { useEffect, useRef, useState, type RefObject } from 'react';
import { AlertTriangle, Check, Mic, Square } from 'lucide-react';
import { Button } from '@/components/comman/ui';
import { getRecognitionCtor, recognitionLang, splitForSubtitle, type RecognitionEvent, type RecognitionLike } from '@/utils/speechRecognition';
import type { Cue } from '@/utils/subtitles';
import { useAudioEvent } from './audioHooks';

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

const errorText = (code?: string): string | null => {
  switch (code) {
    case 'not-allowed': case 'service-not-allowed':
      return "The browser did not allow listening. Allow the microphone for this site (lock icon at the left of the address bar), reload, and try again.";
    case 'audio-capture': return 'No microphone was found. Auto subtitles need a microphone to hear the voice.';
    case 'network': return 'Auto subtitles need an internet connection (the browser sends what it hears to its speech service).';
    case 'language-not-supported': return "Your browser cannot recognise this language. Write the text yourself in step 1.";
    default: return null; // 'no-speech' / 'aborted': normal while the voice is silent
  }
};

/**
 * Step 2: the voice plays and the browser listens to it, writing subtitles with their timings as it hears them.
 * The browser can only listen through the microphone, so the voice must come out of the speakers (not headphones).
 * The result is a first draft that the seller then reviews and fixes in step 3; lines the browser was unsure
 * about are flagged there.
 */
export function AutoSubtitles({ lang, audioRef, duration, hasCues, onResult }: {
  lang: 'ur' | 'en';
  audioRef: RefObject<HTMLAudioElement | null>;
  duration: number;
  hasCues: boolean;
  /** The finished draft (never empty). */
  onResult: (cues: Cue[]) => void;
}) {
  const supported = getRecognitionCtor() !== null;
  const [listening, setListening] = useState(false);
  const [recent, setRecent] = useState<Cue[]>([]);
  const [interim, setInterim] = useState('');
  const [problem, setProblem] = useState('');
  const [pos, setPos] = useState(0);
  const rec = useRef<RecognitionLike | null>(null);
  const run = useRef({ active: false, done: true, lastEnd: 0, phraseStart: null as number | null, cues: [] as Cue[], restarts: 0 });
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; });

  useAudioEvent(audioRef, 'timeupdate', () => setPos(audioRef.current?.currentTime ?? 0));

  const finish = () => {
    const r = run.current;
    if (r.done) return;
    r.done = true; r.active = false;
    try { rec.current?.abort(); } catch { /* already stopped */ }
    rec.current = null;
    audioRef.current?.pause();
    setListening(false); setInterim('');
    if (!r.cues.length) { setProblem((p) => p || 'Nothing was recognised. Turn the speaker volume up, use speakers instead of headphones, keep the room quiet, and try again. Or write the text yourself in step 1.'); return; }
    onResultRef.current(r.cues);
  };

  const handleResult = (e: RecognitionEvent) => {
    const r = run.current;
    const now = audioRef.current?.currentTime ?? 0;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const alt = res[0];
      const text = alt?.transcript?.trim();
      if (!text) continue;
      if (!res.isFinal) {
        if (r.phraseStart === null) r.phraseStart = now;
        setInterim(text);
        continue;
      }
      // The browser answers a little after the words were spoken, so the phrase started ~0.5 s and ended ~0.6 s before now.
      const start = Math.max(r.lastEnd, (r.phraseStart ?? now - 2) - 0.5);
      const end = Math.max(start + 0.8, now - 0.6);
      const parts = splitForSubtitle(text);
      const chars = parts.reduce((n, p) => n + p.length, 0) || 1;
      let t = start;
      for (const p of parts) {
        const len = ((end - start) * p.length) / chars;
        // confidence 0 means "not reported", so only a real low score flags a line for review
        r.cues.push({ start: t, end: t + len, text: p, check: alt.confidence > 0 && alt.confidence < 0.8 });
        t += len;
      }
      r.lastEnd = end; r.phraseStart = null;
      setInterim('');
      setRecent(r.cues.slice(-5));
    }
  };

  const begin = () => {
    const a = audioRef.current;
    const Ctor = getRecognitionCtor();
    if (!a || !Ctor) return;
    if (hasCues && !window.confirm('This replaces the subtitles you already have in this language. Continue?')) return;
    setProblem(''); setRecent([]); setInterim('');
    run.current = { active: true, done: false, lastEnd: 0, phraseStart: null, cues: [], restarts: 0 };
    const r = new Ctor();
    r.lang = recognitionLang(lang);
    r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = handleResult;
    r.onerror = e => {
      const msg = errorText(e?.error);
      if (!msg) return;
      setProblem(msg);
      run.current.active = false;
      finish();
    };
    r.onend = () => {
      const st = run.current;
      // Chrome ends a session by itself after a while / after silence: carry on until the voice is over.
      if (st.active && !st.done && audioRef.current && !audioRef.current.ended && st.restarts < 300) {
        st.restarts += 1;
        window.setTimeout(() => { try { if (run.current.active && rec.current) rec.current.start(); } catch { finish(); } }, 250);
        return;
      }
      finish();
    };
    rec.current = r;
    try { r.start(); } catch { setProblem('Could not start listening. Close other tabs that use the microphone and try again.'); rec.current = null; run.current.done = true; return; }
    setListening(true);
    a.pause(); a.playbackRate = 1; a.currentTime = 0;
    void a.play();
  };

  const stop = () => {
    run.current.active = false;
    audioRef.current?.pause();
    try { rec.current?.stop(); } catch { /* ignore */ }
    window.setTimeout(finish, 1500); // normally onend answers first
  };

  // The voice reached its end: let the browser deliver the last words, then finish.
  useAudioEvent(audioRef, 'ended', () => { if (run.current.active) stop(); });

  // Leaving the page must not leave the microphone open.
  useEffect(() => {
    const audio = audioRef.current;
    return () => { run.current.active = false; run.current.done = true; try { rec.current?.abort(); } catch { /* ignore */ } audio?.pause(); };
  }, [audioRef]);

  if (!supported) {
    return (
      <p role="status" className="m-0 rounded-lg border border-bone bg-fog px-3 py-3 text-[12.5px] text-slate">
        Your browser cannot listen to the voice by itself. Open this page in <strong>Chrome</strong> or <strong>Edge</strong>, or write the text yourself in step 1.
      </p>
    );
  }

  const pct = duration > 0 ? Math.min(100, (pos / duration) * 100) : 0;
  return (
    <div className="flex flex-col gap-3">
      {!listening ? (
        <div className="rounded-xl border border-bone bg-cream/60 p-4 flex flex-col items-center gap-3 text-center">
          <p className="m-0 text-[13px] text-charcoal">
            Press the button and your voice plays from the start. <strong>Edudeen listens to it and writes the subtitles for you</strong>, with their timings. Then you check them in step 3.
          </p>
          <Button variant="primary" size="lg" onClick={begin} disabled={!duration}><Mic size={15} /> Listen to my voice and write the subtitles</Button>
          <ul className="m-0 ps-5 text-start text-[12px] text-slate list-disc max-w-[440px]">
            <li>Turn the speaker volume up and use <strong>speakers, not headphones</strong>. The browser hears the voice through the microphone.</li>
            <li>Keep the room quiet. It takes as long as the voice (about {duration ? clock(duration) : 'the voice length'}).</li>
            <li>Works in Chrome and Edge, needs internet and microphone permission. It makes mistakes, so always review.</li>
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-bone bg-white p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-carbon">
              <span className="size-2.5 rounded-full bg-error animate-pulse" aria-hidden /> Listening and writing… <span className="font-normal text-slate tabular-nums">{clock(pos)} / {clock(duration)}</span>
            </div>
            <div className="h-2 rounded-full bg-fog overflow-hidden" aria-hidden><div className="h-full bg-brand-orange transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
            <div dir={lang === 'ur' ? 'rtl' : 'ltr'} lang={lang} className={`min-h-[120px] rounded-lg bg-cream/60 p-3 flex flex-col gap-1 text-[14px] leading-[1.9] ${lang === 'ur' ? 'font-urdu' : ''}`}>
              {recent.length === 0 && !interim && <span className="text-slate text-[12.5px]" dir="ltr">Waiting for the first words…</span>}
              {recent.map((c, i) => <span key={`${c.start}-${i}`} className="text-carbon">{c.check && <AlertTriangle size={12} className="inline text-brand-deep-orange me-1" aria-label="not sure" />}{c.text}</span>)}
              {interim && <span className="text-slate">{interim}</span>}
            </div>
            <Button variant="outline" size="sm" className="self-start" onClick={stop}><Square size={12} /> Stop here and use what is written</Button>
          </div>
        </div>
      )}
      {problem && <p role="alert" className="m-0 flex items-start gap-1.5 text-[12.5px] text-error"><AlertTriangle size={14} className="shrink-0 mt-0.5" /> {problem}</p>}
      {!listening && !problem && hasCues && <p className="m-0 flex items-center gap-1.5 text-[12px] text-slate"><Check size={13} className="text-success" /> You already have subtitles here. Starting again replaces them.</p>}
    </div>
  );
}
