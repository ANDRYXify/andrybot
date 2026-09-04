// IL CSS LIBERO DELLA PAGINA LINK non deve poter uscire dal suo recinto.
//
// La pagina link è pubblica: la aprono sconosciuti. Il CSS che ci si scrive
// dentro finisce dritto in un tag <style>, e da lì tre cose smettono di essere
// stile: `</style` (si esce dal tag e si scrive HTML), `@import` (si tira
// dentro un foglio di un altro sito, che può tirarne altri), e le vecchie vie
// d'esecuzione (`javascript:`, `expression(`).
//
// La parte che conta davvero, e che una prova ingenua non vede: un filtro che
// TOGLIE deve arrivare a un PUNTO FERMO. `</sty</stylele>` non contiene
// `</style`, ma togliendo quello che sta in mezzo i due monconi si ricompongono
// e ne esce uno intero. Una passata sola non basta, e chi la scrive non se ne
// accorge finché qualcuno non ci prova.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cssPaginaSicuro } from '../../src/db.js';

const CATTIVO = /<\s*\/\s*style|@import|javascript\s*:|expression\s*\(/i;

test('quello che smette di essere stile non passa', () => {
  const prove = [
    '@import url("https://esterno.example/x.css");',
    "@import 'x.css';",
    '.a{background:url(javascript:alert(1))}',
    '.a{width:expression(alert(1))}',
    'x</style><script>alert(1)</script>',
    'x</ style >',
    'x</\tSTYLE',
  ];
  for (const p of prove) assert.ok(!CATTIVO.test(cssPaginaSicuro(p)), `passa ancora: ${p}`);
});

test('e non passa nemmeno costruito a strati, che è il modo vero di provarci', () => {
  const strati = [
    'x</sty</stylele><script>alert(1)</script>',
    '@im@import;port url(https://esterno.example/x.css);',
    'a{b:javajavascript:script:c}',
    'a{b:expexpression(ression(1)}',
  ];
  for (const p of strati) assert.ok(!CATTIVO.test(cssPaginaSicuro(p)), `si ricompone: ${p}`);
});

test('il CSS onesto arriva intatto, se no la manopola non serve a niente', () => {
  const buono = '.voce{border-radius:0;letter-spacing:.06em;color:var(--acc)}\nh1{text-shadow:3px 3px 0 var(--acc)}';
  assert.equal(cssPaginaSicuro(buono), buono);
});

test('un’immagine di un altro sito resta ammessa, come già lo è nel resto della pagina', () => {
  // Vietarla qui e permetterla nella copertina e nella foto profilo sarebbe una
  // regola che non protegge niente e in cambio confonde chi la incontra.
  const con = '.a{background:url(https://immagini.example/i.png)}';
  assert.equal(cssPaginaSicuro(con), con);
});

test('non si accetta un testo senza fine', () => {
  assert.ok(cssPaginaSicuro('a'.repeat(20000)).length <= 8000);
});

test('e chi insiste a strati oltre ogni misura si porta via tutto', () => {
  // venti passate sono tante per un CSS vero (si ferma alla prima o alla
  // seconda) e poche per uno costruito apposta: quello si butta intero.
  const assurdo = '@im'.repeat(60) + '@import;' + 'port;'.repeat(60);
  const r = cssPaginaSicuro(assurdo);
  assert.ok(!CATTIVO.test(r));
});

// E il giro completo: il CSS scritto nella scheda deve ARRIVARE nella pagina
// servita, per ultimo — se arrivasse prima non vincerebbe su niente e la
// manopola sarebbe una bugia — e arrivarci gia' ripulito.
test('il CSS tuo arriva nella pagina, per ultimo e ripulito', async () => {
  const { renderLinkPage } = await import('../../src/features/linkpagina.js');
  const html = renderLinkPage(
    { attiva: true, titolo: 'Prova', blocchi: [{ tipo: 'link', label: 'A', url: 'https://a.example' }],
      tema: { css: '@import url(https://esterno.example/x.css);.voce{letter-spacing:.06em}' } },
    { login: 'x', display: 'X', avatar: '', baseUrl: 'http://x' },
  );
  const stile = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  assert.ok(stile.includes('.voce{letter-spacing:.06em}'), 'il CSS scritto non arriva');
  assert.ok(!stile.includes('@import'), 'l’@import arriva lo stesso');
  // per ultimo: dopo di lui non c'e' piu' nostro CSS che possa rivincere
  assert.ok(stile.indexOf('.voce{letter-spacing:.06em}') > stile.lastIndexOf('.voce{display:flex'),
    'il CSS tuo non e’ in fondo, quindi non vince');
});

// Le manopole nuove non devono cambiare NIENTE finche' non le tocchi: una
// pagina gia' pubblicata non puo' cambiare aspetto da sola perche' e' uscito
// un aggiornamento.
test('i valori di partenza ripetono la pagina di prima', async () => {
  const { renderLinkPage } = await import('../../src/features/linkpagina.js');
  const p = { attiva: true, titolo: 'P', blocchi: [{ tipo: 'link', label: 'A', url: 'https://a.example' }] };
  const html = renderLinkPage({ ...p, tema: {} }, { login: 'x', display: 'X', avatar: '', baseUrl: 'http://x' });
  assert.ok(html.includes('--pf:800') && html.includes('--pm:700') && html.includes('--pn:600') && html.includes('--pt:450'),
    'i pesi di partenza non sono quelli di prima');
  assert.ok(html.includes('font-size:100%'), 'la grandezza di partenza non e’ 100%');
  assert.ok(html.includes('--ih:1.5'), 'l’interlinea di partenza non e’ 1.5');
  assert.ok(html.includes('--sp:calc(.6rem * 1)'), 'la spaziatura di partenza non e’ quella di prima');
  assert.ok(!html.includes('--bw:'), 'lo spessore del bordo non deve essere imposto se non lo scegli');
});
