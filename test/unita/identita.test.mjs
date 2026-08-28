// L'IDENTITÀ di un media caricato. L'invariante: un caricamento non ne cancella
// mai un altro. Prima il comando era fisso per slot, quindi ogni immagine nuova
// distruggeva la precedente — e un media senza identità non si riusa e non si
// condivide.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('identita-');
const { effects, baseDaFile, normComando } = await import('../../src/db.js');
test.after(() => casa.pulisci());

test('il nome del file diventa una base leggibile', () => {
  assert.equal(baseDaFile('Gattino Buffo.PNG'), 'gattino_buffo');
  assert.equal(baseDaFile('clip-finale.mp4'), 'clip_finale');
  assert.equal(baseDaFile('tromba.finale.mp3'), 'tromba_finale');
  assert.equal(baseDaFile('🎉🎉.wav'), '', 'un nome senza lettere non dà base');
  assert.equal(baseDaFile(''), '');
});

test('senza base si ripiega su un nome sensato', () => {
  assert.equal(effects.comandoLibero('alfa', ''), 'media');
  assert.equal(effects.comandoLibero('alfa', baseDaFile('🎉.wav')), 'media');
});

test('un caricamento non cancella il precedente', () => {
  const c1 = effects.comandoLibero('alfa', baseDaFile('gattino.png'));
  effects.add('alfa', { comando: c1, tipo: 'immagine', file: 'a.webp', tier: 'mod', cooldown: 0, volume: 100, durata: 5000 });
  assert.equal(c1, 'gattino');

  const c2 = effects.comandoLibero('alfa', baseDaFile('gattino.png'));
  effects.add('alfa', { comando: c2, tipo: 'immagine', file: 'b.webp', tier: 'mod', cooldown: 0, volume: 100, durata: 5000 });
  assert.equal(c2, 'gattino_2');
  assert.equal(effects.list('alfa').length, 2, 'ci sono entrambi');
});

test('lo stesso file nello stesso campo lo sostituisce, non lo accumula', () => {
  assert.equal(effects.comandoLibero('alfa', baseDaFile('gattino.png'), 'gattino'), 'gattino');
  assert.equal(effects.list('alfa').length, 2, 'nessuna copia in più');
});

test('ogni comando coniato è valido come trigger di chat', () => {
  for (const nome of ['Gattino Buffo.PNG', 'clip finale!!.mp4', '../../etc/passwd', 'A'.repeat(80) + '.png']) {
    const c = effects.comandoLibero('gamma', baseDaFile(nome));
    assert.match(c, /^[a-z0-9_]{1,24}$/, `"${nome}" ha coniato "${c}"`);
    assert.equal(c, normComando(c), 'già normalizzato');
  }
});

test('un nome di file ostile non esce dalla cartella', () => {
  assert.doesNotMatch(baseDaFile('../../etc/passwd'), /[./\\]/);
  assert.doesNotMatch(effects.comandoLibero('gamma', baseDaFile('..%2F..%2Fetc')), /[./\\%]/);
});
