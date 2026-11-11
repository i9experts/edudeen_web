/**
 * Vercel Routing Middleware (runs at the edge before static files).
 *
 * Why it exists: "/" is a real file (index.html), and vercel.json `rewrites` never override an existing
 * static file, so the bot rewrite for the home page cannot live in vercel.json. For search-engine and
 * link-preview bots only, "/" is answered with the API's pre-rendered HTML (hero text, categories,
 * featured products, FAQ, JSON-LD). Everybody else, and every bot on other paths, is untouched.
 *
 * Second job: a store linked at the site root (`edudeen.com/<store-slug>`). vercel.json cannot check that the slug is a
 * real store, so for bots the API decides: 200 = an active store (preview HTML), 404 = anything else -> we fall
 * through and the normal app answers exactly as before.
 */
const BOT_UA = /(Googlebot|Google-InspectionTool|AdsBot-Google|bingbot|BingPreview|DuckDuckBot|YandexBot|Baiduspider|Applebot|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|WhatsApp|TelegramBot|Pinterestbot)/i;
const API = 'https://api.edudeen.com';
// One path segment, no dot (so /favicon.png, /assets/x.js and friends never match).
const ROOT_SLUG = /^\/([a-z0-9][a-z0-9-]{1,80})\/?$/i;

export const config = { matcher: ['/', '/:slug([A-Za-z0-9][A-Za-z0-9-]{1,80})'] };

function html(res: Response): Response {
  return new Response(res.body, { status: res.status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  if (!BOT_UA.test(request.headers.get('user-agent') ?? '')) return undefined;
  const url = new URL(request.url);

  if (url.pathname !== '/') {
    const m = ROOT_SLUG.exec(url.pathname);
    if (!m) return undefined;
    try {
      const res = await fetch(`${API}/seo-render/root/${encodeURIComponent(m[1].toLowerCase())}`, { headers: { accept: 'text/html' } });
      return res.ok ? html(res) : undefined; // not an active store (or API trouble): normal page
    } catch {
      return undefined;
    }
  }

  const category = url.searchParams.get('category');
  const target = category && /^[a-z0-9-]+$/i.test(category)
    ? `${API}/seo-render/category/${encodeURIComponent(category)}`
    : `${API}/seo-render/home`;
  try {
    const res = await fetch(target, { headers: { accept: 'text/html' } });
    if (!res.ok && res.status !== 404) return undefined; // API trouble: fall back to the normal page
    return html(res);
  } catch {
    return undefined;
  }
}
