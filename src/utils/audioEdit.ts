/**
 * In-browser voice editing: cut parts out, keep only a part, and add more voice before / inside / after it.
 * The recording is held as mono 16-bit samples at a speech-friendly rate and edited as a list of segments (pointers
 * into the original and any added recordings), so every edit is instant and can be undone. Nothing is rewritten
 * until the seller saves, when the segments are joined into one WAV file.
 */

/** 22.05 kHz mono: plenty for speech, about 2.6 MB per minute. */
export const EDIT_RATE = 22050;
/** Longest voice the editor will hold (decoded it is ~100 MB). */
export const EDIT_MAX_SECONDS = 40 * 60;

/** A piece of the edited voice: samples [from, to) of `sources[src]`. */
export interface Seg { src: number; from: number; to: number }

export const lengthOf = (segs: Seg[]) => segs.reduce((n, s) => n + (s.to - s.from), 0);
export const toSamples = (seconds: number) => Math.round(seconds * EDIT_RATE);
export const toSeconds = (samples: number) => samples / EDIT_RATE;

/** Splits so that a segment boundary sits at output position `at`; returns the new list and the index of that boundary. */
function splitAt(segs: Seg[], at: number): { segs: Seg[]; index: number } {
  const out: Seg[] = [];
  let pos = 0;
  let index = -1;
  for (const s of segs) {
    const len = s.to - s.from;
    if (index < 0 && at <= pos) index = out.length;
    if (at > pos && at < pos + len) {
      const cut = s.from + (at - pos);
      out.push({ ...s, to: cut });
      index = out.length;
      out.push({ ...s, from: cut });
    } else out.push(s);
    pos += len;
  }
  return { segs: out, index: index < 0 ? out.length : index };
}

/** Removes the part between output positions `a` and `b` (samples). */
export function cutRange(segs: Seg[], a: number, b: number): Seg[] {
  if (b <= a) return segs;
  const withA = splitAt(segs, a).segs;
  const withB = splitAt(withA, b).segs;
  const out: Seg[] = [];
  let pos = 0;
  for (const s of withB) {
    const len = s.to - s.from;
    if (!(pos >= a && pos + len <= b) && len > 0) out.push(s);
    pos += len;
  }
  return out;
}

/** Keeps only the part between `a` and `b`. */
export function keepRange(segs: Seg[], a: number, b: number): Seg[] {
  if (b <= a) return segs;
  return cutRange(cutRange(segs, b, lengthOf(segs)), 0, a);
}

/** Puts `piece` into the voice at output position `at` (the voice there is split, nothing is lost). */
export function insertAt(segs: Seg[], at: number, piece: Seg): Seg[] {
  const { segs: split, index } = splitAt(segs, Math.min(Math.max(at, 0), lengthOf(segs)));
  const out = [...split];
  out.splice(index, 0, piece);
  return out;
}

/** The edited voice as one sample array. */
export function joinSegments(sources: Int16Array[], segs: Seg[]): Int16Array {
  const out = new Int16Array(lengthOf(segs));
  let pos = 0;
  for (const s of segs) {
    out.set(sources[s.src].subarray(s.from, s.to), pos);
    pos += s.to - s.from;
  }
  return out;
}

/** Loudness per column (0..1) for drawing the waveform. */
export function waveformPeaks(sources: Int16Array[], segs: Seg[], bins: number): Float32Array {
  const total = lengthOf(segs);
  const peaks = new Float32Array(Math.max(1, bins));
  if (!total) return peaks;
  const perBin = total / peaks.length;
  let pos = 0;
  for (const s of segs) {
    const data = sources[s.src];
    for (let i = s.from; i < s.to; i++, pos++) {
      const v = Math.abs(data[i]);
      const b = Math.min(peaks.length - 1, Math.floor(pos / perBin));
      if (v > peaks[b]) peaks[b] = v;
    }
  }
  for (let i = 0; i < peaks.length; i++) peaks[i] = Math.min(1, peaks[i] / 32768);
  return peaks;
}

/** 16-bit mono PCM chunks → a WAV file (plays and seeks in every browser). */
export function encodeWav(chunks: Int16Array[], rate: number): Blob {
  const samples = chunks.reduce((n, c) => n + c.length, 0);
  const head = new DataView(new ArrayBuffer(44));
  const text = (at: number, s: string) => { for (let i = 0; i < s.length; i++) head.setUint8(at + i, s.charCodeAt(i)); };
  text(0, 'RIFF'); head.setUint32(4, 36 + samples * 2, true); text(8, 'WAVE');
  text(12, 'fmt '); head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 1, true);
  head.setUint32(24, rate, true); head.setUint32(28, rate * 2, true); head.setUint16(32, 2, true); head.setUint16(34, 16, true);
  text(36, 'data'); head.setUint32(40, samples * 2, true);
  return new Blob([head.buffer as ArrayBuffer, ...chunks.map(c => c.buffer as ArrayBuffer)], { type: 'audio/wav' });
}

/** Any audio file (MP3, M4A, WAV, OGG …) → mono samples at EDIT_RATE. Throws a readable Error when it cannot be decoded. */
export async function decodeToMono(data: ArrayBuffer): Promise<Int16Array> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(data.slice(0));
  } catch {
    throw new Error('This audio file could not be read. Try an MP3, M4A or WAV file.');
  } finally {
    void ctx.close().catch(() => undefined);
  }
  if (decoded.duration > EDIT_MAX_SECONDS) throw new Error(`This recording is longer than ${EDIT_MAX_SECONDS / 60} minutes, which is too long to edit here.`);
  // Resample and mix down to mono in one step.
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * EDIT_RATE)), EDIT_RATE);
  const node = off.createBufferSource();
  node.buffer = decoded;
  node.connect(off.destination);
  node.start();
  const rendered = (await off.startRendering()).getChannelData(0);
  const out = new Int16Array(rendered.length);
  for (let i = 0; i < rendered.length; i++) {
    const v = Math.max(-1, Math.min(1, rendered[i]));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

export interface TimedText { start: number; end: number }

/**
 * Subtitles were timed against the ORIGINAL recording (source 0). After edits, moves each one to where that part of the
 * recording now sits. A subtitle whose speech was cut out disappears; one that straddles a cut gets shorter.
 */
export function mapSubtitleTimes<T extends TimedText>(segs: Seg[], cues: T[]): T[] {
  const pieces: { from: number; to: number; out: number }[] = [];
  let pos = 0;
  for (const s of segs) {
    if (s.src === 0) pieces.push({ from: toSeconds(s.from), to: toSeconds(s.to), out: toSeconds(pos) });
    pos += s.to - s.from;
  }
  const map = (t: number, edge: 'start' | 'end'): number | null => {
    // A start exactly on a seam belongs to the piece after it, an end to the piece before it.
    const inside = edge === 'start' ? pieces.find(p => t >= p.from && t < p.to) : pieces.find(p => t > p.from && t <= p.to);
    if (inside) return inside.out + (t - inside.from);
    if (edge === 'start') { const next = pieces.find(p => p.from > t); return next ? next.out : null; }
    const before = [...pieces].reverse().find(p => p.to < t);
    return before ? before.out + (before.to - before.from) : null;
  };
  const out: T[] = [];
  for (const c of cues) {
    const start = map(c.start, 'start');
    const end = map(c.end, 'end');
    if (start === null || end === null || end - start < 0.3) continue;
    out.push({ ...c, start, end });
  }
  return out;
}
