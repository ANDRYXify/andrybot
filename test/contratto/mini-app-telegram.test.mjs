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

test('il rimando al pannello nomina scheda e carta coi nomi veri, nelle tre lingue', () => {
  const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
  const tre = (re, testo) => { const m = re.exec(testo); assert.ok(m, `trovo ${re}`); return [m[1], m[2], m[3]]; };
  const gruppo = tre(/community: \['([^']+)', '([^']+)', '([^']+)'\]/, APP.slice(APP.indexOf('const T_GRUPPO')));
  const carta = tre(/L\('(Accedi e gestisci da Telegram)', '([^']+)', '([^']+)'\)/, APP);
  const riga = TGA.slice(TGA.indexOf('<li>', TGA.indexOf('<div class="codice">') + 1));
  const passo = tre(/L\('Vai su ([^']+)', 'Go to ([^']+)', 'Ve a ([^']+)'\)/, riga);
  for (let i = 0; i < 3; i++) {
    assert.ok(passo[i].includes(`<b>${gruppo[i]} → Telegram</b>`), `il gruppo del menù: ${gruppo[i]}`);
    assert.ok(passo[i].includes(`«${carta[i]}»`), `la carta: ${carta[i]}`);
  }
});
