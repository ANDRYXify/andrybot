// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ANTEPRIMA DEL LINK, PEZZO PER PEZZO: la pagina dice l'immagine giusta a
// Telegram e agli altri (la carta, altrimenti copertina o faccia), le rotte
// pubbliche e quelle del proprietario esistono coi loro guardiani, e il
// pannello la mostra e la manda allo stesso editor delle locandine.
// LE PAGINE SONO UN ELENCO SOLO (le chiavi di TEMI_PAGINA): database, server,
// rotte, dichiarazioni delle porte e pannello hanno le stesse, nessuna esclusa.
// E' cosi' che la porta del gruppo Telegram era rimasta senza.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderLinkPage, accentoDi } from '../../src/features/linkpagina.js';
import { NOMI_TEMI_PAGINA } from '../../src/features/carta-disegno.js';
const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
// L'icona del sito col suo timbro, quello unico di tutte le icone: si legge dal
// manifest, non si scrive qui (verifica-risorse tiene il timbro uno solo).
const ICONA = JSON.parse(leggi('src/web/public/manifest.webmanifest')).icons.find((i) => i.src.startsWith('/icons/icon-192.png')).src;
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const PORTE = leggi('scripts/verifica-porte.mjs');

test('la pagina dice l\'immagine giusta: la carta, altrimenti la copertina, altrimenti la faccia', () => {
  const opz = { login: 'x', display: 'X', baseUrl: 'https://s.live', avatar: 'https://a/b.png' };
  const con = renderLinkPage({ attiva: true, blocchi: [], tema: {} }, { ...opz, immagineAnteprima: 'https://s.live/u/x/anteprima.png' });
  assert.ok(con.includes('<meta property="og:image" content="https://s.live/u/x/anteprima.png">') && con.includes('<meta name="twitter:card" content="summary_large_image">'));
  const cop = renderLinkPage({ attiva: true, blocchi: [{ tipo: 'eroe', img: 'https://c/cop.jpg' }], tema: {} }, opz);
  assert.ok(cop.includes('<meta property="og:image" content="https://c/cop.jpg">') && cop.includes('summary_large_image'));
  const faccia = renderLinkPage({ attiva: true, blocchi: [], tema: {} }, opz);
  assert.ok(faccia.includes('<meta property="og:image" content="https://s.live/u/x/avatar">') && faccia.includes('<meta name="twitter:card" content="summary">'));
  assert.ok(!renderLinkPage({ attiva: true, blocchi: [], tema: {} }, { ...opz, immagineAnteprima: 'javascript:x' }).includes('javascript:'), 'un indirizzo che non e\' un indirizzo non entra');
});

test('l\'icona della scheda e\' la foto della pagina, e senza foto quella del sito', () => {
  const opz = { login: 'x', display: 'X', baseUrl: 'https://s.live', avatar: 'https://a/b.png' };
  const icone = (html) => [...html.matchAll(/<link rel="(icon|apple-touch-icon)" href="([^"]*)">/g)].map((m) => m[1] + ' ' + m[2]);
  assert.deepEqual(icone(renderLinkPage({ attiva: true, blocchi: [], tema: {} }, opz)),
    ['icon https://s.live/u/x/avatar', 'apple-touch-icon https://s.live/u/x/avatar'], 'la foto di Twitch, dalla nostra origine');
  assert.deepEqual(icone(renderLinkPage({ attiva: true, avatar: 'https://s.live/u/x/img/lp_logo.png', blocchi: [], tema: {} }, opz)),
    ['icon https://s.live/u/x/img/lp_logo.png', 'apple-touch-icon https://s.live/u/x/img/lp_logo.png'], 'la foto caricata, quando c\'e\'');
  assert.deepEqual(icone(renderLinkPage({ attiva: true, avatar: 'no', blocchi: [], tema: {} }, opz)),
    [`icon ${ICONA}`, `apple-touch-icon ${ICONA}`], 'chi non mostra nessuna foto tiene l\'icona del sito');
  assert.deepEqual(icone(renderLinkPage({ attiva: true, blocchi: [], tema: { avatarForma: 'nessuno' } }, opz)),
    [`icon ${ICONA}`, `apple-touch-icon ${ICONA}`]);
  assert.ok(!renderLinkPage({ attiva: true, avatar: 'javascript:alert(1)', blocchi: [], tema: {} }, opz).includes('href="javascript:'), 'un indirizzo che non e\' un indirizzo non diventa un\'icona');
});

test('il colore della pagina: quello del tema, sennò quello del preset', () => {
  assert.equal(accentoDi({ template: 'neon', tema: { accent: '#ff0000' } }), '#ff0000');
  assert.equal(accentoDi({ template: 'neon', tema: {} }), accentoDi({ template: 'neon' }));
  assert.match(accentoDi({}), /^#[0-9a-fA-F]{3,6}$/);
});

// Le righe di PAGINE_CARTA nel server: le chiavi della tabella, in ordine.
const tabella = (() => {
  const i = SRV.indexOf('const PAGINE_CARTA = {');
  assert.ok(i >= 0, 'il server ha la tabella delle pagine');
  const corpo = SRV.slice(i, SRV.indexOf('\n  };\n', i));
  return [...corpo.matchAll(/^ {4}(\w+): \{$/gm)].map((m) => m[1]);
})();
const pngDi = (q) => `/u/:user/anteprima${q === 'link' ? '' : '-' + q}.png`;

test('un elenco solo: temi, server e rotte hanno le stesse pagine', () => {
  assert.deepEqual(tabella, NOMI_TEMI_PAGINA, 'PAGINE_CARTA ha una riga per ogni tema, e nessuna in piu\'');
  assert.ok(SRV.includes("const qualePagina = (v) => (Object.hasOwn(PAGINE_CARTA, String(v || '')) ? String(v) : 'link');"), 'il server riconosce le pagine dalla tabella');
  for (const q of NOMI_TEMI_PAGINA) {
    assert.ok(SRV.includes(`app.get('${pngDi(q)}', rottaCartaPagina('${q}'));`), `${q}: la rotta dell'immagine`);
    assert.ok(PORTE.includes(`['GET ${pngDi(q)}', `), `${q}: la rotta e' dichiarata fra le porte`);
    assert.ok(SRV.includes(`immagineAnteprima: immagineAnteprimaDi(login, '${q}')`), `${q}: la pagina scrive la sua immagine`);
  }
});

test('le rotte: una pubblica per pagina per le chat, quattro del proprietario, una cache che si rifa\' quando serve', () => {
  for (const v of ['get', 'put', 'delete']) assert.ok(SRV.includes(`app.${v}('/api/paginacarta', requireOwner,`), v);
  assert.ok(SRV.includes("app.get('/api/paginacarta.png', requireOwner,"));
  assert.ok(SRV.includes("if (!PAGINE_CARTA[quale].aperta(login)) return notFound(res);\n    const png = await pngCartaPagina(login, quale);"), 'una pagina spenta non ha anteprima');
  assert.ok(SRV.includes("aperta: (l) => tgPorta.aperta(l),"), 'la porta ha l\'anteprima solo se e\' aperta');
  assert.ok(SRV.includes("const chiave = `${dati.ts}|${mia?.ts || 0}|${dati.avatar.length}|${dati.accento}`;"), 'la cache sa quando la carta e\' vecchia');
  assert.ok(SRV.includes("cartePagina.set(login, quale, req.body.carta ? cartaLive.normCarta(req.body.carta) : null);"), 'si salva quello che il server ha ripulito');
  assert.ok(SRV.includes("set('Cache-Control', 'public, max-age=3600')"), 'le chat la tengono un\'ora');
  assert.ok(SRV.includes("const immagineAnteprimaDi = (login, quale) => (cartaLive.disegnabile() ?"), 'solo se il server sa disegnarla');
});

test('il pannello: il riquadro nell\'editor della pagina, lo stesso editor delle locandine col suo titolo', () => {
  assert.ok(APP.includes('<div id="lp-carta-box">') && APP.includes("await api('/api/paginacarta?quale=' + LP.quale)"), 'la carta della pagina che si sta modificando');
  // il riquadro c'e' in ogni editor di pagina che si condivide: fuori solo le
  // pagine dei pannelli di Twitch, che si aprono dal pannello e non si mandano
  assert.ok(APP.includes("${LP.quale === 'pannello' ? '' : `<details class=\"carta sez\">\n          <summary><h3>${L('Quando condividi il link'"), 'fuori solo le pagine dei pannelli');
  assert.ok(APP.includes("const mod = await import('/carta-editor.js');\n      mod.apri({ ..._cartaPagina, titolo:"), 'lo stesso editor, col titolo dell\'anteprima');
  assert.ok(APP.includes('id="lp-carta-standard"') && APP.includes("{ method: 'DELETE' }"), 'si torna a quella standard');
  assert.ok(leggi('src/web/public/carta-editor.js').includes("esc(stato.titolo || L('Editor della locandina'"), 'l\'editor prende il titolo da chi lo apre');
  assert.ok(APP.includes("if (via === '/api/paginacarta') return Promise.resolve(_demoGet('/api/paginacarta?quale=' +"), 'anche in demo, la carta della pagina che si sta modificando');
  const demo = APP.slice(APP.indexOf('const PAG_DEMO = {'), APP.indexOf('\n  };\n', APP.indexOf('const PAG_DEMO = {')));
  assert.deepEqual([...demo.matchAll(/^ {4}(\w+): \['/gm)].map((m) => m[1]), NOMI_TEMI_PAGINA, 'la demo ha una carta per ogni pagina');
});
