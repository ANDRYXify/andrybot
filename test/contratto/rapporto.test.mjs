// IL RAPPORTO DI FINE DIRETTA, DA FUORI: parte alla fine della diretta e solo
// verso la chat privata collegata; si spegne dal pannello; il manuale e la
// vetrina lo dicono.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MANUALI } from '../../src/web/manuali.js';
import { FUNZIONI_VETRINA } from '../../src/web/vetrina-vista.js';
const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const BOT = leggi('src/bot.js');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');

test('il bot: apre all\'online, misura a ogni giro, chiude e manda in privato all\'offline', () => {
  const live = BOT.slice(BOT.indexOf('_setLive(login, isLive, data) {'), BOT.indexOf('_reagisciAllaDiretta(login, isLive) {'));
  assert.ok(live.includes("rapporto.apri(ch, { inizio: Date.parse(data?.started_at) || 0 });"));
  assert.ok(live.includes('this._rapportoDiretta(ch);'));
  assert.ok(BOT.includes('rapporto.osservaGiro(login, { spettatori: stream.viewer_count });'), 'gli spettatori dallo stesso giro delle ore');
  const f = BOT.slice(BOT.indexOf('_rapportoDiretta(login) {'), BOT.indexOf('_reagisciAllaDiretta(login, isLive) {'));
  assert.ok(f.includes("if (!conf?.token || !conf.owner_tg_id || (conf.dm_modo || 'me') === 'off') return;"), 'solo verso la chat privata collegata e accesa');
  assert.ok(f.includes('rapporto.cfg(login).attivo'), 'si spegne dalle impostazioni');
  assert.ok(f.includes('telegram.inviaMessaggio(conf.token, conf.owner_tg_id, t, { anteprima: false })'));
});

test('il pannello e il server: l\'interruttore nella carta Telegram, salvato nelle impostazioni', () => {
  assert.ok(APP.includes('id="chk-tg-rapporto"'));
  assert.ok(APP.includes("await salvaImpostazioni({ rapporto: { attivo: ev.target.checked } }"));
  assert.ok(SRV.includes("if (b.rapporto !== undefined) out.rapporto = { attivo: (b.rapporto || {}).attivo !== false };"));
});

test('il manuale, la vetrina e le novita\' lo raccontano', () => {
  const testo = JSON.stringify(MANUALI);
  assert.ok(testo.includes('rapporto') && testo.includes('picco di spettatori'), 'il manuale spiega il rapporto');
  const voci = FUNZIONI_VETRINA.flatMap((g) => g.voci);
  assert.ok(voci.some((v) => v.t[0] === 'Bot su Telegram' && /rapporto/.test(v.d[0])));
  assert.ok(leggi('NOVITA.md').includes('A fine diretta il bot ti scrive in privato'));
});
