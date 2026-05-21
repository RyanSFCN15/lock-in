/* ============================================================
   LOCK IN — Service Worker
   Full offline caching, cache-first strategy
   ============================================================ */

const CACHE_NAME = 'lock-in-v4';

// Use relative paths so the SW works on both localhost and GitHub Pages subdirectory
const BASE = self.location.pathname.replace(/sw\.js$/, '');

const PRECACHE_ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'css/main.css',
  BASE + 'js/db.js',
  BASE + 'js/ai.js',
  BASE + 'js/app.js',
  BASE + 'js/onboarding.js',
  BASE + 'js/gamification.js',
  BASE + 'js/dashboard.js',
  BASE + 'js/workout.js',
  BASE + 'js/nutrition.js',
  BASE + 'js/cardio.js',
  BASE + 'js/recovery.js',
  BASE + 'js/measurements.js',
  BASE + 'js/stats.js',
  BASE + 'js/settings.js',
  BASE + 'icons/icon.svg',
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// ---- Install: precache all assets ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' }))).catch(err => {
        console.warn('SW: Some assets failed to precache:', err);
        // Cache what we can individually
        return Promise.all(
          PRECACHE_ASSETS.map(url =>
            cache.add(url).catch(e => console.warn('SW: Failed to cache:', url, e))
          )
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// ---- Activate: clean old caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// ---- Fetch: cache-first for assets, network-first for API calls ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // AI/API calls — network only (no caching)
  if (
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.hostname.includes('localhost') ||
    url.hostname.includes('openfoodfacts.org')
  ) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ error: 'Offline' }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // CDN assets — cache-first
  if (url.hostname.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return res;
        }).catch(() => cached || new Response('', { status: 503 }));
      })
    );
    return;
  }

  // JS and CSS — NETWORK FIRST so code changes always load immediately.
  // Falls back to cache when offline.
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return res;
      }).catch(() => caches.match(request).then(cached => cached || new Response('', { status: 503 })))
    );
    return;
  }

  // HTML and other app assets — network-first with cache fallback
  event.respondWith(
    fetch(request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
      }
      return res;
    }).catch(() =>
      caches.match(request).then(cached => {
        if (cached) return cached;
        if (request.destination === 'document') return caches.match(BASE + 'index.html');
        return new Response('', { status: 503 });
      })
    )
  );
});

// ---- Push notifications (future) ----
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Lock In';
  const options = {
    body: data.body || 'Time to lock in.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
