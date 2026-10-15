// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// CHI E' IN ONDA E IL RIAVVIO ANNUNCIATO (src/in-onda.js, docs/AGGIORNARE.md).
//
// Si prova che:
//  · il file e' l'unione di tutte le fonti (piattaforme e Studio), riscritto
//    nello stesso giro in cui una cambia;
//  · una diretta dallo Studio entra nel file mentre nasce, ed esce quando
//    finisce; una sostituita non lascia mai un istante con il canale assente;
//  · il segnale di riavvio vale poco, e lo toglie il processo nuovo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync, utimesSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';
import { creaInOnda, RIAVVIO_VALE_MS } from '../../src/in-onda.js';
import { creaTramite } from '../../src/features/diretta.js';
import { creaRisorse } from '../../src/risorse.js';

const usaEGetta = cartellaUsaEGetta('andrybot-in-onda-unita-');
process.on('exit', () => usaEGetta.pulisci());
const nuova = () => mkdtempSync(join(usaEGetta.dir, 'd-'));

const calma = () => ({ ritardoMs: 0, cpuPsi: 0, memPsi: 0, memLibera: 0.9, caricoPerCore: 0 });
const DEST = [{ id: 'a', nome: 'Prova', url: 'rtmp://127.0.0.1:1935/live/chiave' }];
const CONF = { video: { codec: 'avc1', config: Buffer.from([1, 77, 0, 31, 255, 225, 0, 0, 1, 0, 0]), larghezza: 320, altezza: 180, fps: 30 }, audio: { codec: 'aac', config: Buffer.from([17, 144]), frequenza: 48000, canali: 2 } };
const processoFinto = () => ({ stdin: { write() {}, end() {}, on() {}, writable: true, writableLength: 0 }, stderr: { on() {} }, on() {}, exitCode: null, kill() {} });

function prepara() {
  const dir = nuova();
  const io = creaInOnda({ dataDir: dir });
  const letto = () => JSON.parse(readFileSync(join(dir, '.in-onda'), 'utf8')).canali;
  return { dir, io, letto };
}

test('il file e\' l\'unione delle fonti, e si riscrive a ogni cambio', () => {
  const { dir, io, letto } = prepara();
  const piattaforme = new Set(['anna']);
  const studio = new Set();
  io.fonte('piattaforme', () => piattaforme);
  assert.deepEqual(letto(), ['anna'], 'una fonte si scrive appena si dichiara');
  io.fonte('studio', () => studio);
  studio.add('bruno'); studio.add('anna');
  io.cambiato();
  assert.deepEqual(letto(), ['anna', 'bruno'], 'una volta sola anche se e\' in onda da due parti');
  piattaforme.clear();
  io.cambiato();
  assert.deepEqual(letto(), ['anna', 'bruno'], 'anna e\' ancora in onda dallo Studio');
  studio.clear();
  io.cambiato();
  assert.deepEqual(letto(), []);
  assert.ok(!existsSync(join(dir, '.in-onda.tmp')), 'si scrive accanto e si rinomina');
});

test('una fonte che si rompe non cancella le altre, e chi ascolta sente solo i cambi', () => {
  const { io, letto } = prepara();
  const sentiti = [];
  io.suCambio((c) => sentiti.push(c));
  io.fonte('rotta', () => { throw new Error('giu'); });
  io.fonte('studio', () => ['Carla']);
  assert.deepEqual(letto(), ['carla']);
  io.cambiato();
  assert.deepEqual(sentiti, [['carla']], 'riscrivere uguale non e\' un cambio');
  assert.equal(io.inOnda('CARLA'), true);
});

test('una diretta dallo Studio entra nel file mentre nasce, ed esce quando finisce', () => {
  const { io, letto } = prepara();
  const r = creaRisorse({ misura: calma, cacheMs: 0, avviaProcesso: processoFinto });
  const t = creaTramite({ risorse: r, ogniMs: 0, alCambio: () => io.cambiato() });
  io.fonte('studio', () => t.canali());
  assert.deepEqual(letto(), []);
  assert.equal(t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 1000 }).ok, true);
  assert.deepEqual(letto(), ['mario'], 'nel file prima che la richiesta abbia una risposta');
  assert.equal(t.avvia('mario#v', { destinazioni: DEST, ...CONF, kbps: 1000 }).ok, true);
  assert.deepEqual(letto(), ['mario'], 'la verticale e\' lo stesso canale');
  t.ferma('mario');
  assert.deepEqual(letto(), ['mario'], 'finita l\'orizzontale, resta la verticale');
  t.ferma('mario#v');
  assert.deepEqual(letto(), []);
});

test('una diretta sostituita non lascia mai un istante col canale assente', () => {
  const { io, letto } = prepara();
  const r = creaRisorse({ misura: calma, cacheMs: 0, avviaProcesso: processoFinto });
  const visti = [];
  const t = creaTramite({ risorse: r, ogniMs: 0, alCambio: () => { io.cambiato(); visti.push(letto()); } });
  io.fonte('studio', () => t.canali());
  t.avvia('mario', { destinazioni: DEST, ...CONF, kbps: 1000 });
  visti.length = 0;
  const altra = { ...CONF, video: { ...CONF.video, larghezza: 640, altezza: 360 } };
  const r2 = t.avvia('mario', { destinazioni: DEST, ...altra, kbps: 1000, riprendi: true });
  assert.equal(r2.ok, true);
  assert.ok(!r2.ripresa, 'con un\'altra codifica e\' una diretta nuova');
  assert.ok(visti.every((c) => c.includes('mario')), `ogni scrittura ha il canale: ${JSON.stringify(visti)}`);
  assert.ok(visti.length >= 1);
});

test('il segnale di riavvio vale tre minuti, e lo toglie il processo nuovo', () => {
  let adesso = Date.now();
  const dir = nuova();
  const io = creaInOnda({ dataDir: dir, ora: () => adesso });
  assert.equal(io.riavvioImminente(), false, 'senza segnale niente');
  const f = join(dir, '.riavvio');
  writeFileSync(f, '');
  const t = new Date(adesso);
  utimesSync(f, t, t);
  assert.equal(io.riavvioImminente(), true);
  adesso += RIAVVIO_VALE_MS + 1;
  assert.equal(io.riavvioImminente(), false, 'uno script morto a meta\' non ferma le dirette per sempre');
  adesso -= RIAVVIO_VALE_MS;
  io.dimenticaRiavvio();
  assert.equal(existsSync(f), false);
  assert.equal(io.riavvioImminente(), false);
  io.dimenticaRiavvio();
});
