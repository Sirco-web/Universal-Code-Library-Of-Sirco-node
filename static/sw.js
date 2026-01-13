const CACHE_NAME = 'site-offline-cache-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response && response.status === 200 && response.type === 'basic') {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (e) {
        return cached || Response.error();
      }
    })
  );
});
