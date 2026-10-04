// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// DAGLI ALTRI BOT (docs/PONTE.md, «Dagli altri bot»), i fili letti nel codice:
//  · la rotta legge il canale della SESSIONE e il bot dall'indirizzo (solo i
//    tre che si conoscono); passa dallo stesso cuore del testo incollato;
//    applica solo se l'impronta e' quella che si e' vista; una lettura per
//    canale e per bot alla volta;
//  · dalla richiesta arrivano solo «applica» e l'impronta (il resto lo legge
//    il cuore): nessun posto per una chiave o per un altro canale;
//  · il server parla con quei bot solo da altribot.js, e senza chiavi;
//  · nel pannello i tre tasti chiamano la rotta, e «Importa» manda l'impronta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const AB = leggi('src/features/altribot.js');

const tratto = (testo, da, fine) => {
  const i = testo.indexOf(da);
  assert.ok(i >= 0, `c'e' ${da}`);
  const j = testo.indexOf(fine, i + da.length);
  return testo.slice(i, j < 0 ? undefined : j);
};

test('la rotta: il bot dall\'indirizzo, il canale della sessione, lo stesso cuore, l\'impronta', () => {
  const r = tratto(SRV, "app.post('/api/streamer/comandi/importa/da/:bot', requireLogin,", '\n  }));');
  assert.match(r, /if \(!altribot\.QUALI_BOT\.includes\(bot\)\) return notFound\(res\);/, 'solo i bot che si conoscono');
  assert.match(r, /const login = currentUser\(req\)\.login;/);
  assert.match(r, /altribot\.leggi\(bot, \{ login, twitchId: streamers\.get\(login\)\?\.user_id \}\)/);
  assert.match(r, /String\(req\.body\?\.firma \|\| ''\) !== r\.firma/, 'si applica solo quello che si e\' visto');
  assert.match(r, /return importaTesto\(req, res, login, r\.testo, \{ da, cambiato \}, \{ applica: !!req\.body\?\.applica && !cambiato \}\);/);
  assert.match(r, /_altroInCorso\.delete\(chiave\)/, 'una lettura alla volta, e il posto si libera sempre');
  const campi = [...r.matchAll(/req\.(body|query|params|headers)\??\.(\w+)/g)].map((m) => `${m[1]}.${m[2]}`);
  assert.deepEqual([...new Set(campi)].sort(), ['body.applica', 'body.firma', 'params.bot']);
  // e la rotta di StreamElements, registrata prima, resta sua
  assert.ok(SRV.indexOf("app.post('/api/streamer/comandi/importa/streamelements'") < SRV.indexOf("app.post('/api/streamer/comandi/importa/da/:bot'"));
});

test('il server parla con quei bot solo da altribot.js, e senza chiavi', () => {
  for (const h of ['api.nightbot.tv', 'api.fossabot.com', 'api.moo.bot']) {
    assert.doesNotMatch(SRV, new RegExp(h.replace(/\./g, '\\.')), `${h} solo da altribot.js`);
    assert.match(AB, new RegExp(h.replace(/\./g, '\\.')));
  }
  assert.doesNotMatch(AB, /authorization|cookie|Bearer|token=|client_id/i);
});

test('nel pannello i tre tasti chiamano la rotta, e «Importa» manda l\'impronta', () => {
  for (const b of ['nightbot', 'fossabot', 'moobot']) assert.match(APP, new RegExp(`id="imp-da-${b}"`), b);
  assert.match(APP, /'\/api\/streamer\/comandi\/importa\/da\/' \+ /);
  const applica = tratto(APP, "document.getElementById('imp-applica')?.addEventListener('click'", '\n    }));');
  assert.match(applica, /corpo\.firma = _impDa\?\.firma \|\| ''/, 'l\'impronta di quello che si e\' visto');
  assert.doesNotMatch(tratto(APP, 'async function vediDaBot(', '\n  }\n'), /\bfetch\(/, 'il pannello non parla con quei bot: lo fa il server');
});
