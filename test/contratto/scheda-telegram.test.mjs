// LA SCHEDA TELEGRAM SI CARICA E SI RAGGIUNGE DA SE'.
//
// Quando Telegram ha avuto una scheda sua, i riquadri sono traslocati ma chi li
// riempie e chi ci rimanda no: «Auguri di compleanno», l'accesso, dove mandare
// gli avvisi e la carta live si caricavano aprendo «I tuoi social», e i link
// «la colleghi in Notifiche» portavano li'. Qui: ogni riquadro della scheda
// Telegram si carica con la scheda Telegram, e chi ci rimanda porta li'.
// Il ragionamento sta in docs/COMPLEANNI.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const APP = readFileSync(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');

const corpoDi = (nome) => {
  const i = APP.search(new RegExp(`(?:async )?function ${nome}\\(`));
  assert.ok(i >= 0, `c'e' ${nome}`);
  return APP.slice(i, APP.indexOf('\n}\n', i));
};
const rigaDi = (id) => {
  const d = corpoDi('caricaDatiScheda');
  const m = d.match(new RegExp(`if \\(id === '${id}'\\) \\{([^\\n]*)\\}`));
  assert.ok(m, `la scheda ${id} ha i suoi caricatori`);
  return m[1];
};

test('ogni riquadro che si riempie da solo nella scheda Telegram si carica con lei', () => {
  const tg = corpoDi('pannelloTelegram');
  const riquadri = [...tg.matchAll(/id="([\w-]+)"/g)].map((m) => m[1]);
  const riempiti = [...APP.matchAll(/(?:async )?function (carica\w+)\(\) \{\n\s*const box = document\.getElementById\('([\w-]+)'\)/g)].filter((m) => riquadri.includes(m[2]));
  assert.ok(riempiti.length >= 4, `trovo chi riempie i riquadri della scheda: ${riempiti.map((m) => m[1]).join(', ')}`);
  const telegram = rigaDi('telegram');
  const social = rigaDi('notifiche');
  for (const [, f, id] of riempiti) {
    assert.ok(telegram.includes(`${f}()`), `${f} riempie #${id}: parte con la scheda Telegram`);
    assert.ok(!social.includes(`${f}()`), `e non con «I tuoi social»`);
  }
});

test('chi rimanda a Telegram porta alla scheda Telegram', () => {
  assert.doesNotMatch(APP, /in Notifiche|under Notifications|en Notificaciones/, 'la scheda «Notifiche» non esiste piu\'');
  assert.match(APP, /<a href="#telegram" data-scheda="telegram">\$\{L\('la colleghi nella scheda Telegram'/);
  assert.match(corpoDi('caricaTgLogin'), /replaceState\(null, '', location\.pathname \+ '#telegram'\)/);
  assert.match(SRV, /res\.redirect\('\/\?tgapp=collegato#telegram'\)/);
});
