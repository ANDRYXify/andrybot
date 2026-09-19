// LA CACHE SI REGGE SU UNA PROPRIETA', NON SU UNA SCOMMESSA.
//
// Misurato sul sito vero prima di questo lavoro: ogni file statico usciva con
// `Cache-Control: public, max-age=0`, quindi il browser rivalidava TUTTO a ogni
// apertura — app.js (464 KB compressi) e sei fogli di stile, una decina di
// andate-e-ritorni prima di disegnare qualcosa.
//
// Alzare i tempi sarebbe stata una scommessa, e si perde il giorno che
// pubblichi. Qui invece l'indirizzo porta l'impronta del contenuto: `immutable`
// si da' solo a chi chiede l'impronta GIUSTA, e allora non c'e' modo di servire
// una cosa vecchia — non perche' stiamo attenti, ma perche' quell'indirizzo, se
// il file cambia, non esiste piu'.
//
// Si monta un'app vera con la STESSA funzione del server: un collaudo su una
// copia che gli somiglia non dice niente su quello che gira.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { creaImpronte, montaStatici, CACHE_ETERNA } from '../../src/web/impronte.js';

const radice = mkdtempSync(join(tmpdir(), 'andrybot-impronte-'));
mkdirSync(join(radice, 'vendor', 'font'), { recursive: true });
writeFileSync(join(radice, 'app.js'), 'console.log(1);\n');
writeFileSync(join(radice, 'style.css'), 'body { color: red; }\n');
writeFileSync(join(radice, 'vendor', 'font', 'tondo.woff2'), 'finto');
process.on('exit', () => { try { rmSync(radice, { recursive: true, force: true }); } catch { /* niente */ } });

async function servi() {
  const app = express();
  montaStatici(app, radice);
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  return { base: 'http://127.0.0.1:' + srv.address().port, chiudi: () => new Promise((r) => srv.close(r)) };
}

test('l\'impronta viene dal CONTENUTO, non da un numero scritto a mano', () => {
  const i = creaImpronte(radice);
  const prima = i.di('/app.js');
  assert.match(prima, /^[0-9a-f]{8}$/);
  assert.equal(i.di('/app.js'), prima, 'lo stesso file da\' sempre la stessa impronta');
  assert.notEqual(i.di('/style.css'), prima, 'due file diversi non possono avere lo stesso indirizzo');
  writeFileSync(join(radice, 'app.js'), 'console.log(2);\n');
  assert.notEqual(i.di('/app.js'), prima, 'cambiato il contenuto, cambia l\'indirizzo: e\' tutta qui la garanzia');
  assert.equal(i.di('/non-esiste.js'), '', 'e quello che non c\'e\' non si marca');
});

test('i gusci escono col nome marcato, e una versione scritta a mano viene sostituita', () => {
  const i = creaImpronte(radice);
  const v = i.di('/style.css');
  const fuori = i.marca('<link rel="stylesheet" href="style.css"><script src="/app.js?v=8"></script>');
  assert.ok(fuori.includes(`href="style.css?v=${v}"`), fuori);
  assert.ok(fuori.includes(`src="/app.js?v=${i.di('/app.js')}"`), 'il ?v=8 a mano era la stessa cosa fatta a memoria');
  assert.ok(!fuori.includes('?v=8'));
});

test('quello che non e\' nostro non si tocca', () => {
  const i = creaImpronte(radice);
  const roba = '<a href="https://altrove.example/x.js">x</a><img src="data:image/png;base64,aa"><a href="#su">su</a>'
    + '<a href="/entra">entra</a><script src="//cdn.example/y.js"></script>';
  assert.equal(i.marca(roba), roba, 'domini altrui, data:, ancore, rotte senza file: tutto com\'era');
});

test('immutable lo riceve solo chi porta l\'impronta giusta', async () => {
  const s = await servi();
  try {
    const i = creaImpronte(radice);
    const buona = await fetch(`${s.base}/style.css?v=${i.di('/style.css')}`);
    assert.equal(buona.status, 200);
    assert.equal(buona.headers.get('cache-control'), CACHE_ETERNA);

    const senza = await fetch(`${s.base}/style.css`);
    assert.notEqual(senza.headers.get('cache-control'), CACHE_ETERNA,
      'senza impronta si torna a rivalidare: un indirizzo vecchio non deve restare incastrato per un anno');

    const sbagliata = await fetch(`${s.base}/style.css?v=00000000`);
    assert.notEqual(sbagliata.headers.get('cache-control'), CACHE_ETERNA,
      'un\'impronta che non torna non vale: sennò bastava inventarsela');
  } finally { await s.chiudi(); }
});

test('una sola risposta alla stessa domanda: un Cache-Control per volta', async () => {
  const s = await servi();
  try {
    for (const via of ['/style.css', `/style.css?v=${creaImpronte(radice).di('/style.css')}`, '/vendor/font/tondo.woff2']) {
      const r = await fetch(s.base + via);
      const tutti = r.headers.getSetCookie ? r.headers.get('cache-control') : r.headers.get('cache-control');
      assert.ok(!String(tutti).includes(',') || !/max-age=\d+.*max-age=\d+/.test(String(tutti)),
        `${via}: due Cache-Control in contraddizione — nessuno sa quale vince (${tutti})`);
    }
  } finally { await s.chiudi(); }
});

test('i caratteri sono eterni per natura: il loro nome porta gia\' la versione', async () => {
  const s = await servi();
  try {
    const r = await fetch(s.base + '/vendor/font/tondo.woff2');
    assert.equal(r.headers.get('cache-control'), CACHE_ETERNA);
  } finally { await s.chiudi(); }
});

// I GUSCI SONO L'UNICO POSTO da cui l'impronta entra nelle pagine: li costruisce
// il server all'avvio, quindi non c'e' un passo di build da ricordarsi di far
// girare e non nasce una cartella `dist` che puo' andare fuori sincrono coi
// sorgenti. Se qualcuno toglie la marcatura, i file tornano a rivalidare tutti
// a ogni apertura — e non se ne accorge nessuno, perche' il sito funziona
// lo stesso, solo piu' lento.
test('le pagine servite come stringa escono marcate, e il montaggio e\' quello vero', async () => {
  const { readFileSync } = await import('node:fs');
  const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  assert.match(SRV, /return impronte\.marca\(h\);/, 'i gusci delle tre lingue');
  assert.match(SRV, /const PANNELLO = impronte\.marca\(/, 'e il guscio del pannello');
  assert.match(SRV, /montaStatici\(app, publicDir, \{ minifica: creaMinifica\(publicDir\), impronte \}\)/,
    'gli statici si montano con la funzione condivisa, e con la STESSA tabella delle impronte');
  assert.ok(!/app\.use\(express\.static\(publicDir\)\)/.test(SRV),
    'niente un secondo montaggio nudo accanto: servirebbe gli stessi file senza la regola');
});

// Il service worker puo' rispondere SENZA RETE a un indirizzo che porta
// l'impronta, perche' quell'indirizzo non puo' cambiare contenuto. Senza
// impronta sarebbe una scommessa; con l'impronta e' una proprieta'.
test('il service worker si fida solo di chi porta l\'impronta', async () => {
  const { readFileSync } = await import('node:fs');
  const SW = readFileSync(new URL('../../src/web/public/sw.js', import.meta.url), 'utf8');
  assert.match(SW, /url\.searchParams\.get\('v'\)/, 'la scorciatoia vale solo per gli indirizzi marcati');
  assert.match(SW, /async function eterno/);
  assert.match(SW, /if \(avuta\) return avuta;/, 'prima la cache, poi la rete');
  assert.match(SW, /await c\.delete\(vecchia\)/, 'e le versioni vecchie dello stesso file si buttano');
});
