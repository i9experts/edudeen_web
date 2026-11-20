/**
 * The browser's own speech-to-text (Web Speech API), the same engine voice search uses. Edudeen's servers never
 * receive audio for this: Chrome / Edge do the recognition with their vendor's service, which is the browser's choice.
 * `getRecognitionCtor()` is null on browsers without the API (e.g. Firefox).
 */
export interface RecognitionResultAlt { transcript: string; confidence: number }
export interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<RecognitionResultAlt> & { isFinal: boolean }> & { length: number };
}
export interface RecognitionLike {
  lang: string; interimResults: boolean; maxAlternatives: number; continuous: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => RecognitionLike;

export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const recognitionLang = (lang: 'ur' | 'en') => (lang === 'ur' ? 'ur-PK' : 'en-PK');

/**
 * One recognised phrase → subtitle-sized lines: split at sentence ends, then long sentences into groups of at most
 * `maxWords` words, so a subtitle never fills the screen.
 */
export function splitForSubtitle(text: string, maxWords = 12): string[] {
  const sentences = (text.match(/[^.۔?؟!]+[.۔?؟!]?/g) ?? [text]).map(s => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const s of sentences) {
    const words = s.split(/\s+/);
    if (words.length <= maxWords) { out.push(s); continue; }
    const groups = Math.ceil(words.length / maxWords);
    const per = Math.ceil(words.length / groups);
    for (let i = 0; i < words.length; i += per) out.push(words.slice(i, i + per).join(' '));
  }
  return out;
}
