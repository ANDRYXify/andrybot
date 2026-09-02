// IL GIRO GUIDATO NON PUO' PUNTARE AL NULLA.
//
// Un tutorial invecchia peggio di un manuale: indica un bottone che non c'e'
// piu' e chi lo segue conclude che il prodotto e' rotto. Per questo le tappe
// NON sono un elenco scritto a parte: si leggono dalla pagina nel momento in cui
// il giro parte, e le parole vengono da dove gia' stanno — la spiegazione della
// scheda e i titoli veri delle carte.
//
// Qui si controlla il contratto. Il comportamento vero (parte alla prima
// visita, si chiude cambiando scheda, la luce segue lo scorrimento) si misura
// in un browser: vedi docs/GIRO.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const fn = (nome) => {
  const i = APP.indexOf(`function ${nome}(`);
  assert.ok(i > 0, `c'è ${nome}`);
  return APP.slice(i, APP.indexOf('\n}', i));
};

test('le tappe si leggono dalla pagina, non da un elenco a parte', () => {
  const t = fn('tappeDi');
  assert.ok(t.includes("document.getElementById('scheda-' + id)"), 'guarda la scheda vera');
  assert.ok(t.includes("querySelectorAll(':scope > .carta')"), 'e le sue carte');
  assert.ok(t.includes('carta.offsetParent'), 'saltando quelle non visibili');
  assert.ok(t.includes("carta.querySelector('h2')"), 'il titolo è quello della carta');
});

test('le parole vengono da dove già stanno', () => {
  const t = fn('tappeDi');
  assert.ok(t.includes('GUIDE[id]'), 'la prima tappa è la spiegazione della scheda');
  assert.ok(t.includes('g.serve') && t.includes('g.come'), 'con la sua ricetta numerata');
  assert.ok(t.includes('aiutoDi(id)'), 'e l’ultima porta alla guida o al manuale');
});

test('una carta può dire la sua riga, ma non deve', () => {
  const t = fn('testoCarta');
  assert.ok(t.includes('carta.dataset.giro'), 'data-giro ha la precedenza');
  assert.ok(t.includes('querySelectorAll'), 'altrimenti si prende dal testo della carta');
});

test('si vede una volta, e si può rifare', () => {
  assert.match(APP, /const GIRO_MEMORIA = 'sb-giro'/, 'la memoria è locale');
  const p = fn('giroPossibile');
  assert.ok(p.includes('giroVisto(id)'), 'non ricomincia da solo');
  assert.ok(p.includes('_aiutoStriscia'), 'e non si accavalla con l’avviso della guida');
  assert.ok(p.includes('cookie-banner') && p.includes('benvenuto'), 'né col cookie o col benvenuto');
  assert.ok(APP.includes('data-rifai-giro'), 'dal «?» si rifà');
  assert.equal(APP.split('data-rifai-giro').length - 1, 3, 'in barra e nel cassetto, con un gestore solo');
});

test('non sopravvive a un cambio di scheda', () => {
  const r = fn('riavviaGiro');
  assert.ok(r.includes('if (_giro && _giro.id !== schedaAttiva) chiudiGiro(false)'),
    'le carte dell’altra scheda sono nascoste: la luce cadrebbe nel vuoto');
});

test('la luce insegue lo scorrimento invece di indovinare quando finisce', () => {
  assert.match(APP, /window\.addEventListener\('scroll', seguiGiro/, 'segue lo scorrimento');
  assert.ok(APP.includes('_giro.posiziona = posiziona'), 'riusando la stessa misura');
  assert.ok(!APP.includes('setTimeout(posiziona'), 'senza aspettare a occhio');
});

test('finire il giro conta come «so fare»', () => {
  const c = fn('chiudiGiro');
  assert.ok(c.includes("aiutoSegna(id, 'fatto', AIUTO_SA_FARE)"),
    'così l’avviso «c’è una guida» non arriva subito dopo');
});
