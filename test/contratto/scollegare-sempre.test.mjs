// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// SCOLLEGARE NON DIPENDE DAL PIANO.
// Collegare un account e' dare un consenso; scollegarlo e' ritirarlo, e l'informativa
// promette che si puo' fare. Un canale tornato all'Essenziale ha ancora i suoi
// collegamenti di quando pagava: se la rotta che li toglie passa dal controllo del
// piano, resta legato a qualcosa che non puo' piu' nemmeno vedere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const FILE = ['src/web/server.js', 'src/kick/rotte.js', 'src/youtube/rotte.js'];
const CANCELLI = /gateFeature\(|\bg7tv\b|requirePiano|soloPiano|conPiano/;

const rotte = () => FILE.flatMap((f) => [...leggi(f).matchAll(/app\.(post|delete)\((['`])([^'`]+)\2,([^\n]*)/g)]
  .map((m) => ({ f, via: m[3], metodo: m[1], resto: m[4] })));

test('ogni rotta che scollega si apre senza guardare il piano', () => {
  const scollegano = rotte().filter((r) => /disconnect|scollega/.test(r.via) || (r.metodo === 'delete' && /^\/api\/streamer\/(kick|youtube)$/.test(r.via)));
  assert.ok(scollegano.length >= 12, `rotte trovate: ${scollegano.length}`);
  for (const r of scollegano) {
    const intestazione = r.resto.split(/\(req, res\)|wrap\(/)[0];
    assert.ok(!CANCELLI.test(intestazione), `${r.f}: ${r.metodo.toUpperCase()} ${r.via} passa dal controllo del piano`);
  }
});

test('e l\'informativa lo promette nelle tre lingue', () => {
  for (const f of ['privacy.html', 'privacy-en.html', 'privacy-es.html']) {
    const t = leggi('src/web/public/' + f);
    assert.match(t, /TikTok/, `${f}: nomina TikTok fra quello che si scollega`);
  }
});
