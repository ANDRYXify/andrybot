// LE CAMPAGNE: le porte del server (docs/CAMPAGNE.md).
//
// Il regalo si fa solo con un POST del proprietario, a campagna aperta, dentro
// la transazione che tiene il tetto. La pagina si apre a tutti; entrare con
// Twitch, Kick o YouTube da li' riporta li'. Le campagne le crea solo l'admin,
// e una campagna non puo' mai prendere il posto di una pagina del sito.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const pezzo = (inizio, n) => { const i = SRV.indexOf(inizio); assert.ok(i > 0, inizio); return SRV.slice(i, i + n); };

test('il regalo passa solo dal POST del proprietario, a campagna aperta', () => {
  const pers = pezzo('const personaCampagna = (req, c) => {', 800);
  assert.match(pers, /if \(!user\) return \{ chi: 'fuori' \};\n    if \(!isOwner\(req\)\) return \{ chi: 'moderatore' \};/);
  const post = pezzo("app.post('/:campagna/prendi', (req, res, next) => {", 1200);
  assert.match(post, /if \(!c\) return next\(\);\n    if \(!currentUser\(req\)\) return res\.redirect\(303, '\/' \+ c\.id\);/, 'senza sessione torna alla pagina, che fa entrare');
  assert.match(post, /if \(p\.chi !== 'proprietario' \|\| p\.no\) return res\.redirect\(303, '\/' \+ c\.id\);/);
  assert.match(post, /campagneDb\.prendi\(c\.id, p\.login, \{ tetto: c\.tetto, regala: \(\) => subscriptions\.set\(p\.login, campagne\.regalo\(c\)\) \}\)/, 'il tetto e il regalo sono quelli della campagna');
  const get = SRV.slice(SRV.indexOf("app.get('/:campagna', (req, res, next) => {"), SRV.indexOf("app.post('/:campagna/prendi'"));
  assert.ok(get.length > 100 && get.length < 1200, 'la rotta GET, da sola');
  assert.doesNotMatch(get, /prendi\(|subscriptions\.set/, 'aprire la pagina non regala niente');
  assert.equal((SRV.match(/campagneDb\.prendi\(/g) || []).length, 1, 'e il regalo ha una porta sola');
});

test('le pagine delle campagne stanno in fondo: il sito vince sempre', () => {
  const get = SRV.indexOf("app.get('/:campagna', (req, res, next) => {");
  const fine = SRV.indexOf('app.use((req, res) => notFound(res));');
  const dopo = SRV.slice(get, fine);
  assert.ok(get > 0 && fine > get, 'prima del 404');
  const altre = [...SRV.slice(0, fine).matchAll(/\bapp\.(get|post|put|patch|delete|all)\(/g)].map((m) => m.index).filter((i) => i > get);
  assert.equal(altre.length, 1, 'dopo c\'e\' solo il suo tasto');
  assert.match(dopo, /app\.post\('\/:campagna\/prendi'/);
  assert.match(pezzo("app.get('/:campagna', (req, res, next) => {", 300), /const c = campagne\.RE_ID\.test\(String\(req\.params\.campagna\)\.toLowerCase\(\)\) \? campagnaDi\(String\(req\.params\.campagna\)\.toLowerCase\(\)\) : null;\n    if \(!c\) return next\(\);/, 'se non e\' una campagna passa oltre');
});

test('al cancello: aperte solo le campagne che ci sono', () => {
  assert.match(SRV, /guscio\.porta\('\/:campagna', viaDiCampagna\);\n  guscio\.porta\('\/:campagna\/prendi', viaDiCampagna\);/);
  assert.match(SRV, /const viaDiCampagna = \(via\) => \{ const m = \/\^\\\/\(\[a-z0-9-\]\{1,30\}\)\(\?:\\\/prendi\)\?\\\/\?\$\/i\.exec\(via\); return !!m && eCampagna\(m\[1\]\.toLowerCase\(\)\); \};/);
  assert.match(SRV, /const eCampagna = \(id\) => campagne\.RE_ID\.test\(String\(id \|\| ''\)\) && !!campagneDb\.get\(String\(id\)\);/);
});

test('solo l\'admin le crea, e un indirizzo nuovo non e\' mai quello di una pagina', () => {
  for (const r of ["app.get('/api/admin/campagne', requireAdmin,", "app.post('/api/admin/campagne', requireAdmin,", "app.delete('/api/admin/campagne/:id', requireAdmin,",
    "app.post('/api/admin/campagne/:id/anteprima', requireAdmin,", "app.post('/api/admin/promo/video', requireAdmin,"]) assert.ok(SRV.includes(r), r);
  const crea = pezzo("app.post('/api/admin/campagne', requireAdmin,", 1400);
  assert.match(crea, /const no = campagne\.idNuovo\(id, occupati\(\), new Set\(campagneDb\.elenco\(\)\.map\(\(x\) => x\.id\)\)\);/);
  assert.match(crea, /anteprima: c\?\.dati\?\.anteprima \|\| ''/, 'l\'anteprima la scrive solo il caricamento, non il modulo');
  const occ = pezzo('const occupati = () => {', 900);
  assert.match(occ, /app\._router\?\.stack/, 'le rotte si leggono dal router');
  assert.match(occ, /readdirSync\(publicDir\)/, 'e i file dalla cartella pubblica');
});

test('entrare dalla pagina riporta alla pagina, e solo a una campagna che c\'e\'', () => {
  const segna = pezzo('function segnaCampagna(req) {', 200);
  assert.match(segna, /const id = String\(req\.query\?\.campagna \|\| ''\)\.toLowerCase\(\);\n    if \(eCampagna\(id\) && req\.session\) req\.session\.campagna = id;/);
  const torna = pezzo('function tornaAllaCampagna(req) {', 250);
  assert.match(torna, /delete req\.session\.campagna;\n    return eCampagna\(c\) \? '\/' \+ c : '';/, 'si usa una volta, e non e\' un rimando qualsiasi');
  assert.match(pezzo("app.get('/entra', wrap(async (req, res) => {", 900), /req\.session\.selfFlow = \{ state, nuovo: req\.query\.nuovo === '1' \};\n      segnaCampagna\(req\);/);
  assert.equal((SRV.match(/requireLogin, currentUser, wrap, annotaIngresso: segnaCampagna,/g) || []).length, 2, 'Kick e YouTube ricevono chi ricorda la campagna');
  for (const [f, via] of [['src/kick/rotte.js', 'kick'], ['src/youtube/rotte.js', 'youtube']]) {
    const t = leggi(f);
    const porta = t.slice(t.indexOf(`app.get('/accedi/${via}'`), t.indexOf('parti(req, res, { registrazione: true });', t.indexOf(`app.get('/accedi/${via}'`)));
    assert.match(porta, /annotaIngresso\?\.\(req\);/, `e la porta /accedi/${via} lo chiama prima di partire`);
  }
  assert.match(SRV, /const campagna = tornaAllaCampagna\(req\);\n        if \(campagna\) return res\.redirect\(campagna\);/, 'Twitch');
  assert.equal((SRV.match(/dove: dove \|\| tornaAllaCampagna\(req\) \|\|/g) || []).length, 2, 'Kick e YouTube');
});

test('i video delle promo escono in BT.709, convertiti una volta e dichiarati', () => {
  const v = pezzo("app.post('/api/admin/promo/video', requireAdmin,", 3000);
  assert.match(v, /'-vf', 'setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv,format=yuv420p'/, 'si dichiara cosa sono, non si riconverte: li ha gia\' convertiti il motore');
  assert.ok(!/out_color_matrix/.test(v), 'nessuna seconda conversione');
  for (const x of ["'-colorspace', 'bt709'", "'-color_primaries', 'bt709'", "'-color_trc', 'bt709'"]) assert.ok(v.includes(x), x);
});
