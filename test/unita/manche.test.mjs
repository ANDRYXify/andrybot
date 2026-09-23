// LE MANCHE: ogni tipo si puo' vincere, e quelle con lo stato non parlano
// sopra la chat.
//
// docs/GIOCHI.md prometteva un collaudo delle manche che non esisteva. Qui c'e',
// per tutti e dieci i tipi: la soluzione deve vincere, il conto deve essere
// giusto, il piu' o meno si risolve in sette tentativi, l'impiccato perde al
// sesto errore, e gli indizi escono al piu' uno ogni quattro secondi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('manche-');
const { streamers, points } = await import('../../src/db.js');
const games = await import('../../src/features/games.js');
const G = await import('../../src/features/giochi-conf.js');
test.after(() => casa.pulisci());

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
function canale(ch, giochiConf = {}) {
  streamers.upsertApproved(ch, ch);
  streamers.setSettings(ch, { giochiConf });
}
let seme = 11;
const caso = () => { seme = (seme * 1103515245 + 12345) % 2147483648; return seme / 2147483648; };

test('il catalogo e il motore conoscono gli stessi tipi di manche', () => {
  assert.deepEqual([...G.MANCHE_TIPI.map(([id]) => id)].sort(), [...games.TIPI_COSTRUTTORI].sort());
});

test('ogni tipo di manche si puo\' vincere con la sua soluzione', () => {
  canale('m1');
  for (const tipo of games.TIPI_COSTRUTTORI) {
    for (let i = 0; i < 30; i++) {
      const r = games.costruisciManche('m1', tipo);
      if (tipo === 'domanda') { assert.equal(r, null, 'la domanda tua senza materiale non esiste'); break; }
      assert.ok(r, `${tipo} non si costruisce`);
      const esito = games.esitoManche(r, norm(r.soluzione), r.soluzione);
      assert.ok(esito?.vince, `${tipo}: «${r.soluzione}» non vince`);
    }
  }
});

test('il calcolo veloce fa i conti giusti, e mai sotto zero', () => {
  for (let i = 0; i < 500; i++) {
    const r = games.roundCalcolo('x', caso);
    const conto = r.annuncio.match(/quanto fa (.+)\?/)[1].replace(/×/g, '*').replace(/−/g, '-');
    const vero = Function(`return (${conto});`)();
    assert.equal(r.soluzione, String(vero), conto);
    assert.ok(vero >= 0, conto);
    assert.ok(games.esitoManche(r, `fa ${vero}`, '')?.vince, 'il numero dentro una frase vale');
    assert.equal(games.esitoManche(r, String(vero + 1), ''), null);
  }
});

test('il rebus di serie: ogni risposta vince, anche dentro una frase', () => {
  for (const [emoji, risposte] of games.BANCA_REBUS) {
    assert.ok(emoji && risposte.length);
    for (const a of risposte) assert.ok(norm(a), `${emoji}: risposta vuota`);
  }
  canale('m2');
  const r = games.roundRebus('m2');
  assert.ok(games.esitoManche(r, norm(`e ${r.soluzione} ovvio`), '')?.vince);
});

test('piu\' o meno: stringendo l\'intervallo si vince in sette tentativi al massimo', () => {
  for (let giro = 0; giro < 200; giro++) {
    const r = games.roundPiuOMeno('x', caso);
    let [basso, alto] = [1, 100];
    let tentativi = 0;
    for (;;) {
      const g = Math.floor((basso + alto) / 2);
      tentativi++;
      if (games.esitoManche(r, String(g), '')?.vince) break;
      [basso, alto] = r.intervallo();
      assert.ok(tentativi < 8, 'la chat ha sempre abbastanza indizi');
    }
    assert.ok(tentativi <= 7);
  }
});

test('l\'impiccato: vince chi completa, perde al sesto errore, le ripetizioni non contano', () => {
  const r = games.roundImpiccato('x', () => 0);
  const parola = norm(r.soluzione);
  const lettere = [...new Set(parola)];
  for (const c of lettere.slice(0, -1)) assert.equal(games.esitoManche(r, c, ''), null);
  assert.equal(games.esitoManche(r, lettere[0], ''), null, 'una lettera gia\' presa non fa niente');
  assert.ok(games.esitoManche(r, lettere.at(-1), '')?.vince, 'chi scopre l\'ultima lettera vince');

  const s = games.roundImpiccato('x', () => 0);
  const sbagliate = 'qwxyzjkh'.split('').filter((c) => !parola.includes(c));
  for (const c of sbagliate.slice(0, games.ERRORI_IMPICCATO - 1)) assert.equal(games.esitoManche(s, c, ''), null);
  assert.equal(games.esitoManche(s, sbagliate[0], ''), null, 'lo stesso errore due volte e\' un errore solo');
  const fine = games.esitoManche(s, sbagliate[games.ERRORI_IMPICCATO - 1], '');
  assert.ok(fine?.chiudi);
  assert.match(fine.dire, new RegExp(r.soluzione));
  const t = games.roundImpiccato('x', () => 0);
  assert.ok(games.esitoManche(t, parola, '')?.vince, 'la parola intera vince subito');
  assert.equal(games.esitoManche(t, 'ciao a tutti', ''), null, 'le chiacchiere non contano');
});

test('in chat: gli indizi escono al massimo uno ogni quattro secondi, e chi vince prende il premio', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.parse('2026-09-23T21:00:00Z') });
  canale('m3', { manche: { premio: 40 } });
  const detti = [];
  const say = (x) => detti.push(x);
  assert.equal(games.avviaManche('m3', say, 'piuomeno'), true);
  const n = Number(games.mancheInCorso('m3').soluzione);
  const tentativi = Array.from({ length: 100 }, (_, i) => i + 1).filter((g) => g !== n).filter((_, i) => i % 9 === 0).slice(0, 10);
  for (const g of tentativi) games.tryGame({ channel: 'm3', user: 'u' + g, text: String(g) }, say);
  const prima = detti.length;
  t.mock.timers.tick(3999);
  assert.equal(detti.length, prima, 'prima dei quattro secondi, niente');
  t.mock.timers.tick(1);
  assert.equal(detti.length, prima + 1, 'dieci tentativi, un indizio solo');
  assert.match(detti.at(-1), /Il numero è fra \d+ e \d+/);
  t.mock.timers.tick(10_000);
  assert.equal(detti.length, prima + 1, 'e se nessuno scrive, non si ripete');
  const [basso, alto] = detti.at(-1).match(/fra (\d+) e (\d+)/).slice(1).map(Number);
  let vinto = false;
  for (let g = basso; g <= alto && !vinto; g++) {
    games.tryGame({ channel: 'm3', user: 'vince', text: String(g) }, say);
    vinto = /Esatto vince/.test(detti.at(-1));
  }
  assert.ok(vinto);
  assert.equal(points.get('m3', 'vince'), 40, 'il premio delle regole delle manche');
  t.mock.timers.tick(200_000);
  assert.ok(!detti.some((x) => /Tempo scaduto/.test(x)), 'una manche vinta non scade');
});

test('il giro delle manche automatiche e\' quello scelto; col nome parte anche fuori dal giro', () => {
  canale('m4', { manche: { tipi: ['calcolo'] } });
  const detti = [];
  for (let i = 0; i < 5; i++) {
    assert.equal(games.avviaManche('m4', (x) => detti.push(x)), true);
    assert.match(detti.at(-1), /CALCOLO VELOCE/);
    games.tryGame({ channel: 'm4', user: 'x', text: games.mancheInCorso('m4').soluzione }, (x) => detti.push(x));
    assert.equal(games.mancheInCorso('m4'), null, 'vinta, chiusa');
  }
  games.tryGame({ channel: 'm4', user: 'mod', text: '!manche boh' }, (x) => detti.push(x));
  assert.match(detti.at(-1), /Non conosco questa manche. Ci sono: .*impiccato/, 'un nome sbagliato si dice, non si tira a caso');
  assert.equal(games.mancheInCorso('m4'), null);
  games.tryGame({ channel: 'm4', user: 'mod', text: '!manche impiccato' }, (x) => detti.push(x));
  assert.match(detti.at(-1), /IMPICCATO/);
  assert.equal(games.tipoMancheDa('più o meno'), 'piuomeno');
  assert.equal(games.tipoMancheDa('boh'), null);
  assert.deepEqual(G.normalizzaConf({}, { manche: { tipi: [] } }), { manche: {} }, 'un giro vuoto non passa: per spegnere c\'e\' l\'interruttore');
  assert.deepEqual(G.normalizzaConf({}, { manche: { tipi: ['rebus', 'inventato', 'rebus'] } }).manche.tipi, ['rebus']);
});
