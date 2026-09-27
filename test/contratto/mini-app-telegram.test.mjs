// LA MINI APP DI TELEGRAM DICE IL VERO COME IL PANNELLO.
//
// «in chat» guardava se il canale era fra quelli di Twitch: un canale Kick o
// YouTube leggeva «offline» anche col bot al lavoro, e uno Discord leggeva
// «offline» per una chat che non ha. La risposta giusta la da' il bot, per la
// piattaforma del canale, ed e' la stessa che usa la scheda Stato. E il rimando
// al pannello nomina la scheda e la carta come si chiamano davvero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
const TGA = readFileSync(new URL('../../src/web/public/tgapp.js', import.meta.url), 'utf8');

test('«in chat» della Mini App viene dal bot, per la piattaforma del canale', () => {
  const i = SRV.indexOf("app.get('/api/tgapp/stato'");
  assert.ok(i >= 0);
  const r = SRV.slice(i, SRV.indexOf('});', i));
  assert.match(r, /inChat: manager\.inChat \? manager\.inChat\(u\.login\) : null,/);
  assert.ok(!r.includes('channels.includes'), 'non piu\' la lista dei canali di Twitch');
});

test('dove una chat non c\'e\', la Mini App non mostra il badge', () => {
  assert.match(TGA, /\$\{typeof st\.inChat !== 'boolean' \? '' : `<span class="badge/);
  assert.ok(!TGA.includes("L('offline'"), '«offline» diceva altro: non in diretta, non «il bot non c\'e\'»');
});
