// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// DA STREAMELEMENTS (docs/PONTE.md, «Da StreamElements»), i fili letti nel
// codice: quello che un browser vero non può mostrare.
//  · la rotta del server legge il canale della SESSIONE, non uno della
//    richiesta; i punti solo il proprietario; passa dallo stesso cuore del
//    testo incollato; applica solo se l'impronta è quella che si è vista;
//  · nessuna rotta riceve la chiave di StreamElements: il server non ha un
//    campo per lei;
//  · nel pannello la chiave va solo a StreamElements: il campo si svuota prima
//    di chiedere, le richieste partono senza credenziali né cache né
//    referrer, niente archivio del browser, e la variabile si cancella.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const SE = leggi('src/features/streamelements.js');

const tratto = (testo, da, fine) => {
  const i = testo.indexOf(da);
  assert.ok(i >= 0, `c'e' ${da}`);
  const j = testo.indexOf(fine, i + da.length);
  return testo.slice(i, j < 0 ? undefined : j);
};

test('la rotta: il canale della sessione, i punti del proprietario, lo stesso cuore, l\'impronta', () => {
  const r = tratto(SRV, "app.post('/api/streamer/comandi/importa/streamelements', requireLogin,", '\n  }));');
  assert.match(r, /const login = currentUser\(req\)\.login;/);
  assert.match(r, /streamelements\.leggi\(\{ login, twitchId: streamers\.get\(login\)\?\.user_id, punti: isOwner\(req\) \}\)/);
  assert.match(r, /String\(req\.body\?\.firma \|\| ''\) !== r\.firma/, 'si applica solo quello che si è visto');
  assert.match(r, /return importaTesto\(req, res, login, r\.testo, \{ streamelements: se, cambiato \}, \{ applica: !!req\.body\?\.applica && !cambiato \}\);/);
  assert.match(r, /_seInCorso\.delete\(login\)/, 'una lettura per canale alla volta, e il posto si libera sempre');
  // dalla richiesta arrivano solo cambio, applica, da rivedere e impronta
  const campi = [...r.matchAll(/req\.(body|query|params|headers)\??\.(\w+)/g)].map((m) => `${m[1]}.${m[2]}`);
  assert.deepEqual([...new Set(campi)].sort(), ['body.applica', 'body.firma']);
  const cuore = tratto(SRV, 'async function importaTesto(', '\n  }\n');
  assert.deepEqual([...new Set([...cuore.matchAll(/req\.(body|query|params|headers)\??\.(\w+)/g)].map((m) => `${m[1]}.${m[2]}`))].sort(),
    ['body.applica', 'body.includiDaRivedere', 'body.tasso']);
});

test('nessuna rotta dell\'import riceve la chiave di StreamElements', () => {
  // la rotta del testo incollato prende il testo e basta (il resto lo legge
  // il cuore, controllato sopra): nessun posto per una chiave
  const testo = tratto(SRV, "app.post('/api/streamer/comandi/importa', requireLogin,", '\n  }));');
  assert.deepEqual([...new Set([...testo.matchAll(/req\.(body|query|params|headers)\??\.(\w+)/g)].map((m) => `${m[1]}.${m[2]}`))], ['body.testo']);
  assert.doesNotMatch(SRV, /api\.streamelements\.com/, 'il server parla con StreamElements solo da streamelements.js');
  assert.match(SE, /headers: \{ accept: 'application\/json' \}/, 'e da lì senza chiavi');
  assert.doesNotMatch(SE, /authorization|cookie|Bearer/i);
});

test('nel pannello la chiave va solo a StreamElements, e se ne va subito', () => {
  const f = tratto(APP, 'async function leggiConChiaveSE() {', '\n  }\n');
  const svuota = f.indexOf("if (campo) campo.value = '';");
  assert.ok(svuota > 0 && svuota < f.indexOf('fetch('), 'il campo si svuota prima di chiedere');
  assert.match(f, /await fetch\(SE_API \+ via, \{/);
  assert.match(APP, /const SE_API = 'https:\/\/api\.streamelements\.com\/kappa\/v2';/);
  assert.match(f, /credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer'/);
  assert.equal(f.split('fetch(').length, 2, 'una sola strada verso fuori');
  assert.doesNotMatch(f, /\bapi\(|localStorage|sessionStorage|document\.cookie|indexedDB|location|history\./, 'la chiave non va al nostro server, né in un archivio');
  const dopoUltima = f.indexOf("chiave = '';", f.indexOf('/bot/timers/'));
  assert.ok(dopoUltima > 0 && dopoUltima < f.indexOf('await vediImport()'), 'la chiave si cancella appena finite le chiamate a StreamElements');
  assert.match(f, /finally \{\s*chiave = '';/, 'e comunque, anche se qualcosa va storto');
  // il campo non si salva da sé
  const campo = /<input type="password" id="imp-se-chiave"[^>]*>/.exec(APP)?.[0] || '';
  assert.match(campo, /autocomplete="off"/);
  assert.match(campo, /spellcheck="false"/);
  assert.doesNotMatch(campo, /\bname=/, 'senza nome: nessun modulo lo manda da nessuna parte');
});
