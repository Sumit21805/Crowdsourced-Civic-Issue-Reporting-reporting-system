const CACHE_NAME = 'civicguard-v1';

// On install — cache nothing (we're always online on WiFi)
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// On activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Network first — always get fresh data from laptop server
// Falls back to cache only if completely offline
self.addEventListener('fetch', (event) => {
    // Don't intercept API calls or external requests (OSRM routing)
    const url = new URL(event.request.url);
    if (url.port === '5000' || url.hostname.includes('osrm') || url.hostname.includes('openstreetmap')) {
        return; // Let these pass through directly
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache a copy of static assets
                if (event.request.method === 'GET') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request)) // Offline fallback
    );
});
