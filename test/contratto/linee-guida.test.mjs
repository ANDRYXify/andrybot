// LE REGOLE DELLA PERSONALITA' ARRIVANO TUTTE AL BOT.
//
// Prima se ne tenevano quaranta e al cervello arrivavano le prime dodici, cioe'
// le piu' vecchie: dalla tredicesima in poi una regola nuova si salvava, il
// pannello diceva «aggiunta», e il bot non la vedeva mai. Oltre la quarantesima
// la piu' vecchia spariva da sola. Adesso il tetto e' quello che arriva al
// bot, e quando lo raggiungi te lo dice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('guide-');
const { guide, GUIDE_MAX, db, streamers } = await import('../../src/db.js');
test.after(() => casa.pulisci());

const regoleDi = (ch) => guide.applicabili(ch, { piattaforma: 'twitch' }).filter((r) => /^regola /.test(r));

test('fino al tetto si salvano tutte, e tutte arrivano al bot', () => {
  const ch = 'regolina';
  streamers.upsertApproved(ch, ch, '1');
  for (let i = 1; i <= GUIDE_MAX; i++) assert.equal(guide.add(ch, `regola numero ${i}`).ok, true, `regola ${i}`);
  const r = guide.add(ch, 'regola in piu');
  assert.deepEqual(r, { ok: false, pieno: true }, 'la tredicesima non entra');
  assert.equal(guide.count(ch), GUIDE_MAX, 'e non ne sparisce nessuna');
  assert.equal(guide.add(ch, 'Regola Numero 3', { dove: 'tg' }).ok, true, 'una che c\'e\' gia\' si puo\' sempre ritoccare');
  assert.equal(regoleDi(ch).length, GUIDE_MAX - 1, 'arrivano al bot tutte quelle che valgono in chat');
});

test('chi ne aveva di piu\' da prima manda al bot le piu\' recenti', () => {
  const ch = 'vecchiotto';
  streamers.upsertApproved(ch, ch, '2');
  const ins = db.prepare('INSERT INTO linee_guida(channel, testo, dove, con_chi, ts) VALUES(?,?,?,?,?)');
  for (let i = 1; i <= GUIDE_MAX + 3; i++) ins.run(ch, `regola ${i}`, 'ovunque', 'tutti', 1000 + i);
  const arrivano = regoleDi(ch);
  assert.equal(arrivano.length, GUIDE_MAX);
  assert.equal(arrivano[0], 'regola 4', 'le tre piu\' vecchie restano fuori');
  assert.equal(arrivano.at(-1), `regola ${GUIDE_MAX + 3}`, 'l\'ultima scritta c\'e\'');
});

test('il pannello e Telegram dicono che le regole sono al tetto', () => {
  const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
  assert.ok(SRV.includes("codice: 'guide-piene', massimo: GUIDE_MAX"), 'il server lo dice col suo tetto');
  assert.ok(SRV.includes('if (guide.add(login, regola, ambito).pieno)'), 'anche a chi scrive la regola da Telegram');
  assert.ok(APP.includes("e.dati?.codice !== 'guide-piene'"), 'e il pannello lo spiega');
  assert.ok(!/ORDER BY ts DESC LIMIT 40/.test(readFileSync(new URL('../../src/db.js', import.meta.url), 'utf8')), 'niente sparisce da solo');
});
