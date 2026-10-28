// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I PREMI A PUNTI CANALE DEI COLPI (src/features/colpi-premi.js): quello del
// prezzo in punti e quello del modo misto, allineati al listino salvato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('colpi-premi-');
const { streamers } = await import('../../src/db.js');
const { riconciliaPremi, pianoPremi, motivoTwitch, TETTO_PREMI } = await import('../../src/features/colpi-premi.js');
const { normalizza } = await import('../../src/features/colpi.js');
test.after(() => casa.pulisci());

function twitch() {
  const vivi = new Map();
  let n = 0;
  return {
    vivi,
    creaReward: async (login, { titolo, costo, prompt }) => {
      if ([...vivi.values()].some((r) => r.titolo === titolo)) throw new Error('titolo doppio');
      const id = `${String(++n).padStart(8, '0')}-aaaa`;
      vivi.set(id, { titolo, costo, prompt });
      return { id };
    },
    eliminaReward: async (login, id) => { vivi.delete(id); },
  };
}
const C = 'premi1';
streamers.upsertApproved(C, C, '9001');
const salva = (voci) => streamers.setSettings(C, { nomeMonete: 'gemme', colpi: { attivo: true, voci } });
const leggi = () => streamers.get(C).settings.colpi.voci[0];

test('il premio del prezzo e quello del modo misto: titoli diversi, i loro costi, rifatti se cambiano, tolti se non servono', async () => {
  const h = twitch();
  salva([{ id: 'pomodoro', comando: 'pomodoro', nome: 'Pomodoro', punti: 500, misti: { punti: { monete: 20, punti: 300 } } }]);
  assert.deepEqual((await riconciliaPremi({ login: C, prima: {}, helix: h, streamers, pagina: 'pew.x/premi1' })).errori, []);
  let v = leggi();
  assert.deepEqual([h.vivi.get(v.premio)?.titolo, h.vivi.get(v.premio)?.costo], ['Colpo: Pomodoro', 500]);
  assert.deepEqual([h.vivi.get(v.premioMisto)?.titolo, h.vivi.get(v.premioMisto)?.costo], ['Colpo: Pomodoro + monete', 300]);
  assert.match(h.vivi.get(v.premioMisto).prompt, /Prima paga 20 gemme su pew\.x\/premi1/, 'il premio misto dice cosa pagare prima, col nome delle monete');
  const prima = streamers.get(C).settings.colpi;
  await riconciliaPremi({ login: C, prima, helix: h, streamers, pagina: 'pew.x/premi1' });
  assert.deepEqual([leggi().premio, leggi().premioMisto], [v.premio, v.premioMisto], 'una seconda passata non tocca niente');
  assert.ok(h.vivi.has(v.premio) && h.vivi.has(v.premioMisto), 'e su Twitch i premi ci sono ancora');
  salva([{ ...leggi(), misti: { punti: { monete: 20, punti: 250 } } }]);
  await riconciliaPremi({ login: C, prima, helix: h, streamers, pagina: 'pew.x/premi1' });
  v = leggi();
  assert.equal(h.vivi.get(v.premioMisto)?.costo, 250, 'un costo cambiato: il premio si rifa\'');
  assert.equal(h.vivi.size, 2, 'e quello vecchio non resta');
  const prima2 = streamers.get(C).settings.colpi;
  salva([{ ...leggi(), misti: {} }]);
  await riconciliaPremi({ login: C, prima: prima2, helix: h, streamers, pagina: 'pew.x/premi1' });
  assert.deepEqual([leggi().premioMisto, h.vivi.size], ['', 1], 'senza il modo misto il suo premio se ne va');
  const prima3 = streamers.get(C).settings.colpi;
  salva([]);
  await riconciliaPremi({ login: C, prima: prima3, helix: h, streamers, pagina: 'pew.x/premi1' });
  assert.equal(h.vivi.size, 0, 'una voce tolta toglie i suoi premi');
});

test('una voce tolta mentre il suo premio si sta creando: i premi appena nati non restano orfani', async () => {
  const h = twitch();
  const crea = h.creaReward;
  // fra la lettura e la scrittura arriva un salvataggio che toglie la voce
  h.creaReward = async (...a) => { const r = await crea(...a); salva([]); return r; };
  salva([{ id: 'x', comando: 'x', nome: 'X', punti: 100, misti: { punti: { monete: 5, punti: 50 } } }]);
  await riconciliaPremi({ login: C, prima: {}, helix: h, streamers, pagina: 'p' });
  assert.equal(h.vivi.size, 0, 'ne\' quello del prezzo ne\' quello misto');
});

// ─────────────────────────────── il tetto di Twitch (docs/COLPI.md, «I premi su Twitch»)

// Un Twitch col suo tetto: 50 premi per canale, contati tutti, titoli unici.
function twitchCol(altri = 0, { elenco = true } = {}) {
  const vivi = new Map();
  let n = 0;
  for (let i = 0; i < altri; i++) vivi.set(`ffffff${String(i).padStart(2, '0')}-0000`, { titolo: 'Idratati ' + i, costo: 100, suo: true });
  const h = {
    vivi,
    tentativi: 0,
    creaReward: async (login, { titolo, costo, prompt }) => {
      h.tentativi++;
      if (vivi.size >= TETTO_PREMI) { const e = new Error('Helix POST /channel_points/custom_rewards → 400 {"message":"CREATE_CUSTOM_REWARD_TOO_MANY_REWARDS"}'); e.status = 400; throw e; }
      if ([...vivi.values()].some((r) => r.titolo.toLowerCase() === titolo.toLowerCase())) throw new Error('400 CREATE_CUSTOM_REWARD_DUPLICATE_REWARD');
      const id = `${String(++n).padStart(8, '0')}-aaaa`;
      vivi.set(id, { titolo, costo, prompt });
      return { id };
    },
    eliminaReward: async (login, id) => { vivi.delete(id); },
    nostri: () => [...vivi.values()].filter((r) => !r.suo),
  };
  if (elenco) h.listaRewardsTutti = async () => [...vivi].map(([id, r]) => ({ id, title: r.titolo, cost: r.costo }));
  return h;
}
const QUATTRO = [
  { id: 'pomodoro', comando: 'pomodoro', nome: 'Pomodoro', punti: 100 },
  { id: 'fragole', comando: 'fragole', nome: 'Fragole e panna', punti: 100 },
  { id: 'torta', comando: 'torta', nome: 'Torta in faccia', punti: 300 },
  { id: 'pizza', comando: 'pizza', nome: 'Pizza', punti: 300, misti: { punti: { monete: 10, punti: 200 } } },
];
const C2 = 'premi2';
streamers.upsertApproved(C2, C2, '9002');
// come il server: `prima` e' il listino di prima del salvataggio
let prima2 = {};
const salva2 = (voci, extra = {}) => { prima2 = streamers.get(C2).settings?.colpi || {}; streamers.setSettings(C2, { nomeMonete: 'gemme', colpi: { attivo: true, voci, ...extra } }); };
const voci2 = () => streamers.get(C2).settings.colpi.voci;
const giro = (h) => riconciliaPremi({ login: C2, prima: prima2, helix: h, streamers, pagina: 'p' });

test('il piano: per colpo se ci sta, per prezzo se no; i piu\' economici prima', () => {
  const cfg = normalizza({ attivo: true, voci: QUATTRO });
  assert.deepEqual(pianoPremi(cfg, { liberi: 5 }).voluti.map((p) => p.titolo), ['Colpo: Fragole e panna', 'Colpo: Pomodoro', 'Colpo: Pizza + monete', 'Colpo: Pizza', 'Colpo: Torta in faccia']);
  const p = pianoPremi(cfg, { liberi: 4 });
  assert.equal(p.forma, 'prezzo', 'cinque per colpo non stanno in quattro posti');
  assert.deepEqual(p.voluti.map((x) => [x.titolo, x.costo, x.voci]), [['Colpo da 100', 100, ['pomodoro', 'fragole']], ['Colpo da 200 + monete', 200, ['pizza']], ['Colpo da 300', 300, ['torta', 'pizza']]]);
  const stretto = pianoPremi(cfg, { liberi: 2 });
  assert.deepEqual([stretto.voluti.map((x) => x.costo), stretto.fuori.map((x) => x.titolo)], [[100, 200], ['Colpo da 300']], 'resta fuori il piu\' caro');
  assert.equal(pianoPremi(cfg, { liberi: 0 }).voluti.length, 0);
  assert.equal(pianoPremi(cfg, { liberi: 99, modo: 'prezzo' }).forma, 'prezzo', 'la scelta dello streamer vince sul conto');
  assert.equal(pianoPremi(cfg, { liberi: 2, modo: 'colpo' }).forma, 'colpo');
  assert.deepEqual(pianoPremi(normalizza({ attivo: false, voci: QUATTRO })).voluti, [], 'colpi spenti, nessun premio');
});

test('il piano: i titoli presi prendono un numero, anche fra i nostri', () => {
  const lungo = 'Un nome lunghissimo che Twitch taglia a quarantacinque';
  const cfg = normalizza({ attivo: true, voci: [{ id: 'a', comando: 'a', nome: lungo + ' A', punti: 10 }, { id: 'b', comando: 'b', nome: lungo + ' B', punti: 20 }, { id: 'c', comando: 'c', nome: 'Pizza', punti: 30 }] });
  const t = pianoPremi(cfg, { presi: ['COLPO: PIZZA'] }).voluti.map((p) => p.titolo);
  assert.equal(new Set(t.map((x) => x.toLowerCase())).size, 3, 'tre premi, tre titoli');
  assert.ok(t.every((x) => x.length <= 45), 'dentro i 45 caratteri');
  assert.equal(t[2], 'Colpo: Pizza · 2', 'quello preso da un premio non nostro prende il 2');
  assert.match(t[1], / · 2$/, 'e due nomi tagliati uguali non si pestano');
});

test('Twitch quasi pieno: i premi per prezzo ci stanno, e ogni voce sa il suo', async () => {
  const h = twitchCol(46);
  salva2(QUATTRO);
  const r = await giro(h);
  assert.deepEqual([r.forma, r.errori], ['prezzo', []]);
  assert.equal(h.vivi.size, 49, 'tre premi, non cinque');
  const v = Object.fromEntries(voci2().map((x) => [x.id, x]));
  assert.equal(v.pomodoro.premio, v.fragole.premio, 'stesso prezzo, stesso premio');
  assert.deepEqual([v.pomodoro.premioNome, v.torta.premioNome, v.pizza.premioMistoNome], ['Colpo da 100', 'Colpo da 300', 'Colpo da 200 + monete']);
  assert.match(h.vivi.get(v.pizza.premioMisto).prompt, /^Prima paga le gemme su p /, 'il premio misto condiviso non promette un numero di monete');
  await giro(h);
  assert.equal(h.vivi.size, 49, 'una seconda passata non crea niente');
  assert.deepEqual(voci2().map((x) => x.premio), Object.values(v).map((x) => x.premio));
});

test('Twitch pieno: l\'errore dice la cosa vera, e appena c\'e\' posto i premi arrivano da soli', async () => {
  const h = twitchCol(50);
  salva2(QUATTRO);
  const r = await giro(h);
  assert.deepEqual(r.errori, [{ motivo: 'pieno', titoli: ['Colpo da 100', 'Colpo da 200 + monete', 'Colpo da 300'], altri: 50, mancano: 3, tetto: 50 }]);
  assert.deepEqual(streamers.get(C2).settings.colpi.premiErrori, r.errori, 'e il pannello lo legge');
  h.vivi.delete('ffffff00-0000');
  assert.deepEqual((await giro(h)).errori[0].titoli, ['Colpo da 200 + monete', 'Colpo da 300'], 'un posto: il piu\' economico');
  for (const id of ['ffffff01-0000', 'ffffff02-0000']) h.vivi.delete(id);
  assert.deepEqual((await giro(h)).errori, []);
  assert.equal(h.nostri().length, 3);
});

test('l\'elenco non si legge: si prova per colpo, e al «troppi» la stessa passata riparte per prezzo', async () => {
  const h = twitchCol(46, { elenco: false });
  salva2(QUATTRO);
  const r = await giro(h);
  assert.deepEqual([r.forma, r.errori], ['prezzo', []]);
  assert.deepEqual(h.nostri().map((x) => x.titolo).sort(), ['Colpo da 100', 'Colpo da 200 + monete', 'Colpo da 300'], 'nessun premio per colpo resta indietro');
});

test('quando il listino si accorcia, i premi per prezzo tornano per colpo', async () => {
  const h = twitchCol(46);
  salva2(QUATTRO);
  await giro(h);
  salva2(voci2().slice(0, 2));
  await giro(h);
  assert.deepEqual(h.nostri().map((x) => x.titolo).sort(), ['Colpo: Fragole e panna', 'Colpo: Pomodoro']);
  assert.equal(h.vivi.size, 48);
});

test('un premio tolto a mano su Twitch si rifa\'', async () => {
  const h = twitchCol(0);
  salva2(QUATTRO.slice(0, 1));
  await giro(h);
  h.vivi.delete(voci2()[0].premio);
  await giro(h);
  assert.deepEqual([h.nostri().length, h.vivi.has(voci2()[0].premio)], [1, true]);
});

test('gli errori di Twitch si dicono per quello che sono', () => {
  assert.equal(motivoTwitch(new Error('400 CREATE_CUSTOM_REWARD_TOO_MANY_REWARDS')), 'pieno');
  assert.equal(motivoTwitch(new Error('400 CREATE_CUSTOM_REWARD_DUPLICATE_REWARD')), 'doppio');
  assert.equal(motivoTwitch(new Error('403 The broadcaster must be a partner or affiliate')), 'affiliato');
  assert.equal(motivoTwitch(Object.assign(new Error('401 Missing scope: channel:manage:redemptions'), { status: 401 })), 'permesso');
  assert.equal(motivoTwitch(new Error('500 boh')), 'twitch');
});

test('pieno a meta\' strada: dopo il primo «troppi» non si insiste', async () => {
  const h = twitchCol(50, { elenco: false });
  salva2(QUATTRO, { premiModo: 'prezzo' });
  const r = await giro(h);
  assert.equal(h.tentativi, 1, 'una domanda sola a Twitch, non una per premio');
  assert.deepEqual(r.errori, [{ motivo: 'pieno', titoli: ['Colpo da 100', 'Colpo da 200 + monete', 'Colpo da 300'], altri: null, mancano: 3, tetto: 50 }], 'quanti premi non nostri ci sono non si sa, e non si inventa');
});

// ─────────────────────────────── su Kick (docs/COLPI.md, «Su Kick»)

function kickFinto() {
  const vivi = new Map();
  let n = 0;
  return {
    vivi,
    creaReward: async (login, { titolo, costo, prompt }) => {
      const id = '01HZX3K9Q8W7E6R5T4Y3U2' + String(++n).padStart(4, '0');
      vivi.set(id, { titolo, costo, prompt });
      return { id };
    },
    eliminaReward: async (login, id) => { vivi.delete(id); },
    listaRewardsTutti: async () => [...vivi].map(([id, r]) => ({ id, title: r.titolo, cost: r.costo })),
  };
}

test('su Kick: la stessa passata, coi punti di Kick e i campi di Kick; Twitch e Kick non si pestano', async () => {
  const C3 = 'premi3';
  streamers.upsertApproved(C3, C3, '9003');
  const voci = [
    { id: 'torta', comando: 'torta', nome: 'Torta', punti: 500, puntiKick: 300, misti: { punti: { monete: 5, punti: 100 } } },
    { id: 'pizza', comando: 'pizza', nome: 'Pizza', puntiKick: 300 },
  ];
  streamers.setSettings(C3, { colpi: { attivo: true, voci, premiModo: 'colpo' } });
  const tw = twitch(), k = kickFinto();
  await riconciliaPremi({ login: C3, prima: {}, helix: tw, streamers, pagina: 'p' });
  await riconciliaPremi({ login: C3, prima: {}, helix: k, streamers, pagina: 'p', piattaforma: 'kick' });
  const v = Object.fromEntries(streamers.get(C3).settings.colpi.voci.map((x) => [x.id, x]));
  assert.deepEqual([...k.vivi.values()].map((r) => [r.titolo, r.costo]).sort(), [['Colpo: Pizza', 300], ['Colpo: Torta', 300]], 'su Kick i punti di Kick, e niente misto');
  assert.deepEqual([v.torta.premioKickNome, v.torta.premioKickCosto, k.vivi.has(v.torta.premioKick)], ['Colpo: Torta', 300, true]);
  assert.ok(tw.vivi.has(v.torta.premio) && tw.vivi.has(v.torta.premioMisto), 'i premi di Twitch restano quelli di Twitch');
  assert.equal(tw.vivi.size, 2, 'su Twitch la pizza non ha prezzo in punti: nessun premio');
  assert.deepEqual(streamers.get(C3).settings.colpi.premiKickErrori, []);
  // la seconda passata di Twitch non tocca i campi di Kick, e viceversa
  await riconciliaPremi({ login: C3, prima: streamers.get(C3).settings.colpi, helix: tw, streamers, pagina: 'p' });
  assert.equal(streamers.get(C3).settings.colpi.voci.find((x) => x.id === 'torta').premioKick, v.torta.premioKick);
  const kErr = { ...kickFinto(), creaReward: async () => { throw Object.assign(new Error('Kick: boh'), { status: 500 }); } };
  streamers.setSettings(C3, { colpi: { attivo: true, voci: [{ id: 'x', comando: 'x', nome: 'X', puntiKick: 10 }] } });
  const r = await riconciliaPremi({ login: C3, prima: {}, helix: kErr, streamers, pagina: 'p', piattaforma: 'kick' });
  assert.equal(r.errori[0].piattaforma, 'kick', 'un errore di Kick si dice di Kick');
  assert.equal(streamers.get(C3).settings.colpi.premiErrori, undefined, 'e non finisce fra quelli di Twitch');
});
