// L'AVVISO DI TELEGRAM E I SUOI POSTI: pannello e server dicono la stessa cosa.
//
// Il server accende l'avviso se c'e' un posto dove mandarlo (il gruppo di
// «Rileva gruppo» o un posto qualsiasi dell'elenco); il pannello teneva spenta
// la spunta finche' non c'era il gruppo, e chi aveva solo un canale non la
// poteva accendere. Ora la condizione e' una, detta dal server.
//
// «Fissa l'avviso in cima…» della scheda e' il valore di base di ogni posto
// nuovo: prima valeva solo per il primo gruppo, e i posti aggiunti dopo
// nascevano sempre senza.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const rotta = (inizio) => {
  const i = SRV.indexOf(inizio);
  assert.ok(i >= 0, `c'e' ${inizio}`);
  return SRV.slice(i, SRV.indexOf('\n  }));', i));
};
const corpo = (nome) => {
  const i = APP.search(new RegExp(`(async )?function ${nome}\\(`));
  assert.ok(i >= 0, `c'e' ${nome}`);
  return APP.slice(i, APP.indexOf('\n}\n', i));
};

test('«c\'e\' un posto» e\' una condizione sola, usata da chi accende e da chi mostra', () => {
  assert.match(SRV, /const tgHaPosto = \(login, c = tgConf\.get\(login\)\) => !!\(c\?\.chat_id \|\| tgDest\.lista\(login\)\.length\);/);
  const stato = SRV.slice(SRV.indexOf('const statoTelegram = (login) => {'), SRV.indexOf('const streamerSicuro'));
  assert.match(stato, /postoOk: tgHaPosto\(login, c\),/);
  assert.match(rotta("app.get('/api/streamer/telegram/destinazioni'"), /postoOk: tgHaPosto\(login, c\),/);
  assert.match(rotta("app.post('/api/streamer/telegram/impostazioni'"), /if \(attivo && !tgHaPosto\(login, c\)\) return/);
});

test('il pannello accende la spunta dell\'avviso quando c\'e\' un posto, anche senza il gruppo', () => {
  const tg = corpo('pannelloTelegram');
  assert.match(tg, /id="chk-tg-attivo" \$\{tg\.attivo \? 'checked' : ''\} \$\{tg\.postoOk \? '' : 'disabled'\}>/);
  assert.match(corpo('caricaTgDestinazioni'), /accendi\.disabled = !d\.postoOk;/, 'e dopo un posto nuovo si accende senza ricaricare');
});

test('«Fissa l\'avviso in cima…» e\' il valore di base di ogni posto nuovo', () => {
  const tg = corpo('pannelloTelegram');
  assert.match(tg, /id="chk-tg-pin" \$\{tg\.pinLive \? 'checked' : ''\}>/, 'si sceglie anche prima di avere un posto');
  assert.ok(tg.includes('Vale per ogni posto che aggiungi da qui in poi'));
  assert.match(rotta("app.post('/api/streamer/telegram/destinazioni'"), /pin: req\.body\?\.pin !== undefined \? !!req\.body\.pin : !!c\.pin_live,/);
  assert.match(corpo('collegaTgDestinazioni'), /body: fissa \? \{ \.\.\.t, pin: fissa\.checked \} : t/, 'il pannello manda quello che si vede');
  assert.match(leggi('src/db.js'), /pin: conf\.pin_live \? 1 : 0/, 'come per il primo gruppo');
  assert.ok(!/conf\.pin_live/.test(leggi('src/bot.js')), 'e nessun avviso decide su quella spunta: decide quella del posto');
});
