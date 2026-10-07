// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL MURO SALVATO DAL MODULO VUOTO (docs/MURO-EMOTE.md, «Il modulo che si
// salvava vuoto»). Il pannello non riempiva i campi del muro, e toccarne uno
// salvava gli altri vuoti. Qui:
//  · l'impronta del difetto si riconosce, e solo quella: un muro scelto
//    davvero, anche strano, non si tocca;
//  · la riparazione rimette le scelte di serie e tiene quello che il difetto
//    non toccava (acceso o spento, dove sta, i premi);
//  · gira una volta sola, all'avvio, e la seconda volta non fa niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

cartellaUsaEGetta('andrybot-muro-riparato-');
const { db, streamers, riparaMuriUnaTantum } = await import('../../src/db.js');
const { normMuro, muroRotto, riparaMuro } = await import('../../src/web/stile.js');

// La bozza che il pannello mandava toccando l'ombra di un muro mai riempito:
// misurata nel browser, campo per campo.
const BOZZA_VUOTA = {
  attivo: false, posizione: 'schermo', xy: null, animazioni: [], fonti: { twitch: false, settetv: false, emoji: false },
  perMessaggio: 0, doppioni: false, maxSchermo: 0, coda: 0, grandezza: 0, varia: 0, minPx: 0, maxPx: 0, durata: 0,
  entrata: 'zoom', ombra: true, arcobaleno: 'mai', chi: 'tutti', escludiBot: false, esclusiPersone: [], esclusiEmote: [],
  combo: { attivo: false, soglia: 0, finestra: 0, diverse: false, figura: 'fuochi' },
  esplosioni: { quante: 0, durata: 0, parola: '' }, comando: { figura: 'fuochi', attesa: 0 },
  eventi: { raid: { attivo: false, figura: 'fuochi', soglia: 0 } }, premi: [],
};
const ROTTO = normMuro(BOZZA_VUOTA);

test('l\'impronta del modulo vuoto si riconosce, e solo quella', () => {
  assert.equal(muroRotto(ROTTO), true, 'il muro salvato dal modulo vuoto');
  assert.equal(muroRotto(normMuro({ ...BOZZA_VUOTA, attivo: true, xy: { x: 0, y: 70, w: 100, h: 30, r: 0 } })), true, 'anche acceso, e in un riquadro');
  assert.equal(muroRotto(normMuro({})), false, 'il muro di serie');
  assert.equal(muroRotto(normMuro({ attivo: true, fonti: { twitch: false, settetv: false, emoji: true } })), false, 'solo emoji: una scelta vera');
  assert.equal(muroRotto(normMuro({ fonti: { twitch: false, settetv: false }, maxSchermo: 1 })), false, 'fonti spente e uno a schermo, ma il resto e\' scelto');
  // un campo solo diverso dall'impronta e' una scelta: non si ripara
  for (const [campo, valore] of [['maxPx', 140], ['minPx', 20], ['durata', 3], ['grandezza', 3], ['varia', 10], ['perMessaggio', 2], ['coda', 1], ['maxSchermo', 2]]) {
    assert.equal(muroRotto({ ...ROTTO, [campo]: valore }), false, `${campo} = ${valore}`);
  }
  assert.equal(muroRotto({ ...ROTTO, fonti: { ...ROTTO.fonti, emoji: true } }), false, 'con le emoji accese');
  assert.equal(muroRotto({ ...ROTTO, fonti: { ...ROTTO.fonti, settetv: true } }), false, 'con 7TV acceso');
  assert.equal(muroRotto(null), false);
  assert.equal(muroRotto(undefined), false);
});

test('la riparazione rimette le scelte di serie e tiene quello che il difetto non toccava', () => {
  const xy = { x: 0, y: 70, w: 100, h: 30, r: 0 };
  const premi = [{ id: 'abc-1', titolo: 'Boom', figura: 'cuore' }];
  const r = riparaMuro({ ...ROTTO, attivo: true, xy, premi });
  const serie = normMuro({});
  assert.equal(r.attivo, true);
  assert.deepEqual(r.xy, xy);
  assert.deepEqual(r.premi, premi);
  for (const k of ['fonti', 'maxSchermo', 'coda', 'perMessaggio', 'grandezza', 'varia', 'durata', 'minPx', 'maxPx', 'combo', 'esplosioni', 'eventi', 'animazioni']) {
    assert.deepEqual(r[k], serie[k], k);
  }
  const sano = normMuro({ attivo: true, grandezza: 20 });
  assert.equal(riparaMuro(sano), sano, 'un muro sano esce identico');
});

test('all\'avvio i muri rotti si riparano una volta sola, e quelli sani non si toccano', () => {
  const FLAG = 'muro_modulo_vuoto_v1';
  const flag = () => db.prepare("SELECT value FROM facts WHERE channel='__migrazioni__' AND key=?").get(FLAG);
  assert.ok(flag(), 'il giro e\' partito importando il modulo');
  streamers.request('rotto', 'Rotto', '1');
  streamers.request('sano', 'Sano', '2');
  streamers.setSettings('rotto', { overlayMuro: ROTTO, altro: 'resta' });
  const sano = normMuro({ attivo: true, grandezza: 20, fonti: { twitch: true, settetv: false } });
  streamers.setSettings('sano', { overlayMuro: sano });
  db.prepare("DELETE FROM facts WHERE channel='__migrazioni__' AND key=?").run(FLAG);

  assert.equal(riparaMuriUnaTantum(), 1, 'un muro riparato');
  const r = streamers.get('rotto').settings;
  assert.equal(r.overlayMuro.fonti.twitch, true);
  assert.equal(r.overlayMuro.maxSchermo, 50);
  assert.equal(r.altro, 'resta', 'il resto delle impostazioni non si tocca');
  assert.deepEqual(streamers.get('sano').settings.overlayMuro, sano, 'il muro sano resta com\'era');
  assert.equal(flag().value, '1');
  streamers.setSettings('rotto', { overlayMuro: ROTTO });
  assert.equal(riparaMuriUnaTantum(), 0, 'la seconda volta non fa niente');
});
