// L'ASPETTO DELLA PAGINA LINK SULLA PAGINA DELLE DONAZIONI (docs/DONAZIONI.md).
// Una funzione sola decide con che aspetto si mostra la pagina delle
// donazioni: se una sola delle strade che la mostrano la saltasse, la pagina
// avrebbe un aspetto e la sua informativa, la sua anteprima o l'anteprima del
// pannello un altro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const tratto = (testo, da, n) => { const i = testo.indexOf(da); assert.ok(i >= 0, `manca ${da}`); return testo.slice(i, i + n); };

test('ogni strada che mostra la pagina delle donazioni passa da aspettoDi', () => {
  assert.match(tratto(SRV, "app.get('/dona/:login', wrap(", 1400), /renderLinkPage\(aspettoDi\(p, link\),/, 'la pagina');
  assert.match(tratto(SRV, "app.get('/dona/:user/privacy'", 900), /pagina: aspettoDi\(p, linkPage\.get\(login\)\)/, 'la sua informativa');
  assert.match(tratto(SRV, 'async function datiCartaPagina(', 500), /quale === 'dona' \? aspettoDi\(paginaDona\.conDefault\(login, display\), linkPage\.get\(login\)\)/, 'l\'immagine dell\'anteprima del link');
  assert.match(tratto(SRV, "app.post('/api/paginadona/anteprima'", 700), /const finta = aspettoDi\(paginaDona\.pulisci\(/, 'l\'anteprima del pannello');
  const viste = [...SRV.matchAll(/renderLinkPage\(([^,]+),/g)].map((m) => m[1]);
  assert.ok(viste.every((v) => !/paginaDona/.test(v)), 'nessuno stampa la pagina delle donazioni direttamente dallo store');
});

test('la scelta arriva, e un salvataggio che non la dice tiene quella che c\'era', () => {
  assert.match(SRV, /const aspettoInArrivo = \(login, v\) => \(v === 'link' \|\| v === 'suo' \? v : paginaDona\.conDefault\(login\)\.aspetto\);/);
  assert.match(tratto(SRV, "app.post('/api/paginadona', requireOwner", 700), /aspetto: aspettoInArrivo\(login, b\.aspetto\),/);
  assert.match(tratto(SRV, "app.post('/api/paginadona/anteprima'", 700), /aspetto: aspettoInArrivo\(login, b\.aspetto\)/);
  const get = tratto(SRV, "app.get('/api/paginadona', requireOwner", 1600);
  assert.ok(get.includes('aspettoLink: link ? { template: link.template, tema: link.tema } : null,') && get.includes('aspetto: p.aspetto,'), 'il pannello sa la scelta e da dove viene l\'aspetto');
  const salva = tratto(APP, "document.getElementById('lp-salva').onclick", 400);
  const ante = tratto(APP, "const r = await api(lpApi() + '/anteprima'", 400);
  for (const [nome, t] of [['salvando', salva], ['in anteprima', ante]]) assert.ok(t.includes('aspetto: LP.aspetto || undefined'), `il pannello la manda ${nome}`);
});

test('l\'editor ha un solo padrone del clic, e si ridisegna dove eri', () => {
  const i = APP.indexOf('async function caricaPaginaLink(');
  const carica = APP.slice(i, APP.indexOf("document.getElementById('lp-salva').onclick", i));
  assert.ok(!carica.includes("box.addEventListener('click'"), 'un ascoltatore aggiunto a ogni disegno si somma ai precedenti');
  assert.match(carica, /box\.onclick = \(ev\) => \{ for \(const f of \[lpClicBlocchi, [^\]]+\]\) f\(ev\); \};/, 'e i comandi dei blocchi passano dallo stesso');
  const blocchi = APP.slice(APP.indexOf('function lpRenderBlocchi('), APP.indexOf('function lpClicBlocchi('));
  assert.ok(!/\.onclick = /.test(blocchi.replace(/cont\.on\w+ = /g, '')), 'chi disegna i blocchi non si prende il clic della scatola');
  assert.match(carica, /lpApriSchede\(box\);\n  lpSegue\(box\);/, 'le schede aperte e la scelta dell\'aspetto si rimettono a ogni disegno');
});
