/* Edudeen service worker: minimal offline shell.
 * It caches ONLY /offline.html. It never caches API calls, other origins, non-GET requests or pages,
 * so prices, carts, orders and logins are always live. Pages are network-first; if the network is
 * down a navigation falls back to the offline page. */
const CACHE = 'edudeen-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.mode !== 'navigate') return; // everything else goes straight to the network
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io')) return;
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
});
