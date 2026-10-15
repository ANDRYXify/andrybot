// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// AGGIORNARE SENZA PERDERE NIENTE: LA VERSIONE (docs/AGGIORNARE.md).
//
// Una pagina aperta sa di essere vecchia solo se la versione del server e'
// una proprieta' dei file serviti, non un numero scritto a mano. Qui si prova
// che la versione cambia se e solo se cambia qualcosa che una pagina puo'
// avere caricato, che il server la dice dove deve (e solo a chi puo'
// saperla), e che ogni pagina che resta aperta la ascolta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaImpronte } from '../../src/web/impronte.js';
import { RISORSE_VETRINA } from '../../src/web/vetrina-vista.js';

const radice = mkdtempSync(join(tmpdir(), 'andrybot-versione-'));
mkdirSync(join(radice, 'js'), { recursive: true });
writeFileSync(join(radice, 'app.js'), 'a\n');
writeFileSync(join(radice, 'js', 'modulo.js'), 'b\n');
process.on('exit', () => { try { rmSync(radice, { recursive: true, force: true }); } catch { /* niente */ } });

const PUB = new URL('../../src/web/public/', import.meta.url).pathname;
const SERVER = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');

test('la versione cambia se e solo se cambia un file servito, anche in una sottocartella, o un modulo composto', () => {
  const i = creaImpronte(radice);
  const v0 = i.versione(['regole']);
  assert.match(v0, /^[0-9a-f]{12}$/);
  assert.equal(i.versione(['regole']), v0, 'niente cambiato, stessa versione');
  writeFileSync(join(radice, 'js', 'modulo.js'), 'c\n');
  const v1 = i.versione(['regole']);
  assert.notEqual(v1, v0, 'un modulo importato dalla pagina conta');
  writeFileSync(join(radice, 'nuovo.css'), 'x\n');
  assert.notEqual(i.versione(['regole']), v1, 'un file nuovo conta');
  const v2 = i.versione(['regole']);
  assert.notEqual(i.versione(['regole cambiate']), v2, 'un modulo composto dal server conta');
});

test('il server dice la versione su ogni risposta, ma dopo il cancello', () => {
  const cancello = SERVER.indexOf("if (currentUser(req) || guscio.aperto(req.path)) return next();");
  const testa = SERVER.indexOf("res.set('Server-Timing', `sbv;desc=\"${versioneSito()}\"`)");
  const statici = SERVER.indexOf('montaStatici(app, publicDir');
  assert.ok(cancello > 0 && testa > cancello, 'chi non bussa a una porta aperta non sa nemmeno quale versione gira');
  assert.ok(statici > testa, 'i file e le pagine escono gia\' con la versione');
  assert.match(SERVER, /app\.get\('\/api\/versione', requireLogin, /);
  assert.match(SERVER, /app\.get\('\/api\/cam\/versione', /, 'il telefono-fotocamera una sessione non ce l\'ha');
  assert.match(SERVER, /app\.get\('\/overlay\/:login\/versione', \(req, res\) => \{\n\s*if \(!chiaveOk\(req\)\) return notFound\(res\);\n\s*conVersione\(res, \{ live: inOnda\.inOnda\(req\.params\.login\) \}\);/, 'le fonti di OBS con la chiave del canale, e sanno se e\' in onda');
  assert.match(SERVER, /const conVersione = \(res, extra = \{\}\) => res\.set\('Cache-Control', 'no-store'\)/);
});

test('una diretta dallo Studio si rifiuta col segnale di riavvio nello stesso giro in cui nascerebbe', () => {
  assert.match(SERVER, /if \(inOnda\.riavvioImminente\(\) && !tramite\.attiva\(sessioneDi\(login, f\)\)\) return res\.status\(503\)[^\n]*\n\s*const r = tramite\.avvia\(/, 'subito prima di tramite.avvia, dopo ogni attesa');
  assert.match(SERVER, /creaTramite\(\{ bandaMbps: config\.direttaBandaMbps, log, alCambio: \(\) => inOnda\.cambiato\(\) \}\);\n[\s\S]{0,400}inOnda\.fonte\('studio', \(\) => tramite\.canali\(\)\);\n\s*inOnda\.dimenticaRiavvio\(\);/);
});

test('ogni pagina che resta aperta ascolta la versione, e prima dei flussi', () => {
  const pagine = readdirSync(PUB).filter((f) => f.endsWith('.html'));
  const conFlusso = pagine.filter((f) => /<script src="\/?flusso\.js"/.test(readFileSync(join(PUB, f), 'utf8')));
  assert.ok(conFlusso.length >= 5, conFlusso.join(', '));
  for (const f of [...new Set([...conFlusso, 'voce.html'])]) {
    const h = readFileSync(join(PUB, f), 'utf8');
    const v = h.search(/<script src="\/?versione\.js"/);
    const fl = h.search(/<script src="\/?flusso\.js"/);
    assert.ok(v >= 0, `${f} carica versione.js`);
    if (fl >= 0) assert.ok(v < fl, `${f}: versione.js prima di flusso.js, che la chiama a ogni ritorno`);
  }
  for (const f of ['overlay.html', 'tracking-overlay.html', 'tracking-play.html', 'tracking-detector.html']) {
    assert.match(readFileSync(join(PUB, f), 'utf8'), /<script src="\/versione\.js" data-modo="schermo"><\/script>/, `${f} e\' una fonte di OBS: mai riquadri, mai in diretta`);
  }
  assert.ok(!RISORSE_VETRINA.includes('versione.js'), 'la vetrina e\' un volantino: non si aggiorna da sola');
  const flusso = readFileSync(join(PUB, 'flusso.js'), 'utf8');
  assert.match(flusso, /if \(tornato && window\.SB_VERSIONE\) \{ try \{ window\.SB_VERSIONE\.controlla\(\); \} catch \(e\) \{\} \}/, 'un flusso che torna dopo una caduta (un riavvio lo e\' sempre) chiede la versione');
});
