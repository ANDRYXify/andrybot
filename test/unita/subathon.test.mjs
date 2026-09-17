// IL SUBATHON: la diretta dura quanto dice l'orologio.
//
// Non e' un orologio nuovo: e' il conto alla rovescia che c'e' gia'. Da questo
// discendono le prove che contano, e sono tutte cose che da fuori non si
// vedrebbero finche' non fanno danno in diretta:
//
//  · un conto FINITO non riparte da solo. Un sub arrivato a diretta chiusa non
//    la resuscita di soppiatto, mezz'ora dopo che si e' spenta la telecamera;
//  · il tetto e' su QUANTO MANCA, se no una serata fortunata trasforma la
//    diretta in tre giorni, e nessuno se ne accorge finche' non e' tardi;
//  · i sub regalati arrivano due volte da Twitch, e contarli due volte vuol dire
//    regalare il doppio del tempo davanti a tutti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-subathon-');
const { streamers } = await import('../../src/db.js');
const sub = await import('../../src/features/subathon.js');
const { normTimer } = await import('../../src/web/stile.js');

const CH = 'canale';
streamers.request(CH, 'Canale', '1');

const REGOLE = { attivo: true, perSub: 5, perBit100: 1, perEuro: 2, tettoOre: 12, annuncia: true, testoChat: '{chi} +{quanto}' };
const prepara = (regole = REGOLE, fine = Date.now() + 60 * 60 * 1000) => {
  const s = streamers.get(CH)?.settings || {};
  streamers.setSettings(CH, { ...s, overlayTimer: { attivo: true, subathon: regole }, overlayStato: { ...(s.overlayStato || {}), timer: { fine } } });
};
const fineOra = () => Number(streamers.get(CH)?.settings?.overlayStato?.timer?.fine) || 0;

test('i minuti diventano secondi, e le frazioni le fa il conto', () => {
  assert.equal(sub.secondiPer(REGOLE, { tipo: 'sub', quanti: 1 }), 300);
  assert.equal(sub.secondiPer(REGOLE, { tipo: 'bit', quanti: 100 }), 60);
  assert.equal(sub.secondiPer(REGOLE, { tipo: 'bit', quanti: 50 }), 30, 'cinquanta bit valgono mezza unita\'');
  assert.equal(sub.secondiPer(REGOLE, { tipo: 'euro', quanti: 2.5 }), 300);
  assert.equal(sub.secondiPer(REGOLE, { tipo: 'follow', quanti: 1 }), 0, 'un follow non allunga niente');
});

test('un sub allunga il conto che si vede, non un altro', () => {
  prepara();
  const prima = fineOra();
  const dato = sub.suEvento(CH, { tipo: 'sub', quanti: 1, chi: 'luca' });
  assert.equal(dato, 300_000);
  assert.equal(fineOra(), prima + 300_000, 'e' + ' l\'istante di fine del timer, quello del canale');
});

test('un conto finito non riparte', () => {
  prepara(REGOLE, Date.now() - 1000);
  const prima = fineOra();
  assert.equal(sub.suEvento(CH, { tipo: 'sub', quanti: 1 }), 0);
  assert.equal(fineOra(), prima, 'la diretta e\' finita: un sub non la resuscita');
});

test('col subathon spento non si tocca niente', () => {
  prepara({ ...REGOLE, attivo: false });
  const prima = fineOra();
  assert.equal(sub.suEvento(CH, { tipo: 'sub', quanti: 1 }), 0);
  assert.equal(fineOra(), prima);
});

test('senza conto alla rovescia acceso il subathon non esiste', () => {
  const s = streamers.get(CH)?.settings || {};
  streamers.setSettings(CH, { ...s, overlayTimer: { attivo: false, subathon: REGOLE } });
  assert.equal(sub.accesa(streamers.get(CH).settings), false);
  assert.equal(sub.suEvento(CH, { tipo: 'sub', quanti: 1 }), 0);
});

test('il tetto e\' su quanto manca, e taglia il resto', () => {
  const ora = Date.now();
  prepara({ ...REGOLE, perSub: 120, tettoOre: 2 }, ora + 90 * 60 * 1000);
  const dato = sub.suEvento(CH, { tipo: 'sub', quanti: 1 });
  assert.ok(dato > 0 && dato <= 30 * 60 * 1000 + 1000, 'arriva al tetto e si ferma li\'');
  const manca = fineOra() - Date.now();
  assert.ok(manca <= 2 * 60 * 60 * 1000 + 1000, 'non manca mai piu\' del tetto');
  assert.equal(sub.suEvento(CH, { tipo: 'sub', quanti: 1 }), 0, 'al tetto, un altro sub non aggiunge niente');
});

test('a tetto zero non c\'e\' tetto', () => {
  prepara({ ...REGOLE, perSub: 600, tettoOre: 0 }, Date.now() + 60 * 60 * 1000);
  assert.equal(sub.suEvento(CH, { tipo: 'sub', quanti: 1 }), 600 * 60 * 1000);
});

test('l\'avviso in chat dice chi e quanto, e si puo\' spegnere', () => {
  prepara();
  const detti = [];
  sub.suEvento(CH, { tipo: 'sub', quanti: 1, chi: 'giada' }, { say: (ch, t) => detti.push(t) });
  assert.deepEqual(detti, ['giada +5 minuti']);

  prepara({ ...REGOLE, annuncia: false });
  const zitti = [];
  sub.suEvento(CH, { tipo: 'sub', quanti: 1, chi: 'giada' }, { say: (ch, t) => zitti.push(t) });
  assert.deepEqual(zitti, []);
});

test('l\'overlay viene avvisato del nuovo istante di fine', () => {
  prepara();
  const spinte = [];
  sub.suEvento(CH, { tipo: 'sub', quanti: 1 }, { spingi: (ch, fine) => spinte.push([ch, fine]) });
  assert.equal(spinte.length, 1);
  assert.equal(spinte[0][1], fineOra(), 'e gli arriva l\'istante vero, non un\'aggiunta da sommare');
});

test('!subathon risponde solo quando c\'e\' un subathon', () => {
  prepara();
  const d = [];
  assert.equal(sub.tryComando({ channel: CH, text: '!subathon' }, (t) => d.push(t)), true);
  assert.match(d[0], /Mancano/);

  prepara({ ...REGOLE, attivo: false });
  const z = [];
  assert.equal(sub.tryComando({ channel: CH, text: '!subathon' }, (t) => z.push(t)), false);
  assert.deepEqual(z, [], 'spento, il bot non dice nemmeno che e\' spento');
});

test('le regole hanno valori di fabbrica sensati, e il subathon nasce spento', () => {
  const t = normTimer({});
  assert.equal(t.subathon.attivo, false);
  assert.equal(t.subathon.perSub, 5);
  assert.equal(t.subathon.tettoOre, 12);
  assert.equal(normTimer({ subathon: { tettoOre: 500 } }).subathon.tettoOre, 72, 'il tetto ha un tetto');
});
