// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I BIT DA SPENDERE, COME SONO CABLATI (docs/COLPI.md, «I Bit da spendere»).
// Le prove di unita' (test/unita/colpi-bit.test.mjs) provano il servizio e il
// registro; qui si fissa che il bot e il server li usino nel modo giusto:
//  · il servizio ha il registro vero, e il cheer porta l'id del messaggio di
//    EventSub (lo stesso cheer rimandato conta una volta);
//  · «!pew bit» risponde solo su Twitch, a chi ha un id, una volta al minuto;
//  · il saldo si legge solo con l'accesso, e il pannello vede i totali.
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

test('il cheer arriva al servizio con l\'id del messaggio, e il servizio ha il registro vero', () => {
  assert.match(leggi('src/twitch/events.js'), /data: msg\.payload\?\.event,\n\s*id: String\(msg\.metadata\?\.message_id \|\| ''\),/, 'l\'id che Twitch ripete quando rimanda');
  assert.match(BOT, /const r = this\.colpi\?\.daCheer\(channel, \{ \.\.\.data, evento: ev\.id \|\| '' \}\) \|\| \{\};/);
  assert.match(BOT, /crediti: pewBit, log \}\);/, 'i Bit si muovono solo dal registro di db.js');
  assert.match(BOT, /pewSerie\.pulisci\(\); pewBit\.pulisci\(\);/, 'i riferimenti vecchi si puliscono una volta al giorno');
});

test('«!pew bit»: su Twitch, a chi ha un id, una volta al minuto a testa', () => {
  const i = BOT.indexOf('chiedeBit(cfgColpi, msg.text)');
  assert.ok(i > 0 && i < BOT.indexOf('eFrasePresenza(cfgColpi, msg.text)'), 'prima della presenza: la frase non lo copre');
  const h = BOT.slice(i - 40, i + 700);
  assert.match(h, /\(!msg\.piattaforma \|\| msg\.piattaforma === 'twitch'\) && msg\.userId && this\.colpi\.conBitPew\(login\)/);
  assert.match(h, /if \(adesso - \(saldiBitChiesti\.get\(k\) \|\| 0\) >= 60_000\) \{/);
  assert.match(h, /this\.colpi\.saldoBit\(login, msg\.userId\)/, 'il saldo e\' per id, non per nome');
});

test('un tocco: chi paga e\' chi ha l\'accesso, con un tetto alle richieste', () => {
  const i = SRV.indexOf("app.post('/u/:user/colpo/lancia',");
  assert.ok(i > 0);
  const h = SRV.slice(i, i + 600);
  assert.match(h, /if \(!extRateOk\('colpo-mira:' \+ String\(req\.ip \|\| ''\)\)\) return res\.status\(429\)/, 'lo stesso tetto della mira');
  assert.match(h, /const io = spettatoreDi\(req\);\n\s*if \(!io\) return res\.status\(401\)/);
  assert.match(h, /res\.json\(portaColpi\.lancia\(login, req\.body \|\| \{\}, String\(req\.ip \|\| ''\), io\)\);/, 'chi paga viene dalla sessione, mai dal corpo');
});

test('il saldo si legge con l\'accesso, si spende dalla porta, e il pannello vede i totali', () => {
  const i = SRV.indexOf("app.get('/u/:user/colpo/saldi',");
  assert.ok(i > 0);
  const h = SRV.slice(i, i + 500);
  assert.match(h, /res\.set\('Cache-Control', 'private, no-store'\);/);
  assert.match(h, /if \(!io\) return res\.status\(401\)\.json\(\{ errore: 'accesso' \}\);/);
  assert.match(SRV, /res\.json\(await portaColpi\.paga\(login, req\.params\.id, req\.body\?\.mezzo, spettatoreDi\(req\), String\(req\.body\?\.modo \|\| ''\)\)\);/, 'chi paga e\' chi ha l\'accesso, mai un id dal corpo');
  assert.match(SRV, /bitPew: \{ totali: pewBit\.totali\(login\), primi: pewBit\.primi\(login, 10\)\.map\(\(p\) => \(\{ nome: p\.nome, saldo: p\.saldo \}\)\) \},/, 'al pannello i nomi, non gli id');
});
