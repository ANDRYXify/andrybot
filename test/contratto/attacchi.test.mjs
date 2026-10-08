// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA SEZIONE «SCUDO E ATTACCHI» (docs/INCIDENTI.md, «Il rapporto dell'attacco»).
//
// Le porte sono del solo proprietario, e un attacco di un altro canale non si
// apre nemmeno conoscendone il numero. Il puntino lo vede solo chi puo' aprire
// la scheda. Il pannello mette le tre schede in un gruppo loro, apre
// l'attacco col suo rapporto, si accorge da solo di un attacco che arriva a
// pannello aperto, e la prova del sito ha un attacco da guardare.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const rotta = (inizio, n = 1500) => { const i = SRV.indexOf(inizio); assert.ok(i > 0, `c'e': ${inizio}`); return SRV.slice(i, i + n); };
const pezzo = (da, a) => { const i = APP.indexOf(da); const j = APP.indexOf(a, i + 1); assert.ok(i > 0 && j > i, `c'e': ${da}`); return APP.slice(i, j); };

const PORTE = [
  "app.get('/api/antibot/veglia', ",
  "app.get('/api/antibot/attacchi', ",
  "app.get('/api/antibot/attacchi/:id', ",
  "app.get('/api/antibot/attacchi/:id/coinvolti.csv', ",
  "app.post('/api/antibot/attacchi/visti', ",
  "app.post('/api/antibot/avvisi', ",
];

test('ogni porta degli attacchi e\' del solo proprietario', () => {
  for (const p of PORTE) assert.match(rotta(p, 200), /^app\.(get|post)\('[^']+', requireOwner, /, p);
});

test('un attacco di un altro canale non si apre, ne\' si scarica', () => {
  for (const p of ["app.get('/api/antibot/attacchi/:id', ", "app.get('/api/antibot/attacchi/:id/coinvolti.csv', "]) {
    assert.match(rotta(p, 400), /if \(!i \|\| i\.canale !== login\) return res\.status\(404\)/, p);
  }
});

test('la veglia sta prima della porta col numero, che altrimenti la prenderebbe', () => {
  const v = SRV.indexOf("app.get('/api/antibot/veglia', ");
  const n = SRV.indexOf("app.get('/api/antibot/attacchi/:id', ");
  assert.ok(v > 0 && n > 0);
  assert.doesNotMatch(SRV, /app\.get\('\/api\/antibot\/attacchi\/[a-z]+', /, 'nessuna parola sotto /attacchi/ che il numero si mangerebbe');
});

test('il puntino degli attacchi lo vede solo il proprietario', () => {
  assert.match(SRV, /attacchiNuovi: isOwner\(req\) \? attacchiNuovi\(user\.login\.toLowerCase\(\)\) : 0,/);
  const c = rotta('const attacchiNuovi = (login) => {', 500);
  assert.match(c, /i\.aperto > visti && almenoSoglia\(i\.picco\?\.livello, soglia\)/, 'solo gli attacchi alla soglia, nati dopo l\'ultima occhiata');
});

test('le scelte di avviso passano dal normalizzatore, e non toccano il resto dello scudo', () => {
  const r = rotta("app.post('/api/antibot/avvisi', ", 700);
  assert.match(r, /normalizzaAntibot\(vecchio, \{ avvisiScudo: req\.body\?\.avvisi \|\| \{\} \}\)/);
  assert.match(r, /antibot: \{ \.\.\.vecchio, avvisiScudo: antibot\.avvisiScudo \}/);
});

test('«Sblocca» disfa un blocco e si scrive nel registro', () => {
  const r = rotta("app.post('/api/antibot/azione', ", 2200);
  assert.match(r, /\['sbanna', 'sblocca'\]\.includes\(req\.body\?\.azione\)/);
  assert.match(r, /helix\.sbloccaUtente\(login, userId\)/);
  assert.match(r, /registraAntibot\(login, \{ login: nome, userId, azione: 'sblocca'/);
});

test('il menu: un gruppo suo con lo scudo, gli attacchi e il registro', () => {
  assert.match(APP, /\{ id: 'difesa', nome: 'Scudo e attacchi', schede: \[\n\s+\['scudo', 'Lo scudo'\],\n\s+\['attacchi', 'Gli attacchi'\],\n\s+\['registro', 'Registro'\],\n\s+\] \}/);
  assert.doesNotMatch(pezzo('const FAMIGLIE = [', '];'), /'scudo'|'registro'|id: 'moderazione'/, 'lo scudo non sta piu\' in un\'altra famiglia');
  assert.match(APP, /if \(id === 'attacchi'\) caricaAttacchi\(\);/);
  assert.match(APP, /: id === 'attacchi' && stato\?\.attacchiNuovi > 0/, 'il puntino');
});

test('aprire la scheda segna visti gli attacchi e spegne il puntino', () => {
  const c = pezzo('async function caricaAttacchi() {', 'function attDisegnaElenco()');
  assert.match(c, /api\('\/api\/antibot\/attacchi\/visti', \{ method: 'POST' \}\)\.then\(\(\) => \{ stato\.attacchiNuovi = 0; rinfrescaPuntino\('attacchi'\); \}\)/);
});

test('la veglia: solo il proprietario, non nella prova, ferma a scheda nascosta, e non rifa\' il rapporto sotto le dita', () => {
  const v = pezzo('function vegliaAttacchi() {', 'let _avvisatoRapporti');
  assert.match(v, /if \(_vegliaAttacchi \|\| DEMO \|\| stato\?\.user\?\.role !== 'proprietario'\) return;/);
  assert.match(v, /if \(document\.hidden\) \{ giro\(\); return; \}/);
  assert.match(v, /if \(qui && \(inCorso \|\| _vegliaInCorso \|\| n > prima\) && !_attOccupato\(\)\) caricaAttacchi\(\);/);
  assert.match(v, /if \(n > prima && !qui\) toast\(/);
  assert.match(APP, /  invitoRecensione\(\);\n  vegliaAttacchi\(\);\n\}/, 'parte all\'apertura del pannello, dopo il resto');
  const o = pezzo('function _attOccupato() {', 'function vegliaAttacchi()');
  assert.match(o, /bon-conferma-/, 'un numero di conferma scritto a meta\' non si cancella');
});

test('rinfrescare lo stesso attacco tiene filtri e ricerca, e non fa lampeggiare la carta', () => {
  const a = pezzo('async function attApri(', 'function attRapportoHtml(');
  assert.match(a, /const stesso = senzaScorrere && _attAperto === id && !!box\._dati;/);
  assert.match(a, /if \(!stesso\) _attCoinvolti = /);
  assert.match(a, /if \(!stesso\) box\.innerHTML = attesaHtml\(\);/);
});

test('le scelte di avviso non accendono la barra del salvataggio: si salvano da sole', () => {
  assert.match(APP, /<div id="att-avvisi" data-non-salva>/);
  assert.match(APP, /api\('\/api\/antibot\/avvisi', \{ method: 'POST', body: \{ avvisi \} \}\)/);
});

test('la bonifica ha un gestore solo, quello della scheda degli attacchi', () => {
  assert.equal((APP.match(/closest\('\[data-bonifica\]'\)/g) || []).length, 1);
  assert.doesNotMatch(APP, /function apriIncidente|function caricaIncidenti/, 'il vecchio elenco nel registro non c\'e\' piu\'');
});

test('la prova del sito ha gli attacchi, il rapporto, le scelte, e il CSV che non porta fuori', () => {
  assert.match(APP, /'\/api\/antibot\/attacchi': _demoAttacchi\(\),/);
  assert.match(APP, /\/\^\\\/api\\\/antibot\\\/attacchi\\\/INC-\[0-9-\]\+\$\/\.test\(via\)\) return Promise\.resolve\(_demoAttacco\(/);
  assert.match(APP, /if \(via === '\/api\/antibot\/avvisi'\) \{/);
  assert.match(APP, /if \(DEMO && ev\.target\.closest\('\[data-att-csv\]'\)\) \{ ev\.preventDefault\(\);/);
  assert.match(APP, /attacchiNuovi: 1,/, 'il puntino si vede anche nella prova');
});
