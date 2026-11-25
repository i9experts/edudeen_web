/** Counts only time that was really played (small forward steps between two player reports; a seek is ignored) and
 *  reports it in chunks. `report` returns whether the SERVER now counts the lesson as played enough; `onEnough` fires once then. */
const SEEK_TOLERANCE = 2;
const FLUSH_EVERY_S = 10;
const WATCH_RATIO = 0.9;

export function createPlayTracker(opts: {
  report: (playedSeconds: number, durationSeconds: number | null) => Promise<boolean>;
  onEnough: () => void;
}) {
  let last: number | null = null;
  let pending = 0;
  let total = 0;
  let duration: number | null = null;
  let enough = false;
  let inFlight = false;

  const flush = async (force = false) => {
    if (enough || inFlight || pending < (force ? 0.5 : FLUSH_EVERY_S)) return;
    const chunk = pending;
    pending = 0;
    inFlight = true;
    try {
      if (await opts.report(chunk, duration)) { enough = true; opts.onEnough(); }
    } catch { pending += chunk; /* network blip: sent with the next report */ }
    finally { inFlight = false; }
  };

  return {
    /** The player is at time `t` seconds (`dur` = media length when it knows). */
    tick(t: number, dur?: number | null) {
      if (!Number.isFinite(t)) return;
      if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) duration = dur;
      if (last !== null) {
        const d = t - last;
        if (d > 0 && d <= SEEK_TOLERANCE) { pending += d; total += d; }
      }
      last = t;
      void flush(duration !== null && total >= duration * WATCH_RATIO);
    },
    /** Playback ended: send whatever is left. */
    end() { void flush(true); },
    /** A seek happened: do not count the jump. */
    seeked() { last = null; },
  };
}
