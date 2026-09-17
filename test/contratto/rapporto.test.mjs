// IL RAPPORTO DI FINE DIRETTA, DA FUORI: si salva sempre e poi parte verso i
// canali scelti; la scheda Dirette lo mostra e regola i canali; l'indirizzo
// mail vale solo confermato; il manuale, la vetrina e la privacy lo dicono.
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

test('il bot: apre all\'online, misura a ogni giro, chiude, salva sempre e poi manda dove serve', () => {
  const live = BOT.slice(BOT.indexOf('_setLive(login, isLive, data) {'), BOT.indexOf('_rapportoDiretta(login) {'));
  assert.ok(live.includes("rapporto.apri(ch, { inizio: Date.parse(data?.started_at) || 0 });"));
  assert.ok(live.includes('this._rapportoDiretta(ch);'));
  assert.ok(BOT.includes('rapporto.osservaGiro(login, { spettatori: stream.viewer_count });'), 'gli spettatori dallo stesso giro delle ore');
  const f = BOT.slice(BOT.indexOf('_rapportoDiretta(login) {'), BOT.indexOf('_reagisciAllaDiretta(login, isLive) {'));
  assert.ok(f.includes('const id = rapporti.salva(login, { inizio: chiuso.inizio, fine: chiuso.fine, dati });'), 'il rapporto resta, sempre');
  assert.ok(f.includes("if (c.telegram && conf?.token && conf.owner_tg_id && (conf.dm_modo || 'me') !== 'off') {"), 'Telegram solo verso la chat privata collegata e accesa');
  assert.ok(f.includes("if (c.mail && pst?.confermata && pst.email && posta.attiva()) {"), 'la mail solo a un indirizzo confermato, con la posta attiva');
  assert.ok(f.includes(".then(() => rapporti.segnaInviato(id, 'telegram'))") && f.includes(".then(() => rapporti.segnaInviato(id, 'mail'))"));
});

test('il server: la scheda ha le sue porte, l\'indirizzo si conferma da una mail e il codice non si conserva', () => {
  for (const r of ["app.get('/api/streamer/rapporti', requireLogin,", "app.post('/api/streamer/rapporti/letti', requireLogin,", "app.post('/api/streamer/posta', requireOwner,", "app.delete('/api/streamer/posta', requireOwner,", "app.get('/posta/conferma', wrap("]) {
    assert.ok(SRV.includes(r), r);
  }
  const conf = SRV.slice(SRV.indexOf("app.post('/api/streamer/posta', requireOwner,"), SRV.indexOf("app.delete('/api/streamer/posta'"));
  assert.ok(conf.includes("const impronta = crypto.createHash('sha256').update(codice).digest('hex');"), 'si conserva il calco, non il codice');
  assert.ok(conf.includes('if (!posta.riposoConferma(login)) return res.status(429)'), 'una richiesta ogni dieci minuti');
  assert.ok(conf.includes('postaStreamer.togli(login);') && conf.includes('return res.status(502)'), 'se la mail non parte, l\'indirizzo non resta appeso');
  assert.ok(SRV.includes("if (b.rapporto !== undefined) out.rapporto = rapporto.normalizza(b.rapporto);"));
  assert.ok(SRV.includes('rapportiNuovi: rapporti.nuovi(user.login),'), 'il pannello sa quanti rapporti non ha ancora aperto');
  assert.ok(leggi('scripts/verifica-porte.mjs').includes("['GET /posta/conferma',") && leggi('src/web/vetrina.js').includes("'/posta/conferma',"));
});

test('il pannello: la scheda Dirette, il puntino, i canali; l\'interruttore non sta piu\' nella carta Telegram', () => {
  assert.ok(APP.includes("['dirette', 'Dirette'],") && APP.includes("return pannello('dirette', `"));
  for (const id of ['lista-rapporti', 'chk-rap-telegram', 'chk-rap-mail', 'inp-posta', 'btn-posta-conferma']) assert.ok(APP.includes(`id="${id}"`), `manca #${id}`);
  assert.ok(APP.includes('id="btn-posta-togli"'));
  assert.ok(APP.includes(`const nuovoDi = (id) => (id === 'dirette' && stato?.rapportiNuovi > 0 ? '<i class="voce-nuovo"></i>' : '');`));
  assert.equal((APP.match(/\$\{nuovoDi\(id\)\}/g) || []).length, 2, 'il puntino sta nel menu in alto e nel cassetto');
  assert.ok(APP.includes("if (id === 'dirette') caricaDirette();"));
  assert.ok(APP.includes("api('/api/streamer/rapporti/letti', { method: 'POST', body: {} })"), 'aprire la scheda segna letti');
  assert.ok(!APP.includes('chk-tg-rapporto'), 'un posto solo per scegliere dove ricevere il rapporto');
  assert.ok(APP.includes("'/api/streamer/rapporti': {"), 'la demo ha i suoi rapporti');
  assert.ok(leggi('src/web/public/style.css').includes('.voce-nuovo {') && leggi('src/web/public/style.css').includes('.rap-carta {'));
});

test('il manuale, la vetrina, la privacy e le novita\' lo raccontano', () => {
  const testo = JSON.stringify(MANUALI);
  assert.ok(testo.includes('Il rapporto di ogni diretta') && testo.includes('picco di spettatori') && testo.includes('via mail'), 'il manuale spiega il rapporto e i canali');
  const voci = FUNZIONI_VETRINA.flatMap((g) => g.voci);
  assert.ok(voci.some((v) => v.scheda === 'dirette' && v.t[0] === 'Il rapporto di ogni diretta'));
  const privacy = leggi('src/web/public/privacy.html');
  assert.ok(privacy.includes('Indirizzo e-mail dello streamer') && privacy.includes('rapporti delle dirette'));
  const novita = leggi('NOVITA.md');
  assert.ok(novita.includes('nella scheda «Dirette»') && novita.includes('su Telegram in privato o via mail'));
  assert.ok(leggi('.env.example').includes('MAIL_DOMINIO=') && leggi('docs/POSTA.md').includes('porta 25'));
});
