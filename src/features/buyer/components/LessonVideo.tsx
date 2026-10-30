import { useCallback, useEffect, useRef, useState } from 'react';
import { MousePointer2 } from 'lucide-react';
import { externalVideoEmbed } from '@/utils/externalVideo';

const IDLE_MS = 60_000;
/** A jump bigger than this between two time reports is a seek, not normal playback. */
const SEEK_TOLERANCE = 2;

type Ctl = { play: () => void; pause: () => void; seek: (t: number) => void };

/**
 * Plays a lesson video: an uploaded file (signed URL) or an allow-listed
 * YouTube / Vimeo link in a sandboxed iframe. Unknown links render nothing.
 *
 * Course-player mode (`guard`): the learner cannot skip ahead of what they have
 * watched (`lockSeek`), `onFinished` fires when the video ends, and after one
 * minute without any mouse/keyboard/touch activity the video pauses behind a
 * blurred full-page notice and resumes from the same spot on the next movement.
 * Mouse movement INSIDE a YouTube/Vimeo frame is invisible to the page, so for
 * those the pointer being over the frame counts as activity.
 */
export function LessonVideo({ file, videoUrl, title, autoPlay, guard, lockSeek, onFinished }: {
  file?: { url: string } | null;
  videoUrl?: string | null;
  title: string;
  autoPlay?: boolean;
  guard?: boolean;
  lockSeek?: boolean;
  onFinished?: () => void;
}) {
  const embed = externalVideoEmbed(videoUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const ctl = useRef<Ctl | null>(null);
  const playing = useRef(false);
  const maxT = useRef(0);
  const lastActive = useRef(Date.now());
  const overFrame = useRef(false);
  const [idle, setIdle] = useState(false);
  const idleRef = useRef(false);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;
  const lockRef = useRef(!!lockSeek);
  lockRef.current = !!lockSeek;

  // One place for "the player says it is at time t".
  const reportTime = useCallback((t: number) => {
    if (!Number.isFinite(t)) return;
    if (lockRef.current && t > maxT.current + SEEK_TOLERANCE) { ctl.current?.seek(maxT.current); return; }
    if (t > maxT.current) maxT.current = t;
  }, []);

  const finish = useCallback(() => { playing.current = false; finishedRef.current?.(); }, []);

  // Native <video> controller + guards.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    ctl.current = { play: () => { void v.play().catch(() => undefined); }, pause: () => v.pause(), seek: t => { v.currentTime = t; } };
    const onTime = () => { if (!v.seeking) reportTime(v.currentTime); };
    const onSeeking = () => { if (lockRef.current && v.currentTime > maxT.current + 0.75) v.currentTime = maxT.current; };
    const onPlay = () => { playing.current = true; };
    const onPause = () => { playing.current = false; };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('seeking', onSeeking);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', finish);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('seeking', onSeeking);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', finish);
      ctl.current = null;
    };
  }, [file?.url, reportTime, finish]);

  // YouTube / Vimeo controller over postMessage.
  const provider = embed?.provider;
  useEffect(() => {
    const frame = frameRef.current;
    if (!provider || !frame) return;
    const origin = provider === 'youtube' ? 'https://www.youtube-nocookie.com' : 'https://player.vimeo.com';
    const send = (msg: unknown) => frame.contentWindow?.postMessage(JSON.stringify(msg), origin);
    if (provider === 'youtube') {
      const cmd = (func: string, args: unknown[] = []) => send({ event: 'command', func, args });
      ctl.current = { play: () => cmd('playVideo'), pause: () => cmd('pauseVideo'), seek: t => cmd('seekTo', [t, true]) };
    } else {
      ctl.current = { play: () => send({ method: 'play' }), pause: () => send({ method: 'pause' }), seek: t => send({ method: 'setCurrentTime', value: t }) };
    }
    const handshake = () => {
      if (provider === 'youtube') send({ event: 'listening', id: 1, channel: 'widget' });
      else ['play', 'pause', 'finish', 'timeupdate', 'seeked'].forEach(value => send({ method: 'addEventListener', value }));
    };
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== frame.contentWindow) return;
      let d: any = e.data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
      if (!d || typeof d !== 'object') return;
      if (provider === 'youtube') {
        if (d.event === 'onReady') handshake();
        const info = d.info;
        if (d.event === 'infoDelivery' && info) {
          if (typeof info.currentTime === 'number') reportTime(info.currentTime);
          if (typeof info.playerState === 'number') {
            if (info.playerState === 0) finish();
            else playing.current = info.playerState === 1;
          }
        }
        if (d.event === 'onStateChange') {
          if (d.info === 0) finish();
          else playing.current = d.info === 1;
        }
      } else {
        if (d.event === 'timeupdate') reportTime(Number(d.data?.seconds));
        else if (d.event === 'seeked') reportTime(Number(d.data?.seconds));
        else if (d.event === 'play') playing.current = true;
        else if (d.event === 'pause') playing.current = false;
        else if (d.event === 'finish') finish();
      }
    };
    window.addEventListener('message', onMsg);
    frame.addEventListener('load', handshake);
    handshake();
    return () => { window.removeEventListener('message', onMsg); frame.removeEventListener('load', handshake); ctl.current = null; };
  }, [provider, embed?.embedUrl, reportTime, finish]);

  // Attention check: one minute with no activity pauses; any activity resumes.
  useEffect(() => {
    if (!guard) return;
    const wake = () => {
      lastActive.current = Date.now();
      if (idleRef.current) {
        idleRef.current = false;
        setIdle(false);
        ctl.current?.play();
      }
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'wheel', 'scroll', 'pointerdown'] as const;
    events.forEach(n => window.addEventListener(n, wake, { passive: true }));
    const timer = window.setInterval(() => {
      if (overFrame.current) lastActive.current = Date.now();
      if (idleRef.current || !playing.current || document.hidden) return;
      if (Date.now() - lastActive.current >= IDLE_MS) {
        ctl.current?.pause();
        playing.current = false;
        idleRef.current = true;
        setIdle(true);
      }
    }, 2000);
    return () => { events.forEach(n => window.removeEventListener(n, wake)); window.clearInterval(timer); };
  }, [guard]);

  const idleNotice = guard && idle ? (
    <div role="alertdialog" aria-live="assertive" aria-label="Are you still there?"
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
      <div className="max-w-[360px] w-full rounded-2xl bg-white p-6 text-center shadow-xl">
        <MousePointer2 size={28} className="mx-auto text-brand-royal mb-3" />
        <p className="m-0 text-[16px] font-bold text-carbon">Are you still there?</p>
        <p className="m-0 mt-1.5 text-[13.5px] text-slate">The video was paused because we saw no activity for a minute. Move your mouse or tap the screen to continue from where you stopped.</p>
      </div>
    </div>
  ) : null;

  if (embed) {
    const src = provider === 'youtube'
      ? `${embed.embedUrl}${embed.embedUrl.includes('?') ? '&' : '?'}enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}${lockSeek ? '&disablekb=1' : ''}`
      : embed.embedUrl;
    return (
      <>
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-black"
          onMouseEnter={() => { overFrame.current = true; }} onMouseLeave={() => { overFrame.current = false; }}>
          <iframe
            ref={frameRef}
            src={src} title={title} className="w-full h-full border-0"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen referrerPolicy="strict-origin-when-cross-origin" loading="lazy"
          />
        </div>
        {idleNotice}
      </>
    );
  }
  if (file?.url) {
    return (
      <>
        <video ref={videoRef} src={file.url} controls autoPlay={autoPlay} controlsList="nodownload" className="w-full rounded-lg bg-black aspect-video" />
        {idleNotice}
      </>
    );
  }
  return null;
}
