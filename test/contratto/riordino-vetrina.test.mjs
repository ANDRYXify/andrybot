// LA TUA VETRINA, RIORDINATA. Quattro lavori diversi, ognuno nel suo posto:
// farti trovare (le pagine), dire quando sei in onda (la settimana), collegare i
// social, annunciare. Prima «Avvisi» mescolava gli ultimi due in sotto-schede
// che ripetevano gli stessi riquadri, e il tasto di Instagram stava al terzo
// posto sotto un riquadro che diceva il contrario. Il ragionamento sta in
// docs/LA-TUA-VETRINA.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');
const funzione = (nome) => {
  const i = APP.indexOf(`\nfunction ${nome}(`);
  assert.ok(i >= 0, `manca ${nome}`);
  return APP.slice(i, APP.indexOf('\n}\n', i) + 2);
};
const carte = (corpo) => [...corpo.matchAll(/<div class="carta"[^>]*>\s*<h2>(.*?)<\/h2>/g)].map((m) => (/L\('([^']*)'/.exec(m[1]) || [, m[1]])[1]);

test('I tuoi social: gli account stanno in cima, e da li\' si collega tutto', () => {
  const p = funzione('pannelloNotifiche');
  const titoli = carte(p);
  assert.equal(titoli[0], 'I tuoi account', 'il primo riquadro');
  const account = p.slice(p.indexOf('id="social-account"'), p.indexOf('<div class="carta">', p.indexOf('id="social-account"')));
  for (const id of ['ig-collega-box', 'tiktok-post-box', 'inp-yt-canale']) assert.ok(account.includes(`id="${id}"`), `${id} fra gli account`);
  assert.match(APP, /\['notifiche', 'I tuoi social'\]/, 'e la scheda si chiama per quello che contiene');
});

test('niente sotto-schede, niente riquadri ripetuti, niente riquadri che sono solo un rimando', () => {
  const sotto = APP.slice(APP.indexOf('const SOTTO_SCHEDE = {'), APP.indexOf('function sottoScelta'));
  assert.ok(!/notifiche:/.test(sotto), 'i social non si dividono in sotto-schede');
  const p = funzione('pannelloNotifiche');
  const titoli = carte(p);
  assert.equal(new Set(titoli).size, titoli.length, 'ogni riquadro una volta');
  assert.ok(!p.includes('data-rete='), 'nessun riquadro legato a una sotto-scheda');
  assert.ok(!titoli.includes('Discord') && !titoli.includes('Promo social in chat'), 'Discord e la promo non sono riquadri degli annunci');
  assert.deepEqual(titoli, ['I tuoi account', 'Nuovo post su Instagram', 'Nuovo video su TikTok', 'Diretta su TikTok', 'Nuovo video su YouTube', 'Altri siti']);
});

test('il riquadro dei feed non dice piu\' che Instagram non si puo\' collegare', () => {
  assert.ok(!/modo stabile|ponti di terzi/.test(APP), 'era vero prima del tasto: sopra il tasto vero diceva il contrario');
});

test('la promo social sta con la personalita\', e si salva con lei', () => {
  const pers = funzione('pannelloPersonalita');
  assert.ok(pers.includes('id="chk-promo"'), 'accanto a «si fa vivo da solo»');
  assert.match(APP, /proattivoSoloLive: document\.getElementById\('chk-proattivo-live'\)\.checked,\n\s+promoSocial: document\.getElementById\('chk-promo'\)\.checked,/);
  assert.ok(!APP.includes('btn-salva-promo'), 'e non ha piu\' un salvataggio suo in un\'altra scheda');
});

test('la diretta in prima pagina sta accanto alla pagina link, non in Stato', () => {
  assert.ok(funzione('pannelloPaginaLink').includes('id="chk-vetrina-live"'));
  assert.ok(!funzione('pannelloStato').includes('chk-vetrina-live'));
  assert.match(APP, /if \(id === 'pagina'\) \{ caricaPaginaLink\(false, 'link'\); collegaVetrinaLive\(\); \}/);
  assert.ok(!/La tua diretta sulla home/.test(APP), 'e «home» era gergo');
});

test('«Apri tutto» dove i riquadri sono tanti, e «Come funziona» aperto la prima volta', () => {
  assert.match(funzione('barraCarteHtml'), /querySelectorAll\(':scope > \.carta'\)\.length < CARTE_PER_BARRA\) return '';/);
  const g = funzione('guidaSchedaHtml');
  assert.match(g, /localStorage\.getItem\('guida-vista:' \+ id\) === '1'\) aperta = false;/, 'dalla seconda volta resta chiusa');
  assert.match(g, /if \(v === '0'\) aperta = false;\n\s+else if \(v === '1'\) aperta = true;/, 'e la scelta di chi la apre o la chiude vince sempre');
});
