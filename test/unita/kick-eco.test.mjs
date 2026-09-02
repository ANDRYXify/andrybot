// L'eco del bot su Kick: quello che dice il bot non e' un messaggio della chat.
//
// Su Kick non esiste un `isSelf`: il bot scrive con l'account dell'app e
// l'evento torna indietro come qualunque altro messaggio. Senza riconoscerlo il
// bot si ascolta — impara le proprie frasi, si accredita monete e, se una
// risposta contenesse un comando, riaccenderebbe il giro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { segna, nostro, _azzera } from '../../src/kick/eco.js';

test('quello che abbiamo appena detto torna indietro e si riconosce', () => {
  _azzera();
  segna('tizio', 'Ciao a tutti!');
  assert.equal(nostro('tizio', 'Ciao a tutti!'), true);
});

test('si consuma una volta sola: se lo ripete uno spettatore, e suo', () => {
  _azzera();
  segna('tizio', 'buonasera');
  assert.equal(nostro('tizio', 'buonasera'), true);
  assert.equal(nostro('tizio', 'buonasera'), false, 'la seconda volta non è più nostra');
});

test('vale per canale: quello che diciamo da una parte non copre l’altra', () => {
  _azzera();
  segna('tizio', 'stessa frase');
  assert.equal(nostro('caio', 'stessa frase'), false);
  assert.equal(nostro('tizio', 'stessa frase'), true);
});

test('gli spazi attorno non cambiano niente, il testo diverso sì', () => {
  _azzera();
  segna('tizio', '  ciao  ');
  assert.equal(nostro('tizio', 'ciao'), true);
  segna('tizio', 'ciao');
  assert.equal(nostro('tizio', 'ciaoo'), false);
});

test('un messaggio vuoto non si segna e non si riconosce', () => {
  _azzera();
  segna('tizio', '   ');
  assert.equal(nostro('tizio', '   '), false);
  assert.equal(nostro('tizio', ''), false);
});

test('scrivere su Kick segna la frase anche se la chiamata fallisce', async () => {
  _azzera();
  const { scrivi } = await import('../../src/kick/api.js');
  await scrivi('nessuno', 'una frase qualsiasi').catch(() => {});
  assert.equal(nostro('nessuno', 'una frase qualsiasi'), true,
    'si segna prima di mandare: l’evento può tornare prima della risposta');
});
