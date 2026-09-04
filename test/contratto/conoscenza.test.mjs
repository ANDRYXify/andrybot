// QUELLO CHE LO STREAMER SCRIVE DEVE ARRIVARE, e deve arrivare la cosa GIUSTA.
//
// Il difetto vecchio non aveva sintomi: al cervello andavano le prime sei voci
// in ordine di inserimento. Chi ne scriveva quaranta ne vedeva usare sempre le
// stesse sei, e il bot rispondeva lo stesso — solo con la roba sbagliata sotto
// gli occhi. Non c'era una pagina rotta da notare: c'era un campo che si
// compilava e non serviva a niente.
//
// Qui si misura la SCELTA, non il collegamento (di quello si occupa il cancello
// scripts/verifica-conoscenza.mjs): con quali voci il bot si trova in mano
// quando qualcuno scrive una certa cosa. Il modello è in docs/CONOSCENZA.md.

import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-conoscenza-');
const { knowledge, memory, streamers, schedaPulita } = await import('../../src/db.js');
const { Brain } = await import('../../src/ai/brain.js');

const CANALE = 'canaleprova';
const cervello = new Brain({});

function scrivi(voci) {
  for (const v of knowledge.list(CANALE)) knowledge.remove(CANALE, v.id);
  for (const v of voci) knowledge.add(CANALE, { fonte: 'manuale', ...v });
}
const live = (acceso) => (acceso
  ? memory.setStreamContext(CANALE, 'In live su Fortnite')
  : memory.setStreamContext(CANALE, ''));

test.after(() => usaEGetta.pulisci());

test('con più di sei voci arriva quella che c’entra, non l’ultima scritta', () => {
  const riempitivo = Array.from({ length: 10 }, (_, i) => ({ domanda: `argomento numero ${i}`, risposta: `risposta ${i}` }));
  scrivi([{ domanda: 'che pc usi? setup configurazione', risposta: 'Un Ryzen 7 con una 4070' }, ...riempitivo]);
  // le dieci riempitive sono TUTTE più recenti: col vecchio ordinamento per data
  // la voce sul pc non entrava nemmeno fra le prime sei.
  const scelte = cervello._conoscenzaPertinente(CANALE, 'ma che pc usi per giocare?');
  assert.equal(scelte.length, 6);
  assert.match(scelte[0], /Ryzen 7/, 'la voce pertinente deve essere la PRIMA, non una qualsiasi');
});

test('una voce fissata entra comunque, anche se non c’entra niente', () => {
  scrivi([
    { domanda: 'regolamento del torneo', risposta: 'Le iscrizioni si aprono il lunedì' },
    ...Array.from({ length: 8 }, (_, i) => ({ domanda: `cosa ${i}`, risposta: `valore ${i}` })),
  ]);
  const senza = cervello._conoscenzaPertinente(CANALE, 'che tempo fa da voi?');
  assert.ok(!senza.some((x) => /iscrizioni si aprono/.test(x)), 'senza fissarla non doveva entrare');

  const voce = knowledge.list(CANALE).find((v) => v.domanda.startsWith('regolamento'));
  knowledge.setAmbito(CANALE, voce.id, { fissata: true });
  const con = cervello._conoscenzaPertinente(CANALE, 'che tempo fa da voi?');
  assert.match(con[0], /iscrizioni si aprono/, 'una fissata sta in cima, sempre');
});

test('«solo in diretta» e «solo offline» si escludono davvero a vicenda', () => {
  scrivi([
    { domanda: 'codice sconto sponsor', risposta: 'Usa il codice ORA10', quando: 'live' },
    { domanda: 'quando torni in diretta', risposta: 'Domani sera alle 21', quando: 'offline' },
  ]);
  live(true);
  const inLive = cervello._conoscenzaPertinente(CANALE, 'codice sconto? quando torni?').join(' | ');
  assert.match(inLive, /ORA10/);
  assert.ok(!/Domani sera/.test(inLive), 'una voce «solo offline» non deve uscire mentre è in diretta');

  live(false);
  const spento = cervello._conoscenzaPertinente(CANALE, 'codice sconto? quando torni?').join(' | ');
  assert.match(spento, /Domani sera/);
  assert.ok(!/ORA10/.test(spento), 'una voce «solo in diretta» non deve uscire da spenti');
});

test('quello che gli utenti hanno detto in chat non torna mai in bocca al bot', () => {
  scrivi([{ domanda: 'una cosa detta in chat', risposta: 'testo di un utente', fonte: 'chat' }]);
  assert.deepEqual(cervello._conoscenzaPertinente(CANALE, 'una cosa detta in chat'), []);
  assert.equal(cervello._cercaConoscenza(CANALE, 'una cosa detta in chat'), null);
});

test('la scorciatoia scatta sulla pertinenza vera, non perché una voce è fissata', () => {
  scrivi([
    { domanda: 'orari delle dirette', risposta: 'Quasi ogni sera dalle 21', fissata: true },
    { domanda: 'che pc usi', risposta: 'Un Ryzen 7 con una 4070' },
  ]);
  live(false);
  assert.match(cervello._cercaConoscenza(CANALE, 'che pc usi?') || '', /Ryzen/);
  assert.equal(cervello._cercaConoscenza(CANALE, 'ciao come butta oggi'), null,
    'una fissata non è la risposta a qualunque domanda');
});

test('senza un messaggio a cui agganciarsi restano le fissate e le più recenti', () => {
  scrivi([
    { domanda: 'la cosa importante', risposta: 'questa la deve sapere sempre', fissata: true },
    ...Array.from({ length: 8 }, (_, i) => ({ domanda: `tema ${i}`, risposta: `nota ${i}` })),
  ]);
  const scelte = cervello._conoscenzaPertinente(CANALE, '');
  assert.equal(scelte.length, 6);
  assert.match(scelte[0], /la deve sapere sempre/);
});

test('la scheda tiene solo i campi che esistono, e li ripulisce', () => {
  const pulita = schedaPulita({ chi: '  Andrea,   27 anni ', dove: 'instagram.com/x', inventato: 'via', evita: '   ' });
  assert.deepEqual(pulita, { chi: 'Andrea, 27 anni', dove: 'instagram.com/x' });
});

test('le frasi scritte a mano sono le prime dello stile', () => {
  streamers.request(CANALE, CANALE, '1');
  streamers.setSettings(CANALE, { frasi: ['GG raga, si vola!', 'chi non segue paga da bere'] });
  cervello._stileCache.delete(CANALE);
  const stile = cervello._stileStreamer(CANALE);
  assert.equal(stile[0], 'GG raga, si vola!',
    'sono l’unica parte dello stile che ha SCELTO: vengono prima di quello che ha detto per caso');
});
