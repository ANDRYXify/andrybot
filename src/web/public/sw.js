// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


const CACHE = 'socialbot-v2';
const SHELL = ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/marchio-barra.png', '/manifest.webmanifest'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;

  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/overlay/')) return;

  const nelGuscio = SHELL.includes(url.pathname);

  ev.respondWith(fetch(req).then((r) => {
    if (nelGuscio && r.ok) {
      const copia = r.clone();
      ev.waitUntil(caches.open(CACHE).then((c) => c.put(req, copia)));
    }
    return r;
  }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || Response.error()));
});
