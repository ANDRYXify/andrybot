// LA FINESTRA SU INTERNET DEVE RISPONDERE, NON DESCRIVERE.
//
// Misurato prima di toccare: a «capitale della Francia» rispondeva «La Francia
// e' il terzo Paese piu' esteso d'Europa, 544000 km²», e a «ricetta carbonara»
// che la carbonara e' un simbolo culinario di Roma. Restituiva l'introduzione
// della pagina: descriveva il sostantivo invece di rispondere alla domanda.
//
// Non e' un difetto di rifinitura. Quel testo finisce nel prompt del modello, e
// finisce nella conoscenza SALVATA quando il bot colma da solo le sue lacune: un
// giro che impara rumore non migliora girando, diventa piu' sicuro di se'.
//
// Qui si prova la LOGICA, senza rete. La rete e' stata misurata a mano e va
// misurata a mano: durante il lavoro le stesse chiamate hanno risposto e poi non
// risposto a un minuto di distanza, e una prova che dipende da questo non e' una
// prova, e' una lotteria. Per quella c'e' `scripts/prova-ricerca.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { paroleChiave, scomponi, sezioni, punteggio, scegliPasso } from '../../src/features/web.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('le parole che non dicono niente non pesano', () => {
  assert.deepEqual(paroleChiave('qual è la capitale della Francia?'), ['capitale', 'francia']);
  assert.deepEqual(paroleChiave('bot, come si prepara il tiramisù'), ['prepara', 'tiramisù']);
});

test('una domanda su una proprieta\' si scompone in proprieta\' + entita\'', () => {
  assert.deepEqual(scomponi('capitale della Francia'), { prop: 'capitale', pid: 'P36', ente: 'francia' });
  assert.deepEqual(scomponi('qual è la capitale del Giappone'), { prop: 'capitale', pid: 'P36', ente: 'giappone' });
  // «dell'Italia» non ha lo spazio dopo l'apostrofo: pretenderlo faceva fallire
  // meta' delle domande italiane
  assert.equal(scomponi("popolazione dell'Italia")?.pid, 'P1082');
  assert.equal(scomponi('regista di Inception')?.pid, 'P57');
});

test('quello che non e\' una proprieta\' nota non si inventa', () => {
  assert.equal(scomponi('ciao come va'), null);
  assert.equal(scomponi('il colore preferito di Marco'), null, 'nessun identificatore: si tace');
  assert.equal(scomponi(''), null);
});

const ESTRATTO = `La pasta alla carbonara è un piatto tipico della tradizione italiana.

== Origine ==
Esistono diverse ipotesi sull'origine della ricetta e non si hanno certezze.

== Ingredienti ==
Spaghetti, guanciale, tuorli d'uovo, pecorino romano e pepe nero.

== Preparazione ==
Tagliare il guanciale a tocchetti e soffriggerlo a fuoco lento.`;

test('l\'estratto si legge a sezioni', () => {
  const s = sezioni(ESTRATTO);
  assert.deepEqual(s.map((x) => x.titolo), ['', 'Origine', 'Ingredienti', 'Preparazione']);
});

test('il punteggio conta quante parole della domanda ci sono', () => {
  assert.equal(punteggio('la capitale è Parigi', ['capitale', 'parigi']), 1);
  assert.equal(punteggio('la capitale è Parigi', ['capitale', 'berlino']), 0.5);
  assert.equal(punteggio('niente a che vedere', ['capitale']), 0);
});

test('si prende la sezione che la domanda NOMINA, non la prima', () => {
  const p = scegliPasso(ESTRATTO, 'ingredienti della carbonara');
  assert.match(p, /guanciale/, `atteso il pezzo con gli ingredienti, ottenuto: ${p}`);
  assert.doesNotMatch(p, /Esistono diverse ipotesi/, 'non deve tornare l\'origine');
});

test('senza nessun aggancio con la domanda si tace', () => {
  assert.equal(scegliPasso(ESTRATTO, 'quotazione del bitcoin'), null,
    'meglio niente che un pezzo di testo a caso');
  assert.equal(scegliPasso('', 'qualcosa'), null);
});

test('il materiale dal web arriva AL MODELLO, non solo al ripiego', () => {
  // Il collegamento. `brainpy.rispondi` accetta `web` da sempre e nel percorso
  // normale non gliene passava nessuno: la ricerca esisteva solo per quando il
  // modello era spento. Una via che c'era e non portava da nessuna parte.
  const brain = readFileSync(join(RAD, 'src/ai/brain.js'), 'utf8');
  const i = brain.indexOf('IL CERVELLO PARLA');
  const j = brain.indexOf('FALLBACK quando il modello', i);
  assert.ok(i > 0 && j > i, 'il percorso normale si trova');
  const tratto = brain.slice(i, j);
  assert.ok(/internet\.cerca\(/.test(tratto), 'nel percorso normale si cerca');
  assert.ok(/^\s*web,/m.test(tratto), 'e il trovato viene passato al modello');
  assert.ok(/attesa: \d{3,4}/.test(tratto), 'con un\'attesa corta: in chat la risposta lenta è persa');
});
