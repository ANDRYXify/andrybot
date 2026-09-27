// IL PANNELLO DELLA PAGINA LINK DICE QUELLO CHE LA PAGINA FA.
// Un massimo, un valore di base, un'etichetta: se il pannello ne ha uno suo e il
// server un altro, la differenza non la vede nessuno finche' una riga sparisce
// al salvataggio o la pagina esce diversa da come il pannello la mostrava.
// Qui ogni numero e ogni valore di base si legge da un posto solo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-pagina-link-pannello-');
const { linkPage, LIMITI_LINKPAGE } = await import('../../src/db.js');
const { renderLinkPage } = await import('../../src/features/linkpagina.js');
test.after(() => usaEGetta.pulisci());

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const APP = leggi('src/web/public/app.js');
const SRV = leggi('src/web/server.js');
const tratto = (testo, da, a) => { const i = testo.indexOf(da); assert.ok(i >= 0, `manca ${da}`); const j = testo.indexOf(a, i + da.length); return testo.slice(i, j > i ? j : i + 4000); };

test('i pezzi fatti di righe tengono quante righe dice il limite, per tipo', () => {
  const righe = (n, f) => Array.from({ length: n }, (_, k) => f(k));
  const p = linkPage.pulisci({ blocchi: [
    { tipo: 'social', voci: righe(20, (k) => ({ url: `https://x.com/a${k}` })) },
    { tipo: 'griglia', voci: righe(20, (k) => ({ titolo: `t${k}` })) },
    { tipo: 'numeri', voci: righe(20, (k) => ({ n: String(k), etichetta: 'e' })) },
    { tipo: 'faq', voci: righe(20, (k) => ({ d: `d${k}`, r: 'r' })) },
  ] });
  for (const b of p.blocchi) {
    assert.equal(b.voci.length, LIMITI_LINKPAGE.voci[b.tipo], `«${b.tipo}»: il server ne tiene un numero diverso dal limite che manda al pannello`);
  }
  assert.equal(LIMITI_LINKPAGE.voci.numeri, 6, 'i numeri sono fino a 6, come dice il manuale');
});

test('il pannello aggiunge righe fino al limite del server, e poi il tasto si spegne', () => {
  const clic = tratto(APP, 'function lpClicBlocchi(', '\nfunction ');
  assert.ok(!/voci\.length\s*<\s*\d/.test(clic), 'un massimo scritto a mano nel pannello');
  assert.match(clic, /if \(!lpVociPiene\(b\)\) b\.voci\.push\(\{ \.\.\.vuota \}\);/);
  // le due funzioni del pannello, eseguite con i limiti veri del server
  const fz = APP.slice(APP.indexOf('const lpVociMax = '), APP.indexOf('\n', APP.indexOf('const lpVociPiene = ')));
  // eslint-disable-next-line no-new-func
  const { lpVociPiene } = new Function('LP', `${fz}; return { lpVociPiene };`)({ d: { limiti: LIMITI_LINKPAGE } });
  for (const [tipo, max] of Object.entries(LIMITI_LINKPAGE.voci)) {
    assert.equal(lpVociPiene({ tipo, voci: new Array(max - 1).fill({}) }), false, `«${tipo}»: sotto il limite si aggiunge`);
    assert.equal(lpVociPiene({ tipo, voci: new Array(max).fill({}) }), true, `«${tipo}»: al limite il tasto si ferma`);
  }
  const blocchi = tratto(APP, 'function lpRenderBlocchi(', '\nfunction ');
  const tasti = [...blocchi.matchAll(/data-lpsoc="piu" data-lpb="\$\{i\}"([^>]*)>/g)];
  assert.equal(tasti.length, Object.keys(LIMITI_LINKPAGE.voci).length, 'un tasto «Aggiungi» per ogni pezzo fatto di righe');
  for (const t of tasti) assert.equal(t[1], "${lpVociPiene(b) ? ' disabled' : ''}", 'ogni «Aggiungi» si spegne al limite');
});

test('l\'altezza di un riquadro ha un massimo solo: cursore, pulizia e pagina', () => {
  assert.equal(LIMITI_LINKPAGE.altezzaEmbed, 900, 'il manuale dice da 0 a 900 px');
  const blocchi = tratto(APP, 'function lpRenderBlocchi(', '\nfunction ');
  assert.match(blocchi, /data-lpf="altezza" min="0" max="\$\{d\.limiti\.altezzaEmbed\}"/, 'il cursore legge il limite del server');
  const emb = linkPage.pulisci({ blocchi: [{ tipo: 'embed', url: 'https://youtu.be/abc', altezza: 5000 }] }).blocchi[0];
  assert.equal(emb.altezza, LIMITI_LINKPAGE.altezzaEmbed, 'la pulizia si ferma allo stesso numero');
  const html = renderLinkPage({ tema: {}, blocchi: [{ tipo: 'embed', url: 'https://youtu.be/abc', altezza: 5000 }] },
    { login: 'prova', display: 'Prova', baseUrl: 'https://socialbot.live' });
  assert.match(html, new RegExp(`height:${LIMITI_LINKPAGE.altezzaEmbed}px`), 'e la pagina anche');
  assert.ok(SRV.includes('limiti: LIMITI_LINKPAGE,') && SRV.includes('tipi: TIPI_BLOCCO, limiti: LIMITI_LINKPAGE,'), 'i limiti arrivano al pannello con tutte e due le pagine');
});

test('la prova del pannello ha gli stessi limiti del server', () => {
  const i = APP.indexOf("'/api/linkpage': {");
  const riga = APP.slice(APP.indexOf('limiti: {', i) + 'limiti: '.length, APP.indexOf('\n', APP.indexOf('limiti: {', i)) - 1);
  // eslint-disable-next-line no-new-func
  assert.deepEqual(new Function(`return ${riga}`)(), LIMITI_LINKPAGE);
});

// ── Il tema: il pannello mostra quello che la pagina usa ─────────────────────
// Un menu' che non trova il suo valore resta sulla prima voce: era cosi' che il
// pannello diceva «Fermo», «Leggero» e «Nessuna» mentre la pagina usciva
// «Dolce», «Marcato» e «Morbida».

const BASE = linkPage.pulisci({}).tema;
const menuDelTema = () => {
  const carica = tratto(APP, 'async function caricaPaginaLink(', '\n}\n');
  return [...carica.matchAll(/<select[^>]*data-lpk="([a-zA-Z]+)"/g)].map((m) => m[1]);
};
const TEMI_PRONTI = (() => {
  const i = APP.indexOf('const TEMI_PRONTI = [');
  const testo = APP.slice(i + 'const TEMI_PRONTI = '.length, APP.indexOf('\n];', i) + 2);
  const t = APP.slice(APP.indexOf('const _tema = ('), APP.indexOf('const TEMI_PRONTI'));
  // eslint-disable-next-line no-new-func
  return new Function(`${t} return ${testo}`)();
})();

test('ogni menu dell\'aspetto ha il suo valore di base, e le tre voci sono quelle della pagina', () => {
  const menu = menuDelTema();
  assert.ok(menu.length >= 10, `menu trovati: ${menu.length}`);
  for (const k of ['movimento', 'peso', 'ombraTipo']) assert.ok(menu.includes(k), `manca il menu «${k}»`);
  for (const k of menu) assert.ok(BASE[k] !== undefined, `il menu «${k}» non ha un valore di base: mostrerebbe la prima voce`);
  assert.deepEqual([BASE.movimento, BASE.peso, BASE.ombraTipo], ['dolce', 'marcato', 'morbida']);
  assert.deepEqual(linkPage.conDefault('nuova', 'Nuova').tema, BASE, 'una pagina nuova parte dalla base');
});

test('una pagina salvata prima di un comando lo legge col valore di base, e l\'ombra dal vecchio interruttore', async () => {
  const { db } = await import('../../src/db.js');
  linkPage.salva('vecchia', { headline: 'x', blocchi: [] });
  db.prepare('UPDATE link_page SET tema=? WHERE channel=?').run(JSON.stringify({ ombra: false, accent: '#ff0000' }), 'vecchia');
  const t = linkPage.get('vecchia').tema;
  assert.deepEqual([t.movimento, t.peso, t.ombraTipo, t.accent], ['dolce', 'marcato', 'nessuna', '#ff0000']);
  for (const k of menuDelTema()) assert.ok(t[k] !== undefined, `«${k}» manca nel tema che arriva al pannello`);
  db.prepare('UPDATE link_page SET tema=? WHERE channel=?').run(JSON.stringify({ accent: '#ff0000' }), 'vecchia');
  assert.equal(linkPage.get('vecchia').tema.ombraTipo, 'morbida', 'l\'ombra accesa di allora e\' quella morbida');
  linkPage.rimuovi('vecchia');
});

test('un tema pronto parte dalla base del server, e il pannello mostra quello che la pagina usera\'', () => {
  const suTema = tratto(APP, 'const suTema = (ev) => {', '\n  };');
  assert.match(suTema, /LP\.tema = \{ \.\.\.\(LP\.d\?\.temaBase \|\| \{\}\), \.\.\.tema\.tema, _pronto: tema\.id \};/);
  assert.match(tratto(SRV, "app.get('/api/linkpage', requireOwner", '}));'), /temaBase: linkPage\.pulisci\(\{\}\)\.tema,/);
  assert.match(tratto(SRV, "app.get('/api/paginadona', requireOwner", '}));'), /temaBase: paginaDona\.pulisci\(\{\}\)\.tema,/);
  for (const t of TEMI_PRONTI) {
    assert.ok(t.tema.ombra !== false, `«${t.nome}»: l'ombra spenta si dice con ombraTipo: 'nessuna', non col vecchio interruttore`);
    const messo = { ...BASE, ...t.tema };
    const pagina = linkPage.pulisci({ tema: messo }).tema;
    for (const k of menuDelTema()) assert.ok(messo[k] !== undefined, `«${t.nome}»: il menu «${k}» resterebbe sulla prima voce`);
    for (const k of ['movimento', 'peso', 'ombraTipo']) assert.equal(messo[k], pagina[k], `«${t.nome}»: il pannello mostra «${messo[k]}», la pagina usa «${pagina[k]}»`);
  }
});

test('la prova del pannello parte dalla stessa base', () => {
  const i = APP.indexOf('const _DEMO_TEMA_BASE = ');
  // eslint-disable-next-line no-new-func
  const demo = new Function(`return ${APP.slice(i + 'const _DEMO_TEMA_BASE = '.length, APP.indexOf('};', i) + 1)}`)();
  assert.deepEqual(demo, BASE);
});
