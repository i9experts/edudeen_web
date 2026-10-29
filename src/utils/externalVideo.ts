/**
 * Turns a pasted YouTube / Vimeo link into a safe embed URL (allow-list only).
 * Anything else returns null, so a seller cannot embed an arbitrary page.
 */
const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

export function externalVideoEmbed(raw: string | null | undefined): { provider: 'youtube' | 'vimeo'; embedUrl: string } | null {
  if (!raw) return null;
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase();
  if (YT_HOSTS.has(host)) {
    let id = '';
    if (host.endsWith('youtu.be')) id = u.pathname.split('/')[1] ?? '';
    else if (u.pathname === '/watch') id = u.searchParams.get('v') ?? '';
    else {
      const m = /^\/(embed|shorts|live|v)\/([^/?#]+)/.exec(u.pathname);
      id = m ? m[2] : '';
    }
    if (!/^[\w-]{6,20}$/.test(id)) return null;
    return { provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
  }
  if (VIMEO_HOSTS.has(host)) {
    // vimeo.com/123456789, vimeo.com/123456789/abcdef (unlisted hash), player.vimeo.com/video/123456789
    const m = /^\/(?:video\/)?(\d{5,12})(?:\/([a-z0-9]+))?\/?$/i.exec(u.pathname);
    if (!m) return null;
    const hash = m[2] ?? u.searchParams.get('h');
    return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${m[1]}${hash && /^[a-z0-9]+$/i.test(hash) ? `?h=${hash}` : ''}` };
  }
  return null;
}

export const isAllowedExternalVideo = (raw: string | null | undefined) => externalVideoEmbed(raw) !== null;
