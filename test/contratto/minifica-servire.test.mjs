// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL SERVER NON SI FERMA PER MINIFICARE.
//
// Misurato: minificare app.js richiede circa dieci secondi, e in quei secondi
// il filo principale non faceva un giro. E la cache teneva un file solo, quindi
// aprire il pannello (venticinque script) rifaceva app.js quasi ogni volta: la
// copertina del pannello restava li' e dopo venticinque secondi diceva «ci sta
// mettendo piu' del solito», con overlay e bot fermi insieme a lei.
//
// Qui si prova che:
//  · una richiesta non aspetta mai la minificazione: esce il sorgente, e senza
//    `immutable`, finche' la versione finale non e' pronta;
//  · ogni contenuto si minifica una volta, anche se lo chiedono in tanti, e un
//    file non butta via la versione pronta di un altro;
//  · uno script con l'impronta giusta e' eterno, come i fogli di stile;
//  · le librerie di vendor/ escono come sono;
//  · il lavoro vero gira in un altro filo: quello principale continua a girare.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaMinifica, creaLavoratore } from '../../src/web/minifica.js';
import { creaImpronte, montaStatici, CACHE_ETERNA, CACHE_FRESCA } from '../../src/web/impronte.js';

const radice = mkdtempSync(join(tmpdir(), 'andrybot-minifica-'));
mkdirSync(join(radice, 'vendor'), { recursive: true });
writeFileSync(join(radice, 'app.js'), 'function lungo() { var qualcosa = 1; return qualcosa + 1; }\n');
writeFileSync(join(radice, 'altro.js'), 'function altro() { var cosa = 2; return cosa; }\n');
writeFileSync(join(radice, 'vendor', 'libro.js'), 'var libreria = 3;\n');
process.on('exit', () => { try { rmSync(radice, { recursive: true, force: true }); } catch { /* niente */ } });

// Un lavoratore finto, che risponde quando lo diciamo noi e conta i lavori.
function lavoratoreFinto() {
  const lavori = [];
  const lavora = (sorgente) => new Promise((si) => lavori.push({ sorgente, fatto: () => si('/*MIN*/' + sorgente.length) }));
  return { lavora, lavori, tutti: () => { for (const l of lavori.splice(0)) l.fatto(); } };
}

async function servi(minifica) {
  const app = express();
  const impronte = creaImpronte(radice);
  montaStatici(app, radice, { minifica, impronte });
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  return { impronte, base: 'http://127.0.0.1:' + srv.address().port, chiudi: () => new Promise((r) => srv.close(r)) };
}
const aspetta = () => new Promise((r) => setImmediate(r));

test('una richiesta non aspetta mai la minificazione, e il sorgente non diventa eterno', async () => {
  const f = lavoratoreFinto();
  const s = await servi(creaMinifica(radice, { lavora: f.lavora, scalda: false }));
  try {
    const v = s.impronte.di('/app.js');
    let r = await fetch(`${s.base}/app.js?v=${v}`);
    assert.equal(await r.text(), readFileSync(join(radice, 'app.js'), 'utf8'), 'esce subito il sorgente');
    assert.equal(r.headers.get('cache-control'), CACHE_FRESCA, 'e non si tiene per sempre: la prossima volta arriva la versione finale');
    assert.equal(f.lavori.length, 1, 'intanto la minificazione e\' partita');
    f.tutti(); await aspetta();
    r = await fetch(`${s.base}/app.js?v=${v}`);
    assert.match(await r.text(), /^\/\*MIN\*\//, 'pronta, esce lei');
    assert.equal(r.headers.get('cache-control'), CACHE_ETERNA, 'e con l\'impronta giusta e\' eterna, come un foglio di stile');
    r = await fetch(`${s.base}/app.js?v=vecchia1`);
    assert.equal(r.headers.get('cache-control'), CACHE_FRESCA, 'con un\'impronta vecchia no');
    r = await fetch(`${s.base}/app.js`);
    assert.equal(r.headers.get('cache-control'), CACHE_FRESCA, 'e senza nemmeno');
  } finally { await s.chiudi(); }
});

test('ogni contenuto si minifica una volta, anche chiesto in tanti, e un file non scaccia l\'altro', async () => {
  const f = lavoratoreFinto();
  const s = await servi(creaMinifica(radice, { lavora: f.lavora, scalda: false }));
  try {
    await Promise.all([1, 2, 3, 4, 5].map(() => fetch(`${s.base}/app.js`).then((r) => r.text())));
    assert.equal(f.lavori.length, 1, 'cinque richieste insieme, un lavoro solo');
    f.tutti(); await aspetta();
    await fetch(`${s.base}/altro.js`).then((r) => r.text());
    f.tutti(); await aspetta();
    for (let i = 0; i < 3; i++) {
      await fetch(`${s.base}/app.js`).then((r) => r.text());
      await fetch(`${s.base}/altro.js`).then((r) => r.text());
    }
    assert.equal(f.lavori.length, 0, 'chiesti a turno non si rifanno: la cache ha un posto per file');
  } finally { await s.chiudi(); }
});

test('cambiato il file, si rifa\' solo lui, e la versione vecchia non esce piu\'', async () => {
  const f = lavoratoreFinto();
  const mw = creaMinifica(radice, { lavora: f.lavora, scalda: false });
  const s = await servi(mw);
  try {
    const p = mw.prepara('/altro.js'); f.tutti(); await p;
    assert.equal(mw.pronto('/altro.js'), true);
    writeFileSync(join(radice, 'altro.js'), 'function altro() { var cosa = 22222; return cosa; }\n');
    const piuTardi = Date.now() / 1000 + 5;
    utimesSync(join(radice, 'altro.js'), piuTardi, piuTardi);
    assert.equal(mw.pronto('/altro.js'), false, 'quella pronta era di un altro contenuto');
    const r = await fetch(`${s.base}/altro.js`);
    assert.match(await r.text(), /22222/, 'intanto esce il sorgente nuovo, non il minificato vecchio');
  } finally { await s.chiudi(); }
});

test('un lavoratore caduto non e\' un verdetto sul file: si riprova', async () => {
  let volte = 0;
  const lavora = async (sorgente) => {
    volte++;
    if (volte === 1) throw Object.assign(new Error('il lavoratore si e\' fermato'), { passeggero: true });
    return '/*MIN*/' + sorgente.length;
  };
  const mw = creaMinifica(radice, { lavora, scalda: false });
  assert.equal(await mw.prepara('/app.js'), null, 'niente di pronto');
  assert.equal(mw.pronto('/app.js'), false, 'e il sorgente non resta come versione finale');
  const r = await mw.prepara('/app.js');
  assert.match(r.codice, /^\/\*MIN\*\//, 'alla volta dopo si minifica davvero');
  assert.equal(volte, 2);
});

test('un file che terser non capisce si serve com\'e\', e non si riprova a ogni richiesta', async () => {
  let volte = 0;
  const mw = creaMinifica(radice, { lavora: async () => { volte++; throw new Error('Unexpected token'); }, scalda: false });
  const r = await mw.prepara('/altro.js');
  assert.equal(r.codice, readFileSync(join(radice, 'altro.js'), 'utf8'));
  await mw.prepara('/altro.js');
  assert.equal(volte, 1);
});

test('le librerie di vendor/ escono come sono', async () => {
  const f = lavoratoreFinto();
  const s = await servi(creaMinifica(radice, { lavora: f.lavora, scalda: false }));
  try {
    const r = await fetch(`${s.base}/vendor/libro.js`);
    assert.equal(await r.text(), 'var libreria = 3;\n');
    assert.equal(f.lavori.length, 0, 'nessun lavoro per un file che non e\' nostro');
  } finally { await s.chiudi(); }
});

test('all\'avvio si preparano tutti i nostri script', async () => {
  const f = lavoratoreFinto();
  const mw = creaMinifica(radice, { lavora: async (x) => { f.lavori.push(x); return '/*MIN*/'; }, scalda: true });
  await mw.scaldato;
  assert.equal(mw.pronto('/app.js'), true);
  assert.equal(mw.pronto('/altro.js'), true);
  assert.equal(f.lavori.length, 2, 'app.js e altro.js; vendor no');
});

test('il lavoro vero gira in un altro filo: quello principale non si ferma', async () => {
  const lavora = creaLavoratore();
  try {
    const riga = 'function f__N(a, b) { var somma = a + b; var prodotto = a * b; if (somma > prodotto) { return somma - prodotto; } return prodotto - somma; }\n';
    const sorgente = Array.from({ length: 4000 }, (_, i) => riga.replace('__N', String(i))).join('');
    let giri = 0;
    const t = setInterval(() => { giri++; }, 5);
    const t0 = Date.now();
    const codice = await lavora(sorgente);
    const ms = Date.now() - t0;
    clearInterval(t);
    assert.ok(codice.length < sorgente.length, 'minificato davvero');
    assert.ok(ms > 100, `il lavoro deve durare abbastanza da misurare qualcosa (${ms} ms)`);
    assert.ok(giri >= Math.floor(ms / 5) * 0.5, `mentre si minifica il server gira: ${giri} giri in ${ms} ms`);
  } finally { await lavora.chiudi(); }
});

test('nel file, nessun Cache-Control scritto a mano', () => {
  const MIN = readFileSync(new URL('../../src/web/minifica.js', import.meta.url), 'utf8');
  assert.ok(!/'public, max-age=0'/.test(MIN), 'lo decide impronte.js, in un posto solo');
  assert.match(MIN, /res\.set\('Cache-Control', res\.locals\?\.eterno \? CACHE_ETERNA : CACHE_FRESCA\);/);
  assert.ok(!/cache\.clear\(\)/.test(MIN), 'la cache non si svuota per far posto a un file');
});
