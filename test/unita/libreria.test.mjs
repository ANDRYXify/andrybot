// La LIBRERIA dei media a livello di magazzino: chi vede cosa, e cosa resta
// invisibile. È la parte che regge la condivisione fra streamer, quindi un
// errore qui non è un difetto grafico: è il media privato di qualcuno che
// finisce nella vetrina di tutti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('libreria-');
const { effects } = await import('../../src/db.js');
test.after(() => casa.pulisci());

const metti = (canale, comando, tipo, file) =>
  effects.add(canale, { comando, tipo, file, tier: 'tutti', cooldown: 10, volume: 80, durata: 5000 });

metti('alfa', 'airhorn', 'audio', 'a.mp3');
metti('alfa', 'gattino', 'immagine', 'g.webp');
metti('beta', 'boom', 'video', 'b.webm');
const idBoom = effects.list('beta')[0].id;
const idAirhorn = effects.list('alfa').find((e) => e.comando === 'airhorn').id;

test('senza niente di pubblico la vetrina è vuota', () => {
  assert.equal(effects.sharedList({ escludi: 'alfa' }).length, 0);
});

test('un media diventa pubblico e lo vedono gli altri, non tu', () => {
  assert.equal(effects.setPubblico('beta', idBoom, { pubblico: true, nome: 'Esplosione', autore: 'beta' }), true);
  const daAlfa = effects.sharedList({ escludi: 'alfa' });
  assert.equal(daAlfa.length, 1);
  assert.equal(daAlfa[0].nome, 'Esplosione');
  assert.equal(effects.sharedList({ escludi: 'beta' }).length, 0, 'il tuo non ti torna indietro dalla vetrina');
});

test('il privato di un altro non si vede mai', () => {
  assert.equal(effects.pubblicoById(idAirhorn), null);
  assert.ok(effects.pubblicoById(idBoom));
  assert.ok(effects.anyById(idAirhorn), 'ma il proprietario lo raggiunge');
});

test('i filtri per tipo e la ricerca dicono la verità', () => {
  assert.equal(effects.sharedList({ escludi: 'alfa', tipo: 'video' }).length, 1);
  assert.equal(effects.sharedList({ escludi: 'alfa', tipo: 'audio' }).length, 0);
  assert.equal(effects.sharedList({ escludi: 'alfa', q: 'esplos' }).length, 1, 'cerca nel nome');
  assert.equal(effects.sharedList({ escludi: 'alfa', q: 'boo' }).length, 1, 'cerca nel comando');
  assert.equal(effects.sharedList({ escludi: 'alfa', q: 'zzz' }).length, 0);
});

test('un tipo inventato non allarga la ricerca', () => {
  assert.equal(effects.sharedList({ escludi: 'alfa', tipo: 'tutto' }).length, 1,
    'un tipo non previsto viene ignorato, non apre una porta');
});

test('la ricerca non si fa iniettare', () => {
  assert.equal(effects.sharedList({ escludi: 'alfa', q: "' OR 1=1 --" }).length, 0);
});

test('i miei li vedo tutti, anche i privati', () => {
  assert.equal(effects.myList({ channel: 'alfa' }).length, 2);
  assert.equal(effects.myList({ channel: 'alfa', tipo: 'immagine' }).length, 1);
  assert.equal(effects.myList({ channel: 'ALFA' }).length, 2, 'il canale non è sensibile alle maiuscole');
});

test("l'autore originale non si sovrascrive mai", () => {
  effects.setPubblico('beta', idBoom, { pubblico: false, nome: 'Esplosione', autore: 'qualcunaltro' });
  assert.equal(effects.list('beta')[0].autore, 'beta');
  assert.equal(effects.sharedList({ escludi: 'alfa' }).length, 0, 'tornato privato, sparisce dalla vetrina');
});

test('rendere pubblico un media che non è tuo non funziona', () => {
  assert.equal(effects.setPubblico('alfa', idBoom, { pubblico: true, nome: 'rubato' }), false);
  assert.equal(effects.list('beta')[0].pubblico, 0);
});
