// LA VETRINA NON PAGA IL CONTO DEL PANNELLO.
//
// Due gusci dallo stesso `index.html`: quello di chi legge e quello di chi
// lavora. La regola che tiene e' l'elenco CORTO — la vetrina si porta dietro
// solo quello che nomina, e tutto il resto e' del pannello per definizione.
// Un elenco di cose da togliere avrebbe lo stesso difetto di sempre: chi
// aggiunge uno script domani non ha nessun motivo per ricordarsene.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  guscioVetrina, guscioPannello, vetrinaHtml, RISORSE_VETRINA, SCRIPT_VETRINA, SOLO_VETRINA,
} from '../../src/web/vetrina-vista.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = join(RAD, 'src/web/public');
const GUSCIO = readFileSync(join(PUB, 'index.html'), 'utf8');

const PIANI = {
  free: { id: 'free', nome: 'Essenziale', prezzo: 0 },
  base: { id: 'base', nome: 'Base', prezzo: 2.99, sommario: 'il canone' },
  addon: [
    { id: 'clip', nome: 'Clip', prezzo: 1.99, sommario: 'le clip' },
    { id: 'voce', nome: 'Voce', prezzo: 0.99, sommario: 'la voce' },
  ],
  bundle: [{ id: 'tutto', nome: 'Tutto', addon: ['clip', 'voce'], prezzo: 1.99, prezzoPieno: 2.98, sconto: 0.33 }],
};

const scripts = (h) => [...h.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1].split('?')[0].replace(/^\.?\//, ''));
const fogli = (h) => [...h.matchAll(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)]
  .map((t) => (/\bhref="([^"]+)"/.exec(t) || [])[1]).filter(Boolean).map((v) => v.split('?')[0].replace(/^\.?\//, ''));

test('la vetrina si porta dietro solo quello che nomina', () => {
  const h = guscioVetrina(GUSCIO, 'it', { kick: true, piani: PIANI });
  const ammessi = new Set(RISORSE_VETRINA.map((v) => v.replace(/^\.?\//, '')));
  for (const s of scripts(h)) assert.ok(ammessi.has(s), `script di troppo nella vetrina: ${s}`);
  for (const f of fogli(h)) assert.ok(ammessi.has(f), `foglio di stile di troppo nella vetrina: ${f}`);
});

test('e quel che nomina c\'e\' davvero', () => {
  const h = guscioVetrina(GUSCIO, 'it', { kick: true, piani: PIANI });
  const dentro = new Set([...scripts(h), ...fogli(h)]);
  for (const v of RISORSE_VETRINA) {
    const nudo = v.replace(/^\.?\//, '');
    assert.ok(existsSync(join(PUB, nudo)), `${nudo} non esiste in public/`);
    assert.ok(dentro.has(nudo), `${nudo} e' nell'elenco ma non nel guscio`);
  }
});

test('app.js e il suo contorno restano fuori dalla vetrina', () => {
  const h = guscioVetrina(GUSCIO, 'it', { kick: true, piani: PIANI });
  for (const fuori of ['app.js', 'cerca.js', 'plancia.js', 'pilota.js', 'mente3d.js', 'overlay-skin.css']) {
    assert.ok(!h.includes(`"${fuori}"`), `${fuori} e' rimasto nella vetrina`);
  }
});

test('la vetrina dichiara la larghezza giusta gia\' nel primo HTML', () => {
  assert.match(guscioVetrina(GUSCIO, 'it', { piani: PIANI }), /<body class="vetrina">/);
});

test('un guscio senza roba del pannello e\' un filtro che non ha filtrato niente', () => {
  const magro = GUSCIO.replace(/<script\b[^>]*\bsrc="(?!tema\.js|\/tema\.js)[^"]+"[^>]*>\s*<\/script>/g, '')
    .replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/g, '');
  assert.throws(() => guscioVetrina(magro, 'it', { piani: PIANI }), /nessuna risorsa del pannello/);
});

test('il pannello perde quel che e\' solo della vetrina, e si accorge se non c\'e\'', () => {
  const p = guscioPannello(GUSCIO);
  assert.ok(!p.includes('vetrina-app.js'), 'lo script della vetrina non ha niente da agganciare, li\'');
  assert.ok(!p.includes('anime-vetrina.css'), 'e le copie nemmeno: quelle regole il pannello ce le ha in anime.css');
  assert.ok(p.includes('app.js') && p.includes('anime.css'), 'il resto resta');
  assert.throws(() => guscioPannello(p), /non trovo/);
});

test('la vetrina porta le copie al posto di anime.css, non tutte e due', () => {
  const h = guscioVetrina(GUSCIO, 'it', { piani: PIANI });
  assert.ok(h.includes('anime-vetrina.css'), 'le copie ci sono');
  assert.ok(!h.includes('"anime.css"'), 'e il file intero no');
  // Nello STESSO PUNTO della catena in cui stava anime.css: se le copie
  // finissero dopo vetrina.css si sovrascriverebbero cose che prima vincevano,
  // e la pagina cambierebbe senza che nessuno abbia cambiato una regola.
  assert.ok(h.indexOf('anime-vetrina.css') < h.indexOf('vetrina.css'), 'e stanno prima di vetrina.css, come stava anime.css');
});

test('index.html nomina tutto quel che e\' solo della vetrina, sennò il cancello lo chiude fuori', () => {
  // Le porte pubbliche si RICAVANO da index.html: un file che la vetrina carica
  // ma che li' dentro non e' nominato resterebbe chiuso, e la pagina si
  // aprirebbe a meta' senza che nessun errore lo dica.
  for (const riga of SOLO_VETRINA) assert.ok(GUSCIO.includes(riga), riga);
  assert.ok(SOLO_VETRINA.includes(SCRIPT_VETRINA));
});

test('il listino lo disegna il server: prezzi, pacchetti e configuratore', () => {
  const h = vetrinaHtml('it', { piani: PIANI });
  assert.match(h, /id="vetrina-piani"/);
  assert.match(h, /€2,99/);
  assert.match(h, /data-pacco="tutto"/);
  assert.match(h, /value="clip"/);
  assert.match(h, /value="voce"/);
  assert.ok(!h.includes('id="vetrina-piani"></div>'), 'il buco vuoto non deve tornare');
});

test('senza listino la sezione dei prezzi non resta aperta a vuoto', () => {
  const h = vetrinaHtml('it', {});
  assert.ok(!h.includes('id="vetrina-piani"'));
  assert.match(h, /id="listino"/);
});

test('il conto che rifa\' il browser ha tutti i prezzi e tutte le frasi', () => {
  const h = vetrinaHtml('it', { piani: PIANI });
  const m = /data-conto="([^"]+)"/.exec(h);
  assert.ok(m, 'manca data-conto');
  const d = JSON.parse(m[1].replaceAll('&quot;', '"').replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'));
  assert.equal(d.base, 2.99);
  assert.equal(d.prezzi.clip, 1.99);
  assert.equal(d.prezzi.voce, 0.99);
  assert.deepEqual(d.bundle[0].addon, ['clip', 'voce']);
  for (const chiave of ['uno', 'tanti', 'conta', 'niente', 'risparmio']) {
    assert.ok(d.testi[chiave], `manca la frase «${chiave}»`);
  }
  assert.match(d.testi.conta, /\{n\}/);
  assert.match(d.testi.risparmio, /\{nome\}/);
});

test('gli avvisi di ritorno da Twitch e da Stripe viaggiano nella lingua del guscio', () => {
  const m = /data-avvisi="([^"]+)"/.exec(vetrinaHtml('es', { piani: PIANI }));
  assert.ok(m);
  const d = JSON.parse(m[1].replaceAll('&quot;', '"').replaceAll('&#39;', "'"));
  assert.match(d.errore.state, /Sesi/);
  assert.match(d.annullato, /Pago cancelado/);
  assert.ok(d.errore['account-diverso'] && d.pagato && d.attesa && d.senzaPagamento && d.altro);
});

test('il pannello non disegna piu\' la vetrina: una sola mano, la sua', () => {
  const app = readFileSync(join(PUB, 'app.js'), 'utf8');
  assert.ok(!app.includes('caricaPiani'), 'app.js disegna ancora il listino');
  assert.ok(!app.includes('function renderHero'), 'app.js disegna ancora la home');
});
