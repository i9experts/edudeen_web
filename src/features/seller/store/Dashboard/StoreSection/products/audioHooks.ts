import { useEffect, useRef, type RefObject } from 'react';

/** Calls `tick(currentTime)` every animation frame while the voice plays, and once on every pause / seek. */
export function useMediaClock(audioRef: RefObject<HTMLAudioElement | null>, tick: (t: number) => void) {
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
