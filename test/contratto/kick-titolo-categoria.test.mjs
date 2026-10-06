// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// TITOLO E CATEGORIA SU KICK, I FILI. Chi cambia il canale lo decide il motore
// dei moduli (test/unita/kick-titolo-categoria.test.mjs); qui si prova che la
// voce e il privato Telegram passano di li', su ogni piattaforma del canale,
// che l'avvio da' al motore l'adattatore di Kick, e che pannello e pagina
// della voce dicono il rimedio di Kick dove e' Kick a dire di no. Una strada che chiamasse helix a mano su un canale
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

test('il server chiede al motore, con una regola sola, e il permesso e\' quello di ciascuna piattaforma', () => {
  assert.match(SRV, /const cambiaIlCanale = \(login, cosa, valore\) => modules\.cambiaCanale\(login, cosa, valore, \{ permesso: \(dove\) => puoCambiareSu\(dove, login\) \}\);/);
  const permesso = tra(SRV, 'const puoCambiareSu = (dove, login) =>', ';\n');
  assert.match(permesso, /dove === 'twitch' \? canaleOk\(login\)/);
  assert.match(permesso, /dove === 'kick' && kickApi\.puoCambiareCanale\(login\)/);
  assert.doesNotMatch(SRV, /modules\.canalePer\(|const canaleDa = /, 'niente piu\' una piattaforma sola');
  const annuncio = tra(SRV, 'const annunciaCambio = (login, esiti, testo) => {', '};');
  assert.match(annuncio, /e\.ok && manager\.inChat\?\.\(login, e\.dove\)/, 'solo dove e\' riuscito e dove il bot e\' al lavoro');
  assert.match(annuncio, /manager\.vocePer\(\{ channel: login, piattaforma: e\.dove \}\)/, 'con la voce di quella piattaforma');
});

test('la voce cambia titolo e categoria su ogni piattaforma del canale e lo annuncia in ciascuna', () => {
  const voce = tra(SRV, "app.post('/api/streamer/voce', requireLogin,", '// la stessa risposta va anche nel gruppo Telegram');
  assert.match(voce, /const esiti = await cambiaIlCanale\(login, 'categoria', q\);/);
  assert.match(voce, /const esiti = await cambiaIlCanale\(login, 'titolo', testo\);/);
  assert.equal((voce.match(/if \(!esiti\.length\) return res\.json/g) || []).length, 2, 'dove non c\'e\' chi cambia, si dice');
  assert.equal((voce.match(/annunciaCambio\(login, esiti,/g) || []).length, 2);
  assert.equal((voce.match(/esiti: esitiVoce\(esiti\)/g) || []).length, 2, 'alla pagina, un esito per piattaforma');
  assert.doesNotMatch(voce, /helix\.setChannelInfo|risolviCategoria\(|canaleOk\(|setChannelInfo\(/, 'niente piattaforma a mano');
  assert.doesNotMatch(voce, /manager\.say\(login, `(🎮|📝)/);
});

test('il privato Telegram passa dalla stessa strada, con una riga per piattaforma', () => {
  const tg = tra(SRV, "if (cmd === 'categoria' || cmd === 'gioco' || cmd === 'titolo') {", "if (cmd === 'autoautorialita'");
  assert.match(tg, /const esiti = await cambiaIlCanale\(login, eTitolo \? 'titolo' : 'categoria', t\);/);
  assert.match(tg, /if \(!esiti\.length\)/);
  assert.doesNotMatch(tg, /helix\.|canaleOk\(|setChannelInfo\(|risolviCategoria\(/, 'niente piattaforma a mano');
  assert.match(tg, /permessoMancante\[e\.dove\]/, 'il rimedio della piattaforma che ha detto di no');
  assert.match(tg, /kick: '🔒 Mi manca il permesso di Kick/);
});

test('il pannello sa se Kick puo\' cambiare il canale e offre il tasto; la voce dice il rimedio di Kick', () => {
  assert.match(SRV, /canale: kickApi\.puoCambiareCanale\(user\.login\)/, '/api/me');
  assert.match(SRV, /mancano: kickApi\.permessiMancanti\(login\),/, 'la riga di Kick dice quali permessi mancano');
  assert.match(APP, /p\.id === 'kick' && \(p\.mancano \|\| \[\]\)\.length && !\(p\.daRifare && !p\.rifaiEventi\) \? `<a class="btn secondario mini" href="\$\{esc\(p\.azione\)\}">/);
  assert.match(APP, /const doveCambia = \[\.\.\.\(doveCanale === 'twitch' \|\| suKick \? \[doveCanale\] : \[\]\), \.\.\.\(!suKick && stato\.kick\?\.collegato \? \['kick'\] : \[\]\)\];/, 'la scheda della voce sa dove cambia');
  assert.match(APP, /const mancaKick = !DEMO && doveCambia\.includes\('kick'\) && stato\.kick\?\.canale === false;/);
  assert.match(APP, /const mancaTwitch = !DEMO && doveCambia\.includes\('twitch'\) && stato\.canaleOk === false;/);
  assert.equal((APP.match(/\$\{mancaKick \? permessoKick\(\) : ''\}/g) || []).length, 2, 'categoria e titolo');
  assert.match(VOCE, /if \(esito\.piattaforma === 'kick'\) return L\('manca il permesso di Kick/);
  assert.match(VOCE, /for \(const e of esito\.esiti \|\| \[\]\) logga\(esitoCambio\(/, 'la pagina dice un esito per piattaforma');
  assert.match(SRV, /\{ piattaforma: e\.dove, errore: e\.permesso \? 'permesso' : \(e\.nonTrovata \? 'nonTrovata' : 'errore'\), riautorizza: !!e\.permesso \}/);
});
