const CACHE = 'chore-chart-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap',
];

// Install: cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache local assets reliably; best-effort for external fonts
      const local = ASSETS.filter(a => !a.startsWith('http'));
      const external = ASSETS.filter(a => a.startsWith('http'));
      return cache.addAll(local).then(() =>
        Promise.allSettled(external.map(url =>
          fetch(url).then(r => cache.put(url, r)).catch(() => {})
        ))
      );
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for local, network-first for fonts
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first for Google Fonts (they version themselves)
  if (url.hostname.includes('googleapis.com') || url.hostname.includes('gstatic.com')) {
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else (app works fully offline)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
      if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
      return r;
    }))
  );
});
