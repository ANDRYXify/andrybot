// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL GIUDIZIO SULLA LISTA DEI FOLLOWER (src/features/follower-giudizio.js,
// docs/FOLLOWER.md). E' una funzione pura: qui si prova senza Twitch e senza
// database. Le promesse:
//  · le soglie si ricavano dalla lista, e dicono «meno di un falso allarme
//    atteso» sul serio;
//  · nati insieme E arrivati insieme fa «probabile», una sola delle due no: un
//    raid vero resta fra i dubbi;
//  · chi e' protetto vince su tutto, anche su un nome in lista;
//  · il filtro che vedi e' chi viene toccato, e chi non si puo' toccare resta
//    fuori per regola.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as G from '../../src/features/follower-giudizio.js';

const MIN = 60_000, GIORNO = 86_400_000;
const ORA = Date.UTC(2026, 9, 8, 12, 0, 0);

// Una lista di persone vere: nate nel corso di anni, arrivate nel corso di mesi.
// Le date si spargono con un passo fisso (niente caso: la prova e' sempre la stessa).
function persone(n, { dal = ORA - 8 * 365 * GIORNO, arco = 7 * 365 * GIORNO, seguitoArco = 300 * GIORNO } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    user_id: 'p' + i, login: 'persona' + i, seguito: ORA - GIORNO - Math.floor((i * 7919 % n) / n * seguitoArco),
    creato: dal + Math.floor((i * 104729 % n) / n * arco), foto_base: 0, bio_vuota: 0, tipo: '', ruolo: '', fiducia: 0, uscito: 0, stato: '',
  }));
}
// Una fabbrica: nati in pochi minuti, arrivati in pochi secondi.
function fabbrica(n, { nati = ORA - 40 * GIORNO, arrivati = ORA - 2 * GIORNO, prefisso = 'f' } = {}) {
  return Array.from({ length: n }, (_, i) => ({
    user_id: prefisso + i, login: `${prefisso}bot${i}`, seguito: arrivati + i * 2000, creato: nati + i * 20_000,
    foto_base: 1, bio_vuota: 1, tipo: '', ruolo: '', fiducia: 0, uscito: 0, stato: '',
  }));
}
const ctxDi = (righe, extra = {}) => ({
  canale: 'casa', esenti: new Set(), extra: new Set(), servizio: new Set(['nightbot']), diCasa: 4, conferme: 3,
  nomeNoto: () => false, nomePattern: () => false, rete: () => 0, precedenti: new Map(),
  segnali: G.segnaliLista(righe), ora: ORA, ...extra,
});
const giudica = (righe, extra) => { const c = ctxDi(righe, extra); return new Map(righe.map((r) => [r.user_id, G.giudizioFollower(r, c)])); };

test('la coda di Poisson: i conti di base', () => {
  assert.equal(G.codaPoisson(2, 0), 1);
  assert.equal(G.codaPoisson(0, 1), 0);
  assert.ok(Math.abs(G.codaPoisson(1, 1) - (1 - Math.exp(-1))) < 1e-12);
  assert.ok(Math.abs(G.codaPoisson(1, 2) - (1 - 2 * Math.exp(-1))) < 1e-12);
});

test('la soglia e\' il primo numero con meno di un falso allarme atteso, e quello prima no', () => {
  for (const n of [50, 2000, 40000]) {
    const v = persone(n).map((r) => r.creato);
    const k = G.sogliaDi(v, G.FINESTRA_GEMELLI, { minimo: G.GEMELLI_MIN, tetto: G.GEMELLI_TETTO });
    const s = [...v].sort((a, b) => a - b);
    const q = (p) => s[Math.floor(p * (n - 1))];
    const lambda = ((n - 1) * G.FINESTRA_GEMELLI) / (2 * (q(0.75) - q(0.25)));
    assert.ok(n * G.codaPoisson(lambda, k - 1) < 1, `n=${n}: sotto uno a ${k}`);
    if (k > G.GEMELLI_MIN) assert.ok(n * G.codaPoisson(lambda, k - 2) >= 1, `n=${n}: e a ${k - 1} non ancora`);
  }
  assert.equal(G.sogliaDi([], G.FINESTRA_GEMELLI, { minimo: 4, tetto: 25 }), 4, 'lista vuota: il minimo');
  assert.equal(G.sogliaDi([5, 5, 5, 5], G.FINESTRA_GEMELLI, { minimo: 4, tetto: 25 }), 25, 'tutti nello stesso istante: il tetto');
  const piccola = G.sogliaDi(persone(100).map((r) => r.creato), G.FINESTRA_GEMELLI, { minimo: 4, tetto: 25 });
  const grande = G.sogliaDi(persone(200000, { arco: 2 * 365 * GIORNO }).map((r) => r.creato), G.FINESTRA_GEMELLI, { minimo: 4, tetto: 25 });
  assert.ok(grande > piccola, `una lista grande e fitta alza la soglia da sola (${piccola} -> ${grande})`);
});

test('i vicini si contano nella finestra esatta: cinque minuti di qua e di la\' per la nascita, trenta secondi per l\'arrivo', () => {
  const t0 = ORA - 100 * GIORNO;
  const righe = [
    { user_id: 'a', creato: t0, seguito: ORA },
    { user_id: 'b', creato: t0 + 4 * MIN, seguito: ORA + 20_000 },
    { user_id: 'c', creato: t0 + 6 * MIN, seguito: ORA + 40_000 },
    { user_id: 'd', creato: t0 + 20 * MIN, seguito: ORA + 100_000 },
  ];
  const s = G.segnaliLista(righe);
  assert.deepEqual(['a', 'b', 'c', 'd'].map((id) => s.gemelli.get(id)), [2, 3, 2, 1]);
  assert.deepEqual(['a', 'b', 'c', 'd'].map((id) => s.ondata.get(id)), [2, 3, 2, 1]);
});

test('pochi account vecchissimi non spostano la soglia: conta la meta\' centrale della lista', () => {
  const lista = persone(200000, { arco: 2 * 365 * GIORNO }).map((r) => r.creato);
  const k = G.sogliaDi(lista, G.FINESTRA_GEMELLI, { minimo: 4, tetto: 25 });
  const conVecchi = [...lista, ...Array.from({ length: 50 }, (_, i) => ORA - (15 * 365 - i) * GIORNO)];
  assert.ok(k > 4, `la lista e' abbastanza fitta da avere una soglia sopra il minimo (${k})`);
  assert.equal(G.sogliaDi(conVecchi, G.FINESTRA_GEMELLI, { minimo: 4, tetto: 25 }), k);
});

test('tolti undici bot di una fabbrica, il dodicesimo resta della fabbrica', () => {
  const righe = [...persone(400), ...fabbrica(12)];
  for (let i = 0; i < 11; i++) Object.assign(righe.find((r) => r.user_id === 'f' + i), { uscito: ORA, stato: 'tolto' });
  assert.equal(giudica(righe).get('f11').livello, 'probabile');
});

test('la fabbrica: nati insieme e arrivati insieme fa «probabile», e i veri restano puliti', () => {
  const righe = [...persone(400), ...fabbrica(12)];
  const g = giudica(righe);
  for (let i = 0; i < 12; i++) {
    const x = g.get('f' + i);
    assert.equal(x.livello, 'probabile', `f${i}`);
    assert.equal(x.motivi[0].k, 'fabbrica');
  }
  const veri = [...g.entries()].filter(([id]) => id.startsWith('p'));
  assert.equal(veri.filter(([, x]) => x.livello === 'pulito').length, 400, 'nessuna persona vera fuori dai puliti');
});

test('un raid vero: tanti arrivati insieme ma nati in anni diversi resta fra i dubbi', () => {
  const raid = persone(15, { dal: ORA - 6 * 365 * GIORNO, arco: 5 * 365 * GIORNO }).map((r, i) => ({ ...r, user_id: 'r' + i, login: 'raid' + i, seguito: ORA - 3 * GIORNO + i * 3000 }));
  const g = giudica([...persone(300), ...raid]);
  for (let i = 0; i < 15; i++) {
    const x = g.get('r' + i);
    assert.equal(x.livello, 'dubbio', `r${i}`);
    assert.deepEqual(x.motivi.map((m) => m.k), ['ondata']);
  }
});

test('nati insieme ma arrivati in giorni diversi: dubbio, non probabile', () => {
  const nati = fabbrica(10).map((r, i) => ({ ...r, foto_base: 0, bio_vuota: 0, seguito: ORA - (i + 2) * 3 * GIORNO }));
  const g = giudica([...persone(300), ...nati]);
  for (let i = 0; i < 10; i++) assert.equal(g.get('f' + i).livello, 'dubbio');
  assert.equal(g.get('f0').motivi[0].k, 'gemelli');
});

test('l\'ordine: chi e\' protetto vince su tutto, anche su un nome in lista o in una fabbrica', () => {
  const righe = [...persone(200), ...fabbrica(10)];
  const base = { nomeNoto: (l) => l === 'fbot0' || l === 'fbot1' || l === 'fbot2' || l === 'fbot3' || l === 'fbot4' || l === 'fbot5' };
  righe.find((r) => r.user_id === 'f0').stato = 'apposto';
  righe.find((r) => r.user_id === 'f1').ruolo = 'sub';
  righe.find((r) => r.user_id === 'f2').fiducia = 4;
  const g = giudica(righe, { ...base, esenti: new Set(['fbot3']) });
  assert.deepEqual([g.get('f0').livello, g.get('f0').motivi[0].k], ['protetto', 'apposto']);
  assert.deepEqual([g.get('f1').livello, g.get('f1').motivi[0].k], ['protetto', 'sub']);
  assert.deepEqual([g.get('f2').livello, g.get('f2').motivi[0].k], ['protetto', 'casa']);
  assert.deepEqual([g.get('f3').livello, g.get('f3').motivi[0].k], ['protetto', 'esente']);
  assert.deepEqual([g.get('f4').livello, g.get('f4').motivi[0].k], ['noto', 'lista']);
  const tu = G.giudizioFollower({ ...righe[0], login: 'casa' }, ctxDi(righe));
  assert.deepEqual([tu.livello, tu.motivi[0].k], ['protetto', 'tu']);
  const nb = G.giudizioFollower({ ...righe[0], login: 'nightbot' }, ctxDi(righe));
  assert.deepEqual([nb.livello, nb.motivi[0].k], ['protetto', 'servizio']);
  const di = G.giudizioFollower({ ...righe[0], fiducia: 3 }, ctxDi(righe));
  assert.equal(di.livello, 'pulito', 'sotto la soglia di casa non e\' protetto');
});

test('i nomi: «Blocca sempre», la lista pubblica e la forma promozionale sono «noto»', () => {
  const r = persone(1)[0];
  const c = ctxDi([r], { extra: new Set(['persona0']) });
  assert.deepEqual(G.giudizioFollower(r, c).motivi, [{ k: 'bloccasempre' }]);
  assert.deepEqual(G.giudizioFollower(r, ctxDi([r], { nomePattern: () => true })).motivi, [{ k: 'nomebot' }]);
  assert.equal(G.giudizioFollower(r, ctxDi([r], { nomePattern: () => true })).livello, 'noto');
});

test('la rete e gli attacchi: riconosciuto altrove o fermato qui e\' probabile, sospettato e\' dubbio', () => {
  const r = persone(50)[3];
  const righe = persone(50);
  assert.equal(G.giudizioFollower(r, ctxDi(righe, { rete: () => 3 })).livello, 'probabile');
  assert.deepEqual(G.giudizioFollower(r, ctxDi(righe, { rete: () => 3 })).motivi, [{ k: 'rete', n: 3 }], 'e il motivo lo dice');
  assert.equal(G.giudizioFollower(r, ctxDi(righe, { rete: () => 2 })).livello, 'pulito', 'due canali non bastano');
  assert.equal(G.giudizioFollower(r, ctxDi(righe, { precedenti: new Map([[r.login, { colpito: 5, sospettato: 0 }]]) })).livello, 'probabile');
  assert.equal(G.giudizioFollower(r, ctxDi(righe, { precedenti: new Map([[r.login, { colpito: 0, sospettato: 5 }]]) })).livello, 'dubbio');
});

test('affiliato o partner in una fabbrica: al massimo dubbio, e il motivo lo dice', () => {
  const righe = [...persone(300), ...fabbrica(10)];
  righe.find((r) => r.user_id === 'f5').tipo = 'affiliate';
  const x = giudica(righe).get('f5');
  assert.equal(x.livello, 'dubbio');
  assert.ok(x.motivi.some((m) => m.k === 'streamer'));
});

test('il profilo da solo: un account di oggi spoglio col nome generato fa guardare, non agire', () => {
  const r = { ...persone(1)[0], login: 'xkcdqwrtpz', creato: ORA - 3600_000, foto_base: 1, bio_vuota: 1 };
  const x = G.giudizioFollower(r, ctxDi(persone(100)));
  assert.equal(x.livello, 'dubbio');
  assert.deepEqual(x.motivi.map((m) => m.k), ['oggi', 'foto', 'bio', 'nomegenerato']);
  const timido = { ...persone(1)[0], creato: ORA - 3 * GIORNO, foto_base: 1, bio_vuota: 1 };
  assert.equal(G.giudizioFollower(timido, ctxDi(persone(100))).livello, 'pulito', 'uno spettatore nuovo e timido resta pulito');
});

test('un account che Twitch non trova piu\' si segna chiuso', () => {
  const x = G.giudizioFollower({ ...persone(1)[0], creato: -1 }, ctxDi(persone(10)));
  assert.equal(x.chiuso, true);
  assert.deepEqual(x.motivi, [{ k: 'chiuso' }]);
});

test('il filtro: valori storti tornano a quelli di serie', () => {
  const f = G.filtroDa({ livello: 'boh', cerca: ' @Ab-c!12 ', eta: 3, ordine: 'x', ondata: '10-20', foto: '1', dal: -5 });
  assert.deepEqual(f, { livello: 'tutti', cerca: 'abc12', eta: 0, dal: 0, al: 0, foto: true, ondata: { da: 10, a: 20 }, ordine: 'recenti' });
  assert.equal(G.filtroDa({ eta: '7' }).eta, 7);
  assert.equal(G.filtroDa({ ondata: '10-x' }).ondata, null);
});

test('usciti e tolti stanno solo nei loro filtri, e «tutti» e\' chi segue adesso', () => {
  const v = [
    { user_id: '1', login: 'a', livello: 'pulito', uscito: 0, stato: '', seguito: 1 },
    { user_id: '2', login: 'b', livello: 'probabile', uscito: 5, stato: 'tolto', seguito: 2 },
    { user_id: '3', login: 'c', livello: 'pulito', uscito: 5, stato: '', seguito: 3 },
    { user_id: '4', login: 'd', livello: 'noto', uscito: 0, stato: '', seguito: 4, chiuso: true },
  ];
  const ids = (livello) => G.filtra(v, G.filtroDa({ livello }), ORA).map((x) => x.user_id);
  assert.deepEqual(ids('tutti'), ['4', '1']);
  assert.deepEqual(ids('usciti'), ['3', '2']);
  assert.deepEqual(ids('tolti'), ['2']);
  assert.deepEqual(ids('chiusi'), ['4']);
  assert.deepEqual(ids('probabile'), [], 'un probabile tolto non e\' piu\' fra i probabili');
  assert.deepEqual(G.contiDi(v), { tutti: 2, protetto: 0, noto: 1, probabile: 0, dubbio: 0, pulito: 1, chiusi: 1, usciti: 2, tolti: 1 });
});

test('chi si puo\' toccare: mai i protetti, mai gli account chiusi, mai chi non segue piu\'', () => {
  const x = (o) => ({ livello: 'probabile', uscito: 0, stato: '', chiuso: false, ...o });
  assert.equal(G.azionabile(x(), 'togli'), true);
  assert.equal(G.azionabile(x({ livello: 'protetto' }), 'togli'), false);
  assert.equal(G.azionabile(x({ livello: 'protetto' }), 'blocca'), false);
  assert.equal(G.azionabile(x({ livello: 'protetto' }), 'apposto'), false, 'e\' gia\' protetto');
  assert.equal(G.azionabile(x({ chiuso: true }), 'togli'), false);
  assert.equal(G.azionabile(x({ uscito: 5 }), 'togli'), false);
  assert.equal(G.azionabile(x({ uscito: 5, livello: 'dubbio' }), 'apposto'), false);
  assert.equal(G.azionabile(x({ stato: 'bloccato', uscito: 5 }), 'sblocca'), true);
  assert.equal(G.azionabile(x({ stato: 'tolto', uscito: 5 }), 'sblocca'), false, 'tolto vuol dire gia\' sbloccato');
  assert.equal(G.azionabile(x({ stato: 'tolto' }), 'togli'), false);
  assert.equal(G.azionabile(x(), 'boh'), false);
  assert.equal(G.azionabile(x({ livello: 'pulito' }), 'togli'), false, 'un pulito non si toglie in massa');
  assert.equal(G.azionabile(x({ livello: 'pulito' }), 'blocca'), false);
  assert.equal(G.azionabile(x({ livello: 'dubbio' }), 'apposto'), true, '«a posto» in massa e\' la risposta a «da guardare»');
  assert.equal(G.azionabile(x({ livello: 'pulito' }), 'apposto'), false);
  assert.equal(G.azionabile(x(), 'apposto'), false, 'un probabile non si protegge in massa');
  assert.equal(G.azionabile(x({ livello: 'noto' }), 'apposto'), false);
  assert.equal(G.azionabile(x({ livello: 'dubbio' }), 'togli'), true);
});

test('le ondate: follow a meno di un minuto l\'uno dall\'altro, con quanti nati insieme', () => {
  const righe = [...persone(300), ...fabbrica(12)];
  const s = G.segnaliLista(righe);
  const v = righe.map((r) => ({ ...r, livello: 'pulito' }));
  const o = G.ondateDi(v, s);
  const grossa = o.find((x) => x.quanti >= 12);
  assert.ok(grossa, 'la fabbrica e\' un\'ondata');
  assert.equal(grossa.nati, 12);
  assert.ok(grossa.fine - grossa.inizio < 60_000);
  const catena = Array.from({ length: 10 }, (_, i) => ({ ...persone(1)[0], user_id: 'c' + i, login: 'c' + i, seguito: ORA - 5 * GIORNO + i * 50_000 }));
  const conCatena = [...persone(300), ...catena];
  const s2 = G.segnaliLista(conCatena);
  const o2 = G.ondateDi(conCatena.map((r) => ({ ...r, livello: 'pulito' })), s2);
  assert.equal(o2.length, 0, 'una catena lenta non e\' un\'ondata: nessuno dei suoi ha il motivo');
  const g = giudica(conCatena);
  assert.ok(catena.every((c) => !g.get(c.user_id).motivi.some((m) => m.k === 'ondata')), 'e infatti nessuno lo dice');
});

test('ogni motivo che il giudizio scrive ha le sue parole nelle tre lingue', () => {
  const SRC = readFileSync(new URL('../../src/features/follower-giudizio.js', import.meta.url), 'utf8');
  const codici = new Set([...SRC.matchAll(/\{ k: '([a-z]+)'/g)].map((m) => m[1]));
  for (const ruolo of ['mod', 'vip', 'sub']) codici.add(ruolo);
  for (const k of codici) {
    assert.ok(G.TESTI_MOTIVO[k], `il motivo «${k}» ha le parole`);
    assert.equal(G.TESTI_MOTIVO[k].length, 3);
  }
  assert.equal(G.testoMotivo({ k: 'lista' }, 'en'), 'in the public bot list');
});
