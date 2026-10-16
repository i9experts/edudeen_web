/**
 * Vercel Routing Middleware (runs at the edge before static files).
 *
 * Why it exists: "/" is a real file (index.html), and vercel.json `rewrites` never override an existing
 * static file, so the bot rewrite for the home page cannot live in vercel.json. For search-engine and
 * link-preview bots only, "/" is answered with the API's pre-rendered HTML (hero text, categories,
 * featured products, FAQ, JSON-LD). Everybody else, and every bot on other paths, is untouched.
 */
const BOT_UA = /(Googlebot|Google-InspectionTool|AdsBot-Google|bingbot|BingPreview|DuckDuckBot|YandexBot|Baiduspider|Applebot|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|WhatsApp|TelegramBot|Pinterestbot)/i;
const API = 'https://api.edudeen.com';

export const config = { matcher: ['/'] };

export default async function middleware(request: Request): Promise<Response | undefined> {
  if (!BOT_UA.test(request.headers.get('user-agent') ?? '')) return undefined;
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const target = category && /^[a-z0-9-]+$/i.test(category)
    ? `${API}/seo-render/category/${encodeURIComponent(category)}`
    : `${API}/seo-render/home`;
  try {
    const res = await fetch(target, { headers: { accept: 'text/html' } });
    if (!res.ok && res.status !== 404) return undefined; // API trouble: fall back to the normal page
    return new Response(res.body, { status: res.status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  } catch {
    return undefined;
  }
}
