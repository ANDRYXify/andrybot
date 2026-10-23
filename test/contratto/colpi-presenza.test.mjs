// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PRESENZA E L'ANTEPRIMA DI PEWPEWIFY, COME SONO CABLATE (docs/COLPI.md).
//
// Le prove di unita' provano il modello, il servizio sul registro vero, la porta
// e la serie (colpi.test.mjs, presenze.test.mjs); verifica-colpi.mjs le prova
// nel browser. Qui si fissa che il bot e il server le usino nel modo giusto:
//  · la frase si guarda su ogni messaggio di una persona (non del bot, non dei
//    bot noti), con la diretta come chiave che regge un riavvio, e chi parte o
//    l'ha gia' fatto conta nella serie;
//  · la prova del pannello e' del proprietario;
//  · la pagina carica lo stesso disegnatore e lo stesso scontorno dell'overlay,
//    e chi non ha una sessione li puo' scaricare.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senzaCommenti = (t) => t.replace(/^\s*\/\/.*$/gm, '');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const BOT = senzaCommenti(leggi('src/bot.js'));
const SRV = senzaCommenti(leggi('src/web/server.js'));

test('la frase della presenza: da una persona, una per diretta, e conta nella serie', () => {
  const i = BOT.indexOf("if (!msg.isSelf && streamers.get(login)?.settings?.colpi?.attivo === true) {");
  assert.ok(i > 0 && i < BOT.indexOf('this.brain.observe?.(msg);'), 'nell\'elaborazione di ogni messaggio, dopo l\'antispam');
  const h = BOT.slice(i, i + 1800);
  assert.match(h, /const codice = cfgColpi \? codicePerMonete\(cfgColpi, msg\.text\) : '';\n\s*if \(codice\) \{\n\s*const r = this\.colpi\.daMonete\(login, \{ codice, user: msg\.user \}\);/, 'le monete le paga chi scrive, col suo codice');
  assert.match(h, /if \(r\.esito === 'partita' && r\.nuova\) \{\n\s*const date = r\.monete > 0 \? economia\.premio\(login, msg\.user, r\.monete, 'presenza'\) : 0;/, 'le monete della serie: un premio (bot, esclusi e streamer no), una volta per diretta');
  assert.match(BOT, /serie: pewSerie, log \}\);/, 'la serie col registro vero delle dirette');
  assert.match(BOT, /pewSerie\.segnaDiretta\(login, arrivi\.occasioneDiretta\(login, this\._inizioTwitch\(login\)\), ora\);/, 'ogni diretta va nell\'elenco dal giro delle ore, con la stessa chiave della presenza');
  assert.match(BOT, /monete: \{ punta: economia\.punta, rendi: economia\.rendi, saldo: economia\.saldo \}/, 'le monete si muovono solo da economia.js, con la ricevuta');
  assert.match(h, /eFrasePresenza\(cfgColpi, msg\.text\) && ePersona\(login, msg\.user\)/, 'i bot noti non si presentano');
  assert.match(h, /chiave: piattaforma \+ ':' \+ \(msg\.userId \|\| msg\.user\)/, 'chi e\', per piattaforma');
  assert.match(h, /occasione: arrivi\.occasioneDiretta\(login, this\._inizioTwitch\(login\)\)/, 'la diretta come la tengono le accoglienze: regge un riavvio');
  assert.match(h, /if \(r\.esito === 'partita' \|\| r\.esito === 'gia'\) presenze\.dichiara\(login, msg\.user\);/);
  assert.match(leggi('src/features/arrivi.js'), /export const occasioneDiretta = \(channel, twitchInizio = 0, deps\) => R\.occasione\('diretta', pezziOccasione\(norm\(channel\), _con\(deps\), twitchInizio\)\);/);
});

test('la prova della presenza e\' del proprietario, e l\'anteprima della pagina usa i pezzi dell\'overlay', () => {
  assert.match(SRV, /app\.post\('\/api\/colpi\/presenza\/prova', requireOwner, /);
  for (const f of ['lanci.js', 'scontorno.js']) assert.ok(SRV.includes(`guscio.risorsa('${f}');`), `${f}: chi apre la pagina non ha una sessione`);
  const pag = leggi('src/features/colpi-pagina.js');
  assert.ok(pag.includes('<script src="/lanci.js" defer></script><script src="/scontorno.js" defer></script>'), 'lo stesso disegnatore dei lanci e lo stesso scontorno');
  const ov = leggi('src/web/public/overlay.html');
  assert.ok(ov.includes('<script src="/scontorno.js"></script>'));
  assert.match(leggi('src/web/public/overlay-app.js'), /window\.SB_SCONTORNO\.scontorna\(v, ev\.chroma, canvas,/, 'l\'overlay scontorna con lo stesso codice');
  assert.match(SRV, /app\.get\('\/u\/:user\/colpo\/anteprima\/:voce\/suono', /);
});
