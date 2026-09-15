const CACHE_NAME = 'jimpitan-rt0506-pwa-v5';
const APP_SHELL = [
  './', './index.html', './manifest.json', './config.js', './sw.js',
  './icons/icon-192.png', './icons/icon-512.png'
];
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
];

async function cacheBestEffort(cache, url) {
  try {
    const res = await fetch(url, { mode: 'no-cors', cache: 'no-cache' });
    if (res) await cache.put(url, res);
  } catch (_) {}
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async url => {
      try { await cache.add(url); } catch (_) {}
    }));
    // Simpan library eksternal setelah instalasi; kegagalan salah satu CDN tidak membatalkan instalasi PWA.
    await Promise.all(EXTERNAL_ASSETS.map(url => cacheBestEffort(cache, url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      // Untuk navigasi/app shell, cache-first menjaga aplikasi tetap terbuka offline.
      // Untuk resource lain, cache cukup sebagai fallback.
      if (url.origin === location.origin || EXTERNAL_ASSETS.some(x => x === req.url)) return cached;
    }
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (_) {
      return cached || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
