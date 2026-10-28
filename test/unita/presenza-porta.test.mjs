// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PRESENZA COME PORTA (docs/COLPI.md, «La presenza come porta: «!presente»»).
//
// Il caso: lo streamer vuole che chi non scrive «!presente» non guadagni
// monete, non metta Bit nel salvadanaio e non giochi, e che ogni pezzo sia
// suo. Qui si prova la porta sul database usa e getta: chi e' presente a
// QUESTA diretta (non a quella di ieri), coi due nomi; le monete dei messaggi
// e del tempo guardato; i giochi, tutti i modi di giocare; il ricordo, una
// volta; la frase nuova e quella vecchia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('presenza-porta-');
const { streamers, points, giochi } = await import('../../src/db.js');
const porta = await import('../../src/features/presenza-porta.js');
const games = await import('../../src/features/games.js');
const C = await import('../../src/features/colpi.js');
const conta = await import('../../src/features/conta.js');
const catena = await import('../../src/features/catena.js');
const arena = await import('../../src/features/arena.js');
const presenze = await import('../../src/features/presenze.js');
test.after(() => casa.pulisci());

let diretta = 'd1';
porta.usa({ occasione: () => diretta });

function canale(ch, presenza = {}) {
  streamers.upsertApproved(ch, ch);
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { giochi: true, colpi: { presenza } });
}
const marta = { piattaforma: 'twitch', id: '77', user: 'marta' };

test('la frase: di serie «!presente», la vecchia di serie passa alla nuova, una scritta resta', () => {
  assert.equal(C.normalizza({}).presenza.frase, '!presente');
  assert.equal(C.normalizza({ presenza: { frase: '!pew presente' } }).presenza.frase, '!presente');
  assert.equal(C.normalizza({ presenza: { frase: '!ci sono' } }).presenza.frase, '!ci sono');
  assert.ok(C.eFrasePorta(C.normalizza({}), '  !PRESENTE '), 'la porta la sente anche con l\'effetto in diretta spento');
  assert.ok(!C.eFrasePorta(C.normalizza({}), 'ciao !presente'));
  assert.ok(!C.eFrasePresenza(C.normalizza({}), '!presente'), 'l\'effetto in diretta, spento, resta spento');
  assert.ok(!C.eFrasePorta(C.normalizza({ presenza: { porta: { attiva: false } } }), '!presente'), 'porta spenta ed effetto spento: la frase non e\' niente');
});

test('la porta di serie chiede tutto; ogni pezzo si spegne da solo', () => {
  const tutto = C.normalizza({});
  assert.deepEqual(['monete', 'bit', 'giochi'].map((k) => C.portaChiede(tutto, k)), [true, true, true]);
  const senzaBit = C.normalizza({ presenza: { porta: { bit: false, giochi: 'libero' } } });
  assert.deepEqual(['monete', 'bit', 'giochi'].map((k) => C.portaChiede(senzaBit, k)), [true, false, false]);
  const spenta = C.normalizza({ presenza: { porta: { attiva: false } } });
  assert.deepEqual(['monete', 'bit', 'giochi'].map((k) => C.portaChiede(spenta, k)), [false, false, false]);
});

test('il ricordo dice solo quello che la porta chiede davvero', () => {
  const t = (porta_, lingua = 'it') => C.testoPorta(C.normalizza({ presenza: { porta: porta_ } }), 'ricorda', lingua, { nome: 'marta', frase: '!presente' });
  assert.equal(t({}), '@marta prima scrivi !presente: da lì guadagni monete, puoi giocare e i tuoi Bit vanno nel salvadanaio.');
  assert.equal(t({ bit: false }), '@marta prima scrivi !presente: da lì guadagni monete e puoi giocare.');
  assert.equal(t({ monete: false, bit: false }, 'en'), '@marta first type !presente: from then on you can play.');
  assert.equal(t({ testoRicorda: '{nome}: {frase}!' }), 'marta: !presente!', 'il testo dello streamer');
});

test('presente a QUESTA diretta, con l\'id o col login; quella di ieri non vale', () => {
  const ch = 'porta1';
  canale(ch);
  diretta = 'd1';
  assert.equal(porta.presente(ch, marta), false);
  assert.equal(porta.segna(ch, marta), true, 'la prima volta');
  assert.equal(porta.segna(ch, marta), false, 'la seconda no');
  assert.ok(porta.presente(ch, { piattaforma: 'twitch', id: '77' }) && porta.presente(ch, { piattaforma: 'twitch', user: 'MARTA' }), 'col solo id, o col solo login');
  assert.equal(porta.presente(ch, { piattaforma: 'kick', id: '77' }), false, 'su Kick e\' un\'altra persona');
  diretta = 'd2';
  assert.equal(porta.presente(ch, marta), false, 'la diretta dopo si rifa\'');
  assert.equal(porta.segna(ch, marta), true);
  diretta = 'd1';
});

test('lo streamer non passa dalla porta; spenta, passano tutti; senza la diretta, aperta', () => {
  const ch = 'porta2';
  canale(ch);
  assert.equal(porta.lascia(ch, { piattaforma: 'twitch', id: '1', user: 'porta2' }, 'giochi'), true);
  assert.equal(porta.lascia(ch, marta, 'giochi'), false);
  canale(ch, { porta: { attiva: false } });
  assert.equal(porta.lascia(ch, marta, 'giochi'), true);
  canale(ch);
  diretta = '';
  assert.equal(porta.lascia(ch, marta, 'giochi'), true, 'non si sa la diretta: non si chiude nessuno fuori');
  diretta = 'd1';
});

test('i giochi: chi non e\' presente non gioca, lo sa una volta; i comandi liberi restano', () => {
  const ch = 'porta3';
  canale(ch);
  points.dai(ch, 'marta', 100);
  const detti = [];
  const scrivi = (text, chi = marta) => games.tryGame({ channel: ch, user: chi.user, userId: chi.id, text }, (t) => detti.push(t));
  assert.equal(scrivi('!dado'), true, 'il comando e\' preso, e fermato');
  assert.equal(detti.length, 1);
  assert.match(detti[0], /@marta prima scrivi !presente/);
  scrivi('!slot');
  assert.equal(detti.length, 1, 'il ricordo una volta per diretta');
  const prima = detti.length;
  scrivi('!monete');
  assert.ok(detti.length > prima, '!monete e\' libero: risponde');
  assert.equal(scrivi('!comandochenonesiste'), false, 'un comando che non e\' un gioco non si tocca');
  porta.segna(ch, marta);
  const n = detti.length;
  scrivi('!dado');
  assert.ok(detti.length > n && !/prima scrivi/.test(detti.at(-1)), 'presente: gioca');
});

test('ogni comando di tryGame e\' o un gioco o libero, e nessuno e\' tutti e due', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../../src/features/games.js', import.meta.url), 'utf8');
  const corpo = src.slice(src.indexOf('export function tryGame('));
  const casi = [...corpo.matchAll(/^\s+case '([^']+)'/gm)].map((m) => m[1]);
  assert.ok(casi.length > 30);
  for (const c of casi) assert.ok(games.COMANDI_GIOCO.has(c) !== games.COMANDI_LIBERI.has(c), `«${c}»: o gioco o libero`);
  for (const c of [...games.COMANDI_GIOCO, ...games.COMANDI_LIBERI]) assert.ok(casi.includes(c), `«${c}» e' un comando vero`);
});

test('le monete dei messaggi: solo a chi e\' presente, e chi non lo e\' lo sa', () => {
  const ch = 'porta4';
  canale(ch);
  const detti = [];
  const luca = { piattaforma: 'twitch', id: '88', user: 'luca' };
  games.accredita({ channel: ch, user: 'luca', userId: '88', text: 'che bella partita stasera ragazzi' }, (t) => detti.push(t));
  assert.equal(points.get(ch, 'luca'), 0, 'fuori dalla porta: niente monete');
  assert.match(detti[0] || '', /@luca prima scrivi !presente/);
  porta.segna(ch, luca);
  games.accredita({ channel: ch, user: 'luca', userId: '88', text: 'adesso sono presente anche io' }, (t) => detti.push(t));
  assert.ok((points.get(ch, 'luca')) > 0, 'presente: le monete del messaggio');
});

test('le monete del tempo guardato: il giro passa solo chi e\' presente', () => {
  const ch = 'porta5';
  canale(ch);
  porta.segna(ch, { piattaforma: 'twitch', user: 'anna' });
  const r = games.giroMonete(ch, ['anna', 'bruno'], { ruoli: {}, live: true, diretta: 'x' });
  assert.equal(r.fuoriPorta, 1);
  assert.ok((points.get(ch, 'anna')) > 0);
  assert.equal(points.get(ch, 'bruno'), 0);
});

test('il ricordo: al piu\' uno ogni 20 secondi nel canale, una volta a testa', () => {
  const ch = 'porta6';
  canale(ch);
  const t0 = 5_000_000;
  assert.equal(porta.ricordo(ch, { piattaforma: 'twitch', id: '1' }, t0), true);
  assert.equal(porta.ricordo(ch, { piattaforma: 'twitch', id: '2' }, t0 + 1000), false, 'troppo presto per il canale');
  assert.equal(porta.ricordo(ch, { piattaforma: 'twitch', id: '2' }, t0 + porta.RIPOSO_CANALE_MS), true, 'e poi tocca a lui');
  assert.equal(porta.ricordo(ch, { piattaforma: 'twitch', id: '1' }, t0 + 99_000), false, 'una volta a testa per diretta');
  canale(ch, { porta: { ricorda: false } });
  assert.equal(porta.ricordo(ch, { piattaforma: 'twitch', id: '3' }, t0 + 999_000), false, 'spento dallo streamer');
});

test('le risposte alle manche: chi non e\' presente non vince, chi lo e\' si\'', () => {
  const ch = 'porta7';
  canale(ch);
  giochi.save(ch, { tipo: 'domanda', nome: 'capitale', config: { domanda: 'La capitale d\'Italia?', risposte: ['roma'] } });
  const detti = [];
  const di = (t) => detti.push(t);
  assert.ok(games.avviaManche(ch, di, 'domanda'), 'la manche parte');
  const luca = { piattaforma: 'twitch', id: '91', user: 'luca' };
  assert.equal(games.tryGame({ channel: ch, user: 'luca', userId: '91', text: 'roma' }, di), false, 'la risposta di chi non e\' presente non conta');
  assert.equal(points.get(ch, 'luca'), 0);
  porta.segna(ch, luca);
  assert.equal(games.tryGame({ channel: ch, user: 'luca', userId: '91', text: 'roma' }, di), true);
  assert.ok(points.get(ch, 'luca') > 0, 'presente: vince');
});

test('la conta, la catena e l\'arena: chi non e\' presente non entra', () => {
  const di = () => {};
  const fuori = { channel: '', user: 'ugo', userId: '501' };
  const dentro = { piattaforma: 'twitch', id: '502', user: 'ada' };
  // la conta: il suo «1» non conta, quello di chi e' presente si'
  let ch = 'porta8';
  canale(ch);
  porta.segna(ch, dentro);
  conta.apri(ch, di);
  assert.equal(games.tryGame({ ...fuori, channel: ch, text: '1' }, di), false, 'il numero di chi non e\' presente non e\' una mossa');
  const detti = [];
  assert.equal(games.tryGame({ channel: ch, user: 'ada', userId: '502', text: '1' }, (t) => detti.push(t)), true);
  // la catena: la parola giusta di chi non e' presente non e' una mossa
  ch = 'porta9';
  canale(ch);
  const annunci = [];
  catena.apri(ch, (t) => annunci.push(t));
  const via = /Si parte da (\S+):/.exec(annunci[0])[1].toLowerCase();
  assert.equal(games.tryGame({ ...fuori, channel: ch, text: via.slice(-2) + 'zzz' }, di), false);
  // l'arena nel modo «chi scrive»: chi non e' presente non entra
  ch = 'porta10';
  canale(ch);
  arena.apri(ch, di);
  games.tryGame({ ...fuori, channel: ch, text: 'eccomi nell\'arena' }, di);
  assert.equal(arena.stato(ch)?.combattenti.length, 0);
  porta.segna(ch, dentro);
  games.tryGame({ channel: ch, user: 'ada', userId: '502', text: 'eccomi anche io' }, di);
  assert.equal(arena.stato(ch)?.combattenti.length, 1, 'chi e\' presente entra');
  arena.ferma(ch, di);
});

test('il bonus della serie delle presenze: e\' una moneta che arriva da sola, e passa dalla porta', () => {
  const ch = 'porta11';
  canale(ch);
  porta.segna(ch, { piattaforma: 'twitch', user: 'anna' });
  const t0 = Date.parse('2026-10-28T20:00:00Z');
  presenze.giroDiretta(ch, { streamId: 's1', chatters: ['anna', 'bruno'], ora: t0 });
  const e = presenze.giroDiretta(ch, { streamId: 's1', chatters: ['anna', 'bruno'], ora: t0 + 5 * 60_000 });
  const di = Object.fromEntries(e.presenze.map((v) => [v.user, v.bonus]));
  assert.ok(di.anna > 0 && points.get(ch, 'anna') > 0, 'presente: il bonus');
  assert.deepEqual([di.bruno, points.get(ch, 'bruno')], [0, 0], 'fuori: la presenza conta, il bonus no, e non si annuncia');
});
