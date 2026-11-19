/**
 * Subtitle helpers for course lessons. Sellers upload .srt / .vtt files or paste text; we keep WebVTT (timed)
 * or a plain transcript. Everything here is plain text, never HTML.
 */

export type SubtitleLang = 'ur' | 'en';
export interface Cue { start: number; end: number; text: string }

export const SUBTITLE_LANGS: { code: SubtitleLang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ur', label: 'اردو (Urdu)', dir: 'rtl' },
];

/** Mirrors the API cap (course.schema SUBTITLE_LIMITS.perTrack). */
export const SUBTITLE_MAX_CHARS = 120_000;

const STAMP = /^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/;

function toSeconds(stamp: string): number | null {
  const m = STAMP.exec(stamp);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, '0')) / 1000;
}

function toStamp(sec: number): string {
  const ms = Math.round(sec * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3_600_000))}:${p(Math.floor(ms / 60_000) % 60)}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`;
}

/** Reads cues from WebVTT or SRT text. Text without timings gives an empty list. */
export function parseCues(raw: string): Cue[] {
  const blocks = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split(/\n{2,}/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const at = lines.findIndex(l => l.includes('-->'));
    if (at < 0) continue;
    const m = /^\s*(\S+)\s*-->\s*(\S+)/.exec(lines[at]);
    const start = m ? toSeconds(m[1]) : null;
    const end = m ? toSeconds(m[2]) : null;
    if (start === null || end === null) continue;
    const text = lines.slice(at + 1).join('\n').replace(/<[^>]*>/g, '').trim();
    if (text) cues.push({ start, end, text });
  }
  return cues;
}

export function cuesToVtt(cues: Cue[]): string {
  return `WEBVTT\n\n${cues.map(c => `${toStamp(c.start)} --> ${toStamp(c.end)}\n${c.text}`).join('\n\n')}\n`;
}

/** What the seller typed or uploaded → what we store: timed WebVTT when it has timings (SRT is converted), else a plain transcript. */
export function normalizeSubtitle(raw: string): { kind: 'timed' | 'text'; content: string } {
  const cues = parseCues(raw);
  return cues.length ? { kind: 'timed', content: cuesToVtt(cues) } : { kind: 'text', content: raw.replace(/^\uFEFF/, '').trim() };
}

/** A short label for the builder: "42 timed lines" or "plain transcript". */
export function describeSubtitle(raw: string): string {
  if (!raw.trim()) return 'empty';
  const n = parseCues(raw).length;
  return n ? `${n} timed ${n === 1 ? 'line' : 'lines'}` : 'plain transcript (no timings)';
}

/** The whole subtitle as readable text (cue text joined; a transcript as is). */
export function subtitleText(s: { kind?: string; content: string }): string {
  return s.kind === 'text' || !parseCues(s.content).length ? s.content : parseCues(s.content).map(c => c.text).join('\n');
}
