// La MODERAZIONE per parole vietate. Regola dichiarata: confronto come
// sottostringa, così "incollare" la parola ad altro testo non la nasconde.
// Il rovescio (una parola dentro un'altra parola innocente) è una conseguenza
// nota di quella scelta: qui la si fissa, così se cambia non cambia per sbaglio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkMessage } from '../../src/features/moderation.js';

const con = (parole) => ({ paroleVietate: parole });

test('senza regole passa tutto', () => {
  assert.equal(checkMessage('qualunque cosa', {}).ok, true);
  assert.equal(checkMessage('qualunque cosa', con([])).ok, true);
  assert.equal(checkMessage('qualunque cosa').ok, true);
});

test('la parola vietata viene presa, comunque scritta', () => {
  const s = con(['brutta']);
  assert.equal(checkMessage('sei brutta', s).ok, false);
  assert.equal(checkMessage('SEI BRUTTA', s).ok, false);
  assert.equal(checkMessage('xxbruttaxx', s).ok, false, 'incollarla non la salva');
});

test('il motivo dice quale parola è scattata', () => {
  const r = checkMessage('ciao brutta', con(['brutta', 'altro']));
  assert.equal(r.ok, false);
  assert.match(r.reason, /brutta/);
});

test('le voci vuote nella lista non bloccano tutto', () => {
  const s = con(['', '   ', null, 'vietata']);
  assert.equal(checkMessage('messaggio innocuo', s).ok, true, 'una riga vuota non vieta ogni cosa');
  assert.equal(checkMessage('parola vietata', s).ok, false);
});

test('una lista malformata non fa cadere il bot', () => {
  assert.doesNotThrow(() => checkMessage('ciao', { paroleVietate: 'non-un-array' }));
  assert.equal(checkMessage('ciao', { paroleVietate: 'non-un-array' }).ok, true);
  assert.doesNotThrow(() => checkMessage(null, con(['x'])));
});
