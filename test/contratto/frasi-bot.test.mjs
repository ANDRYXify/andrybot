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
