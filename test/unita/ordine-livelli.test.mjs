// L'ORDINE DEI LIVELLI (docs/OVERLAY.md, «L'ordine dei livelli»).
//
// Una funzione sola, letta dalla tela e dalla pagina dell'overlay. Quello che
// deve restare vero: di serie e' l'ordine che la diretta aveva gia'; l'ordine
// salvato si rispetta; e un elemento che l'ordine salvato non nomina finisce
// allo stesso posto qualunque altro elemento ci sia o manchi, perche' in onda
// non tutti sono disegnati mentre sulla tela si.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const finestra = {};
vm.runInNewContext(readFileSync(new URL('../../src/web/public/riquadro.js', import.meta.url), 'utf8'), { window: finestra, document: {} });
const R = finestra.SB_RIQUADRO;
const ordina = (chiavi, salvato) => [...R.ordine(chiavi, salvato)];

const TUTTI = ['alert', 'chat', 'wf', 'ws', 'goal:g1', 'goal:g2', 'cont:morti', 'cart:c1', 'musica', 'timer', 'treno', 'bit', 'pen', 'boss', 'scritta', 'etichetta', 'muro', 'effetti'];

test('di serie e\' l\'ordine che la diretta aveva: il muro in fondo, poi effetti e testi, gli angoli, e davanti boss, alert e contatori', () => {
  assert.deepEqual(ordina(TUTTI, []), ['muro', 'effetti', 'pen', 'etichetta', 'scritta', 'chat', 'wf', 'ws', 'goal:g1', 'goal:g2', 'cart:c1', 'musica', 'timer', 'treno', 'bit', 'boss', 'alert', 'cont:morti']);
});

test('l\'ordine salvato si rispetta, senza doppioni e senza chiavi che non ci sono', () => {
  const salvato = ['alert', 'muro', 'chat', 'alert', 'nessuno', 'boss'];
  const o = ordina(['chat', 'boss', 'alert', 'muro'], salvato);
  assert.deepEqual(o, ['alert', 'muro', 'chat', 'boss']);
});

test('e\' sempre una permutazione delle chiavi date', () => {
  const salvato = ['boss', 'goal:g2', 'muro', 'chat'];
  const o = ordina(TUTTI, salvato);
  assert.equal(o.length, TUTTI.length);
  assert.deepEqual([...o].sort(), [...TUTTI].sort());
});

test('chi non e\' nell\'ordine salvato finisce allo stesso posto sulla tela e in onda, qualunque altro manchi', () => {
  const salvati = [[], ['alert', 'muro'], ['boss', 'goal:g2', 'muro', 'chat'], ['cont:morti', 'effetti', 'wf'], ['chat', 'alert', 'goal:g1']];
  let semi = 1;
  const caso = () => { semi = (semi * 16807) % 2147483647; return semi / 2147483647; };
  for (const salvato of salvati) {
    const intero = ordina(TUTTI, salvato);
    for (let prova = 0; prova < 400; prova++) {
      const parte = TUTTI.filter(() => caso() < 0.5);
      const mescolata = [...parte].sort(() => caso() - 0.5);
      assert.deepEqual(ordina(mescolata, salvato), intero.filter((k) => parte.includes(k)), `salvato ${JSON.stringify(salvato)}, presenti ${JSON.stringify(mescolata)}`);
    }
  }
});

test('un elemento nuovo si mette dopo quello che nell\'ordine di serie gli sta prima', () => {
  assert.deepEqual(ordina(['alert', 'muro', 'goal:g9'], ['alert', 'muro']), ['alert', 'muro', 'goal:g9']);
  assert.deepEqual(ordina(['boss', 'muro', 'effetti'], ['boss', 'muro']), ['boss', 'muro', 'effetti']);
  assert.deepEqual(ordina(['boss', 'alert', 'muro'], ['alert', 'boss']), ['muro', 'alert', 'boss'], 'prima di tutto, se nell\'ordine salvato nessuno gli sta prima');
});
