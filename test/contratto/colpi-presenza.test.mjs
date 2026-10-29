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

test('la frase della presenza: da una persona, fuori dal giro dei Pew; l\'effetto, dentro, e solo se acceso', () => {
  const giro = BOT.indexOf("if (!msg.isSelf && streamers.get(login)?.settings?.colpi?.attivo === true) {");
  const frase = BOT.indexOf('if (eFrasePresente(pres, msg.text) && ePersona(login, msg.user)) {');
  assert.ok(frase > 0 && frase < giro && giro < BOT.indexOf('this.brain.observe?.(msg);'), 'la presenza e\' del canale: si conta prima e fuori dal giro dei Pew');
  assert.match(BOT, /const pres = presenzaPorta\.cfgDi\(login\);/, 'la presenza la legge l\'accessore, dalla porta');
  const h = BOT.slice(frase, giro);
  assert.match(h, /const chiave = piattaforma \+ ':' \+ \(msg\.userId \|\| msg\.user\), occasione = arrivi\.occasioneDiretta\(login, this\._inizioTwitch\(login\)\);/, 'chi e\', per piattaforma; la diretta come la tengono le accoglienze: regge un riavvio');
  assert.match(h, /const s = this\.inOnda\(login\) \? contaSerie\(pewSerie, \{ canale: login, chiave, occasione, pres \}\) : null;/, 'la serie sale solo in onda, col registro vero');
  assert.match(h, /const date = s\?\.monete > 0 \? economia\.premio\(login, msg\.user, s\.monete, 'presenza'\) : 0;/, 'le monete della serie: un premio (bot, esclusi e streamer no), una volta per diretta');
  assert.match(h, /presenze\.dichiara\(login, msg\.user\);/, 'presente alla diretta senza aspettare i due giri, anche senza effetto');
  assert.match(h, /if \(s \? s\.nuova : prima\) \{\n\s*const t = rispostaPresenza\(pres, /, 'una risposta sola, alla prima presenza');
  const effetto = BOT.indexOf('} else if (presenzaOra) {', giro);
  assert.ok(effetto > giro, 'l\'effetto e\' un ramo dei Pew');
  assert.match(BOT.slice(effetto, effetto + 400), /if \(cfgColpi\?\.presenza\.attiva\) \{\n\s*this\.colpi\.presenza\(login, \{ chiave: presenzaOra\.chiave, nome: msg\.display \|\| msg\.user, occasione: presenzaOra\.occasione,\n\s*lingua: linguaChat\(login\), serie: presenzaOra\.serie, monete: presenzaOra\.gradino \}\);/);
  assert.match(BOT, /try \{ pewSerie\.segnaDiretta\(login, arrivi\.occasioneDiretta\(login, this\._inizioTwitch\(login\)\), ora\); \}/, 'ogni diretta va nell\'elenco dal giro delle ore, sempre, con la stessa chiave della presenza');
  assert.doesNotMatch(BOT, /settings\?\.colpi\?\.presenza\?\.attiva === true\) \{\s*try \{ pewSerie/, 'e non solo con l\'effetto acceso');
  assert.match(BOT, /monete: \{ punta: economia\.punta, rendi: economia\.rendi, saldo: economia\.saldo \}/, 'le monete si muovono solo da economia.js, con la ricevuta');
  assert.match(leggi('src/features/arrivi.js'), /export const occasioneDiretta = \(channel, twitchInizio = 0, deps\) => R\.occasione\('diretta', pezziOccasione\(norm\(channel\), _con\(deps\), twitchInizio\)\);/);
});

test('un accessore solo: nessuno legge la frase, la porta o la serie dai Pew', () => {
  const vecchi = /colpi\??\.presenza\??\.(frase|porta|premi|dopo|rispondi|risposta)\b|cfg\.presenza\.(frase|porta)|eFrasePorta|eFrasePresenza/;
  for (const f of ['src/bot.js', 'src/web/server.js', 'src/features/games.js', 'src/features/presenze.js', 'src/features/presenza-porta.js', 'src/features/colpi-servizio.js', 'src/features/colpi.js']) {
    assert.doesNotMatch(senzaCommenti(leggi(f)), vecchi, f);
  }
  assert.match(leggi('src/features/presenza-porta.js'), /export const cfgDi = \(channel\) => presenteDi\(streamers\.get\(norm\(channel\)\)\?\.settings\);/);
  assert.match(SRV, /s\.settings = \{ \.\.\.s\.settings, presente: presenteDi\(s\.settings\) \};/, 'il pannello la riceve gia\' letta');
  assert.match(SRV, /const presente = presenteDaSalvare\(s\.settings, b\);\n\s*if \(presente !== undefined\) out\.presente = presente;/, 'il server la ripulisce, e la ferma quando si salvano i Pew');
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
