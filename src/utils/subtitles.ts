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

const MIN_CUE = 0.3;

/** Cues sorted by start time, each at least MIN_CUE long, with line breaks that cannot split a WebVTT block. */
export function tidyCues(cues: Cue[]): Cue[] {
  return [...cues]
    .map(c => ({ ...c, start: Math.max(0, c.start), end: Math.max(c.end, Math.max(0, c.start) + MIN_CUE), text: c.text.replace(/\n{2,}/g, '\n').replace(/^\n+|\n+$/g, '') }))
    .sort((a, b) => a.start - b.start);
}

/** Writes cues back as WebVTT (the form that is stored). */
export function vttFromCues(cues: Cue[]): string {
  const clean = tidyCues(cues).filter(c => c.text.trim());
  return clean.length ? cuesToVtt(clean) : '';
}

/**
 * Turns a plain transcript into cues spread evenly over `totalSeconds`, one cue per line (or per sentence when the
 * text is a single paragraph). A starting point the seller then drags into place on the timeline.
 */
export function spreadTranscript(text: string, totalSeconds: number): Cue[] {
  const byLine = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const lines = byLine.length > 1 ? byLine : (text.match(/[^.۔?؟!]+[.۔?؟!]?/g) ?? []).map(s => s.trim()).filter(Boolean);
  if (!lines.length) return [];
  const per = Math.max(MIN_CUE, (totalSeconds > 0 ? totalSeconds : lines.length * 3) / lines.length);
  return lines.map((t, i) => ({ start: i * per, end: (i + 1) * per, text: t }));
}

/** One cue per line, spread evenly over `total` seconds (3 s each when the length is unknown). */
export function spreadLines(lines: string[], total: number): Cue[] {
  if (!lines.length) return [];
  const per = Math.max(MIN_CUE, total > 0 ? total / lines.length : 3);
  return lines.map((text, i) => ({ start: i * per, end: (i + 1) * per, text }));
}

/**
 * The seller edited the text line by line: every line keeps the timing of the cue at the same position, new lines at
 * the end get 3 s slots after the last cue (or everything is re-spread when they would run past the end of the voice).
 */
export function cuesFromLines(lines: string[], previous: Cue[], total: number): Cue[] {
  if (!previous.length) return spreadLines(lines, total);
  let cursor = previous[previous.length - 1].end;
  const out: Cue[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (previous[i]) { out.push({ ...previous[i], text: lines[i] }); continue; }
    out.push({ start: cursor, end: cursor + 3, text: lines[i] });
    cursor += 3;
  }
  return total > 0 && cursor > total ? spreadLines(lines, total) : out;
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
