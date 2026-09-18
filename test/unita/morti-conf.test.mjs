// COSA SI PUO' SALVARE. Quello che arriva da fuori non lo decide chi lo manda.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-morti-');
const { normalizza, MAX_SCHERMATE, MAX_FIRME, OGNI_DEF_MS, SOGLIA_DEF } = await import('../../src/features/morti.js');

const buona = (n = 'Morte', c = 'morti') => ({ nome: n, firme: ['a1b2c3d4e5f60789'], contatore: c });

test('una schermata senza nemmeno un\'impronta buona non e\' una schermata', () => {
  const r = normalizza({ schermate: [
    buona(),
    { nome: 'senza impronte', firme: [], contatore: 'morti' },
    { nome: 'impronte finte', firme: ['', 'a1b2', 'zzzzzzzzzzzzzzzz'], contatore: 'morti' },
    { nome: 'maiuscola', firme: ['A1B2C3D4E5F60780'], contatore: 'morti' },
    { nome: 'una su tre', firme: ['corta', '2222222222222222', null], contatore: 'morti' },
    { nome: 'senza contatore', firme: ['1111111111111111'], contatore: '' },
  ] });
  const nomi = r.schermate.map((s) => s.nome);
  assert.deepEqual(nomi, ['Morte', 'maiuscola', 'una su tre'], 'passano solo quelle che possono davvero fare qualcosa');
  assert.deepEqual(r.schermate[1].firme, ['a1b2c3d4e5f60780'], 'le maiuscole non fanno due impronte diverse');
  assert.deepEqual(r.schermate[2].firme, ['2222222222222222'], 'la robaccia se ne va e quella buona resta');
});

test('le impronte di una schermata sono tante, senza doppioni e con un tetto', () => {
  const doppie = normalizza({ schermate: [{ nome: 'x', firme: ['aaaaaaaaaaaaaaaa', 'AAAAAAAAAAAAAAAA', 'bbbbbbbbbbbbbbbb'], contatore: 'morti' }] });
  assert.deepEqual(doppie.schermate[0].firme, ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb'], 'la stessa impronta non si tiene due volte');
  const tante = [];
  for (let i = 0; i < 40; i++) tante.push(String(i).padStart(16, '0'));
  assert.equal(normalizza({ schermate: [{ nome: 'x', firme: tante, contatore: 'morti' }] }).schermate[0].firme.length, MAX_FIRME);
});

test('la stessa schermata sullo stesso contatore non si tiene due volte', () => {
  const r = normalizza({ schermate: [buona('una'), buona('doppione'), buona('altro conto', 'tentativi')] });
  assert.equal(r.schermate.length, 2);
  assert.deepEqual(r.schermate.map((s) => s.contatore), ['morti', 'tentativi']);
});

test('non si accende un riconoscimento che non ha niente da riconoscere', () => {
  assert.equal(normalizza({ attivo: true, schermate: [] }).attivo, false);
  assert.equal(normalizza({ attivo: true, schermate: [buona()] }).attivo, true);
  assert.equal(normalizza({ attivo: false, schermate: [buona()] }).attivo, false);
});

test('i tempi stanno dentro limiti sensati, e i valori strani non passano', () => {
  const d = normalizza({});
  assert.equal(d.ogniMs, OGNI_DEF_MS);
  assert.equal(d.soglia, SOGLIA_DEF);
  assert.equal(normalizza({ ogniMs: 1 }).ogniMs, 1000, 'non si guarda mille volte al secondo');
  assert.equal(normalizza({ ogniMs: 999999 }).ogniMs, 30_000);
  assert.equal(normalizza({ ogniMs: 'ciao' }).ogniMs, OGNI_DEF_MS);
  assert.equal(normalizza({ soglia: -5 }).soglia, 0, 'zero vuol dire identica, e si puo\' chiedere');
  assert.equal(normalizza({ soglia: 999 }).soglia, 20, 'ma non si puo\' chiedere che somigli e basta');
  assert.equal(normalizza({ riarmoMs: -1 }).riarmoMs, 0);
});

test('piu\' di otto schermate non si tengono', () => {
  const tante = [];
  for (let i = 0; i < 20; i++) tante.push({ nome: 'n' + i, firme: [String(i).padStart(16, '0')], contatore: 'morti' });
  assert.equal(normalizza({ schermate: tante }).schermate.length, MAX_SCHERMATE);
});

test('robaccia in entrata non rompe niente', () => {
  for (const x of [null, undefined, 'ciao', 42, [], { schermate: 'no' }]) {
    const r = normalizza(x);
    assert.equal(r.attivo, false);
    assert.deepEqual(r.schermate, []);
  }
  void usaEGetta;
});
