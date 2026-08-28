// La CIFRATURA a riposo dei token. Lo scopo: un database o un backup rubato
// deve essere inutile senza il segreto del server. Qui si controlla che lo sia
// davvero, e che una cifratura rotta non faccia mai cadere il bot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('segreti-');
const { cifra, decifra, eCifrato } = await import('../../src/segreti.js');
test.after(() => casa.pulisci());

test('un token cifrato torna identico', () => {
  const t = 'oauth:abcdef0123456789';
  const c = cifra(t);
  assert.notEqual(c, t, 'non resta in chiaro');
  assert.ok(eCifrato(c));
  assert.equal(decifra(c), t);
});

test('il testo cifrato non lascia trapelare il token', () => {
  const t = 'segretissimo_non_deve_comparire';
  assert.ok(!cifra(t).includes(t));
  assert.ok(!cifra(t).includes(t.slice(0, 10)));
});

test('due cifrature dello stesso token sono diverse', () => {
  const t = 'stesso-token';
  assert.notEqual(cifra(t), cifra(t), 'IV casuale: niente schemi riconoscibili');
  assert.equal(decifra(cifra(t)), t);
});

test('cifrare due volte non raddoppia', () => {
  const c = cifra('x');
  assert.equal(cifra(c), c);
  assert.equal(decifra(c), 'x');
});

test('un valore in chiaro (pre-migrazione) passa senza rompersi', () => {
  assert.equal(decifra('token_vecchio_in_chiaro'), 'token_vecchio_in_chiaro');
  assert.equal(eCifrato('token_vecchio_in_chiaro'), false);
});

test('un valore manomesso non decifra e non lancia', () => {
  const c = cifra('token-vero');
  const rotto = c.slice(0, -4) + 'AAAA';
  assert.equal(decifra(rotto), '', 'torna vuoto: il chiamante rifà il login');
  assert.equal(decifra('enc:1:x:y:z'), '');
  assert.equal(decifra('enc:1:'), '');
});

test('il vuoto resta vuoto, e niente lancia mai', () => {
  for (const v of ['', null, undefined]) {
    assert.equal(cifra(v), '', `cifra(${String(v)}) deve restare vuoto`);
    assert.doesNotThrow(() => decifra(v));
    assert.equal(decifra(v), '');
  }
  assert.equal(decifra(cifra(0)), '0', 'uno zero è un valore, non un vuoto');
});
