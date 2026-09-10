// LO SFONDO DEL SUO SCHERMO, E LE CORREZIONI CHE VALGONO SOLO SU UNA CASA NUOVA.
//
// Sul suo schermo restava piantata una finestra modale: «fbsetbg: I can't find an
// app to set the wallpaper with». Era gia' stata corretta una volta — lo script
// scriveva la configurazione dello sfondo — e la finestra c'era lo stesso.
//
// Il motivo non e' lo sfondo: e' la forma della correzione. Diceva «scrivilo solo
// se non c'e' gia'», e la casa di Lia e' un volume che non nasce mai due volte:
// dentro c'era l'init che fluxbox si era scritto al PRIMO avvio, prima della
// correzione. Il controllo trovava una riga e saltava. Per sempre. Funzionava solo
// su una casa nuova, cioe' mai.
//
// La prova gira il BLOCCO VERO ritagliato dallo script vero, su una casa finta che
// ha gia' dentro la riga sbagliata. Uno stato desiderato si DICHIARA, non si chiede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');

function giraIlBlocco(initDiPartenza) {
  const casa = mkdtempSync(join(tmpdir(), 'casa-'));
  mkdirSync(join(casa, '.fluxbox'));
  mkdirSync(join(casa, 'bin'));
  if (initDiPartenza !== null) writeFileSync(join(casa, '.fluxbox/init'), initDiPartenza);
  writeFileSync(join(casa, 'bin/xsetroot'), '#!/bin/sh\nexit 0\n');
  chmodSync(join(casa, 'bin/xsetroot'), 0o755);

  const script = readFileSync(join(RAD, 'ambiente/avvio.sh'), 'utf8');
  const i = script.indexOf('  if command -v xsetroot');
  const j = script.indexOf('\n  fi\n', i) + 6;
  assert.ok(i > 0 && j > i, 'il blocco dello sfondo si trova ancora nello script');
  writeFileSync(join(casa, 'blocco.sh'), script.slice(i, j));

  execFileSync('sh', [join(casa, 'blocco.sh')], {
    env: { ...process.env, HOME: casa, PATH: join(casa, 'bin') + ':' + process.env.PATH, SFONDO: '#101418' },
  });
  return readFileSync(join(casa, '.fluxbox/init'), 'utf8');
}

test('una casa che ha gia\' la riga sbagliata viene corretta lo stesso', () => {
  const init = giraIlBlocco([
    'session.screen0.workspaces: 1',
    'session.screen0.rootCommand: fbsetbg -l',
    'session.screen0.toolbar.visible: true',
    '',
  ].join('\n'));
  const righe = init.split('\n').filter((r) => r.startsWith('session.screen0.rootCommand:'));
  assert.equal(righe.length, 1, 'una sola riga: non si accumulano a ogni avvio');
  assert.match(righe[0], /xsetroot -solid/, 'e dice cosa vogliamo noi');
  assert.ok(!/fbsetbg/.test(init), 'della vecchia non resta niente');
  assert.match(init, /session\.screen0\.workspaces: 1/, 'il resto delle sue impostazioni non si tocca');
  assert.match(init, /session\.screen0\.toolbar\.visible: true/);
});

test('e riavviare cento volte non moltiplica la riga', () => {
  let init = giraIlBlocco('session.screen0.workspaces: 1\n');
  for (let n = 0; n < 3; n++) init = giraIlBlocco(init);
  const righe = init.split('\n').filter((r) => r.startsWith('session.screen0.rootCommand:'));
  assert.equal(righe.length, 1);
});

test('e una casa senza init parte gia\' giusta', () => {
  const init = giraIlBlocco(null);
  assert.match(init, /session\.screen0\.rootCommand: xsetroot -solid/);
});
