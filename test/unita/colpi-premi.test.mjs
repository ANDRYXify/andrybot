// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I PREMI A PUNTI CANALE DEI COLPI (src/features/colpi-premi.js): quello del
// prezzo in punti e quello del modo misto, allineati al listino salvato.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const casa = cartellaUsaEGetta('colpi-premi-');
const { streamers } = await import('../../src/db.js');
const { riconciliaPremi } = await import('../../src/features/colpi-premi.js');
test.after(() => casa.pulisci());

function twitch() {
  const vivi = new Map();
  let n = 0;
  return {
    vivi,
    creaReward: async (login, { titolo, costo, prompt }) => {
      if ([...vivi.values()].some((r) => r.titolo === titolo)) throw new Error('titolo doppio');
      const id = `${String(++n).padStart(8, '0')}-aaaa`;
      vivi.set(id, { titolo, costo, prompt });
      return { id };
    },
    eliminaReward: async (login, id) => { vivi.delete(id); },
  };
}
const C = 'premi1';
streamers.upsertApproved(C, C, '9001');
const salva = (voci) => streamers.setSettings(C, { nomeMonete: 'gemme', colpi: { attivo: true, voci } });
const leggi = () => streamers.get(C).settings.colpi.voci[0];

test('il premio del prezzo e quello del modo misto: titoli diversi, i loro costi, rifatti se cambiano, tolti se non servono', async () => {
  const h = twitch();
  salva([{ id: 'pomodoro', comando: 'pomodoro', nome: 'Pomodoro', punti: 500, misti: { punti: { monete: 20, punti: 300 } } }]);
  assert.deepEqual((await riconciliaPremi({ login: C, prima: {}, helix: h, streamers, pagina: 'pew.x/premi1' })).errori, []);
  let v = leggi();
  assert.deepEqual([h.vivi.get(v.premio)?.titolo, h.vivi.get(v.premio)?.costo], ['Colpo: Pomodoro', 500]);
  assert.deepEqual([h.vivi.get(v.premioMisto)?.titolo, h.vivi.get(v.premioMisto)?.costo], ['Colpo: Pomodoro + monete', 300]);
  assert.match(h.vivi.get(v.premioMisto).prompt, /Prima paga 20 gemme su pew\.x\/premi1/, 'il premio misto dice cosa pagare prima, col nome delle monete');
  const prima = streamers.get(C).settings.colpi;
  await riconciliaPremi({ login: C, prima, helix: h, streamers, pagina: 'pew.x/premi1' });
  assert.deepEqual([leggi().premio, leggi().premioMisto], [v.premio, v.premioMisto], 'una seconda passata non tocca niente');
  assert.ok(h.vivi.has(v.premio) && h.vivi.has(v.premioMisto), 'e su Twitch i premi ci sono ancora');
  salva([{ ...leggi(), misti: { punti: { monete: 20, punti: 250 } } }]);
  await riconciliaPremi({ login: C, prima, helix: h, streamers, pagina: 'pew.x/premi1' });
  v = leggi();
  assert.equal(h.vivi.get(v.premioMisto)?.costo, 250, 'un costo cambiato: il premio si rifa\'');
  assert.equal(h.vivi.size, 2, 'e quello vecchio non resta');
  const prima2 = streamers.get(C).settings.colpi;
  salva([{ ...leggi(), misti: {} }]);
  await riconciliaPremi({ login: C, prima: prima2, helix: h, streamers, pagina: 'pew.x/premi1' });
  assert.deepEqual([leggi().premioMisto, h.vivi.size], ['', 1], 'senza il modo misto il suo premio se ne va');
  const prima3 = streamers.get(C).settings.colpi;
  salva([]);
  await riconciliaPremi({ login: C, prima: prima3, helix: h, streamers, pagina: 'pew.x/premi1' });
  assert.equal(h.vivi.size, 0, 'una voce tolta toglie i suoi premi');
});

test('una voce tolta mentre il suo premio si sta creando: i premi appena nati non restano orfani', async () => {
  const h = twitch();
  const crea = h.creaReward;
  // fra la lettura e la scrittura arriva un salvataggio che toglie la voce
  h.creaReward = async (...a) => { const r = await crea(...a); salva([]); return r; };
  salva([{ id: 'x', comando: 'x', nome: 'X', punti: 100, misti: { punti: { monete: 5, punti: 50 } } }]);
  await riconciliaPremi({ login: C, prima: {}, helix: h, streamers, pagina: 'p' });
  assert.equal(h.vivi.size, 0, 'ne\' quello del prezzo ne\' quello misto');
});
