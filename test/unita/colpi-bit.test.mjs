// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I BIT DA SPENDERE (docs/COLPI.md, «I Bit da spendere»): i Bit mandati al
// canale che non pagano un colpo diventano saldo sulla pagina di Pewpewify.
// Le garanzie, ognuna rotta apposta:
//  · un Bit vale una volta: o paga un colpo, o diventa saldo, mai le due cose;
//  · lo stesso cheer, la stessa spesa, lo stesso rimborso contano una volta;
//  · si spende tutto o niente, mai sotto zero, solo un colpo che puo' comparire;
//  · un colpo a Bit che non compare li rende (quelli del saldo tali e quali,
//    quelli dei cheer con la resa della mira); se un Bit e' di nessuno, resta in coda;
//  · i Bit di una mira mai pagata tornano a chi li ha mandati, una volta.
import test from 'node:test';
import assert from 'node:assert/strict';

const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const usaEGetta = cartellaUsaEGetta('andrybot-colpi-bit-');
process.on('exit', () => usaEGetta.pulisci());
const { registroColpi, pewBit, points } = await import('../../src/db.js');
const economia = await import('../../src/features/economia.js');
const { normalizza, bitResi, togliUltimi, chiedeBit, BIT_PEW } = await import('../../src/features/colpi.js');
const { creaServizioColpi, CONSEGNA_MS } = await import('../../src/features/colpi-servizio.js');
const { creaPortaColpi } = await import('../../src/features/colpi-porta.js');

let n = 0;
const login = () => `bitpew${++n}`;

function banco({ voce = { comando: 'pomodoro', bit: 100 }, bitPew, attivo = true, conMonete = false, presente } = {}) {
  let adesso = 5_000_000;
  const stato = { live: true, overlay: true, mostra: true };
  const sparati = [];
  const cfg = { attivo, attesaSec: 0, alMinuto: 60, voci: [voce], ...(bitPew ? { bitPew } : {}) };
  const s = creaServizioColpi({
    registro: registroColpi,
    effects: { fireConOpzioni: (l, c, o) => { sparati.push({ l, ...o }); return stato.mostra; } },
    effettoDi: () => ({ tipo: 'immagine' }),
    impostazioni: () => cfg,
    inOnda: () => stato.live, overlay: () => stato.overlay,
    monete: conMonete ? { punta: economia.punta, rendi: economia.rendi, saldo: economia.saldo } : null,
    crediti: pewBit,
    ora: () => adesso,
    ...(presente ? { presente } : {}),
  });
  return { s, cfg, stato, sparati, avanti: (ms) => { adesso += ms; }, ora: () => adesso };
}
const mira = (b, c, k = 'a', extra = {}) => b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: k, ...extra }).mira;

test('il modello: accesi alla pari di serie, la resa nei limiti; i Bit di troppo sono gli ultimi arrivati', () => {
  const d = normalizza({}).bitPew;
  assert.deepEqual([d.attivo, d.resa, d.scadenza.tipo], [true, 100, 'mai'], 'chiesto: «pari bit», e di serie non scadono');
  const x = normalizza({ bitPew: { attivo: false, resa: 5000 } }).bitPew;
  assert.deepEqual([x.attivo, x.resa], [false, BIT_PEW.resa[1]]);
  assert.equal(normalizza({ bitPew: { resa: 0 } }).bitPew.resa, 1);
  assert.deepEqual([bitResi(100, 250), bitResi(50, 125), bitResi(0, 999), bitResi(100, -3)], [250, 62, 0, 0], 'per difetto: mai un Bit in piu\' di quelli mandati');
  assert.deepEqual(togliUltimi([['a', 30], ['b', 50], ['c', 40]], 60), { resto: [['a', 30], ['b', 30]], resi: [['c', 40, ''], ['b', 20, '']] });
  assert.deepEqual(togliUltimi([['a', 30]], 0), { resto: [['a', 30]], resi: [] });
  const cfg = normalizza({ comando: 'colpo' });
  assert.ok(chiedeBit(normalizza({}), '!pew bit') && chiedeBit(normalizza({}), '  !PEW Bits ') && chiedeBit(cfg, '!colpo bit'));
  assert.ok(!chiedeBit(normalizza({}), '!pew K7QX3 bit') && !chiedeBit(normalizza({}), '!pew bit ciao') && !chiedeBit(cfg, '!pew bit'));
});

test('il registro: un movimento per riferimento, mai sotto zero, per canale', () => {
  const c = login();
  assert.equal(pewBit.entra(c, '11', 100, 'cheer:x', { nome: 'Marta' }), 100);
  assert.equal(pewBit.entra(c, '11', 100, 'cheer:x'), 0, 'lo stesso cheer due volte');
  assert.equal(pewBit.saldo(c, '11'), 100);
  assert.equal(pewBit.spendi(c, '11', 101, 'spesa:1'), null, 'non sotto zero');
  assert.equal(pewBit.saldo(c, '11'), 100, 'e niente si muove');
  assert.deepEqual(pewBit.spendi(c, '11', 100, 'spesa:1'), [{ scade: 0, quanti: 100 }]);
  assert.equal(pewBit.spendi(c, '11', 100, 'spesa:1'), null, 'la stessa spesa due volte');
  assert.equal(pewBit.saldo(c, '11'), 0);
  assert.equal(pewBit.saldo(login(), '11'), 0, 'un altro canale non lo vede');
  pewBit.entra(c, '12', 40, 'cheer:y', { nome: 'luca' });
  pewBit.entra(c, '11', 70, 'cheer:z');
  assert.deepEqual(pewBit.totali(c), { persone: 2, bit: 110 });
  assert.deepEqual(pewBit.primi(c).map((p) => [p.nome, p.saldo]), [['marta', 70], ['luca', 40]], 'il nome resta quello visto');
});

test('i lotti: si spende prima quello che scade prima, uno scaduto non c\'e\' piu\', la ricevuta li rende com\'erano', () => {
  const c = login(), T0 = 10_000_000;
  pewBit.entra(c, '1', 50, 'a', { scade: 0, ora: T0 });
  pewBit.entra(c, '1', 30, 'b', { scade: T0 + 5000, ora: T0 });
  pewBit.entra(c, '1', 20, 'c', { scade: T0 + 1000, ora: T0 });
  assert.deepEqual(pewBit.prossima(c, '1', T0), { scade: T0 + 1000, quanti: 20 });
  const r = pewBit.spendi(c, '1', 40, 's1', { ora: T0 });
  assert.deepEqual(r, [{ scade: T0 + 1000, quanti: 20 }, { scade: T0 + 5000, quanti: 20 }], 'prima quelli che scadono prima');
  assert.equal(pewBit.saldo(c, '1', T0 + 6000), 50, 'i 10 rimasti del lotto a T0+5000 non ci sono piu\', senza pulizia');
  assert.equal(pewBit.totali(c, T0 + 6000).bit, 50);
  assert.equal(pewBit.rendi(c, '1', r, 'r1', { almeno: T0 + 9000, ora: T0 + 6000 }), 40);
  assert.equal(pewBit.rendi(c, '1', r, 'r1', { ora: T0 + 6000 }), 0, 'la stessa ricevuta due volte');
  assert.equal(pewBit.saldo(c, '1', T0 + 8999), 90, 'i lotti scaduti intanto tornano validi fino ad «almeno»');
  assert.equal(pewBit.saldo(c, '1', T0 + 9000), 50);
  pewBit.pulisci(T0 + 9000);
  assert.equal(pewBit.saldo(c, '1', T0 + 9000), 50, 'la pulizia non cambia il saldo');
  assert.equal(pewBit.entra(c, '1', 100, 't', { tetto: 80, ora: T0 + 9000 }), 30, 'il tetto: entra solo fino al massimo');
  assert.equal(pewBit.entra(c, '1', 5, 't2', { tetto: 80, ora: T0 + 9000 }), 0, 'al tetto, niente');
});

test('«inattivo»: ogni movimento sposta in avanti tutti i suoi lotti; la correzione dello streamer', () => {
  const c = login(), T0 = 20_000_000;
  pewBit.entra(c, '1', 10, 'a', { scade: T0 + 100, rinnova: T0 + 100, ora: T0 });
  pewBit.entra(c, '1', 10, 'b', { scade: T0 + 150, rinnova: T0 + 150, ora: T0 + 50 });
  assert.deepEqual(pewBit.prossima(c, '1', T0 + 50), { scade: T0 + 150, quanti: 20 }, 'il primo lotto ha preso la scadenza nuova');
  pewBit.spendi(c, '1', 5, 's', { rinnova: T0 + 300, ora: T0 + 120 });
  assert.equal(pewBit.saldo(c, '1', T0 + 299), 15, 'anche spendere tiene vivi gli altri');
  assert.equal(pewBit.saldo(c, '1', T0 + 300), 0);
  assert.equal(pewBit.imposta(c, '1', 40, 'st1', { scade: 0, ora: T0 + 120 }), 40, 'in su: un lotto nuovo');
  assert.equal(pewBit.imposta(c, '1', 12, 'st2', { ora: T0 + 120 }), 12, 'in giu\': prima quello che scade prima');
  assert.equal(pewBit.saldo(c, '1', T0 + 400), 12, 'e restano quelli che non scadono');
});

test('la porta della presenza: senza, il cheer resta un cheer ma non va da spendere; quello che paga un colpo passa (docs/COLPI.md, «La presenza come porta»)', () => {
  const chiesti = [];
  const dentro = new Set();
  const b = banco({ presente: (ch, chi) => { chiesti.push(chi); return dentro.has(chi); } });
  const c = login();
  const r = b.s.daCheer(c, { bits: 300, message: 'Cheer300 bravo!', user_login: 'marta', user_id: '21', evento: 'p1' });
  assert.deepEqual([r.esito, r.fuoriPorta, r.bitPew, pewBit.saldo(c, '21')], ['nessuno', 300, undefined, 0], 'niente nel salvadanaio, e si sa quanti');
  assert.deepEqual(chiesti, ['21'], 'si chiede per la persona del cheer');
  const m = mira(b, c);
  assert.equal(b.s.daCheer(c, { bits: 100, message: `Cheer100 ${m.codice}`, user_login: 'marta', user_id: '21', evento: 'p2' }).esito, 'pagato', 'un colpo col codice si paga anche fuori dalla porta');
  dentro.add('21');
  assert.equal(b.s.daCheer(c, { bits: 300, message: 'Cheer300 eccomi', user_login: 'marta', user_id: '21', evento: 'p3' }).bitPew, 300, 'presente: da spendere');
});

test('un cheer che non paga un colpo diventa saldo: una volta, a nome suo, con la resa dello streamer', () => {
  const b = banco();
  const c = login();
  const r = b.s.daCheer(c, { bits: 300, message: 'Cheer300 bravo!', user_login: 'marta', user_id: '21', evento: 'm1' });
  assert.deepEqual([r.esito, r.bitPew, r.saldo], ['nessuno', 300, 300]);
  b.s.daCheer(c, { bits: 300, message: 'Cheer300 bravo!', user_login: 'marta', user_id: '21', evento: 'm1' });
  assert.equal(pewBit.saldo(c, '21'), 300, 'Twitch lo rimanda: conta una volta');
  b.s.daCheer(c, { bits: 50, message: 'Cheer50 ZZZZ9', user_login: 'marta', user_id: '21', evento: 'm2' });
  assert.equal(pewBit.saldo(c, '21'), 350, 'anche col codice sbagliato: nessun Bit va perso');
  b.s.daCheer(c, { bits: 500, message: 'Cheer500', is_anonymous: true, user_id: '', evento: 'm3' });
  assert.deepEqual(pewBit.totali(c), { persone: 1, bit: 350 }, 'un cheer anonimo non e\' di nessuno');
  b.cfg.bitPew = { attivo: true, resa: 50 };
  b.s.daCheer(c, { bits: 101, message: 'Cheer101', user_login: 'marta', user_id: '21', evento: 'm4' });
  assert.equal(pewBit.saldo(c, '21'), 400);
  b.cfg.bitPew = { attivo: false };
  b.s.daCheer(c, { bits: 100, message: 'Cheer100', user_login: 'marta', user_id: '21', evento: 'm5' });
  b.cfg.bitPew = undefined; b.cfg.attivo = false;
  b.s.daCheer(c, { bits: 100, message: 'Cheer100', user_login: 'marta', user_id: '21', evento: 'm6' });
  assert.equal(pewBit.saldo(c, '21'), 400, 'spenti, o con la pagina spenta, i Bit restano solo al canale');
});

test('un Bit vale una volta: quello che paga il colpo resta sulla mira, solo il resto diventa saldo', () => {
  const b = banco();
  const c = login();
  const m = mira(b, c);
  const r = b.s.daCheer(c, { bits: 250, message: `Cheer250 ${m.codice}`, user_login: 'marta', user_id: '21', evento: 'e1' });
  assert.deepEqual([r.esito, r.bitPew], ['pagato', 150]);
  const p = registroColpi.get(m.id);
  assert.deepEqual([p.stato, p.versati, p.versanti], ['pagata', 100, [['21', 100]]], 'sulla mira solo il prezzo');
  const m2 = mira(b, c, 'b');
  const r2 = b.s.daCheer(c, { bits: 100, message: `Cheer100 ${m2.codice}`, user_login: 'marta', user_id: '21', evento: 'e2' });
  assert.deepEqual([r2.esito, r2.bitPew], ['pagato', undefined], 'giusto il prezzo: niente saldo');
  const m3 = mira(b, c, 'c');
  assert.equal(b.s.daCheer(c, { bits: 40, message: `Cheer40 ${m3.codice}`, user_login: 'luca', user_id: '22', evento: 'e3' }).esito, 'pochi');
  assert.equal(pewBit.saldo(c, '22'), 0, 'quelli che restano contati sulla mira non sono anche saldo');
  assert.equal(pewBit.saldo(c, '21'), 150);
});

test('dalla pagina: il saldo paga quello che manca, tutto o niente, una volta, e solo un colpo che puo\' comparire', () => {
  const b = banco();
  const c = login();
  pewBit.entra(c, '21', 90, 'cheer:a');
  const m = mira(b, c);
  assert.deepEqual(b.s.daBitPew(c, { id: m.id, chi: '21' }), { esito: 'pochi', serve: 100, saldo: 90, nome: 'pomodoro' });
  assert.equal(pewBit.saldo(c, '21'), 90, 'non basta: niente si muove');
  b.s.daCheer(c, { bits: 30, message: `Cheer30 ${m.codice}`, user_login: 'marta', user_id: '21', evento: 'x1' });
  b.stato.overlay = false;
  assert.deepEqual(b.s.daBitPew(c, { id: m.id, chi: '21' }), { esito: 'fermo', motivo: 'overlay', nome: 'pomodoro' });
  assert.equal(pewBit.saldo(c, '21'), 90);
  b.stato.overlay = true;
  assert.deepEqual(b.s.daBitPew(c, { id: m.id, chi: '21' }), { esito: 'pagato', nome: 'pomodoro', bit: 70, saldo: 20 }, 'i 30 del cheer contano');
  const p = registroColpi.get(m.id);
  assert.deepEqual([p.stato, p.metodo, p.versati, p.versanti], ['pagata', 'bit', 100, [['21', 30], ['21', 70, 'p', [{ scade: 0, quanti: 70 }]]]], 'quelli del saldo con la ricevuta dei lotti');
  assert.equal(b.sparati.length, 1);
  assert.equal(b.s.daBitPew(c, { id: m.id, chi: '21' }).esito, 'sconosciuto', 'gia\' pagata');
  assert.equal(pewBit.saldo(c, '21'), 20, 'una volta sola');
  const e = mira(b, c, 'e');
  registroColpi.lega(e.id, 'stripe:cs_' + c);
  assert.equal(b.s.daBitPew(c, { id: e.id, chi: '21' }).esito, 'gia', 'con un pagamento in euro aperto no');
  b.cfg.bitPew = { attivo: false };
  assert.equal(b.s.daBitPew(c, { id: mira(b, c, 'f').id, chi: '21' }).esito, 'spento');
});

test('un colpo a Bit che non compare li rende: dal saldo tali e quali, dai cheer con la resa della mira; una volta', async () => {
  const b = banco({ bitPew: { attivo: true, resa: 50 } });
  const c = login();
  pewBit.entra(c, '21', 100, 'cheer:a');
  const m = mira(b, c);
  b.cfg.bitPew = { attivo: true, resa: 200 };
  b.s.daCheer(c, { bits: 40, message: `Cheer40 ${m.codice}`, user_login: 'luca', user_id: '22', evento: 'y1' });
  b.stato.mostra = false;
  assert.equal(b.s.daBitPew(c, { id: m.id, chi: '21' }).esito, 'pagato');
  assert.equal(pewBit.saldo(c, '21'), 40);
  b.avanti(CONSEGNA_MS - 1000);
  await b.s.ronda();
  assert.equal(registroColpi.get(m.id).stato, 'pagata', 'prima della scadenza si aspetta');
  b.avanti(2000);
  await b.s.ronda();
  assert.equal(registroColpi.get(m.id).stato, 'rimborsata');
  assert.equal(pewBit.saldo(c, '21'), 100, 'i 60 presi dal saldo, tali e quali');
  assert.equal(pewBit.saldo(c, '22'), 20, 'i 40 del cheer con la resa di quando la mira e\' nata (50), non quella di adesso');
  await b.s.ronda();
  assert.deepEqual([pewBit.saldo(c, '21'), pewBit.saldo(c, '22')], [100, 20], 'una volta sola');
});

test('se anche un Bit e\' di nessuno il colpo resta in coda; senza i Bit da spendere, come prima', async () => {
  const b = banco();
  const c = login();
  const m = mira(b, c);
  b.stato.mostra = false;
  b.s.daCheer(c, { bits: 50, message: `Cheer50 ${m.codice}`, is_anonymous: true, evento: 'z1' });
  b.s.daCheer(c, { bits: 50, message: `Cheer50 ${m.codice}`, user_login: 'marta', user_id: '21', evento: 'z2' });
  const k = mira(b, c, 'k');
  b.cfg.bitPew = { attivo: false };
  const v = mira(b, c, 'v');
  b.s.daCheer(c, { bits: 100, message: `Cheer100 ${v.codice}`, user_login: 'marta', user_id: '21', evento: 'z3' });
  b.cfg.bitPew = undefined;
  b.s.daCheer(c, { bits: 100, message: `Cheer100 ${k.codice}`, user_login: 'marta', user_id: '21', evento: 'z4' });
  b.avanti(CONSEGNA_MS + 1);
  await b.s.ronda();
  assert.equal(registroColpi.get(m.id).stato, 'pagata', 'mezzo anonimo: resta in coda');
  assert.equal(registroColpi.get(v.id).stato, 'pagata', 'mira nata coi Bit da spendere spenti: resta in coda');
  assert.equal(registroColpi.get(k.id).stato, 'rimborsata', 'tutti suoi: tornano');
  assert.equal(pewBit.saldo(c, '21'), 100);
  b.stato.mostra = true;
  await b.s.ronda();
  assert.ok(b.sparati.some((x) => x.attacco.id === m.id), 'e l\'overlay, quando torna, lo mostra');
});

test('i Bit di una mira mai pagata tornano a chi li ha mandati, una volta sola', async () => {
  const b = banco();
  const c = login();
  const m = mira(b, c);
  b.s.daCheer(c, { bits: 30, message: `Cheer30 ${m.codice}`, user_login: 'marta', user_id: '21', evento: 'w1' });
  b.s.daCheer(c, { bits: 20, message: `Cheer20 ${m.codice}`, user_login: 'luca', user_id: '22', evento: 'w2' });
  b.s.daCheer(c, { bits: 5, message: `Cheer5 ${m.codice}`, is_anonymous: true, evento: 'w3' });
  b.avanti(2 * 86400_000);
  registroColpi.pulisci(b.ora());
  assert.equal(registroColpi.get(m.id).stato, 'scaduta', 'un giorno coi Bit a meta\': scade');
  registroColpi.pulisci(b.ora());
  assert.ok(registroColpi.get(m.id), 'la pulizia non cancella i Bit prima che tornino');
  await b.s.ronda();
  assert.deepEqual([pewBit.saldo(c, '21'), pewBit.saldo(c, '22')], [30, 20]);
  assert.equal(registroColpi.get(m.id).versati, 0);
  await b.s.ronda();
  assert.deepEqual([pewBit.saldo(c, '21'), pewBit.saldo(c, '22')], [30, 20], 'una volta sola');
});

test('monete piu\' Bit: un cheer piu\' grande del resto, poi le monete: il troppo torna all\'ultimo arrivato, e il rimborso rende solo il resto', async () => {
  const b = banco({ voce: { comando: 'pomodoro', bit: 500, misti: { bit: { monete: 50, bit: 200 } } }, conMonete: true });
  const c = login();
  points.dai(c, 'marta', 100);
  const m = mira(b, c);
  b.s.daCheer(c, { bits: 150, message: `Cheer150 ${m.codice}`, user_login: 'luca', user_id: '22', evento: 'q1' });
  assert.equal(b.s.daCheer(c, { bits: 300, message: `Cheer300 ${m.codice}`, user_login: 'marta', user_id: '21', evento: 'q2' }).esito, 'servono-monete');
  assert.equal(pewBit.saldo(c, '21'), 0, 'finche\' il prezzo pieno non e\' pagato i Bit stanno sulla mira');
  b.stato.mostra = false;
  assert.equal(b.s.daMonete(c, { id: m.id, user: 'marta', modo: 'bit' }).esito, 'pagato');
  assert.equal(pewBit.saldo(c, '21'), 250, 'servivano 200: i 250 di troppo sono gli ultimi, i suoi');
  const p = registroColpi.get(m.id);
  assert.deepEqual([p.metodo, p.versati, p.versanti], ['monete+bit', 200, [['22', 150], ['21', 50]]]);
  b.avanti(CONSEGNA_MS + 1);
  await b.s.ronda();
  assert.equal(registroColpi.get(m.id).stato, 'rimborsata');
  assert.deepEqual([pewBit.saldo(c, '21'), pewBit.saldo(c, '22'), economia.saldo(c, 'marta')], [300, 150, 100], 'ognuno i suoi, e le monete dell\'acconto');
});

test('la pagina: il saldo di chi ha l\'accesso, e si paga col saldo solo la propria mira', async () => {
  const b = banco();
  const c = login();
  pewBit.entra(c, '21', 500, 'cheer:a');
  const p = creaPortaColpi({ servizio: b.s, registro: registroColpi, streamers: { get: () => ({ settings: { colpi: b.cfg } }) },
    effettoDi: () => ({ tipo: 'immagine', file: 'p.png' }), mezziEuro: () => [], apriPagamento: async () => ({}), inOnda: () => true, overlay: () => true, ora: b.ora });
  assert.equal(p.dati(c).bitPew, true);
  assert.deepEqual(p.saldi(c, { id: '21', login: 'marta' }), { valuta: 'bit', daSpendere: 500, bit: 500, kicks: null, monete: null, zaino: null }, 'senza le monete del canale, niente monete; senza lo zaino acceso, niente zaino');
  // chi e' entrato con Kick ha i suoi Kicks, e solo se il canale e' su Kick (docs/COLPI.md, «Su Kick»)
  assert.deepEqual(p.saldi(c, { id: 'k:21', login: 'marta' }), { valuta: 'kicks', daSpendere: null, bit: null, kicks: null, monete: null, zaino: null }, 'un canale non su Kick: niente Kicks');
  assert.equal(p.dati(c).kicksPew, false);
  assert.equal(p.saldi(c, null), null);
  const sua = p.mira(c, { voce: 'pomodoro', x: 10, y: 10 }, 'ip1', { id: '22', nome: 'luca' }).mira;
  assert.deepEqual(await p.paga(c, sua.id, 'bitpew', null), { errore: 'accesso' });
  assert.deepEqual(await p.paga(c, sua.id, 'bitpew', { id: '21', login: 'marta' }), { errore: 'mira' }, 'la mira di un altro no');
  const mia = p.mira(c, { voce: 'pomodoro', x: 10, y: 10 }, 'ip2', { id: '21', nome: 'marta' }).mira;
  assert.deepEqual(await p.paga(c, mia.id, 'bitpew', { id: '21', login: 'marta' }), { ok: true, esito: 'pagato', saldo: 400 });
  assert.equal(p.stato(c, mia.id).prezzi.resa, 100, 'la pagina sa che la mira si paga col saldo');
  b.cfg.bitPew = { attivo: false };
  assert.equal(p.dati(c).bitPew, false);
  assert.deepEqual(p.saldi(c, { id: '21' }), { valuta: 'bit', daSpendere: null, bit: null, kicks: null, monete: null, zaino: null }, 'spenti: il saldo resta, ma non si mostra e non si spende');
});

test('due ronde che si accavallano rendono una volta sola i Bit e le monete di un colpo monete+Bit', async () => {
  let fine;
  const lento = new Promise((r) => { fine = r; });
  const voce = { comando: 'pomodoro', punti: 500, premio: 'aaaaaaaa-1111', misti: { bit: { monete: 50, bit: 100 } } };
  const b = banco({ voce, conMonete: true });
  const c = login();
  points.dai(c, 'marta', 50);
  const a = mira(b, c, 'a');
  b.stato.mostra = false;
  assert.equal(b.s.daRiscatto(c, { reward_id: 'aaaaaaaa-1111', user_input: a.codice, id: 'r1' }).esito, 'pagato');
  b.avanti(1000);
  const m = mira(b, c, 'm');
  b.s.daMonete(c, { id: m.id, user: 'marta', modo: 'bit' });
  assert.equal(b.s.daCheer(c, { bits: 100, message: `Cheer100 ${m.codice}`, user_login: 'marta', user_id: '21', evento: 'd1' }).esito, 'pagato');
  assert.equal(economia.saldo(c, 'marta'), 0);
  b.avanti(CONSEGNA_MS + 1);
  const servizio = (chiudiPremio) => creaServizioColpi({ registro: registroColpi, effects: { fireConOpzioni: () => false }, effettoDi: () => ({ tipo: 'immagine' }),
    impostazioni: () => b.cfg, inOnda: () => true, overlay: () => true, chiudiPremio, crediti: pewBit,
    monete: { punta: economia.punta, rendi: economia.rendi, saldo: economia.saldo }, ora: b.ora });
  // la prima si ferma sul riscatto del primo colpo, con l'elenco gia' letto; la seconda intanto fa tutto
  const uno = servizio(async (l) => { if (l === c) await lento; return true; }).ronda();
  await servizio(async () => true).ronda();
  fine();
  await uno;
  assert.equal(registroColpi.get(m.id).stato, 'rimborsata');
  assert.deepEqual([pewBit.saldo(c, '21'), economia.saldo(c, 'marta')], [100, 50], 'una volta i Bit, una volta le monete');
});

test('un tocco con l\'accesso: la mira e il pagamento col saldo insieme, senza codice; se non basta, la mira non si apre', () => {
  const b = banco({ voce: { comando: 'pomodoro', bit: 100, monete: 40, misti: { bit: { monete: 10, bit: 30 } } }, conMonete: true });
  const c = login();
  const p = creaPortaColpi({ servizio: b.s, registro: registroColpi, streamers: { get: () => ({ settings: { colpi: b.cfg } }) },
    effettoDi: () => ({ tipo: 'immagine', file: 'p.png' }), mezziEuro: () => [], apriPagamento: async () => ({}), inOnda: () => true, overlay: () => true, ora: b.ora });
  const io = { id: '21', login: 'marta', nome: 'Marta' };
  const corpo = (con) => ({ voce: 'pomodoro', x: 10, y: 10, con });
  assert.deepEqual(p.lancia(c, corpo('bit'), 'ip', null), { ok: false, motivo: 'accesso' });
  const aperte = registroColpi.aperteDa(c, 0);
  assert.deepEqual(p.lancia(c, corpo('bit'), 'ip', io), { ok: false, motivo: 'pochi', serve: 100, saldo: 0, quale: 'bit' });
  assert.equal(registroColpi.aperteDa(c, 0), aperte, 'un tocco che non puo\' riuscire non apre la mira');
  pewBit.entra(c, '21', 130, 'cheer:a');
  points.dai(c, 'marta', 50);
  const r = p.lancia(c, corpo('bit'), 'ip', io);
  assert.deepEqual([r.ok, r.mira.stato, r.mira.metodo, pewBit.saldo(c, '21')], [true, 'pagata', 'bit', 30]);
  const m = p.lancia(c, corpo('monete'), 'ip', io);
  assert.deepEqual([m.ok, m.mira.metodo, economia.saldo(c, 'marta')], [true, 'monete', 10]);
  const x = p.lancia(c, corpo('misto-bit'), 'ip', io);
  assert.deepEqual([x.ok, x.mira.metodo, economia.saldo(c, 'marta'), pewBit.saldo(c, '21')], [true, 'monete+bit', 0, 0], 'le monete, poi i Bit dal saldo');
  assert.equal(b.sparati.length, 3);
});

test('un tocco che si rompe a meta\': la mira si chiude e torna tutto quello che era stato preso', () => {
  const b = banco({ voce: { comando: 'pomodoro', bit: 100, misti: { bit: { monete: 10, bit: 30 } } }, conMonete: true });
  const c = login();
  points.dai(c, 'marta', 10);
  pewBit.entra(c, '21', 5, 'cheer:a');
  const m = mira(b, c);
  // le monete ci sono, i Bit del saldo no: il servizio, da solo, deve rimettere a posto
  const r = b.s.subito(c, m.id, { con: 'misto-bit', user: 'marta', chi: '21', nome: 'marta' });
  assert.equal(r.esito, 'pochi');
  assert.deepEqual([registroColpi.get(m.id).stato, economia.saldo(c, 'marta'), pewBit.saldo(c, '21')], ['scaduta', 10, 5]);
  const m2 = mira(b, c, 'b');
  b.stato.overlay = false;
  assert.equal(b.s.subito(c, m2.id, { con: 'bit', chi: '21' }).esito, 'fermo');
  assert.equal(registroColpi.get(m2.id).stato, 'scaduta', 'nessuna mira lasciata aperta');
  b.stato.overlay = true;
  const m3 = mira(b, c, 'c');
  assert.equal(b.s.subito(c, m3.id, { con: 'euro' }).esito, 'mezzo');
  assert.equal(registroColpi.get(m3.id).stato, 'scaduta');
});

const { scadenzaBit, quandoScade, rispostaBit } = await import('../../src/features/colpi.js');
const R = 'Europe/Rome';
const sc = (o) => normalizza({ bitPew: { scadenza: o } }).bitPew.scadenza;
const iso = (t) => new Date(t).toISOString().slice(0, 16);

test('l\'orologio delle scadenze, nel fuso del canale', () => {
  const mer = Date.parse('2026-10-28T09:00:00Z'); // mercoledi' 28 ottobre, 10:00 a Roma (ora solare)
  assert.equal(scadenzaBit(sc({ tipo: 'mai' }), mer, R), 0);
  assert.equal(iso(scadenzaBit(sc({ tipo: 'dopo', quanti: 5, unita: 'ore' }), mer, R)), '2026-10-28T14:00', 'ore esatte');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'dopo', quanti: 3, unita: 'giorni' }), mer, R)), '2026-10-31T23:00', 'fino alla fine del terzo giorno dopo: mezzanotte del 1 novembre a Roma');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'dopo', quanti: 1, unita: 'settimane' }), mer, R)), '2026-11-04T23:00');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'dopo', quanti: 1, unita: 'mesi' }), Date.parse('2026-01-31T12:00:00Z'), R)), '2026-02-28T23:00', 'un mese dal 31 gennaio: tutto il 28 febbraio');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'dopo', quanti: 1, unita: 'anni' }), Date.parse('2028-02-29T12:00:00Z'), R)), '2029-02-28T23:00', 'un anno dal 29 febbraio');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'dopo', quanti: 1, unita: 'giorni' }), Date.parse('2026-10-24T08:00:00Z'), R)), '2026-10-25T23:00', 'attraverso il cambio dell\'ora: sempre mezzanotte a Roma');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'fine', ogni: 'giorno', ora: 6, grazia: 0 }), mer, R)), '2026-10-29T05:00', 'domani alle 6');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'fine', ogni: 'giorno', ora: 6, grazia: 24 }), mer, R)), '2026-10-30T05:00', 'con 24 ore minime, il giro dopo');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'fine', ogni: 'giorno', ora: 11, grazia: 0 }), mer, R)), '2026-10-28T10:00', 'oggi alle 11, se e\' ancora da venire');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'fine', ogni: 'settimana', giorno: 1, ora: 0, grazia: 0 }), mer, R)), '2026-11-01T23:00', 'lunedi\' a mezzanotte');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'fine', ogni: 'settimana', giorno: 3, ora: 12, grazia: 0 }), mer, R)), '2026-10-28T11:00', 'oggi e\' mercoledi\': alle 12 di oggi');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'fine', ogni: 'mese', giorno: 31, ora: 0, grazia: 0 }), Date.parse('2026-11-10T09:00:00Z'), R)), '2026-11-29T23:00', 'il 31 di un mese di 30: l\'ultimo');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'fine', ogni: 'anno', mese: 1, giorno: 1, ora: 0, grazia: 0 }), mer, R)), '2026-12-31T23:00');
  assert.equal(iso(scadenzaBit(sc({ tipo: 'inattivo', quanti: 2, unita: 'ore' }), mer, R)), '2026-10-28T11:00');
});

test('come si dice una scadenza, e la risposta in chat dello streamer', () => {
  assert.equal(quandoScade(Date.parse('2026-10-31T23:00:00Z'), 'it', R), '31 ottobre', 'scade a mezzanotte: vale fino al giorno prima');
  assert.match(quandoScade(Date.parse('2026-10-29T05:00:00Z'), 'it', R), /^29 ottobre\D+06:00$/, 'a un\'ora che non e\' mezzanotte, con l\'ora');
  const cfg = normalizza({});
  assert.equal(rispostaBit(cfg, 'it', { nome: '@marta', saldo: 30, pagina: 'pew.x/c', quanti: 10, quando: '31 ottobre' }), '@marta hai 30 Bit da spendere su pew.x/c (10 valgono fino al 31 ottobre)');
  assert.equal(rispostaBit(cfg, 'en', { nome: '@m', saldo: 3, pagina: 'p' }), '@m you have 3 Bits to spend on p', 'senza scadenza vicina, niente frase');
  const mio = normalizza({ bitPew: { risposta: '{nome}: {saldo} Bit ({quanti} entro {quando}) {zz}' } });
  assert.equal(rispostaBit(mio, 'it', { nome: 'a', saldo: 1, quanti: 1, quando: 'domani' }), 'a: 1 Bit (1 entro domani) {zz}', 'il testo dello streamer, coi segnaposto che conosce');
});

function bancoScadenze(bitPew) {
  const b = banco({ bitPew });
  return b;
}

test('i Bit che arrivano prendono la scadenza dello streamer; il minimo, e quanti scadono presto', () => {
  const b = bancoScadenze({ attivo: true, resa: 100, minimo: 50, scadenza: { tipo: 'dopo', quanti: 2, unita: 'ore', avviso: 1 } });
  const c = login();
  b.s.daCheer(c, { bits: 40, message: 'Cheer40', user_login: 'marta', user_id: '21', evento: 'k1' });
  assert.equal(pewBit.saldo(c, '21', b.ora()), 0, 'sotto il minimo non conta');
  b.s.daCheer(c, { bits: 60, message: 'Cheer60', user_login: 'marta', user_id: '21', evento: 'k2' });
  assert.equal(b.s.saldoBit(c, '21'), 60);
  assert.deepEqual(b.s.scadonoBit(c, '21'), { quanti: 60, scade: b.ora() + 2 * 3600_000 }, 'scadono entro il giorno dell\'avviso: si dice');
  pewBit.entra(c, '22', 10, 'lontano', { scade: b.ora() + 3 * 86400_000, ora: b.ora() });
  assert.equal(b.s.scadonoBit(c, '22'), null, 'fra tre giorni, con l\'avviso a uno: ancora niente da dire');
  b.avanti(2 * 3600_000);
  assert.equal(b.s.saldoBit(c, '21'), 0, 'e scadono');
});

test('lo streamer sceglie se tornano: i Bit dei cheer no, quelli spesi dal saldo sempre, coi lotti e le ore minime', async () => {
  const b = bancoScadenze({ attivo: true, resa: 100, rendiColpi: false, rendiMire: false, scadenza: { tipo: 'dopo', quanti: 1, unita: 'ore', grazia: 5 } });
  const c = login();
  pewBit.entra(c, '21', 100, 'cheer:a', { scade: b.ora() + 60_000, ora: b.ora() });
  const m = mira(b, c);
  b.stato.mostra = false;
  assert.equal(b.s.daBitPew(c, { id: m.id, chi: '21' }).esito, 'pagato');
  b.avanti(CONSEGNA_MS + 1);
  await b.s.ronda();
  assert.equal(registroColpi.get(m.id).stato, 'rimborsata', 'pagato dal saldo: torna comunque');
  assert.equal(b.s.saldoBit(c, '21'), 100, 'il lotto era scaduto intanto: vale ancora per le ore minime');
  b.avanti(2 * 3600_000);
  assert.equal(b.s.saldoBit(c, '21'), 100, 'le ore minime (5), non la durata dei Bit nuovi (1)');
  b.avanti(3 * 3600_000);
  assert.equal(b.s.saldoBit(c, '21'), 0);
  const k = mira(b, c, 'k');
  b.s.daCheer(c, { bits: 100, message: `Cheer100 ${k.codice}`, user_login: 'marta', user_id: '21', evento: 'k9' });
  const v = mira(b, c, 'v');
  b.s.daCheer(c, { bits: 30, message: `Cheer30 ${v.codice}`, user_login: 'marta', user_id: '21', evento: 'k10' });
  b.avanti(2 * 86400_000);
  registroColpi.pulisci(b.ora());
  await b.s.ronda();
  assert.equal(registroColpi.get(k.id).stato, 'pagata', 'pagato col cheer, coi ritorni spenti: resta in coda');
  assert.equal(b.s.saldoBit(c, '21'), 0, 'e la mira mai pagata non rende i suoi 30');
});
