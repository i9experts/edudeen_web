import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice search = the browser's own speech-to-text (Web Speech API). Edudeen never receives audio:
 * only the recognised TEXT is used, and it goes through the normal search flow (typed-query pipeline).
 * Note: Chrome/Edge perform the recognition with the browser vendor's service; that is the browser's choice, not ours.
 * `supported` is false on browsers without the API (e.g. Firefox), and the mic button simply is not shown.
 */
interface RecognitionLike {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number } }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => RecognitionLike;

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type VoiceError = 'denied' | 'no-speech' | 'unavailable' | 'failed';

export function useVoiceSearch(opts: { lang: 'en' | 'ur'; onResult: (text: string) => void }) {
  const supported = getCtor() !== null;
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<VoiceError | null>(null);
  const recRef = useRef<RecognitionLike | null>(null);
  const onResultRef = useRef(opts.onResult);
  useEffect(() => { onResultRef.current = opts.onResult; }, [opts.onResult]);

  const stop = useCallback(() => { try { recRef.current?.stop(); } catch { /* already stopped */ } }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || recRef.current) return;
    setError(null);
    const rec = new Ctor();
    rec.lang = opts.lang === 'ur' ? 'ur-PK' : 'en-PK';
    rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    let got = '';
    rec.onresult = (e) => {
      const first = e.results?.[0]?.[0]?.transcript;
      if (first) got = first.trim();
    };
    rec.onerror = (e) => {
      const code = e?.error;
      setError(code === 'not-allowed' || code === 'service-not-allowed' ? 'denied' : code === 'no-speech' || code === 'aborted' ? 'no-speech' : code === 'network' ? 'unavailable' : 'failed');
    };
    rec.onend = () => {
      recRef.current = null; setListening(false);
      if (got) onResultRef.current(got.slice(0, 200));
    };
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { recRef.current = null; setListening(false); setError('failed'); }
  }, [opts.lang]);

  useEffect(() => () => { try { recRef.current?.abort(); } catch { /* ignore */ } recRef.current = null; }, []);

  return { supported, listening, error, start, stop };
}

/** Browser text-to-speech ("Listen"). Free, on the device; no audio is produced by our servers. */
export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}
export function speak(text: string, lang: 'en' | 'ur', onEnd?: () => void): void {
  if (!speechSupported()) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === 'ur' ? 'ur-PK' : 'en-US';
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}
export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
