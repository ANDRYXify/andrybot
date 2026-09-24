// LE PUBBLICAZIONI AUTOMATICHE (docs/AUTOMATICHE.md): la storia prima della
// diretta, la settimana confermata. Qui il calendario (quando si apre e quando
// si chiude ogni finestra, anche a cavallo della mezzanotte e del cambio
// d'ora), la conferma, e il giro con la rete sostituita: esce una volta sola,
// un'immagine vecchia non esce, una settimana non confermata nemmeno.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-automatiche-');
const A = await import('../../src/features/automatiche.js');
process.on('exit', () => usaEGetta.pulisci());

const Z = (s) => Date.parse(s);
const giorni = (quali) => Array.from({ length: 7 }, (_, i) => (quali[i] ? { ora: quali[i][0], att: quali[i][1], off: false } : { ora: '', att: '', off: false }));
// mercoledi' alle 21 (indice 2: la settimana parte dal lunedi'), giovedi' a mezzanotte e mezza
const SETT = { fuso: 'Europe/Rome', giorni: giorni({ 2: ['21:00', 'Hades'], 3: ['00:30', 'Notte'] }), twitch: { categorie: {} } };
const conf = (v) => A.confDi(v);

test('prima della diretta: la finestra va dall\'anticipo all\'inizio', () => {
  const c = conf({ prima: { attiva: true, anticipo: 120 } });
  const inizio = Z('2026-09-30T19:00:00Z'); // mercoledi' 21:00 a Roma (ora legale)
  assert.equal(A.primaDaFare({ sett: SETT, conf: c, adesso: Z('2026-09-30T16:59:00Z') }), null, 'prima dell\'anticipo niente');
  assert.deepEqual(A.primaDaFare({ sett: SETT, conf: c, adesso: Z('2026-09-30T17:00:00Z') }), { per: inizio, giorno: 2, esce: Z('2026-09-30T17:00:00Z') });
  assert.equal(A.primaDaFare({ sett: SETT, conf: c, fatte: [inizio], adesso: Z('2026-09-30T18:00:00Z') }), null, 'una volta sola');
  const dopo = A.primaDaFare({ sett: SETT, conf: c, adesso: Z('2026-09-30T19:00:30Z') });
  assert.ok(!dopo || dopo.per !== inizio, 'cominciata la diretta, la sua storia non esce piu\'');
  assert.equal(A.primaDaFare({ sett: SETT, conf: conf({ prima: { attiva: false } }), adesso: Z('2026-09-30T18:00:00Z') }), null, 'spenta, niente');
});

test('un anticipo che scavalca la mezzanotte esce il giorno prima', () => {
  const c = conf({ prima: { attiva: true, anticipo: 120 } });
  // giovedi' 00:30 a Roma = mercoledi' 22:30Z; due ore prima e' mercoledi' 22:30 a Roma
  const r = A.primaDaFare({ sett: { ...SETT, giorni: giorni({ 3: ['00:30', 'Notte'] }) }, conf: c, adesso: Z('2026-09-30T20:30:00Z') });
  assert.deepEqual(r && [r.per, r.giorno], [Z('2026-09-30T22:30:00Z'), 3]);
});

test('la settimana esce entro un\'ora dall\'ora scelta, nel fuso anche col cambio d\'ora', () => {
  const c = conf({ settimana: { attiva: true, giorno: 6, ora: '18:00', chiedi: false } });
  // domenica 25 ottobre 2026 finisce l'ora legale: le 18 a Roma sono le 17Z
  const per = Z('2026-10-25T17:00:00Z');
  assert.equal(A.settimanaDaFare({ sett: SETT, conf: c, adesso: per - 60_000 }), null);
  assert.deepEqual(A.settimanaDaFare({ sett: SETT, conf: c, adesso: per }), { per });
  assert.deepEqual(A.settimanaDaFare({ sett: SETT, conf: c, adesso: per + 59 * 60_000 }), { per });
  assert.equal(A.settimanaDaFare({ sett: SETT, conf: c, adesso: per + 61 * 60_000 }), null, 'passata l\'ora non si recupera');
  assert.equal(A.settimanaDaFare({ sett: SETT, conf: c, fatte: [per], adesso: per + 60_000 }), null, 'una volta sola');
  assert.equal(A.prossimaUscita({ sett: SETT, conf: c, adesso: Z('2026-09-26T12:00:00Z') }), Z('2026-09-27T16:00:00Z'), 'con l\'ora legale le 18 sono le 16Z');
});

test('la conferma si chiede il giorno prima, una volta', () => {
  const c = conf({ settimana: { attiva: true, giorno: 6, ora: '18:00' } });
  const per = Z('2026-09-27T16:00:00Z');
  const stato = (v = {}) => ({ settimana: { chiesta: 0, confermata: 0, ...v } });
  assert.equal(A.richiestaDaFare({ sett: SETT, conf: c, stato: stato(), adesso: per - 24 * 3600_000 - 60_000 }), null);
  assert.deepEqual(A.richiestaDaFare({ sett: SETT, conf: c, stato: stato(), adesso: per - 24 * 3600_000 }), { per });
  assert.equal(A.richiestaDaFare({ sett: SETT, conf: c, stato: stato({ chiesta: per }), adesso: per - 3600_000 }), null, 'gia\' chiesta');
  assert.equal(A.richiestaDaFare({ sett: SETT, conf: c, stato: stato({ confermata: per }), adesso: per - 3600_000 }), null, 'gia\' confermata');
  assert.equal(A.richiestaDaFare({ sett: SETT, conf: conf({ settimana: { attiva: true, chiedi: false } }), stato: stato(), adesso: per - 3600_000 }), null, 'senza «chiedimi prima» non si chiede');
});

test('il link della mail conferma quell\'uscita, e solo finche\' non e\' passata', () => {
  const per = Z('2026-09-27T16:00:00Z');
  const chiave = A.preparaRichiesta('link', per);
  assert.equal(A.confermaConChiave('link', 'sbagliata', per - 1000).ok, false);
  assert.deepEqual(A.richiestaDi('link', chiave, per - 1000), { per, scaduta: false, confermata: false }, 'aprire il link non conferma');
  assert.deepEqual(A.confermaConChiave('link', chiave, per - 1000), { ok: true, per });
  assert.equal(A.leggi('link').settimana.confermata, per);
  const altra = A.preparaRichiesta('link2', per);
  assert.deepEqual(A.confermaConChiave('link2', altra, per + 1000), { ok: false, motivo: 'scaduto' });
});

test('il giro: una volta sola, niente immagini vecchie, niente settimane non confermate', async () => {
  const login = 'giro';
  A.salvaConf(login, { prima: { attiva: true, anticipo: 120 }, settimana: { attiva: true, giorno: 6, ora: '18:00', chiedi: true } });
  const imp = A.improntaImmagini(SETT);
  const uscite = [], mandate = [], avvisi = [], richieste = [];
  const fuori = {
    pubblicaStoria: async (b) => { uscite.push(String(b)); return { ok: true }; },
    mandaSettimana: async (m) => { mandate.push(m); return { ok: true, esiti: [] }; },
    chiediConferma: async (per, chiave) => { richieste.push({ per, chiave }); },
    avvisa: async (cosa, u) => { avvisi.push([cosa, u.errore]); },
  };
  A.salvaImmagine(login, 'prima-2', Buffer.from('mercoledi'), { impronta: imp, rev: 7, anticipo: 120 });
  const ora = Z('2026-09-30T17:30:00Z');
  await A.giro(login, { sett: SETT, rev: 7, adesso: ora, ...fuori });
  await A.giro(login, { sett: SETT, rev: 7, adesso: ora + 60_000, ...fuori });
  assert.deepEqual(uscite, ['mercoledi'], 'esce, e una volta sola');

  A.salvaImmagine(login, 'prima-3', Buffer.from('giovedi'), { impronta: imp, rev: 6, anticipo: 120 });
  await A.giro(login, { sett: SETT, rev: 7, adesso: Z('2026-09-30T20:40:00Z'), ...fuori });
  assert.deepEqual(uscite, ['mercoledi'], 'fatta con grafiche vecchie non esce');
  assert.match(avvisi.at(-1)[1], /le grafiche sono cambiate/, 'e lo si dice');

  A.salvaImmagine(login, 'prima-2', Buffer.from('mercoledi'), { impronta: imp, rev: 7, anticipo: 120 });
  await A.giro(login, { sett: SETT, rev: 7, adesso: Z('2026-10-07T17:30:00Z'), inDiretta: true, ...fuori });
  assert.deepEqual(uscite, ['mercoledi'], 'se sei gia\' in diretta non esce');
  assert.equal(A.leggi(login).prima.ultima.saltata, true);

  // la settimana: senza conferma non esce
  A.salvaImmagine(login, 'settimana-post', Buffer.from('post'), { impronta: imp, rev: 7, testo: 'La mia settimana' });
  A.salvaImmagine(login, 'settimana-storia', Buffer.from('storia'), { impronta: imp, rev: 7 });
  const per = Z('2026-10-11T16:00:00Z');
  await A.giro(login, { sett: SETT, rev: 7, adesso: per - 20 * 3600_000, ...fuori });
  assert.equal(richieste.length, 1, 'la richiesta parte il giorno prima');
  await A.giro(login, { sett: SETT, rev: 7, adesso: per + 60_000, ...fuori });
  assert.equal(mandate.length, 0, 'non confermata, non esce');
  assert.equal(A.leggi(login).settimana.ultima.saltata, true);

  const per2 = Z('2026-10-18T16:00:00Z');
  await A.giro(login, { sett: SETT, rev: 7, adesso: per2 - 20 * 3600_000, ...fuori });
  assert.deepEqual(A.confermaConChiave(login, richieste.at(-1).chiave, per2 - 3600_000), { ok: true, per: per2 });
  await A.giro(login, { sett: SETT, rev: 7, adesso: per2 + 60_000, ...fuori });
  assert.equal(mandate.length, 1, 'confermata, esce');
  assert.deepEqual([String(mandate[0].byte), String(mandate[0].storia), mandate[0].testo], ['post', 'storia', 'La mia settimana']);
});

test('le scelte arrivano pulite', () => {
  assert.deepEqual(A.confDi({ prima: { attiva: 'si', anticipo: 7 }, settimana: { giorno: 9, ora: '25:00' } }), {
    prima: { attiva: false, anticipo: 120 },
    settimana: { attiva: false, giorno: 6, ora: '18:00', chiedi: true },
  });
  assert.equal(A.confDi({ prima: { anticipo: 30 } }).prima.anticipo, 30);
});

test('il pannello riceve i giorni in onda, ognuno col suo momento d\'uscita e la sua categoria', () => {
  A.salvaConf('vista', { prima: { attiva: true, anticipo: 60 } });
  const sett = { ...SETT, twitch: { categorie: { hades: { id: '1234', name: 'Hades II' } } } };
  const v = A.vista('vista', { sett, rev: 3, adesso: Z('2026-09-28T10:00:00Z') });
  assert.deepEqual(v.prima.slot.map((x) => [x.giorno, x.quando, x.esce, x.categoria, x.categoriaId]), [
    [2, Z('2026-09-30T19:00:00Z'), Z('2026-09-30T18:00:00Z'), 'Hades II', '1234'],
    [3, Z('2026-09-30T22:30:00Z'), Z('2026-09-30T21:30:00Z'), '', ''],
  ]);
  assert.equal(v.pronte['prima-2'], false, 'senza immagine non e\' pronta');
});
