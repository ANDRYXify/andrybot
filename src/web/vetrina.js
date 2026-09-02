// Chi passa senza sessione: le rotte aperte e il guscio delle pagine pubbliche.
//
// Il sito è un labirinto: senza sessione il server risponde 404 a tutto, tranne
// alle poche pagine che devono essere visibili (la vetrina, privacy e termini,
// l'ingresso dei moderatori, l'overlay per la diretta) e alle rotte che si
// proteggono da sole (una chiave, una firma, uno `state` monouso). Una pagina
// però non è un file solo: si porta dietro i suoi script, i suoi fogli di
// stile, i suoi caratteri. Se anche uno solo di quelli resta chiuso, la pagina
// si apre e non funziona — e nessun errore lo dice, perché il 404 è la risposta
// giusta per tutto il resto.
//
// La decisione sta tutta qui, in una funzione pura (`aperto`), invece che in una
// catena di `||` dentro un middleware: così si può metterla alla prova un caso
// per volta, senza tirare su mezzo server.
//
// Finora l'elenco di quei file era scritto a mano. Ha già fallito due volte, e
// per costruzione non poteva fare altro: chi divide un file in due, o rinomina
// uno script, non ha nessun motivo per ricordarsi di un elenco che sta in un
// altro file, mille righe più in là. L'ultima volta erano /tema.js, /splash.js
// e /cookie.js: la home restava sotto il velo di caricamento per sempre, perché
// lo script che lo toglie non arrivava.
//
// Qui l'elenco non si scrive: si RICAVA. Chi serve una pagina senza sessione la
// dichiara nel punto stesso in cui la serve — `guscio.pagina('index.html')` —
// e da lì si segue quello che la pagina chiede: gli `src` e gli `href`
// dell'HTML, gli `url()` dei CSS, i percorsi scritti negli script (il service
// worker precarica il suo guscio così, e l'overlay tracking carica i suoi
// moduli a mano). Ricorsivamente, finché non si aggiunge più niente.
//
// Due limiti voluti:
//  · le CARTELLE pubbliche per intero (icone e librerie vendorizzate) non si
//    esplorano: sono già aperte, e human.js pesa megabyte;
//  · dagli script NON si seguono le pagine .html. Una pagina è una rotta con un
//    suo controllo d'accesso, e la decide chi la serve: /voce.html è nominata
//    dalla dashboard ma resta dietro il login, dove deve stare.
import { readFileSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

// Cartelle statiche aperte per intero: niente di segreto e servono a tutti
// (le icone anche ai crawler e al manifest, le librerie agli overlay).
export const CARTELLE = ['/icons/', '/vendor/'];

// Rotte aperte senza sessione. Non sono file: sono ingressi che si proteggono
// da soli (una firma, una chiave, uno `state` monouso) o che devono essere
// leggibili da chiunque. I file delle pagine NON stanno qui: li ricava il
// guscio da chi le serve.
const ROTTE = new Set([
  '/health',                                  // sonda di Caddy e di Docker
  '/', '/entra',                              // la vetrina e il pass monouso dal sito madre
  '/sblocca',                                 // rientro con passkey
  '/privacy', '/termini', '/terms',
  '/mod', '/auth/mod', '/auth/callback',      // invito e login dei moderatori delegati
  '/robots.txt', '/sitemap.xml', '/llms.txt', // SEO: i motori devono poterli leggere
  '/.well-known/security.txt',                // RFC 9116: dove scrivere se trovi un buco
  '/accedi', '/stripe/webhook',               // abbonamenti self-service (webhook a firma verificata)
  '/spotify/callback', '/tiktok/callback',    // ritorni OAuth: si proteggono con lo `state`
  '/tgapp', '/api/tgapp/auth',                // Telegram Mini App: initData firmato dal bot token
  '/api/tgapp/oidc/start', '/telegram/oidc/callback',
  '/api/me',                                  // senza sessione risponde soltanto "nessun utente"
  '/guide', '/novita',                        // guide e novità: contenuto pubblico, indicizzabile
  '/api/novita',                              // le stesse novità, per la scheda in cima al pannello
  '/api/streamer-verify',                     // API JSON della link-page (proxy verso Vercel)
]);

// Famiglie di rotte aperte, ognuna con la propria protezione.
const PREFISSI = [
  '/api/abbonamento/',   // piani, checkout, portale: autenticazione propria
  '/overlay/', '/o/',    // overlay della diretta (chiave ?key=) e link "belli"
  '/tracking/',          // overlay tracking in OBS: stessa chiave del canale
  '/api/tracking/',      // gesti e voce dell'overlay tracking (chiave overlay)
  '/guide/',             // le singole guide
  '/u/',                 // link-page pubblica dello streamer, servita dal DB
  '/assets/',            // bundle JS/CSS della link-page (proxy verso Vercel)
  '/api/ext/',           // ingresso esterno: chiave API del canale nell'Authorization
  '/tg/',                // webhook Telegram: il segreto sta nel percorso
  '/api/passkey/login/', // sblocco con passkey: serve prima di avere una sessione
];

const RIF_HTML = /(?:src|href)\s*=\s*["']([^"']+)["']/g;
const RIF_CSS = /url\(\s*['"]?([^'")\s]+)/g;
const RIF_TESTO = /['"`](\/[A-Za-z0-9_@.\/-]+\.[A-Za-z0-9]{2,5})['"`]/g;

// Come si leggono i riferimenti, per tipo di file. Quello che non è qui dentro
// (immagini, caratteri, wasm) è una foglia: si serve, non si esplora.
const LETTORI = {
  '.html': RIF_HTML,
  '.css': RIF_CSS,
  '.js': RIF_TESTO,
  '.mjs': RIF_TESTO,
  '.json': RIF_TESTO,
  '.webmanifest': RIF_TESTO,
};

export function creaGuscio(publicDir) {
  const pubblici = new Set();
  const esplorati = new Set();

  // Un riferimento diventa un file pubblico solo se punta al nostro dominio E se
  // quel file esiste davvero. Così le rotte (/entra, /privacy, /guide/...), le
  // ancore e i domini altrui cadono da soli, senza elenchi. I riferimenti
  // relativi si risolvono da dove sta la pagina, come fa il browser: index.html
  // chiede "app.js" e sta in cima, quindi è /app.js.
  const risolvi = (rif, da) => {
    const grezzo = String(rif).trim();
    if (!grezzo || grezzo.startsWith('#') || grezzo.startsWith('//')) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(grezzo)) return null;    // http:, data:, mailto:
    let via;
    try { via = new URL(grezzo, 'http://guscio' + da).pathname; } catch { return null; }
    const dentro = normalize(join(publicDir, via));
    if (!dentro.startsWith(publicDir + '/')) return null;   // niente ../ fuori dal recinto
    try { if (!statSync(dentro).isFile()) return null; } catch { return null; }
    return { via, file: dentro };
  };

  const esplora = (via, file) => {
    if (esplorati.has(file)) return;
    esplorati.add(file);
    const lettore = LETTORI[extname(via).toLowerCase()];
    if (!lettore) return;
    const daScript = lettore === RIF_TESTO;
    let testo;
    try { testo = readFileSync(file, 'utf8'); } catch { return; }
    for (const m of testo.matchAll(lettore)) {
      const rif = m[1];
      // dagli script non si seguono le pagine: le pagine le dichiara chi le serve
      if (daScript && rif.split('?')[0].endsWith('.html')) continue;
      const t = risolvi(rif, via);
      if (!t) continue;
      if (CARTELLE.some((c) => t.via.startsWith(c))) continue;   // già aperte, e grosse
      pubblici.add(t.via);
      esplora(t.via, t.file);
    }
  };

  return {
    // «Questa pagina la servo senza sessione»: la dichiara chi la serve, e in
    // cambio riceve il percorso del file da mandare. Una riga sola, nel punto
    // in cui l'informazione è vera.
    pagina(nome) {
      const file = join(publicDir, nome);
      pubblici.add('/' + nome);
      esplora('/' + nome, file);
      return file;
    },
    // il guscio: i file che le pagine pubbliche si portano dietro
    contiene: (via) => pubblici.has(via) || CARTELLE.some((c) => via.startsWith(c)),
    // la domanda del cancello: questa richiesta passa anche senza sessione?
    aperto: (via) => ROTTE.has(via) || pubblici.has(via)
      || CARTELLE.some((c) => via.startsWith(c))
      || PREFISSI.some((c) => via.startsWith(c)),
    elenco: () => [...pubblici].sort(),
    rotte: () => [...ROTTE].sort(),
  };
}
