// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// PARTITE CON LA CHAT: la fila, la scelta, l'esito e le monete.
//
// Gli invarianti del modulo (features/partite.js), uno per prova: una persona
// una volta in fila, chi gioca non e' in fila, una manche aperta alla volta,
// le monete di una manche tolte esattamente annullando, il costo che torna a
// chi non ha giocato, la partita che sopravvive a un riavvio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('partite-');
const { streamers, points } = await import('../../src/db.js');
const P = await import('../../src/features/partite.js');
test.after(() => casa.pulisci());

let giro = 0;
const canale = (regole = {}) => {
  const ch = `part${++giro}`;
  streamers.upsertApproved(ch, ch, '1');
  assert.ok(P.apri(ch, { nome: 'Fortnite', regole: { punti: [100, 50, 25], ...regole } }).ok);
  return ch;
};
const entra = (ch, u, extra = {}) => P.entra(ch, { user: u, display: u, ...extra });
const fila = (ch) => P.stato(ch).fila.map((x) => x.user);
const saldo = (ch, u) => points.get(ch, u);

test('una persona sta in fila una volta, nell\'ordine in cui arriva', () => {
  const ch = canale();
  assert.equal(entra(ch, 'anna').posto, 1);
  assert.equal(entra(ch, 'bruno').posto, 2);
  assert.deepEqual(entra(ch, 'Anna'), { ok: false, errore: 'gia-dentro', posto: 1 });
  assert.deepEqual(fila(ch), ['anna', 'bruno']);
});

test('la fila chiusa, piena, solo abbonati e col nome nel gioco dice di no e perche\'', () => {
  const ch = canale({ max: 1, soloSub: true, nick: true });
  assert.equal(entra(ch, 'x').errore, 'solo-sub');
  assert.equal(entra(ch, 'x', { isSub: true }).errore, 'nick');
  assert.ok(entra(ch, 'x', { isSub: true, nick: 'Xgamer' }).ok);
  assert.equal(entra(ch, 'y', { isMod: true, nick: 'Y' }).errore, 'piena');
  P.iscrizioni(ch, false);
  P.esci(ch, 'x');
  assert.equal(entra(ch, 'y', { isMod: true, nick: 'Y' }).errore, 'chiusa');
  assert.equal(P.stato(ch).fila.length, 0);
});

test('scegliere: i primi della fila, a caso, per nome; chi gioca esce dalla fila', () => {
  const ch = canale();
  for (const u of ['a', 'b', 'c', 'd']) entra(ch, u);
  const r = P.scegli(ch, { quanti: 2 });
  assert.deepEqual(r.giocatori.map((g) => g.user), ['a', 'b']);
  assert.deepEqual(fila(ch), ['c', 'd']);
  assert.equal(entra(ch, 'a').errore, 'sta-giocando');
  assert.deepEqual(P.scegli(ch, { quanti: 1 }), { ok: false, errore: 'manche-aperta', n: 1 }, 'una manche aperta alla volta');
  P.esito(ch, ['a']);
  assert.deepEqual(fila(ch), ['c', 'd', 'a', 'b']);
  const caso = P.scegli(ch, { quanti: 1, modo: 'caso' }, () => 0);
  assert.deepEqual(caso.giocatori.map((g) => g.user), ['d'], 'il mescolamento decide, non la fila');
  P.esito(ch, []);
  assert.deepEqual(P.scegli(ch, { chi: ['@zz'] }), { ok: false, errore: 'non-in-fila', chi: ['zz'] });
});

test('l\'esito da\' le monete per posto e la partecipazione, solo a chi giocava', () => {
  const ch = canale({ punti: [100, 50], partecipazione: 5 });
  for (const u of ['a', 'b', 'c']) entra(ch, u);
  P.scegli(ch, { quanti: 3 });
  assert.deepEqual(P.esito(ch, ['@estraneo']), { ok: false, errore: 'non-giocava', chi: ['estraneo'] });
  const r = P.esito(ch, ['@b', 'a']);
  assert.ok(r.ok);
  assert.deepEqual([saldo(ch, 'b'), saldo(ch, 'a'), saldo(ch, 'c')], [105, 55, 5]);
  assert.deepEqual(P.classifica(ch).map((t) => [t.user, t.monete, t.vittorie]), [['b', 105, 1], ['a', 55, 0], ['c', 5, 0]]);
});

test('con la rotazione chi ha giocato torna in fondo; senza, esce', () => {
  const ch = canale({ rotazione: true });
  for (const u of ['a', 'b', 'c']) entra(ch, u);
  P.scegli(ch, { quanti: 2 });
  P.esito(ch, []);
  assert.deepEqual(fila(ch), ['c', 'a', 'b']);
  const ch2 = canale({ rotazione: false });
  for (const u of ['a', 'b', 'c']) entra(ch2, u);
  P.scegli(ch2, { quanti: 2 });
  P.esito(ch2, []);
  assert.deepEqual(fila(ch2), ['c']);
});

test('annullare l\'esito toglie esattamente le monete date e riapre la manche; annullare la scelta rimette in testa', () => {
  const ch = canale({ punti: [100], rotazione: true });
  for (const u of ['a', 'b', 'c']) entra(ch, u);
  points.dai(ch, 'a', 7);
  P.scegli(ch, { quanti: 2 });
  P.esito(ch, ['a']);
  assert.equal(saldo(ch, 'a'), 107);
  const u = P.annulla(ch);
  assert.equal(u.cosa, 'esito');
  assert.equal(saldo(ch, 'a'), 7, 'restano le sue, non quelle della manche');
  assert.deepEqual(fila(ch), ['c'], 'chi era tornato in fondo e\' di nuovo in gioco');
  assert.ok(P.stato(ch).inGioco, 'la manche e\' di nuovo aperta');
  P.esito(ch, ['b']);
  assert.equal(saldo(ch, 'b'), 100);
  P.annulla(ch); P.annulla(ch);
  assert.deepEqual(fila(ch), ['a', 'b', 'c'], 'annullata anche la scelta: in testa, nell\'ordine');
  assert.equal(saldo(ch, 'b'), 0);
});

test('il costo si paga entrando e torna a chi esce o resta in fila alla fine; chi ha giocato l\'ha speso', () => {
  const ch = canale({ costo: 30 });
  points.dai(ch, 'a', 30); points.dai(ch, 'b', 30); points.dai(ch, 'c', 50);
  assert.deepEqual(entra(ch, 'povero'), { ok: false, errore: 'monete', costo: 30 });
  for (const u of ['a', 'b', 'c']) assert.ok(entra(ch, u).ok);
  assert.deepEqual([saldo(ch, 'a'), saldo(ch, 'b'), saldo(ch, 'c')], [0, 0, 20]);
  assert.equal(P.esci(ch, 'b').reso, 30);
  assert.equal(saldo(ch, 'b'), 30);
  P.scegli(ch, { quanti: 1 });
  P.esito(ch, []);
  const f = P.fine(ch);
  assert.equal(f.resi, 1);
  assert.deepEqual([saldo(ch, 'a'), saldo(ch, 'c')], [0, 50], 'a ha giocato, c no');
  assert.equal(P.stato(ch).attiva, false);
});

test('una partita aperta sopravvive a un riavvio', () => {
  const ch = canale();
  entra(ch, 'a'); entra(ch, 'b');
  P.scegli(ch, { quanti: 1 });
  P._dimentica();
  const s = P.stato(ch);
  assert.equal(s.nome, 'Fortnite');
  assert.deepEqual(s.fila.map((x) => x.user), ['b']);
  assert.deepEqual(s.inGioco.giocatori.map((g) => g.user), ['a']);
});

test('le regole usate restano per la prossima, e una partita sola per canale', () => {
  const ch = canale({ costo: 10, max: 8, staff: true });
  assert.deepEqual(P.apri(ch, {}), { ok: false, errore: 'gia-aperta' });
  P.fine(ch);
  assert.equal(P.regoleDi(ch).max, 8);
  assert.equal(P.regoleDi(ch).staff, true);
  assert.equal(P.apri(ch, { nome: 'di nuovo' }).regole.max, 8, 'aperta senza regole, riparte dalle ultime');
});

test('in chat: lo streamer comanda sempre, i moderatori solo se lui lo permette', () => {
  const detti = [];
  const say = (t) => detti.push(t);
  const ch = `chat${++giro}`;
  streamers.upsertApproved(ch, ch, '1');
  const m = (text, chi = {}) => P.tryPartita({ channel: ch, user: chi.user || 'mod1', display: chi.user || 'mod1', text, ...chi }, say);
  m('!partita Among Us', { isMod: true });
  assert.equal(P.stato(ch).attiva, false, 'un moderatore senza permesso non apre');
  m('!partita Among Us', { user: ch, isBroadcaster: true });
  assert.equal(P.stato(ch).nome, 'Among Us');
  m('!gioco', { user: 'gina' }); m('!gioco', { user: 'ugo' });
  m('!scegli 1', { isMod: true });
  assert.equal(P.stato(ch).inGioco, null, 'il moderatore ancora no');
  P.cambiaRegole(ch, { staff: true });
  m('!scegli 1', { isMod: true });
  assert.deepEqual(P.stato(ch).inGioco.giocatori.map((g) => g.user), ['gina']);
  m('!vince @gina', { isMod: true });
  assert.equal(points.get(ch, 'gina'), 100);
  assert.ok(detti.some((t) => /1° gina/.test(t)));
  m('!partita fine', { user: ch, isBroadcaster: true });
  assert.ok(detti.some((t) => /Partita finita/.test(t)));
});
