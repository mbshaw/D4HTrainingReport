// D4H Training Report Generator - Service Worker
// Implements cache-first strategy for offline support

const CACHE_NAME = 'd4h-reports-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  './index.html',
  './style.css',
  './script.js',
  './config.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// CDN dependencies to cache
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing and caching assets...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS)
        .then(() => {
          console.log('[Service Worker] Caching CDN dependencies');
          // Cache CDN assets separately - ignore failures
          return Promise.all(
            CDN_ASSETS.map(asset =>
              cache.add(asset).catch(() => {
                console.warn(`[Service Worker] Failed to cache: ${asset}`);
              })
            )
          );
        });
    })
  );
  // Force the waiting service worker to become active immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - cache-first strategy
// 1. Check if request is in cache
// 2. If yes, return cached version
// 3. If no, fetch from network
// 4. Cache successful GET requests
// 5. Return network response or error
self.addEventListener('fetch', (event) => {
  // Handle GET requests only
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version
        console.log('[Service Worker] Serving from cache:', event.request.url);
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          // Only cache successful responses
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            // Clone the response before caching (response can only be consumed once)
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
              console.log('[Service Worker] Cached:', event.request.url);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          // Network request failed
          console.error('[Service Worker] Fetch failed:', event.request.url, error);

          // Return cached version if available (network fallback already checked)
          // Or return offline page/response
          throw error;
        });
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data.action === 'clearCache') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[Service Worker] Cache cleared');
    });
  }
});
