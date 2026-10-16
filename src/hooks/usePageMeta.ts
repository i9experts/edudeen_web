import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE_URL, DEFAULT_OG_IMAGE, SITE_NAME } from '@/utils/seo';

/**
 * ONE head helper for every public page: title, description, canonical, robots, Open Graph, Twitter card and JSON-LD.
 *   usePageMeta('description only')            // legacy form
 *   usePageMeta({ title, description, image, noindex, jsonLd, type })
 * Every tag it touches is put back to the index.html value when the page unmounts or the data changes.
 */
export interface PageMeta {
  /** Page title (without the site name; ` | Edudeen` is appended). */
  title?: string;
  description?: string | null;
  /** Absolute image URL for og:image / twitter:image (default: the branded Edudeen card). */
  image?: string | null;
  /** Canonical path (`/product/x`) or absolute URL. Default: the current pathname without the query string. */
  canonical?: string;
  noindex?: boolean;
  type?: 'website' | 'product' | 'article';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
}

type Touched = Map<string, string | null>;

/** True while a page-level hook owns the canonical/og tags, so the route-level defaults (RouteMeta) leave them alone. */
let claimed = false;
export const pageMetaClaimed = () => claimed;

const absolute = (v: string) => (/^https?:\/\//i.test(v) ? v : `${SITE_URL}${v.startsWith('/') ? '' : '/'}${v}`);

function tag(selector: string, create: () => HTMLElement): HTMLElement {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) { el = create(); el.setAttribute('data-created-by-page-meta', ''); document.head.appendChild(el); }
  return el;
}

/** Sets one head tag and remembers its original value in `touched` (null = the tag did not exist). */
export function setHead(touched: Touched, kind: 'name' | 'property' | 'canonical', key: string, value: string) {
  const selector = kind === 'canonical' ? 'link[rel="canonical"]' : `meta[${kind}="${key}"]`;
  const id = `${kind}:${key}`;
  const existing = document.head.querySelector<HTMLElement>(selector);
  if (!touched.has(id)) touched.set(id, existing ? (kind === 'canonical' ? existing.getAttribute('href') : existing.getAttribute('content')) : null);
  const el = tag(selector, () => {
    if (kind === 'canonical') { const l = document.createElement('link'); l.rel = 'canonical'; return l; }
    const m = document.createElement('meta'); m.setAttribute(kind, key); return m;
  });
  el.setAttribute(kind === 'canonical' ? 'href' : 'content', value);
}

export function restoreHead(touched: Touched) {
  touched.forEach((orig, id) => {
    const [kind, ...rest] = id.split(':');
    const key = rest.join(':');
    const selector = kind === 'canonical' ? 'link[rel="canonical"]' : `meta[${kind}="${key}"]`;
    const el = document.head.querySelector<HTMLElement>(selector);
    if (!el) return;
    if (orig == null) { if (el.hasAttribute('data-created-by-page-meta')) el.remove(); return; }
    el.setAttribute(kind === 'canonical' ? 'href' : 'content', orig);
  });
  touched.clear();
}

export function usePageMeta(input: string | PageMeta | null | undefined) {
  const { pathname } = useLocation();
  const key = JSON.stringify(input ?? null);

  useEffect(() => {
    const m: PageMeta | null = typeof input === 'string' ? { description: input } : input ?? null;
    if (!m || (!m.title && !m.description && !m.jsonLd && !m.noindex && !m.canonical)) return;
    const touched: Touched = new Map();
    const prevTitle = document.title;
    const scripts: HTMLScriptElement[] = [];

    const fullTitle = m.title ? (m.title.toLowerCase().includes('edudeen') ? m.title : `${m.title} | ${SITE_NAME}`) : null;
    if (fullTitle) document.title = fullTitle;
    if (m.description) {
      const d = m.description.replace(/\s+/g, ' ').trim().slice(0, 300);
      setHead(touched, 'name', 'description', d);
      setHead(touched, 'property', 'og:description', d);
      setHead(touched, 'name', 'twitter:description', d);
    }
    if (fullTitle) {
      setHead(touched, 'property', 'og:title', fullTitle);
      setHead(touched, 'name', 'twitter:title', fullTitle);
    }
    const canonical = absolute(m.canonical ?? pathname);
    setHead(touched, 'canonical', 'canonical', canonical.split('#')[0]);
    setHead(touched, 'property', 'og:url', canonical.split('#')[0]);
    setHead(touched, 'property', 'og:type', m.type ?? 'website');
    const image = m.image ? absolute(m.image) : DEFAULT_OG_IMAGE;
    setHead(touched, 'property', 'og:image', image);
    setHead(touched, 'name', 'twitter:image', image);
    setHead(touched, 'name', 'twitter:card', 'summary_large_image');
    if (m.noindex) setHead(touched, 'name', 'robots', 'noindex,follow');
    if (m.jsonLd) {
      for (const block of Array.isArray(m.jsonLd) ? m.jsonLd : [m.jsonLd]) {
        const s = document.createElement('script');
        s.type = 'application/ld+json';
        s.setAttribute('data-page-ld', '');
        s.text = JSON.stringify(block).replace(/</g, '\\u003c');
        document.head.appendChild(s);
        scripts.push(s);
      }
    }
    claimed = true;
    return () => {
      claimed = false;
      restoreHead(touched);
      scripts.forEach((s) => s.remove());
      if (fullTitle && document.title === fullTitle) document.title = prevTitle;
    };
    // `key` is the serialised input, so a new object with the same content does not re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pathname]);
}
