// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA GUARDIA (docs/GUARDIA.md): la sonda guarda cose che esistono davvero.
//  · ogni porta che la sonda vuole chiusa e' una lettura vera del server, con
//    la sua guardia: un nome sbagliato darebbe 404 e sembrerebbe «chiusa»;
//  · ogni file che la sonda vuole pubblico e' aperto nel guscio;
//  · la guardia notturna lancia la sonda, il cancello delle chiavi e l'esame
//    delle dipendenze; il cancello delle chiavi sta nella catena dei cancelli.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRIVATE, PUBBLICI } from '../../scripts/sonda-sito.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const WEB = readdirSync(join(RAD, 'src/web')).filter((f) => f.endsWith('.js')).map((f) => leggi('src/web/' + f)).join('\n');

test('le porte che la sonda vuole chiuse sono letture vere, con la guardia', () => {
  assert.ok(PRIVATE.length >= 5);
  for (const via of PRIVATE) {
    const riga = new RegExp(`app\\.get\\('${via.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}',\\s*(requireLogin|requireOwner|requireAdmin)\\b`);
    assert.match(WEB, riga, `${via} non e' una lettura guardata del server: la sonda non proverebbe niente`);
  }
});

test('i file che la sonda vuole pubblici sono aperti nel guscio', () => {
  const guscio = leggi('src/web/vetrina.js');
  for (const via of PUBBLICI) assert.ok(guscio.includes(`'${via}'`), `${via} non e' fra le porte aperte del guscio`);
});

test('la guardia notturna fa i suoi tre controlli, e le chiavi stanno fra i cancelli', () => {
  const g = leggi('.github/workflows/guardia.yml');
  assert.match(g, /schedule:\s*\n\s*- cron:/, 'gira a orari fissi');
  for (const passo of ['npm audit --omit=dev --audit-level=high', 'node scripts/verifica-chiavi.mjs', 'node scripts/sonda-sito.mjs']) assert.ok(g.includes(passo), 'manca: ' + passo);
  const cancelli = JSON.parse(leggi('package.json')).scripts.cancelli;
  assert.ok(cancelli.includes('node scripts/verifica-chiavi.mjs && node scripts/verifica-chiavi.mjs --selftest'), 'il cancello delle chiavi e la sua autoprova stanno nella catena');
  const d = leggi('.github/dependabot.yml');
  assert.ok(/package-ecosystem: npm/.test(d) && /package-ecosystem: github-actions/.test(d), 'gli aggiornamenti si propongono da soli');
});
