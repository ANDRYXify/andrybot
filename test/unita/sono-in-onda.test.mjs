// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// «INTORNO ALLE DIRETTE» COSTRUITA: SONO-IN-ONDA RICEVE DAVVERO GLI AVVISI.
//
// Costruendo la traccia, il canale degli avvisi diventa il posto delle dirette
// se non ce n'e' ancora uno. Passava dalla configurazione vecchia senza dire
// «acceso», e la destinazione che ne nasce (dcDest.migra) ne copia lo stato:
// sono-in-onda entrava nell'elenco spento, e l'avviso non partiva mai.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-sono-in-onda-');
const { streamers, dcConf, dcDest } = await import('../../src/db.js');
test.after(() => usaEGetta.pulisci());

const SRV = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');

test('il costruttore scrive il canale degli avvisi acceso, e solo se un posto non c\'e\' ancora', () => {
  const i = SRV.indexOf("app.post('/api/streamer/dcserver/applica'");
  const r = SRV.slice(i, SRV.indexOf('\n  }));', i));
  assert.match(r, /if \(e\.canaleAvvisi && !cfg\?\.canale && !cfg\?\.webhook && !dcDest\.lista\(login\)\.length\) \{\n\s*dcConf\.set\(login, \{ canale: e\.canaleAvvisi, attivo: true \}\);/);
});

test('scritto cosi\', il posto che nasce e\' acceso e riceve la diretta', () => {
  streamers.upsertApproved('canale', 'Canale', '1');
  dcConf.set('canale', { canale: '123456789012345678', attivo: true });
  dcDest.migra('canale', dcConf.get('canale'));
  const [d] = dcDest.lista('canale');
  assert.equal(d.attivo, 1);
  assert.equal(dcDest.perEvento('canale', 'live', 'canale').length, 1, 'e l\'avviso della diretta lo trova');
});

test('senza «acceso» sarebbe nato spento: e\' per questo che va detto', () => {
  streamers.upsertApproved('altro', 'Altro', '2');
  dcConf.set('altro', { canale: '223456789012345678' });
  dcDest.migra('altro', dcConf.get('altro'));
  assert.equal(dcDest.lista('altro')[0].attivo, 0);
});
