// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I COLPI SU KICK (docs/COLPI.md, «Su Kick»), sul registro e sui saldi veri.
// Le garanzie, ognuna rotta apposta:
//  · la persona di Kick e' `k:<id>`: mai la stessa di un id Twitch uguale;
//  · la valuta viene dalla persona: i Kicks da spendere di chi e' su Kick, i
//    Bit di chi e' su Twitch, e non si sommano mai;
//  · una mira raccoglie in una valuta sola: un pezzo dell'altra non ci entra e
//    resta a chi l'ha mandato;
//  · il regalo col codice paga (anche a pezzi), chi ha mirato con l'accesso a
//    Kick paga senza codice, e quello che avanza diventa Kicks da spendere;
//  · un colpo a Kicks che non compare: i Kicks tornano, come Kicks, con la
//    resa scritta sulla mira;
//  · dalla pagina e dalla chat i Kicks si spendono solo da chi e' su Kick.
import test from 'node:test';
import assert from 'node:assert/strict';

const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const usaEGetta = cartellaUsaEGetta('andrybot-colpi-kicks-');
process.on('exit', () => usaEGetta.pulisci());
const { registroColpi, pewBit, pewZaino, points } = await import('../../src/db.js');
const economia = await import('../../src/features/economia.js');
const { normColpi, CAMPI_PREMIO, normalizza, valutaDi, personaKick, serveIn, chiedeKicks, rispostaBit, mistiDi, metodiDi, parolaChat } = await import('../../src/features/colpi.js');
const { creaServizioColpi, CONSEGNA_MS } = await import('../../src/features/colpi-servizio.js');

let n = 0;
const login = () => `kicks${++n}`;
const VOCE = { comando: 'torta', nome: 'Torta', bit: 100, kicks: 100, monete: 40, misti: { kicks: { monete: 10, kicks: 30 }, bit: { monete: 10, bit: 30 } } };

function banco({ kicksPew = {}, bitPew = {}, voce = {} } = {}) {
  let adesso = Date.parse('2026-10-28T09:00:00Z');
  const stato = { live: true, overlay: true, mostra: true };
  const sparati = [];
  const cfg = { attivo: true, attesaSec: 0, alMinuto: 60, voci: [{ ...VOCE, ...voce }], bitPew: { attivo: true, ...bitPew }, kicksPew: { attivo: true, ...kicksPew }, zaino: { attivo: true },
    chat: { attivo: true, x: 25, y: 75 } };
  const s = creaServizioColpi({
    registro: registroColpi,
    effects: { fireConOpzioni: (l, c, o) => { sparati.push(o); return stato.mostra; } },
    effettoDi: () => ({ tipo: 'immagine' }),
    impostazioni: () => cfg,
    inOnda: () => stato.live, overlay: () => stato.overlay,
    chiudiPremio: async () => true,
    monete: { punta: economia.punta, rendi: economia.rendi, saldo: economia.saldo },
    crediti: pewBit, zaino: pewZaino,
    ora: () => adesso,
  });
  return { s, cfg, stato, sparati, avanti: (ms) => { adesso += ms; }, ora: () => adesso };
}
const mira = (b, c, extra = {}) => b.s.mira(c, { voce: 'torta', x: 50, y: 50, chiave: Math.random().toString(36), ...extra }).mira;

test('il modello: la persona di Kick, la valuta dalla persona, il prezzo e il misto in Kicks', () => {
  assert.deepEqual([personaKick(7), personaKick(''), valutaDi('k:7'), valutaDi('7'), valutaDi('-')], ['k:7', '', 'kicks', 'bit', 'bit']);
  const cfg = normalizza({ voci: [VOCE], kicksPew: { resa: 50, scadenza: { tipo: 'dopo', quanti: 2, unita: 'settimane' } } });
  const v = cfg.voci[0];
  assert.deepEqual([v.kicks, metodiDi(v).includes('kicks'), mistiDi(v).find((x) => x.modo === 'kicks')], [100, true, { modo: 'kicks', monete: 10, resto: 30 }]);
  assert.deepEqual([cfg.kicksPew.attivo, cfg.kicksPew.resa, cfg.kicksPew.scadenza.unita, cfg.bitPew.resa], [true, 50, 'settimane', 100], 'regole sue, separate da quelle dei Bit');
  assert.ok(chiedeKicks(cfg, '!pew kicks') && chiedeKicks(cfg, '!PEW kick') && !chiedeKicks(cfg, '!pew bit'));
  assert.equal(rispostaBit(cfg, 'it', { nome: '@m', saldo: 30, pagina: 'p' }, 'kicks'), '@m hai 30 Kicks da spendere su p');
  assert.equal(rispostaBit(cfg, 'en', { nome: '@m', saldo: 30, pagina: 'p' }), '@m you have 30 Bits to spend on p');
  assert.equal(parolaChat({ comando: 'kicks' }), '', '«!pew kicks» resta il saldo');
  assert.deepEqual([serveIn({ prezzi: { bit: 100, kicks: 80 } }, 'kicks'), serveIn({ prezzi: { bit: 100, kicks: 80 }, versati: 20, valuta: 'bit' }, 'kicks'), serveIn({ prezzi: { bit: 100 }, versati: 20, valuta: '' }, 'bit')], [80, 0, 100],
    'una mira che raccoglie nell\'altra valuta non ne chiede; quelle di prima raccoglievano Bit');
});

test('il registro: una mira raccoglie in una valuta sola', () => {
  const b = banco();
  const c = login();
  const m = mira(b, c);
  assert.equal(registroColpi.versa(m.id, 30, 'k:1', '', null, 'kicks'), 30);
  assert.equal(registroColpi.versa(m.id, 30, '2', '', null, 'bit'), null, 'i Bit non entrano in una mira di Kicks');
  assert.deepEqual([registroColpi.get(m.id).versati, registroColpi.get(m.id).valuta], [30, 'kicks']);
});

test('il regalo col codice paga, anche a pezzi; il resto diventa Kicks da spendere, della persona di Kick', () => {
  const b = banco({ voce: { misti: {} } });
  const c = login();
  const m = mira(b, c);
  const r1 = b.s.daKicks(c, { kicks: 60, message: `per te ${m.codice.toLowerCase()}`, user_login: 'marta', user_id: '7', evento: 'e1' });
  assert.deepEqual([r1.esito, r1.mancano], ['pochi', 40]);
  const r2 = b.s.daKicks(c, { kicks: 100, message: m.codice, user_login: 'marta', user_id: '7', evento: 'e2' });
  assert.deepEqual([r2.esito, registroColpi.get(m.id).metodo, b.sparati.length], ['pagato', 'kicks', 1]);
  assert.deepEqual([pewBit.saldo(c, 'k:7', b.ora()), pewBit.saldo(c, '7', b.ora())], [60, 0], 'i 60 di troppo sono Kicks di k:7, non Bit dell\'id Twitch 7');
  assert.equal(b.s.daKicks(c, { kicks: 500, message: 'grazie', user_login: 'marta', user_id: '7', evento: 'e2' }).kicksPew, undefined, 'lo stesso regalo due volte non conta');
  const mm = mira(banco(), c);
  assert.equal(b.s.daKicks(c, { kicks: 40, message: mm.codice, user_login: 'marta', user_id: '7', evento: 'e3' }).esito, 'servono-monete', 'col misto: i Kicks del resto ci sono, mancano le monete');
});

test('i Bit su una mira di Kicks non entrano: vanno ai Bit da spendere di chi li manda', () => {
  const b = banco();
  const c = login();
  const m = mira(b, c);
  b.s.daKicks(c, { kicks: 30, message: m.codice, user_login: 'marta', user_id: '7', evento: 'k1' });
  const r = b.s.daCheer(c, { bits: 100, message: `Cheer100 ${m.codice}`, user_login: 'luca', user_id: '9', evento: 'c1' });
  assert.deepEqual([r.esito, registroColpi.get(m.id).versati, registroColpi.get(m.id).stato], ['sconosciuto', 30, 'attesa']);
  assert.equal(pewBit.saldo(c, '9', b.ora()), 100, 'i suoi Bit restano suoi, da spendere');
});

test('chi ha mirato con l\'accesso a Kick paga col regalo senza codice; i Kicks da spendere pagano dalla pagina', () => {
  const b = banco();
  const c = login();
  const m = mira(b, c, { spettatore: 'k:7' });
  assert.equal(b.s.daKicks(c, { kicks: 100, message: 'vai', user_login: 'marta', user_id: '7', evento: 'g1' }).esito, 'pagato');
  pewBit.entra(c, 'k:7', 150, 'regalo:x');
  const p = mira(b, c, { spettatore: 'k:7' });
  const r = b.s.subito(c, p.id, { con: 'kicks', chi: 'k:7', nome: 'Marta' });
  assert.deepEqual([r.esito, r.kicks, pewBit.saldo(c, 'k:7', b.ora()), registroColpi.get(p.id).metodo], ['pagato', 100, 50, 'kicks']);
  const t = mira(b, c, { spettatore: '7' });
  pewBit.entra(c, '7', 500, 'cheer:y');
  assert.deepEqual(b.s.subito(c, t.id, { con: 'kicks', chi: '7' }), { esito: 'mezzo' }, 'chi e\' su Twitch non spende Kicks');
  const u = mira(b, c, { spettatore: 'k:7' });
  assert.deepEqual(b.s.subito(c, u.id, { con: 'bit', chi: 'k:7' }), { esito: 'mezzo' }, 'e chi e\' su Kick non spende Bit');
});

test('il misto monete + Kicks in un tocco', () => {
  const b = banco();
  const c = login();
  points.dai(c, 'marta', 100);
  pewBit.entra(c, 'k:7', 50, 'regalo:m');
  const m = mira(b, c, { spettatore: 'k:7' });
  const r = b.s.subito(c, m.id, { con: 'misto-kicks', user: 'marta', chi: 'k:7' });
  assert.deepEqual([r.esito, economia.saldo(c, 'marta'), pewBit.saldo(c, 'k:7', b.ora()), registroColpi.get(m.id).metodo], ['pagato', 90, 20, 'monete+kicks']);
});

test('un colpo a Kicks che non compare: i Kicks tornano come Kicks, con la resa della mira', async () => {
  const b = banco({ kicksPew: { resa: 50 } });
  const c = login();
  const m = mira(b, c);
  b.stato.mostra = false;
  b.s.daKicks(c, { kicks: 100, message: m.codice, user_login: 'marta', user_id: '7', evento: 'n1' });
  b.cfg.kicksPew.resa = 10;
  b.avanti(CONSEGNA_MS + 1000);
  await b.s.ronda();
  assert.deepEqual([registroColpi.get(m.id).stato, pewBit.saldo(c, 'k:7', b.ora()), pewBit.saldo(c, '7', b.ora())], ['rimborsata', 50, 0], 'la resa di quando e\' nata (50), non quella di adesso, e nella valuta giusta');
});

test('dalla chat di Kick: coi Kicks della persona di Kick', () => {
  const b = banco();
  const c = login();
  pewBit.entra(c, 'k:7', 120, 'regalo:c');
  const r = b.s.inChat(c, { voce: 'torta', user: 'marta', chi: 'k:7', nome: 'Marta' });
  assert.deepEqual([r.esito, r.mezzo, r.kicks, pewBit.saldo(c, 'k:7', b.ora())], ['pagato', 'kicks', 100, 20]);
  b.cfg.chat.con = ['bit'];
  assert.deepEqual(b.s.inChat(c, { voce: 'torta', user: 'marta', chi: 'k:7', nome: 'Marta' }), { esito: 'mezzo' }, 'i Bit non sono suoi');
  b.cfg.chat.con = ['kicks'];
  pewBit.entra(c, '9', 500, 'cheer:chat');
  assert.deepEqual(b.s.inChat(c, { voce: 'torta', user: 'luca', chi: '9', nome: 'Luca' }), { esito: 'mezzo' }, 'e chi e\' su Twitch non paga coi suoi Bit sotto il nome dei Kicks');
  assert.equal(pewBit.saldo(c, '9', b.ora()), 500);
});

test('Kicks da spendere spenti: il resto del regalo non diventa saldo, e i Bit non cambiano', () => {
  const b = banco({ kicksPew: { attivo: false } });
  const c = login();
  b.s.daKicks(c, { kicks: 300, message: 'ciao', user_login: 'marta', user_id: '7', evento: 's1' });
  assert.equal(pewBit.saldo(c, 'k:7', b.ora()), 0);
  b.s.daCheer(c, { bits: 100, message: 'ciao', user_login: 'luca', user_id: '9', evento: 's2' });
  assert.equal(pewBit.saldo(c, '9', b.ora()), 100);
});

test('i punti del canale su Kick: il premio di Kick paga la mira di quella voce, col codice o con l\'accesso a Kick', () => {
  const ULID = '01HZX3K9Q8W7E6R5T4Y3U20001';
  const b = banco({ voce: { puntiKick: 300, premioKick: ULID, premioKickCosto: 300, premioKickNome: 'Colpo: Torta' } });
  const c = login();
  const m = mira(b, c);
  assert.equal(m.prezzi.puntiKick, 300, 'il prezzo in punti di Kick si scrive sulla mira');
  assert.equal(b.s.daRiscatto(c, { reward_id: ULID, user_input: m.codice, id: 'r1' }).esito, 'non-mio', 'da Twitch un premio di Kick non e\' niente');
  assert.equal(b.s.daRiscatto(c, { reward_id: '01HZX3K9Q8W7E6R5T4Y3U29999', user_input: m.codice, id: 'r1', piattaforma: 'kick' }).esito, 'non-mio');
  const r = b.s.daRiscatto(c, { reward_id: ULID, user_input: `eccolo ${m.codice}`, id: 'r2', user_id: '5', piattaforma: 'kick' });
  assert.deepEqual([r.esito, r.stato], ['pagato', null]);
  assert.equal(b.s.daRiscatto(c, { reward_id: ULID, user_input: m.codice, id: 'r3', piattaforma: 'kick' }).stato, 'CANCELED', 'un codice usato: rifiutato');
  // con l'accesso a Kick: la sua ultima mira aperta, qualunque cosa scriva
  const mia = mira(b, c, { spettatore: personaKick(42) });
  assert.equal(b.s.daRiscatto(c, { reward_id: ULID, user_input: 'ciao', id: 'r4', user_id: '42', piattaforma: 'kick' }).esito, 'pagato');
  assert.equal(registroColpi.get(mia.id).stato, 'pagata');
  // il costo deve coincidere: una mira presa a un altro prezzo non si paga
  const altro = banco({ voce: { puntiKick: 300, premioKick: ULID, premioKickCosto: 200 } });
  const c2 = login();
  const m2 = mira(altro, c2);
  assert.equal(altro.s.daRiscatto(c2, { reward_id: ULID, user_input: m2.codice, id: 'r5', piattaforma: 'kick' }).stato, 'CANCELED');
});

test('il pannello non scrive gli id dei premi, ne\' di Twitch ne\' di Kick: un salvataggio non li scorda', () => {
  const ULID = '01HZX3K9Q8W7E6R5T4Y3U20007';
  const prima = { voci: [{ id: 'torta', comando: 'torta', puntiKick: 300, premioKick: ULID, premioKickCosto: 300, premioKickNome: 'Colpo: Torta', premio: 'abcdef12-0001', premioCosto: 500, premioNome: 'Colpo: Torta' }] };
  const v = normColpi({ voci: [{ id: 'torta', comando: 'torta', puntiKick: 300, premioKick: '01HZX3K9Q8W7E6R5T4Y3U2FALS', premio: 'ffffffff-9999' }] }, prima).voci[0];
  assert.deepEqual(CAMPI_PREMIO.map((k) => v[k]), CAMPI_PREMIO.map((k) => normalizza(prima).voci[0][k]), 'tutti i campi dei premi vengono da quello salvato');
  const nuova = normColpi({ voci: [{ id: 'pizza', comando: 'pizza', premioKick: ULID, premioKickCosto: 9 }] }, prima).voci[0];
  assert.deepEqual([nuova.premioKick, nuova.premioKickCosto, nuova.premio], ['', 0, ''], 'una voce nuova non porta premi inventati');
});
