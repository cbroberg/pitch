// Minimal service worker for Pitch Vault (F018.3).
// Goal: installability + a resilient shell. Data/API is never intercepted;
// images/fonts are cache-first; HTML/JS/CSS are network-first (so dev + deploys
// stay fresh) with a cache fallback for offline.
//
// SW_BUILD is stamped to a unique token per deploy by scripts/stamp-sw.cjs so a
// new build ships a byte-changed sw.js → the browser installs it into "waiting"
// and the in-app update banner can offer it (F021). Update is USER-gated: we do
// NOT skipWaiting on install; the page posts SKIP_WAITING when the user taps.
const SW_BUILD = 'dev';
const CACHE = 'pitch-vault-' + SW_BUILD;
const SHELL = [
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
  // No skipWaiting() here: a new SW stays "waiting" until the user taps Update,
  // so we never surprise-reload the app mid-use.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

// The update banner posts this when the user taps Update; activating the waiting
// SW fires controllerchange, which the page uses to reload exactly once.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // never intercept API/auth/data

  // Images + fonts: cache-first (rarely change).
  if (/\.(png|svg|jpg|jpeg|webp|ico|gif|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // HTML / JS / CSS: network-first, cache fallback (offline shell).
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (request.mode === 'navigate') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((c) => c || caches.match('/'))),
  );
});
