// Service worker minimale di SocialBot: serve solo a rendere la dashboard
// "installabile" come app e a dare un guscio di base offline. NON mette in
// cache le API né i dati (che devono essere sempre freschi e autenticati):
// mette in cache soltanto pochi file statici del guscio.
const CACHE = 'socialbot-v1';
const SHELL = ['/icons/icon-192.png', '/icons/icon-512.png', '/manifest.webmanifest'];

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
  // solo GET: mai toccare POST/DELETE (login, salvataggi, passkey…)
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // le API e tutto ciò che è autenticato vanno SEMPRE in rete (mai cache)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/overlay/')) return;
  // guscio statico: prima la cache, poi la rete (e aggiorna la cache)
  if (SHELL.includes(url.pathname)) {
    ev.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    return;
  }
  // tutto il resto: rete, con fallback alla cache se offline
  ev.respondWith(fetch(req).catch(() => caches.match(req)));
});
