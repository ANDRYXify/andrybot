// UN SALVATAGGIO PARZIALE DEVE RESTARE PARZIALE.
//
// Le due sezioni della moderazione si ricostruiscono da capo a ogni
// salvataggio. Finché chi salva manda tutto va bene; il giorno che ne manda
// dieci su ventisei, gli altri sedici tornano ai valori di fabbrica in
// silenzio. È il difetto che ha reso impossibile accendere la sola osservazione
// dal pannello: la casella c'era, il salvataggio non la portava, e nessuno
// diceva niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizzaAntibot, normalizzaAntispam } from '../../src/web/impostazioni-moderazione.js';

test('un campo che non arriva resta com\'era', () => {
  const prima = normalizzaAntibot({}, { attivo: true, esenti: ['unamico'], soglia: 85, chatMinOre: 6 });
  assert.deepEqual(prima.esenti, ['unamico']);
  assert.equal(prima.soglia, 85);
  const dopo = normalizzaAntibot(prima, { attivo: true, raffica: false });
  assert.deepEqual(dopo.esenti, ['unamico'], 'la lista non la nominava nessuno: resta');
  assert.equal(dopo.soglia, 85, 'e nemmeno la soglia');
  assert.equal(dopo.chatMinOre, 6);
  assert.equal(dopo.raffica, false, 'quello che nominava è cambiato');
});

test('e una lista si svuota mandandola vuota, non dimenticandola', () => {
  const prima = normalizzaAntibot({}, { esenti: ['unamico'], extra: ['unbot'] });
  const dopo = normalizzaAntibot(prima, { esenti: [] });
  assert.deepEqual(dopo.esenti, [], 'chiesto: svuotata');
  assert.deepEqual(dopo.extra, ['unbot'], 'non chiesto: intatta');
});

test('le tre cose che il pannello offriva e il salvataggio buttava via', () => {
  // Sola osservazione, quanto presto reagire, e i bot che guardano senza
  // scrivere: erano nel pannello, si leggevano nella console, e nessuna delle
  // tre arrivava mai al disco.
  const v = normalizzaAntibot({}, { aVuoto: true, modo: 'prudente', presenze: false });
  assert.equal(v.aVuoto, true, 'la sola osservazione si può accendere');
  assert.equal(v.modo, 'prudente');
  assert.equal(v.presenze, false);
  const ancora = normalizzaAntibot(v, { attivo: true });
  assert.equal(ancora.aVuoto, true, 'e non si spegne da sola al salvataggio dopo');
  assert.equal(ancora.modo, 'prudente');
  assert.equal(ancora.presenze, false);
});

test('un modo che non esiste non passa', () => {
  assert.equal(normalizzaAntibot({}, { modo: 'ferocissima' }).modo, 'bilanciata');
  assert.equal(normalizzaAntibot({}, { azione: 'evapora' }).azione, 'ban');
  assert.equal(normalizzaAntibot({}, { chatNuoviAzione: 'boh' }).chatNuoviAzione, 'elimina');
});

test('i nomi si ripuliscono, e quelli impossibili si buttano', () => {
  const v = normalizzaAntibot({}, { esenti: ['@Pippo', ' PLUTO ', 'a', 'no spazi', 'ok_99'] });
  assert.deepEqual(v.esenti, ['pippo', 'pluto', 'ok_99']);
});

test('i numeri restano dentro i loro estremi', () => {
  assert.equal(normalizzaAntibot({}, { rafficaQuanti: 9999 }).rafficaQuanti, 100);
  assert.equal(normalizzaAntibot({}, { rafficaQuanti: 1 }).rafficaQuanti, 3);
  assert.equal(normalizzaAntibot({}, { chatMinOre: 0 }).chatMinOre, 24, 'zero non è un\'età: vale il valore di partenza');
});

test('e l\'antispam segue la stessa regola', () => {
  const prima = normalizzaAntispam({}, { attivo: true, whitelist: ['miosito.it'], lungoMax: 120 });
  const dopo = normalizzaAntispam(prima, { attivo: true, flood: false });
  assert.deepEqual(dopo.whitelist, ['miosito.it']);
  assert.equal(dopo.lungoMax, 120);
  assert.equal(dopo.flood, false);
});

test('partendo da niente si ottengono i valori di fabbrica, non degli errori', () => {
  const ab = normalizzaAntibot();
  assert.equal(ab.attivo, false);
  assert.equal(ab.modo, 'bilanciata');
  assert.deepEqual(ab.esenti, []);
  const as = normalizzaAntispam();
  assert.equal(as.attivo, false);
  assert.equal(as.linkTier, 'sub');
});
