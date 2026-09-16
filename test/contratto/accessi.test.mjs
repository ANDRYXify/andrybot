// GLI ACCESSI DECISI A MANO, DA FUORI: il server risponde con il calcolo unico,
// le porte sono dell'amministratore, lo streamer legge cosa gli e' stato
// aperto o chiuso, e i muri di una funzione chiusa non vendono niente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const BOT = leggi('src/bot.js');

test('una risposta sola: il server delega ad accesso.js, il bot legge lo stesso modulo', () => {
  assert.ok(SRV.includes("function funzioniDi(login) { return funzioniCanale(login); }"), 'il server non calcola piu\' per conto suo');
  assert.ok(SRV.includes("import { funzioniCanale, concessioneDi } from '../features/accesso.js';"));
  assert.ok(BOT.includes("import { canaleHa } from './features/accesso.js';"));
  assert.ok(!/if \(st && st\.status === 'approved' && st\.community\) return abbonamenti\.funzioniDi\(\{ tier: 'community' \}\);/.test(SRV), 'la copia vecchia nel server non c\'e\' piu\'');
  assert.ok(SRV.includes("|| concessioneDi(l)?.modo === 'tutto');"), 'chi ha tutto e\' uno streamer vero');
});

test('le porte sono dell\'amministratore e ogni cambio ha un nome sopra', () => {
  assert.ok(SRV.includes("app.get('/api/admin/accessi', requireAdmin,"));
  for (const v of ['get', 'put', 'delete']) assert.ok(SRV.includes(`app.${v}('/api/admin/accessi/:login', requireAdmin,`), v);
  assert.ok(SRV.includes("accessi.set(login, { modo: b.modo, funzioni: b.funzioni, scade: b.scade, nota: b.nota, motivo: 'manuale' }, currentUser(req).login);"), 'chi salva resta scritto, e da qui il motivo e\' sempre manuale');
  assert.ok(SRV.includes("accessi.togli(login, currentUser(req).login);"));
  assert.ok(SRV.includes("accesso: (() => { const a = concessioneDi(user.login); return a ?"), '/api/me lo dice allo streamer');
});

test('il pannello: l\'editor nella tabella Admin, la riga nella scheda dello streamer, i muri che non vendono', () => {
  assert.ok(APP.includes('data-azione="accessi"') && APP.includes("if (azione === 'accessi') { await apriAccessi(btn.closest('tr'), login); return; }"));
  for (const c of ['acc-editor', 'acc-modi', 'acc-funzioni', 'acc-scade', 'acc-nota', 'acc-storia', 'acc-avviso']) assert.ok(APP.includes(c) && leggi('src/web/public/style.css').includes('.' + c), c);
  assert.ok(APP.includes("const accRiga = _rigaAccessoHtml();") && APP.includes("<p>${riga}</p>${accRiga}"), 'la scheda «Il tuo bot» la mostra');
  assert.ok(APP.includes("if (_chiusoDalProprietario(funz)) return `<div class=\"muro-pacchetto\"") && APP.includes("if (_chiusoDalProprietario(SCHEDA_FUNZ[id])) {"), 'i muri sanno quando e\' il proprietario a chiudere');
  assert.ok(leggi('docs/PIANI.md').includes('## Gli accessi decisi a mano'));
  assert.match(leggi('NOVITA.md'), /Il proprietario può aprirti funzioni oltre il tuo piano/);
});
