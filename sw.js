const CACHE_NAME = 'plantcare-v4.0';
const urlsToCache = [
    '/plantcare/',
    '/plantcare/index.html',
    '/plantcare/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener('fetch', event => {
    // Ignoruj chrome-extension i inne nieobsługiwane schematy
    if (!event.request.url.startsWith('http')) return;
    // Ignoruj zewnętrzne API (Firebase, Gemini, Wikimedia)
    if (event.request.url.includes('firebasej') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('wikimedia.org')) return;

    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(fetchResponse => {
                if (fetchResponse && fetchResponse.status === 200 &&
                    event.request.url.startsWith('https://marcinchudaszek-cmd.github.io')) {
                    const responseClone = fetchResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
                }
                return fetchResponse;
            });
        }).catch(() => caches.match('/plantcare/index.html'))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(cacheNames.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
        )
    );
});
