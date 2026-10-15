// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Lo Studio Web: spento a tutti di serie, aperto a chi e' nella beta.
//
// Il motore c'e' ed e' completo, ma la funzione non e' mai arrivata al punto di
// funzionare per chi la usa. Finche' e' cosi' non si promette e non si offre —
// e non basta nasconderla nel pannello: se non c'e', il SERVER deve rifiutare,
// altrimenti resta raggiungibile da chi chiama la rotta a mano.
//
// Questa prova guarda la cosa da cui dipende tutto il resto: l'interruttore, e
// che il prodotto non prometta a parole una cosa che ha spento nei fatti.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-studio-');
const { config } = await import('../../src/config.js');

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');

test('di suo e\' spento: si accende solo dicendolo apposta', () => {
  assert.equal(config.studioAttivo, false, 'senza STUDIO_WEB=1 resta spento');
});

// Lo Studio si apre a chi e' nella beta (docs/DIRETTA.md): ogni rotta della
// diretta passa dalla stessa porta, e chi non c'e' riceve un no detto.
test('tutte le rotte della diretta passano da «studioAperto», e trasmette solo il proprietario', () => {
  const s = leggi('src/web/server.js');
  const rotte = [...s.matchAll(/app\.(get|post)\('\/api\/diretta[^']*',([^)]*)/g)];
  assert.ok(rotte.length >= 7, `rotte trovate: ${rotte.length}`);
  for (const r of rotte) {
    assert.match(r[2], /requireOwner, studioAperto/, `la rotta ${r[0].slice(0, 46)}… non passa dalla porta`);
  }
  assert.doesNotMatch(s, /app\.(get|post|put)\('\/api\/studio['\/]/, 'le rotte dello Studio vecchio, che ricodificava sul server, non ci sono piu\'');
  assert.match(s, /const studioPerMe = \(login\) => config\.studioAttivo \|\| \(config\.studioBeta && !!streamers\.get\(login\)\?\.settings\?\.betaStudio\);/);
});

test('la vetrina non promette una diretta dal browser', () => {
  for (const f of ['src/web/public/index.html', 'scripts/og.mjs']) {
    const s = leggi(f);
    assert.ok(!/dal browser|from the browser|desde el navegador/.test(s),
      `${f} promette ancora la diretta dal browser`);
  }
});

// La vetrina puo' nominare lo Studio solo dentro «In arrivo», con lo stato
// scritto sopra il titolo nelle tre lingue (docs/DIRETTA.md): una beta in
// preparazione detta come tale non e' una promessa, una frase sciolta si'.
test('nella vetrina lo Studio sta solo in «In arrivo», con lo stato accanto', async () => {
  const { vetrinaHtml } = await import('../../src/web/vetrina-vista.js');
  const STATO = { it: 'Beta aperta', en: 'Open beta', es: 'Beta abierta' };
  for (const l of ['it', 'en', 'es']) {
    const h = vetrinaHtml(l);
    const i = h.indexOf('<section class="vt-sez" id="in-arrivo">');
    assert.ok(i >= 0, `${l}: manca «In arrivo»`);
    const dentro = h.slice(i, h.indexOf('</section>', i));
    const fuori = h.slice(0, i) + h.slice(h.indexOf('</section>', i));
    const beta = dentro.slice(dentro.indexOf('data-stato="beta"'), dentro.indexOf('data-stato="pre-alpha"'));
    assert.ok(beta.includes(STATO[l]), `${l}: lo Studio senza «${STATO[l]}»`);
    assert.ok(dentro.includes('data-stato="pre-alpha"') && dentro.includes('Pre-alpha'), `${l}: OSify senza «pre-alpha»`);
    assert.ok(!/diretta-dal-sito|senza OBS|without OBS|sin OBS|dal browser|from the browser|desde el navegador/.test(fuori), `${l}: lo Studio nominato fuori da «In arrivo»`);
  }
});

test('nemmeno le descrizioni che finiscono nei motori di ricerca', () => {
  const s = leggi('src/web/server.js');
  for (const m of s.matchAll(/(?:ogDesc|twDesc|description): '([^']*)'/g)) {
    assert.ok(!/dal browser|from the browser|desde el navegador/.test(m[1]),
      `una descrizione la promette ancora: ${m[1].slice(0, 70)}…`);
  }
});

// La stream key e' la chiave con cui si trasmette sul canale: chiederla per una
// funzione spenta e' chiedere un potere che non si usa.
test('con lo Studio spento non si chiede la chiave di trasmissione', async () => {
  const { SCOPES } = await import('../../src/config.js');
  assert.equal(SCOPES.broadcaster.includes('channel:read:stream_key'), false);
});

test('e il permesso segue l\'interruttore, invece di essere tolto a mano', () => {
  const s = leggi('src/config.js');
  assert.match(s, /STUDIO_WEB.*channel:read:stream_key/s,
    'il permesso deve dipendere dall\'interruttore, cosi\' torna da solo quando lo Studio si accende');
});

test('la chiave di trasmissione si chiede solo a chi ha lo Studio aperto', () => {
  const s = leggi('src/web/server.js');
  const i = s.indexOf("app.get('/auth/permessi'");
  const r = s.slice(i, s.indexOf('\n  });', i));
  assert.match(r, /studioPerMe\(login\) && !SCOPES\.broadcaster\.includes\('channel:read:stream_key'\)\s*\? \[\.\.\.SCOPES\.broadcaster, 'channel:read:stream_key'\] : SCOPES\.broadcaster/);
});

test.after(() => usaEGetta.pulisci());

test('nella beta lo Studio e\' di chi l\'ha chiesto con ogni piano; aperto a tutti passa dal muro del piano', () => {
  const SRV = leggi('src/web/server.js');
  const porta = SRV.slice(SRV.indexOf('const studioAperto = '), SRV.indexOf('const MOTIVI_DIRETTA'));
  assert.match(SRV, /const muroStudio = gateFeature\('studio', 'Studio Web'\);/);
  assert.match(porta, /if \(!studioPerMe\(currentUser\(req\)\.login\)\) return res\.status\(403\)/, 'prima di tutto: dentro solo chi ha lo Studio');
  assert.match(porta, /if \(config\.studioAttivo\) return muroStudio\(req, res, next\);\n\s+next\(\);/, 'il piano conta quando lo Studio non e\' piu\' una beta');
});
