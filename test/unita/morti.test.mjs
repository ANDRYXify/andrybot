// LE MORTI CONTATE DA SOLE: la regola, provata senza OBS e senza giocare.
//
// La schermata di morte di un gioco e' sempre la stessa immagine. Gliela fai
// vedere una volta e da li' in poi si riconosce. Qui si tiene ferma la parte che
// decide: l'impronta, quanto due impronte sono lontane, e — la cosa che conta
// davvero — QUANDO una morte e' una morte nuova.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

// il file e' uno script da browser: eseguirlo qui e' il modo di provare quello
// che gira davvero, invece di una copia scritta per la prova
globalThis.window = globalThis;
await import(pathToFileURL(join(process.cwd(), 'src/web/public/morti.js')).href);
const M = globalThis.SB_MORTI;

const grigia = (v) => new Array(M.LARGA * M.ALTA).fill(v);
// una schermata «vera»: chiari e scuri mischiati, cosi' i confronti dentro la
// riga non vengono tutti uguali. Un gradiente pulito darebbe la stessa impronta
// di un muro grigio — ed e' esattamente l'errore che la prima versione di questa
// prova faceva, dicendo verde a un confronto che non confrontava niente.
const schermata = (seme = 37) => {
  const a = [];
  for (let i = 0; i < M.LARGA * M.ALTA; i++) a.push((i * seme) % 251);
  return a;
};

test('l\'impronta e\' 64 bit, sempre, e la stessa immagine da la stessa impronta', () => {
  const f = M.impronta(schermata());
  assert.equal(f.length, 16, '16 cifre esadecimali = 64 bit');
  assert.equal(M.impronta(schermata()), f, 'due volte la stessa immagine, la stessa impronta');
  assert.equal(M.impronta([1, 2, 3]), '', 'un\'immagine che non c\'e\' non da un\'impronta finta');
});

test('due immagini diverse hanno impronte lontane, la stessa immagine distanza zero', () => {
  const a = M.impronta(schermata());
  const b = M.impronta(schermata().slice().reverse());
  assert.equal(M.distanza(a, a), 0);
  assert.ok(M.distanza(a, b) > M.SOGLIA, `due schermate diverse devono stare oltre la soglia (erano ${M.distanza(a, b)})`);
});

test('un\'impronta che non c\'e\' e\' lontanissima, non vicinissima', () => {
  const a = M.impronta(schermata());
  assert.equal(M.distanza(a, ''), 64, 'il vuoto non deve somigliare a niente');
  assert.equal(M.distanza('', ''), 64);
  assert.equal(M.distanza(a, 'zz'), 64, 'e nemmeno la spazzatura');
  assert.equal(M.distanza(a, 'zzzzzzzzzzzzzzzz'), 64, 'nemmeno se e\' lunga giusta');
});

test('un pixel diverso non e\' un\'altra schermata', () => {
  const uno = schermata();
  const due = schermata(); due[40] = uno[40] + 1;
  const d = M.distanza(M.impronta(uno), M.impronta(due));
  assert.ok(d <= M.SOGLIA, `un pixel di differenza deve restare dentro la soglia (era ${d})`);
});

test('fra le schermate insegnate vince la piu\' vicina', () => {
  const a = M.impronta(schermata());
  const firme = [{ nome: 'lontana', firme: [M.impronta(grigia(5))] }, { nome: 'giusta', firme: ['0000000000000000', a] }];
  const t = M.vicina(firme, a);
  assert.equal(t.quale.nome, 'giusta');
  assert.equal(t.distanza, 0);
  assert.equal(M.vicina(firme, 'ffffffffffffffff'), null, 'se nessuna combacia, nessuna vince');
  assert.equal(M.vicina([], a), null);
});

// LA COSA CHE CONTA. La schermata di morte resta su per secondi: contare a ogni
// sguardo vorrebbe dire dieci morti per una. Si conta all'ENTRATA.
test('una morte si conta all\'entrata, non mentre sei morto', () => {
  let s = {};
  let r = M.guarda(s, { dentro: true, ora: 1000 });
  assert.equal(r.conta, true, 'la prima volta che compare, e\' una morte');
  s = r.stato;
  for (const t of [1100, 1200, 5000, 9000]) {
    r = M.guarda(s, { dentro: true, ora: t });
    assert.equal(r.conta, false, `a ${t} eri ancora sulla stessa schermata`);
    s = r.stato;
  }
});

test('per contarne un\'altra bisogna prima uscire, e aspettare il riarmo', () => {
  let s = M.guarda({}, { dentro: true, ora: 1000 }).stato;
  s = M.guarda(s, { dentro: false, ora: 2000 }).stato;      // sei tornato in gioco
  const subito = M.guarda(s, { dentro: true, ora: 2500 });  // ...dopo un secondo e mezzo
  assert.equal(subito.conta, false, 'due morti in un secondo e mezzo sono uno sfarfallio, non due morti');
  const dopo = M.guarda(s, { dentro: true, ora: 1000 + M.RIARMO_MS + 1 });
  assert.equal(dopo.conta, true, 'passato il riarmo, e\' una morte nuova');
});

test('restare fuori non conta niente, e non perde la memoria', () => {
  let s = M.guarda({}, { dentro: true, ora: 1000 }).stato;
  for (const t of [2000, 3000, 4000]) {
    const r = M.guarda(s, { dentro: false, ora: t });
    assert.equal(r.conta, false);
    assert.equal(r.stato.ultima, 1000, 'l\'ultima morte resta quella');
    s = r.stato;
  }
});
