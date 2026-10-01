// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'ANTEPRIMA DELLE PAGINE, vera e della demo (src/web/anteprima-pagine.js,
// docs/DEMO.md).
//
// Le promesse:
//  · la demo mostra la pagina che mostrerebbe un canale vero con le stesse
//    cose: lo stesso HTML, per la pagina link, le donazioni e il negozio;
//  · nel negozio della demo non compare un articolo spento, nascosto, fuori
//    date, o che non si potrebbe salvare;
//  · quello che la demo manda passa dalle pulizie del salvataggio: un nome che
//    non e' un canale, un testo con dentro HTML, una lingua che non c'e';
//  · una pagina che non e' una delle tre non si rende.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('anteprima-pagine-');
const { streamers, linkPage } = await import('../../src/db.js');
const S = await import('../../src/features/negozio.js');
const P = await import('../../src/features/negozio-pagina.js');
const A = await import('../../src/web/anteprima-pagine.js');
test.after(() => casa.pulisci());

const BASE = 'https://socialbot.live';
const ORA = Date.UTC(2026, 9, 1, 12);
let giro = 0;
function canale(settings = {}) {
  const ch = `vetrina${++giro}`;
  streamers.upsertApproved(ch, ch.toUpperCase());
  streamers.setSettings(ch, { negozio: { attivo: true }, ...settings });
  return ch;
}
function articolo(ch, grezzo) {
  const r = S.salvaArticolo(ch, { tipo: 'oggetto', prezzo: 100, ...grezzo });
  assert.ok(r.ok, `articolo salvato: ${r.errore}`);
  return r.articolo;
}
const LINK = { template: 'neon', tema: { accent: '#ff00aa', bg: '#101820', font: 'serif' } };
const EDITOR = {
  headline: 'La bottega', tagline: 'Solo cose belle', template: 'minimal', avatar: '',
  tema: { accent: '#22aa66', bg: '#0b0b10' }, blocchi: P.PEZZI_DI_SERIE, aspetto: 'link',
};

// Il canale finto che la demo manderebbe per un canale vero: quello che il
// pannello ha in mano (vistaPannello per gli articoli, le impostazioni, la
// pagina link).
function comeLaDemo(ch, lingua) {
  const s = streamers.get(ch).settings;
  return {
    login: ch, display: ch.toUpperCase(), lingua,
    aspettoLink: linkPage.get(ch) ? { template: linkPage.get(ch).template, tema: linkPage.get(ch).tema } : null,
    donazioni: s.donazioni || null,
    moneta: { nomeMonete: s.nomeMonete, formaMonete: s.formaMonete },
    compra: S.vistaPannello(ch).comandi.compra,
    articoli: S.vistaPannello(ch).articoli,
  };
}

for (const lingua of ['it', 'en', 'es']) {
  test(`negozio (${lingua}): la demo rende la pagina che rende il canale vero`, () => {
    const ch = canale({ nomeMonete: 'Gemme', preferenze: { lingua } });
    linkPage.salva(ch, LINK);
    articolo(ch, { nome: 'Corona', requisiti: [{ tipo: 'mesi', soglia: 3 }], scorte: { modo: 'tutto', n: 4 } });
    articolo(ch, { nome: 'Spada', descrizione: 'Resta nella borsa.', scorte: { modo: 'persona', n: 1 }, quando: 'diretta' });
    articolo(ch, { nome: 'Fuori date', quando: 'date', dal: ORA - 2 * 86_400_000, al: ORA - 86_400_000 });
    articolo(ch, { nome: 'Spento', attivo: false });
    articolo(ch, { nome: 'Nascosto', siVede: 'chi_puo' });
    const vero = A.htmlAnteprima('negozio', EDITOR, {
      login: ch, display: ch.toUpperCase(), avatar: '', baseUrl: BASE, aspetto: 'link', link: linkPage.get(ch),
      negozio: P.opzioniDaDati(P.datiPagina(ch, { baseUrl: BASE, display: ch.toUpperCase(), ora: ORA, anteprima: true })),
    });
    const demo = A.anteprimaDemo({ quale: 'negozio', pagina: EDITOR, canale: comeLaDemo(ch, lingua) }, { baseUrl: BASE, ora: ORA });
    assert.equal(demo.html, vero);
    assert.match(demo.html, /Corona/);
    assert.match(demo.html, /Spada/);
    for (const via of ['Fuori date', 'Spento', 'Nascosto']) assert.doesNotMatch(demo.html, new RegExp(via), `${via} non e' in vetrina`);
  });
}

test('pagina link e donazioni: la demo rende la pagina che rende il canale vero', () => {
  const ch = canale({ donazioni: { attivo: true, modo: 'link', link: 'https://ko-fi.com/vetrina', importi: '3, 5, 10' } });
  linkPage.salva(ch, LINK);
  const editor = { ...EDITOR, blocchi: [{ tipo: 'link', label: 'Twitch', url: 'https://twitch.tv/vetrina' }, { tipo: 'sostieni', titolo: 'Offrimi un caffè' }] };
  for (const quale of ['link', 'dona']) {
    const vero = A.htmlAnteprima(quale, editor, {
      login: ch, display: ch.toUpperCase(), avatar: '', baseUrl: BASE, aspetto: 'link', link: linkPage.get(ch),
      settings: streamers.get(ch).settings, conti: {},
    });
    const demo = A.anteprimaDemo({ quale, pagina: editor, canale: comeLaDemo(ch, 'it') }, { baseUrl: BASE });
    assert.equal(demo.html, vero, quale);
    assert.match(demo.html, /ko-fi\.com\/vetrina/, `${quale}: il tasto delle donazioni c'e'`);
  }
});

test('quello che la demo manda passa dalle pulizie del salvataggio', () => {
  const c = A.canaleDemo({
    login: '../admin', display: '<b>Ciao</b>   come   va', lingua: 'xx',
    articoli: [
      { id: 1, nome: 'Buono', tipo: 'oggetto', prezzo: 50, venduti: 3 },
      { id: 2, nome: '', tipo: 'oggetto', prezzo: 50 },
      { id: 3, nome: 'Tipo inventato', tipo: 'bomba', prezzo: 50 },
      { nome: 'Senza numero', tipo: 'oggetto', prezzo: 50 },
    ],
    moneta: { nomeMonete: 'x'.repeat(80) },
    compra: 'compra e paga',
  });
  assert.equal(c.login, 'demo');
  assert.equal(c.lingua, 'it');
  assert.equal(c.display, '<b>Ciao</b> come va');
  assert.deepEqual(c.articoli.map((a) => a.nome), ['Buono']);
  assert.equal(c.venduti.get(1), 3);
  assert.equal(c.moneta.nome.length, 20);
  assert.equal(c.compra, 'compra');
  const { html } = A.anteprimaDemo({ quale: 'link', pagina: { headline: '<script>alert(1)</script>' }, canale: { display: '<img src=x onerror=alert(1)>' } });
  assert.doesNotMatch(html, /<script>alert|<img src=x/);
});

test('una pagina che non e\' una delle tre non si rende', () => {
  assert.deepEqual(A.anteprimaDemo({ quale: 'admin' }), { errore: 'quale' });
  assert.deepEqual(A.anteprimaDemo(null), { errore: 'quale' });
});
