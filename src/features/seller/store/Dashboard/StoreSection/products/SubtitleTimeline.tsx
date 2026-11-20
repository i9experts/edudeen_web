import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Check, Pause, Play, Plus, RotateCcw, Trash2, Undo2, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { Button, Input, Textarea } from '@/components/comman/ui';
import { UrduTextarea } from '@/components/comman/ui/UrduTextarea';
import type { LessonSubtitle } from '@/api/services/classroom';
import { SUBTITLE_LANGS, SUBTITLE_MAX_CHARS, cuesFromLines, cuesFromTaps, cuesToVtt, parseCues, tidyCues, type Cue } from '@/utils/subtitles';

const MIN_CUE = 0.3;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
const stamp = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const TICK_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];

type Step = 'text' | 'sync' | 'tune';
const STEPS: { id: Step; label: string }[] = [
  { id: 'text', label: '1. Write the text' },
  { id: 'sync', label: '2. Tap along with the voice' },
  { id: 'tune', label: '3. Fine-tune (optional)' },
];

/** Calls `tick(currentTime)` every animation frame while the voice plays, and once on every pause / seek. */
function useMediaClock(audioRef: RefObject<HTMLAudioElement | null>, tick: (t: number) => void) {
  const latest = useRef(tick);
  useEffect(() => { latest.current = tick; });
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    let raf = 0;
    const once = () => latest.current(a.currentTime);
    const loop = () => { once(); raf = requestAnimationFrame(loop); };
    const play = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); once(); };
    a.addEventListener('play', play);
    a.addEventListener('pause', stop);
    a.addEventListener('ended', stop);
    a.addEventListener('seeked', once);
    a.addEventListener('loadedmetadata', once);
    once();
    if (!a.paused) play();
    return () => {
      cancelAnimationFrame(raf);
      a.removeEventListener('play', play); a.removeEventListener('pause', stop); a.removeEventListener('ended', stop);
      a.removeEventListener('seeked', once); a.removeEventListener('loadedmetadata', once);
    };
  }, [audioRef]);
}

/** Runs `handler` when the voice fires `name` (always the latest handler, no re-subscribing). */
function useAudioEvent(audioRef: RefObject<HTMLAudioElement | null>, name: 'ended', handler: () => void) {
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; });
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const fn = () => latest.current();
    a.addEventListener(name, fn);
    return () => a.removeEventListener(name, fn);
  }, [audioRef, name]);
}

function Clock({ audioRef, duration }: { audioRef: RefObject<HTMLAudioElement | null>; duration: number }) {
  const [text, setText] = useState('0:00.0');
  useMediaClock(audioRef, t => setText(stamp(t)));
  return <span className="text-[13px] font-semibold text-carbon tabular-nums" role="timer" aria-live="off">{text}{duration > 0 && <span className="font-normal text-slate"> / {stamp(duration)}</span>}</span>;
}

/** The subtitle line that is on screen right now, the way a learner will see it. */
function LiveCaption({ audioRef, cues, lang }: { audioRef: RefObject<HTMLAudioElement | null>; cues: Cue[]; lang: 'ur' | 'en' }) {
  const [text, setText] = useState('');
  useMediaClock(audioRef, t => setText(cues.find(c => t >= c.start && t < c.end)?.text ?? ''));
  return (
    <p dir={lang === 'ur' ? 'rtl' : 'ltr'} lang={lang} aria-label="Subtitle preview"
      className={clsx('m-0 rounded-lg bg-carbon text-white px-4 py-3 min-h-[64px] flex items-center justify-center text-center text-[16px] md:text-[19px] leading-[1.9] whitespace-pre-line', lang === 'ur' && 'font-urdu')}>
      {text || <span className="text-white/40 text-[12.5px]">The subtitle on screen at this moment appears here</span>}
    </p>
  );
}

/** One language: write the text, tap along with the voice, then (optionally) fine-tune on a timeline. */
function CueTrack({ lang, content, onContent, audioRef, duration, onFile, onRemove }: {
  lang: 'ur' | 'en';
  content: string;
  onContent: (v: string) => void;
  audioRef: RefObject<HTMLAudioElement | null>;
  duration: number;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const dir = lang === 'ur' ? 'rtl' : 'ltr';
  const linesOf = (cs: Cue[], raw: string) => (cs.length ? cs.map(c => c.text.replace(/\s*\n\s*/g, ' ')).join('\n') : raw);
  // The seller's working copy. It follows `content` when that changes from outside (file upload), not from our own edits.
  const [seen, setSeen] = useState(content);
  const [cues, setCues] = useState<Cue[]>(() => parseCues(content));
  const [draft, setDraft] = useState(() => linesOf(parseCues(content), content));
  const [step, setStep] = useState<Step>(() => (parseCues(content).length ? 'tune' : 'text'));
  if (content !== seen) {
    const next = parseCues(content);
    setSeen(content); setCues(next); setDraft(linesOf(next, content));
    if (next.length) setStep('tune');
  }
  // Tap-along state
  const [taps, setTaps] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  // Timeline state
  const [sel, setSel] = useState<number | null>(null);
  const [active, setActive] = useState(-1);
  const [pps, setPps] = useState(40);
  const [hint, setHint] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ i: number; mode: 'move' | 'l' | 'r'; x0: number; s0: number; e0: number } | null>(null);

  const lastEnd = cues.reduce((m, c) => Math.max(m, c.end), 0);
  const total = duration > 0 ? duration : lastEnd + 30;
  const cap = duration > 0 ? duration : Infinity;
  const width = Math.max(total * pps, 320);
  const step_ = TICK_STEPS.find(s => s * pps >= 70) ?? 600;
  const lines = cues.map(c => c.text);

  const commit = (next: Cue[]) => {
    const t = tidyCues(next);
    const real = t.filter(c => c.text.trim());
    const v = real.length ? cuesToVtt(real) : '';
    setCues(t); setSeen(v); onContent(v);
    return t;
  };

  // Playhead position, the cue under it, and keeping it in view while the voice plays.
  useMediaClock(audioRef, t => {
    if (headRef.current) headRef.current.style.transform = `translateX(${t * pps}px)`;
    const sc = scrollRef.current;
    const a = audioRef.current;
    if (sc && a && !a.paused) {
      const x = t * pps;
      if (x > sc.scrollLeft + sc.clientWidth - 50 || x < sc.scrollLeft) sc.scrollLeft = Math.max(0, x - 50);
    }
    const idx = cues.findIndex(c => t >= c.start && t < c.end);
    setActive(prev => (prev === idx ? prev : idx));
  });

  const seek = (t: number) => { const a = audioRef.current; if (a) a.currentTime = clamp(t, 0, cap === Infinity ? t : cap); };

  // ── Step 1: the text, one line per subtitle ──
  const draftLines = draft.split('\n').map(s => s.trim()).filter(Boolean);
  const applyText = () => {
    if (!draftLines.length) { commit([]); return; }
    commit(cuesFromLines(draftLines, cues, duration));
    setTaps([]); setFinished(false); setRunning(false);
    setStep('sync');
  };

  // ── Step 2: tap along ──
  const startSync = () => {
    const a = audioRef.current;
    if (!a || !lines.length) return;
    setTaps([]); setFinished(false); setRunning(true);
    commit(cuesFromTaps(lines, [], null));
    a.currentTime = 0;
    void a.play();
  };
  const tap = () => {
    const a = audioRef.current;
    if (!a || !running || finished) return;
    const t = Math.max(a.currentTime, (taps[taps.length - 1] ?? -1) + 0.1);
    if (taps.length >= lines.length) { // the extra tap marks where the last line ends
      commit(cuesFromTaps(lines, taps, t));
      setFinished(true); setRunning(false); a.pause();
      return;
    }
    const next = [...taps, t];
    setTaps(next);
    commit(cuesFromTaps(lines, next, null));
  };
  const undo = () => {
    if (!taps.length) return;
    const next = taps.slice(0, -1);
    setTaps(next);
    commit(cuesFromTaps(lines, next, null));
    seek(next[next.length - 1] ?? 0);
  };
  const stopSync = () => { setRunning(false); audioRef.current?.pause(); };
  useAudioEvent(audioRef, 'ended', () => {
    if (!running) return;
    // The voice finished: the last line ends with it.
    if (taps.length >= lines.length) { commit(cuesFromTaps(lines, taps, audioRef.current?.duration ?? null)); setFinished(true); }
    setRunning(false);
  });
  // Space / Enter taps too (when the seller is not typing in a box).
  const tapRef = useRef(tap);
  useEffect(() => { tapRef.current = tap; });
  useEffect(() => {
    if (step !== 'sync' || !running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== 'Enter') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      e.preventDefault();
      tapRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, running]);

  // ── Step 3: timeline ──
  const seekFromPointer = (e: React.PointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (rect) seek((e.clientX - rect.left) / pps);
  };
  const add = () => {
    const a = audioRef.current;
    const now = a ? a.currentTime : 0;
    const inside = cues.find(c => now >= c.start && now < c.end);
    const start = inside ? inside.end : now;
    const nextCue = cues.find(c => c.start >= start);
    const end = Math.min(start + 3, nextCue ? nextCue.start : Infinity, cap);
    if (end - start < MIN_CUE) { setHint('There is no free space here. Move the playhead to an empty part of the timeline.'); return; }
    setHint('');
    const t = commit([...cues, { start, end, text: lang === 'ur' ? 'نیا سب ٹائٹل' : 'New subtitle' }]);
    setSel(t.findIndex(c => c.start === start));
  };
  const update = (i: number, patch: Partial<Cue>) => commit(cues.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => { commit(cues.filter((_, k) => k !== i)); setSel(null); };

  const onDown = (e: React.PointerEvent, i: number, mode: 'move' | 'l' | 'r') => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { i, mode, x0: e.clientX, s0: cues[i].start, e0: cues[i].end };
    setSel(i);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dt = (e.clientX - d.x0) / pps;
    const prevEnd = cues[d.i - 1]?.end ?? 0;
    const nextStart = Math.min(cues[d.i + 1]?.start ?? Infinity, cap);
    const len = d.e0 - d.s0;
    let { s0: start, e0: end } = d;
    if (d.mode === 'move') { start = clamp(d.s0 + dt, prevEnd, nextStart - len); end = start + len; }
    else if (d.mode === 'l') start = clamp(d.s0 + dt, prevEnd, d.e0 - MIN_CUE);
    else end = clamp(d.e0 + dt, d.s0 + MIN_CUE, nextStart);
    update(d.i, { start, end });
  };
  const onUp = () => { drag.current = null; };

  const current = sel !== null ? cues[sel] : undefined;
  const k = taps.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Steps */}
      <div className="flex items-center gap-2 flex-wrap">
        <div role="tablist" aria-label="Subtitle steps" className="inline-flex flex-wrap rounded-lg border border-bone overflow-hidden">
          {STEPS.map(s => (
            <button key={s.id} type="button" role="tab" aria-selected={step === s.id} onClick={() => setStep(s.id)}
              className={clsx('px-3 py-1.5 text-[12.5px] border-none cursor-pointer', step === s.id ? 'bg-brand-pale-orange text-carbon font-semibold' : 'bg-white text-graphite hover:bg-cream')}>{s.label}</button>
          ))}
        </div>
        <label className="ms-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-orange cursor-pointer" title="Already have a subtitle file?">
          <Upload size={13} /> Have a file? Upload .srt / .vtt
          <input type="file" accept=".srt,.vtt,.txt,text/vtt,text/plain" aria-label="Upload subtitle file" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />
        </label>
        {(cues.length > 0 || content.trim() !== '') && (
          <button type="button" aria-label="Remove these subtitles" onClick={() => { if (window.confirm('Remove all subtitles in this language?')) onRemove(); }}
            className="bg-transparent border-none cursor-pointer text-slate hover:text-error p-1"><Trash2 size={14} /></button>
        )}
      </div>

      {/* Step 1 */}
      {step === 'text' && (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[12.5px] text-slate">Type or paste what is said in the voice. <strong className="text-carbon">One line = one subtitle</strong>, so keep each line short (about one sentence).</p>
          {lang === 'ur' ? (
            <UrduTextarea label="Urdu subtitle text" rows={8} maxLength={SUBTITLE_MAX_CHARS} value={draft} onChange={setDraft} placeholder="ہر سطر ایک سب ٹائٹل ہوگی" />
          ) : (
            <Textarea aria-label="English subtitle text" rows={8} dir="ltr" lang="en" maxLength={SUBTITLE_MAX_CHARS} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Each line becomes one subtitle" />
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="primary" size="md" disabled={!draftLines.length} onClick={applyText}>Next: tap along with the voice →</Button>
            <span className="text-[12px] text-slate">{draftLines.length} {draftLines.length === 1 ? 'line' : 'lines'}</span>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 'sync' && (
        lines.length === 0 ? (
          <p className="m-0 text-[12.5px] text-slate">Write the text first (step 1), then come back here.</p>
        ) : !running ? (
          <div className="rounded-xl border border-bone bg-cream/60 p-4 flex flex-col items-center gap-3 text-center">
            {finished ? (
              <>
                <span className="size-10 rounded-full bg-green-100 text-success flex items-center justify-center"><Check size={20} /></span>
                <p className="m-0 text-[14px] font-bold text-carbon">All {lines.length} lines are timed.</p>
                <div className="flex gap-2 flex-wrap justify-center">
                  <Button variant="primary" size="md" onClick={() => setStep('tune')}>Check and fine-tune →</Button>
                  <Button variant="outline" size="md" onClick={startSync}><RotateCcw size={13} /> Do it again</Button>
                </div>
              </>
            ) : (
              <>
                <p className="m-0 text-[13px] text-charcoal">The voice will play from the start. <strong>Each time a new line begins in the voice, press the big button</strong> (or the Space bar). That is all.</p>
                <Button variant="primary" size="lg" onClick={startSync}><Play size={15} /> Start the voice and begin</Button>
                <p className="m-0 text-[11.5px] text-slate">Starting replaces the current timing of these {lines.length} lines.</p>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-bone bg-white p-4 flex flex-col gap-2 text-center" dir={dir} lang={lang}>
              <p className="m-0 text-[11.5px] text-slate" dir="ltr">Line {Math.min(k + 1, lines.length)} of {lines.length}</p>
              {k > 0 && <p className={clsx('m-0 text-[13px] text-slate/70 truncate', lang === 'ur' && 'font-urdu')}>✓ {lines[k - 1]}</p>}
              {k < lines.length
                ? <p className={clsx('m-0 text-[20px] md:text-[24px] leading-[1.9] font-semibold text-carbon whitespace-pre-line', lang === 'ur' && 'font-urdu')}>{lines[k]}</p>
                : <p className="m-0 text-[15px] font-semibold text-carbon" dir="ltr">That was the last line. Press the button when it finishes.</p>}
              {k + 1 < lines.length && <p className={clsx('m-0 text-[13px] text-slate/70 truncate', lang === 'ur' && 'font-urdu')}>{lines[k + 1]}</p>}
            </div>
            <Button variant="primary" size="lg" fullWidth onClick={tap}>{k < lines.length ? 'Tap now — this line starts' : 'Tap now — the last line ended'}</Button>
            <div className="flex gap-2 flex-wrap justify-center">
              <Button variant="outline" size="sm" disabled={!k} onClick={undo}><Undo2 size={13} /> Undo last tap</Button>
              <Button variant="ghost" size="sm" onClick={stopSync}>Stop</Button>
            </div>
          </div>
        )
      )}

      {/* Step 3 */}
      {step === 'tune' && (
        <>
          {cues.length === 0 ? (
            <p className="m-0 text-[12.5px] text-slate">There are no subtitles yet. Write the text in step 1, or add one here at the playhead.</p>
          ) : (
            <p className="m-0 text-[12px] text-slate">Drag a block to move it, drag its edges to resize it, click the ruler to jump. Everything is saved when you save the course.</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={add}><Plus size={13} /> Add subtitle at playhead</Button>
            <label className="ms-auto inline-flex items-center gap-2 text-[12px] text-slate">
              Zoom
              <input type="range" min={10} max={160} step={5} value={pps} aria-label="Timeline zoom" onChange={e => setPps(Number(e.target.value))} className="w-28 accent-brand-orange" />
            </label>
          </div>
          {hint && <p role="alert" className="m-0 text-[12px] text-error">{hint}</p>}

          <div ref={scrollRef} className="overflow-x-auto rounded-lg border border-bone bg-white" dir="ltr">
            <div ref={trackRef} className="relative select-none touch-pan-x" style={{ width }}>
              <div className="relative h-7 border-b border-bone bg-cream/70 cursor-col-resize touch-none" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); seekFromPointer(e); }} onPointerMove={e => { if (e.buttons) seekFromPointer(e); }}>
                {Array.from({ length: Math.floor(total / step_) + 1 }, (_, i) => i * step_).map(t => (
                  <span key={t} className="absolute top-0 h-full border-s border-bone ps-1 text-[10.5px] leading-7 text-slate tabular-nums pointer-events-none" style={{ left: t * pps }}>{Math.floor(t / 60)}:{String(t % 60).padStart(2, '0')}</span>
                ))}
              </div>
              <div className="relative h-16" onPointerDown={e => { setSel(null); seekFromPointer(e); }}>
                {cues.map((c, i) => (
                  <div key={i} role="button" tabIndex={0} aria-label={`Subtitle ${i + 1}: ${c.text}`}
                    onPointerDown={e => onDown(e, i, 'move')} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(i); seek(c.start); } }}
                    className={clsx('absolute top-2 h-12 rounded-md border px-3 overflow-hidden text-[12px] leading-[1.5] cursor-grab active:cursor-grabbing touch-none',
                      i === sel ? 'bg-brand-pale-orange border-brand-orange text-carbon z-[2]' : i === active ? 'bg-green-100 border-success text-carbon' : 'bg-blue-50 border-brand-royal/40 text-carbon')}
                    style={{ left: c.start * pps, width: Math.max((c.end - c.start) * pps, 8) }} title={`${stamp(c.start)} – ${stamp(c.end)}`}>
                    <span onPointerDown={e => onDown(e, i, 'l')} className="absolute inset-y-0 start-0 w-2 cursor-ew-resize bg-carbon/20 hover:bg-carbon/40" aria-hidden />
                    <span dir={dir} lang={lang} className={clsx('block truncate pointer-events-none', lang === 'ur' && 'font-urdu')}>{c.text}</span>
                    <span onPointerDown={e => onDown(e, i, 'r')} className="absolute inset-y-0 end-0 w-2 cursor-ew-resize bg-carbon/20 hover:bg-carbon/40" aria-hidden />
                  </div>
                ))}
              </div>
              <div ref={headRef} className="absolute top-0 bottom-0 left-0 w-0 border-s-2 border-error z-[3] pointer-events-none"><span className="absolute -top-0 -start-[5px] size-2.5 rounded-full bg-error" /></div>
            </div>
          </div>

          {current && sel !== null && (
            <div className="rounded-lg border border-brand-orange/50 bg-brand-pale-orange/30 p-3 flex flex-col gap-2">
              <div className="flex items-end gap-2 flex-wrap">
                <div className="w-[120px]"><Input label="Starts (seconds)" type="number" min={0} step={0.1} value={Math.round(current.start * 100) / 100}
                  onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) update(sel, { start: clamp(v, cues[sel - 1]?.end ?? 0, current.end - MIN_CUE) }); }} /></div>
                <Button variant="ghost" size="sm" onClick={() => update(sel, { start: clamp(audioRef.current?.currentTime ?? 0, cues[sel - 1]?.end ?? 0, current.end - MIN_CUE) })}>Set to playhead</Button>
                <div className="w-[120px]"><Input label="Ends (seconds)" type="number" min={0} step={0.1} value={Math.round(current.end * 100) / 100}
                  onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) update(sel, { end: clamp(v, current.start + MIN_CUE, Math.min(cues[sel + 1]?.start ?? Infinity, cap)) }); }} /></div>
                <Button variant="ghost" size="sm" onClick={() => update(sel, { end: clamp(audioRef.current?.currentTime ?? 0, current.start + MIN_CUE, Math.min(cues[sel + 1]?.start ?? Infinity, cap)) })}>Set to playhead</Button>
                <Button variant="outline" size="sm" onClick={() => { seek(current.start); void audioRef.current?.play(); }}><Play size={12} /> Play this line</Button>
                <button type="button" aria-label="Delete this subtitle" onClick={() => remove(sel)} className="ms-auto bg-transparent border-none cursor-pointer text-slate hover:text-error p-1"><Trash2 size={15} /></button>
              </div>
              {lang === 'ur' ? (
                <UrduTextarea label="Urdu subtitle text" rows={2} maxLength={400} value={current.text} onChange={v => update(sel, { text: v })} />
              ) : (
                <Textarea aria-label="English subtitle text" rows={2} maxLength={400} dir="ltr" lang="en" value={current.text} onChange={e => update(sel, { text: e.target.value })} />
              )}
            </div>
          )}

          {cues.length > 0 && (
            <ul className="list-none m-0 p-0 max-h-[180px] overflow-y-auto rounded-lg border border-bone divide-y divide-bone" aria-label="All subtitles">
              {cues.map((c, i) => (
                <li key={i}>
                  <button type="button" onClick={() => { setSel(i); seek(c.start); }} aria-current={i === sel ? 'true' : undefined}
                    className={clsx('w-full flex items-start gap-3 px-3 py-1.5 text-start border-none cursor-pointer', i === sel ? 'bg-brand-pale-orange' : i === active ? 'bg-green-50' : 'bg-white hover:bg-cream')}>
                    <span className="text-[11.5px] text-slate tabular-nums shrink-0 mt-0.5" dir="ltr">{stamp(c.start)}</span>
                    <span dir={dir} lang={lang} className={clsx('flex-1 text-[13px] leading-[1.7] truncate', lang === 'ur' && 'font-urdu')}>{c.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Subtitle editor for a voice lesson. The voice plays on top; below it the seller writes the text, taps along while
 * the voice plays (that times every line), and can fine-tune on a timeline. Urdu and English each get their own tab over
 * the same recording. Stores plain WebVTT, like the text editor does.
 */
export function SubtitleTimelineEditor({ audioUrl, subtitles, onChange, onFile }: {
  audioUrl: string;
  subtitles: LessonSubtitle[];
  onChange: (next: LessonSubtitle[]) => void;
  onFile: (lang: LessonSubtitle['lang'], file: File) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [lang, setLang] = useState<LessonSubtitle['lang']>(subtitles[0]?.lang ?? 'en');
  const [loadError, setLoadError] = useState(false);
  const content = subtitles.find(s => s.lang === lang)?.content ?? '';
  const cues = useMemo(() => parseCues(content), [content]);

  const setContent = (l: LessonSubtitle['lang'], text: string) => {
    const rest = subtitles.filter(s => s.lang !== l);
    onChange(text.trim() ? [...rest, { lang: l, content: text }].sort((a, b) => a.lang.localeCompare(b.lang)) : rest);
  };
  const toggle = () => { const a = audioRef.current; if (!a) return; if (a.paused) void a.play().catch(() => setLoadError(true)); else a.pause(); };
  const nudge = (d: number) => { const a = audioRef.current; if (a) a.currentTime = Math.max(0, a.currentTime + d); };

  return (
    <div className="flex flex-col gap-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata"
        onLoadedMetadata={e => { const d = e.currentTarget.duration; setDuration(Number.isFinite(d) ? d : 0); setLoadError(false); }}
        onDurationChange={e => { const d = e.currentTarget.duration; if (Number.isFinite(d)) setDuration(d); }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setLoadError(true)} />

      <div className="flex items-center gap-2 flex-wrap rounded-lg border border-bone bg-cream/60 px-3 py-2">
        <Button variant="primary" size="sm" onClick={toggle} aria-label={playing ? 'Pause the voice' : 'Play the voice'}>{playing ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Play</>}</Button>
        <Button variant="ghost" size="sm" onClick={() => nudge(-5)}>−5s</Button>
        <Button variant="ghost" size="sm" onClick={() => nudge(5)}>+5s</Button>
        <Clock audioRef={audioRef} duration={duration} />
        <label className="ms-auto inline-flex items-center gap-1.5 text-[12px] text-slate">
          Speed
          <select value={rate} aria-label="Playback speed" onChange={e => { const r = Number(e.target.value); setRate(r); if (audioRef.current) audioRef.current.playbackRate = r; }}
            className="rounded-md border border-bone bg-white px-1.5 py-1 text-[12px] text-carbon">
            {[0.5, 0.75, 1, 1.25, 1.5].map(r => <option key={r} value={r}>{r}×</option>)}
          </select>
        </label>
      </div>
      {loadError && <p role="alert" className="m-0 text-[12px] text-error">The voice could not be played here. Save the course, reload this page and try again.</p>}

      <LiveCaption audioRef={audioRef} cues={cues} lang={lang} />

      <div role="tablist" aria-label="Subtitle language" className="inline-flex rounded-lg border border-bone overflow-hidden self-start">
        {SUBTITLE_LANGS.map(l => {
          const has = subtitles.some(s => s.lang === l.code);
          return (
            <button key={l.code} type="button" role="tab" aria-selected={lang === l.code} onClick={() => setLang(l.code)}
              className={clsx('px-3 py-1.5 text-[12.5px] border-none cursor-pointer inline-flex items-center gap-1.5', lang === l.code ? 'bg-carbon text-white' : 'bg-white text-graphite hover:bg-cream')}>
              <span lang={l.code} className={l.code === 'ur' ? 'font-urdu' : undefined}>{l.code === 'ur' ? 'اردو (Urdu)' : 'English'}</span>
              {has && <span className="size-1.5 rounded-full bg-success" aria-label="has subtitles" />}
            </button>
          );
        })}
      </div>

      <CueTrack key={lang} lang={lang} content={content} onContent={v => setContent(lang, v)} audioRef={audioRef} duration={duration}
        onFile={f => onFile(lang, f)} onRemove={() => setContent(lang, '')} />
    </div>
  );
}
