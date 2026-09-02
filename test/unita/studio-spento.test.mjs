// Lo Studio Web e' SPENTO finche' non funziona davvero.
//
// Il motore c'e' ed e' completo, ma la funzione non e' mai arrivata al punto di
// funzionare per chi la usa. Finche' e' cosi' non si promette e non si offre —
// e non basta nasconderla nel pannello: se non c'e', il SERVER deve rifiutare,
// altrimenti resta raggiungibile da chi chiama la rotta a mano.
//
// Questa prova guarda la cosa da cui dipende tutto il resto: l'interruttore, e
// che il prodotto non prometta a parole una cosa che ha spento nei fatti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-studio-');
const { config } = await import('../../src/config.js');

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');

test('di suo e\' spento: si accende solo dicendolo apposta', () => {
  assert.equal(config.studioAttivo, false, 'senza STUDIO_WEB=1 resta spento');
});

test('tutte le rotte dello Studio passano dall\'interruttore', () => {
  const s = leggi('src/web/server.js');
  const rotte = [...s.matchAll(/app\.(get|post)\('\/api\/studio[^']*',([^)]*)/g)];
  assert.ok(rotte.length >= 4, `rotte trovate: ${rotte.length}`);
  for (const r of rotte) {
    assert.match(r[2], /studioAcceso/, `la rotta ${r[0].slice(0, 46)}… non passa dall'interruttore`);
  }
});

test('e l\'interruttore viene prima del gate del piano', () => {
  // Altrimenti chi non paga si sentirebbe dire "passa a un piano superiore" per
  // una cosa che non esiste a nessun prezzo.
  const s = leggi('src/web/server.js');
  for (const r of s.matchAll(/app\.(?:get|post)\('\/api\/studio[^']*',([^)]*)/g)) {
    const i = r[1].indexOf('studioAcceso'), j = r[1].indexOf('gStudio');
    assert.ok(i >= 0 && (j < 0 || i < j), 'prima l\'interruttore, poi il piano');
  }
});

test('la vetrina non promette una diretta dal browser', () => {
  for (const f of ['src/web/public/index.html', 'scripts/og.mjs']) {
    const s = leggi(f);
    assert.ok(!/dal browser|from the browser|desde el navegador/.test(s),
      `${f} promette ancora la diretta dal browser`);
  }
});

test('nemmeno le descrizioni che finiscono nei motori di ricerca', () => {
  const s = leggi('src/web/server.js');
  for (const m of s.matchAll(/(?:ogDesc|twDesc|description): '([^']*)'/g)) {
    assert.ok(!/dal browser|from the browser|desde el navegador/.test(m[1]),
      `una descrizione la promette ancora: ${m[1].slice(0, 70)}…`);
  }
});

// La stream key e' la chiave con cui si trasmette sul canale: chiederla per una
// funzione spenta e' chiedere un potere che non si usa.
test('con lo Studio spento non si chiede la chiave di trasmissione', async () => {
  const { SCOPES } = await import('../../src/config.js');
  assert.equal(SCOPES.broadcaster.includes('channel:read:stream_key'), false);
});

test('e il permesso segue l\'interruttore, invece di essere tolto a mano', () => {
  const s = leggi('src/config.js');
  assert.match(s, /STUDIO_WEB.*channel:read:stream_key/s,
    'il permesso deve dipendere dall\'interruttore, cosi\' torna da solo quando lo Studio si accende');
});

test.after(() => usaEGetta.pulisci());
