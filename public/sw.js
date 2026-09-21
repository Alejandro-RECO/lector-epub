/**
 * sw.js - Service Worker for Lumina EPUB
 * Compatible with root domain and subdirectories (e.g. GitHub Pages)
 */

const CACHE_NAME = 'lumina-epub-cache-v2';

// Install: Cache essential shell
self.addEventListener('install', (event) => {
  const scope = self.registration.scope;
  const assetsToPrecache = [
    scope,
    scope + 'index.html',
    scope + 'manifest.json',
    scope + 'icon.svg'
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToPrecache).catch((err) => {
        console.warn('Precache note:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-while-revalidate strategy with offline fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignore non-GET requests and chrome-extension / non-http schemas
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Never cache IndexedDB or internal blobs
  if (request.url.startsWith('blob:') || request.url.startsWith('data:')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and navigating, return cached index
          if (request.mode === 'navigate') {
            const scope = self.registration.scope;
            return caches.match(scope + 'index.html') || caches.match(scope);
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
