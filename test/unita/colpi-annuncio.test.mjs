// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL LINK DELLA PAGINA PEW IN CHAT, DA SOLO (docs/COLPI.md, «Il link in chat da
// solo»): la regola (in diretta, ogni tanti minuti, solo se la chat si e'
// mossa) e il giro del bot, su Twitch e su Kick, con la voce di ognuna.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('colpi-annuncio-');
const { streamers, statoVivo } = await import('../../src/db.js');
const C = await import('../../src/features/colpi.js');
const { BotManager } = await import('../../src/bot.js');
test.after(() => casa.pulisci());

const MIN = 60_000;

test('la regola: accesi, in diretta, passato il tempo e mossa la chat', () => {
  const cfg = C.normalizza({ attivo: true });
  assert.deepEqual([cfg.annuncio.attivo, cfg.annuncio.ogniMin, cfg.annuncio.messaggi], [true, 20, 10], 'di serie: acceso, ogni 20 minuti, almeno 10 messaggi');
  const st = { inizio: 0, ultimo: 0, messaggi: 10 };
  assert.equal(C.annuncioDovuto(cfg, 'twitch', st, 20 * MIN), true);
  assert.equal(C.annuncioDovuto(cfg, 'twitch', st, 20 * MIN - 1), false, 'non prima del tempo');
  assert.equal(C.annuncioDovuto(cfg, 'twitch', { ...st, messaggi: 9 }, 99 * MIN), false, 'in una chat ferma non si parla da soli');
  assert.equal(C.annuncioDovuto(cfg, 'twitch', { inizio: 0, ultimo: 30 * MIN, messaggi: 50 }, 45 * MIN), false, 'dopo l\'ultimo, non dall\'inizio');
  assert.equal(C.annuncioDovuto(C.normalizza({ attivo: false }), 'twitch', st, 99 * MIN), false, 'Pew spenti: niente');
  assert.equal(C.annuncioDovuto(C.normalizza({ attivo: true, pausa: true }), 'twitch', st, 99 * MIN), false, 'in pausa: niente');
  assert.equal(C.annuncioDovuto(C.normalizza({ attivo: true, annuncio: { piattaforme: { kick: false } } }), 'kick', st, 99 * MIN), false, 'la piattaforma spenta');
  assert.equal(C.annuncioDovuto(C.normalizza({ attivo: true, annuncio: { messaggi: 0, ogniMin: 5 } }), 'kick', { inizio: 0, messaggi: 0 }, 5 * MIN), true, 'tutto dello streamer');
  assert.equal(C.normalizza({ annuncio: { ogniMin: 1 } }).annuncio.ogniMin, 5, 'non piu\' spesso di ogni 5 minuti');
  assert.equal(C.testoAnnuncio(cfg, 'es', { pagina: 'pew.x/a' }), 'Golpea el directo: elige un efecto, apunta a un punto y haz que aparezca con tu nombre → pew.x/a');
  assert.equal(C.testoAnnuncio(C.normalizza({ annuncio: { testo: 'Tira su {pagina}, {canale}!' } }), 'it', { pagina: 'p', canale: 'Andry' }), 'Tira su p, Andry!');
});

function bot(ch, colpi) {
  streamers.upsertApproved(ch, ch, '1' + ch.length);
  streamers.setEnabled(ch, true);
  streamers.setSettings(ch, { colpi });
  const detti = [];
  const io = Object.create(BotManager.prototype);
  io._liveState = new Map();
  io.colpi = { cfgDi: (l) => C.normalizza(streamers.get(l)?.settings?.colpi) };
  io.vocePer = ({ channel, piattaforma }) => (t) => detti.push([channel, piattaforma, t]);
  return { io, detti };
}

test('il giro: il primo dopo ogniMin dall\'inizio, poi dall\'ultimo, ognuno sulla sua piattaforma', () => {
  const ch = 'annuncio1';
  const { io, detti } = bot(ch, { attivo: true, annuncio: { ogniMin: 10, messaggi: 2 } });
  const T = 1_000_000_000;
  io._annunciaPew(T);
  assert.equal(detti.length, 0, 'offline: niente');
  io._liveState.set(ch, true);
  io._annunciaPew(T);
  for (let i = 0; i < 2; i++) io._statoAnnuncio(ch, 'twitch').messaggi++;
  io._annunciaPew(T + 9 * MIN);
  assert.equal(detti.length, 0, 'non prima di ogniMin dall\'inizio');
  io._annunciaPew(T + 10 * MIN);
  assert.deepEqual(detti.map((d) => d.slice(0, 2)), [[ch, 'twitch']]);
  assert.match(detti[0][2], /Colpisci la diretta: .*→ .*annuncio1/);
  io._annunciaPew(T + 20 * MIN);
  assert.equal(detti.length, 1, 'dopo l\'ultimo la chat non si e\' mossa: niente');
  io._statoAnnuncio(ch, 'twitch').messaggi += 2;
  io._annunciaPew(T + 20 * MIN);
  assert.equal(detti.length, 2);
  // su Kick, la voce di Kick, e il suo conto
  statoVivo.scrivi(ch, 'diretta:kick', { live: true });
  io._annunciaPew(T + 21 * MIN);
  io._statoAnnuncio(ch, 'kick').messaggi += 2;
  io._annunciaPew(T + 31 * MIN);
  assert.deepEqual(detti.at(-1).slice(0, 2), [ch, 'kick']);
  // la diretta finisce: si riparte da capo alla prossima
  io._liveState.set(ch, false);
  io._annunciaPew(T + 40 * MIN);
  assert.equal(io._annunciPew.has(ch + '|twitch'), false);
  // ognuna col suo «in onda»: Kick va avanti da solo, e senza Kick in onda su Kick non si parla
  io._statoAnnuncio(ch, 'kick').messaggi += 2;
  const prima = detti.length;
  io._annunciaPew(T + 41 * MIN);
  assert.deepEqual(detti.slice(prima).map((d) => d[1]), ['kick'], 'Twitch spento, Kick in onda: solo Kick');
  statoVivo.scrivi(ch, 'diretta:kick', { live: false });
  io._liveState.set(ch, true);
  io._statoAnnuncio(ch, 'kick').messaggi += 99;
  io._annunciaPew(T + 60 * MIN);
  assert.ok(!detti.slice(prima + 1).some((d) => d[1] === 'kick'), 'Kick spento: su Kick niente, anche con Twitch in onda');
});
