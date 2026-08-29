// Le DUE classifiche e il premio che ne pesca.
//
// Il fatto da cui nasce tutto: le monete si guadagnano allo stesso modo per
// tutti, ma non tutti corrono la stessa gara. Un moderatore e' in chat ogni
// sera per mestiere; e soprattutto Twitch RIFIUTA di dare il VIP a un
// moderatore, quindi un premio pescato da una classifica mista si brucia
// contro un rifiuto certo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cartellaUsaEGetta } from '../aiuto.mjs';

const usaEGetta = cartellaUsaEGetta('andrybot-punti-');
const { points, vips } = await import('../../src/db.js');
const vip = await import('../../src/features/vip.js');

const CH = 'canale';

test('il ruolo non si perde fra un accredito e l\'altro', () => {
  points.add(CH, 'tizio', 10);
  points.add(CH, 'capo', 10, 'staff');
  points.add(CH, 'capo', 5);                       // accredito che non sa nulla del ruolo
  assert.equal(points.ruoloDi(CH, 'capo'), 'staff');
  points.add(CH, 'capo', 1, '');                   // qui invece lo sappiamo: e' tornato pubblico
  assert.equal(points.ruoloDi(CH, 'capo'), '');
  points.add(CH, 'capo', 1, 'staff');
});

test('due gare separate, e una vista che le unisce', () => {
  assert.deepEqual(points.top(CH, 5).map((r) => r.user), ['tizio']);
  assert.deepEqual(points.top(CH, 5, 'staff').map((r) => r.user), ['capo']);
  assert.deepEqual(points.top(CH, 5, 'tutti').map((r) => r.user).sort(), ['capo', 'tizio']);
});

test('i canali di prima restano nella classifica del pubblico', () => {
  // righe scritte quando la colonna non esisteva: ruolo vuoto = pubblico
  points.add(CH, 'vecchioutente', 999);
  assert.ok(points.top(CH, 10).some((r) => r.user === 'vecchioutente'));
});

// ---- il premio ----------------------------------------------------------
function finto({ vipDelCanale = [], rifiuta = new Set() } = {}) {
  const dati = [];
  return {
    dati,
    getUserByLogin: async (l) => ({ id: 'id_' + l, display_name: l }),
    getVips: async () => vipDelCanale.map((u) => ({ user_login: u })),
    addVip: async (_ch, id) => {
      const l = String(id).replace(/^id_/, '');
      if (rifiuta.has(l)) return { ok: false, motivo: 'non posso (forse è mod o sei tu)' };
      dati.push(l); return { ok: true };
    },
    removeVip: async () => ({ ok: true }),
  };
}

test('il premio non pesca dallo staff: Twitch lo rifiuterebbe', async () => {
  const ch = 'c2';
  points.add(ch, 'capo', 10000, 'staff');
  points.add(ch, 'anna', 500);
  points.add(ch, 'bruno', 400);
  const h = finto({ rifiuta: new Set(['capo']) });
  const v = await vip.premiaTopMonete(h, ch, 2, { ms: 7 * 86400000, txt: 'una settimana' }, null);
  assert.deepEqual(v, ['anna', 'bruno']);
  assert.ok(!h.dati.includes('capo'), 'non ci ha nemmeno provato');
});

test('chi ha gia\' il VIP per sempre viene saltato, e il premio SCORRE', async () => {
  const ch = 'c3';
  points.add(ch, 'anna', 900);      // ce l'ha per sempre, dato da noi
  points.add(ch, 'bruno', 800);     // ce l'ha per sempre, dato dallo streamer su Twitch
  points.add(ch, 'carla', 700);
  points.add(ch, 'dario', 600);
  vips.set(ch, { user: 'anna', userId: 'id_anna', display: 'anna', until: 0, motivo: 'sempre' });
  const h = finto({ vipDelCanale: ['bruno'] });
  const v = await vip.premiaTopMonete(h, ch, 2, { ms: 7 * 86400000, txt: 'una settimana' }, null);
  assert.deepEqual(v, ['carla', 'dario'], 'i posti promessi sono due e due devono essere assegnati');
});

test('un VIP perenne non viene mai accorciato (il premio lo revocherebbe)', async () => {
  const ch = 'c4';
  points.add(ch, 'anna', 900);
  vips.set(ch, { user: 'anna', userId: 'id_anna', display: 'anna', until: 0, motivo: 'sempre' });
  const h = finto();
  await vip.premiaTopMonete(h, ch, 1, { ms: 7 * 86400000, txt: 'una settimana' }, null);
  assert.equal(vips.get(ch, 'anna').until, 0, 'la scadenza non deve comparire dal nulla');
});

test('un VIP A TEMPO ancora in corso il premio lo prolunga, non lo salta', async () => {
  const ch = 'c5';
  points.add(ch, 'anna', 900);
  const scadenzaVecchia = Date.now() + 3600_000;
  vips.set(ch, { user: 'anna', userId: 'id_anna', display: 'anna', until: scadenzaVecchia, motivo: 'quiz' });
  const h = finto();
  const v = await vip.premiaTopMonete(h, ch, 1, { ms: 7 * 86400000, txt: 'una settimana' }, null);
  assert.deepEqual(v, ['anna']);
  assert.ok(vips.get(ch, 'anna').until > scadenzaVecchia, 'la scadenza si allunga');
});

test('chi vuole premiare comunque puo\' spegnere il salto', async () => {
  const ch = 'c6';
  points.add(ch, 'anna', 900);
  points.add(ch, 'bruno', 800);
  const h = finto({ vipDelCanale: ['anna'] });
  const v = await vip.premiaTopMonete(h, ch, 1, { ms: 7 * 86400000, txt: 'una settimana' }, null, { saltaPerenni: false });
  assert.deepEqual(v, ['anna']);
});

// L'interruttore decide chi puo' VINCERE un posto, non se ci sia permesso
// rovinare quello che uno ha gia'. Anche premiando "comunque", un VIP per
// sempre non deve uscirne con una scadenza addosso.
test('premiando comunque, il VIP del CANALE non si trasforma in uno a tempo', async () => {
  const ch = 'c8';
  points.add(ch, 'anna', 900);
  const h = finto({ vipDelCanale: ['anna'] });   // VIP dato dallo streamer, non da noi
  await vip.premiaTopMonete(h, ch, 1, { ms: 7 * 86400000, txt: 'una settimana' }, null, { saltaPerenni: false });
  assert.equal(vips.get(ch, 'anna')?.until ?? 0, 0, 'nessuna scadenza su un VIP che non ne aveva');
});

test('premiando comunque, il VIP perenne NOSTRO resta perenne', async () => {
  const ch = 'c9';
  points.add(ch, 'anna', 900);
  vips.set(ch, { user: 'anna', userId: 'id_anna', display: 'anna', until: 0, motivo: 'sempre' });
  const h = finto();
  await vip.premiaTopMonete(h, ch, 1, { ms: 7 * 86400000, txt: 'una settimana' }, null, { saltaPerenni: false });
  assert.equal(vips.get(ch, 'anna').until, 0);
});

test('se non c\'e\' abbastanza gente si danno i premi che si possono', async () => {
  const ch = 'c7';
  points.add(ch, 'anna', 900);
  const h = finto();
  const v = await vip.premiaTopMonete(h, ch, 5, { ms: 7 * 86400000, txt: 'una settimana' }, null);
  assert.deepEqual(v, ['anna']);
});

test.after(() => usaEGetta.pulisci());
