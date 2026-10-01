// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA PAGINA DEL NEGOZIO, COME E' CABLATA (docs/NEGOZIO.md, «La pagina»).
//
// Le prove di unita' (test/unita/negozio-pagina.test.mjs) provano le funzioni;
// qui si fissa che le porte del server usino proprio quelle, e nel modo giusto:
//  · la pagina servita e' quella salvata (nessuna copia di mezzo), e quello che
//    il pannello manda e' quello che lo store salva;
//  · il canale viene SOLO dall'indirizzo per chi guarda e SOLO dalla sessione
//    per chi modifica: mai dal corpo o dalla domanda di una richiesta;
//  · la pagina «non c'e'» parla la lingua del browser, non quella del canale;
//  · l'indirizzo corto porta al negozio di QUEL canale, e la radice al sito;
//  · il pannello monta lo stesso editor delle altre pagine, nella scheda Negozio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
// Solo le righe di commento: un «/*» dentro una stringa del server farebbe
// sparire mezzo file a chi togliesse anche i blocchi.
const senzaCommenti = (t) => t.replace(/^\s*\/\/.*$/gm, '');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');
const SRV = senzaCommenti(leggi('src/web/server.js'));
const APP = leggi('src/web/public/app.js');
const PAG = senzaCommenti(leggi('src/features/negozio-pagina.js'));
const tratto = (testo, da, a) => {
  const i = testo.indexOf(da);
  assert.ok(i >= 0, `manca ${da}`);
  const j = typeof a === 'number' ? i + a : testo.indexOf(a, i + da.length);
  return testo.slice(i, j < 0 ? undefined : j);
};

test('la pagina servita e\' quella salvata, del canale dell\'indirizzo', () => {
  const r = tratto(SRV, "app.get('/u/:user/negozio', wrap(", "app.get('/u/:user/negozio/media/:id'");
  assert.match(r, /const login = String\(req\.params\.user \|\| ''\)\.toLowerCase\(\);/);
  assert.match(r, /negozioPagina\.htmlPaginaNegozio\(login, \{\n\s*display: s\.display \|\| login, avatar: await avatarDi\(login\), baseUrl: config\.baseUrl,\n\s*immagineAnteprima: immagineAnteprimaDi\(login, 'negozio'\),\n\s*\}\)/,
    'nessuna pagina passata da fuori: legge quella salvata (paginaDi)');
  assert.ok(!/req\.(body|query)/.test(r), 'niente arriva dalla domanda');
  assert.match(r, /res\.status\(404\)\.set\('Vary', 'Accept-Language'\)/, 'chi non trova il negozio riceve un 404, che dipende dalla lingua del browser');
  assert.match(r, /paginaNonCe\(negozioPagina\.linguaDiChiApre\(req\.get\('accept-language'\)\), config\.baseUrl\)/);
  assert.ok(!/linguaChat/.test(r), 'mai la lingua del canale: direbbe se il canale esiste');
  assert.match(PAG, /export function paginaDi\(canale, display\) \{\n\s*const ch = String\(canale \|\| ''\)\.toLowerCase\(\);\n\s*const p = paginaNegozio\.get\(ch\);\n\s*if \(p\) return aspettoDi\(p, linkPage\.get\(ch\)\);/,
    'la pagina salvata, con l\'aspetto della SUA pagina link');
});

test('la porta delle immagini chiede al negozio, col canale e il media insieme', () => {
  const r = tratto(SRV, "app.get('/u/:user/negozio/media/:id'", 400);
  assert.match(r, /const m = negozioPagina\.mediaPubblico\(req\.params\.user, req\.params\.id\);\n\s*if \(!m\) return notFound\(res\);/);
  assert.match(r, /res\.sendFile\(join\(effectsRoot, m\.channel, m\.file\)/, 'il file e la cartella vengono da mediaPubblico, non dall\'indirizzo');
  const mp = tratto(PAG, 'export function mediaPubblico(', '\n}\n');
  assert.match(mp, /e\.channel !== ch/, 'il media e\' del canale dell\'indirizzo');
  assert.match(mp, /inVetrina\(ch, ora\)\.some\(\(a\) => a\.immagine === `effetto:\$\{e\.comando\}`\)/, 'e lo usa un articolo in vetrina');
  assert.match(mp, /!aperto\(ch\)/, 'a negozio aperto');
});

test('chi modifica la pagina e\' il proprietario, e quello che manda e\' quello che si salva', () => {
  for (const r of ["app.get('/api/paginanegozio', requireOwner,", "app.post('/api/paginanegozio', requireOwner,", "app.post('/api/paginanegozio/anteprima', requireOwner,"]) assert.ok(SRV.includes(r), r);
  const blocco = tratto(SRV, "app.get('/api/paginanegozio', requireOwner,", "app.get('/api/paginacarta', requireOwner,");
  assert.ok(!/req\.(body|query|params)\??\.(login|channel|canale|user)/.test(blocco), 'il canale non arriva mai dalla richiesta');
  assert.equal((blocco.match(/const login = currentUser\(req\)\.login;/g) || []).length, 3, 'ogni porta lo prende dalla sessione');
  assert.match(blocco, /paginaNegozio\.salva\(login, \{\n\s*headline: b\.headline, tagline: b\.tagline, template: b\.template, avatar: b\.avatar, tema: b\.tema,\n\s*blocchi: b\.blocchi, attiva: true, aspetto: aspettoNegozioInArrivo\(login, b\.aspetto\),/);
  assert.match(blocco, /htmlAnteprima\('negozio', b, \{[^}]*aspetto: aspettoNegozioInArrivo\(login, b\.aspetto\), link: linkPage\.get\(login\),\n\s*negozio: negozioPagina\.opzioniNegozio\(login, /,
    'l\'anteprima riceve la scelta dell\'aspetto e i pezzi del negozio di quel canale');
  assert.match(leggi('src/web/anteprima-pagine.js'), /aspettoDi\(paginaNegozio\.pulisci\(\{ \.\.\.testo, aspetto: c\.aspetto \}\), c\.link\)/,
    'e passa dalla stessa pulizia del salvataggio');
  const salva = tratto(APP, "document.getElementById('lp-salva').onclick", 600);
  assert.match(salva, /headline: LP\.testa\.headline, tagline: LP\.testa\.tagline, template: LP\.testa\.template,/);
  assert.match(salva, /tema: LP\.tema, blocchi: LP\.blocchi/);
});

test('l\'indirizzo corto e\' il negozio di quel canale, e la radice e\' il sito', () => {
  const m = tratto(SRV, 'if (config.negozioHost && String(req.hostname', 700);
  assert.match(m, /if \(legaleIn\('privacy'\)\.some\(\(x\) => x\.via === req\.path\)\) return next\(\);/, 'l\'informativa e\' un indirizzo, non un canale');
  assert.match(m, /const d = RE_CANALE_IN_VIA\.exec\(req\.path\);/);
  assert.match(m, /req\.url = '\/u\/' \+ d\[1\]\.toLowerCase\(\) \+ '\/negozio'/);
  assert.match(m, /if \(req\.path === '\/'\) return res\.redirect\(302, config\.baseUrl \+ '\/'\);/, 'senza un canale non si elencano negozi');
  assert.ok(leggi('src/config.js').includes("negozioHostSpento: /^(no|off)$/i.test(env('NEGOZIO_HOST', ''))"));
  assert.match(SRV, /sondaHost\(!config\.negozioHost && !config\.negozioHostSpento \? donazioni\.candidatoHost\(config\.baseUrl, 'negozio'\) : '',/);
  assert.match(leggi('Caddyfile'), /^socialbot\.live,[^{]*\bnegozio\.socialbot\.live\b[^{]*\{/m, 'Caddy conosce il nome');
  assert.match(leggi('src/features/negozio.js'), /return config\.negozioHost \? `https:\/\/\$\{config\.negozioHost\}\/\$\{ch\}` : `\$\{config\.baseUrl\}\/u\/\$\{ch\}\/negozio`;/, 'l\'indirizzo si scrive in un posto solo');
});

test('la pagina ha il suo script, e chi non e\' dentro lo puo\' scaricare', () => {
  assert.ok(SRV.includes("guscio.risorsa('pagina-negozio.js');"), 'chi apre la pagina non ha una sessione');
  const js = leggi('src/web/public/pagina-negozio.js');
  assert.match(js, /navigator\.clipboard\.writeText\(testo\)/);
  assert.ok(leggi('src/features/linkpagina.js').includes('<script src="/pagina-negozio.js?v=1" defer></script>'));
});

test('il pannello: lo stesso editor delle altre pagine, nella scheda Negozio', () => {
  assert.ok(APP.includes("['pagina', ['La pagina del negozio', 'The shop page', 'La página de la tienda']]"), 'una parte sua nella scheda');
  const pannelloNeg = APP.slice(APP.indexOf("return pannello('negozio', `"), APP.indexOf('\n}\n', APP.indexOf("return pannello('negozio', `")));
  assert.ok(pannelloNeg.includes("${lpCasaHtml('negozio')}"), 'la casa dell\'editor, nella scheda Negozio');
  assert.ok(APP.includes("if (id === 'negozio') { caricaNegozio(); caricaPaginaLink(false, 'negozio');"), 'e li\' si apre');
  assert.ok(APP.includes("${LP.quale === 'negozio' ? lpAggiungiNegozioHtml() :"), 'coi pezzi del negozio');
  assert.ok(APP.includes('id="neg-url-copia"') && APP.includes('id="neg-url-apri"'), 'l\'indirizzo con «Copia» e «Apri»');
  for (const t of ['intestazione', 'vetrina', 'articoli', 'comecompra', 'piede']) assert.ok(new RegExp(`${t}: \\{ tipo: '${t}'`).test(APP), `un ${t} nuovo nasce coi suoi valori`);
});

test('il manuale racconta la pagina con le etichette vere del pannello', async () => {
  const { MANUALI } = await import('../../src/web/manuali.js');
  const { sezioneManuale } = await import('../aiuto.mjs');
  const sez = sezioneManuale(MANUALI, 'negozio');
  for (const eti of ['La pagina del negozio', 'Articolo in vetrina', 'Il più comprato (cambia da solo)', 'Griglia degli articoli', 'Come si compra', 'Piede coi link', 'Uguale alla pagina link', 'Tutto suo', 'Salva e pubblica', 'Quando condividi il link']) {
    assert.ok(APP.includes(eti), `«${eti}» e' un'etichetta vera del pannello`);
    assert.ok(sez.includes(`«${eti}»`), `e il manuale la cita com'e': «${eti}»`);
  }
});
