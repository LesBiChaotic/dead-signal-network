const CACHE_NAME = 'dsn-shell-v3';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './assets/css/styles.css', './assets/js/app.js',
  './assets/images/dsn-mark.svg', './assets/images/dsn-icons.svg',
  './assets/images/dsn-app-192.png', './assets/images/dsn-app-512.png', './assets/images/dsn-maskable-512.png', './assets/images/dsn-touch-180.png',
  './assets/data/cases.json', './assets/data/case-files.json', './assets/data/feed.json',
  './assets/data/members.json', './assets/data/profile-seeds.json', './assets/data/member-system.json', './assets/data/member-files.json',
  './assets/data/community-network.json', './assets/data/evidence-lab.json', './assets/data/signal-map.json', './assets/data/private-network.json', './assets/data/story-progression.json', './assets/data/archive.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => {
    const fresh = fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
