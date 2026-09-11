// QUANDO PARLA DA SOLO: la decisione e' una funzione senza dadi dentro, e qui
// si prova con il caso in mano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decidiSpontanea, registra, elenco, SPONTANEA_MIN_MS, PROMO_MIN_MS, DOSE_MAX, REGISTRO_MAX } from '../../src/features/spontanea.js';

const ORA = 1_760_000_000_000;
const base = { ora: ORA, dose: 0.5, ritmo: 5, live: true, soloLive: false, ultimaSpontanea: 0, ultimaPromo: 0, promoAccesa: true, caso: { parla: 0.01, promo: 0.9 } };

test('a dose zero tace, qualunque cosa succeda', () => {
  assert.equal(decidiSpontanea({ ...base, dose: 0 }).parla, false);
  assert.equal(decidiSpontanea({ ...base, dose: undefined }).parla, false, 'e «non impostata» vale zero, come dice il cursore');
  assert.equal(decidiSpontanea({ ...base, dose: -1 }).parla, false);
});

test('la dose non supera il massimo del cursore', () => {
  // con dose 5 (assurda) la probabilita' resta quella di 0.5: 0.2
  assert.equal(decidiSpontanea({ ...base, dose: 5, caso: { parla: 0.19, promo: 0.9 } }).parla, true);
  assert.equal(decidiSpontanea({ ...base, dose: 5, caso: { parla: 0.21, promo: 0.9 } }).parla, false);
  assert.equal(DOSE_MAX, 0.5);
});

test('a chat ferma non parla, e i suoi messaggi non la fanno sembrare viva (li conta chi misura il ritmo)', () => {
  assert.deepEqual(decidiSpontanea({ ...base, ritmo: 0.9 }), { parla: false, perche: 'chat ferma' });
  assert.equal(decidiSpontanea({ ...base, ritmo: 1 }).parla, true);
});

test('«solo mentre sono in diretta» vale solo con la spunta', () => {
  assert.deepEqual(decidiSpontanea({ ...base, live: false, soloLive: true }), { parla: false, perche: 'non in diretta' });
  assert.equal(decidiSpontanea({ ...base, live: false, soloLive: false }).parla, true, 'senza spunta parla anche a canale spento, come prima');
});

test('mai due volte in sei minuti', () => {
  assert.equal(decidiSpontanea({ ...base, ultimaSpontanea: ORA - SPONTANEA_MIN_MS + 1 }).parla, false);
  assert.equal(decidiSpontanea({ ...base, ultimaSpontanea: ORA - SPONTANEA_MIN_MS }).parla, true);
  assert.equal(SPONTANEA_MIN_MS, 6 * 60_000);
});

test('la probabilita\' per giro e\' dose × 0,4', () => {
  assert.equal(decidiSpontanea({ ...base, dose: 0.25, caso: { parla: 0.099, promo: 0.9 } }).parla, true);
  assert.equal(decidiSpontanea({ ...base, dose: 0.25, caso: { parla: 0.1, promo: 0.9 } }).parla, false);
});

test('il promemoria dei link riposa tre quarti d\'ora, e rispetta la sua spunta', () => {
  const promo = { ...base, caso: { parla: 0.01, promo: 0.1 } };
  assert.equal(decidiSpontanea(promo).tipo, 'promo');
  assert.equal(decidiSpontanea({ ...promo, ultimaPromo: ORA - PROMO_MIN_MS + 1 }).tipo, 'altro', 'troppo presto: dice un\'altra cosa, non tace');
  assert.equal(decidiSpontanea({ ...promo, ultimaPromo: ORA - PROMO_MIN_MS }).tipo, 'promo');
  assert.equal(decidiSpontanea({ ...promo, promoAccesa: false }).tipo, 'altro');
  assert.equal(decidiSpontanea({ ...promo, caso: { parla: 0.01, promo: 0.45 } }).tipo, 'altro', 'la promo e\' meno della meta\' delle volte');
  assert.equal(PROMO_MIN_MS, 45 * 60_000);
});

test('senza il caso non parla: la funzione non tira dadi da sola', () => {
  assert.equal(decidiSpontanea({ ...base, caso: undefined }).parla, false);
});

test('il registro tiene le ultime trenta, dalla piu\' recente, e non mischia i canali', () => {
  const m = new Map();
  for (let i = 0; i < 40; i++) registra(m, 'Uno', { ts: ORA + i, tipo: 'promo', testo: 'r' + i });
  registra(m, 'due', { ts: ORA, tipo: 'battuta', testo: 'x' });
  const uno = elenco(m, 'uno');
  assert.equal(uno.length, REGISTRO_MAX);
  assert.equal(uno[0].testo, 'r39', 'la piu\' recente per prima');
  assert.equal(uno[uno.length - 1].testo, 'r10');
  assert.equal(elenco(m, 'due').length, 1);
  assert.deepEqual(elenco(m, 'tre'), []);
  uno[0].testo = 'cambiata';
  assert.equal(elenco(m, 'uno')[0].testo, 'r39', 'chi legge non tocca il registro');
});
