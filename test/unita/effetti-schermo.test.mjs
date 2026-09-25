// GLI EFFETTI A TUTTO SCHERMO, la parte del server (docs/EFFETTI-SCHERMO.md).
//
// Un effetto e' un comando del canale; quello che parte e' un media o un
// disegno. Qui si controllano le regole che il modello promette:
//   - un media a tutto schermo non ha posizione, e un premio non gliela da';
//   - un disegno viaggia coi suoi parametri normalizzati e col suo suono;
//   - la libreria e' fatta solo di media;
//   - un disegno non ruba il comando di un media;
//   - «dove appare» vale solo per immagini e video.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-effetti-schermo-');
const { streamers, effects: effectsDb } = await import('../../src/db.js');
const { EffectsEngine } = await import('../../src/features/effects.js');
const { normDisegno, DISEGNI } = await import('../../src/web/stile.js');
process.on('exit', () => usaEGetta.pulisci());

const canale = (ch) => { streamers.upsertApproved(ch, ch); return ch; };
const motore = () => { const e = new EffectsEngine(); const mandati = []; e.emit = (ch, p) => mandati.push(p); return { e, mandati }; };
const media = (ch, comando, tipo) => effectsDb.add(ch, { comando, tipo, file: `${comando}.${tipo === 'audio' ? 'ogg' : 'webp'}`, tier: 'tutti', cooldown: 0, volume: 90, durata: 5000 });
const disegno = (ch, comando, d) => effectsDb.addDisegno(ch, { comando, disegno: JSON.stringify(normDisegno(d)), tier: 'tutti', cooldown: 0, volume: 70, durata: 6000 });

test('un media a tutto schermo non ha posizione, e un premio non gliela da\'', () => {
  const ch = canale('fx_schermo');
  media(ch, 'foto', 'immagine');
  effectsDb.setPos(ch, 'foto', { x: 20, y: 30, s: 150, r: 10 });
  const { e, mandati } = motore();
  assert.deepEqual(e.payload(ch, effectsDb.get(ch, 'foto')).posizione, { x: 20, y: 30, s: 150, r: 10 }, 'nella scena tiene il suo posto');
  const id = effectsDb.get(ch, 'foto').id;
  assert.equal(effectsDb.setSchermo(ch, id, 'riempi'), true);
  const p = e.payload(ch, effectsDb.get(ch, 'foto'));
  assert.equal(p.schermo, 'riempi');
  assert.equal(p.posizione, null);
  e.fireConOpzioni(ch, 'foto', { xy: { x: 5, y: 5, s: 100, r: 0 } });
  assert.equal(mandati[0].posizione, null, 'il premio non la rimette');
  assert.equal(mandati[0].schermo, 'riempi');
  assert.equal(effectsDb.setSchermo(ch, id, ''), true);
  e.fireConOpzioni(ch, 'foto', { xy: { x: 5, y: 5, s: 100, r: 0 } });
  assert.deepEqual(mandati[1].posizione, { x: 5, y: 5, s: 100, r: 0 }, 'nella scena il premio sceglie il suo posto, com\'era');
});

test('«dove appare» solo per immagini e video, e solo coi valori del modello', () => {
  const ch = canale('fx_dove');
  media(ch, 'suono', 'audio');
  media(ch, 'clip', 'video');
  const idSuono = effectsDb.get(ch, 'suono').id, idClip = effectsDb.get(ch, 'clip').id;
  assert.equal(effectsDb.setSchermo(ch, idSuono, 'riempi'), false);
  assert.equal(effectsDb.setSchermo(ch, idClip, 'stirato'), false, 'mai stirato');
  assert.equal(effectsDb.setSchermo(ch, idClip, 'intero'), true);
  const { e } = motore();
  assert.equal(e.payload(ch, effectsDb.get(ch, 'suono')).schermo, '');
});

test('un disegno viaggia coi suoi parametri normalizzati e col suo suono', () => {
  const ch = canale('fx_disegno');
  media(ch, 'trombe', 'audio');
  disegno(ch, 'festa', { nome: 'fuochi', colori: ['#FF0000', 'rosso'], durata: 99, suono: 'effetto:trombe' });
  disegno(ch, 'neve', { nome: 'neve', suono: 'tada' });
  const { e, mandati } = motore();
  const p = e.payload(ch, effectsDb.get(ch, 'festa'));
  assert.equal(p.tipo, 'disegno');
  assert.deepEqual(p.disegno, { nome: 'fuochi', colori: ['#ff0000'], quanti: 'normale', durata: DISEGNI.fuochi.max, suono: 'effetto:trombe' });
  assert.equal(p.durata, DISEGNI.fuochi.max * 1000);
  assert.match(p.suonoUrl, /\/media\/trombe\.ogg\?key=/);
  assert.equal(p.url, undefined, 'un disegno non ha file');
  const q = e.payload(ch, effectsDb.get(ch, 'neve'));
  assert.equal(q.suonoPreset, 'tada');
  assert.equal(q.suonoUrl, undefined);
  e.fireConOpzioni(ch, 'neve', { xy: { x: 1, y: 1 }, chroma: { attivo: true } });
  assert.equal(mandati[0].posizione, undefined);
  assert.equal(mandati[0].chroma, undefined, 'le opzioni del premio sono dei media');
});

test('un disegno che punta a un suono sparito parte muto, non rotto', () => {
  const ch = canale('fx_muto');
  disegno(ch, 'cuori', { nome: 'cuori', suono: 'effetto:nonce' });
  const { e } = motore();
  const p = e.payload(ch, effectsDb.get(ch, 'cuori'));
  assert.equal(p.suonoUrl, undefined);
  assert.equal(p.suonoPreset, undefined);
});

test('un disegno non ruba il comando di un media, e un media che torna lo sostituisce pulito', () => {
  const ch = canale('fx_comandi');
  media(ch, 'boom', 'video');
  assert.throws(() => disegno(ch, 'boom', { nome: 'lampo' }), /già di un altro effetto/);
  assert.equal(effectsDb.get(ch, 'boom').tipo, 'video');
  disegno(ch, 'pioggia', { nome: 'neve' });
  disegno(ch, 'pioggia', { nome: 'bolle' });
  assert.equal(JSON.parse(effectsDb.get(ch, 'pioggia').disegno).nome, 'bolle', 'un disegno si modifica al suo posto');
  media(ch, 'pioggia', 'immagine');
  const r = effectsDb.get(ch, 'pioggia');
  assert.equal(r.tipo, 'immagine');
  assert.equal(r.disegno, '', 'nessun resto del disegno sulla riga di un media');
});

test('la libreria e\' fatta solo di media: un disegno non si condivide e non si importa', () => {
  const ch = canale('fx_libreria');
  media(ch, 'gatto', 'immagine');
  disegno(ch, 'stelline', { nome: 'stelle' });
  const idDisegno = effectsDb.get(ch, 'stelline').id;
  assert.equal(effectsDb.setPubblico(ch, idDisegno, { pubblico: true, nome: 'Stelline', autore: ch }), false);
  assert.equal(effectsDb.setPubblico(ch, effectsDb.get(ch, 'gatto').id, { pubblico: true, nome: 'Gatto', autore: ch }), true);
  assert.deepEqual(effectsDb.myList({ channel: ch }).map((e) => e.comando), ['gatto']);
  assert.ok(effectsDb.sharedList({}).every((e) => e.tipo !== 'disegno'));
  assert.equal(effectsDb.pubblicoById(idDisegno), null);
  assert.equal(effectsDb.list(ch).length, 2, 'fra i comandi del canale ci sono tutti e due');
});
