// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'INDIRIZZO CORTO DI PEWPEWIFY, COME E' CABLATO (docs/COLPI.md, «L'indirizzo
// corto»).
//
// Le prove di unita' provano il ponte (colpi-chat-accesso.test.mjs) e
// l'indirizzo con la pagina (colpi.test.mjs); qui si fissa che il server li usi
// nel modo giusto:
//  · pew.<dominio>/<canale> e' la pagina di QUEL canale, il resto passa, la
//    radice va al sito; il nome sta nel Caddyfile e la sonda lo accende;
//  · l'accesso da pew parte sul sito col segno di quel browser, torna col
//    biglietto, ed entra solo col segno giusto;
//  · l'indirizzo si scrive in un posto solo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senzaCommenti = (t) => t.replace(/^\s*\/\/.*$/gm, '');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const SRV = senzaCommenti(leggi('src/web/server.js'));
const tratto = (da, quanto) => {
  const i = SRV.indexOf(da);
  assert.ok(i >= 0, `manca ${da}`);
  return SRV.slice(i, i + quanto);
};

test('pew.<dominio>/<canale> e\' la pagina di quel canale, e la radice e\' il sito', () => {
  const m = tratto('if (config.pewHost && String(req.hostname', 600);
  assert.match(m, /if \(legaleIn\('privacy'\)\.some\(\(x\) => x\.via === req\.path\)\) return next\(\);/, 'l\'informativa e\' un indirizzo, non un canale');
  assert.match(m, /const d = RE_CANALE_IN_VIA\.exec\(req\.path\);/, 'si traduce solo /<canale>: le rotte della pagina passano com\'e\'');
  assert.match(m, /req\.url = '\/u\/' \+ d\[1\]\.toLowerCase\(\) \+ '\/colpo' \+ \(q >= 0 \? req\.url\.slice\(q\) : ''\);/, 'col ritorno ?dona= dei pagamenti');
  assert.match(m, /if \(req\.path === '\/'\) return res\.redirect\(302, config\.baseUrl \+ '\/'\);/);
  assert.ok(SRV.indexOf('if (config.pewHost && String(req.hostname') < SRV.indexOf('const guscio = creaGuscio(publicDir);'), 'prima del cancello');
  assert.ok(leggi('src/config.js').includes("pewHostSpento: /^(no|off)$/i.test(env('PEW_HOST', ''))"));
  assert.match(SRV, /sondaHost\(!config\.pewHost && !config\.pewHostSpento \? donazioni\.candidatoHost\(config\.baseUrl, 'pew'\) : '',/);
  assert.match(leggi('Caddyfile'), /^socialbot\.live,[^{]*\bpew\.socialbot\.live\b[^{]*\{/m, 'Caddy conosce il nome, o il certificato non arriva');
});

test('l\'accesso da pew: parte sul sito col segno, torna col biglietto, entra solo col segno giusto', () => {
  const accedi = tratto("app.get('/u/:user/colpo/accedi',", 1200);
  assert.match(accedi, /if \(sulPew\(req\)\) \{\n\s*const segno = crypto\.randomBytes\(16\)\.toString\('hex'\);\n\s*req\.session\.colpoSegno = \{ segno, canale: login, ts: Date\.now\(\) \};\n\s*return res\.redirect\(`\$\{config\.baseUrl\}\/u\/\$\{login\}\/colpo\/accedi\?segno=\$\{segno\}`\);/);
  assert.match(accedi, /req\.session\.colpoFlow = \{ state, canale: login, ts: Date\.now\(\), \.\.\.\(segno \? \{ segno \} : \{\}\) \};/, 'il segno viaggia con lo state, nella sessione del sito');
  const ritorno = tratto('const cf = req.session?.colpoFlow;', 2200);
  assert.match(ritorno, /if \(cf\?\.state && req\.query\.state === cf\.state\) \{/, 'il ritorno si riconosce solo dallo state');
  assert.match(ritorno, /const corto = !!\(cf\.segno && config\.pewHost\);/);
  assert.match(ritorno, /if \(corto\) \{\n\s*const b = pontiColpi\.apri\(\{ canale: cf\.canale, chiave, segno: cf\.segno \}\);\n\s*return res\.redirect\(`https:\/\/\$\{config\.pewHost\}\/u\/\$\{encodeURIComponent\(cf\.canale\)\}\/colpo\/entra\?b=\$\{b\}`\);\n\s*\}\n\s*req\.session\.spettatore = chiave;/,
    'la chiave non resta nella sessione del sito: va col biglietto');
  const entra = tratto("app.get('/u/:user/colpo/entra',", 700);
  assert.match(entra, /const s = req\.session\?\.colpoSegno;\n\s*if \(req\.session\) delete req\.session\.colpoSegno;/, 'il segno si usa una volta');
  assert.match(entra, /pontiColpi\.prendi\(String\(req\.query\.b \|\| ''\), \{ canale: login, segno: s\.segno \}\)/, 'il segno e\' quello della sessione di pew, mai quello della richiesta');
  assert.ok(!/req\.query\.segno/.test(entra));
});

test('l\'indirizzo si scrive in un posto solo', () => {
  assert.match(leggi('src/features/colpi.js'), /return config\.pewHost \? `https:\/\/\$\{config\.pewHost\}\/\$\{ch\}` : `\$\{config\.baseUrl\}\/u\/\$\{ch\}\/colpo`;/);
  for (const f of ['src/web/server.js', 'src/features/donazioni-stripe.js', 'src/features/donazioni-satispay.js', 'src/features/colpi-premi.js', 'src/bot.js']) {
    assert.ok(!/(baseUrl|base)\}?\s*\+?\s*[`'"]?\/u\/['`"]?\s*\+?\s*\$?\{?\s*\w+\s*\}?\s*\+?\s*[`'"]?\/colpo[`'"]/.test(senzaCommenti(leggi(f))), `${f} non si scrive l'indirizzo da se'`);
  }
  assert.match(SRV, /pagina: colpiMod\.urlPaginaColpo\(login\), euro:/, 'il pannello');
  assert.match(SRV, /riconciliaPremi\(\{ login: l, prima, helix, streamers, pagina: colpiMod\.urlPaginaColpo\(l\), log \}\)/, 'il premio a punti canale');
  assert.match(SRV, /if \(b\.colpi !== undefined\) accodaPremi\(user\.login, s\.settings\?\.colpi\);/, 'al salvataggio, col listino di prima');
  assert.match(SRV, /\(c\.premiErrori\?\.length \|\| c\.premiKickErrori\?\.length\) && !premiInCorso\.has\(x\.login\)\) accodaPremi\(x\.login, c\);\n    \}\n  \}, 10 \* 60_000\)/, 'e da soli, ogni 10 minuti, chi ha premi in sospeso, su Twitch o su Kick');
  assert.match(SRV, /\.then\(\(\) => \(kickApi\.puoPremiare\(l\) \? riconciliaPremi\(\{ login: l, prima, helix: kickApi\.premiKick\(l\), streamers, pagina: colpiMod\.urlPaginaColpo\(l\), log, piattaforma: 'kick' \}\) : null\)\)/, 'su Kick la stessa passata, nella stessa coda, solo col permesso dei premi');
  assert.match(SRV, /url: colpiMod\.urlPaginaColpo\(login\), corto: config\.pewHost,/, 'il canonico e il lettore della pagina');
});
