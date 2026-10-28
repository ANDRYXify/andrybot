// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO ZAINO (docs/COLPI.md, «Lo zaino»): un colpo comprato per dopo, che lo
// spettatore ritrova sulla pagina di quel canale e lancia quando vuole.
// Le garanzie, ognuna rotta apposta:
//  · comprato vuol dire nello zaino, una volta sola, qualunque cosa lo paghi,
//    anche a diretta spenta; mai all'overlay;
//  · di quel canale e di quella persona;
//  · il massimo tiene contando gli acquisti ancora aperti;
//  · si lancia consumando un oggetto (il primo che scade); se il lancio non
//    compare, torna nello zaino;
//  · scade quando dice lo streamer, e tornano solo i saldi, se lo vuole;
//  · lo streamer sceglie con cosa si compra per dopo.
import test from 'node:test';
import assert from 'node:assert/strict';

const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const usaEGetta = cartellaUsaEGetta('andrybot-colpi-zaino-');
process.on('exit', () => usaEGetta.pulisci());
const { registroColpi, pewBit, pewZaino, points } = await import('../../src/db.js');
const economia = await import('../../src/features/economia.js');
const { normalizza, zainoDi, chiedeZaino, rispostaZaino } = await import('../../src/features/colpi.js');
const { creaServizioColpi, CONSEGNA_MS } = await import('../../src/features/colpi-servizio.js');
const { creaPortaColpi } = await import('../../src/features/colpi-porta.js');

let n = 0;
const login = () => `zaino${++n}`;

function banco({ voce = { comando: 'pomodoro', bit: 100, monete: 40, punti: 500, premio: 'aaaaaaaa-1111' }, zaino = {} } = {}) {
  let adesso = Date.parse('2026-10-28T09:00:00Z');
  const stato = { live: true, overlay: true, mostra: true };
  const sparati = [], premi = [];
  const cfg = { attivo: true, attesaSec: 0, alMinuto: 60, voci: [voce], zaino: { attivo: true, ...zaino } };
  const s = creaServizioColpi({
    registro: registroColpi,
    effects: { fireConOpzioni: (l, c, o) => { sparati.push({ l, ...o }); return stato.mostra; } },
    effettoDi: () => ({ tipo: 'immagine' }),
    impostazioni: () => cfg,
    inOnda: () => stato.live, overlay: () => stato.overlay,
    chiudiPremio: async (l, premio, riscatto, st) => { premi.push([premio, riscatto, st]); return true; },
    monete: { punta: economia.punta, rendi: economia.rendi, saldo: economia.saldo },
    crediti: pewBit, zaino: pewZaino,
    ora: () => adesso,
  });
  return { s, cfg, stato, sparati, premi, avanti: (ms) => { adesso += ms; }, ora: () => adesso };
}
const compra = (b, c, chi = '21', extra = {}) => b.s.mira(c, { voce: 'pomodoro', chiave: chi, spettatore: chi, dopo: true, ...extra });

test('il modello: spento di serie; per voce come gli altri, no, mai o dopo un tempo; «!pew zaino»', () => {
  assert.equal(normalizza({}).zaino.attivo, false, 'lo accende lo streamer');
  const cfg = normalizza({ zaino: { attivo: true, scadenza: { tipo: 'dopo', quanti: 7, unita: 'giorni' } }, voci: [
    { comando: 'a', bit: 1 }, { comando: 'b', bit: 1, zaino: { modo: 'no' } }, { comando: 'c', bit: 1, zaino: { modo: 'mai' } }, { comando: 'd', bit: 1, zaino: { modo: 'dopo', quanti: 2, unita: 'ore' } }] });
  const [a, b, c, d] = cfg.voci;
  assert.deepEqual([zainoDi(cfg, a).tipo, zainoDi(cfg, a).quanti, zainoDi(cfg, b), zainoDi(cfg, c).tipo, zainoDi(cfg, d).unita], ['dopo', 7, null, 'mai', 'ore']);
  assert.equal(zainoDi(normalizza({ voci: [{ comando: 'a', bit: 1 }] }), a), null);
  assert.ok(chiedeZaino(cfg, '!pew zaino') && chiedeZaino(cfg, '!PEW backpack ') && !chiedeZaino(cfg, '!pew zaino x'));
  assert.equal(rispostaZaino(cfg, 'it', { nome: '@m', pagina: 'p', voci: [{ quanti: 2, nome: 'Pomodoro' }, { quanti: 1, nome: 'Risata' }] }), '@m nel tuo zaino: 2 Pomodoro, 1 Risata. Si lanciano da p');
  assert.equal(rispostaZaino(cfg, 'en', { nome: '@m', pagina: 'p', voci: [] }), '@m your backpack is empty: buy hits for later on p');
});

test('comprato per dopo vuol dire nello zaino, anche a diretta spenta, una volta sola, mai all\'overlay', () => {
  const b = banco();
  const c = login();
  b.stato.live = false; b.stato.overlay = false;
  points.dai(c, 'marta', 100);
  assert.deepEqual(b.s.mira(c, { voce: 'pomodoro', dopo: true }), { ok: false, motivo: 'accesso' }, 'lo zaino e\' di qualcuno');
  const m = compra(b, c).mira;
  assert.equal(b.s.daMonete(c, { id: m.id, user: 'marta' }).esito, 'pagato');
  assert.equal(registroColpi.get(m.id).stato, 'zaino');
  assert.equal(b.sparati.length, 0, 'niente all\'overlay');
  assert.deepEqual(b.s.zainoDi(c, '21').map((x) => [x.voce, x.quanti]), [['pomodoro', 1]]);
  assert.equal(b.s.daMonete(c, { id: m.id, user: 'marta' }).esito, 'sconosciuto', 'una volta sola');
  assert.equal(economia.saldo(c, 'marta'), 60);
  assert.deepEqual(b.s.zainoDi(login(), '21'), [], 'un altro canale non lo vede');
  assert.deepEqual(b.s.zainoDi(c, '22'), [], 'un\'altra persona nemmeno');
  const k = compra(b, c).mira;
  assert.deepEqual([b.s.daCheer(c, { bits: 100, message: `Cheer100 ${k.codice}`, user_login: 'marta', user_id: '21', evento: 'z1' }).dopo, registroColpi.get(k.id).stato], [true, 'zaino'], 'anche col cheer');
  const p = compra(b, c).mira;
  assert.equal(b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: p.codice, id: 'r1' }).dopo, true);
  assert.deepEqual(b.premi, [['aaaaaaaa-1111', 'r1', 'FULFILLED']], 'i punti: il riscatto si chiude subito, il colpo e\' consegnato nello zaino');
  assert.equal(b.s.zainoDi(c, '21')[0].quanti, 3);
});

test('il massimo tiene contando gli acquisti ancora aperti, in tutto e per voce', () => {
  const b = banco({ zaino: { massimo: 2 } });
  const c = login();
  assert.equal(compra(b, c).ok, true);
  assert.equal(compra(b, c).ok, true);
  assert.deepEqual(compra(b, c), { ok: false, motivo: 'zaino-pieno', massimo: 2 }, 'due aperti: pieno, prima ancora di pagare');
  b.cfg.zaino = { attivo: true, massimoVoce: 1 };
  const c2 = login();
  const m = compra(b, c2).mira;
  pewBit.entra(c2, '21', 100, 'cheer:x');
  assert.equal(b.s.daBitPew(c2, { id: m.id, chi: '21' }).esito, 'pagato');
  assert.equal(compra(b, c2).motivo, 'zaino-pieno', 'uno nello zaino per quella voce: basta');
});

test('si lancia consumando il primo che scade; se il lancio non compare torna nello zaino, e solo una volta', async () => {
  const b = banco({ zaino: { scadenza: { tipo: 'dopo', quanti: 3, unita: 'giorni', grazia: 5 } } });
  const c = login();
  points.dai(c, 'marta', 1000);
  for (let i = 0; i < 2; i++) b.s.daMonete(c, { id: compra(b, c).mira.id, user: 'marta' });
  b.avanti(86400_000);
  b.s.daMonete(c, { id: compra(b, c).mira.id, user: 'marta' });
  const prima = pewZaino.contenuto(c, '21', b.ora())[0];
  const m = b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'l', spettatore: '21' }).mira;
  b.stato.mostra = false;
  assert.equal(b.s.daZaino(c, { id: m.id, chi: '22' }).esito, 'vuoto', 'lo zaino di un altro no');
  assert.equal(b.s.daZaino(c, { id: m.id, chi: '21' }).esito, 'pagato');
  assert.equal(pewZaino.get(prima.id).stato, 'usato', 'il primo che scade');
  assert.equal(b.s.zainoDi(c, '21')[0].quanti, 2);
  b.avanti(CONSEGNA_MS + 1);
  await b.s.ronda();
  assert.deepEqual([registroColpi.get(m.id).stato, pewZaino.get(prima.id).stato], ['rimborsata', 'pieno'], 'non comparso: torna');
  await b.s.ronda();
  assert.equal(b.s.zainoDi(c, '21')[0].quanti, 3, 'una volta sola');
  b.stato.overlay = false;
  const f = b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'f', spettatore: '21' });
  assert.equal(f.ok, false, 'lanciare vuole la diretta e l\'overlay, come sempre');
});

test('scade quando dice lo streamer, per tutti o per colpo; tornano solo i saldi, se li vuole rendere', async () => {
  const b = banco({ voce: { comando: 'pomodoro', bit: 100, monete: 40, euro: 200, zaino: { modo: 'dopo', quanti: 2, unita: 'ore' } } });
  const c = login();
  points.dai(c, 'marta', 40);
  b.s.daMonete(c, { id: compra(b, c).mira.id, user: 'marta' });
  pewBit.entra(c, '21', 100, 'cheer:a');
  b.s.daBitPew(c, { id: compra(b, c).mira.id, chi: '21' });
  const e = compra(b, c).mira;
  registroColpi.lega(e.id, 'stripe:cs_z_' + c);
  b.s.daPagamento('stripe:cs_z_' + c);
  assert.equal(b.s.zainoDi(c, '21')[0].quanti, 3, 'anche gli euro');
  assert.deepEqual([economia.saldo(c, 'marta'), pewBit.saldo(c, '21', b.ora())], [0, 0]);
  b.avanti(2 * 3600_000);
  assert.deepEqual(b.s.zainoDi(c, '21'), [], 'due ore, come vuole la voce: non ci sono piu\'');
  await b.s.ronda();
  assert.deepEqual([economia.saldo(c, 'marta'), pewBit.saldo(c, '21', b.ora())], [40, 100], 'tornano le monete e i Bit, coi loro lotti');
  await b.s.ronda();
  assert.deepEqual([economia.saldo(c, 'marta'), pewBit.saldo(c, '21', b.ora())], [40, 100], 'una volta sola');
  const b2 = banco({ zaino: { rendi: false, scadenza: { tipo: 'dopo', quanti: 1, unita: 'ore' } } });
  const c2 = login();
  points.dai(c2, 'luca', 40);
  b2.s.daMonete(c2, { id: compra(b2, c2, '30').mira.id, user: 'luca' });
  b2.avanti(3600_000);
  await b2.s.ronda();
  assert.equal(economia.saldo(c2, 'luca'), 0, 'lo streamer non le rende: restano spese');
});

test('lo streamer sceglie con cosa si compra per dopo; la pagina offre lo zaino solo dove si puo\'', () => {
  const b = banco({ zaino: { con: { monete: false, cheer: false } } });
  const c = login();
  points.dai(c, 'marta', 100);
  const m = compra(b, c).mira;
  assert.deepEqual(b.s.daMonete(c, { id: m.id, user: 'marta' }), { esito: 'fermo', motivo: 'mezzo', nome: 'pomodoro' });
  assert.equal(economia.saldo(c, 'marta'), 100);
  assert.equal(b.s.daCheer(c, { bits: 100, message: `Cheer100 ${m.codice}`, user_login: 'marta', user_id: '21', evento: 'q1' }).esito, 'sconosciuto', 'il cheer non la paga');
  assert.equal(registroColpi.get(m.id).stato, 'attesa');
  b.cfg.voci[0].zaino = { modo: 'no' };
  const p = creaPortaColpi({ servizio: b.s, registro: registroColpi, streamers: { get: () => ({ settings: { colpi: b.cfg } }) },
    effettoDi: () => ({ tipo: 'immagine', file: 'p.png' }), mezziEuro: () => [], apriPagamento: async () => ({}), inOnda: () => true, overlay: () => true, ora: b.ora });
  assert.equal(p.dati(c).voci[0].zaino, false, 'quella voce non si compra per dopo');
  delete b.cfg.voci[0].zaino;
  assert.equal(p.dati(c).voci[0].zaino, true);
  assert.deepEqual(p.dati(c).zaino.con.monete, false);
});

test('la porta: comprare per dopo e lanciare dallo zaino, in un tocco, solo con l\'accesso', () => {
  const b = banco();
  const c = login();
  points.dai(c, 'marta', 100);
  const p = creaPortaColpi({ servizio: b.s, registro: registroColpi, streamers: { get: () => ({ settings: { colpi: b.cfg } }) },
    effettoDi: () => ({ tipo: 'immagine', file: 'p.png' }), mezziEuro: () => [], apriPagamento: async () => ({}), inOnda: () => true, overlay: () => true, ora: b.ora });
  const io = { id: '21', login: 'marta', nome: 'Marta' };
  const aperte = registroColpi.aperteDa(c, 0);
  assert.deepEqual(p.lancia(c, { voce: 'pomodoro', con: 'zaino', x: 10, y: 10 }, 'ip', io), { ok: false, motivo: 'vuoto' });
  assert.equal(registroColpi.aperteDa(c, 0), aperte, 'zaino vuoto: la mira non si apre nemmeno');
  const r = p.lancia(c, { voce: 'pomodoro', con: 'monete', dopo: true }, 'ip', io);
  assert.deepEqual([r.ok, r.mira.stato, r.mira.dopo], [true, 'zaino', true]);
  assert.deepEqual(p.saldi(c, io).zaino, [{ voce: 'pomodoro', nome: 'pomodoro', quanti: 1, quando: '' }]);
  assert.equal(b.sparati.length, 0);
  const l = p.lancia(c, { voce: 'pomodoro', con: 'zaino', x: 30, y: 30 }, 'ip', io);
  assert.deepEqual([l.ok, l.mira.metodo], [true, 'zaino']);
  assert.equal(b.sparati.length, 1, 'e parte');
  assert.deepEqual(p.saldi(c, io).zaino, []);
  assert.deepEqual(p.mira(c, { voce: 'pomodoro', dopo: true }, 'ip', null), { ok: false, motivo: 'accesso' });
});

test('«inattivo»: ogni acquisto e ogni lancio tengono vivi tutti i colpi dello zaino', () => {
  const b = banco({ zaino: { scadenza: { tipo: 'inattivo', quanti: 2, unita: 'ore' } } });
  const c = login();
  points.dai(c, 'marta', 1000);
  b.s.daMonete(c, { id: compra(b, c).mira.id, user: 'marta' });
  b.avanti(90 * 60_000);
  b.s.daMonete(c, { id: compra(b, c).mira.id, user: 'marta' });
  b.avanti(90 * 60_000);
  assert.equal(b.s.zainoDi(c, '21')[0]?.quanti, 2, 'il primo era a 3 ore: il secondo acquisto l\'ha spostato');
  const m = b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: 'l', spettatore: '21' }).mira;
  assert.equal(b.s.daZaino(c, { id: m.id, chi: '21' }).esito, 'pagato');
  b.avanti(110 * 60_000);
  assert.equal(b.s.zainoDi(c, '21')[0]?.quanti, 1, 'il lancio li ha tenuti vivi');
  b.avanti(20 * 60_000);
  assert.deepEqual(b.s.zainoDi(c, '21'), [], 'due ore senza niente: scadono');
  b.s.daMonete(c, { id: compra(b, c).mira.id, user: 'marta' });
  assert.equal(b.s.zainoDi(c, '21')[0]?.quanti, 1, 'un acquisto nuovo non resuscita quelli scaduti');
});
