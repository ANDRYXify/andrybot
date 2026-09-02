// Cancello del SERVICE WORKER.
//
// L'invariante: il service worker si occupa del guscio di QUESTO sito. Le
// richieste verso altri domini non lo riguardano e devono passare dritte al
// browser.
//
// Non e' una preferenza di stile, e' l'unico modo per non rompere le immagini
// esterne. Un service worker eredita il CSP della risposta che gli ha
// consegnato il proprio script (per noi: quello del Caddyfile, con
// `connect-src 'self'`), e una fetch() dentro un worker passa da `connect-src`.
// Un <img> verso un altro dominio e' invece permesso da `img-src https:`.
// Se il service worker rifa' quella richiesta con fetch(), la trasforma da
// "immagine" in "connessione" e il CSP la uccide: l'immagine risulta rotta,
// senza errori in pagina. E' successo davvero, a tutte le emote 7TV insieme.
//
// Il confronto qui sotto NON e' scritto a mano: si ricava dal Caddyfile. Se un
// domani `connect-src` diventasse largo quanto `img-src`, la richiesta cadrebbe
// da sola.
//
// Uso: node scripts/verifica-service-worker.mjs   (esce 1 se qualcosa non torna)

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '..');
const caddy = readFileSync(join(RAD, 'Caddyfile'), 'utf8');
const sw = readFileSync(join(RAD, 'src/web/public/sw.js'), 'utf8');

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

// ---- le politiche scritte nel Caddyfile ----------------------------------
const politiche = [...caddy.matchAll(/Content-Security-Policy\s+"([^"]+)"/g)].map((m) => {
  const d = {};
  for (const pezzo of m[1].split(';')) {
    const [nome, ...fonti] = pezzo.trim().split(/\s+/);
    if (nome) d[nome] = fonti;
  }
  return d;
});
dice(politiche.length > 0, `politiche CSP lette dal Caddyfile: ${politiche.length}`);

// ---- dove `img-src` e' piu' largo di `connect-src`, il worker deve tacere --
// (le fonti di img che connect non ha: sono esattamente quelle che il worker
// non potrebbe ri-chiedere)
const strette = politiche.filter((p) => {
  const img = new Set(p['img-src'] || p['default-src'] || []);
  const conn = new Set(p['connect-src'] || p['default-src'] || []);
  return [...img].some((f) => f !== "'self'" && f !== 'data:' && f !== 'blob:' && !conn.has(f));
});
dice(true, `politiche in cui un'immagine puo' andare dove una fetch non puo': ${strette.length}`);

if (strette.length) {
  const gestore = sw.slice(sw.indexOf("addEventListener('fetch'"));
  dice(/url\.origin\s*!==\s*self\.location\.origin\)\s*return;/.test(gestore),
    'il service worker lascia passare gli altri domini senza toccarli');
  const posizioneUscita = gestore.search(/url\.origin\s*!==\s*self\.location\.origin/);
  const primoRespond = gestore.indexOf('respondWith');
  dice(posizioneUscita >= 0 && posizioneUscita < primoRespond,
    'lo fa PRIMA di rispondere, non dopo');
}

// ---- la rete viene prima, sempre ----------------------------------------
// Una copia locale che vince sulla rete e' una copia che invecchia e non muore
// piu'. Il guscio (icone e manifest) era servito "prima dalla cache", e il nome
// della cache non cambiava mai: dopo il logo nuovo, chi era gia' passato dal
// sito continuava a vedere il robottino viola nella linguetta e nell'app
// installata — con il file nuovo li' sul server, e nessun errore da nessuna
// parte. Gli header dicono gia' `max-age=0` con ETag: la rete costa una
// revalidation, non un download.
//
// Quindi: si parte SEMPRE da fetch(). La copia salvata serve solo quando la
// rete non c'e', e si aggiorna con quello che la rete ha appena dato.
{
  const gestore = sw.slice(sw.indexOf("addEventListener('fetch'"));
  const corpi = [...gestore.matchAll(/respondWith\(([\s\S]*?)\);\n/g)].map((m) => m[1].trim());
  dice(corpi.length > 0, `risposte che il worker costruisce: ${corpi.length}`);
  for (const c of corpi) {
    dice(c.startsWith('fetch('), 'si parte dalla rete, la copia locale e\' solo il paracadute', c.slice(0, 70));
  }
  dice(/caches\.open\([^)]*\)\.then\([^)]*\.put\(/.test(gestore) || /\.put\(req/.test(gestore),
    'e la copia si aggiorna con quello che la rete ha dato');
}

// ---- mai rispondere con qualcosa che puo' essere undefined ---------------
// respondWith(undefined) non e' "lascio fare al browser": e' un errore di rete.
for (const m of sw.matchAll(/respondWith\(([\s\S]*?)\);\n/g)) {
  const corpo = m[1];
  const rischio = /caches\.match\([^)]*\)\s*\)?\s*$/.test(corpo.trim())
    || (/caches\.match/.test(corpo) && !/\|\||hit \|\||Response\.error/.test(corpo));
  dice(!rischio, 'nessun respondWith che possa risolvere in undefined', corpo.trim().slice(0, 70));
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length ? `\n${rossi.length} cose non tornano.` : '\nIl service worker sta al suo posto. ✓');
process.exit(rossi.length ? 1 : 0);
