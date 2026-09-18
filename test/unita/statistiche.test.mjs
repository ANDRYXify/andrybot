// La scheda Statistiche legge da un posto solo.
//
// Ogni numero ha una fonte: la chat dai messaggi, le dirette dai rapporti, le
// ore guardate dal loro registro. Il periodo taglia tutto allo stesso modo, e
// «da sempre» non taglia niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-stat-');
const { db, memory, rapporti, watchtime } = await import('../../src/db.js');
const st = await import('../../src/features/statistiche.js');

const CH = 'stat-prova';
const G = 24 * 3600_000;
const ORA = 1_800_000_000_000;

test.before(() => {
  // chat: tre persone di recente, una dieci giorni fa, il bot, un evento
  memory.logMessage(CH, 'tizio', 'Tizio', 'ciao', false, ORA - G);
  memory.logMessage(CH, 'tizio', 'Tizio', 'ancora', false, ORA - 2 * G);
  memory.logMessage(CH, 'caio', 'Caio', 'ehi', false, ORA - 3 * G);
  memory.logMessage(CH, 'sempronia', 'Sempronia', 'oh', false, ORA - 6 * G);
  memory.logMessage(CH, 'vecchio', 'Vecchio', 'ero qui', false, ORA - 10 * G);
  memory.logMessage(CH, 'bot', 'Bot', 'rispondo', true, ORA - G);
  memory.logMessage(CH, '[evento]', '', 'channel.follow {}', true, ORA - G);
  // dirette: due nella settimana, una un mese fa
  rapporti.salva(CH, { inizio: ORA - 2 * G, fine: ORA - 2 * G + 3600_000 * 3, dati: { durataMs: 3 * 3600_000, picco: 40, media: 25, follow: 4, sub: 1, raid: 1, messaggi: 300, persone: 20, clip: 2 } });
  rapporti.salva(CH, { inizio: ORA - 5 * G, fine: ORA - 5 * G + 3600_000 * 2, dati: { durataMs: 2 * 3600_000, picco: 61, media: 30, follow: 6, sub: 0, raid: 0, messaggi: 200, persone: 15, clip: 0 } });
  rapporti.salva(CH, { inizio: ORA - 30 * G, fine: ORA - 30 * G + 3600_000 * 4, dati: { durataMs: 4 * 3600_000, picco: 90, media: 50, follow: 10, sub: 3, raid: 2, messaggi: 500, persone: 40, clip: 1 } });
  watchtime.add(CH, 'tizio', 7200, 'Tizio');
  watchtime.add(CH, 'caio', 600, 'Caio');
  db.prepare('INSERT INTO clips (channel, clip_id, url, reason, ts) VALUES (?,?,?,?,?)').run(CH, 'c1', 'https://clips/1', 'prova', ORA - G);
});

test('sette giorni: chat, bot ed eventi contati ciascuno per sé', () => {
  const r = st.riassunto(CH, { periodo: '7', ora: ORA });
  assert.equal(r.periodo, '7');
  assert.equal(r.messaggi, 4, 'i messaggi delle persone della settimana');
  assert.equal(r.persone, 3, 'le persone diverse');
  assert.equal(r.messaggiBot, 2, 'il bot e gli eventi stanno da un\'altra parte');
  assert.deepEqual(r.topChatters.slice(0, 2), [{ user: 'tizio', n: 2 }, { user: 'caio', n: 1 }]);
  assert.equal(r.clip, 1);
});

test('le dirette vengono dai rapporti, e il periodo le taglia', () => {
  const sette = st.riassunto(CH, { periodo: '7', ora: ORA });
  assert.deepEqual(sette.dirette, { n: 2, oreMs: 5 * 3600_000, picco: 61, follow: 10, sub: 1, raid: 1, donazioni: 0, donazioniCent: 0 });
  const sempre = st.riassunto(CH, { periodo: 'tutto', ora: ORA });
  assert.equal(sempre.dirette.n, 3);
  assert.equal(sempre.dirette.picco, 90);
  assert.equal(sempre.messaggi, 5, '«da sempre» non taglia niente');
  const trenta = st.riassunto(CH, { periodo: '30', ora: ORA });
  assert.equal(trenta.dirette.n, 3, 'trenta giorni prende anche quella al limite');
});

test('le ultime dirette, dalla piu\' recente, con i numeri che servono alla tabella', () => {
  const r = st.riassunto(CH, { periodo: '7', ora: ORA });
  assert.equal(r.ultime.length, 3, 'le ultime non dipendono dal periodo');
  assert.equal(r.ultime[0].picco, 40);
  assert.equal(r.ultime[2].picco, 90);
  assert.deepEqual(Object.keys(r.ultime[0]), ['id', 'inizio', 'fine', 'durataMs', 'picco', 'media', 'messaggi', 'persone', 'follow', 'clip']);
});

test('ore guardate e presenze arrivano dai loro registri', () => {
  const r = st.riassunto(CH, { periodo: '7', ora: ORA });
  assert.deepEqual(r.ore, [{ user: 'Tizio', secondi: 7200 }, { user: 'Caio', secondi: 600 }]);
  assert.ok(Array.isArray(r.presenze));
});

test('un periodo sconosciuto ricade sui sette giorni', () => {
  assert.equal(st.periodoValido('90'), '7');
  assert.equal(st.periodoValido(undefined), '7');
  assert.equal(st.periodoValido('tutto'), 'tutto');
  assert.equal(st.periodoValido(30), '30');
});

// LA SERATA IN CORSO. Un rapporto nasce quando la diretta finisce: finche' eri
// in onda la scheda diceva zero dirette, zero minuti, zero picco — mentre i
// messaggi in chat, che sono righe nel database, salivano. Da fuori sembrava
// rotta.
test('la diretta in corso si conta, col suo picco e i suoi minuti', () => {
  const senza = st.riassunto(CH, { periodo: '7', ora: ORA });
  const con = st.riassunto(CH, { periodo: '7', ora: ORA, inCorso: { inizio: ORA - 3600_000, picco: 12 } });
  assert.equal(con.dirette.n, senza.dirette.n + 1, 'una diretta in piu\': quella di adesso');
  assert.equal(con.dirette.oreMs, senza.dirette.oreMs + 3600_000, 'e i minuti da quando e\' cominciata');
  assert.equal(con.dirette.inCorso.picco, 12);
  assert.equal(con.dirette.inCorso.durataMs, 3600_000);
  assert.ok(!senza.dirette.inCorso, 'senza diretta in corso non compare niente');
});

test('il picco e\' il piu\' alto, non la somma', () => {
  const alto = st.riassunto(CH, { periodo: '7', ora: ORA, inCorso: { inizio: ORA - 1000, picco: 500 } });
  assert.equal(alto.dirette.picco, 500, 'se adesso c\'e\' piu\' gente che mai, il picco e\' quello');
  const basso = st.riassunto(CH, { periodo: '7', ora: ORA, inCorso: { inizio: ORA - 1000, picco: 2 } });
  const senza = st.riassunto(CH, { periodo: '7', ora: ORA });
  assert.equal(basso.dirette.picco, senza.dirette.picco, 'se e\' meno del record del periodo, il record resta quello');
});

test('una serata cominciata prima del periodo porta dentro solo la sua parte di adesso', () => {
  const senza = st.riassunto(CH, { periodo: '7', ora: ORA });
  // accesa da venti giorni (caso limite, ma la regola dev\'essere quella)
  const con = st.riassunto(CH, { periodo: '7', ora: ORA, inCorso: { inizio: ORA - 20 * G, picco: 5 } });
  assert.equal(con.dirette.oreMs, senza.dirette.oreMs + 7 * G, 'non porta dentro le ore di prima del periodo');
  // e «da sempre» le conta tutte
  const sempre = st.riassunto(CH, { periodo: 'tutto', ora: ORA, inCorso: { inizio: ORA - 20 * G, picco: 5 } });
  const sempreSenza = st.riassunto(CH, { periodo: 'tutto', ora: ORA });
  assert.equal(sempre.dirette.oreMs, sempreSenza.dirette.oreMs + 20 * G);
});

test('una diretta che comincia adesso non fa sparire niente', () => {
  const senza = st.riassunto(CH, { periodo: '7', ora: ORA });
  const con = st.riassunto(CH, { periodo: '7', ora: ORA, inCorso: { inizio: ORA, picco: 0 } });
  assert.equal(con.dirette.oreMs, senza.dirette.oreMs, 'zero minuti in piu\'');
  assert.equal(con.dirette.n, senza.dirette.n + 1, 'ma la diretta c\'e\'');
  assert.equal(con.messaggi, senza.messaggi, 'e la chat non cambia');
});
