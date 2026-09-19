// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


const CACHE = 'socialbot-v5';
const ETERNI = 'socialbot-eterni-v1';
const DA_TENERE = ['/icons/icon-192.png', '/icons/icon-512.png',
  '/icons/marchio-barra.png', '/icons/logo-barra.png', '/manifest.webmanifest'];
const SHELL = DA_TENERE.slice();

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(DA_TENERE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then((chiavi) => Promise.all(chiavi.filter((k) => k !== CACHE && k !== ETERNI).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function eterno(ev, url) {
  const c = await caches.open(ETERNI);
  const avuta = await c.match(ev.request);
  if (avuta) return avuta;
  const r = await fetch(ev.request);
  if (r.ok) {
    ev.waitUntil((async () => {
      await c.put(ev.request, r.clone());
      const senzaVersione = url.origin + url.pathname;
      for (const vecchia of await c.keys()) {
        const u = new URL(vecchia.url);
        if (u.origin + u.pathname === senzaVersione && vecchia.url !== ev.request.url) await c.delete(vecchia);
      }
    })());
  }
  return r;
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;

  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/overlay/')) return;

  if (url.searchParams.get('v') && /\.(js|css|png|svg|webp|ico)$/.test(url.pathname)) {
    ev.respondWith(eterno(ev, url).catch(async () => (await caches.match(ev.request)) || Response.error()));
    return;
  }

  const nelGuscio = SHELL.includes(url.pathname);

  ev.respondWith(fetch(req).then((r) => {
    if (nelGuscio && r.ok) {
      const copia = r.clone();
      ev.waitUntil(caches.open(CACHE).then((c) => c.put(req, copia)));
    }
    return r;
  }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || Response.error()));
});
