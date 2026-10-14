// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LO STUDIO IN BETA E OSIFY IN PRE-ALPHA, DETTI PER QUELLO CHE SONO (docs/DIRETTA.md).
//
// Si pubblicizza una cosa che non si usa ancora e un sistema operativo appena
// nato: la regola e' che lo stato sta scritto in testa, prima di ogni promessa,
// e che chi vuole provare lo Studio lo chiede dal suo account senza altri dati.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUIDE, paginaGuida } from '../../src/web/guide.js';

const leggi = (f) => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const SRV = leggi('src/web/server.js');
const APP = leggi('src/web/public/app.js');

test('la guida dello Studio dice per prima cosa che non si usa ancora', () => {
  const g = GUIDE.find((x) => x.slug === 'diretta-dal-sito');
  assert.ok(g, 'la guida c\'e\'');
  assert.match(g.titolo, /\(beta\)/);
  assert.match(g.desc, /Beta in preparazione/);
  assert.match(g.corpo[0].p[0], /^<strong>A che punto è: beta in preparazione\.<\/strong> Lo Studio oggi non si può ancora usare\./);
  assert.match(g.faq[0].r, /^No\./, 'alla domanda «si puo\' gia\' usare?» la risposta e\' no');
  assert.ok(paginaGuida('diretta-dal-sito').includes('beta in preparazione'));
});

test('la guida di OSify dice pre-alpha in testa, e come provarlo senza rischi', () => {
  const g = GUIDE.find((x) => x.slug === 'osify-sistema-per-lo-streaming');
  assert.ok(g, 'la guida c\'e\'');
  assert.match(g.titolo, /\(pre-alpha\)/);
  assert.match(g.corpo[0].p[0], /^<strong>A che punto è: pre-alpha\.<\/strong>/);
  const tutto = JSON.stringify(g.corpo);
  for (const [cosa, re] of [['la copia dei dati', /copia dei tuoi dati/], ['la chiavetta', /chiavetta/], ['le impronte dei file', /SHA256SUMS/],
    ['l\'installatore da Windows sconsigliato', /sconsigliamo l'installatore/], ['il processore richiesto', /AVX2/], ['la licenza', /GPL v3/]]) {
    assert.match(tutto, re, `manca ${cosa}`);
  }
  assert.match(tutto, /OSify non serve per usarlo/, 'SocialBot non dipende da OSify');
});

test('«Voglio provarlo per primo»: sul proprio account, senza altri dati, e lo stesso tasto lo toglie', () => {
  const i = SRV.indexOf("app.post('/api/streamer/studio-beta', requireLogin,");
  assert.ok(i > 0, 'la rotta chiede di essere entrati');
  const r = SRV.slice(i, SRV.indexOf('\n  }));', i));
  assert.match(r, /const login = currentUser\(req\)\.login;/);
  assert.match(r, /const voglio = req\.body\?\.voglio === true;/);
  assert.match(r, /if \(voglio\) settings\.betaStudio = Date\.now\(\); else delete settings\.betaStudio;/);
  assert.doesNotMatch(r, /email|mail|telefono/i, 'nessun dato in piu\'');
  assert.match(SRV, /beta: !!streamers\.get\(user\.login\)\?\.settings\?\.betaStudio/);
  assert.match(SRV, /betaStudio: streamers\.list\(\)\.filter\(\(x\) => x\.settings\?\.betaStudio\)\.length,/);
  assert.match(APP, /body: \{ voglio: !dentro \}/);
});

test('lo Studio sta nel menù, in «In diretta», e spento apre la scheda della beta', () => {
  assert.match(APP, /\{ id: 'diretta', nome: 'In diretta', schede: \[\n {4}\['regia', 'Regia'\],\n {4}\['studio', 'Studio Web'\],/);
  assert.match(APP, /if \(id === 'studio'\) \{ if \(stato\?\.studio\?\.attivo === false\) caricaStudioBeta\(\); else caricaStudio\(\); \}/);
});
