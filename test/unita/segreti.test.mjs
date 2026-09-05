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

// ---------------------------------------------------------------------------
// LA BUSTA v2: una chiave per ogni valore, chiusa a sua volta, e legata al posto
// in cui abita. Il modello per esteso è in docs/SEGRETI.md.

const { anello, anelloCorrente, impronta, combacia, eImpronta } = await import('../../src/segreti.js');

const DOVE = { tabella: 'telegram', colonna: 'token', riga: 'andryx' };

test('due segreti identici non condividono la chiave', () => {
  // Se la chiave fosse una sola per tutti, il lavoro di forzarne una varrebbe
  // per tutte. Non possiamo vedere le chiavi: guardiamo che la parte avvolta —
  // che è la chiave chiusa — sia diversa ogni volta.
  const a = cifra('stesso-identico-token', DOVE).split(':')[3];
  const b = cifra('stesso-identico-token', DOVE).split(':')[3];
  assert.notEqual(a, b);
});

test('una busta spostata di riga non si apre', () => {
  const c = cifra('token-di-andryx', DOVE);
  assert.equal(decifra(c, DOVE), 'token-di-andryx');
  assert.equal(decifra(c, { ...DOVE, riga: 'qualcunaltro' }), '',
    'copiarsi il segreto di un altro nella propria riga non deve funzionare');
  assert.equal(decifra(c, { ...DOVE, colonna: 'webhook_secret' }), '');
});

test('la busta dichiara il suo anello, e il vecchio formato resta leggibile', () => {
  assert.equal(anello(cifra('x', DOVE)), anelloCorrente);
  assert.equal(anello('enc:1:aaa:bbb:ccc'), 0, 'il formato vecchio non ha anello');
  assert.equal(anello('non cifrato'), 0);
});

test('un pezzo di busta manomesso non decifra e non lancia', () => {
  const c = cifra('token-vero', DOVE);
  const p = c.split(':');
  for (const i of [3, 4, 5, 6]) {
    const rotto = [...p];
    rotto[i] = Buffer.from('manomesso-' + i).toString('base64url');
    assert.equal(decifra(rotto.join(':'), DOVE), '', 'pezzo ' + i);
  }
});

test('di una chiave API si conserva l’impronta, non la chiave', () => {
  const chiave = 'abcdefghijklmnopqrstuvwxyz123456';
  const imp = impronta(chiave, 'andryx');
  assert.ok(eImpronta(imp));
  assert.ok(!imp.includes(chiave), 'la chiave non deve comparire nell’impronta');
  assert.ok(combacia(chiave, imp, 'andryx'));
  assert.ok(!combacia(chiave + 'x', imp, 'andryx'));
  assert.ok(!combacia(chiave, imp, 'un-altro-canale'),
    'la stessa chiave su un altro canale non deve combaciare');
  assert.ok(!combacia(chiave, ''), 'senza impronta salvata non si entra');
});
