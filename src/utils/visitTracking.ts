import { useEffect } from 'react';
import { API_BASE_URL } from '@/api/apiBase';

/**
 * Anonymous page-view beacon for the seller's "Visits / Conversion / Traffic sources" numbers.
 * Fire-and-forget: errors are swallowed and nothing here can ever block or break a page.
 * Only the target id, a source bucket and (for Edudeen-search visits) the typed search words are sent. No user id.
 */
export type VisitSource = 'edudeen_search' | 'category' | 'direct' | 'social' | 'external';
export interface DetectedSource { source: VisitSource; term?: string }

const HEX24 = /^[0-9a-f]{24}$/i;
const SOCIAL_HOST = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|t\.co|twitter\.com|x\.com|whatsapp\.com|wa\.me|youtube\.com|youtu\.be|tiktok\.com|linkedin\.com|lnkd\.in|pinterest\.[a-z.]+|telegram\.org|t\.me|reddit\.com|snapchat\.com)$/i;
const SOCIAL_NAME = /facebook|instagram|whatsapp|twitter|youtube|tiktok|linkedin|pinterest|telegram|reddit|snapchat|social/i;
const DEDUPE_MS = 30 * 60 * 1000;

// ── In-app navigation memory ────────────────────────────────────────────────
// document.referrer stays the ORIGINAL entry referrer after in-app (pushState) navigation, so the page the visitor
// came from inside the app is tracked here. Updated by <VisitNavTracker/> (layout effect, before child effects).
let currentInApp: string | null = null;
let previousInApp: string | null = null;
export function noteNavigation(href: string) {
  if (href === currentInApp) return;
  previousInApp = currentInApp;
  currentInApp = href;
}

function classifyInternal(u: URL): DetectedSource {
  const q = u.searchParams.get('search') ?? u.searchParams.get('q');
  if (q && q.trim()) return { source: 'edudeen_search', term: q.trim().slice(0, 60) };
  const p = u.searchParams;
  if (p.has('category') || p.has('subject') || p.has('class') || p.has('subjects') || /^\/(browse|c|learn)(\/|$)/.test(u.pathname)) return { source: 'category' };
  return { source: 'direct' };
}

/** Where did this visit come from? Pure given the arguments (exported for testing). */
export function classifySource(args: { search: string; referrer: string; previousInApp: string | null; origin: string; host: string }): DetectedSource {
  const sp = new URLSearchParams(args.search);
  const utm = `${sp.get('utm_source') ?? ''} ${sp.get('utm_medium') ?? ''}`.trim();
  if (utm) return SOCIAL_NAME.test(utm) ? { source: 'social' } : { source: 'external' };
  try {
    if (args.previousInApp) return classifyInternal(new URL(args.previousInApp, args.origin));
    if (!args.referrer) return { source: 'direct' };
    const r = new URL(args.referrer);
    if (r.host === args.host || /(^|\.)edudeen\.com$/i.test(r.host)) return classifyInternal(r);
    return SOCIAL_HOST.test(r.hostname) ? { source: 'social' } : { source: 'external' };
  } catch {
    return { source: 'direct' };
  }
}

export function detectSource(): DetectedSource {
  return classifySource({ search: window.location.search, referrer: document.referrer, previousInApp, origin: window.location.origin, host: window.location.host });
}

// ── Sending ────────────────────────────────────────────────────────────────
const sent = new Map<string, number>();

export function sendView(type: 'store' | 'product', id: string): void {
  try {
    if (!HEX24.test(id)) return;
    const path = window.location.pathname;
    if (/^\/(admin|store|seller|onboarding)(\/|$)/.test(path)) return; // dashboards and previews are not visits
    const key = `${type}:${id}`;
    const now = Date.now();
    const last = sent.get(key);
    if (last && now - last < DEDUPE_MS) return; // the server dedupes too; this just saves requests
    sent.set(key, now);
    const { source, term } = detectSource();
    void fetch(`${API_BASE_URL}/api/analytics/view`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, source, ...(term ? { term } : {}) }),
    }).catch(() => undefined);
  } catch {
    /* tracking must never affect the page */
  }
}

/** Counts one visit for this store / product page once per mount of the id (server dedupes per visitor for 30 min). */
export function useTrackView(type: 'store' | 'product', id: string | null | undefined): void {
  useEffect(() => {
    if (id) sendView(type, id);
  }, [type, id]);
}
