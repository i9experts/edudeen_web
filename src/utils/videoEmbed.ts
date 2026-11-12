/** YouTube / Vimeo only. Mirrors the API's parseIntroVideo (API is the authority; this gives instant feedback). */
export interface IntroVideo { provider: 'youtube' | 'vimeo'; id: string; url: string }

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);

export function parseIntroVideo(raw: string | null | undefined): IntroVideo | null {
  if (!raw || raw.length > 300) return null;
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split('/').filter(Boolean);
  const yt = (id: string): IntroVideo => ({ provider: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` });
  const vimeo = (id: string): IntroVideo => ({ provider: 'vimeo', id, url: `https://vimeo.com/${id}` });

  if (host === 'youtu.be') return parts[0] && YT_ID.test(parts[0]) ? yt(parts[0]) : null;
  if (YT_HOSTS.has(host)) {
    let id: string | undefined;
    if (parts[0] === 'watch') id = u.searchParams.get('v') ?? undefined;
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) id = parts[1];
    return id && YT_ID.test(id) ? yt(id) : null;
  }
  if (host === 'vimeo.com' || host === 'www.vimeo.com') {
    const id = [...parts].reverse().find(p => /^\d{5,12}$/.test(p));
    return id ? vimeo(id) : null;
  }
  if (host === 'player.vimeo.com' && parts[0] === 'video' && /^\d{5,12}$/.test(parts[1] ?? '')) return vimeo(parts[1]);
  return null;
}

export const VIDEO_URL_ERROR = 'Use a YouTube or Vimeo video link (for example https://www.youtube.com/watch?v=...).';

export function embedSrc(v: IntroVideo): string {
  return v.provider === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`
    : `https://player.vimeo.com/video/${v.id}?autoplay=1&dnt=1`;
}

/** YouTube has a static poster; Vimeo does not (no API call is made), so it returns null. */
export function posterSrc(v: IntroVideo): string | null {
  return v.provider === 'youtube' ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : null;
}
