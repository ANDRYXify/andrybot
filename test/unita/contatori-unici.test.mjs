// I CONTATORI SONO UNO SOLO: l'azione «Contatore» di un modulo, $count(nome) e
// il contatore della carta con !morti sono lo stesso numero. E «Incrementa
// (+1)» fa +1: il campo «Valore» vale solo per «Imposta a…».
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('contatori-unici-');
const { db, counters, contatori, migraContatoriModuli } = await import('../../src/db.js');
const { ModulesEngine } = await import('../../src/features/modules.js');
test.after(() => casa.pulisci());

const CH = 'tizio';

test('un modulo che incrementa muove il contatore della carta, di uno', async () => {
  contatori.upsert(CH, { comando: 'morti', etichetta: 'Morti', valore: 10 });
  const schermo = [];
  const e = new ModulesEngine({ effects: { emit: (ch, p) => schermo.push([ch, p]), fire: () => {} } });
  await e._eseguiAzione({ tipo: 'contatore', nome: 'morti', op: 'incrementa', valore: 0 }, { channel: CH, _vars: {} }, () => {});
  assert.equal(contatori.get(CH, 'morti').valore, 11, 'Incrementa (+1) fa +1 anche col campo valore a 0');
  assert.equal(counters.get(CH, 'morti'), 11, '$count legge lo stesso numero');
  await e._eseguiAzione({ tipo: 'contatore', nome: 'Morti', op: 'imposta', valore: 3 }, { channel: CH, _vars: {} }, () => {});
  assert.equal(contatori.get(CH, 'morti').valore, 3);
  await e._eseguiAzione({ tipo: 'contatore', nome: 'morti', op: 'azzera' }, { channel: CH, _vars: {} }, () => {});
  assert.equal(contatori.get(CH, 'morti').valore, 0);
  contatori.patchOverlay(CH, 'morti', { mostra: true });
  await e._eseguiAzione({ tipo: 'contatore', nome: 'morti', op: 'incrementa' }, { channel: CH, _vars: {} }, () => {});
  assert.equal(schermo.at(-1)?.[1]?.comando, 'morti', 'e la scritta a schermo segue');
});

test('un contatore che un modulo tocca e non c\'e\' ancora nasce nella carta', () => {
  assert.equal(counters.get(CH, 'vittorie'), 0);
  assert.equal(contatori.get(CH, 'vittorie'), null, 'leggere non crea niente');
  assert.equal(counters.inc(CH, 'vittorie', 1), 1);
  assert.equal(contatori.get(CH, 'vittorie').valore, 1);
});

test('i valori che stavano solo nei moduli passano nella carta, una volta', () => {
  db.prepare('INSERT OR REPLACE INTO counters (channel, nome, valore) VALUES (?,?,?)').run(CH, 'boss', 7);
  db.prepare('INSERT OR REPLACE INTO counters (channel, nome, valore) VALUES (?,?,?)').run(CH, 'vittorie', 99);
  assert.equal(migraContatoriModuli(), 2);
  assert.equal(contatori.get(CH, 'boss').valore, 7, 'quello nuovo entra col suo valore');
  assert.equal(contatori.get(CH, 'vittorie').valore, 1, 'se c\'era gia\' nella carta vince la carta');
  assert.equal(db.prepare('SELECT COUNT(*) n FROM counters').get().n, 0);
  assert.equal(migraContatoriModuli(), 0, 'la seconda volta non c\'e\' niente da fare');
});
