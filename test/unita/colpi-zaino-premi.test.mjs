// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// COMPRO, CE L'HO, LO LANCIO (docs/COLPI.md): un riscatto dei punti canale
// senza una mira da pagare finisce nello zaino di chi riscatta; quello di un
// premio per prezzo e' un buono, che lancia un colpo che costa al massimo
// quei punti. Le garanzie, ognuna rotta apposta:
//  · un riscatto, un oggetto: lo stesso riscatto due volte non ne mette due;
//  · il buono copre solo i colpi che costano al massimo quanto lui, e al lancio
//    vale prima un colpo di quella voce, poi il buono piu' piccolo che basta;
//  · con la strada «subito», o senza i punti fra i modi dello zaino, o con lo
//    zaino pieno, il riscatto si annulla come prima;
//  · una mira aperta di chi riscatta vince: il colpo parte;
//  · il premio chiede il codice solo se serve (strada «subito», o il misto).
import test from 'node:test';
import assert from 'node:assert/strict';

const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const usaEGetta = cartellaUsaEGetta('andrybot-colpi-zaino-premi-');
process.on('exit', () => usaEGetta.pulisci());
const { registroColpi, pewBit, pewZaino, streamers } = await import('../../src/db.js');
const economia = await import('../../src/features/economia.js');
const { valoreBuono, voceBuono, buonoCopre } = await import('../../src/features/colpi.js');
const { creaServizioColpi } = await import('../../src/features/colpi-servizio.js');
const { riconciliaPremi } = await import('../../src/features/colpi-premi.js');

let n = 0;
const login = () => `zpremi${++n}`;
const P = 'aaaaaaaa-0001', Q = 'bbbbbbbb-0002';

function banco(cfgIn = {}) {
  const adesso = Date.parse('2026-10-29T09:00:00Z');
  const sparati = [], premi = [];
  const cfg = { attivo: true, attesaSec: 0, alMinuto: 60, voci: [
    { comando: 'pomodoro', nome: 'Pomodoro', punti: 500, premio: P, premioCosto: 500, premioNome: 'Colpo: Pomodoro' },
  ], ...cfgIn };
  const s = creaServizioColpi({
    registro: registroColpi,
    effects: { fireConOpzioni: (l, c, o) => { sparati.push({ l, c, ...o }); return true; } },
    effettoDi: () => ({ tipo: 'immagine' }),
    impostazioni: () => cfg,
    chiudiPremio: async (l, premio, riscatto, st) => { premi.push([premio, riscatto, st]); return true; },
    monete: { punta: economia.punta, rendi: economia.rendi, saldo: economia.saldo },
    crediti: pewBit, zaino: pewZaino, ora: () => adesso,
  });
  return { s, cfg, sparati, premi };
}
const prezzo = (costo) => [
  { comando: 'torta', nome: 'Torta', punti: costo, premio: Q, premioCosto: costo, premioNome: 'Colpo da ' + costo },
  { comando: 'pizza', nome: 'Pizza', punti: costo, premio: Q, premioCosto: costo, premioNome: 'Colpo da ' + costo },
  { comando: 'razzo', nome: 'Razzo', punti: costo + 300 },
  { comando: 'pugno', nome: 'Pugno', punti: costo - 200 },
];
const riscatta = (b, c, id, extra = {}) => b.s.daRiscatto(c, { reward_id: P, id, user_id: '21', user_login: 'marta', ...extra });

test('il buono: la voce che lo dice, il valore, e chi copre', () => {
  assert.deepEqual([voceBuono(500), valoreBuono('@punti:500'), valoreBuono('pomodoro'), valoreBuono('@presenza')], ['@punti:500', 500, 0, 0]);
  assert.ok(buonoCopre(500, { punti: 500 }, 'bit') && buonoCopre(500, { punti: 300 }, 'bit'));
  assert.ok(!buonoCopre(500, { punti: 800 }, 'bit') && !buonoCopre(500, { punti: 0 }, 'bit'), 'non un colpo che costa di piu\', ne\' uno che coi punti non si paga');
  assert.ok(buonoCopre(500, { punti: 9999, puntiKick: 400 }, 'kicks'), 'per chi e\' su Kick contano i punti di Kick');
});

test('il premio di un colpo, senza mira: quel colpo nello zaino di chi riscatta, il riscatto chiuso; lo stesso riscatto due volte non ne mette due', async () => {
  const c = login(), b = banco();
  const r = riscatta(b, c, 'r1');
  assert.deepEqual([r.esito, r.stato, r.dopo, r.nome], ['pagato', null, true, 'Pomodoro']);
  await new Promise((ok) => setImmediate(ok));
  assert.deepEqual(b.premi, [[P, 'r1', 'FULFILLED']], 'consegnato, nello zaino: il riscatto si chiude');
  assert.deepEqual(b.s.zainoDi(c, '21').map((x) => [x.voce, x.quanti]), [['pomodoro', 1]]);
  assert.equal(b.sparati.length, 0, 'niente va all\'overlay');
  assert.deepEqual(riscatta(b, c, 'r1'), { esito: 'doppio', stato: null }, 'lo stesso riscatto: niente di nuovo, e i punti non si rendono');
  assert.equal(b.s.zainoDi(c, '21')[0].quanti, 1);
  assert.equal(riscatta(b, c, 'r2').esito, 'pagato');
  assert.equal(b.s.zainoDi(c, '21')[0].quanti, 2, 'un altro riscatto, un altro colpo');
});

test('il premio di un prezzo: un buono da quei punti, che lancia solo i colpi che costano al massimo tanto', () => {
  const c = login(), b = banco({ voci: prezzo(500) });
  const r = b.s.daRiscatto(c, { reward_id: Q, id: 'q1', user_id: '21' });
  assert.deepEqual([r.esito, r.buono], ['pagato', 500]);
  assert.deepEqual(b.s.zainoDi(c, '21').map((x) => [x.voce, x.buono, x.quanti]), [['@punti:500', 500, 1]]);
  const lancia = (voce) => { const m = b.s.mira(c, { voce, x: 10, y: 10, chiave: '21', spettatore: '21' }); return b.s.daZaino(c, { id: m.mira.id, chi: '21' }).esito; };
  assert.equal(lancia('razzo'), 'vuoto', 'un colpo da 800 non si lancia con un buono da 500');
  assert.equal(lancia('pugno'), 'pagato', 'uno da 300 si');
  assert.equal(b.sparati.at(-1).c, 'pugno');
  assert.deepEqual(b.s.zainoDi(c, '21'), [], 'il buono si e\' consumato, una volta');
  assert.equal(lancia('torta'), 'vuoto');
});

test('al lancio vale prima un colpo di quella voce, poi il buono piu\' piccolo che basta', () => {
  const c = login(), b = banco({ voci: [...prezzo(500), { comando: 'mela', nome: 'Mela', punti: 900, premio: 'cccccccc-0003', premioCosto: 900, premioNome: 'Colpo da 900' }] });
  b.s.daRiscatto(c, { reward_id: 'cccccccc-0003', id: 'g1', user_id: '21' });
  b.s.daRiscatto(c, { reward_id: Q, id: 'g2', user_id: '21' });
  const m = b.s.mira(c, { voce: 'pugno', x: 10, y: 10, chiave: '21', spettatore: '21' });
  assert.equal(b.s.daZaino(c, { id: m.mira.id, chi: '21' }).esito, 'pagato');
  assert.deepEqual(b.s.zainoDi(c, '21').map((x) => x.buono), [900], 'per un colpo da 300 si spende il buono da 500, non quello da 900');
});

test('quando lo zaino non lo prende il riscatto si annulla come prima', () => {
  const c = login();
  assert.deepEqual([riscatta(banco({ flusso: 'subito' }), c, 's1').esito, riscatta(banco({ flusso: 'subito' }), c, 's1').stato], ['sconosciuto', 'CANCELED'], 'strada «subito»: serve la mira');
  const senza = riscatta(banco({ zaino: { con: { punti: false } } }), c, 's2');
  assert.deepEqual([senza.esito, senza.stato, senza.motivo], ['fermo', 'CANCELED', 'mezzo'], 'i punti non fra i modi dello zaino');
  const b = banco({ zaino: { massimo: 1 } });
  assert.equal(riscatta(b, c, 's3').esito, 'pagato');
  const pieno = riscatta(b, c, 's4');
  assert.deepEqual([pieno.esito, pieno.stato, pieno.motivo, pieno.massimo], ['fermo', 'CANCELED', 'zaino-pieno', 1]);
  const no = riscatta(banco({ voci: [{ comando: 'pomodoro', nome: 'Pomodoro', punti: 500, premio: P, premioCosto: 500, zaino: { modo: 'no' } }] }), c, 's5');
  assert.deepEqual([no.esito, no.stato], ['fermo', 'CANCELED'], 'un colpo che lo streamer non vuole nello zaino');
});

test('una mira aperta di chi riscatta vince: il colpo parte', () => {
  const c = login(), b = banco();
  const m = b.s.mira(c, { voce: 'pomodoro', x: 10, y: 10, chiave: '21', spettatore: '21' });
  const r = riscatta(b, c, 'm1');
  assert.deepEqual([r.esito, r.dopo], ['pagato', false]);
  assert.equal(b.sparati.at(-1).attacco.id, m.mira.id);
  assert.deepEqual(b.s.zainoDi(c, '21'), []);
});

test('su Kick: la persona di Kick, i punti di Kick', () => {
  const c = login(), b = banco({ voci: [{ comando: 'pomodoro', nome: 'Pomodoro', puntiKick: 300, premioKick: '01HZZZZZZZZZZZZZZZZZZZZZZZ', premioKickCosto: 300, premioKickNome: 'Colpo: Pomodoro' }] });
  const r = b.s.daRiscatto(c, { reward_id: '01HZZZZZZZZZZZZZZZZZZZZZZZ', id: '01HAAAAAAAAAAAAAAAAAAAAAAA', user_id: '77', piattaforma: 'kick' });
  assert.equal(r.esito, 'pagato');
  assert.deepEqual(b.s.zainoDi(c, 'k:77').map((x) => x.voce), ['pomodoro']);
});

test('il premio chiede il codice solo se serve, e uno che chiede la cosa vecchia si rifa\'', async () => {
  const C = login();
  streamers.upsertApproved(C, C, '9' + n);
  const vivi = new Map();
  let k = 0;
  const h = {
    listaRewardsTutti: async () => [...vivi].map(([id, r]) => ({ id, title: r.titolo, cost: r.costo, richiedeTesto: !!r.userInput, descrizione: r.prompt || '' })),
    creaReward: async (l, r) => { const id = `${String(++k).padStart(8, '0')}-aaaa`; vivi.set(id, r); return { id }; },
    eliminaReward: async (l, id) => { vivi.delete(id); },
  };
  const salva = (o) => streamers.setSettings(C, { colpi: { attivo: true, voci: [{ id: 'pomodoro', comando: 'pomodoro', nome: 'Pomodoro', punti: 500, ...(streamers.get(C)?.settings?.colpi?.voci?.[0] || {}) }], ...o } });
  salva({});
  await riconciliaPremi({ login: C, prima: {}, helix: h, streamers, pagina: 'pew.x/' + C });
  const [id1, r1] = [...vivi][0];
  assert.equal(r1.userInput, false, 'strada dello zaino: niente codice da scrivere');
  assert.match(r1.prompt, /zaino/);
  await riconciliaPremi({ login: C, prima: streamers.get(C).settings.colpi, helix: h, streamers, pagina: 'pew.x/' + C });
  assert.deepEqual([...vivi.keys()], [id1], 'gia\' giusto: si tiene');
  salva({ flusso: 'subito' });
  await riconciliaPremi({ login: C, prima: streamers.get(C).settings.colpi, helix: h, streamers, pagina: 'pew.x/' + C });
  const [id2, r2] = [...vivi][0];
  assert.ok(id2 !== id1 && vivi.size === 1 && r2.userInput === true && /codice/.test(r2.prompt), 'strada «subito»: il premio rifatto chiede il codice');
});
