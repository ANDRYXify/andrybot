// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
//
// LA CARTA «LE FRASI DEL BOT» (docs/VOCE.md, punto 3): dal pannello al disco.
// Il motore e le sue scelte stanno in test/unita/voce-canale.test.mjs; qui si
// guarda che i pezzi si parlino: la carta chiede i momenti al server, prova
// quello che c'e' sullo schermo, salva con le impostazioni, e il server ripulisce
// con la voce. Una carta che mostra una scelta che il server butta sarebbe una
// bugia detta col pannello.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOMENTI, GRUPPI } from '../../src/features/frasario/index.js';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');

const corpo = (testo, da, a) => {
  const i = testo.indexOf(da);
  assert.ok(i >= 0, `non trovo ${da}`);
  return testo.slice(i, a ? testo.indexOf(a, i + da.length) : undefined);
};

test('il server da\' i momenti a gruppi, con la scelta e le frasi di adesso', () => {
  const r = corpo(SRV, "app.get('/api/streamer/voce', requireLogin,", "app.post('/api/streamer/voce/prova'");
  assert.match(r, /linguaChat\(login\)/, 'la lingua da un posto solo');
  assert.match(r, /voce\.tonoDi\(s\)/, 'il tono della scheda Personalita\'');
  assert.match(r, /voce\.GRUPPI\.map/);
  assert.match(r, /voce\.sceltaDi\(s, id\)/, 'la scelta come la legge il motore, non come e\' scritta');
  assert.match(r, /dati: voce\.datiAmmessi\(id\)/);
  assert.match(r, /nostre: m\.frasi\?\.\[lingua\]\?\.\[tono\]/);
});

test('«Prova» guarda lo schermo e non consuma: anteprima, con la scelta ripulita', () => {
  const r = corpo(SRV, "app.post('/api/streamer/voce/prova', requireLogin,", "// LINEE GUIDA");
  assert.match(r, /voce\.normVoce\(/, 'quello che arriva dal pannello passa dal pulitore');
  assert.match(r, /voce\.anteprima\(login, id, m\.esempio, 3, \{ voce: scelta \}\)/);
  assert.doesNotMatch(r, /voce\.di\(/, 'provare non deve far avanzare il giro');
  assert.doesNotMatch(r, /setSettings/, 'e non salva niente');
});

test('si salva con le impostazioni, e il server ripulisce con la voce', () => {
  const r = corpo(SRV, "app.post('/api/streamer/impostazioni', requireLogin,", "if (b.clipAuto !== undefined)");
  assert.match(r, /if \(b\.voce !== undefined\) \{[\s\S]*?out\.voce = voce\.normVoce\(b\.voce\);/);
});

test('la carta sta in Personalità, fra la personalità e le linee guida', () => {
  const p = corpo(APP, 'function pannelloPersonalita() {', 'async function caricaSpontanee()');
  const i = p.indexOf('${cartaFrasiBot()}');
  assert.ok(i > p.indexOf('id="btn-salva-personalita"') && i < p.indexOf("L('Linee guida'"), 'dopo la carta Personalità, prima delle linee guida');
  assert.match(APP, /if \(id === 'personalita'\) \{[^}]*caricaFrasiBot\(\);/, 'si carica quando si apre la scheda');
});

test('la carta: community, i quattro modi, spento solo dove si puo\', le frasi di adesso e «Prova»', () => {
  const c = corpo(APP, 'function cartaFrasiBot() {', 'async function caricaSpontanee()');
  assert.match(c, /id="inp-community" maxlength="40"/, 'il nome della community, lungo quanto lo tiene il server');
  assert.match(c, /id="btn-salva-frasi"/);
  for (const modo of ['nostre', 'miste', 'sue', 'spento']) assert.match(c, new RegExp(`\\b${modo}: L\\(`), `manca il modo «${modo}»`);
  assert.match(c, /filter\(\(k\) => k !== 'spento' \|\| m\.spegnibile\)/, 'un momento che non si spegne non offre «Spento»');
  assert.match(c, /data-adesso/);
  assert.match(c, /api\('\/api\/streamer\/voce'\)/);
  assert.match(c, /api\('\/api\/streamer\/voce\/prova', \{ method: 'POST'/);
  assert.match(c, /salvaImpostazioni\(\{ voce: \{ community, momenti \} \}/);
  assert.match(c, /_segnoIgnoto\(f, m\.dati\)/, 'una frase con un segnaposto sconosciuto si ferma prima, con un perché');
  assert.match(APP, /document\.getElementById\('btn-salva-frasi'\)\?\.addEventListener\('click', \(\) => conErrore\(salvaFrasiBot\)\)/);
});

test('ogni momento del frasario ha titolo e spiegazione per la carta, in tre lingue, e sta in un gruppo', () => {
  const inGruppi = GRUPPI.flatMap((g) => g.momenti);
  assert.deepEqual([...inGruppi].sort(), Object.keys(MOMENTI).sort());
  for (const [id, m] of Object.entries(MOMENTI)) {
    for (const k of ['titolo', 'quando']) assert.equal(m[k].length, 3, `${id}: ${k}`);
  }
});

test('la demo del pannello risponde alla carta e alla prova', () => {
  assert.match(APP, /'\/api\/streamer\/voce': _demoFrasi\(\)/);
  assert.match(APP, /if \(via === '\/api\/streamer\/voce\/prova'\) return Promise\.resolve\(\{ frasi: _demoProvaFrasi\(opzioni\.body\) \}\);/);
});

// --- «Per tutti i momenti» --------------------------------------------------
// Un modo per tutti i momenti, poi si rifinisce uno per uno. Il tasto premuto
// non e' un valore salvato da qualche parte: si ricava dalle scelte dei
// momenti, cosi' non puo' dire una cosa diversa da quello che c'e'. Vale un
// tasto se premerlo non cambierebbe niente di quello che esce: dove non ci
// sono frasi tue «Le nostre e le mie» e «Solo le mie» sono le nostre (il
// server le salva cosi', voce.sceltaDi), e «Spento» non tocca chi non si
// spegne.
function regola() {
  const a = APP.indexOf('const _frasiTutti = ');
  const b = APP.indexOf('function _frasiTuttiHtml()');
  assert.ok(a > 0 && b > a, 'le funzioni della regola stanno insieme');
  // eslint-disable-next-line no-new-func
  return new Function('stato', `
    let _frasi = stato.frasi; let _frasiScelte = stato.scelte;
    const _FRASI_MODI = () => ({ nostre: 1, miste: 1, sue: 1, spento: 1 });
    const _frasiDelMomento = () => [];
    const document = { querySelector: () => null };
    const CSS = { escape: (x) => x };
    ${APP.slice(a, b)}
    return { ora: _frasiTuttiOra, applica: _frasiApplica, effetto: _frasiEffetto };
  `);
}
const mom = (id, { sue = [], spegnibile = true, modo = 'nostre' } = {}) => ({ id, sue, spegnibile, modo });

test('per tutti i momenti: il tasto premuto si ricava dalle scelte, e dice il vero', () => {
  const momenti = [mom('a'), mom('b', { sue: ['mia'] }), mom('c'), mom('avviso', { spegnibile: false })];
  const frasi = { gruppi: [{ momenti }] };
  const prova = (scelte) => regola()({ frasi, scelte }).ora();
  assert.equal(prova({ a: 'nostre', b: 'nostre', c: 'nostre', avviso: 'nostre' }), 'nostre');
  assert.equal(prova({ a: 'spento', b: 'spento', c: 'spento', avviso: 'nostre' }), 'spento', 'chi non si spegne non conta per «Spento»');
  assert.equal(prova({ a: 'nostre', b: 'miste', c: 'nostre', avviso: 'nostre' }), 'miste', 'dove non ci sono frasi tue, le nostre e le tue sono le nostre');
  assert.equal(prova({ a: 'sue', b: 'sue', c: 'sue', avviso: 'sue' }), 'sue', 'subito dopo «Solo le mie»');
  assert.equal(prova({ a: 'nostre', b: 'sue', c: 'nostre', avviso: 'nostre' }), 'sue', 'e dopo il salvataggio, quando il server le riduce alle nostre dove non ci sono frasi tue');
  assert.equal(prova({ a: 'spento', b: 'nostre', c: 'nostre', avviso: 'nostre' }), '', 'un momento cambiato a mano: nessun tasto');
  const senzaMie = { gruppi: [{ momenti: [mom('a'), mom('c')] }] };
  assert.equal(regola()({ frasi: senzaMie, scelte: { a: 'nostre', c: 'nostre' } }).ora(), 'nostre', 'quando piu\' tasti dicono lo stesso, quello scelto davvero');
  assert.equal(regola()({ frasi: senzaMie, scelte: { a: 'sue', c: 'sue' } }).ora(), 'sue');
});

test('per tutti i momenti: «Spento» lascia com\'e\' chi non si spegne, e gli altri modi valgono per tutti', () => {
  const fisso = mom('avviso', { spegnibile: false });
  const r = regola()({ frasi: { gruppi: [{ momenti: [mom('a'), fisso] }] }, scelte: { a: 'nostre', avviso: 'miste' } });
  assert.equal(r.applica('spento', mom('a')), 'spento');
  assert.equal(r.applica('spento', fisso), 'miste', 'resta la sua scelta');
  assert.equal(r.applica('sue', fisso), 'sue');
  assert.equal(r.effetto('spento', fisso), 'nostre', 'e se gli arrivasse, varrebbe le nostre, come sul server');
});

test('per tutti i momenti: i fili (tasti, stato per la barra, salvataggio dei momenti chiusi)', () => {
  const c = corpo(APP, 'function cartaFrasiBot() {', 'async function caricaSpontanee()');
  assert.match(c, /\+ _frasiTuttiHtml\(\)\n\s+\+ d\.gruppi\.map/, 'sopra ai gruppi');
  assert.match(c, /data-frasi-tutti="\$\{k\}" aria-pressed="false"/);
  assert.match(c, /if \(tutti\) \{ _frasiPerTutti\(tutti\.dataset\.frasiTutti\); return; \}/);
  assert.match(c, /const nuovo = _frasiApplica\(x, m\);/, 'il tasto passa dalla stessa regola del segno');
  assert.match(c, /_ripensaPresto\(\);/, 'la barra «da salvare» si accorge del cambio');
  assert.match(c, /STATI_SALVA\['btn-salva-frasi'\] = \{\n\s+stato: \(\) => \(_frasi \? _frasiTutti\(\)\.map\(\(m\) => \[m\.id, _frasiModo\(m\)\]\) : null\),\n\s+rimetti:/, 'anche i momenti chiusi stanno nello stato che la barra confronta, e «Annulla» li rimette');
  assert.match(c, /momenti\[m\.id\] = \{ modo: _frasiModo\(m\), frasi: m\.sue \|\| \[\] \}/, 'un momento chiuso si salva con la scelta di adesso');
  assert.match(c, /_frasiScelte\[m\.id\] = modo;\n\s+el\.querySelector\('\[data-stato\]'\)/, 'la tendina di un momento scrive nello stesso stato');
});
