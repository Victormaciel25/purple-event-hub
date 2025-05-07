const CACHE_NAME = 'iparty-cache-v1';
const CACHE_URLS = [
  '/index.html',
  '/'
];

// Installation event - cache basic app files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(CACHE_URLS);
      })
  );
});

// Fetch event - cache images on first request
self.addEventListener('fetch', (event) => {
  // Check if the request is for an image
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          // Return from cache if available
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Otherwise fetch, then cache
          return fetch(event.request).then((networkResponse) => {
            // Clone the response as it can only be used once
            const responseToCache = networkResponse.clone();
            
            // Add to cache
            cache.put(event.request, responseToCache);
            
            return networkResponse;
          });
        });
      })
    );
  } else {
    // For non-image requests, use standard fetch strategy
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
