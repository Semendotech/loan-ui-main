const fs = require('fs');
const path = require('path');

const version = `loan-manager-cache-v${new Date().toISOString().replace(/[:.]/g, '-')}`;
const swPath = path.join(__dirname, '..', 'public', 'sw.js');

const content = `// Service Worker for PWA
const CACHE_VERSION = '${version}';
const CACHE_NAME = 'loan-manager-cache-' + CACHE_VERSION;
const urlsToCache = [
  '/',
  '/dashboard',
  '/login',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const isNavigationRequest = (request) => {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
};

const isNextStaticAsset = (url) => {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/image/');
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never intercept cross-origin requests (backend API calls)
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.method !== 'GET') {
    return;
  }

  const networkOrCache = () =>
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || Response.error();
      });

  if (isNavigationRequest(request)) {
    event.respondWith(networkOrCache());
    return;
  }

  if (isNextStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(networkOrCache());
});
`;

fs.writeFileSync(swPath, content, 'utf8');
console.log(`Generated ${swPath} with version ${version}`);
