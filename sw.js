// Service Worker cơ bản cho AR Monster (Widescreen Landscape)
const CACHE_NAME = 'ar-monster-v4.0-landscape';
const urlsToCache = [
    './index.html',
    './manifest.json',
    './pwa_tma.js',
    './carnival.js',
    './gacha.js',
    './ar_share.js',
    './bag.js',
    './expedition.js',
    './zone_forest.webp',
    './zone_volcano.webp',
    './zone_swamp.webp',
    './zone_ice.webp',
    './zone_desert.webp'
];

// Sự kiện cài đặt
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Sự kiện kích hoạt & dọn dẹp cache cũ
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Sự kiện fetch (chạy mạng trước, nếu lỗi mới lấy cache)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});