// LE LINGUE DELLA PAGINA INIZIALE: un indirizzo per lingua, la testa nella
// lingua della pagina, e dati strutturati che dicono quello che la pagina
// mostra. Il modello sta in docs/LINGUE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guscioVetrina, indirizzoHome, VIA_LINGUA, META_VETRINA, LINGUE, SITO } from '../../src/web/vetrina-vista.js';

const leggi = (via) => readFileSync(new URL(`../../${via}`, import.meta.url), 'utf8');
const INDEX = leggi('src/web/public/index.html');
const SERVER = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');
const SITO_PROVE = leggi('scripts/_sito.mjs');

const PIANI = {
  free: { id: 'free', nome: 'Essenziale', prezzo: 0 },
  base: { id: 'base', nome: 'Base', prezzo: 2.99 },
  addon: [{ id: 'giochi', nome: 'Giochi & Classifiche', prezzo: 2.79 }, { id: 'voce', nome: 'Comandi Vocali', prezzo: 0.99 }],
  bundle: [{ id: 'tutto', nome: 'Tutto', prezzo: 3.99, prezzoPieno: 5, sconto: 0.2, addon: ['giochi', 'voce'] }],
};
const pagina = (l) => guscioVetrina(INDEX, l, { piani: PIANI });
const grafoDi = (h) => JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
const ENTITA = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const piano = (h) => h.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39);/g, (e) => ENTITA[e]).replace(/\s+/g, ' ').trim();

test('un indirizzo per lingua, e i vecchi rimandano a quello giusto', () => {
  const casi = [
    ['/', '', 'it', null], ['/en', '', 'en', null], ['/es', '', 'es', null], ['/index.html', '', 'it', null],
    ['/', '?lang=en', 'en', '/en'], ['/', '?lang=es', 'es', '/es'], ['/', '?lang=it', 'it', '/'],
    ['/', '?lang=fr', 'it', '/'], ['/en/', '', 'en', '/en'], ['/es/', '', 'es', '/es'],
    ['/', '?lang=en&utm_source=x', 'en', '/en?utm_source=x'], ['/en', '?lang=es', 'en', '/en'],
  ];
  for (const [p, q, lingua, rimanda] of casi) assert.deepEqual(indirizzoHome(p, q), { lingua, rimanda }, p + q);
  assert.equal(indirizzoHome('/guide'), null, 'solo la pagina iniziale');
  assert.deepEqual(VIA_LINGUA, { it: '/', en: '/en', es: '/es' });
});

test('il server e il sito dei collaudi seguono la stessa regola', () => {
  assert.match(SERVER, /app\.get\(\['\/', '\/index\.html', '\/en', '\/es', '\/en\/', '\/es\/'\], serviGuscio\);/);
  assert.match(SERVER, /const dove = indirizzoHome\(req\.path, cerca\);/);
  assert.match(SERVER, /if \(dove\.rimanda\) return res\.redirect\(301, dove\.rimanda\);/);
  assert.match(SITO_PROVE, /const dove = indirizzoHome\(q, via\.search\)/);
  assert.match(SITO_PROVE, /return guscioVetrina\(base, lingua, \{ kick, youtube, piani \}\);/, 'la stessa testa del server');
  assert.match(SERVER, /h = guscioVetrina\(h, codice, /);
  assert.match(SERVER, /const LINGUE_URL = Object\.fromEntries\(Object\.entries\(VIA_LINGUA\)/, 'la sitemap dagli stessi indirizzi');
});

test('il pannello legge la lingua anche dall\'indirizzo, e cambiandola non lo lascia a dire il contrario', () => {
  assert.match(APP, /const VIA_LINGUA = \{ it: '\/', en: '\/en', es: '\/es' \};/);
  assert.match(APP, /const dallIndirizzo = \{ '\/en': 'en', '\/es': 'es' \}\[location\.pathname\];/);
  assert.ok(APP.indexOf('const dallIndirizzo') < APP.indexOf("localStorage.getItem('lingua')"), 'l\'indirizzo vince sulla lingua ricordata');
  assert.match(APP, /  LINGUA = l;\n  indirizzoInLingua\(l\);/);
});

test('la testa e\' nella lingua della pagina', () => {
  for (const l of LINGUE) {
    const h = pagina(l), m = META_VETRINA[l];
    assert.ok(h.includes(`<html lang="${l}">`), l);
    assert.ok(h.includes(`<title>${m.titolo}</title>`), `${l}: titolo`);
    assert.ok(h.includes(`<link rel="canonical" href="${SITO}${VIA_LINGUA[l]}">`), `${l}: canonical su se stessa`);
    assert.ok(h.includes(`<meta property="og:url" content="${SITO}${VIA_LINGUA[l]}">`), `${l}: og:url`);
    for (const campo of ['desc', 'ogTitolo', 'ogDesc', 'twTitolo', 'twDesc', 'immagineAlt']) {
      assert.ok(h.includes(`content="${m[campo]}"`), `${l}: ${campo}`);
      if (l !== 'it') assert.ok(!h.includes(`content="${META_VETRINA.it[campo]}"`), `${l}: ${campo} non e' rimasto in italiano`);
    }
    for (const [x, via] of Object.entries(VIA_LINGUA)) {
      assert.ok(h.includes(`<link rel="alternate" hreflang="${x}" href="${SITO}${via}">`), `${l}: alternativa ${x}`);
    }
    assert.ok(!h.includes('?lang='), `${l}: nessun indirizzo vecchio`);
  }
});

test('la demo si apre nella lingua della pagina', () => {
  assert.ok(pagina('it').includes('href="/?demo=1"'));
  assert.ok(pagina('en').includes('href="/?demo=1&amp;lang=en"'));
  assert.ok(pagina('es').includes('href="/?demo=1&amp;lang=es"'));
  assert.ok(!pagina('en').includes('href="/?demo=1"'), 'nessuna demo senza lingua nella pagina inglese');
});

test('i dati strutturati dicono quello che la pagina mostra, nella sua lingua', () => {
  assert.ok(!INDEX.includes('application/ld+json'), 'niente dati scritti a mano nel guscio');
  for (const l of LINGUE) {
    const h = pagina(l);
    const grafo = grafoDi(h);
    const m = META_VETRINA[l];
    const app = grafo.find((x) => x['@type'] === 'SoftwareApplication');
    const faq = grafo.find((x) => x['@type'] === 'FAQPage');
    const web = grafo.find((x) => x['@type'] === 'WebPage');
    assert.equal(web.inLanguage, m.inLanguage, l);
    assert.equal(web.url, `${SITO}${VIA_LINGUA[l]}`, l);
    assert.equal(typeof app.inLanguage, 'string', `${l}: una lingua sola, non due chiavi uguali`);
    assert.equal(app.inLanguage, m.inLanguage, l);
    assert.equal(app.description, m.desc, l);

    const sezione = h.slice(h.indexOf('<div class="vt-faq">'), h.indexOf('</div>', h.indexOf('<div class="vt-faq">')));
    const visibili = [...sezione.matchAll(/<summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p>/g)].map(([, q, a]) => [piano(q), piano(a)]);
    assert.ok(visibili.length >= 3, `${l}: la sezione delle domande c'e'`);
    assert.deepEqual(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), visibili, `${l}: le domande sono quelle della pagina, parola per parola`);

    const funzioni = [...h.matchAll(/<div class="cap-testo"><strong>([\s\S]*?)<\/strong>/g)].map(([, t]) => piano(t));
    assert.deepEqual(app.featureList, funzioni, `${l}: le funzioni sono quelle di «Cosa c'e' dentro»`);

    const [ess, base] = app.offers;
    assert.equal(ess.price, 0);
    assert.equal(base.price, 2.99);
    assert.deepEqual(base.addOn.map((o) => o.price), [3.99, 2.79, 0.99], `${l}: i pacchetti e gli extra del listino`);
    assert.ok(h.includes('€2,99') && h.includes('+€2,79') && h.includes('+€3,99'), `${l}: gli stessi prezzi sono scritti nella pagina`);
    for (const o of app.offers) assert.equal(o.url, `${SITO}${VIA_LINGUA[l]}#listino`);
    assert.ok(h.includes('id="listino"'), 'l\'ancora del listino esiste');
  }
  const senzaListino = grafoDi(guscioVetrina(INDEX, 'it', {})).find((x) => x['@type'] === 'SoftwareApplication');
  assert.equal(senzaListino.offers, undefined, 'senza listino nella pagina, niente prezzi nei dati');
});
