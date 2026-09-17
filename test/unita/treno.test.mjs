// L'HYPE TRAIN E' DI TWITCH, NOI LO RISPECCHIAMO.
//
// Le prove che contano sono quelle in cui la copia potrebbe scollarsi
// dall'originale senza che nessuno se ne accorga guardando l'overlay:
//
//  · un treno NUOVO non si somma a quello di prima. Twitch da' un id a ogni
//    treno: se lo si ignora, il secondo treno della serata parte dal livello
//    del primo, e da fuori sembra solo un canale molto fortunato;
//  · il record storico Twitch lo manda solo quando il treno PARTE. Se lo si
//    rilegge a ogni aggiornamento, al primo contributo sparisce;
//  · in chat si parla quando si SALE di livello, non a ogni contributo — se no
//    un treno da cento sub sono cento righe del bot;
//  · il treno non conta negli obiettivi ne' nel subathon: i sub e i bit che lo
//    fanno crescere sono gia' passati di la' uno per uno.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-treno-');
const { streamers } = await import('../../src/db.js');
const treno = await import('../../src/features/treno.js');
const { normTreno } = await import('../../src/web/stile.js');

const CH = 'canale';
streamers.request(CH, 'Canale', '1');

const REGOLE = normTreno({ attivo: true, annuncia: true, testoParte: 'parte', testoLivello: 'liv {livello}', testoFine: 'fine {livello} grazie {chi}' });
const prepara = (regole = REGOLE) => {
  const s = streamers.get(CH)?.settings || {};
  const stato = { ...(s.overlayStato || {}) };
  delete stato.treno;
  streamers.setSettings(CH, { ...s, overlayTreno: regole, overlayStato: stato });
};

const ORA = 1_700_000_000_000;
const EV = (o = {}) => ({
  id: 't1', level: 2, total: 400, progress: 150, goal: 500,
  started_at: new Date(ORA - 60000).toISOString(),
  expires_at: new Date(ORA + 300000).toISOString(),
  type: 'regular', is_shared_train: false, all_time_high_level: 9,
  top_contributions: [
    { user_name: 'Mario', type: 'bits', total: 900 },
    { user_name: 'Giada', type: 'subscription', total: 500 },
  ],
  ...o,
});

test('l\'evento di Twitch diventa lo stato del treno, senza inventarsi niente', () => {
  const t = treno.daEvento('channel.hype_train.begin', EV(), { ora: ORA });
  assert.equal(t.che, 'parte');
  assert.equal(t.livello, 2);
  assert.equal(t.quanto, 150);
  assert.equal(t.meta, 500);
  assert.equal(t.totale, 400);
  assert.equal(t.record, 9);
  assert.equal(t.scade, ORA + 300000);
  assert.equal(t.finito, false);
  assert.deepEqual(t.chi[0], { nome: 'Mario', quanti: 900, come: 'bit' });
  assert.equal(t.chi[1].come, 'sub');
});

test('i treni speciali e quelli condivisi si riconoscono', () => {
  const t = treno.daEvento('channel.hype_train.progress', EV({ type: 'golden_kappa', is_shared_train: true }), { ora: ORA });
  assert.equal(t.tipo, 'golden_kappa');
  assert.equal(t.condiviso, true);
  assert.equal(treno.daEvento('channel.hype_train.progress', EV(), { ora: ORA }).tipo, 'normale');
});

test('alla fine il cartello resta in scena per un po\', poi se ne va da solo', () => {
  const t = treno.daEvento('channel.hype_train.end', EV({ ended_at: new Date(ORA).toISOString() }), { ora: ORA });
  assert.equal(t.finito, true);
  assert.ok(t.scade > ORA, 'il cartello di fine ha la sua scadenza');
  assert.equal(treno.vivo(t, ORA), true);
  assert.equal(treno.vivo(t, t.scade + 1), false);
});

test('un evento che non e\' del treno non produce niente', () => {
  assert.equal(treno.daEvento('channel.subscribe', EV(), { ora: ORA }), null);
  assert.equal(treno.daEvento('channel.hype_train.begin', null, { ora: ORA }), null);
});

test('il treno si scrive nel canale, quindi sopravvive a un riavvio', () => {
  prepara();
  treno.suEvento(CH, 'channel.hype_train.begin', EV(), { ora: ORA });
  const t = treno.trenoDi(streamers.get(CH).settings);
  assert.equal(t.livello, 2);
  assert.equal(t.id, 't1');
});

test('un treno nuovo sostituisce quello vecchio, non ci si somma sopra', () => {
  prepara();
  treno.suEvento(CH, 'channel.hype_train.begin', EV(), { ora: ORA });
  treno.suEvento(CH, 'channel.hype_train.end', EV({ ended_at: new Date(ORA).toISOString() }), { ora: ORA });
  treno.suEvento(CH, 'channel.hype_train.begin', EV({ id: 't2', level: 1, progress: 10, all_time_high_level: 9 }), { ora: ORA + 1000 });
  const t = treno.trenoDi(streamers.get(CH).settings);
  assert.equal(t.id, 't2');
  assert.equal(t.livello, 1, 'il treno nuovo parte dal suo livello');
  assert.equal(t.quanto, 10);
});

test('il record storico non sparisce al primo contributo', () => {
  prepara();
  treno.suEvento(CH, 'channel.hype_train.begin', EV(), { ora: ORA });
  const senzaRecord = EV({ level: 3 });
  delete senzaRecord.all_time_high_level;
  treno.suEvento(CH, 'channel.hype_train.progress', senzaRecord, { ora: ORA + 1000 });
  assert.equal(treno.trenoDi(streamers.get(CH).settings).record, 9);
});

test('in chat si parla quando parte, quando sale e quando finisce — non a ogni contributo', () => {
  prepara();
  const dette = [];
  const say = (ch, t) => dette.push(t);
  treno.suEvento(CH, 'channel.hype_train.begin', EV(), { say, ora: ORA });
  treno.suEvento(CH, 'channel.hype_train.progress', EV({ progress: 300 }), { say, ora: ORA + 1000 });
  treno.suEvento(CH, 'channel.hype_train.progress', EV({ level: 3, progress: 20 }), { say, ora: ORA + 2000 });
  treno.suEvento(CH, 'channel.hype_train.end', EV({ level: 3, ended_at: new Date(ORA).toISOString() }), { say, ora: ORA + 3000 });
  assert.deepEqual(dette, ['parte', 'liv 3', 'fine 3 grazie Mario']);
});

test('con la chat spenta il bot sta zitto, ma la scena si aggiorna lo stesso', () => {
  prepara(normTreno({ attivo: true, annuncia: false }));
  const dette = [];
  const spinte = [];
  treno.suEvento(CH, 'channel.hype_train.begin', EV(), { say: (c, t) => dette.push(t), spingi: (c, t) => spinte.push(t), ora: ORA });
  assert.equal(dette.length, 0);
  assert.equal(spinte.length, 1);
  assert.equal(spinte[0].livello, 2);
});

test('con la scena spenta non si spinge niente in overlay, ma in chat si parla', () => {
  prepara(normTreno({ attivo: false, annuncia: true, testoParte: 'parte' }));
  const dette = [];
  const spinte = [];
  treno.suEvento(CH, 'channel.hype_train.begin', EV(), { say: (c, t) => dette.push(t), spingi: (c, t) => spinte.push(t), ora: ORA });
  assert.deepEqual(dette, ['parte']);
  assert.equal(spinte.length, 0);
});

test('a treno spento non si scrive nemmeno lo stato: chi non lo usa non paga una riga', () => {
  prepara(normTreno({ attivo: false, annuncia: false }));
  assert.equal(treno.suEvento(CH, 'channel.hype_train.begin', EV(), { ora: ORA }), null);
  assert.equal(treno.trenoDi(streamers.get(CH).settings), null);
});

test('«!treno» risponde solo se un treno sta davvero correndo', () => {
  prepara();
  const dette = [];
  const parla = (t) => dette.push(t);
  const msg = { channel: CH, text: '!treno', isSelf: false };
  assert.equal(treno.tryComando(msg, parla, { ora: ORA }), false, 'senza treno non risponde');
  treno.suEvento(CH, 'channel.hype_train.begin', EV(), { ora: ORA });
  assert.equal(treno.tryComando(msg, parla, { ora: ORA }), true);
  assert.match(dette[0], /livello 2/);
  assert.match(dette[0], /150 punti su 500/);
  assert.equal(treno.tryComando({ ...msg, text: '!altro' }, parla, { ora: ORA }), false);
  assert.equal(treno.tryComando(msg, parla, { ora: ORA + 999_999 }), false, 'un treno scaduto non risponde');
});

test('il treno non tocca gli obiettivi: quei sub sono passati di la prima', () => {
  prepara();
  const s = streamers.get(CH).settings;
  streamers.setSettings(CH, { ...s, overlayGoals: [{ id: 'g1', attivo: true, tipo: 'sub', obiettivo: 10 }], overlayStato: { ...(s.overlayStato || {}), goals: { g1: 4 } } });
  treno.suEvento(CH, 'channel.hype_train.progress', EV({ level: 5, total: 5000 }), { ora: ORA });
  assert.equal(streamers.get(CH).settings.overlayStato.goals.g1, 4, 'il conto degli obiettivi non si muove');
});

test('le impostazioni hanno valori sensati anche se nessuno le tocca', () => {
  const d = normTreno({});
  assert.equal(d.attivo, false);
  assert.equal(d.annuncia, false);
  assert.equal(d.mostraChi, true);
  assert.equal(d.posizione, 'alto-destra');
  assert.match(d.testoLivello, /\{livello\}/);
  assert.equal(normTreno({ posizione: 'chissadove' }).posizione, 'alto-destra');
  assert.equal(normTreno({ titolo: 'x'.repeat(200) }).titolo.length, 60);
});

test.after(() => usaEGetta.pulisci());
