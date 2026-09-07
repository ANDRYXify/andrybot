// LA BORSA DELLA QUOTA YOUTUBE.
//
// Non e' un contatore qualunque: e' l'unica cosa che impedisce alla chat di
// YouTube di far fuori, per tutti, la quota che serve anche all'avviso del
// video nuovo. Il conto deve sopravvivere ai riavvii — se no basta un deploy
// per ricominciare a spendere da zero — e deve azzerarsi quando si azzera per
// Google, cioe' a mezzanotte del Pacifico, non a mezzanotte qui.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('ytquota-');
const { statoVivo } = await import('../../src/db.js');
const q = await import('../../src/youtube/quota.js');
test.after(() => casa.pulisci());

test('il giorno e\' quello del Pacifico, non quello di casa nostra', () => {
  // 8 settembre 2026, le 02:00 in Italia = ancora il 7 in California
  const notte = Date.parse('2026-09-08T00:00:00Z');
  assert.equal(q.giornoPacifico(notte), '2026-09-07',
    'contare sul nostro fuso azzererebbe la borsa quando Google non l\'ha azzerata');
});

test('si spende finche\' c\'e\', poi si dice di no', () => {
  q._azzeraPerProva();
  statoVivo.togli('__socialbot__', 'quota-youtube');
  const quante = Math.floor(q.TETTO / q.COSTO_STIMATO);
  for (let i = 0; i < quante; i += 1) assert.equal(q.chiedi(1), true, 'chiamata ' + i);
  assert.equal(q.chiedi(1), false, 'oltre il tetto non si passa');
  assert.equal(q.stato().finita, true);
});

test('il conto sopravvive a un riavvio: un deploy non regala quota', async () => {
  q._azzeraPerProva();
  statoVivo.togli('__socialbot__', 'quota-youtube');
  q.chiedi(10);
  const spese = q.stato().spese;
  assert.ok(spese > 0);

  const dopo = await import('../../src/youtube/quota.js?riavvio=1');
  assert.equal(dopo.stato().spese, spese, 'se no bastava pubblicare per ricominciare da zero');
});

test('il rinnovo si aspetta, non si ribussa ogni minuto', () => {
  const ms = q.fraQuantoRinnova(Date.parse('2026-09-07T12:00:00Z'));
  assert.ok(ms > 0 && ms <= 26 * 60 * 60 * 1000);
});

test('la stima del costo e\' quella alta, ed e\' scritta', () => {
  assert.equal(q.COSTO_STIMATO, 5,
    'Google non pubblica il costo delle chiamate di chat: sbagliare in eccesso spreca margine, sbagliare in difetto spegne la chat a tutti');
  assert.ok(q.TETTO < 10000, 'il resto della quota serve al resto del bot');
});
