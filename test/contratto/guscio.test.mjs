// Il patto fra il cancello e le pagine pubbliche.
//
// Una pagina servita senza sessione non è un file solo: senza i suoi script non
// funziona, e il 404 non si vede da nessuna parte perché è la risposta giusta
// per tutto il resto del sito. È già successo: il giorno in cui gli script in
// linea sono diventati file (per togliere 'unsafe-inline' dalla CSP), dieci
// file nuovi sono nati chiusi. La home restava sotto il velo di caricamento,
// l'overlay in OBS bianco, l'invito ai moderatori e lo sblocco con passkey
// morti — e il sito rispondeva 200 a tutte le pagine.
//
// Qui si legge dai sorgenti quali pagine il server dichiara pubbliche, si
// guarda cosa chiedono, e si chiede al cancello se quelle richieste passano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { creaGuscio } from '../../src/web/vetrina.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = join(RAD, 'src/web/public');
const SRV = readFileSync(join(RAD, 'src/web/server.js'), 'utf8');

// Le pagine pubbliche non si elencano qui: si leggono da chi le serve.
const PAGINE = [...SRV.matchAll(/guscio\.pagina\('([^']+)'\)/g)].map((m) => m[1]);

const guscio = creaGuscio(PUB);
for (const p of PAGINE) guscio.pagina(p);

// Lettura VOLUTAMENTE più larga di quella del modulo: accetta apici singoli,
// doppi e nessun apice. Se il modulo si lasciasse sfuggire un modo di scrivere
// un `src`, qui la differenza salta fuori.
const RIF = /(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

test('il server dichiara pagine pubbliche, e sono file veri', () => {
  assert.ok(PAGINE.length >= 8, `pagine dichiarate: ${PAGINE.length}`);
  assert.ok(PAGINE.includes('index.html'), 'la vetrina è fra le pagine pubbliche');
  for (const p of PAGINE) assert.ok(existsSync(join(PUB, p)), `${p} esiste`);
});

test('tutto quello che una pagina pubblica chiede, il cancello lo apre', () => {
  const chiusi = [];
  for (const p of PAGINE) {
    const html = readFileSync(join(PUB, p), 'utf8');
    for (const m of html.matchAll(RIF)) {
      const grezzo = (m[1] ?? m[2] ?? m[3] ?? '').trim();
      if (!grezzo || grezzo.startsWith('#') || grezzo.startsWith('//')) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(grezzo)) continue;
      const via = new URL(grezzo, 'http://x/' + p).pathname;
      if (!existsSync(join(PUB, via))) continue;         // rotte e nomi finti: non sono file
      if (!guscio.aperto(via)) chiusi.push(`${via} (chiesto da ${p})`);
    }
  }
  assert.deepEqual(chiusi, [], 'nessun file chiesto da una pagina pubblica resta chiuso');
});

// Gli script che si caricano da soli non compaiono in nessun `src`: l'overlay
// tracking chiede i suoi moduli a mano, e il service worker precarica il guscio.
test('anche quello che gli script chiedono da sé è aperto', () => {
  for (const via of ['/tracking-fx.js', '/tracking-fx-gl.js', '/tracking-poses.js', '/tracking-games.js',
    '/vendor/pixi.min.js', '/sw.js', '/manifest.webmanifest', '/icons/icon-192.png']) {
    assert.ok(guscio.aperto(via), `${via} aperto`);
  }
});

// I dieci file nati chiusi il giorno della CSP, uno per uno.
test('gli script tirati fuori dalle pagine sono aperti', () => {
  for (const via of ['/cookie.js', '/splash.js', '/tema.js', '/mod.js', '/sblocca.js', '/tgapp.js',
    '/overlay-app.js', '/tracking-play.js', '/tracking-detector.js', '/tracking-detector-conf.js']) {
    assert.ok(guscio.aperto(via), `${via} aperto`);
  }
});

test('security.txt si legge senza sessione, come vuole la RFC 9116', () => {
  assert.ok(guscio.aperto('/.well-known/security.txt'));
  assert.equal(guscio.aperto('/well-known/security.txt'), false, 'ma non per la via di servizio');
});

test('il resto del sito resta chiuso', () => {
  for (const via of ['/voce.html', '/voce.js', '/api/streamer/punti', '/api/streamer/classifica',
    '/api/admin/streamers', '/api/studio/stato', '/backup.sqlite', '/style.css.map']) {
    assert.equal(guscio.aperto(via), false, `${via} chiuso`);
  }
});

test('un riferimento non può portare fuori dalla cartella pubblica', () => {
  const radice = mkdtempSync(join(tmpdir(), 'guscio-'));
  const pub = join(radice, 'public');
  mkdirSync(pub);
  writeFileSync(join(radice, 'segreto.js'), '//');
  writeFileSync(join(pub, 'buono.js'), '//');
  writeFileSync(join(pub, 'p.html'), '<script src="../segreto.js"></script><script src="buono.js"></script>');
  const g = creaGuscio(pub);
  g.pagina('p.html');
  assert.deepEqual(g.elenco(), ['/buono.js', '/p.html']);
});
