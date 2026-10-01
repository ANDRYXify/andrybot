// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ECONOMIA DELLE MONETE: la porta (docs/ECONOMIA.md).
//
// Le promesse:
//  · coi valori di partenza la curva del silenzio e le quote sono quelle di prima;
//  · un bot non riceve mai: ne' dal giro, ne' dai messaggi, ne' dalla serie;
//  · gli esclusi dello streamer nemmeno;
//  · la crescita automatica si spegne tutta insieme, e i giochi restano;
//  · un messaggio che non conta non paga e non vale come partecipazione;
//  · il silenzio si ferma dopo i minuti scelti, riparte pieno appena si scrive,
//    sta nel database (un riavvio non lo azzera) e si riazzera se uno esce;
//  · i tetti tagliano la quota a quello che manca, per diretta e sul saldo;
//  · l'ora doppia moltiplica, e finisce quando deve;
//  · nessuna fonte automatica scrive sul saldo senza passare dalla porta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('economia-');
const { streamers, points, statoVivo } = await import('../../src/db.js');
const E = await import('../../src/features/economia.js');
const games = await import('../../src/features/games.js');
test.after(() => casa.pulisci());

const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
let n = 0;
const canale = (punti = {}, altro = {}) => {
  const c = `eco${++n}`;
  streamers.upsertApproved(c, c, String(1000 + n));
  streamers.setEnabled(c, true);
  streamers.setSettings(c, { punti, ...altro });
  return c;
};
const GIRO = E.GIRO_MS;
const T0 = 1_700_000_000_000;
const giri = (c, chi, quanti, { parlanti = [], da = T0, diretta = 'd1' } = {}) => {
  const esiti = [];
  for (let i = 0; i < quanti; i++) esiti.push(E.giro(c, chi, { parlanti: new Set(parlanti), diretta, ora: da + i * GIRO }));
  return esiti;
};

test('coi valori di partenza la curva e le quote sono quelle di prima', () => {
  const vecchia = (g, c) => Math.max(c.lurkMinimo, 1 - Math.max(0, g) * c.lurkPasso);
  const vecchiaQuota = ({ attivo, giriFermo, sub, vip }, c) => {
    const base = c.perPresenza * vecchia(attivo ? 0 : giriFermo, c);
    return Math.round((base + (attivo ? c.perAttivita : 0)) * (sub ? c.moltSub : (vip ? c.moltVip : 1)));
  };
  for (const grezza of [{}, { lurkPasso: 0.3, lurkMinimo: 0 }, { perPresenza: 17, perAttivita: 3, moltSub: 2, moltVip: 1.5 }]) {
    const c = E.normalizza(grezza);
    for (let g = 0; g <= 40; g++) {
      assert.equal(E.fattoreSilenzio(g, c), vecchia(g, c), `giro ${g} con ${JSON.stringify(grezza)}`);
      for (const d of [{ attivo: true }, { attivo: false, giriFermo: g }, { attivo: false, giriFermo: g, sub: true }, { attivo: false, giriFermo: g, vip: true }]) {
        assert.equal(E.quotaGiro(d, c), vecchiaQuota({ giriFermo: 0, ...d }, c));
      }
    }
  }
});

test('un bot non riceve mai: giro, messaggio e serie', () => {
  const c = canale({}, { antibot: { extra: ['ilmiobot'] } });
  const e = E.giro(c, ['lucia', 'nightbot', 'followers4u_now', 'ilmiobot'], { diretta: 'd1', ora: T0 });
  assert.equal(e.accreditati, 1);
  assert.equal(e.saltati, 3);
  for (const b of ['nightbot', 'followers4u_now', 'ilmiobot']) assert.equal(points.get(c, b), 0, b);
  assert.ok(points.get(c, 'lucia') > 0);
  assert.equal(E.messaggio({ channel: c, user: 'streamelements', text: 'ciao a tutti' }).dato, 0);
  assert.equal(E.riceve(c, 'nightbot', 50, { fonte: 'serie' }), 0);
  assert.equal(points.get(c, 'nightbot'), 0);
});

test('lo streamer puo\' dire «questo non e\' un bot», e allora riceve', () => {
  const c = canale({}, { antibot: { esenti: ['followers4u_now'] } });
  E.giro(c, ['followers4u_now'], { diretta: 'd1', ora: T0 });
  assert.ok(points.get(c, 'followers4u_now') > 0);
});

test('gli esclusi non ricevono, e non entrano nemmeno nel conto', () => {
  const c = canale({ esclusi: 'SecondoAccount, @amica ; nome-storto!' });
  assert.deepEqual(E.regole(c).esclusi, ['secondoaccount', 'amica'], 'nomi ripuliti, quelli impossibili via');
  E.giro(c, ['secondoaccount', 'amica', 'marco'], { diretta: 'd1', ora: T0 });
  assert.equal(points.get(c, 'secondoaccount'), 0);
  assert.equal(points.get(c, 'amica'), 0);
  assert.ok(points.get(c, 'marco') > 0);
});

test('la crescita automatica si spegne tutta insieme, e i giochi restano', () => {
  const c = canale({ auto: false });
  E.giro(c, ['lucia'], { diretta: 'd1', ora: T0 });
  assert.equal(E.messaggio({ channel: c, user: 'lucia', text: 'eccomi qui' }).dato, 0);
  assert.equal(E.riceve(c, 'lucia', 30, { fonte: 'serie' }), 0);
  assert.equal(points.get(c, 'lucia'), 0);
  points.add(c, 'lucia', 100);
  assert.equal(points.get(c, 'lucia'), 100, 'un gioco o un Modulo danno lo stesso');
});

test('un messaggio che non conta non paga e non vale come partecipazione', () => {
  const c = canale({ noComandi: true, noRipetuti: true, minLettere: 4, perPresenza: 0, perAttivita: 10 });
  const m = (text, user = 'lucia') => E.messaggio({ channel: c, user, text }, T0 + (++n) * 61_000);
  assert.equal(m('!slot').conta, false, 'un comando');
  assert.equal(m('ok').conta, false, 'troppo corto');
  assert.equal(m('che bella partita').conta, true);
  assert.equal(m('che  bella   partita').conta, false, 'lo stesso di prima, spazi a parte');
  assert.equal(m('e adesso?').conta, true);
  // nel giro: chi ha scritto solo comandi non partecipa
  games.accredita({ channel: c, user: 'marco', text: '!monete' });
  games.accredita({ channel: c, user: 'nina', text: 'ciao a tutti quanti' });
  const prima = { marco: points.get(c, 'marco'), nina: points.get(c, 'nina') };
  games.giroMonete(c, ['marco', 'nina'], { live: true, diretta: 'd1' });
  assert.equal(points.get(c, 'marco') - prima.marco, 0, 'i comandi non sono partecipazione');
  assert.equal(points.get(c, 'nina') - prima.nina, 10);
});

test('il silenzio si ferma dopo i minuti scelti e riparte appena si scrive', () => {
  const c = canale({ perPresenza: 10, perAttivita: 0, lurkPasso: 0, pienoMin: 10, stopMin: 20 });
  const e = giri(c, ['lucia'], 6);
  assert.deepEqual(e.map((x) => x.monete), [10, 10, 10, 0, 0, 0], 'piena per 10 minuti, ferma dai 20');
  const dopo = E.giro(c, ['lucia'], { parlanti: new Set(['lucia']), diretta: 'd1', ora: T0 + 6 * GIRO });
  assert.equal(dopo.monete, 10, 'ha scritto: torna piena');
  assert.equal(E.giro(c, ['lucia'], { diretta: 'd1', ora: T0 + 7 * GIRO }).monete, 10, 'e il silenzio riparte da capo');
});

test('il silenzio sta nel database: niente memoria da perdere, e chi esce riparte', () => {
  const c = canale({ perPresenza: 10, perAttivita: 0, lurkPasso: 0, stopMin: 15 });
  giri(c, ['lucia'], 3);
  // la riga dice quanti giri: e' quello che un riavvio ritrova
  assert.equal(points.economiaDi(c, ['lucia']).get('lucia').zitto_giri, 3);
  assert.equal(E.giro(c, ['lucia'], { diretta: 'd1', ora: T0 + 3 * GIRO }).monete, 0, 'ferma al quarto giro di fila');
  // un'ora fuori dalla chat: rientrando si riparte
  assert.equal(E.giro(c, ['lucia'], { diretta: 'd1', ora: T0 + 15 * GIRO }).monete, 10);
});

test('il tetto per diretta taglia a quello che manca, e una diretta nuova riparte', () => {
  const c = canale({ perPresenza: 5, perAttivita: 0, lurkPasso: 0, tettoDiretta: 12 });
  assert.deepEqual(giri(c, ['lucia'], 4).map((x) => x.monete), [5, 5, 2, 0]);
  assert.equal(points.get(c, 'lucia'), 12);
  assert.equal(E.giro(c, ['lucia'], { diretta: 'd2', ora: T0 + 40 * GIRO }).monete, 5, 'diretta nuova, tetto nuovo');
});

test('il saldo massimo ferma le monete automatiche, non le vincite', () => {
  const c = canale({ perPresenza: 30, perAttivita: 0, lurkPasso: 0, saldoMax: 50 });
  assert.deepEqual(giri(c, ['lucia'], 3).map((x) => x.monete), [30, 20, 0]);
  points.add(c, 'lucia', 500);
  assert.equal(points.get(c, 'lucia'), 550, 'una vincita va oltre');
  assert.equal(E.giro(c, ['lucia'], { diretta: 'd1', ora: T0 + 3 * GIRO }).monete, 0);
});

test('il tetto vale anche per i messaggi, a canale spento per la giornata', () => {
  const c = canale({ perMessaggio: 4, ogniSecondi: 5, tettoDiretta: 10 });
  const dati = [0, 1, 2, 3].map((i) => E.messaggio({ channel: c, user: 'marta', text: `messaggio ${i}` }, T0 + i * 10_000).dato);
  assert.deepEqual(dati, [4, 4, 2, 0]);
});

test('le monete per messaggio a canale spento si possono spegnere', () => {
  const c = canale({ perMessaggio: 3, msgSpento: false });
  assert.equal(E.messaggio({ channel: c, user: 'ugo', text: 'ciao' }, T0).dato, 0, 'canale spento');
  statoVivo.scrivi(c, 'economia', { diretta: 'dx', ts: T0 });
  assert.equal(E.messaggio({ channel: c, user: 'ugo', text: 'eccomi' }, T0 + 60_000).dato, 3, 'in diretta si');
});

test('l\'ora doppia moltiplica, e finisce quando deve', () => {
  const c = canale({ perPresenza: 10, perAttivita: 0, lurkPasso: 0 });
  E.accendiDoppio(c, { minuti: 10, x: 2 }, T0);
  assert.equal(E.giro(c, ['lucia'], { diretta: 'd1', ora: T0 }).monete, 20);
  assert.equal(E.giro(c, ['lucia'], { diretta: 'd1', ora: T0 + 3 * GIRO }).monete, 10, 'dopo dieci minuti torna normale');
  assert.equal(E.doppio(c, T0 + 3 * GIRO), null);
  const d = E.accendiDoppio(c, { minuti: 9999, x: 99 }, T0);
  assert.equal(d.x, E.DOPPIO.xMax);
  assert.equal(d.fino, T0 + E.DOPPIO.max * 60_000);
});

test('i conti del pannello sono quelli del bot', () => {
  const regole = { perPresenza: 10, perAttivita: 4, lurkPasso: 0.25, lurkMinimo: 0.5, stopMin: 60, perMessaggio: 0 };
  const c = canale(regole);
  const atteso = E.contiDiretta(regole, { minuti: 120 });
  const e = giri(c, ['zitta'], 24);
  assert.equal(e.reduce((s, x) => s + x.monete, 0), atteso.silenzio, 'chi guarda in silenzio');
  assert.deepEqual(E.contiDiretta({ auto: false }), { spesso: 0, ogniTanto: 0, silenzio: 0 });
});

test('nessuna fonte automatica scrive sul saldo senza passare dalla porta', () => {
  const g = leggi('src/features/games.js');
  for (const f of ['export function accredita(', 'export function giroMonete(']) {
    const i = g.indexOf(f);
    const corpo = g.slice(i, g.indexOf('\n}\n', i));
    assert.ok(i > 0 && !/points\.add/.test(corpo), `${f} non tocca il saldo`);
  }
  assert.ok(!/points\.add/.test(leggi('src/features/presenze.js')), 'la serie passa dalla porta');
  assert.match(leggi('src/web/server.js'), /out\.punti = \{ \.\.\.vecchi, \.\.\.economia\.normalizza\(\{ \.\.\.giaQui, \.\.\.p \}\) \};/, 'il server salva con le regole della porta');
});
