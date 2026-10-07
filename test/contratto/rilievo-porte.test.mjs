// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE PORTE DELLE LEVETTE DEGLI AVVISI: «la tua diretta in primo piano» e
// «annuncia anche la community», da Telegram e da Discord.
//
// Il difetto che qui non deve tornare: la levetta della community di Telegram
// si scriveva solo nella colonna vecchia, mentre il bot leggeva le levette
// nuove. Chi aveva gia' toccato quella di Discord spegneva Telegram, vedeva la
// levetta spenta, e il bot continuava ad annunciare. Ogni porta scrive dove il
// bot legge, e il pannello mostra quello che il bot legge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const rotta = (inizio, n = 1500) => { const i = SRV.indexOf(inizio); assert.ok(i > 0, `c'e': ${inizio}`); return SRV.slice(i, i + n); };

test('la community di Telegram si scrive dove il bot la legge, e la lista si svuota solo se non la vuole nessuno', () => {
  const r = rotta("app.post('/api/streamer/telegram/community'", 1600);
  assert.match(r, /avvisiConf\.set\(login, \{ community: \{ telegram: attivo \} \}\);/);
  assert.match(r, /amici\.sincronizzaCommunity\(login, avvisiConf\.vuoleCommunity\(login\)/);
  const g = rotta("app.get('/api/streamer/telegram/destinazioni'", 3000);
  assert.match(g, /communityLive: avvisiConf\.get\(login\)\.community\.telegram,/, 'il pannello mostra quello che il bot legge');
  assert.doesNotMatch(g, /community_live/);
});

test('il primo piano ha una porta per sezione, e ognuna tocca solo la sua', () => {
  const tg = rotta("app.post('/api/streamer/telegram/risalto'", 400);
  assert.match(tg, /^app\.post\('\/api\/streamer\/telegram\/risalto', requireLogin, /, 'come le altre porte di Telegram');
  assert.match(tg, /avvisiConf\.set\(login, \{ risalto: \{ telegram: attivo \} \}\)/);
  const dc = rotta("app.post('/api/streamer/discord/avvisi/risalto'", 400);
  assert.match(dc, /^app\.post\('\/api\/streamer\/discord\/avvisi\/risalto', requireOwner, /, 'come le altre porte degli avvisi di Discord');
  assert.match(dc, /avvisiConf\.set\(login, \{ risalto: \{ discord: attivo \} \}\)/);
  assert.match(rotta("app.get('/api/streamer/telegram/destinazioni'", 3000), /risalto: avvisiConf\.get\(login\)\.risalto\.telegram,/);
  assert.match(rotta("app.get('/api/streamer/discord/avvisi'", 6000), /risalto: avvisiConf\.get\(login\)\.risalto\.discord,/);
});

test('il pannello ha le due levette, collegate alle loro porte, e la riga che dice cosa succede in ogni posto', () => {
  assert.match(APP, /id="tg-risalto"\$\{d\.risalto !== false \? ' checked' : ''\}/);
  assert.match(APP, /id="dca-risalto"\$\{d\.risalto !== false \? ' checked' : ''\}/);
  assert.match(APP, /api\('\/api\/streamer\/telegram\/risalto', \{ method: 'POST', body: \{ attivo \} \}\)/);
  assert.match(APP, /api\('\/api\/streamer\/discord\/avvisi\/risalto', \{ method: 'POST', body: \{ attivo: ris\.checked \} \}\)/);
  assert.equal((APP.match(/<div data-rilievo>\$\{_rilievoRiga\(t, d, '(telegram|discord)'\)\}<\/div>/g) || []).length, 2, 'la riga in ogni posto, di Telegram e di Discord');
  assert.match(APP, /if \(d\) \{ salva\(d\); _dcaRilievo\(d\); \}/, 'su Discord la riga segue le spunte senza ricaricare');
  for (const via of ["app.get('/api/streamer/telegram/destinazioni'", "app.get('/api/streamer/discord/avvisi'"]) {
    assert.match(rotta(via, 6000), /ospitiSu: avvisi\.eventoDi\('twitch'\),/, `il server dice con quale avviso arrivano gli altri (${via})`);
  }
  for (const via of ["'/api/streamer/telegram/destinazioni': {", "'/api/streamer/discord/avvisi': {"]) {
    const i = APP.indexOf(via);
    assert.ok(i > 0 && /risalto: true/.test(APP.slice(i, i + 4000)), `la prova del pannello mostra la levetta (${via})`);
  }
});

test('la prova dal pannello arriva col rilievo della casa, come l\'avviso vero', () => {
  const prove = [...SRV.matchAll(/const esiti = await telegram\.diffondi\(c\.token, [^\n]+\n\s+'🧪 <i>Anteprima notifica<\/i>\\n\\n' \+ testo, \{ anteprima: true, foto(, media)? \}\);/g)];
  assert.equal(prove.length, 2, 'le due prove di Telegram');
  for (const p of prove) assert.equal(p[1], ', media', 'con la misura dell\'anteprima della casa');
  assert.equal((SRV.match(/const media = rilievo\(\{ casa: login, chi: login, (posto: d, )?risalto: avvisiConf\.get\(login\)\.risalto\.telegram \}\)\.anteprima;/g) || []).length, 2);
});
