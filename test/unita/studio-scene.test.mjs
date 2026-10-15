// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE SCENE DELLO STUDIO SULL'ACCOUNT (docs/DIRETTA.md, «La memoria»).
//
// Si salvano cifrate, con la versione su cui sono nate: due finestre non si
// cancellano il lavoro a vicenda. Escono in chiaro nei dati scaricati, perche'
// sono della persona; le chiavi di trasmissione no.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('studio-scene-');
const { db, studioScene, direttaDest } = await import('../../src/db.js');
const { esporta, tabelleDiCanale } = await import('../../src/features/esporta.js');
const { eCifrato } = await import('../../src/segreti.js');
const { normalizza } = await import('../../src/web/public/js/studio-modello.js');
test.after(() => casa.pulisci());

const DOC = normalizza({ scene: [{ nome: 'Gioco segreto', fonti: [{ tipo: 'immagine', media: { impronta: 'c'.repeat(64), nome: 'foto-di-casa-mia.jpg' } }] }] });

test('le scene si salvano e si rileggono uguali, e nel database stanno nella busta', () => {
  assert.deepEqual(studioScene.leggi('alfa'), { doc: null, versione: 0, quando: 0 });
  assert.deepEqual(studioScene.salva('alfa', DOC, 0), { ok: true, versione: 1 });
  assert.deepEqual(studioScene.leggi('alfa').doc, DOC);
  const grezzo = db.prepare('SELECT dati FROM studio_scene WHERE login=?').get('alfa').dati;
  assert.ok(eCifrato(grezzo), 'il documento sta nella busta');
  assert.ok(!grezzo.includes('foto-di-casa-mia') && !grezzo.includes('Gioco segreto'), 'nomi di file e testi non si leggono dal database');
});

test('chi salva da una versione vecchia riceve un no, con la versione attuale: il lavoro dell\'altra finestra resta', () => {
  assert.deepEqual(studioScene.salva('beta', DOC, 0), { ok: true, versione: 1 });
  assert.deepEqual(studioScene.salva('beta', normalizza({}), 0), { ok: false, versione: 1 }, 'la seconda finestra era rimasta indietro');
  assert.deepEqual(studioScene.leggi('beta').doc, DOC);
  assert.deepEqual(studioScene.salva('beta', normalizza({}), 1), { ok: true, versione: 2 });
  assert.deepEqual(studioScene.salva('beta', DOC, undefined), { ok: false, versione: 2 }, 'senza versione non si sovrascrive');
});

test('nei dati scaricati le scene escono in chiaro, le chiavi di trasmissione no, e l\'account cancellato le porta via', () => {
  studioScene.salva('gamma', DOC, 0);
  direttaDest.salva('gamma', { id: 'yt', nome: 'YouTube', server: 'rtmp://a.rtmp.youtube.com/live2', chiave: 'chiave-segretissima' });
  const e = esporta('gamma');
  assert.deepEqual(e.dati.studio_scene[0].scene, DOC);
  assert.ok(e.dati.diretta_dest?.length === 1 && !('chiave' in e.dati.diretta_dest[0]), 'la destinazione esce senza chiave');
  assert.doesNotMatch(JSON.stringify(e), /chiave-segretissima/);
  assert.ok(tabelleDiCanale().some((t) => t.tabella === 'studio_scene' && t.colonna === 'login'), 'la cancellazione dell\'account la trova dallo schema');
});

test('le rotte delle scene: chi prepara le scene (anche un moderatore) salva sul canale, passando dalla stessa normalizza del pannello', () => {
  const srv = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  assert.match(srv, /app\.get\('\/api\/studio-scene', requireLogin, studioAperto,/);
  assert.match(srv, /app\.put\('\/api\/studio-scene', requireLogin, studioAperto, \(req, res\) => \{\n\s+const doc = normalizzaStudio\(req\.body\?\.doc\);/);
  assert.match(srv, /if \(!r\.ok\) return res\.status\(409\)/);
  assert.match(srv, /import \{ normalizza as normalizzaStudio, pesa as pesaStudio, LIMITI as LIMITI_STUDIO \} from '\.\/public\/js\/studio-modello\.js';/);
});
