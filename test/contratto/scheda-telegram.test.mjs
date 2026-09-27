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

// I COMPLEANNI SI VEDONO ANCHE SENZA TELEGRAM, E PARLANO LA LINGUA DI CHI GUARDA.
//
// Gli auguri in chat non hanno bisogno di Telegram, ma la carta stava dentro la
// parte che compare solo col bot collegato: chi non l'aveva non poteva
// accenderli. E la carta, come il riquadro del codice della chat privata, era
// scritta solo in italiano.
const senzaL = (s) => s.replace(/L\((?:'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*,\s*(?:'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*,\s*(?:'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\)/g, 'L()');

test('la carta dei compleanni c\'e\' anche senza il bot Telegram, e la parte del gruppo dice di collegarlo', () => {
  const tg = corpoDi('pannelloTelegram');
  const carta = tg.indexOf('id="box-compleanni"');
  assert.ok(carta > 0);
  // l'ultima parte condizionata al bot collegato si chiude prima della carta
  const prima = tg.slice(0, carta);
  const aperte = (prima.match(/\$\{tg\.configurato \? `/g) || []).length;
  const chiuse = (prima.match(/` : ''\}/g) || []).length;
  assert.ok(chiuse >= aperte, 'la carta non sta dentro «tg.configurato»');
  const c = corpoDi('caricaCompleanni');
  assert.match(c, /const gruppo = !tg\.configurato\n\s*\? `<p class="suggerimento">\$\{L\('Gli auguri nel gruppo Telegram partono quando colleghi il tuo bot/);
  assert.match(c, /const soloTelegram = !tg\.configurato \? '' :/, 'membri e compleanni a mano sono del gruppo');
});

test('i compleanni e il codice della chat privata sono scritti in tre lingue', () => {
  const c = senzaL(corpoDi('caricaCompleanni'));
  for (const it of ['Impossibile caricare', 'Auguri in chat', 'Auguri nel gruppo', 'Messaggio', 'Segnaposto', 'Effetto', 'Salva', 'Rimuovi', 'Compleanni registrati', 'Nessuno ancora', 'Membri del gruppo', 'Carica amministratori', 'Aggiungi', 'Giorno di nascita', 'dalla chat', 'aggiunto a mano', 'nessun effetto', '—']) {
    assert.ok(!c.includes(it), `«${it}» fuori da L()`);
  }
  const i = APP.indexOf("const r = await api('/api/streamer/telegram/collega'");
  const codice = senzaL(APP.slice(i, APP.indexOf('});', i)));
  for (const it of ['Scrivi al tuo bot', 'in privato', 'Scade tra']) assert.ok(!codice.includes(it), `«${it}» fuori da L()`);
});
