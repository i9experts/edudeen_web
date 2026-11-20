import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Mic, Pause, Play, Plus, Redo2, Scissors, Undo2, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { Button, Modal } from '@/components/comman/ui';
import { useToast } from '@/contexts/ToastContext';
import { useUpload } from '@/hooks/upload/useUpload';
import type { PrivateUploadData } from '@/api/upload';
import {
  EDIT_MAX_SECONDS, EDIT_RATE, cutRange, decodeToMono, encodeWav, insertAt, joinSegments, keepRange, lengthOf,
  mapSubtitleTimes, toSamples, toSeconds, waveformPeaks, type Seg, type TimedText,
} from '@/utils/audioEdit';
import { VoiceRecorder } from './VoiceRecorder';

export interface VoiceEditResult {
  file: PrivateUploadData;
  minutes: number;
  /** Plays the new voice straight from this browser until the course is saved. */
  localUrl: string;
  /** Moves subtitles that were timed against the old voice to where that speech now is (cut parts drop out). */
  mapCues: <T extends TimedText>(cues: T[]) => T[];
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.wav,.ogg';

/**
 * Cut and join the voice of a lesson. The voice is shown as a waveform: drag across it to select a part, then delete
 * that part or keep only it; add another recording (recorded now or uploaded) at the end or at the playhead.
 * Every step can be undone, and nothing changes in the course until "Save changes".
 */
export function VoiceEditor({ loadOriginal, onClose, onApplied }: {
  loadOriginal: () => Promise<ArrayBuffer>;
  onClose: () => void;
  onApplied: (result: VoiceEditResult) => void;
}) {
  const toast = useToast();
  const { upload, uploading } = useUpload('private');
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [sources, setSources] = useState<Int16Array[]>([]);
  const [segs, setSegs] = useState<Seg[]>([]);
  const [past, setPast] = useState<Seg[][]>([]);
  const [future, setFuture] = useState<Seg[][]>([]);
  const [sel, setSel] = useState<{ a: number; b: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [width, setWidth] = useState(600);
  const [adding, setAdding] = useState(false);
  const [addHow, setAddHow] = useState<'record' | 'upload'>('record');
  const [addWhere, setAddWhere] = useState<'end' | 'playhead'>('end');
  const [busy, setBusy] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioUrl = useRef<string | null>(null);
  const dirty = useRef(true);
  const headSec = useRef(0);
  const stopAt = useRef<number | null>(null);
  const dragRef = useRef<{ x0: number; moved: boolean } | null>(null);

  const total = lengthOf(segs);
  const duration = toSeconds(total);

  // Load the current voice into the editor (once, when it opens).
  const loadRef = useRef(loadOriginal);
  useEffect(() => { loadRef.current = loadOriginal; });
  useEffect(() => {
    let dead = false;
    loadRef.current()
      .then(decodeToMono)
      .then(pcm => {
        if (dead) return;
        setSources([pcm]);
        setSegs([{ src: 0, from: 0, to: pcm.length }]);
        setPhase('ready');
      })
      .catch(e => { if (!dead) { setError(e instanceof Error && e.message ? e.message : 'The voice could not be opened for editing.'); setPhase('error'); } });
    return () => { dead = true; };
  }, []);

  // Free the preview file when the editor closes.
  useEffect(() => () => { if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); audioRef.current?.pause(); }, []);

  // Waveform width follows the box.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || phase !== 'ready') return;
    const ro = new ResizeObserver(() => setWidth(Math.max(200, Math.floor(el.clientWidth))));
    ro.observe(el);
    setWidth(Math.max(200, Math.floor(el.clientWidth)));
    return () => ro.disconnect();
  }, [phase]);

  const peaks = useMemo(() => waveformPeaks(sources, segs, width), [sources, segs, width]);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const h = 112;
    c.width = width * dpr; c.height = h * dpr;
    const g = c.getContext('2d');
    if (!g) return;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, width, h);
    const col = getComputedStyle(c).color;
    g.fillStyle = col;
    for (let x = 0; x < peaks.length; x++) {
      const bar = Math.max(1, peaks[x] * (h - 8));
      g.fillRect(x, (h - bar) / 2, 1, bar);
    }
    if (sel && duration > 0) {
      g.fillStyle = 'rgba(234, 88, 12, 0.22)';
      g.fillRect((sel.a / duration) * width, 0, ((sel.b - sel.a) / duration) * width, h);
    }
  }, [peaks, sel, width, duration]);

  const moveHead = (t: number) => {
    headSec.current = t;
    if (headRef.current && duration > 0) headRef.current.style.left = `${(t / duration) * 100}%`;
    if (timeRef.current) timeRef.current.textContent = fmt(t);
  };

  // Playhead follows the voice while it plays; "play selection" stops at the end of the selection.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    let raf = 0;
    const tick = () => {
      moveHead(a.currentTime);
      if (stopAt.current !== null && a.currentTime >= stopAt.current) { a.pause(); stopAt.current = null; }
      raf = requestAnimationFrame(tick);
    };
    const onPlay = () => { setPlaying(true); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    const onPause = () => { setPlaying(false); cancelAnimationFrame(raf); moveHead(a.currentTime); };
    a.addEventListener('play', onPlay); a.addEventListener('pause', onPause); a.addEventListener('ended', onPause);
    return () => { cancelAnimationFrame(raf); a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause); a.removeEventListener('ended', onPause); };
  });

  const ensureAudio = () => {
    const a = audioRef.current;
    if (!a || (!dirty.current && a.src)) return;
    const wav = encodeWav([joinSegments(sources, segs)], EDIT_RATE);
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = URL.createObjectURL(wav);
    a.src = audioUrl.current;
    dirty.current = false;
  };
  const playFrom = (t: number, until: number | null) => {
    const a = audioRef.current;
    if (!a || !total) return;
    ensureAudio();
    stopAt.current = until;
    a.currentTime = Math.min(Math.max(t, 0), duration);
    void a.play().catch(() => undefined);
  };
  const togglePlay = () => {
    const a = audioRef.current;
    if (a && !a.paused) { a.pause(); return; }
    playFrom(headSec.current >= duration - 0.05 ? 0 : headSec.current, null);
  };

  // ── Editing ──
  const apply = (next: Seg[]) => {
    audioRef.current?.pause();
    setPast(p => [...p.slice(-29), segs]);
    setFuture([]);
    setSegs(next);
    setSel(null);
    dirty.current = true;
  };
  const undo = () => {
    const prev = past[past.length - 1];
    if (!prev) return;
    audioRef.current?.pause();
    setFuture(f => [segs, ...f]); setPast(p => p.slice(0, -1)); setSegs(prev); setSel(null); dirty.current = true;
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    audioRef.current?.pause();
    setPast(p => [...p, segs]); setFuture(f => f.slice(1)); setSegs(next); setSel(null); dirty.current = true;
  };
  const range = () => (sel ? { a: toSamples(sel.a), b: toSamples(sel.b) } : null);
  const del = () => { const r = range(); if (r) { apply(cutRange(segs, r.a, r.b)); moveHead(Math.min(sel!.a, Math.max(0, duration - (sel!.b - sel!.a)))); } };
  const keep = () => { const r = range(); if (r) { apply(keepRange(segs, r.a, r.b)); moveHead(0); } };
  const removeBefore = () => { const t = toSamples(headSec.current); if (t > 0) { apply(cutRange(segs, 0, t)); moveHead(0); } };
  const removeAfter = () => { const t = toSamples(headSec.current); if (t < total) apply(cutRange(segs, t, total)); };

  const addPiece = (pcm: Int16Array) => {
    if (total + pcm.length > EDIT_MAX_SECONDS * EDIT_RATE) { toast.error(`The voice would be longer than ${EDIT_MAX_SECONDS / 60} minutes. Cut something out first.`); return; }
    const at = addWhere === 'end' ? total : toSamples(headSec.current);
    const index = sources.length;
    setSources([...sources, pcm]);
    apply(insertAt(segs, at, { src: index, from: 0, to: pcm.length }));
    // Show what was added: select it and put the playhead at its start.
    setSel({ a: toSeconds(at), b: toSeconds(at + pcm.length) });
    moveHead(toSeconds(at));
    setAdding(false);
    toast.success('Voice added. Play it to check, or undo.');
  };
  const addFile = async (file: File) => {
    setBusy(true);
    try { addPiece(await decodeToMono(await file.arrayBuffer())); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'This audio file could not be read.'); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!total) { toast.error('There is no voice left. Undo a step first.'); return; }
    setBusy(true);
    try {
      const wav = encodeWav([joinSegments(sources, segs)], EDIT_RATE);
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      const file = new File([wav], `voice-edited-${stamp}.wav`, { type: 'audio/wav' });
      const d = await upload(file);
      const finalSegs = segs;
      onApplied({ file: d, minutes: Math.max(1, Math.ceil(duration / 60)), localUrl: URL.createObjectURL(file), mapCues: cues => mapSubtitleTimes(finalSegs, cues) });
    } catch { toast.error('Could not save the edited voice. Check your connection and try again.'); }
    finally { setBusy(false); }
  };
  const close = () => { if (past.length && !window.confirm('Close without saving your changes to the voice?')) return; onClose(); };

  // ── Waveform pointer: click = move the playhead, drag = select a part ──
  const timeAt = (e: React.PointerEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    return rect ? Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1) * duration : 0;
  };
  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x0: e.clientX, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.x0) < 4) return;
    d.moved = true;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const t0 = Math.min(Math.max((d.x0 - rect.left) / rect.width, 0), 1) * duration;
    const t1 = timeAt(e);
    setSel({ a: Math.min(t0, t1), b: Math.max(t0, t1) });
  };
  const onUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved) return;
    const t = timeAt(e);
    setSel(null);
    moveHead(t);
    const a = audioRef.current;
    if (a && a.src) a.currentTime = t;
  };

  const enough = !!sel && sel.b - sel.a >= 0.1;
  const btn = 'inline-flex items-center gap-1.5';

  return (
    <Modal title="Edit voice — cut and add more" onClose={close} width={860} mobileSheet
      footer={phase === 'ready' ? (
        <div className="flex items-center gap-2 justify-end flex-wrap">
          <span className="me-auto text-[12px] text-slate">{past.length ? `${past.length} change${past.length === 1 ? '' : 's'} not saved yet` : 'No changes yet'}</span>
          <Button variant="ghost" size="md" onClick={close}>Cancel</Button>
          <Button variant="primary" size="md" loading={busy || uploading} disabled={!past.length || !total} onClick={() => void save()}>Save changes</Button>
        </div>
      ) : undefined}>
      <div className="p-4 flex flex-col gap-3">
        {phase === 'loading' && <p className="m-0 flex items-center gap-2 text-[13px] text-slate py-10 justify-center"><Loader2 size={16} className="animate-spin" /> Opening your voice…</p>}
        {phase === 'error' && (
          <div role="alert" className="flex flex-col gap-3 py-6 items-center text-center">
            <p className="m-0 text-[13px] text-error max-w-[420px]">{error}</p>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        )}
        {phase === 'ready' && (
          <>
            <audio ref={audioRef} preload="auto" />
            <p className="m-0 text-[12.5px] text-slate">
              <strong className="text-carbon">Drag across the waveform</strong> to select a part, then delete it or keep only it. <strong className="text-carbon">Click</strong> to move the playhead. You can add another voice anywhere.
            </p>

            <div ref={wrapRef} className="relative h-28 rounded-lg border border-bone bg-cream/60 select-none touch-none cursor-crosshair overflow-hidden text-brand-royal"
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { dragRef.current = null; }}
              role="application" aria-label="Voice waveform. Drag to select a part.">
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ width: '100%', height: 112 }} />
              <div ref={headRef} className="absolute top-0 bottom-0 w-0 border-s-2 border-error pointer-events-none" style={{ left: 0 }} />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="primary" size="sm" onClick={togglePlay} disabled={!total}>{playing ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Play</>}</Button>
              {enough && <Button variant="outline" size="sm" onClick={() => playFrom(sel!.a, sel!.b)}><Play size={12} /> Play selection</Button>}
              <span className="text-[13px] font-semibold text-carbon tabular-nums"><span ref={timeRef}>0:00.0</span><span className="font-normal text-slate"> / {fmt(duration)}</span></span>
              {enough && <span className="text-[12px] text-brand-deep-orange tabular-nums">Selected {fmt(sel!.a)} – {fmt(sel!.b)} ({(sel!.b - sel!.a).toFixed(1)} s)</span>}
              <span className="ms-auto flex gap-1">
                <Button variant="ghost" size="sm" onClick={undo} disabled={!past.length} aria-label="Undo"><Undo2 size={14} /> Undo</Button>
                <Button variant="ghost" size="sm" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 size={14} /> Redo</Button>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap rounded-lg border border-bone bg-white p-2.5">
              <Scissors size={15} className="text-slate shrink-0" aria-hidden />
              <Button variant="danger" size="sm" onClick={del} disabled={!enough}>Delete selected part</Button>
              <Button variant="outline" size="sm" onClick={keep} disabled={!enough}>Keep only selected part</Button>
              <Button variant="outline" size="sm" onClick={removeBefore}>Remove everything before playhead</Button>
              <Button variant="outline" size="sm" onClick={removeAfter}>Remove everything after playhead</Button>
            </div>

            {!adding ? (
              <Button variant="secondary" size="md" className="self-start" onClick={() => setAdding(true)}><Plus size={14} /> Add more voice</Button>
            ) : (
              <div className="rounded-lg border border-brand-orange/50 bg-brand-pale-orange/30 p-3 flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="m-0 text-[13px] font-bold text-carbon">Add another voice</p>
                  <div role="radiogroup" aria-label="Where to add it" className="inline-flex rounded-lg border border-bone overflow-hidden bg-white">
                    {([['end', 'At the end'], ['playhead', 'At the playhead (the red line)']] as const).map(([w, label]) => (
                      <button key={w} type="button" role="radio" aria-checked={addWhere === w} onClick={() => setAddWhere(w)}
                        className={clsx('px-3 py-1 text-[12px] border-none cursor-pointer', addWhere === w ? 'bg-carbon text-white' : 'bg-white text-graphite hover:bg-cream')}>{label}</button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setAdding(false)} className="ms-auto bg-transparent border-none cursor-pointer text-[12.5px] text-slate hover:text-carbon">Cancel</button>
                </div>
                <div role="radiogroup" aria-label="New voice source" className="inline-flex rounded-lg border border-bone overflow-hidden self-start bg-white">
                  {([['record', 'Record now'], ['upload', 'Upload a file']] as const).map(([h, label]) => (
                    <button key={h} type="button" role="radio" aria-checked={addHow === h} onClick={() => setAddHow(h)}
                      className={clsx('px-3 py-1 text-[12px] border-none cursor-pointer', btn, addHow === h ? 'bg-brand-pale-orange text-carbon font-semibold' : 'bg-white text-graphite hover:bg-cream')}>
                      {h === 'record' ? <Mic size={12} aria-hidden /> : <Upload size={12} aria-hidden />}{label}
                    </button>
                  ))}
                </div>
                {addHow === 'record' ? (
                  <VoiceRecorder onTake={file => void addFile(file)} onUseUpload={() => setAddHow('upload')} />
                ) : (
                  <label className={clsx('flex flex-col items-center justify-center gap-2 w-full py-6 rounded-lg border-2 border-dashed border-bone bg-white', busy ? 'cursor-wait opacity-60' : 'cursor-pointer hover:border-brand-orange')}>
                    {busy ? <Loader2 size={22} className="animate-spin text-brand-orange" /> : <Upload size={22} className="text-slate" />}
                    <span className="text-[13px] text-slate">{busy ? 'Reading the file…' : 'Choose an audio file (MP3, M4A, WAV or OGG)'}</span>
                    <input type="file" accept={AUDIO_ACCEPT} className="hidden" disabled={busy} aria-label="Choose an audio file to add"
                      onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void addFile(f); }} />
                  </label>
                )}
              </div>
            )}

            <p className="m-0 text-[12px] text-slate">
              Subtitles you already added move with your cuts. Voice you add has no subtitles yet. Make them in the Subtitles box after saving.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
