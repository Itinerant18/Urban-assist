// Service worker for the Urban Assist provider PWA.
//
// Deliberately narrow. The previous version was cache-first for every
// same-origin GET, which on an authenticated SSR app means serving a stale — and
// potentially another session's — HTML document. It was never registered, which
// is the only reason that never shipped.
//
// Rules:
//   • Static, content-hashed assets  → cache-first (safe: the URL changes when
//     the content does).
//   • Everything else (documents, RSC payloads, /api)  → network only. No
//     caching of anything that can carry personal data.
// Dev is the one case where /_next/static/ URLs are NOT content-hashed: `next dev`
// serves chunks at stable paths, so cache-first pins the pre-edit client bundle
// while the document stays fresh — hydration mismatches that survive a hard reload.
const DEV = ['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname);
const CACHE = 'urban-assist-provider-v3';
const STATIC_PREFIXES = ['/_next/static/', '/images/', '/icon-', '/urban-assist.svg'];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isStatic(url) {
  return STATIC_PREFIXES.some((p) => url.pathname.startsWith(p));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (DEV || url.origin !== self.location.origin || !isStatic(url)) return; // straight to network

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
