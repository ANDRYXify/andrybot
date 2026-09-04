// LE DUE VIE del cervello: chi risponde in chat pubblica, e chi risponde a lui.
//
// Non è una differenza di rotta HTTP, è una differenza di persona. `/chat` è
// LEI: incontra chi le scrive e se lo ricorda, si muove d'umore, si giudica.
// `/bot` è l'assistente del canale: una funzione senza mente e senza memoria.
// Sbagliare via non rompe niente in modo visibile — la risposta esce lo stesso —
// e intanto la chat pubblica sta registrando le persone in una coscienza che
// aveva promesso di non ricordare nessuno. Il difetto non ha sintomi: per questo
// va misurato qui e non "visto" in produzione.
//
// docs/BOT-E-LIA.md ha il modello per esteso.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as brainpy from '../../src/ai/brainpy.js';

// Sostituisce fetch e racconta cos'è stato chiesto. `risposta` è quello che il
// finto cervello risponde.
function spia(risposta = 'ok') {
  const chiamate = [];
  const vero = globalThis.fetch;
  globalThis.fetch = async (url, opz) => {
    chiamate.push({ url: String(url), corpo: JSON.parse(opz.body) });
    return { ok: true, json: async () => (risposta === null ? {} : { risposta }) };
  };
  return { chiamate, basta: () => { globalThis.fetch = vero; } };
}

const base = { canale: 'ANDRYXify', login: 'tizio', nome: 'Tizio', testo: 'ciao a tutti' };

test("via:'bot' va al bot, tutto il resto va da Lei", async () => {
  const s = spia();
  try {
    await brainpy.rispondi({ ...base, via: 'bot' });
    await brainpy.rispondi({ ...base });
    await brainpy.rispondi({ ...base, modo: 'allenamento' });
    await brainpy.rispondi({ ...base, via: 'chat' });
  } finally { s.basta(); }
  const rotte = s.chiamate.map((c) => c.url.replace(/^.*?(\/[a-z]+)$/, '$1'));
  assert.deepEqual(rotte, ['/bot', '/chat', '/chat', '/chat'],
    'una via sbagliata qui vuol dire che in chat pubblica risponde lei');
});

test('il bot riceve il login del canale, non il nome visualizzato', async () => {
  const s = spia();
  try {
    await brainpy.rispondi({ ...base, via: 'bot', canaleId: 'andryxify' });
    await brainpy.rispondi({ ...base, via: 'bot' });   // senza: si ripiega sul minuscolo
  } finally { s.basta(); }
  assert.equal(s.chiamate[0].corpo.canale_id, 'andryxify');
  assert.equal(s.chiamate[1].corpo.canale_id, 'andryxify',
    'senza canaleId deve ripiegare sul nome in minuscolo, sennò il quaderno del canale non si trova');
});

test('il cervello ha meno tempo di noi: deve poter dire «niente» invece di essere zittito', async () => {
  // e vale anche con le attese corte: la penitenza aspetta 4s, e un margine
  // fisso di due secondi lascerebbe il cervello e noi a scadere insieme.
  const s = spia();
  try {
    for (const ms of [4000, 9000, 12000, 40000]) await brainpy.rispondi({ ...base, via: 'bot', timeoutMs: ms });
  } finally { s.basta(); }
  for (const [i, ms] of [4000, 9000, 12000, 40000].entries()) {
    const t = s.chiamate[i].corpo.timeout_s;
    assert.ok(t >= 2 && t * 1000 < ms, `attesa ${ms}ms → timeout_s=${t}: deve restare sotto la nostra`);
  }
});

test('un compito non è una chiacchierata, e non lo diventa per sbaglio', async () => {
  const s = spia();
  try {
    await brainpy.rispondi({ ...base, via: 'bot' });
    await brainpy.rispondi({ ...base, via: 'bot', compito: true });
  } finally { s.basta(); }
  assert.equal('compito' in s.chiamate[0].corpo, false, 'senza compito non deve nemmeno comparire il campo');
  assert.equal(s.chiamate[1].corpo.compito, true);
});

test('se il cervello non risponde, il bot resta zitto (non inventa)', async () => {
  const s = spia(null);
  try {
    assert.equal(await brainpy.rispondi({ ...base, via: 'bot' }), null);
  } finally { s.basta(); }
});

test('senza canale, login o testo non si disturba nessuno', async () => {
  const s = spia();
  try {
    assert.equal(await brainpy.rispondi({ via: 'bot' }), null);
    assert.equal(await brainpy.rispondi({ ...base, testo: '', via: 'bot' }), null);
  } finally { s.basta(); }
  assert.equal(s.chiamate.length, 0);
});

test('il quaderno del bot si scrive dalla sua rotta, non da quella di Lei', async () => {
  const s = spia();
  try {
    await brainpy.quaderno({ op: 'scrivi', testo: 'Quando chiedono gli orari, rimanda al calendario.' });
  } finally { s.basta(); }
  assert.match(s.chiamate[0].url, /\/insegna$/);
  assert.equal(s.chiamate[0].corpo.op, 'scrivi');
});
