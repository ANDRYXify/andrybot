// I CONTATORI: i verbi sono del contatore, non del motore.
//
// Tre difetti veri, trovati PROVANDOLI e non leggendoli, e qui dentro come
// prove di regressione:
//
//  · «!morti on» (mostra il widget) AZZERAVA il valore. Quarantasette morti
//    diventavano zero, in silenzio e senza ritorno, perche' due verbi erano
//    finiti dentro lo stesso comando;
//  · «!morti + 3» aggiungeva il passo invece di tre: solo «+3» attaccato
//    funzionava, mentre «set 10» staccato si'. Due grammatiche nello stesso
//    comando, e chi ne conosceva una sbagliava con l"altra;
//  · a chi non poteva, il bot non rispondeva NIENTE. Un rifiuto muto sembra un
//    bot rotto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('contatori-');
const { contatori: store, streamers, normVerbiCont, VERBI_CONT } = await import('../../src/db.js');
const cont = await import('../../src/features/contatori.js');
test.after(() => casa.pulisci());

const CH = 'canale';
streamers.request(CH, 'Canale', '1');

const CHI = {
  spettatore: { channel: CH, user: 'tizio', isMod: false, isBroadcaster: false },
  sub:        { channel: CH, user: 'subbo', isSub: true },
  mod:        { channel: CH, user: 'mod1', isMod: true },
  streamer:   { channel: CH, user: CH, isBroadcaster: true },
};

// Rifa' il contatore da zero e manda un comando. Torna cosa ha detto e come sta.
function manda(testo, ruolo = 'streamer') {
  const dette = [];
  const preso = cont.tryComando({ ...CHI[ruolo], text: testo }, (t) => dette.push(t));
  const riga = store.get(CH, 'morti');
  return { preso, detto: dette[0] || '', valore: riga?.valore, mostra: store.overlayDi(riga).mostra };
}
const parti = (campi = {}) => store.upsert(CH, { comando: 'morti', etichetta: 'Morti', step: 1, valore: 0, ...campi });

// --- i tre difetti ----------------------------------------------------------

test("mostrare a schermo NON azzera: sono due verbi diversi", () => {
  parti({ valore: 47 });
  const r = manda('!morti on');
  assert.equal(r.valore, 47, 'quarantasette morti restano quarantasette');
  assert.equal(r.mostra, true, 'e il widget si vede');
});

test("il numero vale attaccato o staccato, per tutti i verbi", () => {
  parti({ valore: 0 });
  assert.equal(manda('!morti +3').valore, 3);
  assert.equal(manda('!morti + 3').valore, 6, 'staccato faceva +1: era un difetto, non una scelta');
  assert.equal(manda('!morti -2').valore, 4);
  assert.equal(manda('!morti - 2').valore, 2);
  assert.equal(manda('!morti set 10').valore, 10);
  assert.equal(manda('!morti set10').valore, 10);
});

test("a chi non puo', il bot lo dice", () => {
  parti({ valore: 5 });
  const r = manda('!morti+', 'spettatore');
  assert.equal(r.valore, 5, 'e non succede niente');
  assert.match(r.detto, /riservato ai moderatori e allo streamer/);
});

test("e lo dice una volta sola, non a ogni tentativo", () => {
  parti({ valore: 5 });
  // un altro spettatore: la pausa e per persona, e quella di prima e gia stata
  // consumata dal test qui sopra
  const dette = [];
  const chi = { channel: CH, user: 'caio', isMod: false, isBroadcaster: false, text: '!morti+' };
  cont.tryComando(chi, (t) => dette.push(t));
  cont.tryComando(chi, (t) => dette.push(t));
  cont.tryComando(chi, (t) => dette.push(t));
  assert.equal(dette.length, 1, 'sennO e un modo per farlo parlare a raffica');
});

test("ma la pausa e di chi ha chiesto, non di tutti", () => {
  parti({ valore: 5 });
  const dette = [];
  cont.tryComando({ channel: CH, user: 'primo', text: '!morti+' }, (t) => dette.push(t));
  cont.tryComando({ channel: CH, user: 'secondo', text: '!morti+' }, (t) => dette.push(t));
  assert.equal(dette.length, 2, 'chi chiede per la prima volta merita una risposta');
});

// --- quello che si faceva prima si fa ancora --------------------------------

test("i comandi di sempre funzionano come sempre", () => {
  parti({ valore: 0 });
  assert.equal(manda('!morti+').valore, 1);
  assert.equal(manda('!morti-').valore, 0);
  assert.equal(manda('!morti 7').valore, 7, 'un numero da solo imposta');
  assert.equal(manda('!morti reset').valore, 0);
  assert.equal(manda('!MORTI+').valore, 1, 'le maiuscole non contano');
  assert.equal(manda('!morti').detto, 'Morti: 1', 'leggere lo puo fare chiunque');
  assert.equal(manda('!morti', 'spettatore').detto, 'Morti: 1');
});

test("il passo del contatore vale quando non scrivi un numero", () => {
  store.upsert(CH, { comando: 'punti', step: 5, valore: 0 });
  const dette = [];
  cont.tryComando({ ...CHI.streamer, text: '!punti+' }, (t) => dette.push(t));
  assert.equal(store.get(CH, 'punti').valore, 5);
  cont.tryComando({ ...CHI.streamer, text: '!punti +2' }, (t) => dette.push(t));
  assert.equal(store.get(CH, 'punti').valore, 7, 'il numero scritto batte il passo');
});

test("niente piu' parole magiche: «stop» non nasconde piu' niente", () => {
  parti({ valore: 3, overlay: { mostra: true } });
  const r = manda('!morti stop');
  assert.equal(r.mostra, true, 'era in un elenco che nessuno aveva mai visto');
  assert.equal(r.detto, 'Morti: 3', 'una parola che non e un verbo vale come leggere');
});

// --- i verbi su misura ------------------------------------------------------

test("le parole le sceglie lo streamer", () => {
  parti({ valore: 0, verbi: { piu: { parole: ['su'], chi: 'mod' } } });
  assert.equal(manda('!morti su').valore, 1);
  assert.equal(manda('!morti su 4').valore, 5);
  assert.equal(manda('!morti +').valore, 5, 'il piu non e piu un suo verbo');
  assert.equal(manda('!morti +').detto, 'Morti: 5', 'e vale come leggere');
});

test("e chi puo' fare cosa lo sceglie verbo per verbo", () => {
  parti({ valore: 0, verbi: { piu: { parole: ['+'], chi: 'tutti' }, azzera: { parole: ['reset'], chi: 'mod' } } });
  assert.equal(manda('!morti+', 'spettatore').valore, 1, 'aggiungere: aperto a tutti');
  assert.equal(manda('!morti reset', 'spettatore').valore, 1, 'azzerare: no');
  assert.equal(manda('!morti reset', 'mod').valore, 0);
});

test("un verbo senza parole e un verbo spento", () => {
  parti({ valore: 4, verbi: { azzera: { parole: [], chi: 'mod' } } });
  assert.equal(manda('!morti reset').valore, 4, 'non c e piu nessuna parola che azzera');
});

test("le parole si ripuliscono prima di entrare nel database", () => {
  const v = normVerbiCont({ piu: { parole: ['  SU  ', 'su', '', 'giu'], chi: 'imperatore' } });
  assert.deepEqual(v.piu.parole, ['su', 'giu'], 'spazi via, doppioni via, vuoti via');
  assert.equal(v.piu.chi, 'mod', 'un livello inventato torna a quello di fabbrica');
  for (const k of VERBI_CONT) assert.ok(v[k], `manca il verbo ${k}`);
});

test("chi aveva le sue parole per accendere se le ritrova fra i verbi", () => {
  store.upsert(CH, { comando: 'vecchio', overlay: { parolaOn: 'su, via', parolaOff: 'giu' } });
  const v = store.verbiDi(store.get(CH, 'vecchio'));
  assert.ok(v.mostra.parole.includes('su') && v.mostra.parole.includes('via'));
  assert.ok(v.nascondi.parole.includes('giu'));
  store.upsert(CH, { comando: 'vecchio', verbi: { mostra: { parole: ['accendi'], chi: 'mod' } } });
  assert.deepEqual(store.verbiDi(store.get(CH, 'vecchio')).mostra.parole, ['accendi'],
    'ma appena li scrive a mano, comanda la sua scelta');
});

test("un contatore che non esiste non risponde, e non lo prende per se", () => {
  const dette = [];
  const preso = cont.tryComando({ ...CHI.streamer, text: '!chenonesiste+' }, (t) => dette.push(t));
  assert.equal(preso, false);
  assert.equal(dette.length, 0);
});
