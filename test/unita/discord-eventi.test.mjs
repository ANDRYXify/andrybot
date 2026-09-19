// GLI APPUNTAMENTI: le regole che non devono poter saltare.
//
// «Giovedì alle 21» sul calendario del server. Il ragionamento sta in
// docs/DISCORD-EVENTI.md; qui ci sono i difetti che non devono esistere:
//
//  · il palinsesto e' gia' scritto una volta, per la grafica: si legge quello;
//  · un appuntamento per FASCIA, non per giorno, e la fascia e' ora + cosa fai;
//  · l'ora si rilegge NEL FUSO, ed e' questo — e nient'altro — che fa
//    accorgere del cambio d'ora senza una riga di codice per l'ora legale;
//  · non si riscrive l'uguale;
//  · si toccano SOLO i nostri: quelli scritti a mano non ci riguardano.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../src/features/discord-eventi.js';
import { EVENTO_ESTERNO, CREATE_EVENTS, ADMINISTRATOR, SEND_MESSAGES, permessiBot, puoAppuntamenti } from '../../src/features/discord-api.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROMA = 'Europe/Rome';
const palinsesto = [
  { ora: '21:00', att: 'Valorant' },   // lunedi
  { ora: '21:00', att: 'Valorant' },   // martedi
  { off: true },                       // mercoledi
  { ora: '21:00', att: 'Chiacchiere' },// giovedi
  { ora: '18:30', att: 'Valorant' },   // venerdi
  { off: true }, { off: true },
];

test('le fasce raggruppano per ora E per cosa si fa', () => {
  const f = E.fasceDa(palinsesto);
  assert.deepEqual(f.map((x) => `${x.ora}|${x.cosa}|${x.giorni.join(',')}`), [
    '18:30|Valorant|4',
    '21:00|Valorant|0,1',
    '21:00|Chiacchiere|3',
  ], 'due sere uguali sono un appuntamento solo, una sera diversa e\' suo');
});

test('i giorni di riposo e le ore storte restano fuori', () => {
  assert.deepEqual(E.fasceDa([{ ora: '21:00', att: 'x' }, { off: true, ora: '21:00' }, { ora: 'boh' }, { ora: '' }])
    .map((x) => x.giorni), [[0]]);
});

test('l\'ora si scrive sempre a due cifre, sennò due volte la stessa fascia sarebbero due', () => {
  const f = E.fasceDa([{ ora: '9:00', att: 'x' }, { ora: '09:00', att: 'x' }]);
  assert.equal(f.length, 1, '«9:00» e «09:00» sono la stessa ora');
  assert.equal(f[0].ora, '09:00');
});

test('il fuso fa i conti giusti, ora legale compresa', () => {
  const luglio = E.prossimaVolta(ROMA, [0], '21:00', new Date('2026-07-20T12:00:00Z'));
  const novembre = E.prossimaVolta(ROMA, [0], '21:00', new Date('2026-11-20T12:00:00Z'));
  assert.equal(luglio.toISOString(), '2026-07-20T19:00:00.000Z', 'd\'estate Roma e\' due ore avanti');
  assert.equal(novembre.toISOString(), '2026-11-23T20:00:00.000Z', 'd\'inverno una sola');
  assert.equal(E.oraNel(ROMA, luglio), '21:00');
  assert.equal(E.oraNel(ROMA, novembre), '21:00', 'e in tutti e due i casi, li\', sono le 21');
});

// LA SECONDA PASSATA SUL FUSO NON E' UN DI PIU', ed e' una cosa che ho
// misurato invece di deciderla: su un anno intero, con una passata sola l'ora
// esce sbagliata fra le tre e le undici volte a seconda del fuso; con due, al
// massimo una — e quell'una e' l'ora che NON ESISTE nella notte in cui
// l'orologio salta avanti, dove nessuna risposta e' giusta.
//
// Il caso qui sotto e' il piu' pulito che ho trovato: nessuna ambiguita', ora
// normale, e una passata sola la sbaglia di mezz'ora. Lord Howe salta di mezza
// ora invece che di un'ora, ed e' per questo che si vede.
test('il fuso si calcola due volte, e la seconda serve davvero', () => {
  const t = E.prossimaVolta('Australia/Lord_Howe', [5], '21:00', new Date('2026-04-04T00:00:00Z'));
  assert.equal(t.toISOString(), '2026-04-04T10:00:00.000Z');
  assert.equal(E.oraNel('Australia/Lord_Howe', t), '21:00',
    'l\'istante, riletto li\', dev\'essere l\'ora che avevo chiesto');
});

test('anche la notte in cui l\'orologio si sposta, quello che esce torna', () => {
  const r = E.prossimaVolta(ROMA, [6], '01:30', new Date('2026-03-29T00:00:00Z'));
  assert.equal(E.oraNel(ROMA, r), '01:30');
});

test('la prossima volta e\' sempre nel futuro, anche se oggi e\' quel giorno', () => {
  // lunedi 20 luglio, ore 22 a Roma: le 21 di oggi sono passate.
  const dopo = E.prossimaVolta(ROMA, [0], '21:00', new Date('2026-07-20T20:30:00Z'));
  assert.equal(dopo.toISOString(), '2026-07-27T19:00:00.000Z', 'il lunedì dopo, non stasera');
});

test('un fuso che non esiste non fa esplodere niente: si torna a Roma', () => {
  assert.equal(E.normalizzaEventi({ fuso: 'Luna/Mare' }).fuso, ROMA);
  assert.equal(E.normalizzaEventi({ fuso: 'America/New_York' }).fuso, 'America/New_York');
});

test('il titolo prende quello che fai, e {cosa} lo sostituisce', () => {
  const f = { ora: '21:00', cosa: 'Valorant', giorni: [0] };
  assert.equal(E.titoloDi({}, f), 'Valorant');
  assert.equal(E.titoloDi({ titolo: 'Diretta: {cosa}' }, f), 'Diretta: Valorant');
  assert.equal(E.titoloDi({ titolo: 'Si gioca' }, f), 'Si gioca');
  assert.equal(E.titoloDi({}, { ora: '21:00', cosa: '', giorni: [0] }), 'Diretta', 'senza niente, almeno un nome');
});

// ---- i nostri e gli altrui -------------------------------------------------
const BOT = '700000000000000001';
const evento = (x) => ({ id: '1', nome: 'Valorant', descrizione: '', luogo: 'https://twitch.tv/a',
  inizio: '2026-07-20T19:00:00.000Z', fine: '2026-07-20T21:00:00.000Z',
  tipo: EVENTO_ESTERNO, diChi: BOT, giorni: [0], ogni: 2, ...x });

test('gli appuntamenti scritti a mano non ci riguardano', () => {
  const n = E.nostriOra([evento({}), evento({ id: '2', diChi: '999' })], BOT, ROMA);
  assert.deepEqual(n.map((x) => x.id), ['1'], 'Discord non ce li lascerebbe toccare comunque');
});

test('l\'ora dei nostri si rilegge nel fuso, non dall\'istante', () => {
  const n = E.nostriOra([evento({})], BOT, ROMA);
  assert.equal(n[0].ora, '21:00');
  assert.equal(n[0].dura, 120);
  const aNewYork = E.nostriOra([evento({})], BOT, 'America/New_York');
  assert.equal(aNewYork[0].ora, '15:00', 'lo stesso istante, letto altrove, e\' un\'altra ora');
});

// ---- la differenza --------------------------------------------------------
const conf = { acceso: true, titolo: '', descrizione: '', luogo: 'https://twitch.tv/a', dura: 120, fuso: ROMA };
const nostri = () => ([
  { id: '1', titolo: 'Valorant', descrizione: '', luogo: 'https://twitch.tv/a', giorni: [0, 1], ora: '21:00', dura: 120 },
  { id: '2', titolo: 'Chiacchiere', descrizione: '', luogo: 'https://twitch.tv/a', giorni: [3], ora: '21:00', dura: 120 },
  { id: '3', titolo: 'Valorant', descrizione: '', luogo: 'https://twitch.tv/a', giorni: [4], ora: '18:30', dura: 120 },
]);

test('quello che c\'e\' gia\' non si riscrive', () => {
  assert.equal(E.differenzaEventi(conf, palinsesto, nostri()), null);
});

test('se l\'ora sul server non torna piu\', si rimette: e\' il cambio d\'ora che si corregge da solo', () => {
  const sfasato = nostri();
  sfasato[0].ora = '20:00';                    // slittato di un'ora dopo il cambio
  const d = E.differenzaEventi(conf, palinsesto, sfasato);
  assert.equal(d.crea.length, 1, 'quello alle 21 non c\'e\' piu\'');
  assert.equal(d.togli.length, 1, 'e quello alle 20 non lo vuole nessuno');
  assert.deepEqual(d.crea[0].giorni, [0, 1]);
});

test('cambiare cosa fai cambia il titolo, e resta lo stesso appuntamento', () => {
  const altro = [...palinsesto];
  altro[3] = { ora: '21:00', att: 'Musica' };
  const d = E.differenzaEventi(conf, altro, nostri());
  assert.equal(d.sistema.length, 1);
  assert.equal(d.sistema[0].id, '2', 'giovedì alle 21 e\' sempre giovedì alle 21');
  assert.equal(d.sistema[0].titolo, 'Musica');
  assert.equal(d.crea.length, 0);
  assert.equal(d.togli.length, 0);
});

test('spegnendo tutto, spariscono tutti', () => {
  const d = E.differenzaEventi({ ...conf, acceso: false }, palinsesto, nostri());
  assert.equal(d.togli.length, 3);
  assert.equal(d.crea.length, 0);
});

test('un palinsesto vuoto e la porta accesa vogliono dire lo stesso: niente appuntamenti', () => {
  const d = E.differenzaEventi(conf, [], nostri());
  assert.equal(d.togli.length, 3);
});

test('la durata cambiata e\' un cambiamento', () => {
  const d = E.differenzaEventi({ ...conf, dura: 180 }, palinsesto, nostri());
  assert.equal(d.sistema.length, 3);
  assert.equal(d.crea.length, 0);
});

test('la durata sta fra un quarto d\'ora e un giorno', () => {
  assert.equal(E.normalizzaEventi({ dura: 1 }).dura, E.DURA_MIN);
  assert.equal(E.normalizzaEventi({ dura: 99999 }).dura, E.DURA_MAX);
  assert.equal(E.normalizzaEventi({}).dura, 120);
});

// CHI HA INVITATO IL BOT PRIMA CHE IL CALENDARIO ESISTESSE non gli ha dato
// «Creare eventi». Il giro riparte ogni sei ore: senza guardare il permesso
// busserebbe a una porta chiusa due volte al giorno per sempre, e lo streamer
// vedrebbe soltanto un calendario che non si riempie mai.
test('senza il permesso di creare eventi non si bussa nemmeno, e si dice come si rimedia', () => {
  const con = (bit) => permessiBot([{ id: 'r1', permessi: String(bit) }], ['r1']);
  assert.equal(puoAppuntamenti(con(SEND_MESSAGES)), false, 'scrivere non vuol dire poter mettere un appuntamento');
  assert.equal(puoAppuntamenti(con(CREATE_EVENTS)), true);
  assert.equal(puoAppuntamenti(con(ADMINISTRATOR)), true, 'chi puo\' tutto puo\' anche questo, ed e\' regola di Discord');
  assert.equal(puoAppuntamenti(permessiBot([{ id: 'r1', permessi: String(CREATE_EVENTS) }], ['r2'])), false,
    'e conta il permesso dei ruoli SUOI, non di quelli che stanno nel server');

  const SRC = readFileSync(fileURLToPath(new URL('../../src/features/discord-eventi.js', import.meta.url)), 'utf8');
  assert.ok(SRC.indexOf('api.puoAppuntamenti(') > 0 && SRC.indexOf('api.puoAppuntamenti(') < SRC.indexOf('await api.eventi('),
    'e si guarda PRIMA di leggere il calendario, non dopo aver gia\' provato');
  assert.match(SRC, /reinvito: true/, 'la cura e\' ripassare dal tasto dell\'invito, e si dice');
});
