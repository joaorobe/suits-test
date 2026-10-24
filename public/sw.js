const CACHE_NAME = "suits-pwa-v5";
const PRECACHE_URLS = ["/offline", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png", "/maskable-icon-512.png", "/apple-touch-icon.png", "/logo.png", "/terno1.jpg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('suits-pwa-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline')));
    return;
  }
  if (event.request.headers.has('rsc') || url.searchParams.has('_rsc')) return;
  const isStatic = url.pathname.startsWith('/_next/static/') || PRECACHE_URLS.includes(url.pathname);
  if (!isStatic) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy))); }
    return response;
  })));
});
