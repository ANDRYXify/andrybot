// La barra di un obiettivo non torna INDIETRO.
//
// Quel che si mostra e' sempre «partenza + eventi contati». Con «parti da quanti
// ne ho adesso» il server riallinea la partenza al numero vero di Twitch, e per
// non contare due volte gli eventi la calcola come `vero - eventi`.
//
// Il numero vero pero' sta in cache 90 secondi, mentre gli eventi contati sono
// sempre freschi: la sottrazione mescolava un numero di adesso con uno di un
// minuto e mezzo fa. Arrivavano tre follower, l'overlay si ricaricava, e il
// totale a schermo CALAVA di tre — dal vivo si legge come «ho perso follower».
//
// Qui si riproduce quella scena esatta, con un orologio e una lettura finti.

import test from 'node:test';
import assert from 'node:assert/strict';

// La formula del server, nelle due versioni: quella vecchia sottraeva il
// conteggio di ADESSO, quella nuova quello di quando la lettura fu presa.
const partenzaVecchia = (letto, contiOra) => Math.max(0, Math.min(1000000, letto.quanti - contiOra));
const partenzaNuova = (letto) => Math.max(0, Math.min(1000000, letto.quanti - letto.allora));
const mostrato = (partenza, conti) => Math.max(0, partenza + conti);

test('la scena che la rompeva: lettura in cache, eventi freschi', () => {
  // Alle 12:00 il server legge da Twitch: 500 follower, eventi contati 0.
  const letto = { ts: 0, quanti: 500, allora: 0 };
  const partenza0 = partenzaNuova(letto);
  assert.equal(mostrato(partenza0, 0), 500, 'al primo allineamento mostra il numero vero');

  // Arrivano tre follower: il conteggio eventi sale, la lettura resta in cache.
  const conti = 3;
  assert.equal(mostrato(partenza0, conti), 503, 'la barra sale con gli eventi');

  // L'overlay si ricarica: il riallineamento rigira, ma la lettura e' la STESSA.
  const vecchia = mostrato(partenzaVecchia(letto, conti), conti);
  const nuova = mostrato(partenzaNuova(letto), conti);
  assert.equal(vecchia, 500, 'com\'era prima: il totale tornava indietro di tre');
  assert.equal(nuova, 503, 'adesso resta dov\'era');
  assert.ok(nuova >= 503, 'la barra non torna mai indietro per colpa della cache');
});

test('quando la lettura si rinfresca davvero, il conto resta giusto', () => {
  // Cache scaduta: lettura nuova 503, e il conteggio di quel momento e' 3.
  const letto = { ts: 90001, quanti: 503, allora: 3 };
  assert.equal(mostrato(partenzaNuova(letto), 3), 503, 'nessun doppio conteggio');
  // altri due follower dopo la lettura
  assert.equal(mostrato(partenzaNuova(letto), 5), 505, 'gli eventi dopo si sommano sopra');
});

test('un calo vero resta visibile: non nascondiamo la realta\'', () => {
  // Se qualcuno toglie davvero il follow, la lettura nuova e' piu' bassa.
  const letto = { ts: 0, quanti: 498, allora: 0 };
  assert.equal(mostrato(partenzaNuova(letto), 0), 498, 'un calo reale si vede');
});

test('la partenza non va sotto zero ne\' oltre il tetto', () => {
  assert.equal(partenzaNuova({ quanti: 2, allora: 10 }), 0, 'mai negativa');
  assert.equal(partenzaNuova({ quanti: 9999999, allora: 0 }), 1000000, 'mai oltre il tetto');
});
