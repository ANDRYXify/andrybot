// ABBRACCI, BACINI E IL BATTI IL CINQUE.
//
// Il cinque perfetto e' una questione di tempo: chi risponde al volo fa lo
// schiocco, chi risponde tardi un cinque moscio, e chi non risponde lascia
// l'altro con la mano alzata. Si prova con l'orologio finto. Il ragionamento
// sta in docs/COCCOLE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('coccole-');
const { streamers } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const C = await import('../../src/features/coccole.js');
const G = await import('../../src/features/giochi-conf.js');
test.after(() => casa.pulisci());

const T0 = Date.parse('2026-09-23T21:00:00Z');
function canale(ch, persone) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, {});
  for (const p of persone) games.segnaPresenza(ch, p);
}
function scena(ch) {
  const detti = [];
  const eventi = [];
  C.impostaSpinta((c, p) => eventi.push({ c, ...p }));
  const scrivi = (user, text) => games.tryGame({ channel: ch, user, text }, (t) => detti.push(t));
  return { detti, eventi, scrivi };
}

test('il cinque: al volo e\' perfetto, poi normale, poi moscio', () => {
  const c = G.valoriDi({}, 'cinque');
  assert.equal(C.livelloCinque(0.5, c), 'perfetto');
  assert.equal(C.livelloCinque(4, c), 'perfetto');
  assert.equal(C.livelloCinque(4.1, c), 'normale');
  assert.equal(C.livelloCinque(15, c), 'normale');
  assert.equal(C.livelloCinque(16, c), 'moscio');
  assert.equal(C.livelloCinque(10, { perfetto: 20, pronto: 5, scadenza: 30 }), 'perfetto', 'soglie storte non rompono l\'ordine');
});

for (const [attesa, livello, frase] of [[2000, 'perfetto', /cinque perfetto|SCHIOCCO PERFETTO|Tempismo perfetto/], [9000, 'normale', /battono il cinque|Cinque fra/], [20000, 'moscio', /moscio|in ritardo/]]) {
  test(`chi risponde dopo ${attesa / 1000}s fa un cinque ${livello}, e l'overlay lo sa`, (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
    const ch = 'c-' + livello;
    canale(ch, ['anna', 'bruno']);
    const s = scena(ch);
    s.scrivi('anna', '!cinque @bruno');
    assert.match(s.detti.at(-1), /anna alza la mano per @bruno/);
    t.mock.timers.tick(attesa);
    s.scrivi('bruno', '!cinque');
    assert.match(s.detti.at(-1), frase);
    assert.deepEqual(s.eventi.at(-1), { c: ch, tipo: 'cinque', a: 'anna', b: 'bruno', livello });
    assert.deepEqual(C.maniAlzate(ch), [], 'la mano battuta si abbassa');
    const detti = s.detti.length;
    t.mock.timers.tick(60_000);
    assert.equal(s.detti.length, detti, 'e la mano battuta non resta poi a mezz\'aria');
  });
}

test('chi non risponde lascia la mano alzata, e l\'overlay non fa niente', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('c-sospeso', ['anna', 'bruno']);
  const s = scena('c-sospeso');
  s.scrivi('anna', '!cinque @bruno');
  t.mock.timers.tick(29_999);
  assert.equal(C.maniAlzate('c-sospeso').length, 1);
  t.mock.timers.tick(1);
  assert.match(s.detti.at(-1), /anna resta con la mano alzata|mano di anna resta a mezz'aria/);
  assert.deepEqual(C.maniAlzate('c-sospeso'), []);
  assert.deepEqual(s.eventi, []);
});

test('la mano alzata per tutti la batte il primo; quella per qualcuno solo lui', () => {
  canale('c-tutti', ['anna', 'bruno', 'carla', 'dario']);
  const s = scena('c-tutti');
  s.scrivi('anna', '!cinque');
  assert.match(s.detti.at(-1), /chi batte il cinque/);
  s.scrivi('anna', '!cinque');
  assert.match(s.detti.at(-1), /hai già la mano alzata/, 'la propria mano non si batte');
  s.scrivi('carla', '!cinque');
  assert.equal(s.eventi.at(-1).b, 'carla');
  s.scrivi('bruno', '!cinque @dario');
  assert.deepEqual(C.maniAlzate('c-tutti'), [{ chi: 'bruno', per: 'dario' }]);
  s.scrivi('carla', '!cinque');
  assert.deepEqual(C.maniAlzate('c-tutti').map((m) => m.chi).sort(), ['bruno', 'carla'], 'la mano per dario non la batte carla: carla alza la sua');
  const eventi = s.eventi.length;
  s.scrivi('carla', '!cinque @bruno');
  assert.equal(s.eventi.length, eventi, 'nemmeno chiamandolo per nome');
  assert.deepEqual(C.maniAlzate('c-tutti').find((m) => m.chi === 'bruno'), { chi: 'bruno', per: 'dario' });
  s.scrivi('dario', '!cinque @bruno');
  assert.equal(s.eventi.at(-1).a, 'bruno');
  assert.equal(s.eventi.at(-1).b, 'dario');
});

test('dopo un cinque, la stessa persona rialza la mano solo dopo l\'attesa', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('c-attesa', ['anna', 'bruno']);
  const s = scena('c-attesa');
  s.scrivi('anna', '!cinque');
  s.scrivi('bruno', '!cinque');
  s.scrivi('anna', '!cinque');
  assert.deepEqual(C.maniAlzate('c-attesa'), [], 'cinque secondi fra due mani alzate');
  t.mock.timers.tick(5000);
  s.scrivi('anna', '!cinque');
  assert.deepEqual(C.maniAlzate('c-attesa'), [{ chi: 'anna', per: '' }]);
});

test('una mano rialzata dopo un cinque ha il suo mezzo minuto intero', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: T0 });
  canale('c-rialza', ['anna', 'bruno']);
  const s = scena('c-rialza');
  s.scrivi('anna', '!cinque');
  t.mock.timers.tick(2000);
  s.scrivi('bruno', '!cinque');
  t.mock.timers.tick(5000);
  s.scrivi('anna', '!cinque');
  t.mock.timers.tick(25_000);
  assert.equal(C.maniAlzate('c-rialza').length, 1, 'la mano di prima non abbassa questa');
  t.mock.timers.tick(5000);
  assert.deepEqual(C.maniAlzate('c-rialza'), []);
});

test('abbracci e bacini: a chi c\'e\', a tutta la chat, a se stessi', () => {
  canale('c-abb', ['anna', 'bruno']);
  const s = scena('c-abb');
  s.scrivi('anna', '!abbraccio @bruno');
  assert.ok(/anna/.test(s.detti.at(-1)) && /bruno/.test(s.detti.at(-1)));
  s.scrivi('bruno', '!bacio @fantasma');
  assert.match(s.detti.at(-1), /@fantasma non è in chat/);
  s.scrivi('bruno', '!abbraccio');
  assert.match(s.detti.at(-1), /bruno .*(tutta la chat|collettivo)/);
  const prima = s.detti.length;
  s.scrivi('bruno', '!abbraccio @anna');
  assert.equal(s.detti.length, prima, 'dieci secondi fra un abbraccio e l\'altro');
  s.scrivi('anna', '!bacio @anna');
  assert.match(s.detti.at(-1), /specchio/);
});

test('chi scrive !nococcole non riceve abbracci, bacini ne\' cinque, finche\' non lo riscrive', () => {
  canale('c-no', ['anna', 'bruno']);
  const s = scena('c-no');
  s.scrivi('bruno', '!nococcole');
  assert.match(s.detti.at(-1), /niente abbracci, bacini e cinque/);
  for (const cmd of ['!abbraccio @bruno', '!bacio @bruno', '!cinque @bruno']) {
    games.tryGame({ channel: 'c-no', user: 'anna' + cmd.length, text: cmd }, (t) => s.detti.push(t));
    assert.match(s.detti.at(-1), /preferisce niente coccole/, cmd);
  }
  s.scrivi('bruno', '!nococcole');
  assert.match(s.detti.at(-1), /coccole di nuovo accese/);
  s.scrivi('anna', '!abbraccio @bruno');
  assert.ok(/bruno/.test(s.detti.at(-1)) && !/preferisce/.test(s.detti.at(-1)));
});

test('l\'overlay sa fare il cinque, e lo schiocco c\'e\'', () => {
  const OV = readFileSync(new URL('../../src/web/public/overlay-app.js', import.meta.url), 'utf8');
  const HTML = readFileSync(new URL('../../src/web/public/overlay.html', import.meta.url), 'utf8');
  const PR = readFileSync(new URL('../../src/web/public/presets.js', import.meta.url), 'utf8');
  assert.match(OV, /dati\.tipo === 'cinque'\) \{ if \(mostra\('effetti'\)\) cinque\(dati\); \}/);
  assert.match(HTML, /<div id="cinque"><\/div>/);
  for (const l of ['perfetto', 'normale', 'moscio']) assert.match(HTML, new RegExp(`\\.cinque-${l}`), l);
  assert.match(PR, /schiocco: +\(c, d, t\) =>/);
  assert.match(PR, /schioccoPerfetto: \(c, d, t\) =>/);
  assert.match(HTML, /prefers-reduced-motion[\s\S]*cinque-mano/, 'chi chiede meno movimento vede il cinque fermo');
  for (const k of ['cinque-lampo', 'cinque-onda', 'cinque-scintilla']) assert.match(HTML, new RegExp(`animation: ${k} [^;]*forwards;`), `${k}: prima del contatto non si vede`);
  assert.equal((HTML.match(/top: var\(--contatto-y\)/g) || []).length, 3, 'lampo, onda e scintille partono dal punto di contatto');
});
