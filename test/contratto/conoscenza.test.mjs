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

// ---------------------------------------------------------------------------
// LE PAROLE CHE NON DEVONO USCIRE.
//
// «Cosa non dire mai di te» è una richiesta al modello: vale se il modello la
// capisce. Le parole da bloccare sono un'altra cosa — il cognome, la via, il
// nome della scuola — e lì non si può sperare: o non escono mai, o sono uscite.
// Il controllo sta nell'unico punto da cui passa tutto quello che il bot dice.

const { checkMessage, checkRisposta } = await import('../../src/features/moderation.js');
const { schedaDalProfilo, uniScheda } = await import('../../src/ai/pretrain.js');

test('una parola da non far uscire blocca la risposta, anche scritta diversa', () => {
  const imp = { maiDire: ['Taliento', 'via Mazzini'] };
  assert.equal(checkRisposta('Il mio cognome è Taliento', imp).ok, false);
  assert.equal(checkRisposta('sono TALIENTO, piacere', imp).ok, false);
  assert.equal(checkRisposta('abito in Via Mazzìni da anni', imp).ok, false,
    'accenti e maiuscole non devono servire ad aggirarla');
  assert.equal(checkRisposta('Ciao, come va oggi?', imp).ok, true);
});

test('il motivo del blocco non contiene la parola: finisce nei log', () => {
  const esito = checkRisposta('sono Taliento', { maiDire: ['Taliento'] });
  assert.equal(esito.ok, false);
  assert.ok(!/taliento/i.test(esito.reason), `il motivo la ripete: «${esito.reason}»`);
});

test('quelle parole non moderano nessuno: valgono solo su quello che dice il bot', () => {
  const imp = { maiDire: ['Taliento'] };
  assert.equal(checkMessage('ciao Taliento!', imp).ok, true,
    'un utente che scrive il cognome dello streamer non ha fatto niente di male');
  assert.equal(checkRisposta('ciao Taliento!', imp).ok, false);
});

test('ogni risposta esce da un punto solo, e lì il controllo c’è', async () => {
  const b = new Brain({});
  b._rispostaGrezza = async () => 'Mi chiamo Andrea Taliento';
  const bloccata = await b.chatReply({ channel: CANALE, streamer: { settings: { maiDire: ['Taliento'] } } });
  assert.equal(bloccata, null, 'passa da chatReply: se non passasse da _finalizza, uscirebbe');

  b._rispostaGrezza = async () => 'Stasera si gioca alle 21';
  const passa = await b.chatReply({ channel: CANALE, streamer: { settings: { maiDire: ['Taliento'] } } });
  assert.equal(passa, 'Stasera si gioca alle 21');
});

// ---------------------------------------------------------------------------
// LA SCHEDA PRECOMPILATA. Senza, nasce vuota per tutti e non arriva mai al bot:
// i dati per riempirne tre campi il pre-addestramento li scarica già.

test('la scheda si riempie da quello che il bot ha già letto del profilo', () => {
  assert.deepEqual(
    schedaDalProfilo({ bio: '  Andrea,   gioco da sempre ', programmazione: 'ogni sera dalle 21', paginaLink: 'https://socialbot.live/u/x' }),
    { chi: 'Andrea, gioco da sempre', orari: 'ogni sera dalle 21', dove: 'https://socialbot.live/u/x' });
});

test('senza pagina link restano i social, e solo quelli veri', () => {
  const r = schedaDalProfilo({ socials: { instagram: 'https://instagram.com/x', tiktok: 'https://tiktok.com/@x', rotto: 'non-un-url' } });
  assert.equal(r.dove, 'https://instagram.com/x · https://tiktok.com/@x');
});

test('se manca la bio del sito si ripiega su quella di Twitch', () => {
  assert.equal(schedaDalProfilo({ bioTwitch: 'Gioco e rido' }).chi, 'Gioco e rido');
  assert.equal(schedaDalProfilo({ bio: 'quella del sito', bioTwitch: 'quella di Twitch' }).chi, 'quella del sito');
});

test('quello che ha scritto lui non si tocca: si riempiono solo i vuoti', () => {
  const { scheda, messi } = uniScheda(
    { chi: 'quello che ho scritto io', evita: 'il cognome' },
    { chi: 'quello del sito', orari: 'ogni sera' });
  assert.equal(scheda.chi, 'quello che ho scritto io');
  assert.equal(scheda.orari, 'ogni sera');
  assert.equal(scheda.evita, 'il cognome');
  assert.deepEqual(messi, ['orari'], 'deve dire quali ha riempito, per non far credere di aver riscritto tutto');
});
