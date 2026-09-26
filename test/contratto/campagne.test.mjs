// LE CAMPAGNE IN CITTA': le porte del server (docs/CAMPAGNE.md).
//
// Il regalo si fa solo con un POST del proprietario, a campagna aperta, dentro
// la transazione che tiene il tetto. La pagina si apre a tutti; entrare con
// Twitch, Kick o YouTube da li' riporta li'.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ID } from '../../src/features/campagne.js';

const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
const VET = readFileSync(new URL('../../src/web/vetrina.js', import.meta.url), 'utf8');
const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const pezzo = (inizio, n) => { const i = SRV.indexOf(inizio); assert.ok(i > 0, inizio); return SRV.slice(i, i + n); };

test('il regalo passa solo dal POST del proprietario, a campagna aperta', () => {
  const pers = pezzo('const personaCampagna = (req, id) => {', 800);
  assert.match(pers, /if \(!user\) return \{ chi: 'fuori' \};\n    if \(!isOwner\(req\)\) return \{ chi: 'moderatore' \};/);
  const post = pezzo("app.post(['/nyc/prendi', '/milano/prendi', '/napoli/prendi'], (req, res) => {", 900);
  assert.match(post, /const id = campagnaDi\(req\);\n    if \(!currentUser\(req\)\) return res\.redirect\(303, '\/' \+ id\);/, 'senza sessione torna alla pagina, che fa entrare');
  assert.match(post, /if \(p\.chi !== 'proprietario' \|\| p\.no\) return res\.redirect\(303, '\/' \+ id\);/);
  assert.match(post, /campagneDb\.prendi\(id, p\.login, \{ tetto: campagne\.TETTO, regala: \(\) => subscriptions\.set\(p\.login, campagne\.regalo\(\)\) \}\)/);
  const inizioGet = SRV.indexOf("app.get(['/nyc', '/milano', '/napoli'], (req, res) => {");
  const get = SRV.slice(inizioGet, SRV.indexOf("app.post(['/nyc/prendi'", inizioGet));
  assert.ok(get.length > 100 && get.length < 900, 'la rotta GET, da sola');
  assert.doesNotMatch(get, /prendi|subscriptions\.set/, 'aprire la pagina non regala niente');
  assert.equal((SRV.match(/campagneDb\.prendi\(/g) || []).length, 1, 'e il regalo ha una porta sola');
});

test('le pagine si aprono senza sessione, una per campagna, scritte per intero', () => {
  const vie = (re) => [...SRV.match(re)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(vie(/app\.get\((\[[^\]]+\]), \(req, res\) => \{\n    const id = campagnaDi\(req\);/), ID.map((id) => '/' + id), 'una pagina per ogni campagna, e nessun\'altra');
  assert.deepEqual(vie(/app\.post\((\[[^\]]+\]), \(req, res\) => \{\n    const id = campagnaDi\(req\);/), ID.map((id) => `/${id}/prendi`), 'e un tasto per ognuna');
  assert.match(SRV, /const campagnaDi = \(req\) => String\(req\.path\.split\('\/'\)\[1\] \|\| ''\)\.toLowerCase\(\);/, 'Express non bada alle maiuscole: il nome si rilegge in minuscolo');
  for (const id of ID) {
    assert.match(VET, new RegExp(`'/${id}'`), `/${id} fra le porte aperte a chi e' senza sessione`);
    assert.match(VET, new RegExp(`'/${id}/prendi'`), `/${id}/prendi anche: senza sessione rimanda alla pagina`);
  }
});

test('entrare dalla pagina riporta alla pagina, e solo a una campagna vera', () => {
  const segna = pezzo('function segnaCampagna(req) {', 200);
  assert.match(segna, /if \(campagne\.eCampagna\(req\.query\?\.campagna\) && req\.session\) req\.session\.campagna = req\.query\.campagna;/);
  const torna = pezzo('function tornaAllaCampagna(req) {', 250);
  assert.match(torna, /delete req\.session\.campagna;\n    return campagne\.eCampagna\(c\) \? '\/' \+ c : '';/, 'si usa una volta, e non e\' un rimando qualsiasi');
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
