/* ============================================================
   LOCK IN — Service Worker
   Full offline caching, cache-first strategy
   ============================================================ */

const CACHE_NAME = 'lock-in-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/main.css',
  '/js/db.js',
  '/js/ai.js',
  '/js/app.js',
  '/js/onboarding.js',
  '/js/gamification.js',
  '/js/dashboard.js',
  '/js/workout.js',
  '/js/nutrition.js',
  '/js/cardio.js',
  '/js/recovery.js',
  '/js/measurements.js',
  '/js/stats.js',
  '/js/settings.js',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
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

  // App assets — cache-first, then network, then offline page
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        // Stale-while-revalidate for HTML
        if (request.destination === 'document') {
          fetch(request).then(res => {
            if (res.ok) {
              caches.open(CACHE_NAME).then(cache => cache.put(request, res));
            }
          }).catch(() => {});
        }
        return cached;
      }

      return fetch(request).then(res => {
        if (!res.ok) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return res;
      }).catch(() => {
        // Offline fallback
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 503 });
      });
    })
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
