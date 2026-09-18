// LE DUE COPIE DELLA STESSA REGOLA DEVONO DIRE LA STESSA COSA.
//
// La distanza fra due impronte esiste in due posti: nel browser, perche' mentre
// giochi non puo' passare dal server, e sul server, perche' per cercare in
// libreria mandare l'intera libreria al browser sarebbe peggio.
//
// Due copie sono un posto in cui divergere. Qui non ci si fida della disciplina:
// le stesse coppie passano da tutte e due e devono dare lo stesso numero. Se
// domani una cambia e l'altra no, questo diventa rosso — e un riconoscimento che
// non combacia con la ricerca vorrebbe dire prendere dalla libreria schede che poi
// non ti prendono niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-dist-');
const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
globalThis.window = globalThis;
await import(pathToFileURL(join(RAD, 'src/web/public/morti.js')).href);
const browser = globalThis.window.SB_MORTI;
const server = await import('../../src/features/morti-libreria.js');

const ESA = '0123456789abcdef';
// Coppie fatte apposta, non a caso: il caso proverebbe sempre le stesse cose.
const COPPIE = [
  ['0000000000000000', '0000000000000000'],
  ['0000000000000000', 'ffffffffffffffff'],
  ['a5c3966a5a3c69a5', 'a5c3966a5a3c69a5'],
  ['a5c3966a5a3c69a5', 'a5c3966a5a3c69a4'],
  ['a5c3966a5a3c69a5', '5a3c69a5a5c3966a'],
  ['0f0f0f0f0f0f0f0f', 'f0f0f0f0f0f0f0f0'],
  ['abc', 'abc'],
  ['', 'a5c3966a5a3c69a5'],
  ['zzzzzzzzzzzzzzzz', 'a5c3966a5a3c69a5'],
  ['a5c3966a5a3c69a5', 'a5c3'],
];
for (let i = 0; i < 64; i++) {
  let a = '', b = '';
  for (let k = 0; k < 16; k++) { a += ESA[(i * 7 + k * 3) % 16]; b += ESA[(i * 11 + k * 5) % 16]; }
  COPPIE.push([a, b]);
}

test('la distanza del browser e quella del server sono la stessa distanza', () => {
  for (const [a, b] of COPPIE) {
    assert.equal(server.distanza(a, b), browser.distanza(a, b), `${a} · ${b}`);
  }
});

test('e cercare in libreria trova quello che il browser riconoscerebbe', () => {
  const uno = 'a5c3966a5a3c69a5';
  const quasi = 'a5c3966a5a3c69a4';
  const schede = [{ id: 'x', firme: ['0f0f0f0f0f0f0f0f'] }, { id: 'y', firme: ['5a3c69a5a5c3966a', uno] }];
  const s = server.piuVicina(schede, quasi, 8);
  const b = browser.vicina(schede.map((k) => ({ ...k })), quasi, 8);
  assert.equal(s.scheda.id, 'y');
  assert.equal(b.quale.id, 'y', 'la stessa scheda vince da tutte e due le parti');
  assert.equal(s.distanza, b.distanza);
  assert.equal(server.piuVicina(schede, 'ffffffffffffffff', 8), null);
});

// IL RITAGLIO. Serve a togliere di mezzo la proporzione del monitor: senza, la
// stessa scena da' impronte diverse a chi ha il 21:9 e a chi ha il 16:9, e una
// libreria condivisa non avrebbe senso.
test('del monitor si tiene il 16:9 centrale, qualunque monitor sia', () => {
  const r = browser.ritaglio;
  assert.deepEqual(r(1920, 1080), { x: 0, y: 0, w: 1920, h: 1080 }, 'un 16:9 non si tocca');
  const ultra = r(2560, 1080);
  assert.equal(ultra.h, 1080, 'da un 21:9 si tiene tutta l\'altezza');
  assert.equal(ultra.w, 1920);
  assert.equal(ultra.x, 320, 'e si taglia in mezzo, non da un lato');
  assert.equal(ultra.x * 2 + ultra.w, 2560, 'quello che si toglie e\' uguale a destra e a sinistra');
  const quattroTre = r(1024, 768);
  assert.equal(quattroTre.w, 1024, 'da un 4:3 si tiene tutta la larghezza');
  assert.equal(quattroTre.h, 576);
  assert.equal(quattroTre.y * 2 + quattroTre.h, 768, 'e si toglie uguale sopra e sotto');
  assert.deepEqual(r(0, 0), { x: 0, y: 0, w: 0, h: 0 });
  assert.deepEqual(r(null, 'ciao'), { x: 0, y: 0, w: 0, h: 0 });
  void usaEGetta;
});
