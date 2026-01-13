const CACHE_NAME = 'soundboard-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Only handle GET requests
  if (request.method !== 'GET') return;
  
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Try matching without query strings
        const url = new URL(request.url);
        url.search = '';
        return cache.match(url.href).then(matchedResponse => {
          if (matchedResponse) {
            return matchedResponse;
          }
          
          // Not in cache, try network
          return fetch(request).then(networkResponse => {
            // Cache the response for future use
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Network failed and not in cache
            console.error('Offline and not cached:', request.url);
            return new Response('Offline - resource not cached', { status: 503 });
          });
        });
      });
    })
  );
});
