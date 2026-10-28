// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I MEDIA DEGLI EFFETTI (src/features/media-effetti.js, docs/ARCHIVIO.md), sul
// database e sull'archivio veri. Le garanzie, ognuna rotta apposta:
//  · un file dell'archivio si serve solo al canale che lo usa;
//  · prendere un effetto dalla libreria non copia niente, e toglierlo a uno non
//    lo toglie all'altro: il file se ne va quando nessuno lo usa piu';
//  · i file di prima passano all'archivio, e la riga cambia solo se e' ancora
//    quella di prima; il vecchio se ne va solo dopo;
//  · lo spazio di un canale conta i file che usa, ognuno una volta;
//  · il codice: sb- per i condivisi, il nome del canale per i privati, e resta
//    lo stesso quando l'effetto si ricarica.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Writable } from 'node:stream';

const { cartellaUsaEGetta } = await import('../aiuto.mjs');
const usaEGetta = cartellaUsaEGetta('andrybot-media-effetti-');
process.on('exit', () => usaEGetta.pulisci());
const { effects, archivioDb, codiceEffetto } = await import('../../src/db.js');
const { chiudiChiave, apriChiave, segno } = await import('../../src/segreti.js');
const { creaArchivio, eNomeArchivio } = await import('../../src/features/archivio.js');
const { creaMediaEffetti } = await import('../../src/features/media-effetti.js');

const radice = join(usaEGetta.dir, 'effects');
const cartellaDi = (l) => join(radice, l);
const archivio = creaArchivio({ cartella: join(usaEGetta.dir, 'archivio'), chiudiChiave, apriChiave, impronta: (s) => segno('archivio', s).toString('hex') });
const m = creaMediaEffetti({ archivio, effetti: effects, registro: archivioDb, cartellaDi, temp: join(usaEGetta.dir, 'entrata') });
let n = 0;
const canale = () => `media${++n}`;
const nuovoFile = (ch, nome, dati) => { mkdirSync(cartellaDi(ch), { recursive: true }); const p = join(cartellaDi(ch), nome); writeFileSync(p, dati); return p; };
const risposta = () => {
  const parti = [], head = {};
  const res = new Writable({ write(c, e, cb) { parti.push(c); cb(); } });
  res.statusCode = 200;
  res.setHeader = (k, v) => { head[k.toLowerCase()] = v; };
  res.status = (s) => { res.statusCode = s; return res; };
  res.sendFile = (p, o, cb) => { try { res.end(readFileSync(p)); cb(); } catch (e) { cb(e); } };
  const fatto = new Promise((ok) => res.on('finish', () => ok({ stato: res.statusCode, corpo: Buffer.concat(parti) })));
  return { res, fatto };
};
const servi = async (ch, nome) => { const { res, fatto } = risposta(); await m.servi({ headers: {}, method: 'GET' }, res, ch, nome); return fatto; };

test('un file entra nell\'archivio, e si serve solo al canale che lo usa', async () => {
  const a = canale(), b = canale();
  const dati = crypto.randomBytes(3000);
  const nome = await m.entra(nuovoFile(a, '1_pomodoro.webp', dati), '1_pomodoro.webp');
  assert.ok(eNomeArchivio(nome) && nome.endsWith('.webp'));
  effects.add(a, { comando: 'pomodoro', tipo: 'immagine', file: nome, tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });
  const r = await servi(a, nome);
  assert.deepEqual([r.stato, r.corpo.equals(dati)], [200, true]);
  assert.equal((await servi(b, nome)).stato, 404, 'il nome da solo non apre niente');
  assert.equal(await m.leggi(b, nome), null);
  assert.ok((await m.leggi(a, nome)).equals(dati));
});

test('prendere non e\' copiare: lo stesso file per due canali, e se ne va solo quando nessuno lo usa piu\'', async () => {
  const a = canale(), b = canale();
  const dati = crypto.randomBytes(5000);
  const nome = await m.entra(nuovoFile(a, 'x.webm', dati), 'x.webm');
  effects.add(a, { comando: 'festa', tipo: 'video', file: nome, tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });
  effects.add(b, { comando: 'festa', tipo: 'video', file: nome, tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });
  assert.equal(archivioDb.byteDi(a), 5000);
  assert.equal(archivioDb.byteDi(b), 5000, 'ognuno lo conta per se\'');
  const ra = effects.remove(a, effects.get(a, 'festa').id);
  await m.libera(a, ra.file);
  assert.ok(archivio.esiste(nome), 'b lo usa ancora');
  assert.equal((await servi(b, nome)).stato, 200);
  assert.equal((await servi(a, nome)).stato, 404, 'e a non lo vede piu\'');
  const rb = effects.remove(b, effects.get(b, 'festa').id);
  await m.libera(b, rb.file);
  assert.equal(archivio.esiste(nome), false, 'nessuno lo usa: via dal disco');
  assert.equal(archivioDb.orfani().includes(nome), false, 'e dal registro');
});

test('i file di prima passano all\'archivio; la riga cambia solo se e\' ancora quella; il vecchio se ne va dopo', async () => {
  const a = canale();
  const dati = crypto.randomBytes(2000), suono = crypto.randomBytes(800);
  const p = nuovoFile(a, '123_risata.webp', dati), ps = nuovoFile(a, '123_risata_snd.opus', suono);
  effects.add(a, { comando: 'risata', tipo: 'immagine', file: '123_risata.webp', tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });
  effects.attachSuono(a, effects.get(a, 'risata').id, '123_risata_snd.opus');
  assert.equal((await servi(a, '123_risata.webp')).stato, 200, 'prima della migrazione si serve come prima');
  assert.equal(await m.migra(), 2);
  const r = effects.get(a, 'risata');
  assert.ok(eNomeArchivio(r.file) && eNomeArchivio(r.suono_file));
  assert.deepEqual([existsSync(p), existsSync(ps)], [false, false], 'i vecchi se ne vanno');
  assert.ok((await m.leggi(a, r.file)).equals(dati) && (await m.leggi(a, r.suono_file)).equals(suono));
  assert.equal(await m.migra(), 0, 'una volta sola');
  const b = canale();
  const pb = nuovoFile(b, '9_x.webp', crypto.randomBytes(100));
  effects.add(b, { comando: 'x', tipo: 'immagine', file: '9_x.webp', tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });
  const riga = effects.get(b, 'x');
  effects.add(b, { comando: 'x', tipo: 'immagine', file: 'altro.webp', tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });
  assert.equal(await m.migraRiga(riga), 0, 'la riga e\' cambiata intanto: non si tocca');
  assert.deepEqual([effects.get(b, 'x').file, existsSync(pb)], ['altro.webp', true], 'e il file vecchio resta dov\'era');
  assert.ok(await m.pulisci() >= 1, 'il file entrato per niente lo toglie la pulizia');
});

test('la porta pubblica: un privato che non si firma non esce, e un altro canale non lo prende', async () => {
  const a = canale(), b = canale();
  const dati = crypto.randomBytes(1500);
  const nome = await m.entra(nuovoFile(a, 'p.webp', dati), 'p.webp');
  effects.add(a, { comando: 'privato', tipo: 'immagine', file: nome, tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });
  const porta = async (firma, ch) => {
    const mf = creaMediaEffetti({ archivio, effetti: effects, registro: archivioDb, cartellaDi, temp: join(usaEGetta.dir, 'entrata'), firma });
    const { res, fatto } = risposta();
    await mf.servi({ headers: {}, method: 'GET' }, res, ch, nome, { firmato: '© x · socialbot.live' });
    return fatto;
  };
  const r = await porta({ copia: async () => null }, a);
  assert.deepEqual([r.stato, r.corpo.equals(dati)], [404, false], 'la firma non riesce: niente, mai il chiaro');
  assert.equal((await porta(null, a)).stato, 404, 'senza firmatore: niente');
  const sempre = { copia: async () => ({ buf: Buffer.from('firmato'), est: 'png' }) };
  assert.equal((await porta(sempre, a)).corpo.toString(), 'firmato');
  assert.equal((await porta(sempre, b)).stato, 404, 'un altro canale non lo prende, nemmeno firmato');
});

test('il codice: sb- se condiviso, il canale se privato; stesso codice quando si ricarica; lo trova chi deve', () => {
  const a = canale(), b = canale();
  effects.add(a, { comando: 'boom', tipo: 'immagine', file: 'f1.webp', tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });
  const e = effects.get(a, 'boom');
  assert.match(codiceEffetto(e), new RegExp(`^${a}-[A-Z0-9]{6}$`));
  effects.add(a, { comando: 'boom', tipo: 'immagine', file: 'f2.webp', tier: 'tutti', cooldown: 0, volume: 100, durata: 3000 });
  assert.equal(effects.get(a, 'boom').sigla, e.sigla, 'ricaricato: lo stesso codice');
  assert.equal(effects.byCodice(codiceEffetto(e), b), null, 'privato: un altro canale non lo trova');
  assert.equal(effects.byCodice(codiceEffetto(e), a)?.id, e.id);
  assert.equal(effects.byCodice(`sb-${e.sigla}`, b), null, 'un privato non si apre facendolo passare per condiviso');
  effects.setPubblico(a, e.id, { pubblico: true, nome: 'Boom', autore: a });
  const cond = codiceEffetto(effects.get(a, 'boom'));
  assert.equal(cond, `sb-${e.sigla}`);
  assert.equal(effects.byCodice(cond.toUpperCase().replace('SB', 'sb'), b)?.id, e.id, 'condiviso: lo trova chiunque');
  assert.equal(effects.byCodice(`${a}-${e.sigla}`, b), null);
  assert.equal(effects.byCodice('sb-ZZZZZZ', b), null);
  assert.equal(effects.byCodice('nonsense', b), null);
});
