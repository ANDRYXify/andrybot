// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// TITOLO E CATEGORIA SU KICK, I FILI. Chi cambia il canale lo decide il motore
// dei moduli (test/unita/kick-titolo-categoria.test.mjs); qui si prova che la
// voce e il privato Telegram passano di li', che l'avvio da' al motore
// l'adattatore di Kick, e che pannello e pagina della voce dicono il rimedio di
// Kick a chi e' su Kick. Una strada che chiamasse helix a mano su un canale
// nato su Kick chiederebbe a Twitch un canale che Twitch non conosce.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (via) => readFileSync(new URL(`../../${via}`, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const VOCE = leggi('src/web/public/voce.js');
const AVVIO = leggi('src/index.js');
const tra = (testo, da, a) => {
  const i = testo.indexOf(da);
  assert.ok(i >= 0, `manca: ${da}`);
  const j = testo.indexOf(a, i + da.length);
  assert.ok(j > i, `manca la fine: ${a}`);
  return testo.slice(i, j);
};

test('l\'avvio da\' al motore dei moduli chi cambia il canale su Kick', () => {
  assert.match(AVVIO, /import \{[^}]*\bcanaleKick\b[^}]*\} from '\.\/kick\/api\.js'/);
  assert.match(AVVIO, /new ModulesEngine\(\{[^)]*canali: \{ kick: canaleKick \}/);
});

test('il server chiede al motore, con una regola sola, e il permesso e\' quello della piattaforma del canale', () => {
  assert.match(SRV, /const canaleDa = \(login\) => modules\.canalePer\(login\);/);
  const permesso = tra(SRV, 'const puoCambiareCanale = (login) => {', '};');
  assert.match(permesso, /p === 'twitch' \? canaleOk\(login\)/);
  assert.match(permesso, /p === 'kick' && kickApi\.puoCambiareCanale\(login\)/);
});

test('la voce cambia titolo e categoria sulla piattaforma del canale e lo annuncia li\'', () => {
  const voce = tra(SRV, "app.post('/api/streamer/voce', requireLogin,", '// la stessa risposta va anche nel gruppo Telegram');
  assert.equal((voce.match(/const canale = canaleDa\(login\);/g) || []).length, 2, 'categoria e titolo');
  assert.equal((voce.match(/if \(!puoCambiareCanale\(login\)\)/g) || []).length, 2);
  assert.match(voce, /categoria\.risolviCategoria\(canale, q\)/);
  assert.doesNotMatch(voce, /helix\.setChannelInfo|risolviCategoria\(helix|canaleOk\(/, 'niente Twitch a mano');
  assert.equal((voce.match(/manager\.vocePer\(\{ channel: login, piattaforma: piattaformaDi\(login\) \}\)/g) || []).length, 2, 'l\'annuncio con la voce della piattaforma');
  assert.doesNotMatch(voce, /manager\.say\(login, `(🎮|📝)/);
});

test('il privato Telegram passa dalla stessa strada', () => {
  const tg = tra(SRV, "if (cmd === 'categoria' || cmd === 'gioco' || cmd === 'titolo') {", "if (cmd === 'autoautorialita'");
  assert.match(tg, /const canale = canaleDa\(login\);/);
  assert.match(tg, /if \(!puoCambiareCanale\(login\)\)/);
  assert.match(tg, /categoria\.risolviCategoria\(canale, valore\)/);
  assert.doesNotMatch(tg, /helix\.|canaleOk\(/, 'niente Twitch a mano');
  assert.match(tg, /permesso di Kick/);
});

test('il pannello sa se Kick puo\' cambiare il canale e offre il tasto; la voce dice il rimedio di Kick', () => {
  assert.match(SRV, /canale: kickApi\.puoCambiareCanale\(user\.login\)/, '/api/me');
  assert.match(SRV, /mancano: kickApi\.permessiMancanti\(login\),/, 'la riga di Kick dice quali permessi mancano');
  assert.match(APP, /p\.id === 'kick' && \(p\.mancano \|\| \[\]\)\.length && !\(p\.daRifare && !p\.rifaiEventi\) \? `<a class="btn secondario mini" href="\$\{esc\(p\.azione\)\}">/);
  assert.match(APP, /const mancaPermesso = !DEMO && \(suKick \? stato\.kick\?\.canale === false :/);
  assert.match(VOCE, /if \(esito\.piattaforma === 'kick'\) return L\('manca il permesso di Kick/);
  assert.match(SRV, /errore: 'permesso', riautorizza: true, piattaforma: piattaformaDi\(login\)/);
});
