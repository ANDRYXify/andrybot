// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL MODULO DI UN ACQUISTO, COME E' CABLATO (docs/NEGOZIO.md, «Il modulo»).
//
// Le prove di unita' (negozio-moduli, negozio-modulo-flusso) provano le
// funzioni; qui si fissa che le porte le usino, e nel modo giusto:
//  · il canale e la bozza vengono solo dall'indirizzo, e la chiave ha la sua
//    forma prima di toccare l'archivio;
//  · la pagina non resta da nessuna parte: niente cache, niente indice,
//    niente referrer;
//  · le risposte giuste non comprano: portano al codice (303), e a comprare e'
//    il codice scritto in chat, riconosciuto prima di ogni articolo;
//  · i moduli scaduti si tolgono ogni minuto, non col giro dello storico.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senzaCommenti = (t) => t.replace(/^\s*\/\/.*$/gm, '');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const SRV = senzaCommenti(leggi('src/web/server.js'));
const NEG = senzaCommenti(leggi('src/features/negozio.js'));
const BOT = senzaCommenti(leggi('src/bot.js'));
const tratto = (testo, da, a) => {
  const i = testo.indexOf(da);
  assert.ok(i >= 0, `manca ${da}`);
  const j = typeof a === 'number' ? i + a : testo.indexOf(a, i + da.length);
  return testo.slice(i, j < 0 ? undefined : j);
};

test('le porte del modulo: canale e bozza dall\'indirizzo, e nessuna traccia', () => {
  const r = tratto(SRV, "const moduloSenzaTracce = ", "app.get('/api/streamer-verify'");
  assert.match(r, /'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow'/);
  assert.match(r, /const tokenModulo = \(req\) => \(\/\^\[\\w-\]\{22\}\$\/\.test\(String\(req\.params\.token \|\| ''\)\) \? String\(req\.params\.token\) : ''\);/, 'una chiave storta non arriva all\'archivio');
  assert.equal((r.match(/eLoginNostro\(login\) \? login : ''/g) || []).length, 2, 'e nemmeno un canale che non e\' nostro');
  assert.equal((r.match(/moduloSenzaTracce\(res\);/g) || []).length, 2, 'tutte e due le porte');
  assert.ok(!/req\.body\.(login|channel|canale|user|token)/.test(r), 'chi e quale bozza non arrivano dal corpo');
  assert.match(r, /if \(p\.stato === 'codice'\) return res\.redirect\(303, `\/u\/\$\{login\}\/m\/\$\{token\}\?c=\$\{p\.codice\}`\);/, 'le risposte giuste portano al codice, non comprano');
  assert.match(r, /express\.urlencoded\(\{ extended: false, limit: '16kb', parameterLimit: 20 \}\)/, 'un modulo piccolo, non un oggetto annidato');
  const porte = leggi('scripts/verifica-porte.mjs');
  assert.ok(porte.includes("['GET /u/:user/m/:token',") && porte.includes("['POST /u/:user/m/:token',"), 'e sono dichiarate fra le porte aperte, col perche\'');
});

test('in chat il codice si riconosce prima di ogni articolo, e compra solo con confermaModulo', () => {
  const t = tratto(NEG, 'export async function tryComando(', '\n}\n');
  assert.match(t, /const codice = moduli\.CODICE\.exec\(parti\[0\] \|\| ''\);/);
  assert.match(t, /const esito = codice\n\s*\? await confermaModulo\(\{ \.\.\.giro, codice: codice\[1\] \}\)\n\s*: await compra\(/);
  const c = tratto(NEG, 'export async function confermaModulo(', '\n}\n');
  assert.match(c, /negozioDb\.prendiCodice\(ch, \{ user: msg\?\.user, piattaforma: msg\?\.piattaforma \|\| 'twitch', codice, ora \}\)/, 'chi scrive, da dove, con quale codice');
  assert.match(c, /finally \{\n\s*negozioDb\.chiudiBozza\(b\.impronta, !!esito\?\.ok\);/, 'e la bozza si chiude comunque vada');
});

test('i moduli scaduti si tolgono ogni minuto', () => {
  assert.match(BOT, /this\._moduliTimer = setInterval\(\(\) => \{ try \{ negozio\.potaModuli\(\); \}/);
  assert.match(BOT, /\}, 60_000\);/);
  assert.match(BOT, /clearInterval\(this\._moduliTimer\);/);
});
