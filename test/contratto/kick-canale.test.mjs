// Un canale su Kick: la forma del nome, e cosa il pannello dichiara di non avere.
//
// La forma non è una convenzione: è quello che impedisce al canale Kick di
// «pippo» e a quello Twitch di «pippo» di essere la stessa riga — comandi,
// monete, memoria e tutto il resto. Un login Twitch non può contenere un punto,
// quindi `kick.pippo` non può collidere. Per costruzione, non per fortuna.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { eLoginNostro, loginKick, nomeKick, eKick, piattaformaDi } from '../../src/identita.js';

test('un canale Kick non può avere il nome di un canale Twitch', () => {
  assert.equal(loginKick('pippo'), 'kick.pippo');
  assert.notEqual(loginKick('pippo'), 'pippo');
  // il punto è esattamente ciò che Twitch non ammette nei login
  assert.match(loginKick('pippo'), /\./);
});

test('il nome torna indietro intero', () => {
  for (const n of ['pippo', 'Gio_99', 'ABC']) {
    assert.equal(nomeKick(loginKick(n)), n.toLowerCase());
  }
  assert.equal(nomeKick('pippo'), '', 'un canale Twitch non ha un nome Kick');
});

test('la piattaforma si legge dal nome, non da una colonna', () => {
  assert.equal(piattaformaDi('kick.pippo'), 'kick');
  assert.equal(piattaformaDi('pippo'), 'twitch');
  assert.equal(eKick('kick.pippo'), true);
  assert.equal(eKick('kickpippo'), false, 'senza punto è un normalissimo login Twitch');
});

test('la forma difende anche i percorsi su disco', () => {
  for (const cattivo of ['..', '.', 'kick..', 'kick./x', '../etc', 'a/b', 'kick.pippo/../x', 'a.b.c', '']) {
    assert.equal(eLoginNostro(cattivo), false, `${JSON.stringify(cattivo)} non è un canale`);
  }
  for (const buono of ['pippo', 'kick.pippo', 'Gio_99', 'KICK.Pippo']) {
    assert.equal(eLoginNostro(buono), true, `${buono} è un canale`);
  }
});

// Le schede che il pannello spegne su Kick devono esistere davvero: una scritta
// male non spegnerebbe niente, e nessuno se ne accorgerebbe.
const APP = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/web/public/app.js'), 'utf8');

test('le schede dichiarate «solo Twitch» esistono', () => {
  const dentro = APP.match(/const SOLO_TWITCH = \[([^\]]*)\]/);
  assert.ok(dentro, 'SOLO_TWITCH c’è');
  const solo = [...dentro[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
  assert.ok(solo.length >= 2, `schede solo Twitch: ${solo.length}`);
  const gruppi = APP.slice(APP.indexOf('const GRUPPI = ['), APP.indexOf('function schedaValida'));
  const schede = [...gruppi.matchAll(/\[\s*'([a-z-]+)',\s*'[^']*'\s*\]/g)].map((m) => m[1]);
  assert.ok(schede.length >= 10, `schede totali: ${schede.length}`);
  for (const id of solo) assert.ok(schede.includes(id), `la scheda «${id}» esiste`);
});
