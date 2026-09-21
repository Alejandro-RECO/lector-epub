/**
 * sw.js - Service Worker for Lumina EPUB
 * Network-first for HTML updates, Stale-while-revalidate for assets
 */

const CACHE_NAME = 'lumina-epub-cache-v3';

// Install: Skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
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
    })
  );
});

// Activate: Claim clients and delete older caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  if (request.url.startsWith('blob:') || request.url.startsWith('data:')) {
    return;
  }

  // 1. Network-First for Navigation (HTML) so code updates are received immediately
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          const scope = self.registration.scope;
          return caches.match(scope + 'index.html') || caches.match(scope);
        })
    );
    return;
  }

  // 2. Cache-First with Network Revalidation for static assets
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
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
