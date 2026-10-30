import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/api/apiBase';
import { getAuthCookie } from '@/utils/authCookie';
import { invalidateCache } from '@/api/services/requestCache';

/**
 * One shared socket for "something changed" signals from the API (topic names only, no data).
 * Screens subscribe with the topics they show and simply re-read their own data when one fires,
 * so a buyer, seller and admin all see changes without refreshing.
 */
type Listener = { topics: Set<string>; run: () => void; timer?: number; stale?: boolean };

const listeners = new Set<Listener>();
let socket: Socket | null = null;
let hadConnection = false;

const JITTER_MS = 1200; // spreads re-reads so a burst of changes does not hit the API all at once

function fire(l: Listener) {
  if (document.visibilityState !== 'visible') { l.stale = true; return; }
  l.stale = false;
  if (l.timer) window.clearTimeout(l.timer);
  l.timer = window.setTimeout(() => { l.timer = undefined; try { l.run(); } catch { /* a screen's refetch must never break others */ } }, Math.random() * JITTER_MS);
}

function ensureSocket() {
  if (socket || typeof window === 'undefined') return;
  socket = io(`${API_BASE_URL}/realtime`, {
    // Signed in -> the server also puts this socket in its private rooms (own user / stores / admin). The token is
    // re-read on every (re)connect; guests simply send none and only hear public changes.
    auth: (cb) => cb({ token: getAuthCookie('accessToken') ?? undefined }),
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15_000,
  });
  socket.on('connect', () => {
    // After a drop, anything could have changed while we were away: everyone re-reads once.
    if (hadConnection) listeners.forEach(fire);
    hadConnection = true;
  });
  socket.on('changed', (msg: { topics?: string[] }) => {
    const topics = msg?.topics ?? [];
    // Short-lived request caches would otherwise hand the old answer straight back.
    if (topics.length) invalidateCache('');
    listeners.forEach(l => { if (topics.some(t => l.topics.has(t))) fire(l); });
  });
}

/** Sign-in / sign-out changes which rooms the server puts us in: reconnect with the new identity, then re-read once. */
function onAuthChange() {
  if (!socket) return;
  socket.disconnect();
  socket.connect();
}
if (typeof window !== 'undefined') {
  window.addEventListener('edudeen:auth-login', onAuthChange);
  window.addEventListener('edudeen:auth-logout', onAuthChange);
}

function onVisible() {
  if (document.visibilityState !== 'visible') return;
  listeners.forEach(l => { if (l.stale) fire(l); });
  if (socket && !socket.connected) socket.connect();
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);

// This browser's own recent writes (cart, wishlist): the echo of our own change must not overwrite a newer optimistic state.
const localWrites = new Map<string, number>();
export function noteLocalWrite(url: string | undefined, method: string | undefined) {
  if (!url || !method || method.toLowerCase() === 'get') return;
  const m = /\/api\/(cart|wishlist|children|premium)\b/.exec(url);
  if (m) localWrites.set(m[1], Date.now());
}
/** True when THIS browser wrote to `area` within the last `ms` (default 4 s). */
export function wroteRecently(area: 'cart' | 'wishlist' | 'children' | 'premium', ms = 4000): boolean {
  return Date.now() - (localWrites.get(area) ?? 0) < ms;
}

/** Calls `run` (debounced + jittered, only while the tab is visible) whenever one of `topics` changes. Returns an unsubscribe fn. */
export function subscribeLive(topics: readonly string[], run: () => void): () => void {
  const l: Listener = { topics: new Set(topics), run };
  listeners.add(l);
  ensureSocket();
  return () => {
    listeners.delete(l);
    if (l.timer) window.clearTimeout(l.timer);
    if (!listeners.size && socket) { socket.removeAllListeners(); socket.disconnect(); socket = null; hadConnection = false; }
  };
}
