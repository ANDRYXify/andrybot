// UN MODO SOLO DI APRIRE UN FLUSSO, e un battito che si vede.
//
// Un EventSource nudo muore per sempre al primo 502 di un riavvio dietro il
// proxy (misurato: scripts/verifica-flusso.mjs). Percio' nessuna pagina apre un
// EventSource per conto suo: passa da flusso.js, che riapre, rilegge, e sente
// il battito. E il battito del server agli overlay e' un evento, perche' un
// commento SSE la pagina non lo vede.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = join(RAD, 'src/web/public');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

const casa = cartellaUsaEGetta('andrybot-flusso-');
const { EffectsEngine } = await import('../../src/features/effects.js');
test.after(() => casa.pulisci());

test('il battito agli overlay e\' un evento con un tipo, al tracking un commento', () => {
  const e = new EffectsEngine();
  const ovl = [], trk = [];
  e.addClient('canale', { write: (s) => ovl.push(s) });
  e.addTrkClient('canale', { write: (s) => trk.push(s) });
  e.ping();
  assert.deepEqual(ovl, ['data: {"tipo":"battito"}\n\n'], 'l\'overlay riceve un evento che puo\' riconoscere');
  assert.deepEqual(trk, [': ping\n\n'], 'il tracking riceve il commento di sempre');
  e.ping();
  assert.equal(ovl.length, 2, 'un battito per chiamata, non di piu\'');
});

test('ogni pagina che apre un flusso carica flusso.js prima della sua app', () => {
  for (const [pagina, app] of [['overlay.html', 'overlay-app.js'], ['tracking-play.html', 'tracking-play.js'],
    ['tracking-overlay.html', 'tracking-overlay.js'], ['tracking-detector.html', 'tracking-overlay.js'], ['index.html', 'app.js']]) {
    const h = leggi('src/web/public/' + pagina);
    const iFlusso = h.search(/<script src="\/?flusso\.js"/);
    const iApp = h.search(new RegExp('<script src="/?' + app.replace('.', '\\.') + '"'));
    assert.ok(iFlusso >= 0, `${pagina} carica flusso.js`);
    assert.ok(iApp >= 0, `${pagina} carica ${app}`);
    assert.ok(iFlusso < iApp, `${pagina}: flusso.js viene prima di ${app}`);
  }
});

test('nessuna pagina apre un EventSource per conto suo', () => {
  for (const f of readdirSync(PUB).filter((n) => n.endsWith('.js') && n !== 'flusso.js')) {
    const s = readFileSync(join(PUB, f), 'utf8');
    assert.ok(!/new EventSource\(/.test(s), `${f} apre un EventSource nudo: al primo 502 morirebbe per sempre`);
  }
  assert.ok(/new EventSource\(url\)/.test(leggi('src/web/public/flusso.js')), 'flusso.js e\' l\'unico a farlo');
});

test('l\'overlay ignora il battito, riapre da solo e al ritorno rilegge il tema', () => {
  const o = leggi('src/web/public/overlay-app.js');
  assert.ok(/dati\.tipo === 'battito'\) return/.test(o), 'il battito non e\' un evento da mostrare');
  assert.ok(/SB_FLUSSO\.apri\(urlStream,\s*\{[^}]*silenzio:\s*75000/.test(o), 'il flusso dell\'overlay ha un silenzio ammesso');
  assert.ok(/suRitorno: \(n\) => \{ caricaTema\(\);/.test(o), 'al ritorno rilegge il tema');
  assert.ok(/suCaduta: \(\) => guaio\('flusso-caduto'/.test(o), 'una caduta si racconta al server');
});

test('il ponte della regia manda un battito visibile e la pagina lo aspetta', () => {
  const s = leggi('src/web/server.js');
  assert.ok(/const battito = setInterval\([^\n]*'data: \{"tipo":"battito"\}\\n\\n'[^\n]*, 15000\);/.test(s), 'il server manda un evento ogni 15 s');
  const a = leggi('src/web/public/app.js');
  assert.ok(/SB_FLUSSO\.apri\('\/api\/streamer\/regia\/ponte',\s*\{\s*silenzio:\s*75000/.test(a), 'il pannello aspetta il battito');
  assert.ok(/d\.tipo !== 'regia' \|\| !d\.passo\) return/.test(a), 'e ignora quello che non e\' un passo di regia');
});
