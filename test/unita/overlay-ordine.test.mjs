// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL NUMERO D'ORDINE DI QUELLO CHE ESCE VERSO GLI OVERLAY (features/effects.js;
// docs/OVERLAY.md, «Vince il dato più nuovo»). La pagina tiene, per ogni pezzo,
// il dato col numero più alto: perché sia giusto, i numeri devono crescere
// sempre, anche fra un riavvio e l'altro, e il tema deve leggere il suo
// PRIMA dello stato. Qui le tre cose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cartellaUsaEGetta } from '../aiuto.mjs';

cartellaUsaEGetta('andrybot-overlay-ordine-');
const { EffectsEngine } = await import('../../src/features/effects.js');

const presa = () => {
  const righe = [];
  return { righe, res: { write: (r) => righe.push(JSON.parse(String(r).replace(/^data: /, ''))), end() {} } };
};

test('ogni messaggio verso gli overlay porta un numero d\'ordine che cresce, e seqOra e\' l\'ultimo uscito', () => {
  const e = new EffectsEngine();
  const a = presa(), b = presa();
  e.addClient('uno', a.res);
  e.addClient('due', b.res);
  const prima = e.seqOra();
  e.emit('uno', { tipo: 'timer', fine: 0 });
  e.emit('due', { tipo: 'goal', conti: {} });
  e.emit('uno', { tipo: 'treno', treno: null });
  const visti = [...a.righe, ...b.righe].map((r) => r.seq).sort((x, y) => x - y);
  assert.equal(visti.length, 3);
  assert.ok(visti[0] > prima, 'il primo dopo la lettura ha un numero piu\' alto');
  assert.ok(visti[0] < visti[1] && visti[1] < visti[2], 'crescono, anche fra canali diversi');
  assert.equal(e.seqOra(), visti[2], 'il numero di adesso e\' quello dell\'ultimo uscito');
  assert.equal(a.righe[0].tipo, 'timer', 'il messaggio resta quello che era');
  assert.equal(a.righe[0].fine, 0);
});

test('i numeri crescono anche fra un riavvio e l\'altro: partono dall\'ora di avvio', async () => {
  const vecchio = new EffectsEngine();
  const p = presa();
  vecchio.addClient('uno', p.res);
  for (let i = 0; i < 500; i++) vecchio.emit('uno', { tipo: 'timer', fine: i });
  await new Promise((r) => setTimeout(r, 2));
  const nuovo = new EffectsEngine();
  assert.ok(nuovo.seqOra() > vecchio.seqOra(), 'un processo nuovo parte piu\' in alto di dove era arrivato il vecchio');
});

test('il tema e la classifica dei Bit leggono il numero PRIMA dello stato', () => {
  const src = readFileSync(new URL('../../src/web/server.js', import.meta.url), 'utf8');
  const tema = src.slice(src.indexOf("app.get('/overlay/:login/tema'"), src.indexOf("app.get('/overlay/:login/tema'") + 4000);
  assert.ok(tema.indexOf('effects.seqOra()') > 0, 'il tema porta il numero');
  assert.ok(tema.indexOf('effects.seqOra()') < tema.indexOf('rinfrescaGoalVivi(login)'), 'letto prima di rinfrescare gli obiettivi');
  assert.ok(tema.indexOf('effects.seqOra()') < tema.indexOf('manager.alerts?.tema(login)'), 'e prima di leggere lo stato');
  assert.match(tema, /\n\s+seq,\n/, 'e lo manda');
  const bit = src.slice(src.indexOf("app.get('/overlay/:login/bit'"), src.indexOf("app.get('/overlay/:login/bit'") + 1200);
  assert.ok(bit.indexOf('effects.seqOra()') > 0 && bit.indexOf('effects.seqOra()') < bit.indexOf('bitFeat.classifica('), 'la classifica legge il numero prima di chiedere a Twitch');
  assert.match(bit, /righe: righe \? righe\.slice\(0, 10\) : null, seq \}/);
});
