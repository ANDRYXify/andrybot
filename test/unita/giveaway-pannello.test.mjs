// IL GIVEAWAY DAL PANNELLO: il numero di vincitori scelto all'apertura e chi ha
// vinto stanno nel giveaway, e il pannello li legge da li'.
//
// Prima «Vincitori (predefinito)» non lo leggeva nessuno: «Quanti» partiva
// sempre da 1. E dopo «Estrai» la carta si ridisegnava e la riga «Ha vinto:»
// spariva, anche se il server i vincitori li aveva.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('giveaway-pannello-');
const { streamers } = await import('../../src/db.js');
const giveaway = await import('../../src/features/giveaway.js');
test.after(() => casa.pulisci());

const leggi = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const CANALE = 'alfa';
streamers.upsertApproved(CANALE, 'Alfa', '1');
streamers.setEnabled(CANALE, true);

test('il numero di vincitori scelto all\'apertura resta col giveaway, anche dopo un riavvio', async () => {
  giveaway.annulla(CANALE);
  giveaway.apri(CANALE, { premio: 'una maglietta', quanti: 3 });
  assert.equal(giveaway.stato(CANALE).quanti, 3);
  const dopo = await import('../../src/features/giveaway.js?riavvio=quanti');
  assert.equal(dopo.stato(CANALE).quanti, 3, 'il pannello lo ritrova dopo un riavvio');
});

test('fuori dai limiti si porta al limite, e senza numero e\' uno', () => {
  giveaway.annulla(CANALE);
  giveaway.apri(CANALE, { premio: 'x', quanti: 99 });
  assert.equal(giveaway.stato(CANALE).quanti, 50);
  giveaway.annulla(CANALE);
  giveaway.apri(CANALE, { premio: 'x' });
  assert.equal(giveaway.stato(CANALE).quanti, 1, 'aperto dalla chat');
});

test('chi ha vinto resta nello stato, estrazione dopo estrazione', () => {
  giveaway.annulla(CANALE);
  giveaway.apri(CANALE, { premio: 'x', quanti: 1 });
  for (const u of ['lucia', 'marco', 'nina']) giveaway.partecipa(CANALE, u, u.toUpperCase(), 1);
  const a = giveaway.estrai(CANALE, 1).vincitori;
  const b = giveaway.estrai(CANALE, 1).vincitori;
  assert.deepEqual(giveaway.stato(CANALE).vincitori, [...a, ...b]);
});

test('il pannello manda il predefinito, parte da quello e mostra i vincitori dallo stato', () => {
  const app = leggi('src/web/public/app.js');
  const srv = leggi('src/web/server.js');
  const carica = app.slice(app.indexOf('async function caricaGiveaway() {'), app.indexOf('function pannelloPenitenze() {'));
  assert.match(carica, /const quanti = parseInt\(document\.getElementById\('gw-vincitori'\)\.value, 10\) \|\| 1;/);
  assert.match(carica, /body: \{ premio, soloSub, keyword, quanti,/);
  assert.match(carica, /id="gw-quanti" min="1" max="50" value="\$\{Number\(d\.quanti\) \|\| 1\}"/, '«Quanti» parte dal predefinito');
  assert.match(carica, /const vinti = Array\.isArray\(d\.vincitori\) \? d\.vincitori : \[\];/);
  assert.match(carica, /<div id="gw-vincitore" class="spazio-sopra">\$\{rigaVinti\}<\/div>/, 'la riga dei vincitori nasce dallo stato');
  const apri = srv.slice(srv.indexOf("app.post('/api/giveaway/apri'"), srv.indexOf("app.post('/api/giveaway/estrai'"));
  assert.match(apri, /quanti: b\.quanti/, 'il server lo passa al giveaway');
});

test('con i minigiochi spenti il giveaway non si apre, e il pannello dice cosa accendere', () => {
  streamers.setSettings(CANALE, { giochi: false });
  giveaway.annulla(CANALE);
  const r = giveaway.apri(CANALE, { premio: 'x' });
  assert.deepEqual(r, { ok: false, errore: 'giochi-spenti' });
  streamers.setSettings(CANALE, { giochi: true });
  const srv = leggi('src/web/server.js');
  const apri = srv.slice(srv.indexOf("app.post('/api/giveaway/apri'"), srv.indexOf("app.post('/api/giveaway/estrai'"));
  assert.ok(apri.includes('accendi «Attiva i minigiochi in chat»'), 'dice cosa accendere');
  assert.ok(!/piano/.test(apri), 'non parla del piano: il giveaway e\' nel piano gratuito');
});
