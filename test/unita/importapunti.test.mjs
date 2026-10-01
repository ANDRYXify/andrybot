// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL REGISTRO DEI PUNTI IMPORTATI (points.importa in src/db.js, docs/PONTE.md).
// Si sommano alle monete di qui, una volta sola: lo stesso file due volte non
// cambia niente, un file aggiornato cambia solo la differenza, le monete
// guadagnate nel mezzo restano, chi non è nel file non si tocca.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-importapunti-');
const { points, streamers } = await import('../../src/db.js');
const { anteprima } = await import('../../src/features/importacomandi.js');
process.on('exit', () => usaEGetta.pulisci());

let n = 0;
const canale = () => { const ch = `importa-${++n}`; streamers.upsertApproved(ch, ch); return ch; };
// il giro vero: l'anteprima coi saldi del canale, poi il registro
const importa = (ch, testo, tasso = 1) => {
  const a = anteprima(testo, { saldi: () => points.saldi(ch), tasso });
  return points.importa(ch, a.punti.voci.map((v) => ({ utente: v.utente, monete: v.monete })));
};

test('lo stesso file due volte non regala niente', () => {
  const ch = canale();
  assert.deepEqual(importa(ch, 'marco 1000\ngiada 400'), { nuovi: 2, aggiornati: 0, invariati: 0 });
  assert.deepEqual([points.get(ch, 'marco'), points.get(ch, 'giada')], [1000, 400]);
  importa(ch, 'marco 1000\ngiada 400');
  assert.deepEqual([points.get(ch, 'marco'), points.get(ch, 'giada')], [1000, 400]);
  assert.deepEqual(points.importa(ch, [{ utente: 'marco', monete: 1000 }]), { nuovi: 0, aggiornati: 0, invariati: 1 }, 'anche senza passare dall\'anteprima');
});

test('chi ha già monete qui le tiene, e quelle guadagnate nel mezzo restano', () => {
  const ch = canale();
  points.dai(ch, 'marco', 300);
  importa(ch, 'marco 1000');
  assert.equal(points.get(ch, 'marco'), 1300);
  points.dai(ch, 'marco', 50);
  points.togli(ch, 'marco', 200);
  importa(ch, 'marco 1000');
  assert.equal(points.get(ch, 'marco'), 1150, 'rifare lo stesso file non tocca né i guadagni né le spese');
});

test('un file aggiornato porta solo la differenza, in su e in giù, mai sotto zero', () => {
  const ch = canale();
  importa(ch, 'marco 1000\ngiada 1000');
  points.togli(ch, 'giada', 900);
  importa(ch, 'marco 1500\ngiada 200');
  assert.equal(points.get(ch, 'marco'), 1500);
  assert.equal(points.get(ch, 'giada'), 0, '100 rimaste, 800 in meno: zero, non sotto');
  importa(ch, 'giada 300');
  assert.equal(points.get(ch, 'giada'), 100, 'il registro era a 200: arrivano le 100 di differenza');
});

test('chi non è nel file non si tocca; zero nel file toglie quanto era arrivato', () => {
  const ch = canale();
  points.dai(ch, 'lucia', 70);
  importa(ch, 'marco 500\npiero 40');
  importa(ch, 'piero 0');
  assert.equal(points.get(ch, 'marco'), 500, 'un export parziale non azzera gli altri');
  assert.equal(points.get(ch, 'piero'), 0);
  assert.equal(points.get(ch, 'lucia'), 70);
  importa(ch, 'lucia 0');
  assert.equal(points.get(ch, 'lucia'), 70, 'zero per chi non aveva importato niente: niente da togliere');
});

test('il registro conta le monete: cambiare il cambio fra due importazioni si corregge da solo', () => {
  const ch = canale();
  importa(ch, 'marco 1000', 1);
  importa(ch, 'marco 1000', 10);
  assert.equal(points.get(ch, 'marco'), 100);
  importa(ch, 'marco 1000', 1);
  assert.equal(points.get(ch, 'marco'), 1000);
});

test('chi arriva dall\'importazione entra nella classifica del pubblico', () => {
  const ch = canale();
  importa(ch, 'marco 900\ngiada 1200');
  assert.deepEqual(points.top(ch, 5).map((r) => [r.user, r.monete, r.ruolo]), [['giada', 1200, ''], ['marco', 900, '']]);
  assert.deepEqual(points.saldi(ch).get('marco'), { monete: 900, importate: 900 });
});

test('la rotta: i punti li importa solo il proprietario, e si applica quello che si è visto', () => {
  const server = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/web/server.js'), 'utf8');
  const i = server.indexOf("app.post('/api/streamer/comandi/importa'");
  const rotta = server.slice(i, server.indexOf('}));', i));
  assert.match(rotta, /const proprietario = isOwner\(req\);/);
  assert.match(rotta, /if \(!proprietario\) punti = \{ negati: true \};\s*else \{\s*punti = economia\.importa\(/, 'economia.importa solo nel ramo del proprietario');
  assert.equal(rotta.split('importa(').length, 2, 'e da nessun\'altra parte');
  assert.match(rotta, /voci: undefined/, 'l\'elenco intero dei saldi non esce verso il pannello');
});
