import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, RotateCcw, Square, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/comman/ui';
import { useUpload } from '@/hooks/upload/useUpload';
import type { PrivateUploadData } from '@/api/upload';

/** Speech does not need CD quality: 22.05 kHz mono keeps a recording near 2.6 MB per minute. */
const OUT_RATE = 22050;
const MAX_SECONDS = 30 * 60;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** 16-bit mono PCM → a WAV file (plays and seeks in every browser, unlike a raw MediaRecorder stream). */
function encodeWav(chunks: Int16Array[], rate: number): Blob {
  const samples = chunks.reduce((n, c) => n + c.length, 0);
  const head = new DataView(new ArrayBuffer(44));
  const text = (at: number, s: string) => { for (let i = 0; i < s.length; i++) head.setUint8(at + i, s.charCodeAt(i)); };
  text(0, 'RIFF'); head.setUint32(4, 36 + samples * 2, true); text(8, 'WAVE');
  text(12, 'fmt '); head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 1, true);
  head.setUint32(24, rate, true); head.setUint32(28, rate * 2, true); head.setUint16(32, 2, true); head.setUint16(34, 16, true);
  text(36, 'data'); head.setUint32(40, samples * 2, true);
  return new Blob([head.buffer as ArrayBuffer, ...chunks.map(c => c.buffer as ArrayBuffer)], { type: 'audio/wav' });
}

const micError = (e: unknown) => {
  const name = (e as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return "Microphone access is blocked. Allow the microphone in your browser's address bar, then try again.";
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone was found on this device.';
  if (name === 'NotReadableError') return 'The microphone is being used by another app. Close it and try again.';
  return 'Could not start the microphone. You can upload a recording instead.';
};

type Take = { file: File; url: string; seconds: number };
type Live = { stream: MediaStream; ctx: AudioContext; node: ScriptProcessorNode; source: MediaStreamAudioSourceNode };

/**
 * Records the seller's voice in the browser (start, pause, stop, listen back) and uploads it as a WAV file.
 * `onSaved` gets the stored file and its length in whole minutes.
 */
export function VoiceRecorder({ onSaved }: { onSaved: (file: PrivateUploadData, minutes: number) => void }) {
  const { upload, uploading, error: uploadError } = useUpload('private');
  const [phase, setPhase] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [take, setTake] = useState<Take | null>(null);
  const [problem, setProblem] = useState('');
  const live = useRef<Live | null>(null);
  const chunks = useRef<Int16Array[]>([]);
  const paused = useRef(false);
  const takeUrl = useRef<string | null>(null);
  const timer = useRef<number | null>(null);
  const elapsed = useRef(0);

  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && (!!window.AudioContext || !!(window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);

  const release = () => {
    if (timer.current !== null) { window.clearInterval(timer.current); timer.current = null; }
    const l = live.current;
    live.current = null;
    if (!l) return;
    l.node.onaudioprocess = null;
    try { l.source.disconnect(); l.node.disconnect(); } catch { /* already disconnected */ }
    l.stream.getTracks().forEach(t => t.stop());
    void l.ctx.close().catch(() => undefined);
  };

  // Leaving the page mid-recording must free the microphone and the preview URL.
  useEffect(() => () => {
    release();
    if (takeUrl.current) URL.revokeObjectURL(takeUrl.current);
  }, []);

  const finish = () => {
    const seconds = elapsed.current;
    release();
    setPhase('idle');
    setLevel(0);
    if (!chunks.current.length || seconds < 1) { setProblem('Nothing was recorded. Try again and speak close to the microphone.'); chunks.current = []; return; }
    const blob = encodeWav(chunks.current, OUT_RATE);
    chunks.current = [];
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const url = URL.createObjectURL(blob);
    takeUrl.current = url;
    setTake({ file: new File([blob], `voice-recording-${stamp}.wav`, { type: 'audio/wav' }), url, seconds });
  };

  const start = async () => {
    setProblem('');
    discard();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but works in every browser without a separate worklet file.
      const node = ctx.createScriptProcessor(4096, 1, 1);
      const ratio = ctx.sampleRate / OUT_RATE;
      let acc = 0, n = 0, seen = 0, nextAt = ratio, lastLevel = 0;
      chunks.current = [];
      paused.current = false;
      elapsed.current = 0;
      node.onaudioprocess = e => {
        const input = e.inputBuffer.getChannelData(0);
        let peak = 0;
        for (let i = 0; i < input.length; i++) peak = Math.max(peak, Math.abs(input[i]));
        if (Date.now() - lastLevel > 120) { lastLevel = Date.now(); setLevel(paused.current ? 0 : Math.min(1, peak * 1.6)); }
        if (paused.current) return;
        // Average groups of input samples down to the output rate (a cheap low-pass), then clip to 16-bit.
        const out: number[] = [];
        for (let i = 0; i < input.length; i++) {
          acc += input[i]; n++; seen++;
          if (seen >= nextAt) {
            const v = Math.max(-1, Math.min(1, acc / n));
            out.push(v < 0 ? v * 0x8000 : v * 0x7fff);
            acc = 0; n = 0; nextAt += ratio;
          }
        }
        if (out.length) chunks.current.push(Int16Array.from(out));
      };
      source.connect(node);
      node.connect(ctx.destination); // required for the processor to run; its output is silent
      live.current = { stream, ctx, node, source };
      setSeconds(0);
      setPhase('recording');
      timer.current = window.setInterval(() => {
        if (paused.current) return;
        elapsed.current += 1;
        setSeconds(elapsed.current);
        if (elapsed.current >= MAX_SECONDS) finish();
      }, 1000);
    } catch (e) {
      release();
      setProblem(micError(e));
    }
  };

  const togglePause = () => {
    paused.current = !paused.current;
    setPhase(paused.current ? 'paused' : 'recording');
  };

  function discard() {
    if (takeUrl.current) { URL.revokeObjectURL(takeUrl.current); takeUrl.current = null; }
    setTake(null);
  }

  const save = () => {
    if (!take) return;
    const minutes = Math.max(1, Math.ceil(take.seconds / 60));
    upload(take.file).then(d => { discard(); onSaved(d, minutes); }).catch(() => undefined);
  };

  if (!supported) {
    return <p role="status" className="m-0 rounded-lg border border-bone bg-fog px-3 py-3 text-[12.5px] text-slate">Recording needs a secure (https) connection and a browser with microphone support. You can upload an audio file instead.</p>;
  }

  return (
    <div className="rounded-lg border border-bone bg-white p-4 flex flex-col gap-3">
      {take ? (
        <>
          <p className="m-0 text-[13px] font-semibold text-carbon">Your recording · {clock(take.seconds)}</p>
          <audio src={take.url} controls preload="metadata" aria-label="Listen to your recording" className="w-full" />
          <div className="flex gap-2 flex-wrap">
            <Button variant="primary" size="sm" loading={uploading} onClick={save}><Check size={13} /> Use this recording</Button>
            <Button variant="ghost" size="sm" disabled={uploading} onClick={() => { discard(); void start(); }}><RotateCcw size={13} /> Record again</Button>
          </div>
        </>
      ) : phase === 'idle' ? (
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="primary" size="sm" onClick={() => void start()}><Mic size={14} /> Start recording</Button>
          <span className="text-[12px] text-slate">Your browser will ask to use the microphone. Up to {MAX_SECONDS / 60} minutes.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 text-[14px] font-bold text-carbon tabular-nums" role="timer" aria-live="off">
              <span className={phase === 'recording' ? 'size-2.5 rounded-full bg-error animate-pulse' : 'size-2.5 rounded-full bg-slate'} aria-hidden />
              {clock(seconds)} {phase === 'paused' && <span className="text-[12px] font-normal text-slate">paused</span>}
            </span>
            <div className="h-2 w-28 rounded-full bg-fog overflow-hidden" aria-hidden><div className="h-full bg-success transition-[width] duration-100" style={{ width: `${Math.round(level * 100)}%` }} /></div>
            <div className="ms-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={togglePause}>{phase === 'paused' ? <><Play size={13} /> Resume</> : <><Pause size={13} /> Pause</>}</Button>
              <Button variant="primary" size="sm" onClick={finish}><Square size={12} /> Stop</Button>
            </div>
          </div>
          <p className="m-0 text-[12px] text-slate">Speak close to the microphone. Press Stop when you are done, then listen before you save it.</p>
        </div>
      )}
      {uploading && <p className="m-0 flex items-center gap-2 text-[12px] text-slate"><Loader2 size={13} className="animate-spin" /> Saving your recording…</p>}
      {(problem || uploadError) && <p role="alert" className="m-0 text-[12px] text-error">{problem || uploadError}</p>}
    </div>
  );
}
