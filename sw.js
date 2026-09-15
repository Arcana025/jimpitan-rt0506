const CACHE_NAME = 'jimpitan-rt0506-pwa-v7';

const APP_SHELL = [
  './',
  './manifest.json',
  './config.js'
];

// ================================
// INSTALL
// ================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ================================
// ACTIVATE
// ================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// ================================
// FETCH
// ================================
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Hanya GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // ==========================================
  // HTML / HALAMAN UTAMA
  // NETWORK FIRST
  // ==========================================
  //
  // index.html selalu mencoba mengambil versi
  // terbaru dari GitHub Pages terlebih dahulu.
  //
  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname.endsWith('/index.html')
  ) {
    event.respondWith(
      fetch(request, {
        cache: 'no-store'
      })
        .then((response) => {
          if (!response || !response.ok) {
            throw new Error('Network response not OK');
          }

          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cached) => {
              if (cached) {
                return cached;
              }

              return caches.match('./')
                .then((fallback) => fallback);
            });
        })
    );

    return;
  }

  // ==========================================
  // FILE LAIN
  // CACHE FIRST
  // ==========================================
  //
  // Asset seperti manifest/config tetap dapat
  // digunakan saat offline.
  //
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {

            if (
              networkResponse &&
              networkResponse.ok &&
              url.origin === self.location.origin
            ) {
              const responseToCache = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }

            return networkResponse;
          });
      })
  );
});
