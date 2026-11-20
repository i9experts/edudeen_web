import { useMemo, useRef, useState, type RefObject } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Plus, Trash2, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { Button, Input, Textarea } from '@/components/comman/ui';
import { UrduTextarea } from '@/components/comman/ui/UrduTextarea';
import type { LessonSubtitle } from '@/api/services/classroom';
import { SUBTITLE_LANGS, SUBTITLE_MAX_CHARS, cuesFromLines, cuesToVtt, parseCues, tidyCues, type Cue } from '@/utils/subtitles';
import { useMediaClock } from './audioHooks';

const MIN_CUE = 0.3;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
const stamp = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const TICK_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];

type Step = 'text' | 'tune';
const STEPS: { id: Step; label: string }[] = [
  { id: 'text', label: '1. Write the text' },
  { id: 'tune', label: '2. Review and fix' },
];

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

/** One language: write the text, then place and fix every line against the voice on a timeline. */
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
  // Review state
  const [sel, setSel] = useState<number | null>(null);
  const [active, setActive] = useState(-1);
  const [pps, setPps] = useState(40);
  const [hint, setHint] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const playUntil = useRef<number | null>(null);
  const drag = useRef<{ i: number; mode: 'move' | 'l' | 'r'; x0: number; s0: number; e0: number } | null>(null);

  const lastEnd = cues.reduce((m, c) => Math.max(m, c.end), 0);
  const total = duration > 0 ? duration : lastEnd + 30;
  const cap = duration > 0 ? duration : Infinity;
  const width = Math.max(total * pps, 320);
  const tickStep = TICK_STEPS.find(s => s * pps >= 70) ?? 600;

  const commit = (next: Cue[]) => {
    const t = tidyCues(next);
    const real = t.filter(c => c.text.trim());
    const v = real.length ? cuesToVtt(real) : '';
    setCues(t); setSeen(v); onContent(v);
    return t;
  };

  // Playhead position, the cue under it, keeping it in view while the voice plays, and "play this line" stopping at its end.
  useMediaClock(audioRef, t => {
    if (headRef.current) headRef.current.style.transform = `translateX(${t * pps}px)`;
    const a = audioRef.current;
    if (playUntil.current !== null && t >= playUntil.current) { a?.pause(); playUntil.current = null; }
    const sc = scrollRef.current;
    if (sc && a && !a.paused) {
      const x = t * pps;
      if (x > sc.scrollLeft + sc.clientWidth - 50 || x < sc.scrollLeft) sc.scrollLeft = Math.max(0, x - 50);
    }
    const idx = cues.findIndex(c => t >= c.start && t < c.end);
    setActive(prev => (prev === idx ? prev : idx));
  });

  const seek = (t: number) => { const a = audioRef.current; if (a) a.currentTime = clamp(t, 0, cap === Infinity ? t : cap); };
  const showCue = (i: number) => {
    const c = cues[i];
    if (!c) return;
    setSel(i);
    seek(c.start);
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, c.start * pps - 80);
  };

  // ── Step 1: the text, one line per subtitle ──
  const draftLines = draft.split('\n').map(s => s.trim()).filter(Boolean);
  const applyText = () => {
    if (!draftLines.length) { commit([]); return; }
    commit(cuesFromLines(draftLines, cues, duration));
    setStep('tune');
  };

  // ── Step 2: review and fix ──
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
  const playLine = (c: Cue) => { seek(c.start); playUntil.current = c.end; void audioRef.current?.play(); };

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
    commit(cues.map((c, k) => (k === d.i ? { ...c, start, end } : c)));
  };
  const onUp = () => { drag.current = null; };

  const current = sel !== null ? cues[sel] : undefined;

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
          <p className="m-0 text-[12.5px] text-slate">Type or paste what is said in the voice. <strong className="text-carbon">One line = one subtitle</strong>, so keep each line short (about one sentence). In the next step you place the lines against the voice.</p>
          {lang === 'ur' ? (
            <UrduTextarea label="Urdu subtitle text" rows={8} maxLength={SUBTITLE_MAX_CHARS} value={draft} onChange={setDraft} placeholder="ہر سطر ایک سب ٹائٹل ہوگی" />
          ) : (
            <Textarea aria-label="English subtitle text" rows={8} dir="ltr" lang="en" maxLength={SUBTITLE_MAX_CHARS} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Each line becomes one subtitle" />
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="primary" size="md" disabled={!draftLines.length} onClick={applyText}>Next: review and fix →</Button>
            <span className="text-[12px] text-slate">{draftLines.length} {draftLines.length === 1 ? 'line' : 'lines'}</span>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 'tune' && (
        <>
          {cues.length === 0 ? (
            <p className="m-0 text-[12.5px] text-slate">There are no subtitles yet. Write the text in step 1, or add one here at the playhead.</p>
          ) : (
            <p className="m-0 text-[12px] text-slate">Play the voice and watch the lines. Fix a wrong word, or drag a block to move it and its edges to resize it. Everything is saved when you save the course.</p>
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
                {Array.from({ length: Math.floor(total / tickStep) + 1 }, (_, i) => i * tickStep).map(t => (
                  <span key={t} className="absolute top-0 h-full border-s border-bone ps-1 text-[10.5px] leading-7 text-slate tabular-nums pointer-events-none" style={{ left: t * pps }}>{Math.floor(t / 60)}:{String(t % 60).padStart(2, '0')}</span>
                ))}
              </div>
              <div className="relative h-16" onPointerDown={e => { setSel(null); seekFromPointer(e); }}>
                {cues.map((c, i) => (
                  <div key={i} role="button" tabIndex={0} aria-label={`Subtitle ${i + 1}: ${c.text}`}
                    onPointerDown={e => onDown(e, i, 'move')} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showCue(i); } }}
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
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="ghost" size="xs" disabled={sel === 0} onClick={() => showCue(sel - 1)} aria-label="Previous line"><ChevronLeft size={14} /> Previous</Button>
                <span className="text-[12.5px] font-semibold text-carbon tabular-nums">Line {sel + 1} of {cues.length}</span>
                <Button variant="ghost" size="xs" disabled={sel >= cues.length - 1} onClick={() => showCue(sel + 1)} aria-label="Next line">Next <ChevronRight size={14} /></Button>
                <Button variant="primary" size="sm" onClick={() => playLine(current)}><Play size={12} /> Play this line</Button>
                <button type="button" aria-label="Delete this subtitle" onClick={() => remove(sel)} className="ms-auto bg-transparent border-none cursor-pointer text-slate hover:text-error p-1"><Trash2 size={15} /></button>
              </div>
              {lang === 'ur' ? (
                <UrduTextarea label="Urdu subtitle text" rows={2} maxLength={400} value={current.text} onChange={v => update(sel, { text: v })} />
              ) : (
                <Textarea aria-label="English subtitle text" rows={2} maxLength={400} dir="ltr" lang="en" value={current.text} onChange={e => update(sel, { text: e.target.value })} />
              )}
              <div className="flex items-end gap-2 flex-wrap">
                <div className="w-[120px]"><Input label="Starts (seconds)" type="number" min={0} step={0.1} value={Math.round(current.start * 100) / 100}
                  onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) update(sel, { start: clamp(v, cues[sel - 1]?.end ?? 0, current.end - MIN_CUE) }); }} /></div>
                <Button variant="ghost" size="sm" onClick={() => update(sel, { start: clamp(audioRef.current?.currentTime ?? 0, cues[sel - 1]?.end ?? 0, current.end - MIN_CUE) })}>Set to playhead</Button>
                <div className="w-[120px]"><Input label="Ends (seconds)" type="number" min={0} step={0.1} value={Math.round(current.end * 100) / 100}
                  onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) update(sel, { end: clamp(v, current.start + MIN_CUE, Math.min(cues[sel + 1]?.start ?? Infinity, cap)) }); }} /></div>
                <Button variant="ghost" size="sm" onClick={() => update(sel, { end: clamp(audioRef.current?.currentTime ?? 0, current.start + MIN_CUE, Math.min(cues[sel + 1]?.start ?? Infinity, cap)) })}>Set to playhead</Button>
              </div>
            </div>
          )}

          {cues.length > 0 && (
            <ul className="list-none m-0 p-0 max-h-[200px] overflow-y-auto rounded-lg border border-bone divide-y divide-bone" aria-label="All subtitles">
              {cues.map((c, i) => (
                <li key={i}>
                  <button type="button" onClick={() => showCue(i)} aria-current={i === sel ? 'true' : undefined}
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
 * Subtitle editor for a voice lesson. The voice plays on top; below it the seller writes the text (step 1) and places
 * and fixes every line against the voice (step 2). Urdu and English each get their own tab over the same recording.
 * Stores plain WebVTT, like the text editor does.
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
