const CACHE_NAME = 'lovepulse-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/screenshots/wide-screenshot.png',
    '/screenshots/narrow-screenshot.png'
];

self.addEventListener('install', event => {
    console.log('Service Worker: Установка...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Кэширование файлов...');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Ошибка при кэшировании:', error);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('Service Worker: Найден кэш для:', event.request.url);
                    return response;
                }
                console.log('Service Worker: Запрос сети для:', event.request.url);
                return fetch(event.request)
                    .catch(error => {
                        console.error('Service Worker: Ошибка при запросе:', error);
                    });
            })
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Активация...');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('Service Worker: Удаление старого кэша:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});