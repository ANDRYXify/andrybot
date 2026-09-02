// Gli ingressi esterni: chi bussa da fuori deve poter entrare.
//
// Kick spinge i suoi eventi sul nostro webhook, e il webhook non ha e non puo'
// avere un cookie. Il cancello del sito risponde 404 a tutto quello che non e'
// dichiarato: /kick/webhook non lo era, quindi collegare Kick riusciva e poi non
// arrivava niente — nessun messaggio, nessun follow, nessun evento.
//
// L'argine invece lo sapeva gia' («i webhook delle piattaforme non si
// limitano»). Due elenchi per lo stesso fatto, e non erano d'accordo: adesso e'
// uno solo, e questo collaudo tiene insieme le due letture.
import test from 'node:test';
import assert from 'node:assert/strict';
import { INGRESSI_ESTERNI, eIngressoEsterno, creaGuscio } from '../../src/web/vetrina.js';
import { classifica } from '../../src/web/argine.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PUB = join(dirname(fileURLToPath(import.meta.url)), '../../src/web/public');
const guscio = creaGuscio(PUB);

// Un percorso d'esempio per ogni voce: le voci che finiscono con `/` sono famiglie.
const esempi = INGRESSI_ESTERNI.map((x) => (x.endsWith('/') ? x + 'esempio' : x));

test('il webhook di Kick e uno solo di questi ingressi', () => {
  assert.ok(INGRESSI_ESTERNI.includes('/kick/webhook'), 'c’è /kick/webhook');
  assert.ok(esempi.length >= 4, `ingressi: ${esempi.length}`);
});

test('ogni ingresso esterno passa il cancello senza sessione', () => {
  for (const via of esempi) assert.equal(guscio.aperto(via), true, `${via} passa`);
});

test('e nessuno di loro viene limitato', () => {
  for (const via of esempi) {
    assert.equal(classifica('POST', via), null, `${via} non si limita`);
    assert.equal(classifica('GET', via), null, `${via} non si limita nemmeno in lettura`);
  }
});

test('le due letture dello stesso elenco concordano', () => {
  for (const via of esempi) {
    assert.equal(eIngressoEsterno(via), true);
    assert.equal(guscio.aperto(via) && classifica('POST', via) === null, true, via);
  }
});

test('quello che non e un ingresso esterno resta chiuso e limitato', () => {
  for (const via of ['/api/streamer/moduli', '/api/admin/streamers', '/kick/webhook2', '/kickwebhook']) {
    assert.equal(eIngressoEsterno(via), false, `${via} non è un ingresso esterno`);
    assert.equal(guscio.aperto(via), false, `${via} resta chiuso`);
  }
});
