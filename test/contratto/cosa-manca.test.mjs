// GLI AVVISI SU COSA MANCA sono del proprietario del canale, e di nessun altro.
//
// Il timore, detto per intero: un avviso condiviso fra moderatore e streamer.
// Il moderatore lo toglie (magari e' streamer anche lui, e sta sistemando le
// sue cose) e il proprietario non vede piu' l'avviso che gli serviva: la mail
// da aggiungere, Instagram, Spotify. Qui si fissa che non puo' succedere:
//  · la lista si calcola solo per il proprietario (dentro avvisiAperti, e il
//    server gli passa `isOwner(req)`);
//  · la porta delle risposte e dell'interruttore e' `requireOwner`, e scrive
//    nelle impostazioni del canale di chi e' entrato da proprietario;
//  · /api/streamer/impostazioni, che un moderatore puo' chiamare, non tocca ne'
//    le risposte ne' l'interruttore.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AVVISI } from '../../src/features/cosa-manca.js';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const rotta = (inizio, n = 1500) => { const i = SRV.indexOf(inizio); assert.ok(i > 0, `c'e': ${inizio}`); return SRV.slice(i, i + n); };

test('la lista la riceve solo il proprietario', () => {
  const di = rotta('const avvisiDi = (req, user) =>', 500);
  assert.match(di, /proprietario: isOwner\(req\) && s\?\.status === 'approved'/);
  assert.match(rotta("app.get('/api/me'", 7000), /avvisi: avvisiDi\(req, user\),/);
  assert.match(SRV, /const isOwner = \(req\) => \{ const u = currentUser\(req\); return !!u && u\.role !== 'moderatore'; \};/,
    'e proprietario vuol dire non entrato da moderatore');
});

test('le risposte e l\'interruttore passano solo dal proprietario, e restano sul suo canale', () => {
  const r = rotta("app.post('/api/streamer/avvisi'", 900);
  assert.match(r, /^app\.post\('\/api\/streamer\/avvisi', requireOwner, /);
  assert.match(r, /const user = currentUser\(req\);\n    const s = streamers\.get\(user\.login\);/);
  assert.match(r, /streamers\.setSettings\(user\.login, out\);/);
  const imp = rotta("app.post('/api/streamer/impostazioni'", 30000);
  const fine = imp.indexOf('\n  }));');
  assert.doesNotMatch(imp.slice(0, fine), /avvisiSpenti|\bavvisi\b/, 'le impostazioni aperte ai moderatori non li toccano');
  assert.match(imp, /^app\.post\('\/api\/streamer\/impostazioni', requireLogin,/, '(ed e\' proprio quella aperta anche a loro)');
});

test('il pannello e il server conoscono gli stessi avvisi, e portano alle stesse schede', () => {
  const testi = APP.slice(APP.indexOf('const AVVISI_MANCA = {'), APP.indexOf('const AVVISI_SCHEDA = '));
  const chiavi = [...testi.matchAll(/^  '?([a-z-]+)'?: \(\) => \(\{/gm)].map((m) => m[1]);
  assert.deepEqual(chiavi, AVVISI.map((a) => a.id), 'ogni avviso ha le sue parole, e nessuna parola resta senza avviso');
  const schede = Function(`return ${APP.match(/const AVVISI_SCHEDA = (\{[^}]+\});/)[1]}`)();
  assert.deepEqual(schede, Object.fromEntries(AVVISI.map((a) => [a.id, a.scheda])), '«Fammi vedere» porta dove il server dice che si rimedia');
  for (const s of new Set(Object.values(schede))) assert.ok(APP.includes(`pannello('${s}'`), `la scheda ${s} esiste`);
  for (const [id] of Object.entries(schede)) assert.match(testi, new RegExp(`${id.includes('-') ? `'${id}'` : id}: \\(\\) => \\(\\{\\n    titolo: L\\('[^']+', '[^']+', '[^']+'\\),\\n    testo: L\\(`), `${id}: nelle tre lingue`);
});

test('uno per volta, e mai sopra un\'altra cosa', () => {
  const m = APP.slice(APP.indexOf('function mostraAvvisoManca('), APP.indexOf('const RECENSIONE_DOPO_MS'));
  assert.match(m, /if \(occupatoPerInvito\(\)\) \{ _mancaOrologio = setTimeout\(mostraAvvisoManca, MANCA_RIPROVA_MS\); return; \}/);
  assert.match(m, /_mancaFatto = true;/, 'uno per visita');
  assert.match(m, /AVVISI_SCHEDA\[x\] !== schedaAttiva/, 'e non sulla scheda dove sei gia\'');
  assert.match(APP, /dialog\[open\], \.bv-velo, \.giro-velo, \.aiuto-banner, \.rec-invito, \.manca-avviso, #cerca-overlay\.aperto/,
    'e l\'invito alle recensioni aspetta lui, come lui aspetta l\'invito');
  assert.match(m, /if \(come === 'vai'\) \{ via\('domani'\); vaiAScheda\(AVVISI_SCHEDA\[id\]\); return; \}/, '«Fammi vedere» porta li\' e lo rimanda a domani');
  const dg = leggi('src/web/public/disegno.js');
  assert.match(dg, /el\.classList\.contains\('manca-avviso'\)/, 'e se ne va disfacendosi, come l\'invito');
});

test('l\'overlay si ricorda la prima volta che si apre', () => {
  const r = rotta("app.get('/overlay/:login/stream'", 1200);
  assert.ok(r.indexOf('if (!chiaveOk(req)) return notFound(res);') < r.indexOf('overlayVisto'), 'solo con la chiave giusta');
  assert.match(r, /if \(suo && !suo\.settings\?\.overlayVisto\) streamers\.setSettings\(login, \{ \.\.\.\(suo\.settings \|\| \{\}\), overlayVisto: Date\.now\(\) \}\);/, 'e una volta sola');
});
