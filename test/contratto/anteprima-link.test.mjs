// L'ANTEPRIMA DEL LINK, PEZZO PER PEZZO: la pagina dice l'immagine giusta a
// Telegram e agli altri (la carta, altrimenti copertina o faccia), le rotte
// pubbliche e quelle del proprietario esistono coi loro guardiani, e il
// pannello la mostra e la manda allo stesso editor delle locandine.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { renderLinkPage, accentoDi } from '../../src/features/linkpagina.js';
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

test('le rotte: due pubbliche per le chat, quattro del proprietario, una cache che si rifa\' quando serve', () => {
  assert.ok(SRV.includes("app.get('/u/:user/anteprima.png', rottaCartaPagina('link'));") && SRV.includes("app.get('/u/:user/anteprima-dona.png', rottaCartaPagina('dona'));"));
  assert.match(PORTE, /\['GET \/u\/:user\/anteprima\.png', /); assert.match(PORTE, /\['GET \/u\/:user\/anteprima-dona\.png', /);
  for (const v of ['get', 'put', 'delete']) assert.ok(SRV.includes(`app.${v}('/api/paginacarta', requireOwner,`), v);
  assert.ok(SRV.includes("app.get('/api/paginacarta.png', requireOwner,"));
  assert.ok(SRV.includes("if (!p || !p.attiva) return notFound(res);\n    const png = await pngCartaPagina(login, quale);"), 'una pagina spenta non ha anteprima');
  assert.ok(SRV.includes("const chiave = `${dati.ts}|${mia?.ts || 0}|${dati.avatar.length}|${dati.accento}`;"), 'la cache sa quando la carta e\' vecchia');
  assert.ok(SRV.includes("cartePagina.set(login, quale, req.body.carta ? cartaLive.normCarta(req.body.carta) : null);"), 'si salva quello che il server ha ripulito');
  assert.ok(SRV.includes("set('Cache-Control', 'public, max-age=3600')"), 'le chat la tengono un\'ora');
  assert.equal((SRV.match(/immagineAnteprima: immagineAnteprimaDi\(login, '(link|dona)'\)/g) || []).length, 2, 'tutte e due le pagine la scrivono');
  assert.ok(SRV.includes("const immagineAnteprimaDi = (login, quale) => (cartaLive.disegnabile() ?"), 'solo se il server sa disegnarla');
});

test('il pannello: il riquadro nell\'editor della pagina, lo stesso editor delle locandine col suo titolo', () => {
  assert.ok(APP.includes('<div id="lp-carta-box">') && APP.includes("await api('/api/paginacarta?quale=' + (LP.quale === 'dona' ? 'dona' : 'link'))"));
  assert.ok(APP.includes("const mod = await import('/carta-editor.js');\n      mod.apri({ ..._cartaPagina, titolo:"), 'lo stesso editor, col titolo dell\'anteprima');
  assert.ok(APP.includes('id="lp-carta-standard"') && APP.includes("{ method: 'DELETE' }"), 'si torna a quella standard');
  assert.ok(leggi('src/web/public/carta-editor.js').includes("esc(stato.titolo || L('Editor della locandina'"), 'l\'editor prende il titolo da chi lo apre');
  assert.ok(APP.includes("F['/api/paginacarta'] = cartaPag('link');"), 'anche in demo (che legge la via senza la domanda)');
});
